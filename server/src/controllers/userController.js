const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../services/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
const USER_ID_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const MAX_AVATAR_BYTES = 200 * 1024;

function signUserToken(user) {
  return jwt.sign({ id: user.id, userId: user.userId }, JWT_SECRET, { expiresIn: '7d' });
}

function publicUserFields(user) {
  return {
    id: user.id,
    email: user.email,
    userId: user.userId,
    avatarUrl: user.avatarUrl || null,
  };
}

async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, userId: true, avatarUrl: true },
    });
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found.' });
    }
    res.json({ ok: true, user: publicUserFields(user) });
  } catch (error) {
    console.error('[USER] getMe Error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load profile.' });
  }
}

async function updateProfile(req, res) {
  try {
    const { userId, avatarUrl } = req.body;
    const data = {};

    if (userId !== undefined) {
      const userIdTrimmed = String(userId).trim().toLowerCase();
      if (!USER_ID_REGEX.test(userIdTrimmed)) {
        return res.status(400).json({
          ok: false,
          message: 'User ID must be 3-30 characters and use only letters, numbers, and underscores.',
        });
      }
      if (userIdTrimmed !== req.user.userId.toLowerCase()) {
        const taken = await prisma.user.findUnique({ where: { userId: userIdTrimmed } });
        if (taken) {
          return res.status(400).json({ ok: false, message: 'User ID is already taken.' });
        }
        data.userId = userIdTrimmed;
      }
    }

    if (avatarUrl !== undefined) {
      if (avatarUrl === null || avatarUrl === '') {
        data.avatarUrl = null;
      } else if (typeof avatarUrl === 'string' && avatarUrl.startsWith('data:image/')) {
        if (Buffer.byteLength(avatarUrl, 'utf8') > MAX_AVATAR_BYTES) {
          return res.status(400).json({ ok: false, message: 'Profile picture must be under 200 KB.' });
        }
        data.avatarUrl = avatarUrl;
      } else {
        return res.status(400).json({ ok: false, message: 'Invalid profile picture format.' });
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ ok: false, message: 'No profile changes provided.' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, email: true, userId: true, avatarUrl: true },
    });

    const token = signUserToken(user);

    res.json({
      ok: true,
      message: 'Profile updated.',
      user: publicUserFields(user),
      token,
      usernameChanged: Boolean(data.userId),
    });
  } catch (error) {
    console.error('[USER] updateProfile Error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ ok: false, message: 'User ID is already taken.' });
    }
    res.status(500).json({ ok: false, message: 'Failed to update profile.' });
  }
}

async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, message: 'Current and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ ok: false, message: 'New password must be at least 8 characters.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ ok: false, message: 'Current password is incorrect.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    res.json({ ok: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error('[USER] updatePassword Error:', error);
    res.status(500).json({ ok: false, message: 'Failed to update password.' });
  }
}

module.exports = {
  getMe,
  updateProfile,
  updatePassword,
};
