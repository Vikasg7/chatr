import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, requireAuth } from "../middleware/auth";

export default (prisma: PrismaClient) => {
  const router = Router();

  // List users (excluding self), optional text search
  router.get("/", requireAuth, async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const q = (req.query.q as string | undefined)?.trim();
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const where: any = {
      id: { not: userId },
    };

    if (q) {
      where.OR = [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ];
    }

    try {
      const users = await prisma.user.findMany({
        where,
        select: { id: true, email: true, name: true, avatarUrl: true },
        take: limit,
        skip: offset,
        orderBy: { name: "asc" },
      });

      res.json(users);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load users" });
    }
  });

  router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(req.params.id) },
        select: { id: true, email: true, name: true, avatarUrl: true }
      });
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: "Failed to load user" });
    }
  });

  return router;
};
