import amqp from "amqplib";
import { config } from "../config.js";
import { logger } from "../observability.js";
import { exchangeName, MessageType } from "./massTransit.js";

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

let connection: AmqpConnection;
let channel: amqp.ConfirmChannel;
let connected = false;
let closing = false;

const sagaEventTypes: MessageType[] = [
  "StockReservedEvent",
  "StockReservationFailedEvent",
  "PaymentProcessedEvent",
  "PaymentFailedEvent",
  "ShipmentDispatchedEvent",
  "ShipmentFailedEvent",
];

export async function connectMessaging(): Promise<amqp.ConfirmChannel> {
  const url = `amqp://${encodeURIComponent(config.rabbitUser)}:${encodeURIComponent(config.rabbitPass)}@${config.rabbitHost}:${config.rabbitPort}`;
  connection = await amqp.connect(url);
  // No in-process reconnect: a lost connection/channel exits so Docker restarts us cleanly.
  const onClose = (err?: Error) => {
    connected = false;
    if (closing) return;
    logger.fatal({ err }, "RabbitMQ connection closed; exiting for restart");
    process.exit(1);
  };
  connection.on("error", () => {
    connected = false;
    console.error("RabbitMQ connection failed.");
  });
  connection.on("close", onClose);
  channel = await connection.createConfirmChannel();
  channel.on("error", () => {
    connected = false;
    console.error("RabbitMQ channel failed.");
  });
  channel.on("close", onClose);
  await channel.prefetch(16);

  await channel.assertQueue(config.sagaQueue, { durable: true });
  await channel.assertQueue(`${config.sagaQueue}_failed`, { durable: true });

  for (const type of sagaEventTypes) {
    const ex = exchangeName(type);
    await channel.assertExchange(ex, "fanout", { durable: true });
    await channel.bindQueue(config.sagaQueue, ex, "");
  }

  connected = true;
  return channel;
}

export function getChannel(): amqp.ConfirmChannel {
  if (!connected) throw new Error("RabbitMQ not connected");
  return channel;
}

/** Deliberate close (shutdown): the close handlers must not treat it as a failure. */
export async function closeMessaging(): Promise<void> {
  closing = true;
  await connection.close();
}

