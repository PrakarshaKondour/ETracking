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

    // Merge and sort by timestamp desc
    const notifications = [...delayedNotifications, ...vendorNotifications].sort((a, b) => {
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

    // Delete both lists
    await client.del(vendorListKey);
    await client.del(delayedListKey);

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

export default { getAdminNotifications, clearNotification, clearOrderNotification, clearAllNotifications };
