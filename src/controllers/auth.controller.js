import { AuthService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';

export const AuthController = {
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const result = await AuthService.register(name, email, password, req.appId, req.appName);
      return sendSuccess(res, result, 'Registration successful', 201);
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password, req.appId, req.appName);
      return sendSuccess(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  },

  async refresh(req, res, next) {
    try {
      const { refresh_token } = req.body;
      const result = await AuthService.refreshToken(refresh_token, req.appId, req.appName);
      return sendSuccess(res, result, 'Token refreshed');
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      await AuthService.logout(req.user.user_id, req.appId);
      return sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  },

  async logoutAll(req, res, next) {
    try {
      await AuthService.logoutAll(req.user.user_id);
      return sendSuccess(res, null, 'Logged out from all apps');
    } catch (err) {
      next(err);
    }
  },
};
