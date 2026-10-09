const prisma = require('../services/prisma');

async function listGroups(req, res) {
  try {
    const myId = req.user.id;

    const memberships = await prisma.groupMember.findMany({
      where: { userId: myId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: { select: { id: true, userId: true } },
              },
            },
          },
        },
      },
      orderBy: { group: { createdAt: 'desc' } },
    });

    const groups = memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      createdAt: m.group.createdAt,
      members: m.group.members.map((gm) => ({
        id: gm.user.id,
        userId: gm.user.userId,
      })),
    }));

    res.json({ ok: true, groups });
  } catch (error) {
    console.error('[GROUPS] List error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load groups.' });
  }
}

async function createGroup(req, res) {
  try {
    const myId = req.user.id;
    const { name, memberUserIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ ok: false, message: 'Group name is required.' });
    }

    const handles = Array.isArray(memberUserIds)
      ? [...new Set(memberUserIds.map((h) => String(h).trim().toLowerCase()).filter(Boolean))]
      : [];

    if (handles.length < 1) {
      return res.status(400).json({ ok: false, message: 'Select at least one member.' });
    }

    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ userId1: myId }, { userId2: myId }],
      },
      include: {
        user1: { select: { id: true, userId: true } },
        user2: { select: { id: true, userId: true } },
      },
    });

    const acceptedFriendIds = new Set();
    friendships.forEach((f) => {
      const friend = f.userId1 === myId ? f.user2 : f.user1;
      acceptedFriendIds.add(friend.userId.toLowerCase());
    });

    const invalid = handles.filter((h) => !acceptedFriendIds.has(h));
    if (invalid.length) {
      return res.status(400).json({
        ok: false,
        message: `These users are not accepted friends: ${invalid.join(', ')}`,
      });
    }

    const users = await prisma.user.findMany({
      where: { userId: { in: handles } },
      select: { id: true, userId: true },
    });

    if (users.length !== handles.length) {
      return res.status(400).json({ ok: false, message: 'One or more members were not found.' });
    }

    const memberIds = [...new Set(users.map((u) => u.id).filter((id) => id !== myId))];

    const group = await prisma.groupChat.create({
      data: {
        name: name.trim().slice(0, 80),
        createdById: myId,
        members: {
          create: [{ userId: myId }, ...memberIds.map((userId) => ({ userId }))],
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, userId: true } } },
        },
      },
    });

    res.json({
      ok: true,
      group: {
        id: group.id,
        name: group.name,
        createdAt: group.createdAt,
        members: group.members.map((m) => ({ id: m.user.id, userId: m.user.userId })),
      },
    });
  } catch (error) {
    console.error('[GROUPS] Create error:', error);
    const code = error?.code;
    if (code === 'P2021') {
      return res.status(503).json({
        ok: false,
        message: 'Groups are not set up on the server yet. Run database migrations (prisma migrate deploy).',
      });
    }
    res.status(500).json({ ok: false, message: 'Failed to create group.' });
  }
}

module.exports = { listGroups, createGroup };
