// In-memory mappings of active user connections
const userIdToSocket = new Map();     // DB UUID -> WebSocket
const usernameToSocket = new Map();   // Public handle (userId) -> WebSocket

/**
 * Register an online user socket.
 * @param {string} id User UUID
 * @param {string} userId Public handle (username)
 * @param {WebSocket} ws
 */
function registerUser(id, userId, ws) {
  const cleanUserId = userId.toLowerCase();
  
  // Bind properties to socket for cleanup access
  ws.__dbId = id;
  ws.__userId = cleanUserId;

  userIdToSocket.set(id, ws);
  usernameToSocket.set(cleanUserId, ws);
  
  console.log(`[USER MANAGER] Registered user: ${userId} (ID: ${id})`);
}

/**
 * Unregister a user socket on disconnect.
 * @param {WebSocket} ws
 */
function unregisterUser(ws) {
  const id = ws.__dbId;
  const userId = ws.__userId;

  if (id && userIdToSocket.get(id) === ws) {
    userIdToSocket.delete(id);
  }
  if (userId) {
    const cleanId = userId.toLowerCase();
    if (usernameToSocket.get(cleanId) === ws) {
      usernameToSocket.delete(cleanId);
      console.log(`[USER MANAGER] Unregistered user: ${userId}`);
    }
  }
}

/**
 * Retrieve socket by User UUID.
 */
function getSocketByUUID(id) {
  return userIdToSocket.get(id);
}

/**
 * Retrieve socket by public handle (userId).
 */
function getSocketByUsername(userId) {
  if (!userId) return null;
  return usernameToSocket.get(userId.toLowerCase());
}

/**
 * Determine which usernames in a list are online.
 * @param {string[]} usernames
 * @returns {object} Maps username -> boolean (online status)
 */
function getOnlineStatuses(usernames) {
  const statuses = {};
  usernames.forEach((name) => {
    const clean = name.toLowerCase();
    statuses[clean] = usernameToSocket.has(clean);
  });
  return statuses;
}

module.exports = {
  registerUser,
  unregisterUser,
  getSocketByUUID,
  getSocketByUsername,
  getOnlineStatuses,
};
