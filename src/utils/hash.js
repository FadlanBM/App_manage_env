import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const SALT_ROUNDS = 12;

export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function hashAppSecret(secret) {
  return bcrypt.hash(secret, SALT_ROUNDS);
}

export function compareAppSecret(plain, hash) {
  return bcrypt.compare(plain, hash);
}
