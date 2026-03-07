const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;
const ROOM_MAX_PEERS = Number(process.env.ROOM_MAX_PEERS || 2);
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 15 * 60 * 1000);
const SIGNAL_RATE_LIMIT_PER_SEC = Number(process.env.SIGNAL_RATE_LIMIT_PER_SEC || 45);
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret-change-me';
const SESSION_CLEANUP_MS = Number(process.env.SESSION_CLEANUP_MS || 20 * 1000);
const MAX_SIGNAL_PAYLOAD_BYTES = Number(process.env.MAX_SIGNAL_PAYLOAD_BYTES || 30 * 1024);
const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{4,64}$/;
const NEARBY_ROOM_PATTERN = /^\d{4}$/;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  const now = Date.now();
  let activePeers = 0;
  for (const room of rooms.values()) {
    activePeers += room.peers.size;
  }

  res.json({
    ok: true,
    activeRooms: rooms.size,
    activePeers,
    now,
    sessionTtlMs: SESSION_TTL_MS,
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
      maxPeers: ROOM_MAX_PEERS,
      peers: new Map(),
    });
  }
  return rooms.get(roomId);
}

function parseBearerToken(headerValue) {
  if (!headerValue || typeof headerValue !== 'string') {
    return '';
  }

  const value = headerValue.trim();
  if (!value.startsWith('Bearer ')) {
    return '';
  }

  return value.slice('Bearer '.length).trim();
}

function signSessionToken(roomId, role, expiresAt) {
  const payload = `${roomId}.${role}.${expiresAt}`;
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function verifySessionToken(token, expectedRoomId, expectedRole) {
  if (!token || typeof token !== 'string') {
    return { ok: false, message: 'Missing session token' };
  }

  const parts = token.split('.');
  if (parts.length !== 4) {
    return { ok: false, message: 'Malformed session token' };
  }

  const [roomId, role, expiresAtRaw, signature] = parts;
  if (roomId !== expectedRoomId || role !== expectedRole) {
    return { ok: false, message: 'Token does not match room or role' };
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return { ok: false, message: 'Session token expired' };
  }

  const expected = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${roomId}.${role}.${expiresAtRaw}`)
    .digest('hex');

  if (signature !== expected) {
    return { ok: false, message: 'Invalid session token' };
  }

  return { ok: true, expiresAt };
}

app.post('/session', (req, res) => {
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
});

const clientDistDir = path.resolve(__dirname, '../client/dist');
const hasClientDist = fs.existsSync(clientDistDir);

if (hasClientDist) {
  app.use(express.static(clientDistDir));

  // Support client-side routing when frontend is bundled with the server.
  app.get('*', (req, res) => {
    if (req.path.startsWith('/health') || req.path.startsWith('/session')) {
      res.status(404).json({ ok: false, message: 'Not found' });
      return;
    }

    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

function closeSocketWithError(ws, message, code = 1008) {
  sendJSON(ws, { type: 'error', message });
  ws.close(code, message);
}

function sendJSON(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(room, payload, exceptPeerId) {
  for (const [peerId, socket] of room.peers.entries()) {
    if (peerId === exceptPeerId) {
      continue;
    }
    sendJSON(socket, payload);
  }
}

function cleanupExpiredRooms() {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (room.expiresAt > now) {
      continue;
    }

    for (const socket of room.peers.values()) {
      closeSocketWithError(socket, 'Session expired');
    }
    rooms.delete(roomId);
  }
}

setInterval(cleanupExpiredRooms, SESSION_CLEANUP_MS).unref();

wss.on('connection', (ws, req) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const roomId = requestUrl.searchParams.get('roomId')?.trim();
  const peerId = requestUrl.searchParams.get('peerId')?.trim();
  const role = requestUrl.searchParams.get('role')?.trim() || 'receiver';
  const tokenFromQuery = requestUrl.searchParams.get('token')?.trim();
  const tokenFromHeader = parseBearerToken(req.headers.authorization);
  const token = tokenFromQuery || tokenFromHeader;

  if (!roomId || !peerId || !ROOM_ID_PATTERN.test(roomId)) {
    closeSocketWithError(ws, 'Missing or invalid roomId/peerId');
    return;
  }

  if (!['sender', 'receiver'].includes(role)) {
    closeSocketWithError(ws, 'Invalid role');
    return;
  }

  const room = getRoom(roomId);
  if (Date.now() > room.expiresAt) {
    closeSocketWithError(ws, 'Session expired');
    return;
  }

  const isNearbyCodeRoom = NEARBY_ROOM_PATTERN.test(roomId);
  const receiverCanBypassToken = role === 'receiver' && isNearbyCodeRoom && !token;

  if (!receiverCanBypassToken) {
    const verifiedToken = verifySessionToken(token, roomId, role);
    if (!verifiedToken.ok) {
      closeSocketWithError(ws, verifiedToken.message);
      return;
    }
  }

  room.expiresAt = Math.max(room.expiresAt, Date.now() + SESSION_TTL_MS);

  for (const [existingPeerId, existingWs] of room.peers.entries()) {
    if (existingPeerId === peerId) {
      continue;
    }

    if (existingWs.__role === role) {
      closeSocketWithError(ws, `${role} is already connected in this session`);
      return;
    }
  }

  if (!room.peers.has(peerId) && room.peers.size >= room.maxPeers) {
    closeSocketWithError(ws, `Session is full (max ${room.maxPeers} peers)`);
    return;
  }

  ws.__peerId = peerId;
  ws.__roomId = roomId;
  ws.__role = role;
  ws.__messageWindow = { second: Math.floor(Date.now() / 1000), count: 0 };

  room.peers.set(peerId, ws);

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

  ws.on('message', (rawData) => {
    if (typeof rawData !== 'string' && !Buffer.isBuffer(rawData)) {
      return;
    }

    const byteLength = Buffer.byteLength(rawData);
    if (byteLength > MAX_SIGNAL_PAYLOAD_BYTES) {
      closeSocketWithError(ws, 'Signal payload too large');
      return;
    }

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

  ws.on('close', () => {
    const activeRoom = rooms.get(roomId);
    if (!activeRoom) {
      return;
    }

    activeRoom.peers.delete(peerId);
    broadcast(activeRoom, { type: 'peer-left', peerId, role });

    if (activeRoom.peers.size === 0) {
      rooms.delete(roomId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Signaling server running on http://localhost:${PORT}`);
});