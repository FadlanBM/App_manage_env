import createError from 'http-errors';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/hash.js';
import { sendSuccess } from '../utils/response.js';

const prisma = new PrismaClient();

export const AppManagerController = {
  async listApps(req, res, next) {
    try {
      const apps = await prisma.app.findMany({
        select: {
          id: true,
          appName: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { secretItems: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, apps, 'Apps retrieved');
    } catch (err) {
      next(err);
    }
  },

  async deleteApp(req, res, next) {
    try {
      const { id } = req.params;
      const app = await prisma.app.findUnique({ where: { id } });
      if (!app) {
        throw createError(404, 'App not found');
      }

      await prisma.$transaction([
        prisma.secretItem.deleteMany({ where: { appId: id } }),
        prisma.appSecret.deleteMany({ where: { appId: id } }),
        prisma.userToken.deleteMany({ where: { appId: id } }),
        prisma.app.delete({ where: { id } }),
      ]);

      return sendSuccess(res, { id }, 'App and related secrets deleted successfully');
    } catch (err) {
      next(err);
    }
  },

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
