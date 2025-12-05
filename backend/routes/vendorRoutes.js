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

    order.status = status;
    await order.save();

    // Push notification to the customer about status change
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
            status: order.status,
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

    console.log(`✅ Order ${orderId} status updated to "${status}" by vendor ${req.user.username}`);

    // If moved to terminal status, remove any delayed-order notification from Redis and notify admins
    const terminalStatuses = ['delivered', 'cancelled', 'returned'];
    if (terminalStatuses.includes(status)) {
      try {
        const individualKey = `notification:order:${orderId}`;
        await deleteValue(individualKey);

        // Remove from delayed orders list
        const listKey = 'notifications:admin:delayed_orders';
        try {
          const all = await client.lRange(listKey, 0, -1);
          const filtered = all.filter((str) => {
            try {
              const n = JSON.parse(str);
              return n.data?.orderId !== orderId;
            } catch (e) {
              return true;
            }
          });
          await client.del(listKey);
          if (filtered.length > 0) {
            await client.rPush(listKey, ...filtered);
            await client.expire(listKey, 7 * 24 * 60 * 60);
          }
        } catch (e) {
          console.error('⚠️ Error cleaning delayed orders list:', e.message);
        }

        // Broadcast to SSE clients so admin UI can remove the notification in real-time
        try { broadcastSse({ type: 'order.updated', data: { orderId, status, removed: true, vendorUsername: req.user.username } }); } catch(e){}
      } catch (e) {
        console.error('⚠️ Error while clearing notification after status change:', e.message);
      }
    } else {
      // Broadcast status update (non-terminal) to help clients reflect change
      try { broadcastSse({ type: 'order.updated', data: { orderId, status, removed: false, vendorUsername: req.user.username } }); } catch(e){}
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

// Get vendor notifications (delayed orders)
router.get('/notifications', async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ ok: false, message: 'Vendor access required' });
    }

    const DELAY_THRESHOLD_HOURS = 24;
    const now = new Date();
    const thresholdTime = new Date(now - DELAY_THRESHOLD_HOURS * 60 * 60 * 1000);
    const terminalStatuses = ['delivered', 'cancelled', 'returned'];

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

    const notifications = filtered.map(o => ({
      _notifType: 'order_delayed',
      data: {
        orderId: o._id?.toString(),
        customerUsername: o.customerUsername,
        status: o.status,
        createdAt: o.createdAt,
        total: o.total || 0
      },
      timestamp: new Date().toISOString()
    }));

    res.json({ ok: true, notifications, unreadCount: notifications.length });
  } catch (err) {
    console.error('❌ Get vendor notifications error:', err.message);
    res.status(500).json({ ok: false, message: 'Server error: ' + err.message });
  }
});

// Vendor SSE stream for real-time delayed-order notifications
router.get('/notifications/stream', (req, res, next) => {
  if (!req.headers.authorization && req.query && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, verifyToken, requireRole('vendor'), (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();
  res.write(':ok\n\n');
  
  import('../services/notificationService.js').then(mod => {
    mod.addSseClient(res);
    req.on('close', () => {
      mod.removeSseClient(res);
    });
  }).catch(e => console.error('SSE setup error:', e));
});

// Clear all vendor notifications (acknowledge all delayed orders)
router.delete('/notifications', async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ ok: false, message: 'Vendor access required' });
    }

    const DELAY_THRESHOLD_HOURS = 24;
    const now = new Date();
    const thresholdTime = new Date(now - DELAY_THRESHOLD_HOURS * 60 * 60 * 1000);
    const terminalStatuses = ['delivered', 'cancelled', 'returned'];

    const delayedOrders = await Order.find({
      vendorUsername: req.user.username,
      status: { $nin: terminalStatuses },
      createdAt: { $lt: thresholdTime }
    });

    for (const o of delayedOrders) {
      const ackKey = `ack:order:${o._id}:vendor:${req.user.username}`;
      await setValue(ackKey, true, 7 * 24 * 60 * 60);
    }

    res.json({ ok: true, message: 'All notifications acknowledged' });
  } catch (err) {
    console.error('❌ Clear vendor notifications error:', err.message);
    res.status(500).json({ ok: false, message: 'Server error: ' + err.message });
  }
});

export default router;
