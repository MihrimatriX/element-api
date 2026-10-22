package com.elementmarket.inventory.application;

import com.elementmarket.inventory.domain.Grams;
import com.elementmarket.inventory.domain.Reservation;
import com.elementmarket.inventory.domain.ReserveOutcome;
import com.elementmarket.inventory.domain.StockItem;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Inventory use cases. Each public method that changes stock is one ACID transaction: it records the delivery,
 * locks the reservation and then the stock row, lets {@link StockItem} decide, then writes the new state and the
 * outgoing event. They commit together or not at all, so a crash can neither lose a saga reply nor send one
 * for undone work.
 */
public class InventoryService {

    /** Wire reasons the order service shows to the buyer. */
    static final String INVALID_QUANTITY_REASON = "Quantity must be positive.";
    static final String INSUFFICIENT_STOCK_REASON = "Insufficient stock. Available: %sg.";
    /** Symbol recorded for a release that arrives without one and before its reservation. */
    private static final String UNKNOWN_SYMBOL = "?";

    private final StockRepository stock;
    private final Outbox outbox;
    private final TransactionTemplate tx;
    private final Grams defaultStock;

    public InventoryService(StockRepository stock, Outbox outbox, TransactionTemplate tx, Grams defaultStock) {
        this.stock = stock;
        this.outbox = outbox;
        this.tx = tx;
        this.defaultStock = defaultStock;
    }

    /**
     * Reserves stock for a new order once and queues the saga reply (StockReserved or StockReservationFailed).
     * Empty when this delivery was already processed.
     */
    public Optional<ReserveOutcome> reserveForOrder(Delivery delivery, String symbol, BigDecimal quantity) {
        return tx.execute(status -> {
            if (!stock.markDelivered(delivery)) {
                return Optional.<ReserveOutcome>empty();
            }
            UUID orderId = delivery.orderId();
            // Below 0.0001 g rounds to zero, which is as invalid as a negative quantity.
            Grams wanted = quantity.signum() > 0 ? Grams.of(quantity) : Grams.ZERO;
            if (symbol == null || wanted.isZero()) {
                queueReply(orderId, ReserveOutcome.INVALID_QUANTITY, null);
                return Optional.of(ReserveOutcome.INVALID_QUANTITY);
            }
            Optional<Reservation> existing = stock.lockReservation(orderId);
            if (existing.isPresent()) {
                ReserveOutcome repeated = existing.get().resubmitted();
                queueReply(orderId, repeated, null);
                return Optional.of(repeated);
            }

            StockItem item = lockOrCreate(normalize(symbol));
            ReserveOutcome outcome = item.reserve(wanted);
            if (outcome == ReserveOutcome.RESERVED) {
                stock.save(item);
                stock.add(Reservation.reserved(orderId, item.symbol(), wanted));
            }
            queueReply(orderId, outcome, item.available());
            return Optional.of(outcome);
        });
    }

    /**
     * Gives the grams of a cancelled or failed order back once. A release that arrives before its reservation
     * leaves a Released tombstone, so the late OrderSubmitted cannot hold stock forever.
     */
    public void releaseOrder(Delivery delivery, String symbol) {
        tx.executeWithoutResult(status -> {
            if (!stock.markDelivered(delivery)) {
                return;
            }
            Optional<Reservation> existing = stock.lockReservation(delivery.orderId());
            if (existing.isEmpty()) {
                String recorded = symbol == null || symbol.isBlank() ? UNKNOWN_SYMBOL : normalize(symbol);
                stock.add(Reservation.releasedBeforeReserve(delivery.orderId(), recorded));
                return;
            }
            Reservation reservation = existing.get();
            if (!reservation.isActive()) {
                return;
            }
            StockItem item = lockOrCreate(reservation.symbol());
            item.release(reservation);
            stock.save(item);
            stock.save(reservation);
        });
    }

    /** Takes the reserved grams of a completed order out of stock for good; the event's own values are not used. */
    public void fulfillOrder(Delivery delivery) {
        tx.executeWithoutResult(status -> {
            if (!stock.markDelivered(delivery)) {
                return;
            }
            Optional<Reservation> existing = stock.lockReservation(delivery.orderId());
            if (existing.isEmpty() || !existing.get().isActive()) {
                return;
            }
            Reservation reservation = existing.get();
            StockItem item = lockOrCreate(reservation.symbol());
            item.fulfill(reservation);
            stock.save(item);
            stock.save(reservation);
        });
    }

    /** Puts grams sold back at the desk into stock, once per sale id (stored as a Sold reservation row). */
    public void restock(Delivery delivery, UUID saleId, String symbol, Grams grams) {
        tx.executeWithoutResult(status -> {
            if (!stock.markDelivered(delivery)) {
                return;
            }
            if (stock.lockReservation(saleId).isPresent()) {
                return;
            }
            StockItem item = lockOrCreate(normalize(symbol));
            item.restock(grams);
            stock.save(item);
            stock.add(Reservation.sale(saleId, item.symbol(), grams));
        });
    }

    /** Public read: never writes or locks; an unseen symbol reports the default seed it would get. */
    public StockItem stockOf(String symbol) {
        String upperSymbol = normalize(symbol);
        return stock.find(upperSymbol).orElseGet(() -> new StockItem(upperSymbol, defaultStock, Grams.ZERO));
    }

    private StockItem lockOrCreate(String upperSymbol) {
        stock.createIfMissing(upperSymbol, defaultStock);
        return stock.lock(upperSymbol);
    }

    private static String normalize(String symbol) {
        return symbol.toUpperCase(Locale.ROOT);
    }

    private void queueReply(UUID orderId, ReserveOutcome outcome, Grams available) {
        if (outcome == ReserveOutcome.ALREADY_HANDLED) {
            return; // released or fulfilled before: nothing to announce
        }
        Map<String, Object> reply = new LinkedHashMap<>();
        reply.put("orderId", orderId.toString());
        // A repeat of a live reservation is confirmed again; the saga ignores a reply it no longer waits for.
        if (outcome == ReserveOutcome.RESERVED || outcome == ReserveOutcome.ALREADY_RESERVED) {
            outbox.add("StockReservedEvent", reply);
            return;
        }
        reply.put("reason", outcome == ReserveOutcome.INVALID_QUANTITY
                ? INVALID_QUANTITY_REASON
                : INSUFFICIENT_STOCK_REASON.formatted(available.value()));
        outbox.add("StockReservationFailedEvent", reply);
    }
}
