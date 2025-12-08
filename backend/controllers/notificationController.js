import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import { deleteValue } from '../utils/redisHelper.js';
import { default as client } from '../config/redis.js';

export async function getAdminNotifications(req, res) {
  try {
    // Fetch vendor registration notifications
    const vendorKey = 'notifications:admin:vendor_registrations';
    const vendorStrings = await client.lRange(vendorKey, 0, -1);

    const vendorNotifications = (vendorStrings || []).map((s) => {
      try {
        const obj = JSON.parse(s);
        obj._notifType = 'vendor_registration';
        return obj;
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    // Fetch delayed order escalation notifications
    const delayedKey = 'notifications:admin:delayed_orders';
    const delayedStrings = await client.lRange(delayedKey, 0, -1);

    const delayedNotifications = (delayedStrings || []).map((s) => {
      try {
        const obj = JSON.parse(s);
        obj._notifType = 'order_delayed_escalation';
        return obj;
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    // Fetch order update notifications (e.g. status reverted)
    const updatesKey = 'notifications:admin:order_updates';
    const updateStrings = await client.lRange(updatesKey, 0, -1);

    const updateNotifications = (updateStrings || []).map((s) => {
      try {
        const obj = JSON.parse(s);
        // ensure type is set
        if (!obj._notifType) obj._notifType = 'order_update';
        return obj;
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    // Merge and sort by timestamp desc
    const notifications = [...delayedNotifications, ...vendorNotifications, ...updateNotifications].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    res.json({ ok: true, data: { notifications, unreadCount: notifications.length } });
  } catch (err) {
    console.error('❌ Get notifications error:', err.message);
    res.status(500).json({ ok: false, message: 'Server error: ' + err.message });
  }
}

export async function clearNotification(req, res) {
  try {
    const { vendorId } = req.params;

    // Remove vendor registration notification (individual key)
    const individualKey = `notification:${vendorId}`;
    await deleteValue(individualKey);

    // Also remove from the vendor registrations list
    const notificationKey = 'notifications:admin:vendor_registrations';
    const allNotifications = await client.lRange(notificationKey, 0, -1);
    const filtered = allNotifications.filter((str) => {
      try {
        const notif = JSON.parse(str);
        return notif.data?.vendorId !== vendorId;
      } catch (e) {
        return true;
      }
    });
    await client.del(notificationKey);
    if (filtered.length > 0) {
      await client.rPush(notificationKey, ...filtered);
      await client.expire(notificationKey, 86400);
    }

    console.log('✅ Cleared notification for vendor:', vendorId);
    res.json({ ok: true, message: 'Notification cleared' });
  } catch (err) {
    console.error('❌ Clear notification error:', err.message);
    res.status(500).json({ ok: false, message: 'Server error: ' + err.message });
  }
}

export async function clearOrderNotification(req, res) {
  try {
    const { orderId } = req.params;

    const individualKey = `notification:order:${orderId}`;
    await deleteValue(individualKey);

    const listKey = 'notifications:admin:delayed_orders';
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

    console.log('✅ Cleared delayed-order notification for order:', orderId);
    res.json({ ok: true, message: 'Order notification cleared' });
  } catch (err) {
    console.error('❌ Clear order notification error:', err.message);
    res.status(500).json({ ok: false, message: 'Server error: ' + err.message });
  }
}

export async function clearAllNotifications(req, res) {
  try {
    const vendorListKey = 'notifications:admin:vendor_registrations';
    const delayedListKey = 'notifications:admin:delayed_orders';
    const updatesListKey = 'notifications:admin:order_updates';

    // Delete both lists
    await client.del(vendorListKey);
    await client.del(delayedListKey);
    await client.del(updatesListKey);

    // Delete individual notification keys
    try {
      const keys = await client.keys('notification:*');
      if (keys && keys.length > 0) {
        await client.del(...keys);
      }
    } catch (e) {
      // Not fatal; log and continue
      console.error('⚠️ Error deleting individual notification keys:', e.message);
    }

    console.log('✅ Cleared all admin notifications');
    res.json({ ok: true, message: 'All notifications cleared' });
  } catch (err) {
    console.error('❌ Clear all notifications error:', err.message);
    res.status(500).json({ ok: false, message: 'Server error: ' + err.message });
  }
}

// Add these exports to backend/controllers/notificationController.js

// Get vendor notifications
export async function getVendorNotifications(req, res) {
  try {
    if (!req.user || req.user.role !== 'vendor') return res.status(403).json({ ok: false, message: 'Vendor access required' });

    const vendorKey = `notifications:vendor:${req.user.username}`;
    const arr = await client.lRange(vendorKey, 0, -1);
    const notifications = (arr || []).map((s) => {
      try {
        const obj = JSON.parse(s);
        return obj;
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    res.json({ ok: true, data: { notifications, unreadCount: notifications.length } });
  } catch (err) {
    console.error('❌ Get vendor notifications error:', err.message);
    res.status(500).json({ ok: false, message: 'Server error: ' + err.message });
  }
}

// Clear all vendor notifications (for current vendor)
export async function clearVendorNotifications(req, res) {
  try {
    if (!req.user || req.user.role !== 'vendor') return res.status(403).json({ ok: false, message: 'Vendor access required' });

    const vendorKey = `notifications:vendor:${req.user.username}`;

    // Delete list and try to delete individual keys matching notification:order:*:vendor:{username}
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
}

// Get customer notifications
export async function getCustomerNotifications(req, res) {
  try {
    if (!req.user || req.user.role !== 'customer') return res.status(403).json({ ok: false, message: 'Customer access required' });

    const customerKey = `notifications:customer:${req.user.username}`;
    const arr = await client.lRange(customerKey, 0, -1);
    const notifications = (arr || []).map((s) => {
      try {
        const obj = JSON.parse(s);
        return obj;
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    res.json({ ok: true, data: { notifications, unreadCount: notifications.length } });
  } catch (err) {
    console.error('❌ Get customer notifications error:', err.message);
    res.status(500).json({ ok: false, message: 'Server error: ' + err.message });
  }
}

// Clear all customer notifications (for current customer)
export async function clearCustomerNotifications(req, res) {
  try {
    if (!req.user || req.user.role !== 'customer') return res.status(403).json({ ok: false, message: 'Customer access required' });

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
}

export default { getAdminNotifications, clearNotification, clearOrderNotification, clearAllNotifications, getVendorNotifications, clearVendorNotifications, getCustomerNotifications, clearCustomerNotifications };