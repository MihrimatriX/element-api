package com.elementmarket.wallet.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** A non-negative mass in grams, 4 decimals like the holdings column. Kept apart from {@link Money} so the two cannot be mixed up. */
public record Grams(BigDecimal value) implements Comparable<Grams> {

    public static final Grams ZERO = new Grams(BigDecimal.ZERO);

    public Grams {
        if (value == null) {
            throw new IllegalArgumentException("grams are required");
        }
        value = value.setScale(Money.SCALE, RoundingMode.HALF_UP);
        if (value.signum() < 0) {
            throw new IllegalArgumentException("grams cannot be negative: " + value);
        }
    }

    public static Grams of(String value) {
        return new Grams(new BigDecimal(value));
    }

    public static Grams of(BigDecimal value) {
        return new Grams(value);
    }

    public Grams plus(Grams other) {
        return new Grams(value.add(other.value));
    }

    public Grams minus(Grams other) {
        return new Grams(value.subtract(other.value));
    }

    public boolean isZero() {
        return value.signum() == 0;
    }

    @Override
    public int compareTo(Grams other) {
        return value.compareTo(other.value);
    }
}
