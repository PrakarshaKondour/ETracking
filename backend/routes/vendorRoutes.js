import express from 'express';
import mongoose from 'mongoose';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import Vendor from '../models/vendor.js';
import Order from '../models/Order.js';
import { ORDER_STATUS_FLOW } from "../constants/orderStatus.js";
import { setValue, getValue } from '../utils/redisHelper.js';
import { deleteValue } from '../utils/redisHelper.js';
import { broadcastSse } from '../services/notificationService.js';
import client from '../config/redis.js';


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

// Get single vendor order by id (vendor ownership enforced)
router.get('/orders/:orderId', async (req, res) => {
  try {
    if (req.user.role !== 'vendor') return res.status(403).json({ ok: false, message: 'Vendor access required' });
    const { orderId } = req.params;
    const order = await Order.findOne({ _id: orderId, vendorUsername: req.user.username });
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' });
    res.json({ ok: true, order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch order' });
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

    const prevStatus = order.status;
    order.status = status;
    await order.save();

    // ✅ NEW: Use the comprehensive cleanup function to remove ALL notifications for this order
    const { clearOrderNotifications } = await import('../services/notificationService.js');
    await clearOrderNotifications(orderId);

    // ✅ NEW: If vendor reverts status to 'ordered', notify Admin and Vendor
    if (status === 'ordered') {
      try {
        const notif = {
          _notifType: 'order_update',
          event: 'order.status_reverted',
          title: 'Order Status Reverted',
          message: `Order #${orderId} status was reverted to "ordered" by vendor ${req.user.username}.`,
          priority: 'high',
          timestamp: new Date().toISOString(),
          data: {
            orderId,
            vendorUsername: req.user.username,
            customerUsername: order.customerUsername,
            prevStatus,
            newStatus: status,
            total: order.total
          }
        };
        const str = JSON.stringify(notif);

        // 1. Notify Admin
        const adminKey = 'notifications:admin:order_updates';
        await client.rPush(adminKey, str);
        await client.expire(adminKey, 7 * 24 * 60 * 60);

        // 2. Notify Vendor (Requester)
        const vendorKey = `notifications:vendor:${req.user.username}`;
        await client.rPush(vendorKey, str);
        await client.expire(vendorKey, 7 * 24 * 60 * 60);

        // Individual key for cleanup if needed
        const indKey = `notification:order:${orderId}:reverted`;
        await client.set(indKey, str, { EX: 7 * 24 * 60 * 60 });

        console.log('📣 Notified Admin and Vendor about status revert:', orderId);
      } catch (e) {
        console.warn('⚠️ Failed to push status revert notification:', e.message);
      }
    }

    // Push NEW notification to customer about the status change (only after cleanup)
    try {
      if (order.customerUsername) {
        const custKey = `notifications:customer:${order.customerUsername}`;
        const notif = {
          event: 'order.status_changed',
          timestamp: new Date().toISOString(),
          data: {
            orderId: order._id?.toString(),
            vendorUsername: order.vendorUsername,
            customerUsername: order.customerUsername,
            prevStatus: prevStatus,
            newStatus: status,
            total: order.total || 0,
          }
        };
        await client.rPush(custKey, JSON.stringify(notif));
        await client.expire(custKey, 7 * 24 * 60 * 60);
        const ind = `notification:order:${order._id?.toString()}:customer:${order.customerUsername}`;
        await client.set(ind, JSON.stringify(notif), { EX: 7 * 24 * 60 * 60 });
        console.log('📣 Sent order status notification to customer:', order.customerUsername);
      }
    } catch (e) {
      console.warn('⚠️ Failed to push customer notification:', e.message);
    }

    console.log(`✅ Order ${orderId} status updated from "${prevStatus}" to "${status}" by vendor ${req.user.username}`);

    // Clear vendor's acknowledgment key so delayed notification doesn't re-appear
    try {
      const ackKey = `ack:order:${orderId}:vendor:${req.user.username}`;
      await deleteValue(ackKey);
    } catch (e) {
      console.warn('⚠️ Failed to clear vendor ack key:', e.message);
    }

    // Broadcast to SSE clients (admin UI, real-time updates)
    try {
      broadcastSse({
        type: 'order.updated',
        data: {
          orderId,
          prevStatus,
          newStatus: status,
          vendorUsername: req.user.username,
          customerUsername: order.customerUsername
        }
      });
    } catch (e) {
      console.warn('⚠️ Failed to broadcast SSE:', e.message);
    }

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
    const pendingOrders = orders.filter(order => order.status !== 'delivered').length;

    console.log('✅ Dashboard data for vendor username:', req.user.username, '- Total orders:', totalOrders);
    res.json({
      ok: true,
      data: { recentOrders, totalOrders, totalRevenue, pendingOrders },
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

    // Performance trends (compare last 7 days vs previous 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const lastWeekOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= sevenDaysAgo;
    });

    const previousWeekOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= fourteenDaysAgo && orderDate < sevenDaysAgo;
    });

    const lastWeekRevenue = lastWeekOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const previousWeekRevenue = previousWeekOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    const performanceTrends = {
      lastWeek: {
        orders: lastWeekOrders.length,
        revenue: lastWeekRevenue,
      },
      previousWeek: {
        orders: previousWeekOrders.length,
        revenue: previousWeekRevenue,
      },
      orderGrowth: previousWeekOrders.length > 0
        ? ((lastWeekOrders.length - previousWeekOrders.length) / previousWeekOrders.length * 100).toFixed(2)
        : 0,
      revenueGrowth: previousWeekRevenue > 0
        ? ((lastWeekRevenue - previousWeekRevenue) / previousWeekRevenue * 100).toFixed(2)
        : 0,
    };

    res.json({
      ok: true,
      data: {
        totalRevenue,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        timeSeries,
        statusBreakdown,
        performanceTrends,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch analytics' });
  }
});

// Get vendor's delayed orders
// GET /api/vendor/delayed-orders
router.get('/delayed-orders', async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ ok: false, message: 'Vendor access required' });
    }

    const DELAY_THRESHOLD_HOURS = 24;
    const now = new Date();
    const thresholdTime = new Date(now - DELAY_THRESHOLD_HOURS * 60 * 60 * 1000);
    const terminalStatuses = ['delivered', 'cancelled', 'returned'];

    // Find vendor's orders that are delayed
    let delayedOrders = await Order.find({
      vendorUsername: req.user.username,
      status: { $nin: terminalStatuses },
      createdAt: { $lt: thresholdTime }
    }).sort({ createdAt: -1 });

    // Filter out orders acknowledged by this vendor
    const filtered = [];
    for (const o of delayedOrders) {
      const ackKey = `ack:order:${o._id}:vendor:${req.user.username}`;
      const ack = await getValue(ackKey);
      if (!ack) filtered.push(o);
    }

    console.log('⏱️ Found', filtered.length, 'delayed orders for vendor (after ack filter):', req.user.username);
    res.json({ ok: true, delayedOrders: filtered, count: filtered.length });
  } catch (error) {
    console.error('Delayed orders error:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch delayed orders' });
  }
});

