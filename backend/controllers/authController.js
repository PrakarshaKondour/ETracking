import { setValue, getValue, deleteValue } from '../utils/redisHelper.js';
import { sendEmailOTP } from '../services/emailService.js';

/**
 * Generate and store a 6-digit OTP for an email.
 * Stores OTP in Redis with TTL = 300 seconds (5 minutes).
 */
export async function sendOTP(email) {
  if (!email) {
    return { success: false, message: 'Email is required' };
  }

  const key = `otp:${email.toLowerCase()}`;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const saved = await setValue(key, otp, 300);
  if (!saved) {
    return { success: false, message: 'Failed to store OTP' };
  }

  const sent = await sendEmailOTP(email, otp);
  if (!sent.success) {
    console.error('Failed to send OTP email:', sent.error);
    return { success: false, message: 'Failed to send OTP email' };
  }

  // In dev you can expose otp for alerting; in prod, remove it
  return { success: true, message: 'OTP sent successfully' /*, otp */ };
}

/**
 * Verify an OTP for an email. On success, the OTP is deleted from Redis.
 */
export async function verifyOTP(email, otp) {
  if (!email) return { success: false, message: 'Email required' };
  if (!otp) return { success: false, message: 'OTP required' };

  const key = `otp:${email.toLowerCase()}`;
  const stored = await getValue(key);
  if (!stored) return { success: false, message: 'No OTP found or it expired' };

  if (stored.toString() === otp.toString()) {
    await deleteValue(key);
    return { success: true };
  }

  return { success: false, message: 'Invalid OTP' };
}

export default { sendOTP, verifyOTP };
