import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, requireAuth } from "../middleware/auth";

export default (prisma: PrismaClient) => {
  const router = Router();

  // List users (excluding self), optional text search
  router.get("/", requireAuth, async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const q = (req.query.q as string | undefined)?.trim();

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
        select: { id: true, email: true, name: true },
        orderBy: { createdAt: "asc" },
      });

      res.json(users);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load users" });
    }
  });

  return router;
};
