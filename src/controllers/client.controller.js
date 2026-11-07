import { db } from '../config/firebase.js';
import { decryptSecret } from '../utils/encryption.js';
import { sendSuccess } from '../utils/response.js';

export const ClientController = {
  async getSecrets(req, res, next) {
    try {
      // req.appId is set by verifyApp middleware = App.id
      const snapshot = await db.collection('secret_items').where('appId', '==', req.appId).get();
      const decrypted = snapshot.docs.map((doc) => {
        const secret = doc.data();
        return {
          id: doc.id,
          keyName: secret.keyName,
          value: decryptSecret({
            encryptedData: secret.encryptedData,
            iv: secret.iv,
            authTag: secret.authTag,
          }),
          createdAt: secret.createdAt,
        };
      });

      return sendSuccess(res, decrypted, 'Secrets retrieved');
    } catch (err) {
      next(err);
    }
  },
};
