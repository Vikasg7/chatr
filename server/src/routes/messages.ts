import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, AuthRequest } from "../middleware/auth";

export default (prisma: PrismaClient) => {
  const router = Router();

  // CREATE MESSAGE
  router.post("/", requireAuth, async (req: AuthRequest, res) => {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Message text required" });
    }

    try {
      const message = await prisma.message.create({
        data: {
          text,
          senderId: req.userId!,
        },
        include: {
          sender: { select: { id: true, email: true, name: true }, },
        },
      });

      return res.json(message);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // GET MESSAGES (pagination)
  router.get("/", requireAuth, async (req: AuthRequest, res) => {
    const limit = parseInt(req.query.limit as string) || 30;
    const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : undefined;

    try {
      const messages = await prisma.message.findMany({
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          id: "desc",
        },
        include: {
          sender: { select: { id: true, email: true, name: true }, },
        },
      });

      const nextCursor = messages.length > 0 ? messages[messages.length - 1].id : null;

      return res.json({ messages, nextCursor });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // DELETE MESSAGE (optional)
  router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id);

    try {
      const message = await prisma.message.findUnique({ where: { id } });

      if (!message) 
        return res.status(404).json({ error: "Message not found" });

      if (message.senderId !== req.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await prisma.message.delete({ where: { id } });

      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  return router;
};