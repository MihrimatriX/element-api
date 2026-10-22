import amqp from "amqplib";
import { config } from "../config.js";
import { logger } from "../observability.js";
import { exchangeName, type MessageType } from "./massTransit.js";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

/** Most unacknowledged saga messages RabbitMQ hands this process at once. */
const SAGA_PREFETCH_COUNT = 16;

/** Parking queue for saga messages that still failed after every retry. */
export const FAILED_SAGA_QUEUE = `${config.sagaQueue}_failed`;

/** Events the saga reacts to; each event's fanout exchange is bound to the saga queue. */
const SAGA_EVENT_TYPES: MessageType[] = [
  "StockReservedEvent",
  "StockReservationFailedEvent",
  "PaymentProcessedEvent",
  "PaymentFailedEvent",
  "ShipmentDispatchedEvent",
  "ShipmentFailedEvent",
];

let connection: AmqpConnection;
let channel: amqp.ConfirmChannel;
let connected = false;
/** Set by closeMessaging, so a deliberate shutdown close is not treated as a failure. */
let closing = false;

function onBrokerError(message: string): void {
  connected = false;
  console.error(message);
}

/**
 * A closed connection or channel is not recovered in-process: exit so Docker restarts the service cleanly.
 * Ignored while closeMessaging is shutting the connection down on purpose.
 */
function onBrokerClose(err?: Error): void {
  connected = false;
  if (closing) return;
  logger.fatal({ err }, "RabbitMQ connection closed; exiting for restart");
  process.exit(1);
}

/**
 * Connects to RabbitMQ with a confirm channel, declares the saga queue and its failed queue,
 * and binds the saga queue to every saga event exchange.
 */
export async function connectMessaging(): Promise<amqp.ConfirmChannel> {
  const user = encodeURIComponent(config.rabbitUser);
  const password = encodeURIComponent(config.rabbitPass);
  const url = `amqp://${user}:${password}@${config.rabbitHost}:${config.rabbitPort}`;

  connection = await amqp.connect(url);
  connection.on("error", () => onBrokerError("RabbitMQ connection failed."));
  connection.on("close", onBrokerClose);

  channel = await connection.createConfirmChannel();
  channel.on("error", () => onBrokerError("RabbitMQ channel failed."));
  channel.on("close", onBrokerClose);
  await channel.prefetch(SAGA_PREFETCH_COUNT);

  await channel.assertQueue(config.sagaQueue, { durable: true });
  await channel.assertQueue(FAILED_SAGA_QUEUE, { durable: true });

  for (const type of SAGA_EVENT_TYPES) {
    const exchange = exchangeName(type);
    await channel.assertExchange(exchange, "fanout", { durable: true });
    await channel.bindQueue(config.sagaQueue, exchange, "");
  }

  connected = true;
  return channel;
}

/** Returns the open confirm channel; throws while RabbitMQ is not connected (used by the health check). */
export function getChannel(): amqp.ConfirmChannel {
  if (!connected) throw new Error("RabbitMQ not connected");
  return channel;
}

/** Deliberate close (shutdown): the close handlers must not treat it as a failure. */
export async function closeMessaging(): Promise<void> {
  closing = true;
  await connection.close();
}
