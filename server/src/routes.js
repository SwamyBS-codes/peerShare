const express = require('express');
const { getActiveStats } = require('./services/roomManager');
const { SESSION_TTL_MS } = require('./config');
const { createSession } = require('./controllers/sessionController');

const router = express.Router();

/**
 * Health check endpoint showing system metrics and uptime status.
 */
router.get('/health', (req, res) => {
  const { activeRooms, activePeers } = getActiveStats();
  res.json({
    ok: true,
    activeRooms,
    activePeers,
    now: Date.now(),
    sessionTtlMs: SESSION_TTL_MS,
  });
});

/**
 * Session creation endpoint.
 */
router.post('/session', createSession);

module.exports = router;
