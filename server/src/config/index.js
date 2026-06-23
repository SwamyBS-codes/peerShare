const PORT = process.env.PORT || 3001;
const ROOM_MAX_PEERS = Number(process.env.ROOM_MAX_PEERS || 2);
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 15 * 60 * 1000);
const SIGNAL_RATE_LIMIT_PER_SEC = Number(process.env.SIGNAL_RATE_LIMIT_PER_SEC || 45);
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret-change-me';
const SESSION_CLEANUP_MS = Number(process.env.SESSION_CLEANUP_MS || 20 * 1000);
const MAX_SIGNAL_PAYLOAD_BYTES = Number(process.env.MAX_SIGNAL_PAYLOAD_BYTES || 30 * 1024);
const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{4,64}$/;
const NEARBY_ROOM_PATTERN = /^\d{4}$/;

module.exports = {
  PORT,
  ROOM_MAX_PEERS,
  SESSION_TTL_MS,
  SIGNAL_RATE_LIMIT_PER_SEC,
  SESSION_SECRET,
  SESSION_CLEANUP_MS,
  MAX_SIGNAL_PAYLOAD_BYTES,
  ROOM_ID_PATTERN,
  NEARBY_ROOM_PATTERN,
};
