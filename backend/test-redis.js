import client from './config/redis.js';

async function run() {
  try {
    console.log('Pinging Redis...');
    const pong = await client.ping();
    console.log('PING response:', pong);

    console.log('Setting test key...');
    await client.set('test:node', 'hello-from-node', { EX: 60 });
    const val = await client.get('test:node');
    console.log('GET test:node ->', val);

    console.log('Pushing to testQueue...');
    await client.rPush('testQueue', JSON.stringify({ t: Date.now(), msg: 'hello' }));
    const len = await client.lLen('testQueue');
    console.log('testQueue length ->', len);

    // cleanup
    await client.del('test:node');

    console.log('Redis basic checks passed');
  } catch (err) {
    console.error('Redis test error:', err);
  } finally {
    process.exit(0);
  }
}

run();
