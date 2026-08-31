const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../services/prisma');
const otpService = require('../services/otpService');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';

/**
 * Step 1: Validate username/email uniqueness and send OTP
 */
async function registerRequest(req, res) {
  try {
    const { email, userId, password } = req.body;

    if (!email || !userId || !password) {
      return res.status(400).json({ ok: false, message: 'All fields are required.' });
    }

    const emailTrimmed = email.trim().toLowerCase();
    const userIdTrimmed = userId.trim().toLowerCase();

    // 1. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      return res.status(400).json({ ok: false, message: 'Invalid email format.' });
    }

    // 2. Validate User ID format
    const userIdRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!userIdRegex.test(userIdTrimmed)) {
      return res.status(400).json({ 
        ok: false, 
        message: 'User ID must be 3-30 characters long and contain only letters, numbers, and underscores.' 
      });
    }

    // 3. Check database for existing records
    const existingEmail = await prisma.user.findUnique({
      where: { email: emailTrimmed }
    });
    if (existingEmail) {
      return res.status(400).json({ ok: false, message: 'Email is already registered.' });
    }

    const existingUserId = await prisma.user.findUnique({
      where: { userId: userIdTrimmed }
    });
    if (existingUserId) {
      return res.status(400).json({ ok: false, message: 'User ID is already taken.' });
    }

    // 4. Dispatch OTP
    const result = await otpService.send(emailTrimmed);
    console.log(`[AUTH] Sent verification code to ${emailTrimmed}. Code: ${result.otp}`);

    res.json({
      ok: true,
      message: 'Verification code sent to your email.',
      // Return otp directly in response ONLY if Gmail is not configured (to help testing)
      otp: (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) ? result.otp : undefined
    });
  } catch (error) {
    console.error('[AUTH] Register Request Error:', error);
    res.status(500).json({ 
      ok: false, 
      message: error.message || 'An error occurred during registration request.' 
    });
  }
}

/**
 * Step 2: Verify OTP and create User account
 */
async function registerVerify(req, res) {
  try {
    const { email, userId, password, otp } = req.body;

    if (!email || !userId || !password || !otp) {
      return res.status(400).json({ ok: false, message: 'All fields are required.' });
    }

    const emailTrimmed = email.trim().toLowerCase();
    const userIdTrimmed = userId.trim().toLowerCase();

    // 1. Verify OTP
    try {
      const isValid = await otpService.verify(emailTrimmed, otp);
      if (!isValid) {
        return res.status(400).json({ ok: false, message: 'Invalid or expired verification code.' });
      }
    } catch (otpError) {
      return res.status(400).json({ 
        ok: false, 
        message: otpError.message || 'Verification failed.' 
      });
    }

    // Double check availability (race conditions are caught by DB @unique constraints)
    const existingEmail = await prisma.user.findUnique({ where: { email: emailTrimmed } });
    if (existingEmail) throw new Error('Email is already registered.');

    const existingUserId = await prisma.user.findUnique({ where: { userId: userIdTrimmed } });
    if (existingUserId) throw new Error('User ID is already taken.');

    // 2. Hash Password
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Create User record
    let user;
    try {
      user = await prisma.user.create({
        data: {
          email: emailTrimmed,
          userId: userIdTrimmed,
          passwordHash
        }
      });
    } catch (dbErr) {
      if (dbErr.code === 'P2002') {
        throw new Error('Email or User ID is already taken.');
      }
      throw dbErr;
    }

    // 4. Issue Session Token
    const token = jwt.sign(
      { id: user.id, userId: user.userId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      ok: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: user.id,
        userId: user.userId
      }
    });
  } catch (error) {
    console.error('[AUTH] Register Verify Error:', error);
    res.status(500).json({ 
      ok: false, 
      message: error.message || 'An error occurred during account creation.' 
    });
  }
}

/**
 * User Login Handler
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'Email and password are required.' });
    }

    const emailTrimmed = email.trim().toLowerCase();

    // 1. Find User by Email
    const user = await prisma.user.findUnique({
      where: { email: emailTrimmed }
    });
    if (!user) {
      return res.status(400).json({ ok: false, message: 'Invalid email or password.' });
    }

    // 2. Verify Password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ ok: false, message: 'Invalid email or password.' });
    }

    // 3. Issue Token
    const token = jwt.sign(
      { id: user.id, userId: user.userId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      ok: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        userId: user.userId
      }
    });
  } catch (error) {
    console.error('[AUTH] Login Error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'An error occurred during login.' 
    });
  }
}

module.exports = {
  registerRequest,
  registerVerify,
  login,
};
