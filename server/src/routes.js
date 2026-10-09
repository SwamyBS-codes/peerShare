const express = require('express');

const { registerRequest, registerVerify, login, forgotPasswordRequest, resetPassword } = require('./controllers/authController');
const { getFriends, sendFriendRequest, acceptFriendRequest } = require('./controllers/friendController');
const { getActivities, createActivity, updateActivity, deleteActivity } = require('./controllers/activityController');
const { listGroups, createGroup } = require('./controllers/groupController');
const { getMe, updateProfile, updatePassword } = require('./controllers/userController');
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
router.post('/api/auth/forgot-password-request', forgotPasswordRequest);
router.post('/api/auth/reset-password', resetPassword);

// --- User Profile (Self) ---
router.get('/api/users/me', authenticateToken, getMe);
router.patch('/api/users/me/profile', authenticateToken, updateProfile);
router.patch('/api/users/me/password', authenticateToken, updatePassword);

// --- Friends / Social Routes ---
router.get('/api/friends', authenticateToken, getFriends);
router.post('/api/friends/request', authenticateToken, sendFriendRequest);
router.post('/api/friends/accept', authenticateToken, acceptFriendRequest);

// --- Activity / Chat Logging Routes ---
router.get('/api/activities', authenticateToken, getActivities);
router.post('/api/activities', authenticateToken, createActivity);
router.patch('/api/activities/:id', authenticateToken, updateActivity);
router.delete('/api/activities/:id', authenticateToken, deleteActivity);

router.get('/api/groups', authenticateToken, listGroups);
router.post('/api/groups', authenticateToken, createGroup);

module.exports = router;
