import { ELEMENTAL_SLUG } from "../compoundPrice.js";
import { paymentDecision } from "./paymentDecision.js";
import {
  sagaAccepts,
  sagaCanTimeOut,
  sagaNextStatus,
} from "./sagaTransitions.js";

const CREDIT_LIMIT_REASON = "Credit limit exceeded (50000 KREDI limit).";
const PAYMENT_FAILED_REASON = "Payment failed";

/** Integration events an order records (names match shared-lib/Events). */
export type OrderEventType =
  | "OrderSubmittedEvent"
  | "UpdateOrderStatusEvent"
  | "PaymentRequestedEvent"
  | "ShipmentRequestedEvent"
  | "AssetsCreditedEvent"
  | "OrderCompletedEvent"
  | "OrderStockReleaseEvent"
  | "PaymentRefundRequestedEvent";

/** An outgoing event decided by the order; the caller writes it to the outbox in the same transaction. */
export interface OrderEvent {
  type: OrderEventType;
  payload: Record<string, unknown>;
}

/** What the order is about. Fixed once placed; quantity (grams) and totalPrice (KREDI) have 4 decimals. */
export interface OrderFacts {
  id: string;
  customerId: string;
  elementSymbol: string;
  quantity: number;
  totalPrice: number;
  compoundSlug: string | null;
  compoundFormula: string | null;
  productLabel: string | null;
}

/** Optional details a saga event carries. */
export interface SagaEventDetails {
  reason?: string;
  trackingNumber?: string;
}

/** An order that breaks a placement rule. The HTTP layer checks first, so reaching this is a bug. */
export class InvalidOrderError extends Error {}

/** A priced total may be ordered when it is above zero and within the credit limit. */
export function isOrderTotalAllowed(total: number): boolean {
  return total > 0 && paymentDecision(total) === "ok";
}

/**
 * Aggregate root of the order context: one order's saga status and the rules for moving it.
 * The status only changes through place/apply/expire, which follow the matrix in sagaTransitions.ts,
 * so "allowed transitions only, terminal states final, compensation only with the one Failed transition"
 * are checked in one place. Each decision appends its outgoing events to `events`; the application layer
 * loads the order under a row lock and stores the new state and those events in one transaction.
 */
export class Order {
  /** Events decided since the order was placed or loaded, in publish order. */
  readonly events: OrderEvent[] = [];
  #status: string;
  #trackingNumber: string | null;
  #failureReason: string | null = null;
  #statusChanged = false;

  private constructor(
    readonly facts: Readonly<OrderFacts>,
    status: string,
    trackingNumber: string | null,
  ) {
    this.#status = status;
    this.#trackingNumber = trackingNumber;
  }

