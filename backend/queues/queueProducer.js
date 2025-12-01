import client from '../config/redis.js';

/**
 * Push a task to a Redis list (queue) using RPUSH.
 * @param {string} queueName - Redis list key
 * @param {any} payload - JSON-serializable payload
 */
export async function pushTask(queueName, payload) {
  try {
    const item = JSON.stringify(payload);
    await client.rPush(queueName, item);
    return true;
  } catch (err) {
    console.error('queueProducer.pushTask error:', err);
    return false;
  }
}

export default { pushTask };
