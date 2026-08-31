const PORT = process.env.PORT || 3001;
const SIGNAL_RATE_LIMIT_PER_SEC = Number(process.env.SIGNAL_RATE_LIMIT_PER_SEC || 45);
const MAX_SIGNAL_PAYLOAD_BYTES = Number(process.env.MAX_SIGNAL_PAYLOAD_BYTES || 30 * 1024);

module.exports = {
  PORT,
  SIGNAL_RATE_LIMIT_PER_SEC,
  MAX_SIGNAL_PAYLOAD_BYTES,
};
