import createError from 'http-errors';
import { UserRepository } from '../repositories/user.repository.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { generateAccessToken } from '../utils/jwt.js';

const ADMIN_APP_NAME = 'admin_console';

export const AdminService = {
  async register(name, email, password) {
    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      throw createError(409, 'Email already registered');
    }

    const passwordHash = await hashPassword(password);
    const user = await UserRepository.create({ name, email, passwordHash });

    // Ensure role=admin by updating after creation
    const admin = await UserRepository.updateRole(user.id, 'admin');

    const accessToken = generateAccessToken(admin.id, ADMIN_APP_NAME, admin.email, 'admin');
    return {
      access_token: accessToken,
      user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    };
  },

  async login(email, password) {
    const user = await UserRepository.findByEmail(email);
    if (!user || user.role !== 'admin') {
      throw createError(401, 'Invalid admin credentials');
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw createError(401, 'Invalid admin credentials');
    }

    const accessToken = generateAccessToken(user.id, ADMIN_APP_NAME, user.email, 'admin');
    return {
      access_token: accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  },
};
