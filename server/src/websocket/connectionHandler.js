const {
  ROOM_ID_PATTERN,
  NEARBY_ROOM_PATTERN,
  SESSION_TTL_MS,
  MAX_SIGNAL_PAYLOAD_BYTES,
  SIGNAL_RATE_LIMIT_PER_SEC,
} = require('../config');
const { getRoom, rooms } = require('../services/roomManager');
const { verifySessionToken, parseBearerToken } = require('../services/tokenService');

/**
 * Send a serialized JSON payload over a socket.
 * @param {WebSocket} ws
 * @param {object} payload
 */
function sendJSON(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

/**
 * Terminate a socket and issue a signaling error message.
 * @param {WebSocket} ws
 * @param {string} message
 * @param {number} code
 */
function closeSocketWithError(ws, message, code = 1008) {
  sendJSON(ws, { type: 'error', message });
  ws.close(code, message);
}

/**
 * Broadcast message to other peers in a room.
 * @param {object} room
 * @param {object} payload
 * @param {string} exceptPeerId
 */
function broadcast(room, payload, exceptPeerId) {
  for (const [peerId, socket] of room.peers.entries()) {
    if (peerId === exceptPeerId) {
      continue;
    }
    sendJSON(socket, payload);
  }
}

/**
 * Manage connection flow for a new socket peer joining a room.
 * Performs authorization checks, sets up message routers, and handles cleanup.
 */
function handleConnection(ws, req) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const roomId = requestUrl.searchParams.get('roomId')?.trim();
  const peerId = requestUrl.searchParams.get('peerId')?.trim();
  const role = requestUrl.searchParams.get('role')?.trim() || 'receiver';
  const tokenFromQuery = requestUrl.searchParams.get('token')?.trim();
  const tokenFromHeader = parseBearerToken(req.headers.authorization);
  const token = tokenFromQuery || tokenFromHeader;

  // 1. Basic Parameter Validation
  if (!roomId || !peerId || !ROOM_ID_PATTERN.test(roomId)) {
    closeSocketWithError(ws, 'Missing or invalid roomId/peerId');
    return;
  }

  if (!['sender', 'receiver'].includes(role)) {
    closeSocketWithError(ws, 'Invalid role');
    return;
  }

  // 2. Room existence and expiration check
  const room = getRoom(roomId);
  if (Date.now() > room.expiresAt) {
    closeSocketWithError(ws, 'Session expired');
    return;
  }

  // 3. Authorization verification
  // Nearby rooms (4-digit code) can bypass token checks for receiver role only.
  const isNearbyCodeRoom = NEARBY_ROOM_PATTERN.test(roomId);
  const receiverCanBypassToken = role === 'receiver' && isNearbyCodeRoom && !token;

  if (!receiverCanBypassToken) {
    const verifiedToken = verifySessionToken(token, roomId, role);
    if (!verifiedToken.ok) {
      closeSocketWithError(ws, verifiedToken.message);
      return;
    }
  }

  // Extends room lifespan on active peer connection
  room.expiresAt = Math.max(room.expiresAt, Date.now() + SESSION_TTL_MS);

  // 4. Role uniqueness validation
  for (const [existingPeerId, existingWs] of room.peers.entries()) {
    if (existingPeerId === peerId) {
      continue;
    }

    if (existingWs.__role === role) {
      closeSocketWithError(ws, `${role} is already connected in this session`);
      return;
    }
  }

  // 5. Capacity checks
  if (!room.peers.has(peerId) && room.peers.size >= room.maxPeers) {
    closeSocketWithError(ws, `Session is full (max ${room.maxPeers} peers)`);
    return;
  }

  // Bind properties to socket session
  ws.__peerId = peerId;
  ws.__roomId = roomId;
  ws.__role = role;
  ws.__messageWindow = { second: Math.floor(Date.now() / 1000), count: 0 };

  room.peers.set(peerId, ws);

  // 6. Notify connection and coordinate peers list exchange
  const peers = [...room.peers.entries()]
    .filter(([id]) => id !== peerId)
    .map(([id, socket]) => ({ peerId: id, role: socket.__role || 'receiver' }));

  sendJSON(ws, {
    type: 'peers',
    peers,
    session: {
      roomId,
      expiresAt: room.expiresAt,
      maxPeers: room.maxPeers,
      role,
    },
  });

  broadcast(room, { type: 'peer-joined', peerId, role }, peerId);

  // 7. Message signal router with rate-limiting constraints
  ws.on('message', (rawData) => {
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
      return;
    }

    // Forwarding signal messages to specific peers
    if (message.type === 'signal' && message.targetPeerId && message.data) {
      const targetWs = room.peers.get(message.targetPeerId);
      if (!targetWs) {
        return;
      }

      sendJSON(targetWs, {
        type: 'signal',
        fromPeerId: peerId,
        fromRole: role,
        data: message.data,
      });
    }
  });

  // 8. Disconnection handler
  ws.on('close', () => {
    const activeRoom = rooms.get(roomId);
    if (!activeRoom) {
      return;
    }

    activeRoom.peers.delete(peerId);
    broadcast(activeRoom, { type: 'peer-left', peerId, role });

    // Delete empty rooms
    if (activeRoom.peers.size === 0) {
      rooms.delete(roomId);
    }
  });
}

module.exports = {
  handleConnection,
  closeSocketWithError,
};