  /** A new order in Submitted; refuses a non-positive quantity or a total outside isOrderTotalAllowed. */
  static place(facts: OrderFacts): Order {
    const isQuantityValid = Number.isFinite(facts.quantity) && facts.quantity > 0;
    if (!isQuantityValid || !isOrderTotalAllowed(facts.totalPrice)) {
      throw new InvalidOrderError(`Order ${facts.id}: invalid quantity or total.`);
    }
    const order = new Order(facts, "Submitted", null);
    order.#record("UpdateOrderStatusEvent", {
      orderId: facts.id,
      customerId: facts.customerId,
      status: "Submitted",
      errorMessage: null,
    });
    order.#record("OrderSubmittedEvent", {
      orderId: facts.id,
      customerId: facts.customerId,
      elementSymbol: facts.elementSymbol,
      quantity: facts.quantity,
      totalPrice: facts.totalPrice,
    });
    return order;
  }

  /** An order loaded from storage. Not re-validated, so a legacy row can still finish its saga. */
  static restore(
    facts: OrderFacts,
    status: string,
    trackingNumber: string | null,
  ): Order {
    return new Order(facts, status, trackingNumber);
  }

  get status(): string {
    return this.#status;
  }

  get trackingNumber(): string | null {
    return this.#trackingNumber;
  }

  /** Why the order failed in this unit of work; null when it did not fail here. */
  get failureReason(): string | null {
    return this.#failureReason;
  }

  /** True when a decision moved the order to another status, so its state must be saved. */
  get statusChanged(): boolean {
    return this.#statusChanged;
  }

  /**
   * Applies a saga event. An event that does not fit the current status (late, duplicate or out of order)
   * changes nothing; on a Failed order a late reservation or debit only gets its own compensation.
   */
  apply(eventType: string, details: SagaEventDetails = {}): void {
    if (!sagaAccepts(this.#status, eventType)) return;
    switch (sagaNextStatus(this.#status, eventType)) {
      case null:
        if (eventType === "StockReservedEvent") this.#releaseStock();
        else this.#refundPayment();
        return;
      case "StockReserved":
        return this.#requestPayment();
      case "Shipping":
        return this.#requestShipment();
      case "Completed":
        return this.#complete(details.trackingNumber);
      case "Failed": {
        const isPaymentFailure = eventType === "PaymentFailedEvent";
        const fallback = isPaymentFailure ? PAYMENT_FAILED_REASON : null;
        return this.#fail(details.reason ?? fallback);
      }
    }
  }

  /** The saga missed its state deadline: fail and compensate. Returns false for a finished order. */
  expire(): boolean {
    if (!sagaCanTimeOut(this.#status)) return false;
    // Unlike other status events, the timeout one has never carried a trackingNumber field.
    this.#fail(`Saga timed out in state ${this.#status}`, {});
    return true;
  }

  /** Stock is held: ask wallet to charge the customer, or fail when the total is over the credit limit. */
  #requestPayment(): void {
    this.#moveTo("StockReserved");
    if (paymentDecision(this.facts.totalPrice) === "limit") {
      this.#fail(CREDIT_LIMIT_REASON);
      return;
    }
    this.#record("PaymentRequestedEvent", {
      orderId: this.facts.id,
      customerId: this.facts.customerId,
      amount: this.facts.totalPrice,
      elementSymbol: this.facts.elementSymbol,
      quantity: this.facts.quantity,
    });
  }

  #requestShipment(): void {
    this.#moveTo("Shipping");
    this.#record("ShipmentRequestedEvent", {
      orderId: this.facts.id,
      customerId: this.facts.customerId,
      elementSymbol: this.facts.elementSymbol,
      quantity: this.facts.quantity,
    });
  }

  /** Shipment dispatched: keep the tracking number and tell wallet and inventory to finalise the order. */
  #complete(trackingNumber: string | undefined): void {
    if (trackingNumber) this.#trackingNumber = trackingNumber;
    this.#moveTo("Completed", null, { trackingNumber: trackingNumber ?? null });
    this.#record("AssetsCreditedEvent", {
      orderId: this.facts.id,
      customerId: this.facts.customerId,
      elementSymbol: this.facts.elementSymbol,
      quantity: this.facts.quantity,
      totalPrice: this.facts.totalPrice,
      compoundSlug: this.facts.compoundSlug ?? ELEMENTAL_SLUG,
      productLabel: this.facts.productLabel,
    });
    this.#record("OrderCompletedEvent", {
      orderId: this.facts.id,
      elementSymbol: this.facts.elementSymbol,
      quantity: this.facts.quantity,
    });
  }

  /** The one way into Failed: release the reserved stock and refund any payment. */
  #fail(reason: string | null, statusDetails?: object): void {
    this.#moveTo("Failed", reason, statusDetails);
    this.#releaseStock();
    this.#refundPayment();
  }

  /** Changes the status and records the UpdateOrderStatusEvent that notification-service shows the customer. */
  #moveTo(
    status: string,
    reason: string | null = null,
    statusDetails: object = { trackingNumber: null },
  ): void {
    this.#status = status;
    this.#failureReason = reason;
    this.#statusChanged = true;
    this.#record("UpdateOrderStatusEvent", {
      orderId: this.facts.id,
      customerId: this.facts.customerId,
      status,
      errorMessage: reason,
      ...statusDetails,
    });
  }

  /** Compensation: inventory frees the order's reserved grams. */
  #releaseStock(): void {
    this.#record("OrderStockReleaseEvent", {
      orderId: this.facts.id,
      elementSymbol: this.facts.elementSymbol,
      quantity: this.facts.quantity,
    });
  }

  /** Compensation: wallet returns any credits charged (idempotent per order on wallet's side). */
  #refundPayment(): void {
    this.#record("PaymentRefundRequestedEvent", {
      orderId: this.facts.id,
      customerId: this.facts.customerId,
      elementSymbol: this.facts.elementSymbol,
      quantity: this.facts.quantity,
    });
  }

  #record(type: OrderEventType, payload: Record<string, unknown>): void {
    this.events.push({ type, payload });
  }
}
