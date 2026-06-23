const crypto = require('crypto');
const { ROOM_ID_PATTERN, SESSION_TTL_MS } = require('../config');
const { getRoom } = require('../services/roomManager');
const { signSessionToken } = require('../services/tokenService');

/**
 * Express controller to initialize a new session room.
 * Generates room ID if not supplied and registers sender/receiver HMAC credentials.
 */
function createSession(req, res) {
  const requestedRoomId = typeof req.body?.roomId === 'string' ? req.body.roomId.trim() : '';
  const roomId = requestedRoomId || crypto.randomUUID().replaceAll('-', '').slice(0, 12);

  if (!ROOM_ID_PATTERN.test(roomId)) {
    res.status(400).json({ ok: false, message: 'Invalid roomId format' });
    return;
  }

  const room = getRoom(roomId);
  room.createdAt = Date.now();
  room.expiresAt = room.createdAt + SESSION_TTL_MS;

  const senderToken = signSessionToken(roomId, 'sender', room.expiresAt);
  const receiverToken = signSessionToken(roomId, 'receiver', room.expiresAt);

  res.json({
    ok: true,
    roomId,
    expiresAt: room.expiresAt,
    maxPeers: room.maxPeers,
    senderToken,
    receiverToken,
  });
}

module.exports = {
  createSession,
};
