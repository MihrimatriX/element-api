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

    @Test
    void proceeds_truncatesInHouseFavor() {
        // 0.5 x 0.0001 = 0.00005: HALF_UP would pay 0.0001 (2x the trade); truncation pays 0 -> request rejected.
        assertEquals(0, LedgerRules.proceeds(new BigDecimal("0.5"), new BigDecimal("0.0001")).signum());
        assertEquals(new BigDecimal("12.3456"), LedgerRules.proceeds(new BigDecimal("1.234567"), BigDecimal.TEN));
        assertEquals(new BigDecimal("150.0000"), LedgerRules.proceeds(new BigDecimal("1.5000"), new BigDecimal("100.0000")));
    }
}
