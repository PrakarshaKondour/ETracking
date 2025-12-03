import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import { deleteValue } from '../utils/redisHelper.js';
import { default as client } from '../config/redis.js';

export async function getAdminNotifications(req, res) {
  try {
    // Fetch all pending vendor registration notifications from Redis list
    const notificationKey = 'notifications:admin:vendor_registrations';

    // Get all items from the Redis list
    const notificationStrings = await client.lRange(notificationKey, 0, -1);

    let notifications = [];
    if (notificationStrings && notificationStrings.length > 0) {
      notifications = notificationStrings.map((str) => {
        try {
          return JSON.parse(str);
        } catch (e) {
          console.error('Error parsing notification:', e);
          return null;
        }
      }).filter(n => n !== null);
    }

    res.json({
      ok: true,
      data: {
        notifications: notifications,
        unreadCount: notifications.length,
      },
    });
  } catch (err) {
    console.error('❌ Get notifications error:', err.message);
    res.status(500).json({ ok: false, message: 'Server error: ' + err.message });
  }
}

export async function clearNotification(req, res) {
  try {
    const { vendorId } = req.params;

    // Remove from individual key
    const individualKey = `notification:${vendorId}`;
    await deleteValue(individualKey);

    // Also remove from the notifications list if it exists
    const notificationKey = 'notifications:admin:vendor_registrations';
    const allNotifications = await client.lRange(notificationKey, 0, -1);
    
    // Filter out the notification for this vendor
    const filtered = allNotifications.filter((str) => {
      try {
        const notif = JSON.parse(str);
        return notif.data?.vendorId !== vendorId;
      } catch (e) {
        return true;
      }
    });

    // Rebuild the list
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

export async function clearAllNotifications(req, res) {
  try {
    const listKey = 'notifications:admin:vendor_registrations';

    // Delete the list
    await client.del(listKey);

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

export default { getAdminNotifications, clearNotification, clearAllNotifications };
