import Order from '../models/Order.js';
import { getValue, setValue } from '../utils/redisHelper.js';

/**
 * Get order by ID with Redis caching.
 * - Checks Redis key `order:<orderId>` before DB.
 * - If not cached, fetches from MongoDB, caches for 60s, and returns result.
 */
export async function getOrder(req, res) {
  const orderId = req.params.id;
  if (!orderId) return res.status(400).json({ message: 'Order ID required' });

  const cacheKey = `order:${orderId}`;

  try {
    // 1) Check cache
    const cached = await getValue(cacheKey);
    if (cached) {
      return res.json({ source: 'cache', data: cached });
    }

    // 2) Not cached — fetch from DB
    const order = await Order.findById(orderId).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // 3) Store in cache for 60 seconds
    await setValue(cacheKey, order, 60);

    return res.json({ source: 'db', data: order });
  } catch (err) {
    console.error('getOrder error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default { getOrder };
