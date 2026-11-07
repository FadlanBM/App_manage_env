import 'dotenv/config';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../src/config/firebase.js';

// ponytail: basic seeder for initial apps; upgrade to batch transactional if seeding large datasets
const apps = [
  { appName: 'fitness_journal', secret: 'fj_secret_xxx' },
  { appName: 'warranty_tracker', secret: 'wt_secret_xxx' },
  { appName: 'sub_manager', secret: 'sm_secret_xxx' },
  { appName: 'english_conv', secret: 'ec_secret_xxx' },
];

async function seed() {
  console.log('Seeding initial apps to Firestore...');
  const appsCol = db.collection('apps');
  const secretsCol = db.collection('app_secrets');

  for (const item of apps) {
    const existing = await appsCol.where('appName', '==', item.appName).limit(1).get();
    let appId;

    if (existing.empty) {
      appId = crypto.randomUUID();
      const now = new Date().toISOString();
      await appsCol.doc(appId).set({
        appName: item.appName,
        isActive: true,
        createdAt: now,
      });
      console.log(`✓ Created app: ${item.appName} (${appId})`);
    } else {
      appId = existing.docs[0].id;
      console.log(`- App already exists: ${item.appName} (${appId})`);
    }

    const existingSecret = await secretsCol
      .where('appId', '==', appId)
      .where('label', '==', 'default')
      .where('revokedAt', '==', null)
      .limit(1)
      .get();

    if (existingSecret.empty) {
      const hashed = await bcrypt.hash(item.secret, 12);
      const secretId = crypto.randomUUID();
      await secretsCol.doc(secretId).set({
        appId,
        label: 'default',
        secret: hashed,
        revokedAt: null,
        createdAt: new Date().toISOString(),
      });
      console.log(`  ✓ Secret created for ${item.appName}`);
    } else {
      console.log(`  - Secret already exists for ${item.appName}`);
    }
  }

  console.log('✓ Seeding completed.');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
