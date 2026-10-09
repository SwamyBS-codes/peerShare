const crypto = require('crypto');

/** @type {Map<string, { hostUserId: string, hostWs: import('ws').WebSocket, guestUserId?: string, guestWs?: import('ws').WebSocket, createdAt: number }>} */
const rooms = new Map();

const ROOM_TTL_MS = 60 * 60 * 1000;

function normalizeCode(code) {
  return String(code || '').trim().toLowerCase();
}

function generateCode() {
  return crypto.randomBytes(4).toString('hex');
}

function purgeExpired() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL_MS) {
      rooms.delete(code);
    }
  }
}

function closeRoomForHost(hostUserId) {
  const key = hostUserId.toLowerCase();
  for (const [code, room] of rooms) {
    if (room.hostUserId === key) {
      rooms.delete(code);
    }
  }
}

function createRoom(hostUserId, hostWs) {
  purgeExpired();
  closeRoomForHost(hostUserId);

  let code;
  do {
    code = generateCode();
  } while (rooms.has(code));

  rooms.set(code, {
    hostUserId: hostUserId.toLowerCase(),
    hostWs,
    createdAt: Date.now(),
  });

  return code;
}

function getRoom(code) {
  purgeExpired();
  return rooms.get(normalizeCode(code)) || null;
}

function joinRoom(code, guestUserId, guestWs) {
  const room = getRoom(code);
  if (!room) {
    return { ok: false, reason: 'This link is invalid or has expired.' };
  }

  const guest = guestUserId.toLowerCase();
  if (guest === room.hostUserId) {
    return { ok: false, reason: 'You cannot join your own share link.' };
  }

  if (room.guestWs && room.guestWs !== guestWs) {
    return { ok: false, reason: 'Someone is already connected on this link.' };
  }

  room.guestUserId = guest;
  room.guestWs = guestWs;

  return { ok: true, hostUserId: room.hostUserId, code: normalizeCode(code) };
}

function getPeerSocket(code, senderUserId) {
  const room = getRoom(code);
  if (!room) return null;

  const sender = senderUserId.toLowerCase();
  if (sender === room.hostUserId) {
    return room.guestWs || null;
  }
  if (sender === room.guestUserId) {
    return room.hostWs || null;
  }
  return null;
}

function closeRoom(code) {
  rooms.delete(normalizeCode(code));
}

function handleSocketDisconnect(ws, notify) {
  for (const [code, room] of rooms) {
    if (room.hostWs === ws) {
      if (room.guestWs) {
        notify(room.guestWs, { type: 'link-closed', code, reason: 'Host ended the session.' });
      }
      rooms.delete(code);
      continue;
    }

    if (room.guestWs === ws) {
      room.guestWs = undefined;
      room.guestUserId = undefined;
      notify(room.hostWs, { type: 'link-peer-left', code });
    }
  }
}

module.exports = {
  createRoom,
  getRoom,
  joinRoom,
  getPeerSocket,
  closeRoom,
  closeRoomForHost,
  handleSocketDisconnect,
};
