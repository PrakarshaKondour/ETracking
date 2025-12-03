/**
 * Validate email format using standard regex.
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate Indian phone number (10 digits).
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
export function validatePhoneNumber(phone) {
  if (!phone) return false;

  const cleanPhone = phone.toString().replace(/[\s\-()]/g, '');

  // Indian mobile number: must start with 6,7,8,9 AND be 10 digits
  const phoneRegex = /^[6-9]\d{9}$/;

  return phoneRegex.test(cleanPhone);
}


/**
 * Validate both email and phone.
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validateCredentials(email, phone) {
  const errors = [];

  if (!validateEmail(email)) {
    errors.push('Invalid email format');
  }

  if (!validatePhoneNumber(phone)) {
    errors.push('Phone number must be 10 digits (Indian format)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default { validateEmail, validatePhoneNumber, validateCredentials };
