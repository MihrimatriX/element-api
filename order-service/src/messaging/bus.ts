import amqp from 'amqplib';
import { config } from '../config.js';
import { exchangeName, MessageType, wrapEnvelope, wrapHeaders } from './massTransit.js';

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

let connection: AmqpConnection;
let channel: amqp.Channel;

const sagaEventTypes: MessageType[] = [
  'StockReservedEvent',
  'StockReservationFailedEvent',
  'PaymentProcessedEvent',
  'PaymentFailedEvent',
  'ShipmentDispatchedEvent',
  'ShipmentFailedEvent',
];

export async function connectMessaging(): Promise<amqp.Channel> {
  const url = `amqp://${config.rabbitUser}:${config.rabbitPass}@${config.rabbitHost}:${config.rabbitPort}`;
  connection = await amqp.connect(url);
  channel = await connection.createChannel();

  await channel.assertQueue(config.paymentQueue, { durable: true });
  await channel.assertQueue(config.sagaQueue, { durable: true });

  for (const type of sagaEventTypes) {
    const ex = exchangeName(type);
    await channel.assertExchange(ex, 'fanout', { durable: true });
    await channel.bindQueue(config.sagaQueue, ex, '');
  }

  return channel;
}

export function getChannel(): amqp.Channel {
  if (!channel) throw new Error('RabbitMQ not connected');
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

export async function sendPaymentCommand(orderId: string, amount: number): Promise<void> {
  const type: MessageType = 'ProcessPaymentCommand';
  channel.sendToQueue(
    config.paymentQueue,
    wrapEnvelope(type, { orderId, amount }),
    {
      headers: wrapHeaders(type),
      contentType: 'application/vnd.masstransit+json',
      persistent: true,
    }
  );
}
