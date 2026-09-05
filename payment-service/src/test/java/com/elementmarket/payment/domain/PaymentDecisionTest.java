package com.elementmarket.payment.domain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PaymentDecisionTest {

    @Test
    void underLimitSucceeds() {
        assertEquals(PaymentDecision.Outcome.SUCCESS, PaymentDecision.evaluate(new BigDecimal("49999.99")));
    }

    @Test
    void overLimitFails() {
        assertEquals(
                PaymentDecision.Outcome.CREDIT_LIMIT_EXCEEDED,
                PaymentDecision.evaluate(new BigDecimal("50000.01")));
    }
}
