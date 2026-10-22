package com.elementmarket.wallet.domain;

import java.util.UUID;

/**
 * One line of the append-only ledger. Every balance change of the {@link Wallet} is written as one of these
 * in the same transaction, so the balance can always be explained from its history.
 */
public record LedgerEntry(
        UUID userId, Kind kind, Money amount, String symbol, Grams grams, UUID orderId, String compoundSlug) {

    /** Ledger kinds as stored in the {@code kind} column. */
    public enum Kind {
        GRANT, BUY, REFUND, SELL;

        public String column() {
            return name().toLowerCase();
        }
    }

    public static LedgerEntry grant(UUID userId, Money amount) {
        return new LedgerEntry(userId, Kind.GRANT, amount, null, null, null, null);
    }

    public static LedgerEntry buy(UUID userId, Money amount, String symbol, Grams grams, UUID orderId) {
        return new LedgerEntry(userId, Kind.BUY, amount, symbol, grams, orderId, null);
    }

    /** A zero amount is the tombstone that makes a late charge for the order return ORDER_CANCELLED. */
    public static LedgerEntry refund(UUID userId, Money amount, String symbol, Grams grams, UUID orderId) {
        return new LedgerEntry(userId, Kind.REFUND, amount, symbol, grams, orderId, null);
    }

    public static LedgerEntry sell(UUID userId, Money proceeds, String symbol, Grams grams, String compoundSlug) {
        return new LedgerEntry(userId, Kind.SELL, proceeds, symbol, grams, null, compoundSlug);
    }
}
