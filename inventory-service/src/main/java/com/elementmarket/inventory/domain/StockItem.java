package com.elementmarket.inventory.domain;

/**
 * Aggregate root of the inventory context: the grams of one symbol on the shelf and the part held for orders.
 * Stock and reserved grams only change through these methods, so "never oversold, reserved never above stock,
 * a reservation released or fulfilled at most once" are checked in one place. The repository loads it under a
 * row lock, which makes each decision safe against concurrent deliveries.
 */
public final class StockItem {

    private final String symbol;
    private Grams stock;
    private Grams reserved;

    public StockItem(String symbol, Grams stock, Grams reserved) {
        if (reserved.compareTo(stock) > 0) {
            throw new IllegalArgumentException(symbol + " has more reserved than in stock");
        }
        this.symbol = symbol;
        this.stock = stock;
        this.reserved = reserved;
    }

    public Grams available() {
        return stock.minus(reserved);
    }

    /** Holds the grams for an order when they fit in what is available; otherwise changes nothing. */
    public ReserveOutcome reserve(Grams quantity) {
        if (quantity.isZero()) {
            throw new IllegalArgumentException("cannot reserve zero grams");
        }
        if (available().compareTo(quantity) < 0) {
            return ReserveOutcome.INSUFFICIENT_STOCK;
        }
        reserved = reserved.plus(quantity);
        return ReserveOutcome.RESERVED;
    }

    /** Cancelled or failed order: gives back what the reservation holds (not what the event claims). */
    public void release(Reservation reservation) {
        close(reservation, Reservation.Status.RELEASED);
        reserved = reserved.minus(reservation.quantity());
    }

    /** Completed order: the reserved grams leave the shelf for good. */
    public void fulfill(Reservation reservation) {
        close(reservation, Reservation.Status.FULFILLED);
        reserved = reserved.minus(reservation.quantity());
        stock = stock.minus(reservation.quantity());
    }

    /** Grams sold back at the desk return to the shelf. */
    public void restock(Grams grams) {
        stock = stock.plus(grams);
    }

    private void close(Reservation reservation, Reservation.Status closedAs) {
        if (!symbol.equals(reservation.symbol())) {
            throw new IllegalArgumentException("reservation for " + reservation.symbol() + " cannot move " + symbol);
        }
        reservation.close(closedAs);
    }

    public String symbol() {
        return symbol;
    }

    public Grams stock() {
        return stock;
    }

    public Grams reserved() {
        return reserved;
    }
}
