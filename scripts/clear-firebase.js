import 'dotenv/config';
import { db } from '../src/config/firebase.js';

const collections = ['apps', 'app_secrets', 'secret_items', 'users', 'user_tokens'];

async function clearFirebase() {
  console.log('Clearing Firestore collections...');
  for (const name of collections) {
    const snap = await db.collection(name).get();
    if (snap.empty) {
      console.log(`- ${name}: empty`);
      continue;
    }
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`✓ Deleted ${snap.size} documents from ${name}`);
  }
  console.log('Done.');
}

clearFirebase().catch((err) => {
  console.error('Failed to clear Firestore:', err);
  process.exit(1);
});
