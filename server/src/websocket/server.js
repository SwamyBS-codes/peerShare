const { WebSocketServer } = require('ws');
const { handleConnection, closeSocketWithError } = require('./connectionHandler');
const { cleanupExpiredRooms } = require('../services/roomManager');
const { SESSION_CLEANUP_MS } = require('../config');

/**
 * Configure and initialize WebSocket signaling handler on top of the HTTP server.
 * @param {HttpServer} server
 * @returns {WebSocketServer}
 */
function initWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    handleConnection(ws, req);
  });

  // Start background room eviction schedule
  setInterval(() => {
    cleanupExpiredRooms((socket) => {
      closeSocketWithError(socket, 'Session expired');
    });
  }, SESSION_CLEANUP_MS).unref();

  return wss;
}

module.exports = {
  initWebSocketServer,
};
