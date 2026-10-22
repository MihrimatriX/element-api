import { inTransaction } from "../db/pool.js";
import { isSagaStillExpired, lockOrder, saveOrder } from "../db/orders.js";
import { tryMarkMessageProcessed } from "../db/outbox.js";
import type { SagaEventDetails } from "../domain/order.js";

/** A saga event from the broker after parsing: its type, de-duplication id, order and optional details. */
export interface SagaEvent extends SagaEventDetails {
  type: string;
  messageId: string;
  orderId: string;
}

/**
 * Use case: apply one saga event to its order, as one transaction. Locks the order, records the message id
 * (a redelivery stops here), lets the Order decide, then stores its new state and outgoing events.
 * An event for an unknown order is ignored. Wallet owns the actual debit and holdings; the order only requests them.
 */
export async function applySagaEvent(event: SagaEvent): Promise<void> {
  await inTransaction(async (client) => {
    const order = await lockOrder(client, event.orderId);
    if (!order) return;
    const isFirstDelivery = await tryMarkMessageProcessed(
      client,
      event.messageId,
      event.type,
      order.facts.id,
    );
    if (!isFirstDelivery) return;

    order.apply(event.type, event);
    await saveOrder(client, order);
  });
}

/**
 * Use case: fail a saga that stayed in `state` past its deadline, as one transaction. Locks the order and
 * re-checks the deadline first, so a saga event that moved the order on in the meantime wins.
 * Returns whether the order was failed.
 */
export async function expireSaga(
  orderId: string,
  state: string,
): Promise<boolean> {
  return inTransaction(async (client) => {
    const order = await lockOrder(client, orderId);
    const isExpired =
      order && (await isSagaStillExpired(client, orderId, state));
    if (!order || !isExpired || !order.expire()) return false;
    await saveOrder(client, order);
    return true;
  });
}
