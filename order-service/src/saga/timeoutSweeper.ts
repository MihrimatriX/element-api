import { expireSaga } from "../application/orderSaga.js";
import { findExpiredSagas } from "../db/orders.js";
import { config } from "../config.js";

/**
 * Fails every saga whose state deadline has passed (the Order queues stock release + refund).
 * Returns how many expired sagas were found (not how many were actually failed).
 */
export async function sweepExpiredSagas(): Promise<number> {
  const expired = await findExpiredSagas();
  for (const saga of expired) {
    await failExpiredSaga(saga.orderId, saga.state);
  }
  return expired.length;
}

/**
 * Fails one expired saga in its own transaction (expireSaga use case).
 * Errors are logged, not thrown, so one broken order does not stop the sweep.
 */
async function failExpiredSaga(orderId: string, state: string): Promise<void> {
  try {
    if (await expireSaga(orderId, state)) {
      console.warn(`Saga timeout: order ${orderId} failed from ${state}`);
    }
  } catch (err) {
    console.error(`Saga timeout sweep failed for ${orderId}`, err);
  }
}

/** Runs the timeout sweep every SAGA_SWEEP_MS. */
export function startTimeoutSweeper(): NodeJS.Timeout {
  return setInterval(() => {
    sweepExpiredSagas().catch((err) =>
      console.error("Saga timeout sweeper error", err),
    );
  }, config.sagaSweepMs);
}
