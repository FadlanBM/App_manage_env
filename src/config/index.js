import 'dotenv/config';
import { validateEnv } from './env.js';

const env = validateEnv();

const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  jwtSecret: env.JWT_SECRET,
  accessTokenTtl: env.ACCESS_TOKEN_TTL,
  refreshTokenTtl: env.REFRESH_TOKEN_TTL,
  databaseUrl: env.DATABASE_URL,
  firebaseProjectId: env.FIREBASE_PROJECT_ID,
  firebaseWebApiKey: env.FIREBASE_WEB_API_KEY,
  resendApiKey: env.RESEND_API_KEY,
  emailFrom: env.EMAIL_FROM,
  adminEmails: (env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  logLevel: env.LOG_LEVEL,
  rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: env.RATE_LIMIT_MAX,
  encryptionKey: env.ENCRYPTION_KEY,
  baseUrl: env.BASE_URL,
};

export default config;
