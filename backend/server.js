import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import connectDB from './db.js';
import adminRoutes from './routes/adminRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import Admin from './models/admin.js';
import Customer from './models/customer.js';
import Vendor from './models/vendor.js';
import './config/redis.js';
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


app.use(express.json());

// Connect to MongoDB FIRST
connectDB();

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

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/vendor', vendorRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
