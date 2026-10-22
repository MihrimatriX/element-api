package com.elementmarket.wallet.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class HoldingTest {

    @Test
    void addingRecomputesTheWeightedAverageCost() {
        Holding gold = new Holding("AU", "elemental", null, Grams.of("10"), Money.of("2"));
        gold.add(Grams.of("30"), Money.of("4"));
        // (10 x 2 + 30 x 4) / 40 = 3.5
        assertEquals(Grams.of("40"), gold.grams());
        assertEquals(Money.of("3.5"), gold.averageCost());
    }

    @Test
    void theFirstPurchaseSetsTheAverageCost() {
        Holding gold = Holding.empty("AU", "elemental", "Altın külçe");
        gold.add(Grams.of("3"), Money.of("1.2345"));
        assertEquals(Money.of("1.2345"), gold.averageCost());
        assertEquals("Altın külçe", gold.productLabel());
    }

    @Test
    void removingKeepsTheAverageAndEmptiesAtZero() {
        Holding gold = new Holding("AU", "elemental", null, Grams.of("2"), Money.of("10"));
        assertFalse(gold.covers(Grams.of("2.0001")));
        gold.remove(Grams.of("2"));
        assertTrue(gold.isEmpty());
        assertEquals(Money.of("10"), gold.averageCost());
    }

    @Test
    void removingMoreThanHeldIsRejected() {
        Holding gold = new Holding("AU", "elemental", null, Grams.of("1"), Money.of("10"));
        assertThrows(IllegalArgumentException.class, () -> gold.remove(Grams.of("2")));
    }
}
