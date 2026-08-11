import 'dotenv/config';
import { execSync } from 'child_process';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-32chars-min!!';
process.env.ACCESS_TOKEN_TTL = '15m';
process.env.REFRESH_TOKEN_TTL = '30d';
// Use env DATABASE_URL or fallback to docker postgres
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/auth_db_test';

execSync('npx prisma db push --force-reset --skip-generate', {
  env: { ...process.env },
  stdio: 'ignore',
});
