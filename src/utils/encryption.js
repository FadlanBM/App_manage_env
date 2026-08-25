import crypto from 'node:crypto';
import config from '../config/index.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export function encryptSecret(plaintext) {
  const key = crypto.createHash('sha256').update(config.encryptionKey).digest();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return { encryptedData: encrypted, iv: iv.toString('hex'), authTag };
}

export function decryptSecret({ encryptedData, iv, authTag }) {
  const key = crypto.createHash('sha256').update(config.encryptionKey).digest();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
