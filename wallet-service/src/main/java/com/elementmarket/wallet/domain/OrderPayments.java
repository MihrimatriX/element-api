package com.elementmarket.wallet.domain;

/**
 * What the ledger already holds for one order: the amount charged to this wallet (null when not charged)
 * and whether a refund or refund tombstone exists. Loaded under the wallet lock, so it cannot change mid-decision.
 */
public record OrderPayments(Money charged, boolean refunded) {

    public static final OrderPayments NONE = new OrderPayments(null, false);

    public boolean isCharged() {
        return charged != null;
    }

    /** Paid and not refunded: the only state in which delivered assets may be credited. */
    public boolean isPaidAndActive() {
        return isCharged() && !refunded;
    }
}
