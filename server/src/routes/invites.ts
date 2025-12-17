import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, AuthRequest } from "../middleware/auth";

export default (prisma: PrismaClient) => {
    const router = Router();

    // ACCEPT INVITE
    router.post("/:inviteId/accept", requireAuth, async (req: AuthRequest, res) => {
        const inviteId = parseInt(req.params.inviteId);
        const userId = req.userId!;

        if (!inviteId || isNaN(inviteId)) {
            return res.status(400).json({ error: "Invalid invite ID" });
        }

        // 1. Find invite
        const invite = await prisma.roomInvite.findUnique({
            where: { id: inviteId }
        });

        if (!invite) {
            return res.status(404).json({ error: "Invite not found" });
        }

        // 2. Validate invite
        if (invite.status !== "PENDING") {
            return res.status(400).json({ error: "Invite already accepted or expired" });
        }

        if (invite.inviteeId !== userId) {
            return res.status(403).json({ error: "This invite is not for you" });
        }

        // 3. Process acceptance (Transaction)
        try {
            await prisma.$transaction(async (tx) => {
                // Update invite status
                await tx.roomInvite.update({
                    where: { id: inviteId },
                    data: { status: "ACCEPTED" }
                });

                // Add user to room
                await tx.roomMember.create({
                    data: {
                        roomId: invite.roomId,
                        userId: userId
                    }
                });

                // 4. Update message metadata to reflect acceptance
                const messages = await tx.message.findMany({
                    where: {
                        metadata: {
                            path: ["inviteId"],
                            equals: inviteId
                        }
                    }
                });

                for (const msg of messages) {
                    const currentMetadata = (msg.metadata as any) || {};
                    await tx.message.update({
                        where: { id: msg.id },
                        data: {
                            metadata: {
                                ...currentMetadata,
                                status: "ACCEPTED"
                            }
                        }
                    });
                }
            });

            // Fetch the room with owner info for the sidebar
            const room = await prisma.room.findUnique({
                where: { id: invite.roomId },
                include: {
                    owner: { select: { id: true, name: true, email: true } }
                }
            });

            res.json({ success: true, room });
        } catch (err: any) {
            console.error("Failed to accept invite", err);
            // P2002 is Prisma's error code for unique constraint violations
            if (err.code === 'P2002') {
                return res.status(400).json({ error: "You are already a member of this room" });
            }
            res.status(500).json({ error: "Failed to join room" });
        }
    });

    return router;
};
