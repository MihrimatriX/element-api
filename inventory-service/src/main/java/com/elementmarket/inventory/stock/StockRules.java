package com.elementmarket.inventory.stock;

import java.math.BigDecimal;

/** Pure stock math kept free of JDBC so it can be unit tested; the repository still owns reservations. */
public final class StockRules {

    private StockRules() {}

    /** Grams that can still be reserved (stock minus reserved); zero when either value is missing. */
    public static BigDecimal available(BigDecimal stockGrams, BigDecimal reservedGrams) {
        if (stockGrams == null || reservedGrams == null) {
            return BigDecimal.ZERO;
        }
        return stockGrams.subtract(reservedGrams);
    }

    /** True when a positive quantity fits in the available grams. */
    public static boolean canReserve(BigDecimal stockGrams, BigDecimal reservedGrams, BigDecimal quantity) {
        if (quantity == null || quantity.signum() <= 0) {
            return false;
        }
        return available(stockGrams, reservedGrams).compareTo(quantity) >= 0;
    }
}
