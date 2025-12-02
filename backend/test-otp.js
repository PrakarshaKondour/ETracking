import { sendOTP, verifyOTP } from './controllers/authController.js';

(async () => {
  try {
    const phone = '5551001';
    console.log('Sending OTP for', phone);
    const otp = await sendOTP(phone);
    console.log('OTP (for testing):', otp);

    console.log('Verifying correct OTP...');
    const ok = await verifyOTP(phone, otp);
    console.log('verify result (correct):', ok);

    console.log('Verifying again (should be missing)...');
    const second = await verifyOTP(phone, otp);
    console.log('verify result (second):', second);
  } catch (err) {
    console.error('OTP test error:', err);
  } finally {
    process.exit(0);
  }
})();
