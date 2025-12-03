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

    // Expected time in each status (in hours)
    const expectedTimeByStatus = {
      ordered: 24,
      processing: 48,
      packing: 24,
      shipped: 12,
      in_transit: 72,
      out_for_delivery: 24,
      delivered: 0
    };

    const orders = await Order.find({}).sort({ vendorUsername: 1, createdAt: -1 });

    // Calculate escalation delays for each order
    const ordersWithEscalation = orders.map(order => {
      const orderAge = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60); // in hours
      const expectedTime = expectedTimeByStatus[order.status] || 24;
      const escalationDelay = Math.max(0, orderAge - expectedTime);
      const isEscalated = escalationDelay > 0;

      return {
        ...order.toObject(),
        escalation: {
          isEscalated,
          delayHours: Math.round(escalationDelay),
          orderAgeHours: Math.round(orderAge),
          expectedHours: expectedTime
        }
      };
    });

    res.json({ ok: true, data: ordersWithEscalation });
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

    // Time-series data: Orders over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOrders = orders.filter(order => new Date(order.createdAt) >= thirtyDaysAgo);

    // Group by date
    const ordersByDate = {};
    const revenueByDate = {};

    recentOrders.forEach(order => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      ordersByDate[date] = (ordersByDate[date] || 0) + 1;
      revenueByDate[date] = (revenueByDate[date] || 0) + (Number(order.total) || 0);
    });

    // Convert to array format for charts
    const timeSeries = Object.keys(ordersByDate).sort().map(date => ({
      date,
      orders: ordersByDate[date],
      revenue: revenueByDate[date]
    }));

    // Order status breakdown
    const statusBreakdown = {};
    orders.forEach(order => {
      const status = order.status || 'unknown';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });

    // Top vendors by order count and revenue
    const vendorStats = {};
    orders.forEach(order => {
      const vendor = order.vendorUsername || 'unknown';
      if (!vendorStats[vendor]) {
        vendorStats[vendor] = { orderCount: 0, revenue: 0 };
      }
      vendorStats[vendor].orderCount += 1;
      vendorStats[vendor].revenue += Number(order.total) || 0;
    });

    const topVendors = Object.entries(vendorStats)
      .map(([vendor, stats]) => ({ vendor, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      ok: true,
      data: {
        revenue,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? revenue / totalOrders : 0,
        timeSeries,
        statusBreakdown,
        topVendors,
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