import express from 'express';
import mongoose from 'mongoose';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import Customer from '../models/customer.js';
import Order from '../models/Order.js';
import { deleteValue, setValue, getValue } from '../utils/redisHelper.js';

const router = express.Router();

// Apply auth middleware to ALL customer routes
router.use(verifyToken);
router.use(requireRole('customer'));

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

// Get single customer order (ownership enforced)
router.get('/orders/:orderId', async (req, res) => {
  try {
    if (req.user.role !== 'customer') return res.status(403).json({ ok: false, message: 'Customer access required' });
    const { orderId } = req.params;
    const order = await Order.findOne({ _id: orderId, customerUsername: req.user.username });
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' });
    res.json({ ok: true, order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch order' });
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

// Delete customer account (protected)
// DELETE /api/customer/delete
router.delete('/delete', async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ ok: false, message: 'Customer access required' });
    }

    const customerId = new mongoose.Types.ObjectId(req.user.id);
    const username = req.user.username;

    // Delete customer record
    const deleted = await Customer.findByIdAndDelete(customerId);
    if (!deleted) {
      return res.status(404).json({ ok: false, message: 'Customer not found' });
    }

    // Remove related orders
    await Order.deleteMany({ customerUsername: username });

    // Revoke token in Redis
    await deleteValue(`user:${req.user.id}:token`);

    console.log('🗑️ Customer account deleted:', username, req.user.id);
    res.json({ ok: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ ok: false, message: 'Failed to delete account' });
  }
});

// Get delayed orders for customer
// GET /api/customer/delayed-orders
router.get('/delayed-orders', async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ ok: false, message: 'Customer access required' });
    }

    const DELAY_THRESHOLD_HOURS = 24;
    const now = new Date();
    const thresholdTime = new Date(now - DELAY_THRESHOLD_HOURS * 60 * 60 * 1000);
    const terminalStatuses = ['delivered', 'cancelled', 'returned'];

    // Find customer's orders that are delayed
    let delayedOrders = await Order.find({
      customerUsername: req.user.username,
      status: { $nin: terminalStatuses },
      createdAt: { $lt: thresholdTime }
    }).sort({ createdAt: -1 });

    // Filter out orders acknowledged by this customer
    const filtered = [];
    for (const o of delayedOrders) {
      const ackKey = `ack:order:${o._id}:customer:${req.user.username}`;
      const ack = await getValue(ackKey);
      if (!ack) filtered.push(o);
    }

    console.log('⏱️ Found', filtered.length, 'delayed orders for customer (after ack filter):', req.user.username);
    res.json({ ok: true, delayedOrders: filtered, count: filtered.length });
  } catch (error) {
    console.error('Delayed orders error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch delayed orders' });
  }
});

// Acknowledge (clear) a delayed-order notification for this customer
router.post('/notifications/ack/:orderId', async (req, res) => {
  try {
    if (req.user.role !== 'customer') return res.status(403).json({ ok: false, message: 'Customer access required' });
    const { orderId } = req.params;
    // Verify ownership
    const order = await Order.findOne({ _id: orderId, customerUsername: req.user.username });
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found or access denied' });

    const ackKey = `ack:order:${orderId}:customer:${req.user.username}`;
    // Set a 7 day TTL
    await setValue(ackKey, true, 7 * 24 * 60 * 60);

    res.json({ ok: true, message: 'Acknowledged' });
  } catch (error) {
    console.error('Ack error:', error);
    res.status(500).json({ ok: false, message: 'Failed to acknowledge' });
  }
});

// Get customer notifications
router.get('/notifications', async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ ok: false, message: 'Customer access required' });
    }

    const customerKey = `notifications:customer:${req.user.username}`;
    const arr = await client.lRange(customerKey, 0, -1);
    const notifications = (arr || []).map((s) => {
      try {
        return JSON.parse(s);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    res.json({ ok: true, data: { notifications, unreadCount: notifications.length } });
  } catch (err) {
    console.error('❌ Get customer notifications error:', err.message);
    res.status(500).json({ ok: false, message: 'Server error: ' + err.message });
  }
});

// Clear all customer notifications
router.delete('/notifications', async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ ok: false, message: 'Customer access required' });
    }

    const customerKey = `notifications:customer:${req.user.username}`;
    await client.del(customerKey);

    try {
      const keys = await client.keys(`notification:*:customer:${req.user.username}`);
      if (keys && keys.length > 0) await client.del(...keys);
    } catch (e) {
      console.warn('⚠️ Failed to delete individual customer notification keys:', e.message);
    }

    res.json({ ok: true, message: 'Customer notifications cleared' });
  } catch (err) {
    console.error('❌ Clear customer notifications error:', err.message);
    res.status(500).json({ ok: false, message: 'Server error: ' + err.message });
  }
});

export default router;
