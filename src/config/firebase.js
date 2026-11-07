import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// ponytail: basic credentials + emulator support; add key rotation or custom client pools when high volume demands it
let firestoreInstance = null;
let authInstance = null;

export function getDb() {
  if (firestoreInstance) return firestoreInstance;

  if (!getApps().length) {
    let credential = undefined;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
        const json = raw.startsWith('{')
          ? JSON.parse(raw)
          : JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
        credential = cert(json);
      } catch (err) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', err.message);
      }
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      credential = cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    }

    initializeApp({
      credential,
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }

  firestoreInstance = getFirestore();
  return firestoreInstance;
}
export function getFirebaseAuth() {
  if (authInstance) return authInstance;
  if (!getApps().length) {
    getDb();
  }
  authInstance = getAuth();
  return authInstance;
}

export const firebaseAuth = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getFirebaseAuth();
      const val = client[prop];
      return typeof val === 'function' ? val.bind(client) : val;
    },
  }
);


export const db = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getDb();
      const val = client[prop];
      return typeof val === 'function' ? val.bind(client) : val;
    },
  }
);
