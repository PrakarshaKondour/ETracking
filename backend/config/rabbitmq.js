import amqp from 'amqplib';

let connection = null;
let channel = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

export async function connectRabbitMQ() {
  try {
    if (!connection) {
      connection = await amqp.connect(RABBITMQ_URL);
      console.log('✅ RabbitMQ connected:', RABBITMQ_URL);

      connection.on('error', (err) => {
        console.error('❌ RabbitMQ connection error:', err);
        connection = null;
        channel = null;
      });

      connection.on('close', () => {
        console.log('⚠️ RabbitMQ connection closed');
        connection = null;
        channel = null;
      });
    }

    if (!channel) {
      channel = await connection.createChannel();
      console.log('✅ RabbitMQ channel created');
    }

    return channel;
  } catch (err) {
    console.error('❌ RabbitMQ connection failed:', err.message);
    throw err;
  }
}

export async function getChannel() {
  if (!channel) {
    return await connectRabbitMQ();
  }
  return channel;
}

export async function closeRabbitMQ() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('✅ RabbitMQ connection closed');
  } catch (err) {
    console.error('❌ Error closing RabbitMQ:', err.message);
  }
}

export default { connectRabbitMQ, getChannel, closeRabbitMQ };
