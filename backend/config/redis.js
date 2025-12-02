import { createClient } from 'redis';

// Connect to Redis at the local default URL
const REDIS_URL = 'redis://localhost:6379';

const client = createClient({ url: REDIS_URL });

client.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

client.on('connect', () => {
  console.log('Redis client connecting...');
});

// Start connection in background; any import of this module will initiate connection.
client.connect().then(() => {
  console.log('Connected to Redis at', REDIS_URL);
}).catch((err) => {
  console.error('Failed to connect to Redis:', err);
});

export default client;
