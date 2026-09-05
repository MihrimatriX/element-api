import amqp from 'amqplib';
import { config } from '../config.js';
import { exchangeName, MessageType, wrapEnvelope, wrapHeaders } from './massTransit.js';

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

let connection: AmqpConnection;
let channel: amqp.ConfirmChannel;
let connected = false;

const sagaEventTypes: MessageType[] = [
  'StockReservedEvent',
  'StockReservationFailedEvent',
  'PaymentProcessedEvent',
  'PaymentFailedEvent',
  'ShipmentDispatchedEvent',
  'ShipmentFailedEvent',
];

export async function connectMessaging(): Promise<amqp.ConfirmChannel> {
  const url = `amqp://${encodeURIComponent(config.rabbitUser)}:${encodeURIComponent(config.rabbitPass)}@${config.rabbitHost}:${config.rabbitPort}`;
  connection = await amqp.connect(url);
  connection.on('error', () => { connected = false; console.error('RabbitMQ connection failed.'); });
  connection.on('close', () => { connected = false; process.exit(1); });
  channel = await connection.createConfirmChannel();
  channel.on('error', () => { connected = false; console.error('RabbitMQ channel failed.'); });
  channel.on('close', () => { connected = false; process.exit(1); });
  await channel.prefetch(16);

  await channel.assertQueue(config.paymentQueue, { durable: true });
  await channel.assertQueue(config.sagaQueue, { durable: true });
  await channel.assertQueue(`${config.sagaQueue}_failed`, { durable: true });

  for (const type of sagaEventTypes) {
    const ex = exchangeName(type);
    await channel.assertExchange(ex, 'fanout', { durable: true });
    await channel.bindQueue(config.sagaQueue, ex, '');
  }

  connected = true;
  return channel;
}

export function getChannel(): amqp.ConfirmChannel {
  if (!connected) throw new Error('RabbitMQ not connected');
  return channel;
}

export async function publishEvent(type: MessageType, message: object): Promise<void> {
  const ex = exchangeName(type);
  await channel.assertExchange(ex, 'fanout', { durable: true });
  channel.publish(ex, '', wrapEnvelope(type, message), {
    headers: wrapHeaders(type),
    contentType: 'application/vnd.masstransit+json',
  });
}

export async function sendPaymentCommand(
  orderId: string,
  amount: number,
  customerId: string
): Promise<void> {
  const type: MessageType = 'ProcessPaymentCommand';
  channel.sendToQueue(
    config.paymentQueue,
    wrapEnvelope(type, { orderId, amount, customerId }),
    {
      headers: wrapHeaders(type),
      contentType: 'application/vnd.masstransit+json',
      persistent: true,
    }
  );
}
