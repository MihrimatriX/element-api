package com.elementmarket.inventory.application;

import com.elementmarket.inventory.domain.Grams;
import com.elementmarket.inventory.domain.Reservation;
import com.elementmarket.inventory.domain.StockItem;

import java.util.Optional;
import java.util.UUID;

/**
 * Persistence port of the stock aggregate and its reservations. The application layer owns this interface and the
 * JDBC adapter implements it, so the domain and use cases never depend on SQL. Every method joins the caller's
 * transaction. Lock order is always reservation first, then item, so two use cases cannot deadlock.
 */
public interface StockRepository {

    /** Records a delivery once; false when it was already processed (idempotent consumer). */
    boolean markDelivered(Delivery delivery);

    /** Seeds the symbol with the default stock on first touch; does nothing for an existing one. */
    void createIfMissing(String symbol, Grams defaultStock);

    /** Loads the item under a row lock held until the transaction ends. */
    StockItem lock(String symbol);

    /** Reads without locking or writing; empty for a symbol never touched. */
    Optional<StockItem> find(String symbol);

    /** Loads the order's (or desk sale's) reservation under a row lock, or empty when there is none. */
    Optional<Reservation> lockReservation(UUID id);

    void save(StockItem item);

    /** Inserts a new reservation; a concurrent insert for the same id fails instead of being overwritten. */
    void add(Reservation reservation);

    /** Stores the new status of an existing reservation. */
    void save(Reservation reservation);
}
