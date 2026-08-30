const express = require('express');

const { registerRequest, registerVerify, login } = require('./controllers/authController');
const { getFriends, sendFriendRequest, acceptFriendRequest } = require('./controllers/friendController');
const { getActivities, createActivity, updateActivity } = require('./controllers/activityController');
const { authenticateToken } = require('./middleware/auth');

const router = express.Router();

/**
 * Health check endpoint showing system metrics and uptime status.
 */
router.get('/', (req, res) => {
  res.json({
    ok: true,
    now: Date.now(),
  });
  console.log("signalling server is running");
});

// --- Authentication Routes ---
router.post('/api/auth/register-request', registerRequest);
router.post('/api/auth/register-verify', registerVerify);
router.post('/api/auth/login', login);

// --- User Profile (Self) ---
router.get('/api/users/me', authenticateToken, (req, res) => {
  res.json({
    ok: true,
    user: {
      id: req.user.id,
      userId: req.user.userId
    }
  });
});

// --- Friends / Social Routes ---
router.get('/api/friends', authenticateToken, getFriends);
router.post('/api/friends/request', authenticateToken, sendFriendRequest);
router.post('/api/friends/accept', authenticateToken, acceptFriendRequest);

// --- Activity / Chat Logging Routes ---
router.get('/api/activities', authenticateToken, getActivities);
router.post('/api/activities', authenticateToken, createActivity);
router.patch('/api/activities/:id', authenticateToken, updateActivity);

module.exports = router;
