import config from '../config/index.js';

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

// ponytail: native fetch via Resend REST API; add official SDK when templates or attachments needed.
export const EmailService = {
  async sendAppInvitation({ to, appName, inviterEmail, inviteUrl = config.baseUrl }) {
    if (!config.resendApiKey) {
      return { skipped: true, reason: 'RESEND_API_KEY not configured' };
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.emailFrom,
        to: [to],
        subject: `Undangan Kolaborasi: ${appName}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
            <h2>Undangan Kolaborasi App Environment</h2>
            <p>Halo,</p>
            <p><strong>${escapeHtml(inviterEmail || 'Admin')}</strong> mengundang Anda untuk mengelola environment aplikasi <strong>${escapeHtml(appName)}</strong>.</p>
            <p style="margin: 24px 0;">
              <a href="${escapeHtml(inviteUrl)}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Buka App Manage
              </a>
            </p>
            <p style="font-size: 12px; color: #64748b;">Tautan: <a href="${escapeHtml(inviteUrl)}">${escapeHtml(inviteUrl)}</a></p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Resend HTTP ${res.status}`);
    }
    return data;
  },
};
