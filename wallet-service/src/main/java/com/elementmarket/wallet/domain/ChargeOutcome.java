package com.elementmarket.wallet.domain;

/** Result of charging an order to a wallet; the messaging layer maps it to PaymentProcessed or PaymentFailed. */
public enum ChargeOutcome {
    CHARGED,
    /** The order was charged by an earlier delivery, so the saga can move on. */
    ALREADY_CHARGED,
    INSUFFICIENT_FUNDS,
    /** Zero, negative or above the per-purchase credit limit. */
    OVER_LIMIT,
    /** The order already has a refund (or refund tombstone): a late or replayed charge is refused. */
    ORDER_CANCELLED
}
