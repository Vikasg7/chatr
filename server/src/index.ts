import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import authRouter from "./routes/auth";
import roomRouter from "./routes/rooms";
import { WSService } from "./ws";
import http from "http";

async function ensureDefaultRoom() {
  const count = await prisma.room.count();
  if (count === 0) {
    await prisma.room.create({
      data: { name: "General" },
    });
    console.log("🏠 Default room created: General");
  }
}

const app = express();
const prisma = new PrismaClient();

ensureDefaultRoom();

app.use(cors());
app.use(express.json());

// simple health
app.get("/health", (_req, res) => res.json({ ok: true }));

// auth routes
app.use("/api/auth", authRouter(prisma));
app.use("/api/rooms", roomRouter(prisma));

const server = http.createServer(app);
// ✅ Initialize WebSocket service
new WSService(server, prisma);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});