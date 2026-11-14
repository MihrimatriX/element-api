package com.elementmarket.wallet.domain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class MoneyTest {

    @Test
    void storesFourDecimalsLikeTheNumericColumn() {
        assertEquals(new BigDecimal("1.2346"), Money.of("1.23456").amount());
        assertEquals(Money.of("5"), Money.of("5.0000"));
    }

    @Test
    void rejectsNegativeAndMissingAmounts() {
        assertThrows(IllegalArgumentException.class, () -> Money.of("-0.0001"));
        assertThrows(IllegalArgumentException.class, () -> new Money(null));
    }

    @Test
    void subtractingMoreThanHeldIsAProgrammingError() {
        assertThrows(IllegalArgumentException.class, () -> Money.of("1").minus(Money.of("2")));
        assertEquals(Money.of("0.5"), Money.of("2").minus(Money.of("1.5")));
    }

    @Test
    void priceTimesGramsTruncatesSoThePayoutNeverExceedsTheTrade() {
        // 0.5 x 0.0001 = 0.00005: rounding half-up would pay 0.0001, twice the trade.
        assertTrue(Money.ofTrade(new BigDecimal("0.5"), Grams.of("0.0001")).isZero());
        // 1.2345 x 0.0003 = 0.00037035: truncated to 0.0003, never rounded up to 0.0004.
        assertEquals(Money.of("0.0003"), Money.ofTrade(new BigDecimal("1.2345"), Grams.of("0.0003")));
        assertEquals(Money.of("150"), Money.ofTrade(new BigDecimal("1.5"), Grams.of("100")));
        // The unit price is never rounded first: 0.001676 x 1000 g is worth 1.676, not the 1.7 a rounded price paid.
        assertEquals(Money.of("1.676"), Money.ofTrade(new BigDecimal("0.001676"), Grams.of("1000")));
    }

    @Test
    void unitPriceIsTotalOverGramsRoundedHalfUp() {
        assertEquals(Money.of("3.3333"), Money.of("10").per(Grams.of("3")));
    }
}
