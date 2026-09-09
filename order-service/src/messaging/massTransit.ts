import { randomUUID } from 'node:crypto';

const NS = 'Element.Shared.Events:';

export type MessageType =
  | 'OrderSubmittedEvent'
  | 'StockReservedEvent'
  | 'StockReservationFailedEvent'
  | 'ProcessPaymentCommand'
  | 'PaymentProcessedEvent'
  | 'PaymentFailedEvent'
  | 'ShipmentRequestedEvent'
  | 'ShipmentDispatchedEvent'
  | 'ShipmentFailedEvent'
  | 'UpdateOrderStatusEvent'
  | 'OrderStockReleaseEvent'
  | 'OrderCompletedEvent'
  | 'ElementSoldEvent';

export function exchangeName(type: MessageType): string {
  return `${NS}${type}`;
}

export function messageUrn(type: MessageType): string {
  return `urn:message:${NS}${type}`;
}

export function wrapEnvelope<T extends object>(type: MessageType, message: T, messageId?: string): Buffer {
  const body = {
    messageId: messageId ?? randomUUID(),
    conversationId: randomUUID(),
    messageType: [messageUrn(type)],
    message,
  };
  return Buffer.from(JSON.stringify(body));
}

export function parseEnvelope(body: Buffer): { messageId?: string; type?: string; message: unknown } {
  const json = JSON.parse(body.toString('utf8'));
  const mt = json.messageType?.[0] as string | undefined;
  const type = mt?.split(':').pop();
  return {
    messageId: json.messageId as string | undefined,
    type,
    message: json.message ?? json,
  };
}

export function wrapHeaders(type: MessageType): Record<string, string> {
  return {
    'MT-Message-Type': messageUrn(type),
    'Content-Type': 'application/vnd.masstransit+json',
  };
}

export function parseMessage<T>(body: Buffer): T {
  const json = JSON.parse(body.toString('utf8'));
  return (json.message ?? json) as T;
}

export function parseMessageId(body: Buffer): string | undefined {
  try {
    const json = JSON.parse(body.toString('utf8'));
    return json.messageId as string | undefined;
  } catch {
    return undefined;
  }
}
