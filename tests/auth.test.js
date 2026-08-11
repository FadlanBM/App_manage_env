import request from 'supertest';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import app from '../src/app.js';

const db = new PrismaClient();

const TEST_APP = {
  appName: 'test_app',
  secret: 'test_app_secret_xxx',
};

const TEST_APP_B = {
  appName: 'test_app_b',
  secret: 'test_app_b_secret',
};

const APP_HEADERS = {
  'X-App-Id': TEST_APP.appName,
  'X-App-Secret': TEST_APP.secret,
};

const APP_B_HEADERS = {
  'X-App-Id': TEST_APP_B.appName,
  'X-App-Secret': TEST_APP_B.secret,
};

beforeAll(async () => {
  // Seed test apps
  for (const a of [TEST_APP, TEST_APP_B]) {
    const record = await db.app.upsert({
      where: { appName: a.appName },
      update: {},
      create: { appName: a.appName },
    });
    const hashed = await bcrypt.hash(a.secret, 12);
    // Clear existing secrets and create fresh
    await db.appSecret.deleteMany({ where: { appId: record.id } });
    await db.appSecret.create({
      data: { appId: record.id, label: 'default', secret: hashed },
    });
  }
});

beforeEach(async () => {
  await db.userToken.deleteMany();
  await db.user.deleteMany();
});

afterAll(async () => {
  await db.userToken.deleteMany();
  await db.user.deleteMany();
  await db.appSecret.deleteMany();
  await db.app.deleteMany();
  await db.$disconnect();
});

// --- Helpers ---
async function registerUser(headers = APP_HEADERS) {
  return request(app)
    .post('/api/auth/register')
    .set(headers)
    .send({ name: 'Test User', email: 'test@example.com', password: '123456' });
}

async function loginUser(headers = APP_HEADERS) {
  return request(app)
    .post('/api/auth/login')
    .set(headers)
    .send({ email: 'test@example.com', password: '123456' });
}

// =============================================
// verifyApp middleware
// =============================================
describe('verifyApp middleware', () => {
  it('rejects request without app headers', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'X', email: 'x@x.com', password: '123456' });

    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('App credentials required');
  });

  it('rejects invalid app name', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set({ 'X-App-Id': 'nonexistent', 'X-App-Secret': 'xxx' })
      .send({ name: 'X', email: 'x@x.com', password: '123456' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('App not registered');
  });

  it('rejects wrong app secret', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set({ 'X-App-Id': TEST_APP.appName, 'X-App-Secret': 'wrong' })
      .send({ name: 'X', email: 'x@x.com', password: '123456' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid app secret');
  });
});

// =============================================
// POST /api/auth/register
// =============================================
describe('POST /api/auth/register', () => {
  it('registers a new user with token pair', async () => {
    const res = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.access_token).toBeDefined();
    expect(res.body.data.refresh_token).toBeDefined();
    expect(res.body.data.user.email).toBe('test@example.com');
  });

  it('rejects duplicate email', async () => {
    await registerUser();
    const res = await registerUser();

    expect(res.status).toBe(409);
    expect(res.body.status).toBe('error');
  });

  it('rejects invalid input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set(APP_HEADERS)
      .send({ name: '', email: 'bad', password: '12' });

    expect(res.status).toBe(422);
    expect(res.body.status).toBe('fail');
  });
});

// =============================================
// POST /api/auth/login
// =============================================
describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await registerUser();
  });

  it('logs in with valid credentials', async () => {
    const res = await loginUser();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.access_token).toBeDefined();
    expect(res.body.data.refresh_token).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set(APP_HEADERS)
      .send({ email: 'test@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('rejects non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set(APP_HEADERS)
      .send({ email: 'no@example.com', password: '123456' });

    expect(res.status).toBe(401);
  });
});

// =============================================
// POST /api/auth/refresh
// =============================================
describe('POST /api/auth/refresh', () => {
  it('issues new token pair', async () => {
    await registerUser();
    const login = await loginUser();
    const refreshToken = login.body.data.refresh_token;

    const res = await request(app)
      .post('/api/auth/refresh')
      .set(APP_HEADERS)
      .send({ refresh_token: refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.access_token).toBeDefined();
    expect(res.body.data.refresh_token).toBeDefined();
    // New refresh token should differ from old
    expect(res.body.data.refresh_token).not.toBe(refreshToken);
  });

  it('rejects already-used refresh token', async () => {
    await registerUser();
    const login = await loginUser();
    const refreshToken = login.body.data.refresh_token;

    // Use it once
    await request(app)
      .post('/api/auth/refresh')
      .set(APP_HEADERS)
      .send({ refresh_token: refreshToken });

    // Use it again — should fail (revoked)
    const res = await request(app)
      .post('/api/auth/refresh')
      .set(APP_HEADERS)
      .send({ refresh_token: refreshToken });

    expect(res.status).toBe(401);
  });

  it('rejects refresh token from different app (isolation)', async () => {
    await registerUser();
    const login = await loginUser();
    const refreshToken = login.body.data.refresh_token;

    const res = await request(app)
      .post('/api/auth/refresh')
      .set(APP_B_HEADERS)
      .send({ refresh_token: refreshToken });

    expect(res.status).toBe(401);
  });
});

// =============================================
// POST /api/auth/logout
// =============================================
describe('POST /api/auth/logout', () => {
  it('revokes refresh token for current app', async () => {
    await registerUser();
    const login = await loginUser();
    const { access_token, refresh_token } = login.body.data;

    const res = await request(app)
      .post('/api/auth/logout')
      .set({ ...APP_HEADERS, Authorization: `Bearer ${access_token}` })
      .send({ refresh_token });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');

    // Refresh should now fail
    const refresh = await request(app)
      .post('/api/auth/refresh')
      .set(APP_HEADERS)
      .send({ refresh_token });

    expect(refresh.status).toBe(401);
  });

  it('rejects without access token', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set(APP_HEADERS)
      .send({ refresh_token: 'xxx' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Token required');
  });
});

// =============================================
// POST /api/auth/logout-all
// =============================================
describe('POST /api/auth/logout-all', () => {
  it('revokes tokens across all apps', async () => {
    // Register in app A
    await registerUser();
    const loginA = await loginUser();

    // Login in app B (same user, different app)
    const loginB = await request(app)
      .post('/api/auth/login')
      .set(APP_B_HEADERS)
      .send({ email: 'test@example.com', password: '123456' });

    expect(loginB.status).toBe(200);

    // Logout all using app A's access token
    const res = await request(app)
      .post('/api/auth/logout-all')
      .set({ ...APP_HEADERS, Authorization: `Bearer ${loginA.body.data.access_token}` });

    expect(res.status).toBe(200);

    // Both refresh tokens should now be invalid
    const refreshA = await request(app)
      .post('/api/auth/refresh')
      .set(APP_HEADERS)
      .send({ refresh_token: loginA.body.data.refresh_token });
    expect(refreshA.status).toBe(401);

    const refreshB = await request(app)
      .post('/api/auth/refresh')
      .set(APP_B_HEADERS)
      .send({ refresh_token: loginB.body.data.refresh_token });
    expect(refreshB.status).toBe(401);
  });
});

// =============================================
// General
// =============================================
describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
  });
});
