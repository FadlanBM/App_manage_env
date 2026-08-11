import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

export const UserTokenRepository = {
  create({ userId, appId, refreshToken, expiresAt }) {
    return db.userToken.create({
      data: { userId, appId, refreshToken, expiresAt },
    });
  },

  findValidToken(refreshTokenHash, appId) {
    return db.userToken.findFirst({
      where: {
        refreshToken: refreshTokenHash,
        appId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  },

  async revokeById(id) {
    await db.userToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  },

  async revokeByUserAndApp(userId, appId) {
    await db.userToken.updateMany({
      where: { userId, appId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async revokeAllByUser(userId) {
    await db.userToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async clear() {
    await db.userToken.deleteMany();
  },
};
