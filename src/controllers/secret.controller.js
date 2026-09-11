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
      const { appId } = req.query;
      const secrets = await prisma.secretItem.findMany({
        where: { appId },
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

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { keyName, value } = req.body;

      if (!keyName && !value) {
        return res.status(400).json({ success: false, message: 'Nothing to update' });
      }

      const secretItem = await prisma.secretItem.findUnique({
        where: { id },
      });

      if (!secretItem) {
        return res.status(404).json({ success: false, message: 'Secret not found' });
      }

      const updateData = {};
      if (keyName) {
        updateData.keyName = keyName;
      }
      if (value) {
        const { encryptedData, iv, authTag } = encryptSecret(value);
        updateData.encryptedData = encryptedData;
        updateData.iv = iv;
        updateData.authTag = authTag;
      }

      const updatedSecret = await prisma.secretItem.update({
        where: { id },
        data: updateData,
      });

      return sendSuccess(res, updatedSecret, 'Secret updated successfully');
    } catch (err) {
      next(err);
    }
  },
};
