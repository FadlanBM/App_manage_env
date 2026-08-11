import createError from 'http-errors';
import config from '../config/index.js';
import { UserRepository } from '../repositories/user.repository.js';
import { UserTokenRepository } from '../repositories/userToken.repository.js';
import { hashPassword, comparePassword, hashRefreshToken } from '../utils/hash.js';
import { generateAccessToken, generateRefreshToken, parseTtlMs } from '../utils/jwt.js';

async function _generateTokenPair(userId, appName, email, appId) {
  const accessToken = generateAccessToken(userId, appName, email);
  const rawRefreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + parseTtlMs(config.refreshTokenTtl));

  await UserTokenRepository.create({
    userId,
    appId,
    refreshToken: refreshTokenHash,
    expiresAt,
  });

  return { access_token: accessToken, refresh_token: rawRefreshToken };
}

export const AuthService = {
  async register(name, email, password, appId, appName) {
    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      throw createError(409, 'Email already registered');
    }

    const passwordHash = await hashPassword(password);
    const user = await UserRepository.create({ name, email, passwordHash });
    const tokens = await _generateTokenPair(user.id, appName, user.email, appId);

    return { ...tokens, user: { id: user.id, name: user.name, email: user.email } };
  },

  async login(email, password, appId, appName) {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw createError(401, 'Invalid email or password');
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw createError(401, 'Invalid email or password');
    }

    const tokens = await _generateTokenPair(user.id, appName, user.email, appId);

    return { ...tokens, user: { id: user.id, name: user.name, email: user.email } };
  },

  async refreshToken(rawRefreshToken, appId, appName) {
    const hash = hashRefreshToken(rawRefreshToken);
    const tokenRecord = await UserTokenRepository.findValidToken(hash, appId);

    if (!tokenRecord) {
      throw createError(401, 'Invalid or expired refresh token');
    }

    await UserTokenRepository.revokeById(tokenRecord.id);

    const user = await UserRepository.findById(tokenRecord.userId);
    if (!user) {
      throw createError(401, 'User not found');
    }

    return _generateTokenPair(user.id, appName, user.email, appId);
  },

  async logout(userId, appId) {
    await UserTokenRepository.revokeByUserAndApp(userId, appId);
  },

  async logoutAll(userId) {
    await UserTokenRepository.revokeAllByUser(userId);
  },
};
