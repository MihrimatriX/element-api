package com.elementmarket.wallet.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * A non-negative KREDI amount with the 4 decimals of the NUMERIC(18,4) columns.
 * Being a value object, two amounts are equal when their values are, and a negative balance cannot be expressed.
 */
public record Money(BigDecimal amount) implements Comparable<Money> {

    public static final int SCALE = 4;
    public static final Money ZERO = new Money(BigDecimal.ZERO);

    public Money {
        if (amount == null) {
            throw new IllegalArgumentException("amount is required");
        }
        amount = amount.setScale(SCALE, RoundingMode.HALF_UP);
        if (amount.signum() < 0) {
            throw new IllegalArgumentException("amount cannot be negative: " + amount);
        }
    }

    public static Money of(String amount) {
        return new Money(new BigDecimal(amount));
    }

    public static Money of(BigDecimal amount) {
        return new Money(amount);
    }

    public Money plus(Money other) {
        return new Money(amount.add(other.amount));
    }

    /** Throws when the result would be negative; callers check {@link #compareTo} first. */
    public Money minus(Money other) {
        return new Money(amount.subtract(other.amount));
    }

    /** Price per gram times grams, truncated so a payout never exceeds what the trade is worth. */
    public Money times(Grams grams) {
        return new Money(amount.multiply(grams.value()).setScale(SCALE, RoundingMode.DOWN));
    }

    /** Unit price of this total over the given grams, rounded half-up. */
    public Money per(Grams grams) {
        return new Money(amount.divide(grams.value(), SCALE, RoundingMode.HALF_UP));
    }

    public boolean isZero() {
        return amount.signum() == 0;
    }

    @Override
    public int compareTo(Money other) {
        return amount.compareTo(other.amount);
    }
}
