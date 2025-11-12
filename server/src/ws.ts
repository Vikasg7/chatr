// server/src/ws.ts
import { WebSocketServer, WebSocket } from 'ws';
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

export type Client = {
  id: string;
  socket: WebSocket;
  userId?: number;
};

export class WSService {
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();
  private prisma: PrismaClient;

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

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        this.clients.set(id, { id, socket, userId: decoded.userId });
    
        console.log("✅ WebSocket connected", id);
    
        socket.on("message", this.handleMessage.bind(this, id));
    
        socket.on("close", this.handleSocketClose.bind(this, id));
      } catch {
        socket.send("Error: Invalid JWT token");
        socket.close();
        console.warn("Invalid WebSocket token");
      }
    }

  }

  private handleSocketClose(senderId: string) {
    console.log("❌ WebSocket disconnected:", senderId);
    this.clients.delete(senderId);
  }

  private async handleMessage(senderId: string, data: Buffer) {
    try {
      const msg = JSON.parse(data.toString());
      const client = this.clients.get(senderId);
      if (!client || !client.userId) 
        return;

      if (msg.type === "message:new" && msg.text) {
        const message = await this.prisma.message.create({
          data: {
            text: msg.text,
            senderId: client.userId,
          },
          include: {
            sender: { select: { id: true, email: true, name: true } },
          },
        });

        this.broadcast({ type: "message:new", message });
      }
    } catch (err) {
      console.error("WS error:", err);
    }
  }

  broadcast(payload: any) {
    const str = JSON.stringify(payload);
    for (const client of this.clients.values()) {
      client.socket.send(str);
    }
  }
}