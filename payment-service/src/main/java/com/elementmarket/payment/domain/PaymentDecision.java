package com.elementmarket.payment.domain;

import java.math.BigDecimal;

public final class PaymentDecision {

    public static final BigDecimal CREDIT_LIMIT = new BigDecimal("50000");

    private PaymentDecision() {}

    public enum Outcome {
        SUCCESS,
        CREDIT_LIMIT_EXCEEDED
    }

    public static Outcome evaluate(BigDecimal amount) {
        if (amount.compareTo(CREDIT_LIMIT) > 0) {
            return Outcome.CREDIT_LIMIT_EXCEEDED;
        }
        return Outcome.SUCCESS;
    }
}
