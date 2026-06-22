package com.elementmarket.payment.domain;

import java.math.BigDecimal;
import java.util.concurrent.ThreadLocalRandom;

public final class PaymentDecision {

    public static final BigDecimal CREDIT_LIMIT = new BigDecimal("50000");

    private PaymentDecision() {}

    public enum Outcome {
        SUCCESS,
        CREDIT_LIMIT_EXCEEDED,
        BANK_DECLINED
    }

    public static Outcome evaluate(BigDecimal amount, int rollOneToTen) {
        if (amount.compareTo(CREDIT_LIMIT) > 0) {
            return Outcome.CREDIT_LIMIT_EXCEEDED;
        }
        if (rollOneToTen == 1) {
            return Outcome.BANK_DECLINED;
        }
        return Outcome.SUCCESS;
    }

    public static int roll(boolean deterministic) {
        return deterministic ? 5 : ThreadLocalRandom.current().nextInt(1, 11);
    }
}