// Acknowledge (clear) a delayed-order notification for this vendor
router.post('/notifications/ack/:orderId', async (req, res) => {
  try {
    if (req.user.role !== 'vendor') return res.status(403).json({ ok: false, message: 'Vendor access required' });
    const { orderId } = req.params;
    // Verify ownership
    const order = await Order.findOne({ _id: orderId, vendorUsername: req.user.username });
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found or access denied' });

    const ackKey = `ack:order:${orderId}:vendor:${req.user.username}`;
    // Set a 7 day TTL to avoid permanently hiding notifications
    await setValue(ackKey, true, 7 * 24 * 60 * 60);

    res.json({ ok: true, message: 'Acknowledged' });
  } catch (error) {
    console.error('Ack error:', error);
    res.status(500).json({ ok: false, message: 'Failed to acknowledge' });
  }
});

// Get vendor notifications
router.get('/notifications', async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ ok: false, message: 'Vendor access required' });
    }

    const vendorKey = `notifications:vendor:${req.user.username}`;
    const arr = await client.lRange(vendorKey, 0, -1);
    const notifications = (arr || []).map((s) => {
      try {
        return JSON.parse(s);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    res.json({ ok: true, data: { notifications, unreadCount: notifications.length } });
  } catch (err) {
    console.error('❌ Get vendor notifications error:', err.message);
    res.status(500).json({ ok: false, message: 'Server error: ' + err.message });
  }
});

// Clear all vendor notifications
router.delete('/notifications', async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ ok: false, message: 'Vendor access required' });
    }

    const vendorKey = `notifications:vendor:${req.user.username}`;
    await client.del(vendorKey);

    try {
      const keys = await client.keys(`notification:*:vendor:${req.user.username}`);
      if (keys && keys.length > 0) await client.del(...keys);
    } catch (e) {
      console.warn('⚠️ Failed to delete individual vendor notification keys:', e.message);
    }

    res.json({ ok: true, message: 'Vendor notifications cleared' });
  } catch (err) {
    console.error('❌ Clear vendor notifications error:', err.message);
    res.status(500).json({ ok: false, message: 'Server error: ' + err.message });
  }
});

export default router;
