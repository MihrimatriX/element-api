package com.elementmarket.inventory.domain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class GramsTest {

    @Test
    void storesFourDecimalsLikeTheNumericColumn() {
        assertEquals(new BigDecimal("1.2346"), Grams.of("1.23456").value());
        assertEquals(Grams.of("5"), Grams.of("5.0000"));
    }

    @Test
    void rejectsNegativeAndMissingValues() {
        assertThrows(IllegalArgumentException.class, () -> Grams.of("-0.0001"));
        assertThrows(IllegalArgumentException.class, () -> new Grams(null));
    }

    @Test
    void subtractingMoreThanHeldIsAProgrammingError() {
        assertThrows(IllegalArgumentException.class, () -> Grams.of("1").minus(Grams.of("2")));
        assertEquals(Grams.of("0.5"), Grams.of("2").minus(Grams.of("1.5")));
        assertEquals(Grams.of("3.5"), Grams.of("2").plus(Grams.of("1.5")));
    }
}
