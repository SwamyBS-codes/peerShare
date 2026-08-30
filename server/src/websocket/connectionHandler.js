const jwt = require('jsonwebtoken');
const prisma = require('../services/prisma');
const {
  registerUser,
  unregisterUser,
  getSocketByUsername,
  getOnlineStatuses,
} = require('../services/userManager');
const { MAX_SIGNAL_PAYLOAD_BYTES, SIGNAL_RATE_LIMIT_PER_SEC } = require('../config');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';

/**
 * Send a serialized JSON payload over a socket.
 */
function sendJSON(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

/**
 * Terminate a socket and issue a signaling error message.
 */
function closeSocketWithError(ws, message, code = 1008) {
  sendJSON(ws, { type: 'error', message });
  ws.close(code, message);
}

/**
 * Broadcast status update of a user to all their online friends.
 * @param {string} id User UUID
 * @param {string} userId User public handle
 * @param {boolean} isOnline
 */
async function notifyFriendsPresence(id, userId, isOnline) {
  try {
    // Get all accepted friendships
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId1: id },
          { userId2: id }
        ],
        status: 'accepted'
      },
      include: {
        user1: { select: { id: true, userId: true } },
        user2: { select: { id: true, userId: true } }
      }
    });

    friendships.forEach((f) => {
      const friend = f.userId1 === id ? f.user2 : f.user1;
      const friendWs = getSocketByUsername(friend.userId);
      if (friendWs) {
        // Send online status update
        sendJSON(friendWs, {
          type: 'status-update',
          statuses: { [userId.toLowerCase()]: isOnline }
        });
      }
    });
  } catch (err) {
    console.error(`[WS] Error notifying friends presence for ${userId}:`, err);
  }
}

/**
 * Manage connection flow for a authenticated WebSocket client.
 */
async function handleConnection(ws, req) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const token = requestUrl.searchParams.get('token')?.trim();

  // 1. Authenticate WebSocket Client using JWT
  if (!token) {
    closeSocketWithError(ws, 'Authentication token missing.');
    return;
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    closeSocketWithError(ws, 'Session invalid or expired.');
    return;
  }

  const { id, userId } = payload; // Extract User UUID and public ID handle

  // 2. Register socket connection
  registerUser(id, userId, ws);

  // Set message window for rate-limiting
  ws.__messageWindow = { second: Math.floor(Date.now() / 1000), count: 0 };

  // Notify online friends that this user just logged on
  await notifyFriendsPresence(id, userId, true);

  // 3. Message Router
  ws.on('message', async (rawData) => {
    if (typeof rawData !== 'string' && !Buffer.isBuffer(rawData)) {
      return;
    }

    const byteLength = Buffer.byteLength(rawData);
    if (byteLength > MAX_SIGNAL_PAYLOAD_BYTES) {
      closeSocketWithError(ws, 'Signal payload too large');
      return;
    }

    // Rate-limiting check: sliding window per second
    const nowSecond = Math.floor(Date.now() / 1000);
    if (ws.__messageWindow.second !== nowSecond) {
      ws.__messageWindow = { second: nowSecond, count: 0 };
    }

    ws.__messageWindow.count += 1;
    if (ws.__messageWindow.count > SIGNAL_RATE_LIMIT_PER_SEC) {
      closeSocketWithError(ws, 'Rate limit exceeded for signaling messages');
      return;
    }

    let message;
    try {
      message = JSON.parse(rawData.toString());
    } catch {
      return; // Ignore malformed JSON
    }

    switch (message.type) {
      // client checks which friends are online
      case 'check-status': {
        const { friends } = message;
        if (Array.isArray(friends)) {
          const statuses = getOnlineStatuses(friends);
          sendJSON(ws, { type: 'status-update', statuses });
        }
        break;
      }

      // client sends an invitation (call or file)
      case 'invite': {
        const { targetUserId, mediaType, inviteMessage } = message;
        const targetWs = getSocketByUsername(targetUserId);

        if (targetWs) {
          sendJSON(targetWs, {
            type: 'incoming-invite',
            senderUserId: userId, // Public handle of the sender
            mediaType,            // 'video' or 'file'
            inviteMessage         // Custom message
          });
        } else {
          sendJSON(ws, {
            type: 'invite-failed',
            targetUserId,
            reason: 'User is currently offline.'
          });
        }
        break;
      }

      // client responds to an invitation
      case 'invite-response': {
        const { targetUserId, accepted } = message;
        const targetWs = getSocketByUsername(targetUserId);

        if (targetWs) {
          sendJSON(targetWs, {
            type: 'invite-response',
            senderUserId: userId,
            accepted
          });
        }
        break;
      }

      // relay WebRTC signaling payload (SDP and ICE Candidates)
      case 'signal': {
        const { targetUserId, data } = message;
        const targetWs = getSocketByUsername(targetUserId);

        if (targetWs) {
          sendJSON(targetWs, {
            type: 'signal',
            fromUserId: userId,
            data
          });
        }
        break;
      }

      default:
        break;
    }
  });

  // 4. Cleanup on disconnect
  ws.on('close', async () => {
    unregisterUser(ws);
    // Only broadcast offline status if the user has no active socket
    if (!getSocketByUsername(userId)) {
      await notifyFriendsPresence(id, userId, false);
    }
  });
}

module.exports = {
  handleConnection,
  closeSocketWithError,
};
