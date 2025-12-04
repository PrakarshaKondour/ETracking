import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import connectDB from './db.js';
import adminRoutes from './routes/adminRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import Admin from './models/admin.js';
import Customer from './models/customer.js';
import Vendor from './models/vendor.js';
import Order from './models/Order.js';
import './config/redis.js';
import { register, updateOrderMetrics } from './config/prometheus.js';
import { metricsMiddleware } from './middleware/metricsMiddleware.js';
import './config/redis.js';
import { connectRabbitMQ } from './config/rabbitmq.js';
import { startVendorNotificationConsumer, publishVendorRegistered } from './services/notificationService.js';
import rateLimit from './middleware/rateLimit.js';
import { setValue, getValue } from './utils/redisHelper.js';
import { sendOTP , verifyOTP } from './controllers/authController.js';
import { validateEmail, validatePhoneNumber } from './utils/validators.js';
// import stuff guys(redis.js) from config


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: allow Authorization + optional x-user-role and x-user
app.use(
  cors({
    origin: "http://localhost:3000", // or true if you want all origins in dev
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Metrics middleware (before routes)
app.use(metricsMiddleware);

app.use(express.json());
app.use('/login', rateLimit(5,60));
// Connect to MongoDB FIRST
connectDB();

// Connect to RabbitMQ and start consumers
(async () => {
  try {
    await connectRabbitMQ();
    await startVendorNotificationConsumer();
    console.log('🚀 RabbitMQ notification system ready');
  } catch (err) {
    console.error('⚠️ RabbitMQ setup failed (notifications will not work):', err.message);
  }
})();

async function findUserByUsername(username) {
  let user = await Admin.findOne({ username });
  if (user) return { role: "admin", user };

  user = await Customer.findOne({ username });
  if (user) return { role: "customer", user };

  user = await Vendor.findOne({ username });
  if (user) return { role: "vendor", user };

  return null;
}

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ ok: false, message: 'Username and password required' });
    }

    const found = await findUserByUsername(username);
    if (!found || !found.user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const { user, role } = found;

    if (user.password !== password) {
      return res.status(401).json({ ok: false, message: 'Invalid password' });
    }

    // 🚫 Check vendor status - only approved vendors can log in
    if (role === 'vendor' && user.status !== 'approved') {
      console.log(`⏳ Vendor login attempt while status is: ${user.status}`);
      return res.status(403).json({ 
        ok: false, 
        message: `Your vendor account is currently ${user.status}. Please wait for admin approval.` 
      });
    }

    // Convert MongoDB ObjectId to string for JWT payload - ensure it's unique
    let userId;
    if (user._id && typeof user._id.toString === 'function') {
      userId = user._id.toString();
      console.log("📥 Login request received:", username, user.password);

    } else if (user._id) {
      userId = String(user._id);
    } else {
      // Fallback: use username + timestamp for uniqueness (shouldn't happen)
      userId = `${user.username}_${Date.now()}`;
      console.warn('⚠️ User _id not found, using fallback ID for:', user.username);
    }

    // Ensure userId is unique - add timestamp if needed (but it should already be unique from _id)
    const payload = {
      id: userId,
      username: user.username,
      email: user.email,
      role: role,
      iat: Math.floor(Date.now() / 1000) // Issued at time for additional uniqueness
    };

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(payload, secret, { expiresIn: '24h' });
    await setValue(`user:${userId}:token`, token, 24 * 60 *60);

    console.log('🔐 Generated JWT token for user:', user.username, 'Role:', role, 'User ID:', userId);
    console.log('🔐 Token payload:', JSON.stringify(payload));
    console.log('🔐 Token (first 50 chars):', token.slice(0, 50) + '...');

    const userWithoutPassword = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: role
    };

    res.json({
      ok: true,
      role,
      user: userWithoutPassword,
      token
    });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

app.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    const result = await sendOTP(email);

    if (!result.success) {
      return res.status(400).json({ ok: false, message: result.message });
    }

    // If you want to expose dev OTP:
    // return res.json({ ok: true, message: result.message, otp: result.otp });

    res.json({ ok: true, message: 'OTP sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ ok: false, message: 'Email and OTP required' });
    }
    const result = await verifyOTP(email, otp);
    if (result.success) {
      res.json({ ok: true, message: 'OTP verified' });
    } else {
      res.status(400).json({ ok: false, message: result.message || 'Invalid OTP' });
    }
  } catch (error) {
    console.error('❌ Verify OTP error:', error.message);
    res.status(500).json({ ok: false, message: 'Server error: ' + error.message });
  }
});

// Register endpoint
app.post('/register', async (req, res) => {
  try {
    const { username, password, email, role, phone, fullName, address, companyName, otp } = req.body;

    if (!username || !password || !email || !role || !otp || !phone) {
      return res.status(400).json({ ok: false, message: 'All fields required' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ ok: false, message: 'Invalid email format' });
    }

    // Validate phone number (10 digits, Indian format)
    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({ ok: false, message: 'Phone number must be 10 digits (Indian format)' });
    }

    let Model;

    if (role === 'admin') {
      Model = Admin;
    } else if (role === 'customer') {
      Model = Customer;
    } else if (role === 'vendor') {
      Model = Vendor;
    } else {
      return res.status(400).json({ ok: false, message: 'Invalid role' });
    }

if (role === 'customer' || role === 'vendor') {
  if (!otp) {
    return res.status(400).json({ ok: false, message: 'OTP is required' });
  }

  const otpResult = await verifyOTP(email, otp);
  if (!otpResult.success) {
    return res.status(400).json({
      ok: false,
      message: otpResult.message || 'OTP verification failed',
    });
  }
}

    const existingUser = await Model.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ ok: false, message: 'Username already exists' });
    }

    const userData = { username, password, email, role };

    if (role === 'vendor') {
      if (companyName) userData.companyName = companyName;
      if (phone) userData.phone = phone;
      // Vendors start in pending status, need admin approval to be approved
      userData.status = 'pending';
    }

    if (role === 'customer') {
      if (fullName) userData.fullName = fullName;
      if (address) userData.address = address;
      if (phone) userData.phone = phone;
    }

    const user = new Model(userData);
    await user.save();

    // If vendor, publish registration event to RabbitMQ
    if (role === 'vendor') {
      try {
        await publishVendorRegistered(user);
      } catch (err) {
        console.error('⚠️ Failed to publish vendor registration event:', err.message);
        // Don't fail registration if event publishing fails
      }
    }

    // Different response based on role
    const responseMsg = role === 'vendor' 
      ? 'Registration successful! Your account is pending admin approval. You will be notified once approved.'
      : 'Registration successful';

    res.json({
      ok: true,
      message: responseMsg,
      role: role,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        status: user.status || undefined
      }
    });
  } catch (error) {
    console.error('❌ Register error:', error.message);
    res.status(500).json({ ok: false, message: 'Server error: ' + error.message });
  }
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    // Update order metrics before serving
    await updateOrderMetrics(Order);

    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error('❌ Metrics endpoint error:', error);
    res.status(500).end('Error generating metrics');
  }
});

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api', notificationRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
