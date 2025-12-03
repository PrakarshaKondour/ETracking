import { getChannel } from '../config/rabbitmq.js';

const EXCHANGE_NAME = 'etracking_events';
const QUEUE_VENDOR_REGISTERED = 'vendor.registered';

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

export default { publishVendorRegistered, startVendorNotificationConsumer };
