// adminRoutes.js
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import Admin from '../models/admin.js';
import Customer from '../models/customer.js';
import Vendor from '../models/vendor.js';
import Order from '../models/Order.js';

const router = express.Router();

// ✅ Apply auth middleware to ALL admin routes
router.use(authMiddleware);

// ====== DASHBOARD ======
router.get('/dashboard', async (req, res) => {
  try {
    console.log('📊 Admin dashboard request from:', req.user.username);

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
        stats: { admins, customers, vendors, orders },
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load dashboard' });
  }
});

// ====== LIST CUSTOMERS ======
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

// ====== LIST VENDORS ======
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

// ====== LIST ORDERS ======
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

// ====== ANALYTICS ======
router.get('/analytics', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Admin access required' });
    }

    const orders = await Order.find({});
    const revenue = orders.reduce((sum, order) => {
      const amount = Number(order.total) || 0;
      return sum + amount;
    }, 0);

    const totalOrders = orders.length;

    res.json({
      ok: true,
      data: {
        revenue,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? revenue / totalOrders : 0,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch analytics' });
  }
});

// ======================================================
//              VENDOR STATUS MANAGEMENT
// ======================================================
async function requireAdmin(req, res) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ ok: false, message: 'Admin access required' });
    return false;
  }
  return true;
}

async function updateVendorStatus(username, status) {
  return Vendor.findOneAndUpdate(
    { username },
    { status },
    { new: true }
  ).select('-password');
}

// ✅ Approve vendor
router.patch('/vendors/:username/approve', async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const vendor = await updateVendorStatus(req.params.username, 'approved');

    if (!vendor) {
      return res.status(404).json({ ok: false, message: 'Vendor not found' });
    }

    res.json({ ok: true, data: vendor });
  } catch (error) {
    console.error('Approve vendor error:', error);
    res.status(500).json({ ok: false, message: 'Failed to approve vendor' });
  }
});

// ❌ Decline vendor
router.patch('/vendors/:username/decline', async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const vendor = await updateVendorStatus(req.params.username, 'declined');

    if (!vendor) {
      return res.status(404).json({ ok: false, message: 'Vendor not found' });
    }

    res.json({ ok: true, data: vendor });
  } catch (error) {
    console.error('Decline vendor error:', error);
    res.status(500).json({ ok: false, message: 'Failed to decline vendor' });
  }
});

// ⏸ Hold vendor
router.patch('/vendors/:username/hold', async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const vendor = await updateVendorStatus(req.params.username, 'held');

    if (!vendor) {
      return res.status(404).json({ ok: false, message: 'Vendor not found' });
    }

    res.json({ ok: true, data: vendor });
  } catch (error) {
    console.error('Hold vendor error:', error);
    res.status(500).json({ ok: false, message: 'Failed to put vendor on hold' });
  }
});

// 🔄 Reactivate vendor (from held / declined / removed)
router.patch('/vendors/:username/reactivate', async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const vendor = await updateVendorStatus(req.params.username, 'approved');

    if (!vendor) {
      return res.status(404).json({ ok: false, message: 'Vendor not found' });
    }

    res.json({ ok: true, data: vendor });
  } catch (error) {
    console.error('Reactivate vendor error:', error);
    res.status(500).json({ ok: false, message: 'Failed to reactivate vendor' });
  }
});

// 🗑 Remove vendor (soft delete)
router.patch('/vendors/:username/remove', async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const vendor = await updateVendorStatus(req.params.username, 'removed');

    if (!vendor) {
      return res.status(404).json({ ok: false, message: 'Vendor not found' });
    }

    res.json({ ok: true, data: vendor });
  } catch (error) {
    console.error('Remove vendor error:', error);
    res.status(500).json({ ok: false, message: 'Failed to remove vendor' });
  }
});

export default router;