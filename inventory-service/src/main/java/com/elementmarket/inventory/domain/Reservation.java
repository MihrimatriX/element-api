package com.elementmarket.inventory.domain;

import java.util.Locale;
import java.util.UUID;

/**
 * The one stock_reservations row of an order: Reserved, then Released or Fulfilled, never back. Closed rows are
 * kept so a late or replayed event finds them; desk sales are stored the same way as Sold rows keyed by the
 * sale id, which makes restocks idempotent. Only {@link StockItem} moves a reservation, together with the grams.
 */
public final class Reservation {

    /** Statuses as stored in the {@code status} column. */
    public enum Status {
        RESERVED, RELEASED, FULFILLED, SOLD;

        public String column() {
            return name().charAt(0) + name().substring(1).toLowerCase(Locale.ROOT);
        }
    }

    private final UUID id;
    private final String symbol;
    private final Grams quantity;
    private Status status;

    public Reservation(UUID id, String symbol, Grams quantity, Status status) {
        this.id = id;
        this.symbol = symbol;
        this.quantity = quantity;
        this.status = status;
    }

    public static Reservation reserved(UUID orderId, String symbol, Grams quantity) {
        return new Reservation(orderId, symbol, quantity, Status.RESERVED);
    }

    /** A release that arrived before its OrderSubmitted: the closed row makes the late submit a no-op. */
    public static Reservation releasedBeforeReserve(UUID orderId, String symbol) {
        return new Reservation(orderId, symbol, Grams.ZERO, Status.RELEASED);
    }

    public static Reservation sale(UUID saleId, String symbol, Grams grams) {
        return new Reservation(saleId, symbol, grams, Status.SOLD);
    }

    /** What a second OrderSubmitted for this id means: confirm a live reservation again, ignore a closed one. */
    public ReserveOutcome resubmitted() {
        return isActive() ? ReserveOutcome.ALREADY_RESERVED : ReserveOutcome.ALREADY_HANDLED;
    }

    public boolean isActive() {
        return status == Status.RESERVED;
    }

    void close(Status closedAs) {
        if (!isActive()) {
            throw new IllegalStateException("reservation " + id + " is already " + status.column());
        }
        status = closedAs;
    }

    public UUID id() {
        return id;
    }

    public String symbol() {
        return symbol;
    }

    public Grams quantity() {
        return quantity;
    }

    public Status status() {
        return status;
    }
}
