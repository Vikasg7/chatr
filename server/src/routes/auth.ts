import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

export default function (prisma: PrismaClient) {
  const router = Router();

  router.post("/signup", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) 
      return res.status(400).json({ error: "email+password required" });

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing)
        return res.status(409).json({ error: "email already in use" });

      const hash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, password: hash, name },
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "server error" });
    }
  });

  router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) 
      return res.status(400).json({ error: "email+password required" });

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user)
        return res.status(401).json({ error: "invalid credentials" });

      const ok = await bcrypt.compare(password, user.password);
      if (!ok)
        return res.status(401).json({ error: "invalid credentials" });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "server error" });
    }
  });

  return router;
};