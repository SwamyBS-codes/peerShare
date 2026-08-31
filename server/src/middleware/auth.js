const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';

/**
 * Express middleware to verify the Bearer token in the Authorization header.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.trim().startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    return res.status(401).json({ ok: false, message: 'Access denied. Token missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ ok: false, message: 'Invalid or expired token.' });
    }
    req.user = payload; // payload contains { id, userId }
    next();
  });
}

module.exports = {
  authenticateToken,
};
