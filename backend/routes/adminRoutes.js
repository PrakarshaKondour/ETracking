import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import Admin from '../models/admin.js';
import Customer from '../models/customer.js';
import Vendor from '../models/vendor.js';
import Order from '../models/Order.js';
import { logToLogstash } from '../utils/logstash.js';


const router = express.Router();

// Apply auth middleware to ALL admin routes
router.use(authMiddleware);

// Dashboard endpoint
router.get('/dashboard', async (req, res) => {
  try {
    console.log('📊 Admin dashboard request from:', req.user.username);
    
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Admin access required' });
    }

    const admins = await Admin.countDocuments();
    const customers = await Customer.countDocuments();
    const vendors = await Vendor.countDocuments();
    const orders = await Order.countDocuments();

    res.json({
      ok: true,
      data: {
        stats: {
          admins,
          customers,
          vendors,
          orders
        }
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load dashboard' });
  }
});

// Get all customers
router.get('/customers', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Admin access required' });
    }

    const customers = await Customer.find({}, { password: 0 });
    res.json({ ok: true, data: customers });
  } catch (error) {
    console.error('Customers error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch customers' });
  }
});

// Get all vendors
router.get('/vendors', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Admin access required' });
    }

    const vendors = await Vendor.find({}, { password: 0 });
    res.json({ ok: true, data: vendors });
  } catch (error) {
    console.error('Vendors error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch vendors' });
  }
});

// Get all orders
router.get('/orders', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Admin access required' });
    }

    const orders = await Order.find({});
    res.json({ ok: true, data: orders });
  } catch (error) {
    console.error('Orders error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch orders' });
  }
});

// Get analytics
// Get analytics
router.get('/analytics', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Admin access required' });
    }

    const orders = await Order.find({});

    // Ensure numeric total
    const revenue = orders.reduce((sum, order) => {
      const amount = Number(order.total) || 0;
      return sum + amount;
    }, 0);

    const totalOrders = orders.length;

    res.json({ 
      ok: true, 
      data: { 
        revenue,        // <-- MATCHES frontend
        totalOrders,
        averageOrderValue: totalOrders > 0 ? revenue / totalOrders : 0
      } 
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch analytics' });
  }
});


// APPROVE
router.patch('/vendors/:username/approve', async (req, res) => {
  const vendor = await Vendor.findOneAndUpdate(
    { username: req.params.username },
    { status: 'approved' },
    { new: true }
  );

  if (!vendor) return res.status(404).json({ ok: false, message: 'Vendor not found' });

  console.log(`✅ Vendor approved: ${vendor.username}`);
  logToLogstash("info", "vendor_status_change", {
    action: "approved",
    vendor: vendor.username,
    admin: req.user.username
  });

  res.json({ ok: true, data: vendor });
});

// HOLD
router.patch('/vendors/:username/hold', async (req, res) => {
  const vendor = await Vendor.findOneAndUpdate(
    { username: req.params.username },
    { status: 'held' },
    { new: true }
  );

  if (!vendor) return res.status(404).json({ ok: false, message: 'Vendor not found' });

  console.log(`🟠 Vendor put on HOLD: ${vendor.username}`);
  logToLogstash("warn", "vendor_status_change", {
    action: "hold",
    vendor: vendor.username,
    admin: req.user.username
  });

  res.json({ ok: true, data: vendor });
});

// DECLINE
router.patch('/vendors/:username/decline', async (req, res) => {
  const vendor = await Vendor.findOneAndUpdate(
    { username: req.params.username },
    { status: 'declined' },
    { new: true }
  );

  if (!vendor) return res.status(404).json({ ok: false, message: 'Vendor not found' });

  console.log(`❌ Vendor DECLINED: ${vendor.username}`);
  logToLogstash("error", "vendor_status_change", {
    action: "declined",
    vendor: vendor.username,
    admin: req.user.username
  });

  res.json({ ok: true, data: vendor });
});

// REACTIVATE
router.patch('/vendors/:username/reactivate', async (req, res) => {
  const vendor = await Vendor.findOneAndUpdate(
    { username: req.params.username },
    { status: 'approved' },
    { new: true }
  );

  if (!vendor) return res.status(404).json({ ok: false, message: 'Vendor not found' });

  console.log(`🔵 Vendor REACTIVATED: ${vendor.username}`);
  logToLogstash("info", "vendor_status_change", {
    action: "reactivated",
    vendor: vendor.username,
    admin: req.user.username
  });

  res.json({ ok: true, data: vendor });
});



export default router;