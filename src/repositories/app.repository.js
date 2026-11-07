import { db } from '../config/firebase.js';

// ponytail: direct Firestore collections; add pagination when app inventory grows
export const AppRepository = {
  async findByAppName(appName) {
    const snap = await db.collection('apps').where('appName', '==', appName).limit(1).get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  },

  async findById(id) {
    const doc = await db.collection('apps').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async findActiveSecrets(appId) {
    const snap = await db
      .collection('app_secrets')
      .where('appId', '==', appId)
      .where('revokedAt', '==', null)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  async clear() {
    for (const collection of ['app_secrets', 'apps']) {
      const snap = await db.collection(collection).get();
      const batch = db.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  },
};
