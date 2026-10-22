package com.elementmarket.wallet.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Grams of one element or compound product a user owns, with their weighted average purchase cost. */
public final class Holding {

    /** Compound slug of the plain element (no compound product); matches the column default. */
    public static final String ELEMENTAL = "elemental";

    private final String symbol;
    private final String compoundSlug;
    private String productLabel;
    private Grams grams;
    private Money averageCost;

    public Holding(String symbol, String compoundSlug, String productLabel, Grams grams, Money averageCost) {
        this.symbol = symbol;
        this.compoundSlug = compoundSlug;
        this.productLabel = productLabel;
        this.grams = grams;
        this.averageCost = averageCost;
    }

    /** A holding the user does not own yet; the first {@link #add} sets its cost. */
    public static Holding empty(String symbol, String compoundSlug, String productLabel) {
        return new Holding(symbol, compoundSlug, productLabel, Grams.ZERO, Money.ZERO);
    }

    /** Adds bought grams and moves the average cost to (old grams x old cost + new grams x unit cost) / total. */
    public void add(Grams bought, Money unitCost) {
        Grams total = grams.plus(bought);
        BigDecimal totalCost = grams.value().multiply(averageCost.amount())
                .add(bought.value().multiply(unitCost.amount()));
        averageCost = Money.of(totalCost.divide(total.value(), Money.SCALE, RoundingMode.HALF_UP));
        grams = total;
    }

    /** Takes sold grams out; the average cost of what remains does not change. */
    public void remove(Grams sold) {
        if (!covers(sold)) {
            throw new IllegalArgumentException("cannot remove " + sold.value() + " g from " + grams.value() + " g");
        }
        grams = grams.minus(sold);
    }

    public boolean covers(Grams wanted) {
        return grams.compareTo(wanted) >= 0;
    }

    public boolean isEmpty() {
        return grams.isZero();
    }

    public void relabel(String productLabel) {
        this.productLabel = productLabel;
    }

    public String symbol() {
        return symbol;
    }

    public String compoundSlug() {
        return compoundSlug;
    }

    public String productLabel() {
        return productLabel;
    }

    public Grams grams() {
        return grams;
    }

    public Money averageCost() {
        return averageCost;
    }
}
