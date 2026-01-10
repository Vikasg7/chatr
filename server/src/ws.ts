// server/src/ws.ts
import { WebSocketServer, WebSocket } from 'ws';
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import webpush from "web-push";
import { fetchMetadata } from './lib/metadata';
import { deleteFile } from './lib/file';
import logger from './lib/logger';


const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

// VAPID keys should be in .env
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || "";
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || "";

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:example@yourdomain.com",
    publicVapidKey,
    privateVapidKey
  );
}

export type Client = {
  id: string;
  socket: WebSocket;
  userId?: number;
  friendId?: number; // Linked to the active friendship chat
  msgCount: number; // For rate limiting
};

export class WSService {
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();
  private prisma: PrismaClient;
  // Track connected user IDs
  private onlineUsers: Set<number> = new Set();
  // 🔥 O(1) Lookups
  private userToClients: Map<number, Set<string>> = new Map();
  private friendToClients: Map<number, Set<string>> = new Map();

  constructor(server: any, prisma: PrismaClient) {
    this.prisma = prisma;
    this.wss = new WebSocketServer({ server });
    this.wss.on("connection", this.handleConnection.bind(this));
    this.setupHeartbeat();
    this.setupRateLimitReset();
  }

  private setupRateLimitReset() {
    setInterval(() => {
      for (const client of this.clients.values()) {
        client.msgCount = 0;
      }
    }, 10000); // Reset every 10s
  }

  private handleConnection(socket: WebSocket, req: any) {
    const id = crypto.randomUUID();

    const url = new URL(req.url ?? "", `http://${req.headers.host}`);

    // ✅ Extract token from:
    // 1. Sub-protocol header (Sec-WebSocket-Protocol)
    // 2. HttpOnly Cookie
    // 3. Query parameter (fallback for non-browser clients)
    const protocolToken = req.headers['sec-websocket-protocol'];

    let cookieToken = null;
    if (req.headers.cookie) {
      const cookies = req.headers.cookie.split('; ');
      const tokenCookie = cookies.find((c: string) => c.trim().startsWith('chatr_token='));
      if (tokenCookie) {
        cookieToken = tokenCookie.split('=')[1];
      }
    }

    const token = protocolToken || cookieToken || url.searchParams.get("token");

    if (!token) return;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: any };
      const userId = Number(decoded.userId);

      this.clients.set(id, { id, socket, userId, msgCount: 0 });
      this.onlineUsers.add(userId);

      // Add to user lookup
      if (!this.userToClients.has(userId)) this.userToClients.set(userId, new Set());
      this.userToClients.get(userId)!.add(id);

      logger.info(`✅ WebSocket connected: ${id} (User: ${userId})`);

      socket.send(JSON.stringify({
        type: "status:list",
        users: Array.from(this.onlineUsers)
      }));

      this.broadcast({ type: "status:online", userId });

      socket.on("message", this.handleMessage.bind(this, id));
      socket.on("close", this.handleSocketClose.bind(this, id));

