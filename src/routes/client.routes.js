import { Router } from 'express';
import { ClientController } from '../controllers/client.controller.js';
import { verifyApp } from '../middlewares/verifyApp.js';

const router = Router();

/**
 * @swagger
 * /api/client/secrets:
 *   get:
 *     summary: Get decrypted secrets for the app (read-only)
 *     tags: [Client]
 *     parameters:
 *       - in: header
 *         name: X-App-Id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: X-App-Secret
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Decrypted secrets for this app }
 *       401: { description: Invalid app credentials }
 */
router.get('/secrets', verifyApp, ClientController.getSecrets);

export default router;
