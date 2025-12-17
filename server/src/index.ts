import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import authRouter from "./routes/auth";
import friendsRouter from "./routes/friends";
import usersRouter from "./routes/users";
import uploadRouter from "./routes/uploads";
import { WSService } from "./ws";
import http from "http";
import path from "path";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Serve uploads
app.use("/uploads", express.static(path.join(__dirname, "../../public/uploads")));

// simple health
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
// ✅ Initialize WebSocket service
const wsService = new WSService(server, prisma);

// routes
app.use("/api/auth", authRouter(prisma));
app.use("/api/friends", friendsRouter(prisma, wsService));
app.use("/api/users", usersRouter(prisma));
app.use("/api/upload", uploadRouter);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});