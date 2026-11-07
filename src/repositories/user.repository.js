import crypto from 'node:crypto';
import { db } from '../config/firebase.js';

// ponytail: direct Firestore collections; add pagination cursor helpers when user collection grows > 10k
const COLLECTION = 'users';

export const UserRepository = {
  async findByEmail(email) {
    const snap = await db.collection(COLLECTION).where('email', '==', email).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  async findById(id) {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async create({ name, email, passwordHash }) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const data = {
      name: name || null,
      email,
      passwordHash,
      role: 'user',
      createdAt: now,
      updatedAt: now,
    };
    await db.collection(COLLECTION).doc(id).set(data);
    return { id, name: data.name, email: data.email, createdAt: data.createdAt };
  },

  async updateRole(id, role) {
    const now = new Date().toISOString();
    const ref = db.collection(COLLECTION).doc(id);
    await ref.update({ role, updatedAt: now });
    const snap = await ref.get();
    const data = snap.data();
    return { id: snap.id, name: data.name, email: data.email, role: data.role };
  },

  async clear() {
    const snap = await db.collection(COLLECTION).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  },
};
