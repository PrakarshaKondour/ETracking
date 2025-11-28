import client from '../config/redis.js';

/**
 * Rate limiting middleware factory.
 * Usage: app.use(rateLimit(100, 60)) // 100 requests per 60 seconds
 */
export function rateLimit(maxRequests, windowSeconds) {
  return async function (req, res, next) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const key = `rate:${ip}`;

      // Increment the counter
      const count = await client.incr(key);

      // If this is the first increment, set the expiry
      if (count === 1) {
        await client.expire(key, windowSeconds);
      }

      if (count > maxRequests) {
        return res.status(429).json({ message: 'Too many requests' });
      }

      return next();
    } catch (err) {
      console.error('rateLimit middleware error:', err);
      // Fail open: allow request if Redis has issues
      return next();
    }
  };
}

export default rateLimit;
