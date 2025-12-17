import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, AuthRequest } from "../middleware/auth";

export default (prisma: PrismaClient) => {
  const router = Router();

  // CREATE ROOM (Private by default)
  router.post("/", requireAuth, async (req: AuthRequest, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    // 1. Create room
    // 2. Add creator as member
    // 3. Set owner
    const room = await prisma.room.create({
      data: {
        name,
        isPrivate: true,
        ownerId: req.userId!,
        members: {
          create: { userId: req.userId! }
        }
      },
    });

    res.json(room);
  });

  // LIST ROOMS (Only ones I am a member of)
  router.get("/", requireAuth, async (req: AuthRequest, res) => {
    const userId = req.userId!;
    // We want rooms where type=GROUP AND (isPrivate=false OR members includes me)
    // But per requirement, ALL rooms are private now. 
    // effectively: members includes me OR type=DM
    // logic: fetch all rooms where I am a member.

    // Note: The original code separated GROUP and DM logic implicitly or explicitly?
    // Original: where: { type: "GROUP" }

    // New Logic: 
    // Find all rooms (GROUP) where I am a member.
    const rooms = await prisma.room.findMany({
      where: {
        type: "GROUP",
        members: {
          some: { userId }
        }
      },
      orderBy: { id: "asc" },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { select: { userId: true } }
      }
    });
    res.json(rooms);
  });

  // INVITE USER
  router.post("/:roomId/invite", requireAuth, async (req: AuthRequest, res) => {
    const roomId = parseInt(req.params.roomId);
    const { email } = req.body;
    const userId = req.userId!;

    if (!email) return res.status(400).json({ error: "Email required" });

    // 1. Check if room exists and I am owner
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });

    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.ownerId !== userId) return res.status(403).json({ error: "Only owner can invite" });

    // 2. Find target user
    const target = await prisma.user.findUnique({ where: { email } });
    if (!target) return res.status(404).json({ error: "User not found" });

    // 3. Create Invite
    const invite = await prisma.roomInvite.create({
      data: {
        roomId,
        inviterId: userId,
        inviteeId: target.id,
        status: "PENDING"
      }
    });

    // 4. Send DM with invite
    // Find or create DM room
    let dmRoom = await prisma.room.findFirst({
      where: {
        type: "DM",
        members: { some: { userId } },
        AND: { members: { some: { userId: target.id } } }
      }
    });

    if (!dmRoom) {
      dmRoom = await prisma.room.create({
        data: {
          type: "DM",
          members: {
            create: [{ userId }, { userId: target.id }]
          }
        }
      });
    }

    // Send the message
    await prisma.message.create({
      data: {
        roomId: dmRoom.id,
        senderId: userId,
        text: `Invited you to join ${room.name || "a group"}`,
        metadata: {
          type: "INVITE",
          inviteId: invite.id,
          roomName: room.name,
          roomId: room.id
        }
      }
    });

    res.json({ success: true, message: "Invite sent via DM" });
  });

  // GET MESSAGES FOR ROOM
  router.get("/:roomId/messages", requireAuth, async (req: AuthRequest, res) => {
    const roomId = parseInt(req.params.roomId);
    const userId = req.userId!;

    // Security: Check membership
    const membership = await prisma.roomMember.findFirst({
      where: { roomId, userId }
    });

    if (!membership) return res.status(403).json({ error: "Access denied" });

    const msgs = await prisma.message.findMany({
      where: { roomId },
      orderBy: { id: "asc" },
      include: {
        sender: { select: { id: true, email: true, name: true, avatarUrl: true } },
        reactions: {
          include: { user: { select: { id: true, name: true } } }
        }
      },
    });

    res.json(msgs);
  });

  return router;
};