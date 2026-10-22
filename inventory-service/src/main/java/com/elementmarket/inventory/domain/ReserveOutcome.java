package com.elementmarket.inventory.domain;

/** Result of an OrderSubmitted; the application layer maps it to StockReserved, StockReservationFailed or nothing. */
public enum ReserveOutcome {
    RESERVED,
    /** An earlier delivery already reserved this order, so the saga can be told again. */
    ALREADY_RESERVED,
    /** The order was released or fulfilled before (or the id is a desk sale): nothing to announce. */
    ALREADY_HANDLED,
    INSUFFICIENT_STOCK,
    /** No symbol, or a zero or negative quantity. */
    INVALID_QUANTITY
}
