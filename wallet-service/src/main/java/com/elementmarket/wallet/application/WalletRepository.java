package com.elementmarket.wallet.application;

import com.elementmarket.wallet.domain.Holding;
import com.elementmarket.wallet.domain.LedgerEntry;
import com.elementmarket.wallet.domain.Money;
import com.elementmarket.wallet.domain.OrderPayments;
import com.elementmarket.wallet.domain.Wallet;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Persistence port of the wallet aggregate. The application layer owns this interface and the JDBC adapter
 * implements it, so the domain and use cases never depend on SQL. Every method joins the caller's transaction.
 */
public interface WalletRepository {

    /** Records a delivery once; false when it was already processed (idempotent consumer). */
    boolean markDelivered(Delivery delivery);

    /** Creates the wallet with its welcome grant on first touch; does nothing for an existing one. */
    void createIfMissing(UUID userId, Money welcomeGrant);

    /** Loads the wallet under a row lock held until the transaction ends. */
    Wallet lock(UUID userId);

    /** What the ledger holds for the order; call after {@link #lock} so it cannot change underneath. */
    OrderPayments paymentsFor(UUID orderId, UUID userId);

    /** Loads a holding under a row lock, or empty when the user owns none of it. */
    Optional<Holding> lockHolding(UUID userId, String symbol, String compoundSlug);

    void save(Wallet wallet);

    /** Upserts the holding, or deletes it once empty. */
    void saveHolding(UUID userId, Holding holding);

    void record(LedgerEntry entry);

    WalletView view(UUID userId);

    /** Non-empty holdings ordered by symbol and compound. */
    List<Holding> holdings(UUID userId);

    record WalletView(Money balance, Instant updatedAt) {}
}
