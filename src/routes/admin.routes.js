import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { AppManagerController } from '../controllers/appManager.controller.js';
import { SecretController } from '../controllers/secret.controller.js';
import { validate } from '../middlewares/validate.js';
import { adminAuth } from '../middlewares/adminAuth.js';
import {
  adminRegisterRules,
  adminLoginRules,
  createAppRules,
  createSecretRules,
} from '../validators/admin.validator.js';

const router = Router();

/**
 * @swagger
 * /api/admin/register:
 *   post:
 *     summary: Register a new admin
 *     tags: [Admin Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: Admin User }
 *               email: { type: string, format: email, example: admin@example.com }
 *               password: { type: string, format: password, minLength: 8, example: "adminpass123" }
 *     responses:
 *       201: { description: Admin registered, returns JWT token }
 *       409: { description: Email already registered }
 *       422: { description: Validation error }
 */
router.post('/register', validate(adminRegisterRules), AdminController.register);

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Admin login
 *     tags: [Admin Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: admin@example.com }
 *               password: { type: string, format: password, example: "adminpass123" }
 *     responses:
 *       200: { description: Login successful, returns JWT token }
 *       401: { description: Invalid credentials }
 *       422: { description: Validation error }
 */
router.post('/login', validate(adminLoginRules), AdminController.login);

/**
 * @swagger
 * /api/admin/apps:
 *   post:
 *     summary: Register a new app (secret auto-generated)
 *     tags: [Admin Apps]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [appName]
 *             properties:
 *               appName: { type: string, example: My Mobile App }
 *     responses:
 *       201:
 *         description: App registered, returns appId and generated secret (shown once)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 appName: { type: string }
 *                 secret_plaintext: { type: string, description: Generated secret, shown only once }
 *       401: { description: Unauthorized }
 *       409: { description: App already exists }
 *       422: { description: Validation error }
 */
router.post('/apps', adminAuth, validate(createAppRules), AppManagerController.createApp);

/**
 * @swagger
 * /api/admin/secrets:
 *   post:
 *     summary: Create a new secret for an app
 *     tags: [Admin Secrets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [appId, keyName, value]
 *             properties:
 *               appId: { type: string, format: uuid, example: "123e4567-e89b-12d3-a456-426614174000" }
 *               keyName: { type: string, example: API_KEY }
 *               value: { type: string, example: sk-xxx-yyy-zzz }
 *     responses:
 *       201: { description: Secret created }
 *       401: { description: Unauthorized }
 *       404: { description: App not found }
 *       422: { description: Validation error }
 */
router.post('/secrets', adminAuth, validate(createSecretRules), SecretController.create);

/**
 * @swagger
 * /api/admin/secrets:
 *   get:
 *     summary: List secrets for an app
 *     tags: [Admin Secrets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: false
 *         schema: { type: string, format: uuid }
 *         description: Filter by app ID
 *     responses:
 *       200: { description: List of secrets (values encrypted) }
 *       401: { description: Unauthorized }
 */
router.get('/secrets', adminAuth, SecretController.list);

export default router;
