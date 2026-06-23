const crypto = require('crypto');
const { SESSION_SECRET } = require('../config');

/**
 * Sign a session token for WebRTC client authentication.
 * @param {string} roomId
 * @param {'sender'|'receiver'} role
 * @param {number} expiresAt Epoch timestamp
 * @returns {string} Signed HMAC token
 */
function signSessionToken(roomId, role, expiresAt) {
  const payload = `${roomId}.${role}.${expiresAt}`;
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

/**
 * Verify a session token and check its expiration.
 * @param {string} token
 * @param {string} expectedRoomId
 * @param {'sender'|'receiver'} expectedRole
 * @returns {{ok: boolean, message?: string, expiresAt?: number}}
 */
function verifySessionToken(token, expectedRoomId, expectedRole) {
  if (!token || typeof token !== 'string') {
    return { ok: false, message: 'Missing session token' };
  }

  const parts = token.split('.');
  if (parts.length !== 4) {
    return { ok: false, message: 'Malformed session token' };
  }

  const [roomId, role, expiresAtRaw, signature] = parts;
  if (roomId !== expectedRoomId || role !== expectedRole) {
    return { ok: false, message: 'Token does not match room or role' };
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return { ok: false, message: 'Session token expired' };
  }

  const expected = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${roomId}.${role}.${expiresAtRaw}`)
    .digest('hex');

  if (signature !== expected) {
    return { ok: false, message: 'Invalid session token' };
  }

  return { ok: true, expiresAt };
}

/**
 * Extract Bearer token from HTTP Authorization header.
 * @param {string|undefined} headerValue
 * @returns {string} The raw token string or empty
 */
function parseBearerToken(headerValue) {
  if (!headerValue || typeof headerValue !== 'string') {
    return '';
  }

  const value = headerValue.trim();
  if (!value.startsWith('Bearer ')) {
    return '';
  }

  return value.slice('Bearer '.length).trim();
}

module.exports = {
  signSessionToken,
  verifySessionToken,
  parseBearerToken,
};
