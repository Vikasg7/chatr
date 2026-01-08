import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// Ensure uploads dir exists
// Use project root with server/ prefix for monorepo structure
const uploadDir = path.join(process.cwd(), "server/public/uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        cb(null, uploadDir);
    },
    filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        // secure random filename + ext
        const ext = path.extname(file.originalname);
        const name = crypto.randomUUID();
        cb(null, `${name}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB strictly
    fileFilter: (req: any, file: any, cb: any) => {
        const allowedMimes = [
            "image/jpeg", "image/png", "image/webp", "image/gif",
            "video/mp4", "video/webm", "video/quicktime",
            "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm",
            "text/plain", "text/markdown", "application/pdf",
            "application/json", "text/csv", "application/zip",
            "application/x-zip-compressed"
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("File type not allowed. Please upload images, videos, audio, or standard documents."), false);
        }
    }
});

router.post("/", requireAuth, upload.single("file"), (req: AuthRequest, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const url = `/uploads/${req.file.filename}`;
    const name = req.file.originalname;

    // Granular type detection
    let type = "FILE";
    const mime = req.file.mimetype;

    if (mime.startsWith("image/")) {
        type = "IMAGE";
    } else if (mime.startsWith("video/")) {
        type = "VIDEO";
    } else if (mime.startsWith("audio/")) {
        type = "AUDIO";
    } else if (mime.startsWith("text/") ||
        /\.(txt|md|js|ts|json|py|html|css|csv)$/i.test(name)) {
        type = "TEXT";
    }

    res.json({ url, type, name });
});

export default router;
