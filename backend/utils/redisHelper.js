import client from '../config/redis.js';

/**
 * Store a value in Redis with optional TTL (in seconds).
 * Returns true on success, false on failure.
 */
export async function setValue(key, value, ttlInSeconds) {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlInSeconds && Number.isFinite(ttlInSeconds)) {
      await client.set(key, stringValue, { EX: ttlInSeconds });
    } else {
      await client.set(key, stringValue);
    }
    return true;
  } catch (err) {
    console.error('redisHelper.setValue error:', err);
    return false;
  }
}

/**
 * Get a value from Redis. If the value is JSON, returns the parsed object.
 * Returns null if not found or on error.
 */
export async function getValue(key) {
  try {
    const val = await client.get(key);
    if (val === null) return null;
    try {
      return JSON.parse(val);
    } catch (e) {
      return val;
    }
  } catch (err) {
    console.error('redisHelper.getValue error:', err);
    return null;
  }
}

/**
 * Delete a key from Redis. Returns true if the key was deleted, false otherwise or on error.
 */
export async function deleteValue(key) {
  try {
    const result = await client.del(key);
    return result > 0;
  } catch (err) {
    console.error('redisHelper.deleteValue error:', err);
    return false;
  }
}
