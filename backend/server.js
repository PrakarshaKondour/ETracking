import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import connectDB from './db.js';
import Admin from './models/admin.js';
import Customer from './models/customer.js';
import Vendor from './models/vendor.js';
import adminRoutes from './routes/adminRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import { logToLogstash } from './utils/logstash.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: allow Authorization
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user'],
}));

app.use(express.json());

// Connect to DB before registering routes
connectDB().then(() => {
  console.log('DB connected, registering routes');
  // Routes after DB connected
  app.use('/api/admin', adminRoutes);
  app.use('/api/customer', customerRoutes);
  app.use('/api/vendor', vendorRoutes);
}).catch(err => {
  console.error('DB connect failed:', err);
  process.exit(1);
});

// helper to find user by username
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
    if (!username || !password) return res.status(400).json({ ok: false, message: 'Username and password required' });

    logToLogstash('info', 'login_attempt', { username });

    const found = await findUserByUsername(username);
    if (!found || !found.user) {
      logToLogstash('warn', 'login_user_not_found', { username });
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const { user, role } = found;

    // NOTE: replace with bcrypt compare in production
    if (user.password !== password) {
      logToLogstash('warn', 'login_invalid_password', { username });
      return res.status(401).json({ ok: false, message: 'Invalid password' });
    }
    // 🚫 Block vendors who are on hold or declined
if (role === 'vendor') {
  if (user.status === 'held') {
    return res.status(403).json({ ok: false, message: 'Your account is on hold. Contact admin.' });
  }
  if (user.status === 'declined') {
    return res.status(403).json({ ok: false, message: 'Your vendor account has been declined.' });
  }
}

    const userId = (user._id && typeof user._id.toString === 'function') ? user._id.toString() : String(Date.now());

    const payload = { id: userId, username: user.username, email: user.email, role };
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(payload, secret, { expiresIn: '24h' });

    logToLogstash('info', 'login_success', { username, role });

    res.json({
      ok: true,
      role,
      user: { id: user._id, username: user.username, email: user.email },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    logToLogstash('error', 'login_error', { error: err.message });
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Register endpoint
app.post('/register', async (req, res) => {
  try {
    const { username, password, email, role } = req.body;

    if (!username || !password || !email || !role) {
      return res.status(400).json({ ok: false, message: 'All fields required' });
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

    const existingUser = await Model.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ ok: false, message: 'Username already exists' });
    }

    const user = new Model({ username, password, email, role });
    await user.save();

    res.json({
      ok: true,
      message: 'Registration successful',
      role: role,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('❌ Register error:', error.message);
    res.status(500).json({ ok: false, message: 'Server error: ' + error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
