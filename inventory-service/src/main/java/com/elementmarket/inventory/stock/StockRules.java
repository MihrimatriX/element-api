package com.elementmarket.inventory.stock;

import java.math.BigDecimal;

/** Pure stock math — repository still owns reservations. */
public final class StockRules {
    private StockRules() {}

    public static BigDecimal available(BigDecimal stockGrams, BigDecimal reservedGrams) {
        if (stockGrams == null || reservedGrams == null) return BigDecimal.ZERO;
        return stockGrams.subtract(reservedGrams);
    }

    public static boolean canReserve(BigDecimal stockGrams, BigDecimal reservedGrams, BigDecimal quantity) {
        if (quantity == null || quantity.signum() <= 0) return false;
        return available(stockGrams, reservedGrams).compareTo(quantity) >= 0;
    }
}
