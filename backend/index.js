const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('./db');
const Admin = require('./models/admin');
const Vendor = require('./models/vendor');
const Customer = require('./models/customer');

const app = express();
app.use(cors());
app.use(express.json());

// ---------- SEED FUNCTION ----------
async function seed() {
  try {
    console.log('Seeding: checking collection counts...');
    const [adminCount, vendorCount, customerCount] = await Promise.all([
      Admin.countDocuments().catch(() => 0),
      Vendor.countDocuments().catch(() => 0),
      Customer.countDocuments().catch(() => 0),
    ]);
    console.log(`Counts -> admins: ${adminCount}, vendors: ${vendorCount}, customers: ${customerCount}`);

    const admins = [
      { username: 'admin1', email: 'admin1@example.com', password: 'adminpass1' },
      { username: 'superadmin', email: 'superadmin@example.com', password: 'superpass' },
    ];
    const vendors = [
      { username: 'vendorjoe', email: 'joe@vendor.com', password: 'vendorpass', companyName: 'Joe Supplies', phone: '555-1001' },
      { username: 'vendoranna', email: 'anna@vendor.com', password: 'annapass', companyName: 'Anna Goods', phone: '555-1002' },
    ];
    const customers = [
      { username: 'custsam', email: 'sam@customer.com', password: 'custpass', fullName: 'Sam Rogers', address: '123 Main St', phone: '555-2001' },
      { username: 'jane_doe', email: 'jane@customer.com', password: 'janepass', fullName: 'Jane Doe', address: '456 Oak Ave', phone: '555-2002' },
    ];

    if (adminCount === 0) {
      await Admin.insertMany(admins);
      console.log('Inserted admin sample data');
    } else {
      console.log('Admin collection not empty — skipping admin seed');
    }

    if (vendorCount === 0) {
      await Vendor.insertMany(vendors);
      console.log('Inserted vendor sample data');
    } else {
      console.log('Vendor collection not empty — skipping vendor seed');
    }

    if (customerCount === 0) {
      await Customer.insertMany(customers);
      console.log('Inserted customer sample data');
    } else {
      console.log('Customer collection not empty — skipping customer seed');
    }

    console.log('Seeding completed');
  } catch (err) {
    console.error('Seeding error:', err);
    throw err;
  }
}

// ---------- HELPER: FIND USER ----------
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
// ---------- HELPER: CHECK USERNAME IN ALL COLLECTIONS ----------
async function usernameExists(username) {
  if (!username) return false;

  const [admin, vendor, customer] = await Promise.all([
    Admin.findOne({ username }).lean(),
    Vendor.findOne({ username }).lean(),
    Customer.findOne({ username }).lean(),
  ]);

  return !!(admin || vendor || customer);
}


// ---------- ROUTES ----------
app.get('/', (req, res) => res.send('API running'));

// make this async so we can await findUserByUsername
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ ok: false, message: 'Username and password required' });
    }

    const found = await findUserByUsername(username);

    if (!found || !found.user) {
      return res.status(404).json({
        ok: false,
        message: 'User not found. Please register.',
        redirect: '/register'
      });
    }

    const { role, user } = found;

    if (user.password !== password) {
      return res.status(401).json({ ok: false, message: 'Invalid password' });
    }

    const { password: pw, ...userWithoutPassword } = user;
    return res.json({ ok: true, role, user: userWithoutPassword });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, password, role, companyName, phone, fullName, address } = req.body;
    if (!username || !email || !password || !role) return res.status(400).json({ ok: false, message: 'Missing required fields' });

    if (role !== 'vendor' && role !== 'customer') {
      return res.status(400).json({ ok: false, message: 'Only vendor and customer registration is allowed' });
    }

    if (await usernameExists(username)) return res.status(409).json({ ok: false, message: 'Username already exists' });

    let doc;
    if (role === 'vendor') {
      doc = new Vendor({ username, email, password, companyName, phone });
    } else { // customer
      doc = new Customer({ username, email, password, fullName, address, phone });
    }

    await doc.save();
    return res.status(201).json({ ok: true, message: 'Registered' });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// ---------- SERVER START + DB + SEED ----------
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
