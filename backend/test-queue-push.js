import { pushTask } from './queues/queueProducer.js';

(async () => {
  try {
    const ok = await pushTask('myQueue', { id: Date.now(), text: 'hello world' });
    console.log('pushTask returned:', ok);
  } catch (err) {
    console.error('Queue push test error:', err);
  } finally {
    process.exit(0);
  }
})();
