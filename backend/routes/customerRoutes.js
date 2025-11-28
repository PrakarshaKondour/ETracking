import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/authMiddleware.js';
import Customer from '../models/customer.js';
import Order from '../models/Order.js';

const router = express.Router();

// Apply auth middleware to ALL customer routes
router.use(authMiddleware);

// Get customer profile
router.get('/profile', async (req, res) => {
  try {
    console.log('👤 Profile request from:', req.user.username);
    
    if (req.user.role !== 'customer') {
      return res.status(403).json({ ok: false, message: 'Customer access required' });
    }

    // Convert string ID from JWT to MongoDB ObjectId
    const customerId = new mongoose.Types.ObjectId(req.user.id);
    const customer = await Customer.findById(customerId, { password: 0 });
    if (!customer) {
      return res.status(404).json({ ok: false, message: 'Customer not found' });
    }

    console.log('✅ Customer profile fetched for:', customer.username, 'ID:', customerId);
    res.json({ ok: true, data: customer });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch profile' });
  }
});

// Get customer orders
router.get('/orders', async (req, res) => {
  try {
    console.log('📦 Orders request from:', req.user.username);
    
    if (req.user.role !== 'customer') {
      return res.status(403).json({ ok: false, message: 'Customer access required' });
    }

    // Order model uses customerUsername (string), not customerId
    const orders = await Order.find({ customerUsername: req.user.username }).sort({ createdAt: -1 });
    console.log('✅ Found', orders.length, 'orders for customer username:', req.user.username);
    res.json({ ok: true, orders }); // ✅ return "orders" not "data"
  } catch (error) {
    console.error('Orders error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch orders' });
  }
});

// Get dashboard
router.get('/dashboard', async (req, res) => {
  try {
    console.log('📊 Customer dashboard from:', req.user.username);
    
    if (req.user.role !== 'customer') {
      return res.status(403).json({ ok: false, message: 'Customer access required' });
    }

    // Order model uses customerUsername (string), not customerId
    const recentOrders = await Order.find({ customerUsername: req.user.username }).limit(5).sort({ createdAt: -1 });
    const totalOrders = await Order.countDocuments({ customerUsername: req.user.username });
    const totalSpent = (await Order.find({ customerUsername: req.user.username })).reduce((sum, order) => sum + (order.total || 0), 0);

    console.log('✅ Dashboard data for customer username:', req.user.username, '- Total orders:', totalOrders);
    res.json({ 
      ok: true, 
      data: { recentOrders, totalOrders, totalSpent } 
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch dashboard' });
  }
});

export default router;
