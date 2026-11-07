import createError from 'http-errors';
import crypto from 'node:crypto';
import { db } from '../config/firebase.js';
import { hashPassword } from '../utils/hash.js';
import { sendSuccess } from '../utils/response.js';
import { EmailService } from '../services/email.service.js';

const apps = () => db.collection('apps');
const secrets = () => db.collection('app_secrets');

export const AppManagerController = {
  async listApps(req, res, next) {
    try {
      const userEmail = req.admin?.email?.toLowerCase();
      const snapshot = await apps().get();
      const visibleDocs = snapshot.docs.filter((doc) => {
        const data = doc.data();
        return data.createdBy === userEmail || data.approvedMembers?.includes(userEmail);
      });
      const rows = await Promise.all(visibleDocs.map(async (doc) => {
        const data = doc.data();
        const count = await db.collection('secret_items').where('appId', '==', doc.id).count().get();
        return { id: doc.id, appName: data.appName, isActive: data.isActive, createdAt: data.createdAt, createdBy: data.createdBy, sharedWith: data.createdBy === userEmail ? (data.approvedMembers || []) : undefined, pendingInvitations: data.createdBy === userEmail ? [...new Set([...(data.pendingInvitations || []), ...(data.sharedWith || [])].filter((email) => !(data.approvedMembers || []).includes(email)))] : undefined, _count: { secretItems: count.data().count } };
      }));
      // Sort descending by createdAt
      rows.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return sendSuccess(res, rows, 'Apps retrieved');
    } catch (err) { next(err); }
  },

  async deleteApp(req, res, next) {
    try {
      const { id } = req.params;
      const userEmail = req.admin?.email?.toLowerCase();
      const appRef = apps().doc(id);
      const appSnap = await appRef.get();
      if (!appSnap.exists) throw createError(404, 'App not found');
      const appData = appSnap.data();
      if (userEmail && appData.createdBy && appData.createdBy.toLowerCase() !== userEmail) {
        throw createError(403, 'Forbidden: You do not own this application');
      }
      for (const collection of ['secret_items', 'app_secrets', 'user_tokens']) {
        const snapshot = await db.collection(collection).where('appId', '==', id).get();
        for (let i = 0; i < snapshot.docs.length; i += 500) {
          const batch = db.batch();
          snapshot.docs.slice(i, i + 500).forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
        }
      }
      await appRef.delete();
      return sendSuccess(res, { id }, 'App and related secrets deleted successfully');
    } catch (err) { next(err); }
  },

  async createApp(req, res, next) {
    try {
      const { appName } = req.body;
      const duplicate = await apps().where('appName', '==', appName).limit(1).get();
      if (!duplicate.empty) throw createError(409, 'App already exists');
      const secret = crypto.randomBytes(32).toString('hex');
      const secretHash = await hashPassword(secret);
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const createdBy = req.admin?.email?.toLowerCase() || null;
      const app = { appName, isActive: true, createdAt, createdBy };
      const batch = db.batch();
      batch.set(apps().doc(id), app);
      batch.set(secrets().doc(crypto.randomUUID()), { appId: id, label: 'default', secret: secretHash, revokedAt: null, createdAt });
      await batch.commit();
      return sendSuccess(res, { id, ...app, secret_plaintext: secret }, 'App created', 201);
    } catch (err) { next(err); }
  },
  async inviteCollaborator(req, res, next) {
    try {
      const { id } = req.params;
      const email = String(req.body.email || '').trim().toLowerCase();
      if (!email) throw createError(400, 'Email is required');
      const appRef = apps().doc(id);
      const snap = await appRef.get();
      if (!snap.exists) throw createError(404, 'App not found');
      const app = snap.data();
      if (app.createdBy !== req.admin?.email?.toLowerCase()) throw createError(403, 'Only app owner can invite collaborators');
      if ((app.approvedMembers || []).includes(email)) throw createError(409, 'User already has access to this application');
      const pendingInvitations = [...new Set([...(app.pendingInvitations || []), ...(app.sharedWith || []), email])].filter((invite) => !(app.approvedMembers || []).includes(invite));
      await appRef.update({ pendingInvitations });
      let emailStatus = 'skipped';
      try {
        const resendResult = await EmailService.sendAppInvitation({ to: email, appName: app.appName, inviterEmail: req.admin?.email });
        emailStatus = resendResult?.skipped ? 'skipped' : 'sent';
      } catch (mailErr) {
        console.error('Failed to send invitation email:', mailErr.message);
        emailStatus = 'failed';
      }
      return sendSuccess(res, { appId: id, email, emailStatus, status: 'pending' }, 'Invitation sent; access requires acceptance');
    } catch (err) { next(err); }
  },

  async listInvitations(req, res, next) {
    try {
      const email = req.admin?.email?.toLowerCase();
      const snapshot = await apps().get();
      const invitations = snapshot.docs.flatMap((doc) => {
        const app = doc.data();
        const pending = [...new Set([...(app.pendingInvitations || []), ...(app.sharedWith || [])])].filter((invite) => !(app.approvedMembers || []).includes(invite));
        return pending.includes(email)
          ? [{ appId: doc.id, appName: app.appName, inviterEmail: app.createdBy }]
          : [];
      });
      return sendSuccess(res, invitations, 'Pending invitations retrieved');
    } catch (err) { next(err); }
  },

  async acceptInvitation(req, res, next) {
    try {
      const email = req.admin?.email?.toLowerCase();
      const appRef = apps().doc(req.params.id);
      const snap = await appRef.get();
      if (!snap.exists) throw createError(404, 'App not found');
      const app = snap.data();
      const pending = app.pendingInvitations || app.sharedWith || [];
      if (!pending.includes(email)) throw createError(404, 'Pending invitation not found');
      await appRef.update({
        pendingInvitations: pending.filter((invite) => invite !== email),
        sharedWith: (app.sharedWith || []).filter((invite) => invite !== email),
        approvedMembers: [...new Set([...(app.approvedMembers || []), email])],
      });
      return sendSuccess(res, { appId: req.params.id, email }, 'Invitation accepted');
    } catch (err) { next(err); }
  },
  async rejectInvitation(req, res, next) {
    try {
      const email = req.admin?.email?.toLowerCase();
      const appRef = apps().doc(req.params.id);
      const snap = await appRef.get();
      if (!snap.exists) throw createError(404, 'App not found');
      const app = snap.data();
      await appRef.update({
        pendingInvitations: (app.pendingInvitations || []).filter((invite) => invite !== email),
        sharedWith: (app.sharedWith || []).filter((invite) => invite !== email),
      });
      return sendSuccess(res, { appId: req.params.id, email }, 'Invitation rejected');
    } catch (err) { next(err); }
  },

  async approveInvitation(req, res, next) {
    try {
      const { id, email } = req.params;
      const appRef = apps().doc(id);
      const snap = await appRef.get();
      if (!snap.exists) throw createError(404, 'App not found');
      const app = snap.data();
      if (app.createdBy !== req.admin?.email?.toLowerCase()) throw createError(403, 'Only app owner can approve collaborators');
      const normalizedEmail = decodeURIComponent(email).toLowerCase();
      await appRef.update({
        pendingInvitations: (app.pendingInvitations || []).filter((item) => item !== normalizedEmail),
        sharedWith: (app.sharedWith || []).filter((item) => item !== normalizedEmail),
        approvedMembers: [...new Set([...(app.approvedMembers || []), normalizedEmail])],
      });
      return sendSuccess(res, { appId: id, email: normalizedEmail }, 'Collaborator approved');
    } catch (err) { next(err); }
  },


  async removeCollaborator(req, res, next) {
    try {
      const { id, email } = req.params;
      const appRef = apps().doc(id);
      const snap = await appRef.get();
      if (!snap.exists) throw createError(404, 'App not found');
      const app = snap.data();
      if (app.createdBy !== req.admin?.email?.toLowerCase()) throw createError(403, 'Only app owner can remove collaborators');
      const normalizedEmail = decodeURIComponent(email).toLowerCase();
      await appRef.update({
        approvedMembers: (app.approvedMembers || []).filter((item) => item !== normalizedEmail),
        sharedWith: (app.sharedWith || []).filter((item) => item !== normalizedEmail),
        pendingInvitations: (app.pendingInvitations || []).filter((item) => item !== normalizedEmail),
      });
      return sendSuccess(res, { appId: id, email: normalizedEmail }, 'Collaborator access or invitation removed');
    } catch (err) { next(err); }
  },
};
