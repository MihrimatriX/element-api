package com.elementmarket.inventory.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** A non-negative mass in grams with the 4 decimals of the NUMERIC(18,4) columns; stock can never be expressed below zero. */
public record Grams(BigDecimal value) implements Comparable<Grams> {

    public static final int SCALE = 4;
    public static final Grams ZERO = new Grams(BigDecimal.ZERO);

    public Grams {
        if (value == null) {
            throw new IllegalArgumentException("grams are required");
        }
        value = value.setScale(SCALE, RoundingMode.HALF_UP);
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

    /** Throws when the result would be negative; callers check {@link #compareTo} first. */
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
