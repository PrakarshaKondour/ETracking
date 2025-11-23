const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('./db');

// require models (match actual filenames in your models folder)
const Admin = require('./models/Admin');
const Vendor = require('./models/Vendor');
const Customer = require('./models/Customer');
const Order = require('./models/Order');

// api route files you already added
const adminRoutes = require('./routes/adminRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const customerRoutes = require('./routes/customerRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// ---------- SEED FUNCTION ----------
async function seed() {
  try {
    console.log('Seeding: checking counts...');
    const [aCount, vCount, cCount, oCount] = await Promise.all([
      Admin.countDocuments().catch(() => 0),
      Vendor.countDocuments().catch(() => 0),
      Customer.countDocuments().catch(() => 0),
      Order.countDocuments().catch(() => 0),
    ]);
    console.log(`Counts -> admins:${aCount} vendors:${vCount} customers:${cCount} orders:${oCount}`);

    if (aCount === 0) {
      await Admin.insertMany([
        { username: 'admin1', email: 'admin1@example.com', password: 'adminpass1' },
        { username: 'superadmin', email: 'superadmin@example.com', password: 'superpass' },
      ]);
      console.log('Inserted admin seeds');
    } else console.log('Admins exist; skipping admin seed');

    if (vCount === 0) {
      await Vendor.insertMany([
        { username: 'vendorjoe', email: 'joe@vendor.com', password: 'vendorpass', companyName: 'Joe Supplies', phone: '555-1001' },
        { username: 'vendoranna', email: 'anna@vendor.com', password: 'annapass', companyName: 'Anna Goods', phone: '555-1002' },
      ]);
      console.log('Inserted vendor seeds');
    } else console.log('Vendors exist; skipping vendor seed');

    if (cCount === 0) {
      await Customer.insertMany([
        { username: 'custsam', email: 'sam@customer.com', password: 'custpass', fullName: 'Sam Rogers', address: '123 Main St', phone: '555-2001' },
        { username: 'jane_doe', email: 'jane@customer.com', password: 'janepass', fullName: 'Jane Doe', address: '456 Oak Ave', phone: '555-2002' },
      ]);
      console.log('Inserted customer seeds');
    } else console.log('Customers exist; skipping customer seed');

    if (oCount === 0) {
      const orders = [
        { customerUsername: 'custsam', vendorUsername: 'vendorjoe', items: [{ name: 'Widget', qty: 2, price: 9.99 }], total: 19.98, status: 'delivered' },
        { customerUsername: 'jane_doe', vendorUsername: 'vendoranna', items: [{ name: 'Gadget', qty: 1, price: 29.99 }], total: 29.99, status: 'processing' },
      ];
      await Order.insertMany(orders);
      console.log('Inserted order seeds');
    } else console.log('Orders exist; skipping order seed');

    console.log('Seeding completed');
  } catch (err) {
    console.error('Seeding error:', err);
    throw err;
  }
}

// ---------- HELPERS ----------
async function findUserByUsername(username) {
  if (!username) return null;
  let user = await Admin.findOne({ username }).lean();
  if (user) return { role: 'admin', user };
  user = await Vendor.findOne({ username }).lean();
  if (user) return { role: 'vendor', user };
  user = await Customer.findOne({ username }).lean();
  if (user) return { role: 'customer', user };
  return null;
}

async function usernameExists(username) {
  if (!username) return false;
  const [admin, vendor, customer] = await Promise.all([
    Admin.findOne({ username }).lean(),
    Vendor.findOne({ username }).lean(),
    Customer.findOne({ username }).lean(),
  ]);
  return !!(admin || vendor || customer);
}

// ---------- PUBLIC ROUTES ----------
app.get('/', (req, res) => res.send('API running'));

// login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ ok: false, message: 'Username and password required' });

    const found = await findUserByUsername(username);
    if (!found || !found.user) return res.status(404).json({ ok: false, message: 'User not found. Please register.' });

    const { role, user } = found;
    if (user.password !== password) return res.status(401).json({ ok: false, message: 'Invalid password' });

    const { password: pw, ...userWithoutPassword } = user;
    return res.json({ ok: true, role, user: userWithoutPassword });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// register (only vendor/customer)
app.post('/register', async (req, res) => {
  try {
    const { username, email, password, role, companyName, phone, fullName, address } = req.body || {};
    if (!username || !email || !password || !role) return res.status(400).json({ ok: false, message: 'Missing required fields' });
    if (role !== 'vendor' && role !== 'customer') return res.status(400).json({ ok: false, message: 'Only vendor and customer registration is allowed' });
    if (await usernameExists(username)) return res.status(409).json({ ok: false, message: 'Username already exists' });

    let doc;
    if (role === 'vendor') doc = new Vendor({ username, email, password, companyName, phone });
    else doc = new Customer({ username, email, password, fullName, address, phone });

    await doc.save();
    return res.status(201).json({ ok: true, message: 'Registered' });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// ---------- MOUNT ROLE ROUTES (protected by header-based role middleware inside those files) ----------
app.use('/api/admin', adminRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/customer', customerRoutes);

// ---------- START SERVER ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  try {
    console.log('Starting server...');
    await connectDB();
    console.log('Mongoose readyState:', mongoose.connection.readyState); // 1 = connected
    await seed();
    console.log(`Server started on http://localhost:${PORT}`);
  } catch (err) {
    console.error('DB connection / seed error', err);
    process.exit(1);
  }
});