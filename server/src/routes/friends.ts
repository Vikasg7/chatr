import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { WSService } from "../ws";
import { deleteFile } from "../lib/file";
import logger from "../lib/logger";

export default (prisma: PrismaClient, wsService: WSService) => {
    const router = Router();

    // LIST FRIENDS & REQUESTS (with pagination)
    router.get("/", requireAuth, async (req: AuthRequest, res) => {
        const userId = req.userId!;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        const relations = await prisma.friend.findMany({
            where: {
                OR: [
                    { senderId: userId },
                    { receiverId: userId }
                ]
            },
            take: limit,
            skip: offset,
            orderBy: { createdAt: "desc" },
            include: {
                sender: { select: { id: true, email: true, name: true, avatarUrl: true } },
                receiver: { select: { id: true, email: true, name: true, avatarUrl: true } }
            }
        });
        res.json(relations);
    });

    // SEND FRIEND REQUEST
    router.post("/request", requireAuth, async (req: AuthRequest, res) => {
        const { userId: receiverId } = req.body;
        const senderId = req.userId!;

        if (!receiverId) return res.status(400).json({ error: "Receiver ID required" });
        if (senderId === receiverId) return res.status(400).json({ error: "Cannot add yourself" });

        try {
            const existing = await prisma.friend.findFirst({
                where: {
                    OR: [
                        { senderId, receiverId },
                        { senderId: receiverId, receiverId: senderId }
                    ]
                }
            });

            if (existing) {
                const msg = existing.status === "PENDING"
                    ? "Friend request is already pending."
                    : "You are already friends with this user.";
                return res.status(400).json({ error: msg });
            }

            const request = await prisma.friend.create({
                data: {
                    senderId,
                    receiverId,
                    status: "PENDING"
                },
                include: {
                    sender: { select: { id: true, email: true, name: true, avatarUrl: true } },
                    receiver: { select: { id: true, email: true, name: true, avatarUrl: true } }
                }
            });

            res.json(request);

            // Notify receiver
            wsService.sendToUser(receiverId, {
                type: "friend:new",
                friend: request
            });
        } catch (err) {
            logger.error(err);
            res.status(500).json({ error: "Failed to send request" });
        }
    });

    // ACCEPT FRIEND REQUEST
    router.post("/accept/:requestId", requireAuth, async (req: AuthRequest, res) => {
        const requestId = parseInt(req.params.requestId);
        const userId = req.userId!;

        const request = await prisma.friend.findUnique({
            where: { id: requestId }
        });

        if (!request) return res.status(404).json({ error: "Request not found" });
        if (request.receiverId !== userId) return res.status(403).json({ error: "Only the receiver can accept" });
        if (request.status !== "PENDING") return res.status(400).json({ error: "Request not pending" });

        const updated = await prisma.friend.update({
            where: { id: requestId },
            data: { status: "ACCEPTED" },
            include: {
                sender: { select: { id: true, email: true, name: true, avatarUrl: true } },
                receiver: { select: { id: true, email: true, name: true, avatarUrl: true } }
            }
        });

        res.json(updated);

        // Notify sender that it's accepted
        wsService.sendToUser(updated.senderId, {
            type: "friend:updated",
            friend: updated
        });
        // Notify receiver (current user) on other devices too if any
        wsService.sendToUser(updated.receiverId, {
            type: "friend:updated",
            friend: updated
        });
    });

    // GET MESSAGES (with pagination support)
    router.get("/:friendId/messages", requireAuth, async (req: AuthRequest, res) => {
        const friendId = parseInt(req.params.friendId);
        const userId = req.userId!;
        const limit = parseInt(req.query.limit as string) || 50;
        const beforeId = req.query.beforeId ? parseInt(req.query.beforeId as string) : undefined;
        const sinceId = req.query.since ? parseInt(req.query.since as string) : undefined;

        const friendship = await prisma.friend.findUnique({
            where: { id: friendId }
        });

        if (!friendship) return res.status(404).json({ error: "Friendship not found" });
        if (friendship.senderId !== userId && friendship.receiverId !== userId) {
            return res.status(403).json({ error: "Access denied" });
        }

        const messages = await prisma.message.findMany({
            where: {
                friendId,
                id: sinceId ? { gt: sinceId } : beforeId ? { lt: beforeId } : undefined
            },
            orderBy: { id: sinceId ? "asc" : "desc" },
            take: limit,
            include: {
                sender: { select: { id: true, email: true, name: true, avatarUrl: true } },
                reactions: {
                    include: { user: { select: { id: true, name: true } } }
                },
                replyTo: {
                    include: {
                        sender: { select: { id: true, name: true, email: true } }
                    }
                }
            }
        });


        res.json(sinceId ? messages : messages.reverse());
    });

    // DELETE FRIENDSHIP
    router.delete("/:friendId", requireAuth, async (req: AuthRequest, res) => {
        const friendId = parseInt(req.params.friendId);
        const userId = req.userId!;

        const friendship = await prisma.friend.findUnique({
            where: { id: friendId }
        });

        if (!friendship) return res.status(404).json({ error: "Friendship not found" });
        if (friendship.senderId !== userId && friendship.receiverId !== userId) {
            return res.status(403).json({ error: "Access denied" });
        }

        // 1. Gather all attachment URLs before deleting records
        const messagesWithAttachments = await prisma.message.findMany({
            where: {
                friendId,
                attachmentUrl: { not: null }
            },
            select: { attachmentUrl: true }
        });

        const urlsToDelete = messagesWithAttachments
            .map(m => m.attachmentUrl)
            .filter((url): url is string => !!url);

        // 2. Perform DB cleanup (Manual cleanup to avoid FK constraints)
        await prisma.reaction.deleteMany({
            where: { message: { friendId } }
        });
        await prisma.message.deleteMany({
            where: { friendId }
        });
        await prisma.friend.delete({
            where: { id: friendId }
        });

        // 3. Fire-and-forget file deletion in the background
        if (urlsToDelete.length > 0) {
            (async () => {
                for (const url of urlsToDelete) {
                    await deleteFile(url);
                }
            })().catch(err => logger.error("Background file deletion error:", err));
        }

        // Notify both parties
        wsService.sendToUser(friendship.senderId, {
            type: "friend:deleted",
            friendId,
            senderId: friendship.senderId,
            receiverId: friendship.receiverId,
            deletedBy: userId
        });
        wsService.sendToUser(friendship.receiverId, {
            type: "friend:deleted",
            friendId,
            senderId: friendship.senderId,
            receiverId: friendship.receiverId,
            deletedBy: userId
        });

        res.json({ success: true });
    });

    return router;
};
