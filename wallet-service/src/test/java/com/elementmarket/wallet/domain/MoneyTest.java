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
        assertTrue(Money.of("0.5").times(Grams.of("0.0001")).isZero());
        // 1.2345 x 0.0003 = 0.00037035: truncated to 0.0003, never rounded up to 0.0004.
        assertEquals(Money.of("0.0003"), Money.of("1.2345").times(Grams.of("0.0003")));
        assertEquals(Money.of("150"), Money.of("1.5").times(Grams.of("100")));
    }

    @Test
    void unitPriceIsTotalOverGramsRoundedHalfUp() {
        assertEquals(Money.of("3.3333"), Money.of("10").per(Grams.of("3")));
    }
}
