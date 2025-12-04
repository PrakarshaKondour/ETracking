// backend/services/emailService.js
import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.EMAIL_SMTP_PORT || 465); // 465 for secure, 587 for STARTTLS
const SMTP_SECURE = String(process.env.EMAIL_SMTP_SECURE || 'true') === 'true'; // true for 465

// Ensure EMAIL_USER and EMAIL_PASS are set in .env
const { EMAIL_USER, EMAIL_PASS } = process.env;

if (!EMAIL_USER || !EMAIL_PASS) {
  console.warn('⚠️ EMAIL_USER or EMAIL_PASS missing in environment — email will fail until set.');
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  tls: {
    // do not fail on invalid certs in dev; remove in prod
    rejectUnauthorized: false
  },
  connectionTimeout: 10_000, // 10s
  greetingTimeout: 10_000,
});

// Verify transporter at startup so you get a clear error early
transporter.verify()
  .then(() => {
    console.log('✅ Email transporter ready. Emails will be sent from', EMAIL_USER);
  })
  .catch((err) => {
    console.error('❌ Email transporter verification failed:', err && err.message ? err.message : err);
  });

/**
 * Send OTP email
 * @param {string} toEmail
 * @param {string} otp
 * @param {object} opts optional { subject, name }
 * @returns {Promise<{success:boolean, info?:any, error?:string}>}
 */
export async function sendEmailOTP(toEmail, otp, opts = {}) {
  if (!toEmail) return { success: false, error: 'Missing toEmail' };
  if (!otp) return { success: false, error: 'Missing otp' };

  const subject = opts.subject || 'Your ETracking OTP code';
  const name = opts.name || '';

  const text = `Hello ${name || ''},

Your ETracking verification code is ${otp}.

This code is valid for 5 minutes. If you did not request this, please ignore this message.

Thanks,
ETracking Team
`;

  const html = `
  <div style="font-family: Inter, system-ui, -apple-system, Roboto, 'Helvetica Neue', Arial; color:#0f1724">
    <div style="max-width:640px; margin:0 auto; padding:20px; background:#fff; border-radius:10px;">
      <h2 style="margin:0 0 8px 0; color:#0b2540">Hello ${name || 'there'},</h2>
      <p style="margin:0 0 12px 0; color:#2d3b4a">Your verification code for <strong>ETracking</strong> is:</p>
      <div style="display:inline-block; padding:12px 18px; background:linear-gradient(90deg,#ff7a59,#ff5f3e); color:#fff; font-size:20px; border-radius:8px; font-weight:700; letter-spacing:4px;">
        ${otp}
      </div>
      <p style="margin:18px 0 0 0; color:#55636f; font-size:13px;">This code expires in 5 minutes. If you did not request this, please ignore.</p>
      <hr style="margin:18px 0; border:none; border-top:1px solid #eef2f5" />
      <small style="color:#7b8a96">ETracking • Secure Notifications</small>
    </div>
  </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: EMAIL_USER,
      to: toEmail,
      subject,
      text,
      html
    });

    console.log('EMAIL SENT to', toEmail, 'messageId:', info.messageId);
    return { success: true, info };
  } catch (err) {
    console.error('EMAIL SEND FAILED:', err && err.message ? err.message : err);
    return { success: false, error: err && (err.message || JSON.stringify(err)) };
  }
}

export default { sendEmailOTP };