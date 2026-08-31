const WebSocket = require('ws');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQxNjNmMmJlLWI1OGItNGYzZS05ZGE4LTM1OTMwMTY1NWJjNSIsInVzZXJJZCI6ImJoYXJhdGhydmNlIiwiaWF0IjoxNzg4MDIyMjM2LCJleHAiOjE3ODg2MjcwMzZ9.BRG2cjKBKEr_QuBP9nNXygcANOzvi5IlXG5i9OUcj5c';
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
