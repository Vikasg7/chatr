import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import logger from "../lib/logger";

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

export interface AuthRequest extends Request {
  userId?: number;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  // 1. Check cookies first
  let token = req.cookies?.chatr_token;

  // 2. Fallback to Authorization header
  if (!token) {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Bearer ")) {
      token = auth.split(" ")[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch (err) {
    logger.error("JWT error", err);
    return res.status(401).json({ error: "Invalid token" });
  }
}