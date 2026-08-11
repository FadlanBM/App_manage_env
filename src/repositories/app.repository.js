import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

export const AppRepository = {
  findByAppName(appName) {
    return db.app.findUnique({ where: { appName } });
  },

  /** Get all active (non-revoked) secrets for an app */
  findActiveSecrets(appId) {
    return db.appSecret.findMany({
      where: { appId, revokedAt: null },
    });
  },

  async clear() {
    await db.appSecret.deleteMany();
    await db.app.deleteMany();
  },
};
