const http = require('http');
const app = require('./src/app');
const { initWebSocketServer } = require('./src/websocket/server');
const { PORT } = require('./src/config');

const server = http.createServer(app);

// Initialize WebSocket Signaling Layer
initWebSocketServer(server);

// Boot Server
server.listen(PORT, () => {
  console.log(`Signaling server running on http://localhost:${PORT}`);
});