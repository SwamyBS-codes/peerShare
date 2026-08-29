const WebSocket = require('ws');

const token = 'invalid-token-123';
const ws = new WebSocket(`wss://peershare.duckdns.org/?token=${token}`);

ws.on('open', () => {
  console.log('Connected!');
});

ws.on('error', (err) => {
  console.error('Error:', err);
});

ws.on('close', (code, reason) => {
  console.log(`Closed: ${code} ${reason.toString()}`);
});
