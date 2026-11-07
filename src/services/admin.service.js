import createError from 'http-errors';
import { UserRepository } from '../repositories/user.repository.js';
import { hashPassword } from '../utils/hash.js';
import { generateAccessToken } from '../utils/jwt.js';
import { firebaseAuth, db } from '../config/firebase.js';
import config from '../config/index.js';
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

  async loginWithFirebase(idToken) {
    let identity;
    try {
      identity = await firebaseAuth.verifyIdToken(idToken);
    } catch {
      throw createError(401, 'Invalid Firebase ID token');
    }
    if (!identity.email || !identity.email_verified) {
      throw createError(401, 'Verified Firebase email required');
    }

    const email = identity.email.toLowerCase();
    const allowedEmails = config.adminEmails || [];

    if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
      const [approvedApps, pendingApps, legacyApps] = await Promise.all([
        db.collection('apps').where('approvedMembers', 'array-contains', email).limit(1).get(),
        db.collection('apps').where('pendingInvitations', 'array-contains', email).limit(1).get(),
        db.collection('apps').where('sharedWith', 'array-contains', email).limit(1).get(),
      ]);
      if (approvedApps.empty && pendingApps.empty && legacyApps.empty) {
        throw createError(403, `Access denied for email ${identity.email}`);
      }
    }

    let user = await UserRepository.findByEmail(identity.email);
    if (!user) {
      // Auto-provision user dari akun Firebase yang berhasil login
      user = await UserRepository.create({
        name: identity.name || identity.email.split('@')[0],
        email: identity.email,
        passwordHash: 'firebase_oauth',
      });
      user = await UserRepository.updateRole(user.id, 'admin');
    } else if (user.role !== 'admin') {
      user = await UserRepository.updateRole(user.id, 'admin');
    }

    const accessToken = generateAccessToken(user.id, ADMIN_APP_NAME, user.email, 'admin');
    return {
      access_token: accessToken,
      user: { id: user.id, name: user.name || identity.name, email: user.email, role: 'admin' },
    };
  },
};
