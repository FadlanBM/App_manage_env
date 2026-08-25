import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import config from '../config/index.js';

export function generateAccessToken(userId, appName, email, role = 'user') {
  return jwt.sign(
    { user_id: userId, app_id: appName, email, role },
    config.jwtSecret,
    { expiresIn: config.accessTokenTtl },
  );
}

export function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

/**
 * Parse a TTL string like '30d', '15m', '1h' into milliseconds.
 */
export function parseTtlMs(ttl) {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid TTL format: ${ttl}`);
  const val = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return val * multipliers[unit];
}
