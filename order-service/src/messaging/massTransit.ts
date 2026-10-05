import { randomUUID } from "node:crypto";

/** .NET namespace of the shared event records (shared-lib/Events); MassTransit derives exchange names from it. */
const EVENT_NAMESPACE = "Element.Shared.Events:";

/** Content type MassTransit expects on every message. */
export const MASSTRANSIT_CONTENT_TYPE = "application/vnd.masstransit+json";

/** Every integration event this service publishes or consumes (names match shared-lib/Events). */
export type MessageType =
  | "OrderSubmittedEvent"
  | "StockReservedEvent"
  | "StockReservationFailedEvent"
  | "PaymentRequestedEvent"
  | "PaymentProcessedEvent"
  | "PaymentFailedEvent"
  | "PaymentRefundRequestedEvent"
  | "AssetsCreditedEvent"
  | "ShipmentRequestedEvent"
  | "ShipmentDispatchedEvent"
  | "ShipmentFailedEvent"
  | "UpdateOrderStatusEvent"
  | "OrderStockReleaseEvent"
  | "OrderCompletedEvent";

/** Fanout exchange MassTransit uses for an event type, e.g. "Element.Shared.Events:OrderSubmittedEvent". */
export function exchangeName(type: MessageType): string {
  return `${EVENT_NAMESPACE}${type}`;
}

function messageUrn(type: MessageType): string {
  return `urn:message:${EVENT_NAMESPACE}${type}`;
}

/**
 * Serialises a payload into the MassTransit JSON envelope so the .NET services can consume it.
 * The given messageId (the outbox row id) lets consumers recognise redeliveries.
 */
export function wrapEnvelope<T extends object>(
  type: MessageType,
  message: T,
  messageId: string,
): Buffer {
  const envelope = {
    messageId,
    conversationId: randomUUID(),
    messageType: [messageUrn(type)],
    message,
  };
  return Buffer.from(JSON.stringify(envelope));
}

/**
 * Reads a MassTransit JSON envelope. `type` is the short event name (last URN segment);
 * `message` falls back to the whole body for plain JSON. Throws on invalid JSON.
 */
export function parseEnvelope(body: Buffer): {
  messageId?: string;
  type?: string;
  message: unknown;
} {
  const envelope = JSON.parse(body.toString("utf8"));
  const messageUrnValue = envelope.messageType?.[0] as string | undefined;
  return {
    messageId: envelope.messageId as string | undefined,
    type: messageUrnValue?.split(":").pop(),
    message: envelope.message ?? envelope,
  };
}

/** AMQP headers MassTransit uses to route a message to the right consumer type. */
export function wrapHeaders(type: MessageType): Record<string, string> {
  return {
    "MT-Message-Type": messageUrn(type),
    "Content-Type": MASSTRANSIT_CONTENT_TYPE,
  };
}
