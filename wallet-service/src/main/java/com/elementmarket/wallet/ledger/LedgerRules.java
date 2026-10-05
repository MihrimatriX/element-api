package com.elementmarket.wallet.ledger;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Pure ledger rules and shared constants, kept free of JDBC so they can be unit tested.
 * The repository still enforces balance and idempotency against the database.
 */
public final class LedgerRules {

    /** Decimal places stored by the NUMERIC(18,4) money and gram columns. */
    public static final int AMOUNT_SCALE = 4;

    /** Compound slug used for the plain element (no compound product). Matches the DB column default. */
    public static final String DEFAULT_COMPOUND_SLUG = "elemental";

    private LedgerRules() {}

    /** Outcome of the stateless debit check that runs before any database work. */
    public enum DebitGate { PROCEED, LIMIT }

    /** Rejects missing, non-positive or over-limit amounts; the credit limit itself is inclusive. */
    public static DebitGate evaluateDebit(BigDecimal amount, double creditLimit) {
        if (amount == null) {
            return DebitGate.LIMIT;
        }
        boolean isPositive = amount.signum() > 0;
        boolean exceedsLimit = amount.doubleValue() > creditLimit;
        if (!isPositive || exceedsLimit) {
            return DebitGate.LIMIT;
        }
        return DebitGate.PROCEED;
    }

    /** True when the balance covers the amount; missing values never afford anything. */
    public static boolean canAfford(BigDecimal balance, BigDecimal amount) {
        if (balance == null || amount == null) {
            return false;
        }
        return balance.compareTo(amount) >= 0;
    }

    /** Desk payout: bid x grams, truncated to 4 dp so rounding never pays out more than the trade is worth. */
    public static BigDecimal proceeds(BigDecimal bid, BigDecimal grams) {
        return bid.multiply(grams).setScale(AMOUNT_SCALE, RoundingMode.DOWN);
    }
}
