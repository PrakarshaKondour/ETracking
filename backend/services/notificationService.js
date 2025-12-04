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

    const individualKey = `notification:order:${message.data.orderId}`;
    await client.set(individualKey, str, { EX: 7 * 24 * 60 * 60 });

    console.log('📣 Published delayed order escalation notification:', message.data.orderId);
    // Broadcast to connected admin SSE clients
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

export default { publishVendorRegistered, startVendorNotificationConsumer, addSseClient, removeSseClient, broadcastSse };
