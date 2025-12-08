import { getChannel } from '../config/rabbitmq.js';
import client from '../config/redis.js';

const EXCHANGE_NAME = 'etracking_events';
const QUEUE_VENDOR_REGISTERED = 'vendor.registered';

// Simple in-memory SSE client registry for real-time notifications
const sseClients = new Set();

export function addSseClient(res) {
  sseClients.add(res);
}

export function removeSseClient(res) {
  try { sseClients.delete(res); } catch (e) { /* ignore */ }
}

export function broadcastSse(payload) {
  const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
  for (const res of sseClients) {
    try {
      res.write(`event: notification\n`);
      res.write(`data: ${str}\n\n`);
    } catch (e) {
      // ignore client write errors
      try { sseClients.delete(res); } catch {};
    }
  }
}

/**
 * Publish vendor registration event to RabbitMQ
 */
export async function publishVendorRegistered(vendorData) {
  try {
    const channel = await getChannel();

    // Declare exchange (fanout so multiple consumers can listen)
    await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });

    const message = {
      event: 'vendor.registered',
      timestamp: new Date().toISOString(),
      data: {
        vendorId: vendorData._id?.toString() || vendorData.id,
        username: vendorData.username,
        email: vendorData.email,
        companyName: vendorData.companyName,
        phone: vendorData.phone,
      },
    };

    channel.publish(
      EXCHANGE_NAME,
      'vendor.registered',
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    console.log('📤 Published vendor.registered event:', message);
  } catch (err) {
    console.error('❌ Failed to publish vendor.registered:', err.message);
  }
}

/**
 * Set up consumer for vendor registration notifications
 * This should be called once when the server starts
 */
export async function startVendorNotificationConsumer() {
  try {
    const channel = await getChannel();

    // Declare exchange and queue
    await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
    const queue = await channel.assertQueue(QUEUE_VENDOR_REGISTERED, {
      durable: true,
    });

    // Bind queue to exchange
    await channel.bindQueue(queue.queue, EXCHANGE_NAME, 'vendor.registered');

    console.log('🎧 Listening for vendor.registered events...');

    // Set up consumer
    channel.consume(queue.queue, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          console.log('📥 Received vendor.registered notification:', content);

          // Import here to avoid circular dependency
          const client = await import('../config/redis.js').then(m => m.default);

          // ✅ FIXED: Check if this vendor is already notified (idempotency)
          const vendorIdKey = `vendor:registered:${content.data.vendorId}`;
          const alreadyNotified = await client.get(vendorIdKey);
          
          if (alreadyNotified) {
            console.log('⏭️ Vendor registration notification already processed, skipping:', content.data.vendorId);
            channel.ack(msg);
            return;
          }

          // Mark this vendor as notified
          await client.set(vendorIdKey, '1', { EX: 86400 }); // 24h expiry

          // Store notification in Redis list (RPUSH for new notifications)
          const notificationKey = 'notifications:admin:vendor_registrations';
          const notificationStr = JSON.stringify(content);
          
          // Add to list
          await client.rPush(notificationKey, notificationStr);
          // Set expiration for the entire list (24h)
          await client.expire(notificationKey, 86400);

          // Also store individual notification for quick lookup and deletion
          const individualKey = `notification:${content.data.vendorId}`;
          await client.set(individualKey, notificationStr, { EX: 86400 });

          console.log('✅ Notification stored in Redis list and individual key');
          channel.ack(msg);
        } catch (err) {
          console.error('❌ Error processing vendor notification:', err.message);
          channel.nack(msg, false, true); // Requeue on error
        }
      }
    });
  } catch (err) {
    console.error('❌ Failed to start vendor notification consumer:', err.message);
  }
}

/**
 * Publish delayed order escalation notification into Redis for admins
 * Stores into list `notifications:admin:delayed_orders` and an individual key
 */
export async function publishDelayedOrderNotification(order) {
  try {
    const notificationKey = 'notifications:admin:delayed_orders';
    const message = {
      event: 'order.delayed_escalation',
      timestamp: new Date().toISOString(),
      data: {
        orderId: order._id?.toString() || order.id,
        vendorUsername: order.vendorUsername,
        customerUsername: order.customerUsername,
        status: order.status,
        createdAt: order.createdAt,
        total: order.total || 0,
      },
    };

    const str = JSON.stringify(message);
    await client.rPush(notificationKey, str);
    // set a longer expiry for escalations (7 days)
    await client.expire(notificationKey, 7 * 24 * 60 * 60);

    // individual key for admin list cleanup
    const individualKey = `notification:order:${message.data.orderId}`;
    await client.set(individualKey, str, { EX: 7 * 24 * 60 * 60 });

    // ALSO push a per-vendor notification list
    try {
      if (message.data.vendorUsername) {
        const vendorKey = `notifications:vendor:${message.data.vendorUsername}`;
        await client.rPush(vendorKey, str);
        await client.expire(vendorKey, 7 * 24 * 60 * 60);
        const vkInd = `notification:order:${message.data.orderId}:vendor:${message.data.vendorUsername}`;
        await client.set(vkInd, str, { EX: 7 * 24 * 60 * 60 });
      }
    } catch (e) {
      console.warn('⚠️ Failed to push vendor notification:', e.message);
    }

    // ALSO push a per-customer notification list
    try {
      if (message.data.customerUsername) {
        const customerKey = `notifications:customer:${message.data.customerUsername}`;
        await client.rPush(customerKey, str);
        await client.expire(customerKey, 7 * 24 * 60 * 60);
        const ckInd = `notification:order:${message.data.orderId}:customer:${message.data.customerUsername}`;
        await client.set(ckInd, str, { EX: 7 * 24 * 60 * 60 });
      }
    } catch (e) {
      console.warn('⚠️ Failed to push customer notification:', e.message);
    }

    console.log('📣 Published delayed order escalation notification:', message.data.orderId);

    // Broadcast to connected admin SSE clients (existing behavior)
    try {
      broadcastSse({ type: 'order.delayed_escalation', data: message.data });
    } catch (e) {
      // best-effort
    }
    return true;
  } catch (err) {
    console.error('❌ Failed to publish delayed order notification:', err.message);
    return false;
  }
}

