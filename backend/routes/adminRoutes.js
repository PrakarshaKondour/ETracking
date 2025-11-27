import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import Admin from '../models/admin.js';
import Customer from '../models/customer.js';
import Vendor from '../models/vendor.js';
import Order from '../models/Order.js';

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
router.get('/analytics', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Admin access required' });
    }

    const orders = await Order.find({});
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = orders.length;

    res.json({ 
      ok: true, 
      data: { 
        totalRevenue, 
        totalOrders,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
      } 
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch analytics' });
  }
});

export default router;