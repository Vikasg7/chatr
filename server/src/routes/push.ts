import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, AuthRequest } from "../middleware/auth";

export default (prisma: PrismaClient) => {
    const router = Router();

    // Subscribe to push notifications
    router.post("/subscribe", requireAuth, async (req: AuthRequest, res) => {
        try {
            const { endpoint, keys } = req.body;
            const userId = req.userId!;

            if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
                return res.status(400).json({ error: "Invalid subscription" });
            }

            await prisma.pushSubscription.upsert({
                where: { endpoint },
                update: {
                    userId,
                    p256dh: keys.p256dh,
                    auth: keys.auth
                },
                create: {
                    endpoint,
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                    userId
                }
            });

            res.status(201).json({ success: true });
        } catch (err) {
            res.status(500).json({ error: "Failed to subscribe" });
        }
    });

    // Unsubscribe from push notifications
    router.post("/unsubscribe", requireAuth, async (req: AuthRequest, res) => {
        try {
            const { endpoint } = req.body;
            if (!endpoint) return res.status(400).json({ error: "Endpoint required" });

            await prisma.pushSubscription.deleteMany({
                where: { endpoint }
            });

            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: "Failed to unsubscribe" });
        }
    });

    return router;
};
