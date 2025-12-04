import { setValue, getValue, deleteValue } from '../utils/redisHelper.js';
import { validatePhoneNumber } from '../utils/validators.js';

/**
 * Generate and store a 6-digit OTP for a phone number.
 * Stores OTP in Redis with TTL = 300 seconds (5 minutes).
 * Returns the generated OTP (for use in development/testing).
 */
export async function sendOTP(phone) {
  if (!phone) return { success: false, message: 'Phone number is required' };
  
  if (!validatePhoneNumber(phone)) {
    return { success: false, message: 'Invalid phone number. Must be 10 digits (Indian format)' };
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const key = `otp:${phone}`;

  const saved = await setValue(key, otp, 300);
  if (!saved) {
    return { success: false, message: 'Failed to store OTP' };
  }

  // In production you would send the OTP via SMS here.
  return { success: true, message: 'OTP sent successfully', otp };
}


/**
 * Verify an OTP for a phone number. On success, the OTP is deleted from Redis.
 * Returns an object { success: boolean, message?: string }
 */
export async function verifyOTP(phone, otp) {
  if (!phone) return { success: false, message: 'Phone required' };
  if (!validatePhoneNumber(phone)) {
    return { success: false, message: 'Invalid phone number. Must be 10 digits (Indian format)' };
  }
  if (!otp) return { success: false, message: 'OTP required' };

  const key = `otp:${phone}`;
  const stored = await getValue(key);
  if (!stored) return { success: false, message: 'No OTP found or it expired' };

  if (stored.toString() === otp.toString()) {
    await deleteValue(key);
    return { success: true };
  }

  return { success: false, message: 'Invalid OTP' };
}

export default { sendOTP, verifyOTP };
