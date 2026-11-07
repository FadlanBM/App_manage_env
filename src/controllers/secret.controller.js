import crypto from 'node:crypto';
import { db } from '../config/firebase.js';
import { encryptSecret, decryptSecret } from '../utils/encryption.js';
import { sendSuccess } from '../utils/response.js';

// ponytail: direct Firestore queries; add composite index on appId+keyName if query sorting changes
const secretItems = () => db.collection('secret_items');
const assertAppOwner = async (appId, email) => {
  if (!email) throw Object.assign(new Error('Account email required'), { status: 403 });
  const app = await db.collection('apps').doc(appId).get();
  if (!app.exists) {
    throw Object.assign(new Error('App not found or access denied'), { status: 404 });
  }
  const data = app.data();
  if (data.createdBy !== email.toLowerCase() && !data.approvedMembers?.includes(email.toLowerCase())) {
    throw Object.assign(new Error('App not found or access denied'), { status: 404 });
  }
};

export const SecretController = {
  async create(req, res, next) {
    try {
      const userEmail = req.admin?.email?.toLowerCase();
      const { secrets } = req.body;
      const now = new Date().toISOString();

      // Bulk: array of secrets
      if (Array.isArray(secrets)) {
        for (const s of secrets) {
          await assertAppOwner(s.appId, userEmail);
        }
        const batch = db.batch();
        const created = secrets.map(({ appId, keyName, value }) => {
          const id = crypto.randomUUID();
          const { encryptedData, iv, authTag } = encryptSecret(value);
          const data = { appId, keyName, encryptedData, iv, authTag, createdAt: now };
          batch.set(secretItems().doc(id), data);
          return { id, ...data };
        });
        await batch.commit();
        return sendSuccess(res, created, `${created.length} secrets registered successfully`, 201);
      }

      // Single: legacy object
      const { appId, keyName, value } = req.body;
      await assertAppOwner(appId, userEmail);
      const id = crypto.randomUUID();
      const { encryptedData, iv, authTag } = encryptSecret(value);
      const data = { appId, keyName, encryptedData, iv, authTag, createdAt: now };
      await secretItems().doc(id).set(data);

      return sendSuccess(res, { id, ...data }, 'Secret registered successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async list(req, res, next) {
    try {
      const userEmail = req.admin?.email?.toLowerCase();
      const { appId } = req.query;
      let snapshot;
      if (appId) {
        await assertAppOwner(appId, userEmail);
        snapshot = await secretItems().where('appId', '==', appId).get();
      } else {
        // Hanya ambil secret milik aplikasi yang dibuat oleh user ini
        const ownedApps = await db.collection('apps').where('createdBy', '==', userEmail).get();
        const sharedApps = await db.collection('apps').where('approvedMembers', 'array-contains', userEmail).get();
        const userAppIds = [...new Set([...ownedApps.docs, ...sharedApps.docs].map((doc) => doc.id))];
        if (userAppIds.length === 0) {
          return sendSuccess(res, [], 'Secrets list retrieved');
        }
        // Firestore 'in' query mendukung s.d 30 items
        snapshot = await secretItems().where('appId', 'in', userAppIds.slice(0, 30)).get();
      }

      const secrets = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort by keyName ascending
      secrets.sort((a, b) => (a.keyName || '').localeCompare(b.keyName || ''));

      const result = secrets.map((s) => {
        let value = '';
        try {
          value = decryptSecret({
            encryptedData: s.encryptedData,
            iv: s.iv,
            authTag: s.authTag,
          });
        } catch {
          value = '[Decryption failed]';
        }
        return {
          id: s.id,
          appId: s.appId,
          keyName: s.keyName,
          value,
          createdAt: s.createdAt,
        };
      });

      return sendSuccess(res, result, 'Secrets list retrieved');
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const userEmail = req.admin?.email?.toLowerCase();
      const { id } = req.params;
      const docRef = secretItems().doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          status: 'error',
          message: 'Secret not found',
          data: null,
        });
      }

      await assertAppOwner(doc.data().appId, userEmail);
      await docRef.delete();
      return sendSuccess(res, { id }, 'Secret deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const userEmail = req.admin?.email?.toLowerCase();
      const { id } = req.params;
      const { keyName, value } = req.body;

      if (!keyName && !value) {
        return res.status(400).json({ success: false, message: 'Nothing to update' });
      }

      const docRef = secretItems().doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ success: false, message: 'Secret not found' });
      }

      await assertAppOwner(doc.data().appId, userEmail);
      const updateData = {};
      if (keyName) {
        updateData.keyName = keyName;
      }
      if (value) {
        const { encryptedData, iv, authTag } = encryptSecret(value);
        updateData.encryptedData = encryptedData;
        updateData.iv = iv;
        updateData.authTag = authTag;
      }

      await docRef.update(updateData);
      const updatedSnap = await docRef.get();

      return sendSuccess(res, { id, ...updatedSnap.data() }, 'Secret updated successfully');
    } catch (err) {
      next(err);
    }
  },
};
