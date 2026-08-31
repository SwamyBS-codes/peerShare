const prisma = require('../services/prisma');

/**
 * Get all accepted and pending friendships for the logged-in user.
 */
async function getFriends(req, res) {
  try {
    const myId = req.user.id;

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId1: myId },
          { userId2: myId }
        ]
      },
      include: {
        user1: {
          select: { id: true, userId: true }
        },
        user2: {
          select: { id: true, userId: true }
        }
      }
    });

    // Format output to label each contact nicely
    const friends = friendships.map((f) => {
      const isInitiator = f.userId1 === myId;
      const contact = isInitiator ? f.user2 : f.user1;
      return {
        friendshipId: f.id,
        status: f.status,
        friendId: contact.id,
        friendUserId: contact.userId,
        sentByMe: f.requestorId ? f.requestorId === myId : isInitiator
      };
    });

    res.json({ ok: true, friends });
  } catch (error) {
    console.error('[FRIENDS] Get Friends Error:', error);
    res.status(500).json({ ok: false, message: 'Failed to retrieve friends list.' });
  }
}

/**
 * Send a friend request to another user by their public User ID.
 */
async function sendFriendRequest(req, res) {
  try {
    const myId = req.user.id;
    const { friendUserId } = req.body;

    if (!friendUserId) {
      return res.status(400).json({ ok: false, message: 'Friend User ID is required.' });
    }

    const targetUserId = friendUserId.trim().toLowerCase();

    // 1. Can't add yourself
    if (targetUserId === req.user.userId.toLowerCase()) {
      return res.status(400).json({ ok: false, message: 'You cannot add yourself.' });
    }

    // 2. Find target user
    const targetUser = await prisma.user.findUnique({
      where: { userId: targetUserId }
    });
    if (!targetUser) {
      return res.status(404).json({ ok: false, message: 'User not found.' });
    }

    // 3. Check if friendship already exists
    // Order user IDs to avoid duplicate rows in either direction
    const [id1, id2] = myId < targetUser.id ? [myId, targetUser.id] : [targetUser.id, myId];

    const existing = await prisma.friendship.findUnique({
      where: {
        userId1_userId2: {
          userId1: id1,
          userId2: id2
        }
      }
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ ok: false, message: 'You are already friends with this user.' });
      } else {
        const isSender = (existing.userId1 === myId && existing.status === 'pending');
        return res.status(400).json({ 
          ok: false, 
          message: isSender ? 'Friend request already sent.' : 'This user has already sent you a friend request.'
        });
      }
    }

    // 4. Create pending friendship
    // We store userId1 and userId2 ordered alphabetically by ID, but we add an initiator field inside metadata if needed,
    // or just let the front-end compare friendId and who created it.
    const friendship = await prisma.friendship.create({
      data: {
        userId1: id1,
        userId2: id2,
        status: 'pending',
        requestorId: myId
      }
    });

    res.json({
      ok: true,
      message: 'Friend request sent successfully.',
      friendship: {
        id: friendship.id,
        status: friendship.status,
        friendUserId: targetUser.userId
      }
    });
  } catch (error) {
    console.error('[FRIENDS] Send Friend Request Error:', error);
    res.status(500).json({ ok: false, message: 'Failed to send friend request.' });
  }
}

/**
 * Accept an incoming pending friend request.
 */
async function acceptFriendRequest(req, res) {
  try {
    const myId = req.user.id;
    const { friendshipId } = req.body;

    if (!friendshipId) {
      return res.status(400).json({ ok: false, message: 'Friendship ID is required.' });
    }

    // Find the pending friendship
    const friendship = await prisma.friendship.findUnique({
      where: { id: Number(friendshipId) }
    });

    if (!friendship) {
      return res.status(404).json({ ok: false, message: 'Friend request not found.' });
    }

    // Verify logged in user is actually one of the participants
    if (friendship.userId1 !== myId && friendship.userId2 !== myId) {
      return res.status(403).json({ ok: false, message: 'Unauthorized action.' });
    }

    if (friendship.status === 'accepted') {
      return res.status(400).json({ ok: false, message: 'Friend request already accepted.' });
    }

    // Update status to accepted
    const updated = await prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: 'accepted' }
    });

    res.json({
      ok: true,
      message: 'Friend request accepted.',
      friendshipId: updated.id,
      status: updated.status
    });
  } catch (error) {
    console.error('[FRIENDS] Accept Friend Request Error:', error);
    res.status(500).json({ ok: false, message: 'Failed to accept friend request.' });
  }
}

module.exports = {
  getFriends,
  sendFriendRequest,
  acceptFriendRequest,
};
