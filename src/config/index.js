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
  logLevel: env.LOG_LEVEL,
  rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: env.RATE_LIMIT_MAX,
};

export default config;
