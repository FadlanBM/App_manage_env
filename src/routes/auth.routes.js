import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { verifyApp } from '../middlewares/verifyApp.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { registerRules, loginRules, refreshRules, logoutRules } from '../validators/auth.validator.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints (multi-app, dual-token JWT)
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     parameters:
 *       - in: header
 *         name: X-App-Id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: X-App-Secret
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: John Doe }
 *               email: { type: string, format: email, example: john@example.com }
 *               password: { type: string, format: password, minLength: 6, example: "123456" }
 *     responses:
 *       201: { description: User registered, returns token pair }
 *       401: { description: Invalid app credentials }
 *       409: { description: Email already registered }
 *       422: { description: Validation error }
 */
router.post('/register', verifyApp, validate(registerRules), AuthController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and get JWT token pair
 *     tags: [Auth]
 *     parameters:
 *       - in: header
 *         name: X-App-Id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: X-App-Secret
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: john@example.com }
 *               password: { type: string, format: password, example: "123456" }
 *     responses:
 *       200: { description: Login successful, returns token pair }
 *       401: { description: Invalid credentials or app credentials }
 *       422: { description: Validation error }
 */
router.post('/login', verifyApp, validate(loginRules), AuthController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Auth]
 *     parameters:
 *       - in: header
 *         name: X-App-Id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: X-App-Secret
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refresh_token]
 *             properties:
 *               refresh_token: { type: string }
 *     responses:
 *       200: { description: New token pair issued }
 *       401: { description: Invalid or expired refresh token }
 */
router.post('/refresh', verifyApp, validate(refreshRules), AuthController.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout from current app (revoke refresh token)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
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
 *       200: { description: Logged out from this app }
 *       401: { description: Unauthorized }
 */
router.post('/logout', verifyApp, authMiddleware, AuthController.logout);

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: Logout from all apps (revoke all refresh tokens)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
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
 *       200: { description: Logged out from all apps }
 *       401: { description: Unauthorized }
 */
router.post('/logout-all', verifyApp, authMiddleware, AuthController.logoutAll);

export default router;
