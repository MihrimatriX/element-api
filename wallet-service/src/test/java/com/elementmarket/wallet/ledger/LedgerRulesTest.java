package com.elementmarket.wallet.ledger;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class LedgerRulesTest {

    @Test
    void evaluateDebit_rejectsNullNonPositiveAndOverLimit() {
        assertEquals(LedgerRules.DebitGate.LIMIT, LedgerRules.evaluateDebit(null, 50_000));
        assertEquals(LedgerRules.DebitGate.LIMIT, LedgerRules.evaluateDebit(BigDecimal.ZERO, 50_000));
        assertEquals(LedgerRules.DebitGate.LIMIT, LedgerRules.evaluateDebit(BigDecimal.valueOf(-1), 50_000));
        assertEquals(LedgerRules.DebitGate.LIMIT, LedgerRules.evaluateDebit(BigDecimal.valueOf(50_000.01), 50_000));
    }

    @Test
    void evaluateDebit_allowsInclusiveCap() {
        assertEquals(LedgerRules.DebitGate.PROCEED, LedgerRules.evaluateDebit(BigDecimal.valueOf(50_000), 50_000));
        assertEquals(LedgerRules.DebitGate.PROCEED, LedgerRules.evaluateDebit(BigDecimal.ONE, 50_000));
    }

    @Test
    void canAfford_comparesBalance() {
        assertTrue(LedgerRules.canAfford(BigDecimal.TEN, BigDecimal.ONE));
        assertFalse(LedgerRules.canAfford(BigDecimal.ONE, BigDecimal.TEN));
    }
}
