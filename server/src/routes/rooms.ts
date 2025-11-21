import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, AuthRequest } from "../middleware/auth";

export default (prisma: PrismaClient) => {
  const router = Router();

  // CREATE ROOM
  router.post("/", requireAuth, async (req: AuthRequest, res) => {
    const { name } = req.body;

    if (!name) 
      return res.status(400).json({ error: "Name required" });

    const room = await prisma.room.create({ data: { name } });

    res.json(room);
  });

  // LIST ROOMS
  router.get("/", requireAuth, async (_req, res) => {
    const rooms = await prisma.room.findMany({
      orderBy: { id: "asc" },
    });
    res.json(rooms);
  });

  // GET MESSAGES FOR ROOM
  router.get("/:roomId/messages", requireAuth, async (req, res) => {
    const roomId = parseInt(req.params.roomId);

    const msgs = await prisma.message.findMany({
      where: { roomId },
      orderBy: { id: "asc" },
      include: {
        sender: { select: { id: true, email: true, name: true } },
      },
    });

    res.json(msgs);
  });

  return router;
};