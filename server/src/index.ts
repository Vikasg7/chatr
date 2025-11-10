import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import authRouter from "./routes/auth";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// simple health
app.get("/health", (_req, res) => res.json({ ok: true }));

// auth routes
app.use("/api/auth", authRouter(prisma));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});