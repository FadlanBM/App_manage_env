import createError from 'http-errors';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/hash.js';
import { sendSuccess } from '../utils/response.js';

const prisma = new PrismaClient();

export const AppManagerController = {
  async createApp(req, res, next) {
    try {
      const { appName } = req.body;

      // Check if app exists
      const existing = await prisma.app.findUnique({ where: { appName } });
      if (existing) {
        throw createError(409, 'App already exists');
      }

      // Generate strong random secret (256-bit hex = 64 chars)
      const secret = crypto.randomBytes(32).toString('hex');
      const secretHash = await hashPassword(secret);

      const app = await prisma.app.create({
        data: {
          appName,
          secrets: { create: { label: 'default', secret: secretHash } },
        },
        select: { id: true, appName: true, isActive: true, createdAt: true },
      });

      // Plaintext only returned once, never retrievable again
      return sendSuccess(res, { ...app, secret_plaintext: secret }, 'App created', 201);
    } catch (err) {
      next(err);
    }
  },
};
