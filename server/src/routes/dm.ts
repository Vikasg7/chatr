import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, requireAuth } from "../middleware/auth";

export default (prisma: PrismaClient) => {
  const router = Router();

  // List current user's DM rooms
  router.get("/", requireAuth, async (req: AuthRequest, res) => {
    const userId = req.userId!;
    try {
      const rooms = await prisma.room.findMany({
        where: {
          type: "DM",
          members: {
            some: { userId },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, email: true, name: true },
              },
            },
          },
        },
        orderBy: { id: "asc" },
      });

      res.json(rooms);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load DMs" });
    }
  });

  // Create (or return existing) DM with userId
  router.post("/:userId", requireAuth, async (req: AuthRequest, res) => {
    const myId = req.userId!;
    const otherUserId = Number(req.params.userId);

    if (!otherUserId || Number.isNaN(otherUserId))
      return res.status(400).json({ error: "Invalid userId" });

    if (myId === otherUserId)
      return res.status(400).json({ error: "Cannot DM yourself" });

    try {
      // check if DM already exists
      const existing = await prisma.room.findFirst({
        where: {
          type: "DM",
          members: {
            some: { userId: myId },
          },
          AND: {
            members: {
              some: { userId: otherUserId },
            },
          },
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, email: true, name: true } },
            },
          },
        },
      });

      if (existing)
        return res.json(existing);

      // create new DM room
      const room = await prisma.room.create({
        data: {
          type: "DM",
          name: req.body.name,
          members: {
            create: [{ userId: myId }, { userId: otherUserId }],
          },
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, email: true, name: true } },
            },
          },
        },
      });

      res.json(room);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create DM" });
    }
  });

  return router;
};
