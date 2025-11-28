import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/authMiddleware.js';
import Vendor from '../models/vendor.js';
import Order from '../models/Order.js';

const router = express.Router();

// Apply auth middleware to ALL vendor routes
router.use(authMiddleware);

// Get vendor profile
router.get('/profile', async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ ok: false, message: 'Vendor access required' });
    }

    // Convert string ID from JWT to MongoDB ObjectId
    const vendorId = new mongoose.Types.ObjectId(req.user.id);
    const vendor = await Vendor.findById(vendorId, { password: 0 });
    if (!vendor) {
      return res.status(404).json({ ok: false, message: 'Vendor not found' });
    }

    console.log('✅ Vendor profile fetched for:', vendor.username, 'ID:', vendorId);
    res.json({ ok: true, vendor }); // ✅ return vendor directly
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch profile' });
  }
});

// Get vendor orders
router.get('/orders', async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ ok: false, message: 'Vendor access required' });
    }

    // Order model uses vendorUsername (string), not vendorId
    const orders = await Order.find({ vendorUsername: req.user.username }).sort({ createdAt: -1 });
    console.log('✅ Found', orders.length, 'orders for vendor username:', req.user.username);
    res.json({ ok: true, orders }); // ✅ return "orders" not "data"
  } catch (error) {
    console.error('Orders error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch orders' });
  }
});

// Get vendor dashboard
router.get('/dashboard', async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ ok: false, message: 'Vendor access required' });
    }

    // Order model uses vendorUsername (string), not vendorId
    const orders = await Order.find({ vendorUsername: req.user.username }).sort({ createdAt: -1 });
    const recentOrders = orders.slice(0, 5);
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

    console.log('✅ Dashboard data for vendor username:', req.user.username, '- Total orders:', totalOrders);
    res.json({ 
      ok: true, 
      data: { recentOrders, totalOrders, totalRevenue } 
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch dashboard' });
  }
});

// Get analytics
router.get('/analytics', async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ ok: false, message: 'Vendor access required' });
    }

    // Order model uses vendorUsername (string), not vendorId
    const orders = await Order.find({ vendorUsername: req.user.username });
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