      // Heartbeat setup
      (socket as any).isAlive = true;
      socket.on("pong", () => { (socket as any).isAlive = true; });

    } catch {
      socket.send(JSON.stringify({ "error": "Invalid token" }));
      socket.close();
    }
  }

  private setupHeartbeat() {
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws: any) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on("close", () => clearInterval(interval));
  }

  private handleSocketClose(senderId: string) {
    const client = this.clients.get(senderId);
    if (client && client.userId) {
      const userConnections = this.userToClients.get(client.userId);
      const hasOtherConnections = userConnections && userConnections.size > 1;

      if (!hasOtherConnections) {
        this.onlineUsers.delete(client.userId);
        this.userToClients.delete(client.userId);
        this.broadcast({ type: "status:offline", userId: client.userId });
      } else {
        // Just remove this specific connection
        this.userToClients.get(client.userId)?.delete(senderId);
      }

      // Remove from friend lookup if active
      if (client.friendId) {
        this.friendToClients.get(client.friendId)?.delete(senderId);
        if (this.friendToClients.get(client.friendId)?.size === 0) {
          this.friendToClients.delete(client.friendId);
        }
      }
    }
    this.clients.delete(senderId);
  }

  private async handleMessage(senderId: string, data: Buffer) {
    try {
      const client = this.clients.get(senderId);
      if (!client || !client.userId) return;

      // ✅ Basic Rate Limiting (Anti-Spam)
      client.msgCount++;
      if (client.msgCount > 30) { // Limit to 3 messages/sec on average
        logger.warn(`🚫 Rate limit exceeded for user ${client.userId}`);
        return;
      }

      const msg = JSON.parse(data.toString());

      if (msg.type === "chat:join") {
        const friendId = Number(msg.friendId);
        // Authorization check: Verify user is part of this friendship
        const friendship = await this.prisma.friend.findUnique({
          where: { id: friendId },
          select: { senderId: true, receiverId: true }
        });

        if (friendship && (friendship.senderId === client.userId || friendship.receiverId === client.userId)) {
          // Leave previous room lookup if any
          if (client.friendId) {
            this.friendToClients.get(client.friendId)?.delete(senderId);
          }

          client.friendId = friendId;

          // Join new room lookup
          if (!this.friendToClients.has(friendId)) this.friendToClients.set(friendId, new Set());
          this.friendToClients.get(friendId)!.add(senderId);

          logger.info(`👤 User ${client.userId} joined chat ${friendId}`);
        } else {
          logger.warn(`🚨 Unauthorized join attempt: User ${client.userId} tried to join chat ${friendId}`);
          client.socket.send(JSON.stringify({ type: "error", message: "Unauthorized join" }));
        }
        return;
      }

      if (msg.type === "message:new") {
        if (!client.friendId) return;

        let metadata = undefined;
        if (msg.text) {
          const meta = await fetchMetadata(msg.text);
          if (meta) metadata = meta;
        }

        const message = await this.prisma.message.create({
          data: {
            text: msg.text || "",
            attachmentUrl: msg.attachmentUrl,
            attachmentType: msg.attachmentType,
            metadata: {
              ...(metadata || {}),
              attachmentName: msg.attachmentName
            } as any,
            senderId: client.userId!,
            friendId: client.friendId,
            replyToId: msg.replyToId ? Number(msg.replyToId) : undefined
          },
          include: {
            sender: { select: { id: true, email: true, name: true, avatarUrl: true } },
            replyTo: {
              include: {
                sender: { select: { id: true, name: true, email: true } }
              }
            }
          },
        });

        this.broadcastToChat(client.friendId, {
          type: "message:new",
          message,
        });

        // ✅ Send to recipient's other connections (not currently in this specific chat)
        const friend = await this.prisma.friend.findUnique({
          where: { id: client.friendId },
          select: { senderId: true, receiverId: true }
        });

        if (friend) {
          const targetUserId = friend.senderId === client.userId ? friend.receiverId : friend.senderId;
          const recipientClients = this.userToClients.get(targetUserId);
          const clientsInChat = this.friendToClients.get(client.friendId);

          if (recipientClients) {
            for (const rid of recipientClients) {
              // Only send if the recipient connection is NOT already in this chat (to avoid double delivery)
              if (!clientsInChat || !clientsInChat.has(rid)) {
                const rClient = this.clients.get(rid);
                if (rClient && rClient.socket.readyState === WebSocket.OPEN) {
                  rClient.socket.send(JSON.stringify({ type: "message:new", message }));
                }
              }
            }
          }
        }

        // ✅ Push Notifications for offline/background users
        const pushTargetFriend = await this.prisma.friend.findUnique({
          where: { id: client.friendId },
          select: { senderId: true, receiverId: true }
        });

        if (pushTargetFriend) {
          const targetUserId = pushTargetFriend.senderId === client.userId ? pushTargetFriend.receiverId : pushTargetFriend.senderId;
          const isOnline = this.userToClients.has(targetUserId);

          if (!isOnline) {
            const senderName = message.sender.name || message.sender.email.split('@')[0];
            const body = message.text || (message.attachmentType ? `Sent ${message.attachmentType.toLowerCase()}` : 'New message');
            this.sendPushNotification(targetUserId, senderName, body, {
              friendId: client.friendId,
              messageId: message.id
            });
          }
        }
      } else if (msg.type === "typing:start" || msg.type === "typing:stop") {
        if (!client.friendId) return;
        this.broadcastToChat(client.friendId, {
          type: msg.type,
          userId: client.userId,
          friendId: client.friendId
        }, client.id);
      } else if (msg.type === "message:edit") {
        if (!client.friendId || !msg.messageId || !msg.text) return;
        const message = await this.prisma.message.findUnique({ where: { id: msg.messageId } });
        if (!message || message.senderId !== client.userId) return;

        const updated = await this.prisma.message.update({
          where: { id: msg.messageId },
          data: { text: msg.text },
          include: {
            sender: { select: { id: true, email: true, name: true, avatarUrl: true } },
            reactions: { include: { user: { select: { id: true, name: true } } } },
            replyTo: {
              include: {
                sender: { select: { id: true, name: true, email: true } }
              }
            }
          }
        });

        this.broadcastToChat(client.friendId, {
          type: "message:edit",
          message: updated
        });
      } else if (msg.type === "message:delete") {
        if (!client.friendId || !msg.messageId) return;
        const message = await this.prisma.message.findUnique({ where: { id: msg.messageId } });
        if (!message || message.senderId !== client.userId) return;

        if (message.attachmentUrl) {
          await deleteFile(message.attachmentUrl);
        }

        await this.prisma.reaction.deleteMany({ where: { messageId: msg.messageId } });
        await this.prisma.message.delete({ where: { id: msg.messageId } });

        this.broadcastToChat(client.friendId, {
          type: "message:delete",
          messageId: msg.messageId
        });
      } else if (msg.type === "message:react") {
        if (!client.friendId || !msg.messageId || !msg.emoji) return;

        // 1. Ensure user is not reacting to their own message
        const message = await this.prisma.message.findUnique({ where: { id: msg.messageId } });
        if (!message || message.senderId === client.userId) return;

        // 2. Check for existing reaction by this user on this message (single reaction only)
        const existing = await this.prisma.reaction.findFirst({
          where: {
            userId: client.userId!,
            messageId: msg.messageId
          }
        });

        if (existing) {
          // If same emoji, toggle off
          if (existing.emoji === msg.emoji) {
            await this.prisma.reaction.delete({ where: { id: existing.id } });
          } else {
            // If different, update to new emoji (replaces previous reaction)
            await this.prisma.reaction.update({
              where: { id: existing.id },
              data: { emoji: msg.emoji }
            });
          }
        } else {
          // No existing, create new
          await this.prisma.reaction.create({
            data: {
              userId: client.userId!,
              messageId: msg.messageId,
              emoji: msg.emoji
            }
          });
        }

        const reactions = await this.prisma.reaction.findMany({
          where: { messageId: msg.messageId },
          include: { user: { select: { id: true, name: true } } }
        });

        this.broadcastToChat(client.friendId, {
          type: "message:react",
          messageId: msg.messageId,
          reactions
        });
      } else if (msg.type.startsWith("call:")) {
        const friendId = Number(msg.friendId || client.friendId || 0);
        const friend = await this.prisma.friend.findUnique({
          where: { id: friendId },
          select: { senderId: true, receiverId: true }
        });

        if (!friend) return;
        const targetUserId = friend.senderId === client.userId ? friend.receiverId : friend.senderId;

        // Offline check only on the initial request
        if (msg.type === "call:request") {
          const isOnline = Array.from(this.clients.values()).some(c => c.userId === targetUserId);

          if (!isOnline) {
            return client.socket.send(JSON.stringify({
              type: "call:error",
              error: "User is offline",
              friendId: friendId
            }));
          }
        }

        // Always send call signals to all connections of the target user
        this.sendToUser(targetUserId, { ...msg, friendId: friendId });
        // And send to other connections of the sender (to sync states)
        this.sendToUser(client.userId, { ...msg, friendId: friendId }, client.id);

        // Logging Call History
        if (msg.type === "call:cancel" || msg.type === "call:reject" || msg.type === "call:end") {
          let summaryText = "";
          if (msg.type === "call:cancel") summaryText = "Missed Voice Call";
          else if (msg.type === "call:reject") summaryText = "Declined Voice Call";
          else if (msg.type === "call:end") {
            const duration = msg.duration ? ` (${msg.duration})` : "";
            summaryText = `Voice Call${duration}`;
          }

          if (summaryText) {
            await this.prisma.message.create({
              data: {
                text: summaryText,
                senderId: client.userId!,
                friendId: client.friendId,
                attachmentType: "CALL_SUMMARY",
                metadata: { type: msg.type, duration: msg.duration } as any
              },
              include: {
                sender: { select: { id: true, email: true, name: true, avatarUrl: true } },
              },
            }).then(message => {
              this.broadcastToChat(client.friendId!, { type: "message:new", message });
            });
          }
        }
      }
    } catch (err) {
      logger.error("WS error:", err);
    }
  }

  broadcast(payload: any) {
    const str = JSON.stringify(payload);
    for (const client of this.clients.values()) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(str);
      }
    }
  }

  broadcastToChat(friendId: number, payload: any, excludeClientId?: string) {
    const data = JSON.stringify(payload);
    const clientIds = this.friendToClients.get(friendId);
    if (!clientIds) return;

    for (const cid of clientIds) {
      if (cid === excludeClientId) continue;
      const client = this.clients.get(cid);
      if (client && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(data);
      }
    }
  }

  sendToUser(userId: number, payload: any, excludeClientId?: string) {
    const data = JSON.stringify(payload);
    const clientIds = this.userToClients.get(userId);
    if (!clientIds) return;

    for (const cid of clientIds) {
      if (cid === excludeClientId) continue;
      const client = this.clients.get(cid);
      if (client && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(data);
      }
    }
  }

  async sendPushNotification(userId: number, title: string, body: string, data?: any) {
    try {
      const subscriptions = await this.prisma.pushSubscription.findMany({
        where: { userId }
      });

      const payload = JSON.stringify({
        title,
        body,
        data,
        icon: "/icon.svg", // Fallback icon
      });

      const deletions: string[] = [];
      await Promise.all(subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            payload
          );
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            deletions.push(sub.endpoint);
          } else {
            logger.error(`Push error for user ${userId}:`, err);
          }
        }
      }));

      if (deletions.length > 0) {
        await this.prisma.pushSubscription.deleteMany({
          where: { endpoint: { in: deletions } }
        });
      }
    } catch (err) {
      logger.error("Push notification logic error:", err);
    }
  }
}