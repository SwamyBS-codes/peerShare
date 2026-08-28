const { WebSocketServer } = require('ws');
const { handleConnection } = require('./connectionHandler');

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

  return wss;
}

module.exports = {
  initWebSocketServer,
};
