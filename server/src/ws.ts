// server/src/ws.ts
import { WebSocketServer, WebSocket } from 'ws';
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { fetchMetadata } from './lib/metadata';

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

export type Client = {
  id: string;
  socket: WebSocket;
  userId?: number;
  friendId?: number; // Linked to the active friendship chat
};

export class WSService {
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();
  private prisma: PrismaClient;
  // Track connected user IDs
  private onlineUsers: Set<number> = new Set();

  constructor(server: any, prisma: PrismaClient) {
    this.prisma = prisma;
    this.wss = new WebSocketServer({ server });
    this.wss.on("connection", this.handleConnection.bind(this));
  }

  private handleConnection(socket: WebSocket, req: any) {
    const id = crypto.randomUUID();

    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) return;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const userId = decoded.userId;

      this.clients.set(id, { id, socket, userId });
      this.onlineUsers.add(userId);
      console.log(`✅ WebSocket connected: ${id} (User: ${userId})`);

      socket.send(JSON.stringify({
        type: "status:list",
        users: Array.from(this.onlineUsers)
      }));

      this.broadcast({ type: "status:online", userId });

      socket.on("message", this.handleMessage.bind(this, id));
      socket.on("close", this.handleSocketClose.bind(this, id));
    } catch {
      socket.send(JSON.stringify({ "error": "Invalid token" }));
      socket.close();
    }
  }

  private handleSocketClose(senderId: string) {
    const client = this.clients.get(senderId);
    if (client && client.userId) {
      let hasOtherConnections = false;
      for (const [cid, c] of this.clients.entries()) {
        if (cid !== senderId && c.userId === client.userId) {
          hasOtherConnections = true;
          break;
        }
      }

      if (!hasOtherConnections) {
        this.onlineUsers.delete(client.userId);
        this.broadcast({ type: "status:offline", userId: client.userId });
      }
    }
    this.clients.delete(senderId);
  }

  private async handleMessage(senderId: string, data: Buffer) {
    try {
      const msg = JSON.parse(data.toString());
      const client = this.clients.get(senderId);
      if (!client || !client.userId) return;

      if (msg.type === "chat:join") {
        client.friendId = msg.friendId;
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
          },
          include: {
            sender: { select: { id: true, email: true, name: true, avatarUrl: true } },
          },
        });

        this.broadcastToChat(client.friendId, {
          type: "message:new",
          message,
        });
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
            reactions: { include: { user: { select: { id: true, name: true } } } }
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
        if (!client.friendId) return;
        this.broadcastToChat(client.friendId, msg, client.id);

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
      console.error("WS error:", err);
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
    for (const client of this.clients.values()) {
      if (client.friendId === friendId && client.socket.readyState === WebSocket.OPEN && client.id !== excludeClientId) {
        client.socket.send(data);
      }
    }
  }

  sendToUser(userId: number, payload: any) {
    const data = JSON.stringify(payload);
    for (const client of this.clients.values()) {
      if (client.userId === userId && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(data);
      }
    }
  }
}