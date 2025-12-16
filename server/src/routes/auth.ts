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
      res.json({ user: { id: user.id, email: user.email, name: user.name, onboardingSeen: user.onboardingSeen ?? false }, token });
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
      res.json({ user: { id: user.id, email: user.email, name: user.name, onboardingSeen: user.onboardingSeen ?? false }, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "server error" });
    }
  });

  router.get("/me", async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer "))
      return res.status(401).json({ error: "unauthorized" });

    const token = auth.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user)
        return res.status(401).json({ error: "unauthorized" });

      res.json({ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, onboardingSeen: user.onboardingSeen ?? false });
    } catch (err) {
      console.error(err);
      res.status(401).json({ error: "unauthorized" });
    }
  });

  // Persist onboarding seen flag for the authenticated user
  router.post("/onboarding", async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer "))
      return res.status(401).json({ error: "unauthorized" });

    const token = auth.slice(7);
    const { seen } = req.body;
    if (typeof seen !== 'boolean') return res.status(400).json({ error: 'seen boolean required' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await prisma.user.update({ where: { id: decoded.userId }, data: { onboardingSeen: seen } });
      res.json({ success: true, onboardingSeen: user.onboardingSeen });
    } catch (err) {
      console.error(err);
      res.status(401).json({ error: "unauthorized" });
    }
  });

  // Profile Update (Name & Avatar)
  const uploadDir = require("path").join(__dirname, "../../public/uploads");
  const multer = require("multer");
  if (!require("fs").existsSync(uploadDir)) {
    require("fs").mkdirSync(uploadDir, { recursive: true });
  }
  const storage = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => cb(null, uploadDir),
    filename: (req: any, file: any, cb: any) => {
      const ext = require("path").extname(file.originalname);
      const name = crypto.randomUUID();
      cb(null, `${name}${ext}`);
    },
  });
  const upload = multer({ storage });

  router.put("/profile", upload.single("avatar"), async (req: any, res) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "unauthorized" });
    const token = auth.slice(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const userId = decoded.userId;

      const { name } = req.body;
      const file = req.file;

      const updateData: any = {};
      if (name) updateData.name = name;
      if (file) {
        updateData.avatarUrl = `/uploads/${file.filename}`;
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          onboardingSeen: user.onboardingSeen ?? false
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Update failed" });
    }
  });

  return router;
};