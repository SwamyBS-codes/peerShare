const { SESSION_TTL_MS, ROOM_MAX_PEERS } = require('../config');

// In-memory registry of active session rooms
const rooms = new Map();

/**
 * Get an existing room or initialize a new one.
 * @param {string} roomId
 * @returns {object}
 */
function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
      maxPeers: ROOM_MAX_PEERS,
      peers: new Map(), // peerId -> ws
    });
  }
  return rooms.get(roomId);
}

/**
 * Remove a room from the registry.
 * @param {string} roomId
 */
function deleteRoom(roomId) {
  rooms.delete(roomId);
}

/**
 * Calculate server-wide active rooms and active peers metrics.
 * @returns {{activeRooms: number, activePeers: number}}
 */
function getActiveStats() {
  let activePeers = 0;
  for (const room of rooms.values()) {
    activePeers += room.peers.size;
  }
  return {
    activeRooms: rooms.size,
    activePeers,
  };
}

/**
 * Sweep expired rooms and close their respective peer connections.
 * @param {function} onExpire Callback invoked on each expired connection
 */
function cleanupExpiredRooms(onExpire) {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (room.expiresAt > now) {
      continue;
    }

    if (onExpire) {
      for (const socket of room.peers.values()) {
        onExpire(socket);
      }
    }
    rooms.delete(roomId);
  }
}

module.exports = {
  getRoom,
  deleteRoom,
  getActiveStats,
  cleanupExpiredRooms,
  rooms,
};
