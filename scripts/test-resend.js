import 'dotenv/config';

const to = process.argv[2] || 'zemcode2@gmail.com';
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';

if (!apiKey) {
  console.error('RESEND_API_KEY tidak ada di .env');
  process.exit(1);
}

// ponytail: native fetch cukup, library resend tidak perlu selama hanya POST REST API
const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from,
    to: [to],
    subject: 'Test Resend Local',
    html: `<p>Halo, test email Resend ke ${to} berhasil.</p>`,
  }),
});

const data = await res.json();
console.log('Status:', res.status);
console.log('Response:', data);