/**
 * ✅ NEW: Remove vendor registration notification when vendor is approved/declined
 * This prevents stale notifications
 */
export async function clearVendorRegistrationNotification(vendorId) {
  try {
    const notificationKey = 'notifications:admin:vendor_registrations';
    const individualKey = `notification:${vendorId}`;

    // Remove from individual key
    await client.del(individualKey);

    // Remove from list
    const all = await client.lRange(notificationKey, 0, -1);
    const filtered = (all || []).filter((str) => {
      try {
        const n = JSON.parse(str);
        return n.data?.vendorId !== vendorId;
      } catch (e) {
        return true;
      }
    });

    await client.del(notificationKey);
    if (filtered.length > 0) {
      await client.rPush(notificationKey, ...filtered);
      await client.expire(notificationKey, 86400);
    }

    console.log('🗑️ Cleared vendor registration notification:', vendorId);
  } catch (err) {
    console.error('❌ Failed to clear vendor registration notification:', err.message);
  }
}

/**
 * ✅ NEW: Remove vendor status-changed notification when already acted upon
 * This prevents duplicate notifications when vendor is re-approved or re-activated
 */
export async function clearVendorStatusNotification(vendorUsername) {
  try {
    const vendorKey = `notifications:vendor:${vendorUsername}`;
    
    // Remove all status-changed notifications for this vendor
    const all = await client.lRange(vendorKey, 0, -1);
    const filtered = (all || []).filter((str) => {
      try {
        const n = JSON.parse(str);
        return n.event !== 'vendor.status_changed';
      } catch (e) {
        return true;
      }
    });

    await client.del(vendorKey);
    if (filtered.length > 0) {
      await client.rPush(vendorKey, ...filtered);
      await client.expire(vendorKey, 7 * 24 * 60 * 60);
    }

    console.log('🗑️ Cleared vendor status notification for:', vendorUsername);
  } catch (err) {
    console.error('❌ Failed to clear vendor status notification:', err.message);
  }
}

/**
 * ✅ NEW: Clear ALL notifications for a specific order across all roles and lists
 * This is called when order status is updated to ensure no stale notifications remain
 */
export async function clearOrderNotifications(orderId) {
  try {
    console.log('🧹 Clearing all notifications for order:', orderId);
    
    // Remove from individual key
    await client.del(`notification:order:${orderId}`);
    
    // Clear from delayed orders admin list
    try {
      const adminKey = 'notifications:admin:delayed_orders';
      const adminNotifs = await client.lRange(adminKey, 0, -1);
      const filteredAdmin = (adminNotifs || []).filter((str) => {
        try {
          const n = JSON.parse(str);
          return n.data?.orderId !== orderId;
        } catch (e) {
          return true;
        }
      });
      if (filteredAdmin.length !== (adminNotifs || []).length) {
        await client.del(adminKey);
        if (filteredAdmin.length > 0) {
          await client.rPush(adminKey, ...filteredAdmin);
          await client.expire(adminKey, 7 * 24 * 60 * 60);
        }
      }
    } catch (e) {
      console.warn('⚠️ Failed to clear admin delayed orders notification:', e.message);
    }
    
    // Find and clear vendor notifications for this order
    try {
      const vendorKeys = await client.keys(`notifications:vendor:*`);
      for (const vendorKey of vendorKeys || []) {
        const vendorNotifs = await client.lRange(vendorKey, 0, -1);
        const filteredVendor = (vendorNotifs || []).filter((str) => {
          try {
            const n = JSON.parse(str);
            return n.data?.orderId !== orderId;
          } catch (e) {
            return true;
          }
        });
        if (filteredVendor.length !== (vendorNotifs || []).length) {
          await client.del(vendorKey);
          if (filteredVendor.length > 0) {
            await client.rPush(vendorKey, ...filteredVendor);
            await client.expire(vendorKey, 7 * 24 * 60 * 60);
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Failed to clear vendor notifications:', e.message);
    }
    
    // Find and clear customer notifications for this order
    try {
      const customerKeys = await client.keys(`notifications:customer:*`);
      for (const customerKey of customerKeys || []) {
        const customerNotifs = await client.lRange(customerKey, 0, -1);
        const filteredCustomer = (customerNotifs || []).filter((str) => {
          try {
            const n = JSON.parse(str);
            return n.data?.orderId !== orderId;
          } catch (e) {
            return true;
          }
        });
        if (filteredCustomer.length !== (customerNotifs || []).length) {
          await client.del(customerKey);
          if (filteredCustomer.length > 0) {
            await client.rPush(customerKey, ...filteredCustomer);
            await client.expire(customerKey, 7 * 24 * 60 * 60);
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Failed to clear customer notifications:', e.message);
    }
    
    console.log('✅ All notifications cleared for order:', orderId);
  } catch (err) {
    console.error('❌ Failed to clear order notifications:', err.message);
  }
}

export default { 
  publishVendorRegistered, 
  startVendorNotificationConsumer, 
  addSseClient, 
  removeSseClient, 
  broadcastSse,
  clearVendorRegistrationNotification,
  clearVendorStatusNotification,
  clearOrderNotifications
};
