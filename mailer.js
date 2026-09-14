const nodemailer = require('nodemailer');

function buildTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

const transporter = buildTransporter();

async function sendVerificationEmail(toEmail, code) {
  const siteName = process.env.SITE_NAME || 'PUBG UC Shop';

  if (!transporter) {
    // SMTP sozlanmagan bo'lsa, kodni konsolga chiqaramiz (dasturchi uchun)
    console.log(`\n[EMAIL SIMULATSIYA] ${toEmail} manziliga tasdiqlash kodi: ${code}\n`);
    return { simulated: true };
  }

  const html = `
    <div style="font-family:Arial,sans-serif;background:#0b0d1a;color:#fff;padding:24px;border-radius:12px;max-width:480px;margin:0 auto;">
      <h2 style="color:#ffd166;margin-top:0;">${siteName}</h2>
      <p>Ro'yxatdan o'tishni yakunlash uchun quyidagi tasdiqlash kodini kiriting:</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#1a1d33;padding:16px;border-radius:8px;text-align:center;color:#7c3aed;">
        ${code}
      </div>
      <p style="color:#aaa;font-size:13px;margin-top:16px;">Kod 15 daqiqa davomida amal qiladi. Agar bu so'rovni siz yubormagan bo'lsangiz, bu xatni e'tiborsiz qoldiring.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: `${siteName} - Tasdiqlash kodi`,
    html
  });

  return { simulated: false };
}

module.exports = { sendVerificationEmail };
