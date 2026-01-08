import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireAuth, AuthRequest } from "../middleware/auth";

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export default function (prisma: PrismaClient) {
  const router = Router();

  router.post("/signup", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email+password required" });

    try {
      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
      });
      if (existing)
        return res.status(409).json({ error: "email already in use" });

      const hash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, password: hash, name },
        select: { id: true, email: true, name: true, avatarUrl: true }
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("chatr_token", token, COOKIE_OPTIONS);
      res.json({ user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl } });
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
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, password: true, name: true, avatarUrl: true }
      });
      if (!user)
        return res.status(401).json({ error: "invalid credentials" });

      const ok = await bcrypt.compare(password, user.password);
      if (!ok)
        return res.status(401).json({ error: "invalid credentials" });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("chatr_token", token, COOKIE_OPTIONS);
      res.json({ user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "server error" });
    }
  });

  router.get("/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, email: true, name: true, avatarUrl: true }
      });
      if (!user)
        return res.status(401).json({ error: "unauthorized" });

      res.json({ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl });
    } catch (err) {
      console.error(err);
      res.status(401).json({ error: "unauthorized" });
    }
  });

  router.post("/logout", (req, res) => {
    res.clearCookie("chatr_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });
    res.json({ success: true });
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
  const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit for avatars
    fileFilter: (req: any, file: any, cb: any) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only images (JPG, PNG, WEBP, GIF) are allowed for avatars"), false);
      }
    }
  });

  router.put("/profile", requireAuth, upload.single("avatar"), async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const { name } = req.body;
      const file = (req as any).file;

      const updateData: any = {};
      if (name) updateData.name = name;
      if (file) {
        updateData.avatarUrl = `/uploads/${file.filename}`;
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: { id: true, email: true, name: true, avatarUrl: true }
      });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Update failed" });
    }
  });

  return router;
};