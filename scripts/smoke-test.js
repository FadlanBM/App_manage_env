import assert from 'node:assert';
import request from 'supertest';
import app from '../api/index.js';

// ponytail: lightweight smoke test for Vercel handler + core endpoints; expands to full integration suite in CI
async function runSmokeTest() {
  console.log('Running smoke test...');

  // 1. Verify health endpoint
  const healthRes = await request(app).get('/health');
  assert.strictEqual(healthRes.status, 200, `Expected 200 from /health, got ${healthRes.status}`);
  assert.strictEqual(healthRes.body.status, 'ok', 'Health response status should be "ok"');
  console.log('✓ /health OK');

  // 2. Verify swagger docs json endpoint
  const docsRes = await request(app).get('/api-docs.json');
  assert.strictEqual(docsRes.status, 200, `Expected 200 from /api-docs.json, got ${docsRes.status}`);
  assert(docsRes.body.openapi, 'OpenAPI spec should have openapi field');
  console.log('✓ /api-docs.json OK');

  // 3. Verify static / dashboard
  const rootRes = await request(app).get('/');
  assert.strictEqual(rootRes.status, 200, `Expected 200 from /, got ${rootRes.status}`);
  assert(rootRes.text.includes('<!DOCTYPE html>'), 'Root should return dashboard HTML');
  console.log('✓ Static Dashboard OK');
  // 4. Verify admin login validation (rejects empty / missing idToken)
  const loginRes = await request(app).post('/api/admin/login').send({});
  assert.strictEqual(loginRes.status, 422, `Expected 422 for missing idToken, got ${loginRes.status}`);
  assert.strictEqual(loginRes.body.status, 'fail', 'Expected fail status');
  console.log('✓ /api/admin/login validation OK');

  console.log('✓ All smoke tests passed successfully!');
}

runSmokeTest().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
