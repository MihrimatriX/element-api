package com.elementmarket.inventory.stock;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class StockRulesTest {

    @Test
    void available_subtractsReserved() {
        assertEquals(
                0,
                StockRules.available(BigDecimal.valueOf(100), BigDecimal.valueOf(40))
                        .compareTo(BigDecimal.valueOf(60)));
    }

    @Test
    void canReserve_whenEnoughAvailable() {
        assertTrue(StockRules.canReserve(BigDecimal.valueOf(100), BigDecimal.valueOf(10), BigDecimal.TEN));
        assertFalse(StockRules.canReserve(BigDecimal.valueOf(100), BigDecimal.valueOf(95), BigDecimal.TEN));
        assertFalse(StockRules.canReserve(BigDecimal.valueOf(100), BigDecimal.ZERO, BigDecimal.ZERO));
    }
}
