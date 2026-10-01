package com.elementmarket.wallet.ledger;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Pure debit gate — JDBC path still enforces balance/idempotency. */
public final class LedgerRules {
    private LedgerRules() {}

    public enum DebitGate { PROCEED, LIMIT }

    public static DebitGate evaluateDebit(BigDecimal amount, double creditLimit) {
        if (amount == null || amount.signum() <= 0 || amount.doubleValue() > creditLimit) {
            return DebitGate.LIMIT;
        }
        return DebitGate.PROCEED;
    }

    public static boolean canAfford(BigDecimal balance, BigDecimal amount) {
        if (balance == null || amount == null) return false;
        return balance.compareTo(amount) >= 0;
    }

    /** Desk payout: bid x grams, truncated to 4 dp so rounding never pays out more than the trade is worth. */
    public static BigDecimal proceeds(BigDecimal bid, BigDecimal grams) {
        return bid.multiply(grams).setScale(4, RoundingMode.DOWN);
    }
}
