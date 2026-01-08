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
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

const app = express();
const prisma = new PrismaClient();

// ✅ HTTPS Enforcement (Production only)
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// ✅ Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ✅ Cookie Support
app.use(cookieParser());

// ✅ CORS configuration
const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:3000";
const origins = allowedOrigin.includes(",")
  ? allowedOrigin.split(",").map(o => o.trim())
  : allowedOrigin;

app.use(cors({
  origin: origins,
  credentials: true
}));

// ✅ Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: "Too many requests from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

app.use(express.json());

// Serve uploads
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

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