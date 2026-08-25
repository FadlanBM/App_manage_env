import { PrismaClient } from '@prisma/client';
import { decryptSecret } from '../utils/encryption.js';
import { sendSuccess } from '../utils/response.js';

const prisma = new PrismaClient();

export const ClientController = {
  async getSecrets(req, res, next) {
    try {
      // req.appId is set by verifyApp middleware = App.id
      const secrets = await prisma.secretItem.findMany({
        where: { appId: req.appId },
        select: {
          id: true,
          keyName: true,
          encryptedData: true,
          iv: true,
          authTag: true,
          createdAt: true,
        },
      });

      const decrypted = secrets.map((s) => ({
        id: s.id,
        keyName: s.keyName,
        value: decryptSecret({
          encryptedData: s.encryptedData,
          iv: s.iv,
          authTag: s.authTag,
        }),
        createdAt: s.createdAt,
      }));

      return sendSuccess(res, decrypted, 'Secrets retrieved');
    } catch (err) {
      next(err);
    }
  },
};
