import { AdminService } from '../services/admin.service.js';
import { sendSuccess } from '../utils/response.js';

export const AdminController = {
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const result = await AdminService.register(name, email, password);
      return sendSuccess(res, result, 'Admin account created', 201);
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AdminService.login(email, password);
      return sendSuccess(res, result, 'Admin login successful');
    } catch (err) {
      next(err);
    }
  },
};
