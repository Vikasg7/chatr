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
import morgan from "morgan";
import logger from "./lib/logger";

const app = express();
const prisma = new PrismaClient();

// ✅ Trust Render Proxy
app.set('trust proxy', 1);

// ✅ Environment Validation
const REQUIRED_ENV = ["JWT_SECRET", "DATABASE_URL"];
for (const env of REQUIRED_ENV) {
  if (!process.env[env]) {
    logger.error(`❌ Missing required environment variable: ${env}`);
    process.exit(1);
  }
}

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

// ✅ HTTP Request Logging
app.use(morgan("combined", {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

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
  max: 200, // Limit each IP to 200 requests per windowMs
  message: { error: "Too many requests from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// ✅ Stricter Auth Rate Limiting
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 signup/login requests per hour
  message: { error: "Too many authentication attempts, please try again in an hour" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/signup", authLimiter);
app.use("/api/auth/login", authLimiter);


app.use(express.json());

// Serve uploads (use project root with server/ prefix for monorepo)
// Serve uploads (consistent path across modules)
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
  logger.info(`Server listening on port ${PORT}`);
});

// ✅ Graceful Shutdown
const shutdown = async (signal: string) => {
  logger.info(`received ${signal}. shutting down gracefully.`);
  server.close(async () => {
    logger.info("HTTP server closed.");
    await prisma.$disconnect();
    logger.info("Prisma disconnected.");
    process.exit(0);
  });

  // Force shutdown after 10s
  setTimeout(() => {
    logger.error("Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));