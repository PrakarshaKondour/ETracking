import express from 'express';
import mongoose from 'mongoose';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import Vendor from '../models/vendor.js';
import Order from '../models/Order.js';
import { ORDER_STATUS_FLOW } from "../constants/orderStatus.js";


const router = express.Router();

// Apply auth middleware to ALL vendor routes
router.use(verifyToken);
router.use(requireRole('vendor'));

// Allowed status values for vendor updates
const ALLOWED_STATUSES = ORDER_STATUS_FLOW;

// Get vendor profile
router.get('/profile', async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ ok: false, message: 'Vendor access required' });
    }

    const vendorId = new mongoose.Types.ObjectId(req.user.id);
    const vendor = await Vendor.findById(vendorId, { password: 0 });

    if (!vendor) {
      return res.status(404).json({ ok: false, message: 'Vendor not found' });
    }

    console.log('✅ Vendor profile fetched for:', vendor.username, 'ID:', vendorId);
    res.json({ ok: true, vendor });
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

    const orders = await Order.find({ vendorUsername: req.user.username }).sort({ createdAt: -1 });
    console.log('✅ Found', orders.length, 'orders for vendor username:', req.user.username);
    res.json({ ok: true, orders });
  } catch (error) {
    console.error('Orders error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch orders' });
  }
});


// ✅ NEW: Vendor updates order status
router.patch('/orders/:orderId/status', async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ ok: false, message: 'Vendor access required' });
    }

    const { orderId } = req.params;
    const { status } = req.body;

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        ok: false,
        message: 'Invalid status value',
        allowed: ALLOWED_STATUSES,
      });
    }

    // Ensure vendor only updates THEIR orders
    const order = await Order.findOne({
      _id: orderId,
      vendorUsername: req.user.username,
    });

    if (!order) {
      return res.status(404).json({
        ok: false,
        message: 'Order not found for this vendor',
      });
    }

    order.status = status;
    await order.save();

    console.log(
      `✅ Order ${orderId} status updated to "${status}" by vendor ${req.user.username}`
    );

    res.json({ ok: true, order });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ ok: false, message: 'Failed to update order status' });
  }
});

// Get vendor dashboard
router.get('/dashboard', async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ ok: false, message: 'Vendor access required' });
    }

    const orders = await Order.find({ vendorUsername: req.user.username }).sort({ createdAt: -1 });
    const recentOrders = orders.slice(0, 5);
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

    console.log('✅ Dashboard data for vendor username:', req.user.username, '- Total orders:', totalOrders);
    res.json({
      ok: true,
      data: { recentOrders, totalOrders, totalRevenue },
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

    const orders = await Order.find({ vendorUsername: req.user.username });
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = orders.length;

    res.json({
      ok: true,
      data: {
        totalRevenue,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch analytics' });
  }
});

export default router;