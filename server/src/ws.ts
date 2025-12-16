// server/src/ws.ts
import { WebSocketServer, WebSocket } from 'ws';
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

export type Client = {
  id: string;
  socket: WebSocket;
  userId?: number;
  roomId?: number;
};

export class WSService {
  private wss: WebSocketServer;
  // Track connected user IDs
  private onlineUsers: Set<number> = new Set();

  constructor(server: any, prisma: PrismaClient) {
    this.prisma = prisma;
    this.wss = new WebSocketServer({ server });
    this.wss.on("connection", this.handleConnection.bind(this));
  }

  private handleConnection(socket: WebSocket, req: any) {
    const id = crypto.randomUUID();

    // ✅ Extract token from query params (ws://host?token=xyz)
    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token)
      return;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const userId = decoded.userId;

      this.clients.set(id, { id, socket, userId });

      // Mark as online
      this.onlineUsers.add(userId);
      console.log(`✅ WebSocket connected: ${id} (User: ${userId})`);

      // 1. Send current list to new user
      socket.send(JSON.stringify({
        type: "status:list",
        users: Array.from(this.onlineUsers)
      }));

      // 2. Broadcast to others that this user is online
      this.broadcast({
        type: "status:online",
        userId
      });

      socket.on("message", this.handleMessage.bind(this, id));
      socket.on("close", this.handleSocketClose.bind(this, id));
    } catch {
      socket.send(JSON.stringify({ "error": "Invalid token" }));
      socket.close();
      console.warn("Invalid WebSocket token");
    }
  }

  private handleSocketClose(senderId: string) {
    const client = this.clients.get(senderId);
    if (client && client.userId) {
      console.log(`❌ WebSocket disconnected: ${senderId} (User: ${client.userId})`);

      // Check if user has other connections (multi-tab)
      // We iterate clients to see if any OTHER client has same userId
      let hasOtherConnections = false;
      for (const [cid, c] of this.clients.entries()) {
        if (cid !== senderId && c.userId === client.userId) {
          hasOtherConnections = true;
          break;
        }
      }

      if (!hasOtherConnections) {
        this.onlineUsers.delete(client.userId);
        this.broadcast({
          type: "status:offline",
          userId: client.userId
        });
      }
    }
    this.clients.delete(senderId);
  }

  private async handleMessage(senderId: string, data: Buffer) {
    try {
      const msg = JSON.parse(data.toString());
      const client = this.clients.get(senderId);
      if (!client || !client.userId)
        return;

      if (msg.type === "room:join") {
        client.roomId = msg.roomId;
        return;
      }

      if (msg.type === "message:new") {
        if (!client.roomId)
          return;

        const message = await this.prisma.message.create({
          data: {
            text: msg.text,
            senderId: client.userId!,
            roomId: client.roomId,
          },
          include: {
            sender: true,
          },
        });

        // Broadcast only to users in the same room
        this.broadcastToRoom(client.roomId, {
          type: "message:new",
          message,
        });
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

  broadcastToRoom(roomId: number, payload: any) {
    const data = JSON.stringify(payload);
    for (const client of this.clients.values()) {
      if (client.roomId === roomId && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(data);
      }
    }
  }
}