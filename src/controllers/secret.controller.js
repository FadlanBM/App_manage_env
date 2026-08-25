import { PrismaClient } from '@prisma/client';
import { encryptSecret } from '../utils/encryption.js';
import { sendSuccess } from '../utils/response.js';

const prisma = new PrismaClient();

export const SecretController = {
  async create(req, res, next) {
    try {
      const { secrets } = req.body;

      // Bulk: array of secrets
      if (Array.isArray(secrets)) {
        const created = await prisma.$transaction(
          secrets.map(({ appId, keyName, value }) => {
            const { encryptedData, iv, authTag } = encryptSecret(value);
            return prisma.secretItem.create({
              data: { appId, keyName, encryptedData, iv, authTag },
            });
          }),
        );
        return sendSuccess(res, created, `${created.length} secrets registered successfully`, 201);
      }

      // Single: legacy object
      const { appId, keyName, value } = req.body;
      const { encryptedData, iv, authTag } = encryptSecret(value);
      const secretItem = await prisma.secretItem.create({
        data: { appId, keyName, encryptedData, iv, authTag },
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
