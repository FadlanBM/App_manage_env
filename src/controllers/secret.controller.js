import { PrismaClient } from '@prisma/client';
import { encryptSecret } from '../utils/encryption.js';
import { sendSuccess } from '../utils/response.js';

const prisma = new PrismaClient();

export const SecretController = {
  async create(req, res, next) {
    try {
      const { appId, keyName, value } = req.body;

      const { encryptedData, iv, authTag } = encryptSecret(value);

      const secretItem = await prisma.secretItem.create({
        data: {
          appId,
          keyName,
          encryptedData,
          iv,
          authTag,
        },
      });

      return sendSuccess(res, secretItem, 'Secret registered successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async list(req, res, next) {
    try {
      const { app_id } = req.query;
      const secrets = await prisma.secretItem.findMany({
        where: { appId: app_id },
        select: {
          id: true,
          keyName: true,
          createdAt: true,
        },
      });
      return sendSuccess(res, secrets, 'Secrets list retrieved');
    } catch (err) {
      next(err);
    }
  },
};
