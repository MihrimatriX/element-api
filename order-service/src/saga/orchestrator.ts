import { v5 as uuidv5 } from "uuid";
import { applySagaEvent, type SagaEvent } from "../application/orderSaga.js";
import { parseEnvelope } from "../messaging/massTransit.js";
import { isUuid } from "../http.js";

/** Reads the order id from camelCase or PascalCase payloads; anything that is not a UUID is ignored. */
function orderIdOf(message: Record<string, unknown>): string | undefined {
  const orderId = (message.orderId ?? message.OrderId) as string | undefined;
  return isUuid(orderId) ? orderId : undefined;
}

function reasonOf(message: Record<string, unknown>): string | undefined {
  return (
    (message.reason as string | undefined) ??
    (message.Reason as string | undefined)
  );
}

function trackingNumberOf(
  message: Record<string, unknown>,
): string | undefined {
  const trackingNumber = message.trackingNumber || message.TrackingNumber;
  return trackingNumber as string | undefined;
}

/**
 * Turns a broker message into a SagaEvent, or null when it is unusable (invalid JSON, no type, no order id).
 * Unusable messages are acknowledged and dropped by the caller.
 */
function parseSagaEvent(body: Buffer): SagaEvent | null {
  try {
    const envelope = parseEnvelope(body);
    const message = envelope.message as Record<string, unknown>;
    const orderId = orderIdOf(message);
    if (!envelope.type || !orderId) return null;

    // Without a MassTransit messageId, derive a stable one so a redelivered event is still de-duplicated.
    const messageId = isUuid(envelope.messageId)
      ? envelope.messageId
      : uuidv5(`${envelope.type}:${orderId}`, uuidv5.URL);
    return {
      type: envelope.type,
      messageId,
      orderId,
      reason: reasonOf(message),
      trackingNumber: trackingNumberOf(message),
    };
  } catch {
    return null;
  }
}

/**
 * Handles one saga event from RabbitMQ: parses it and hands it to the applySagaEvent use case,
 * where the Order aggregate decides. Submitted → StockReserved → Shipping → Completed, or → Failed with compensation.
 */
export async function handleSagaMessage(body: Buffer): Promise<void> {
  const event = parseSagaEvent(body);
  if (event) await applySagaEvent(event);
}
