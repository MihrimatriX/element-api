package com.elementmarket.wallet.domain;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static com.elementmarket.wallet.domain.ChargeOutcome.*;
import static org.junit.jupiter.api.Assertions.*;

class WalletTest {

    private static final Money LIMIT = Money.of("50000");

    private final Wallet wallet = new Wallet(UUID.randomUUID(), Money.of("100"));

    @Test
    void chargeTakesTheAmountOnce() {
        assertEquals(CHARGED, wallet.charge(OrderPayments.NONE, Money.of("40"), LIMIT));
        assertEquals(Money.of("60"), wallet.balance());
    }

    @Test
    void chargeChecksTheLimitBeforeAnythingElse() {
        assertEquals(OVER_LIMIT, wallet.charge(OrderPayments.NONE, Money.ZERO, LIMIT));
        assertEquals(OVER_LIMIT, wallet.charge(OrderPayments.NONE, Money.of("50000.0001"), LIMIT));
        assertEquals(INSUFFICIENT_FUNDS, wallet.charge(OrderPayments.NONE, LIMIT, LIMIT), "limit is inclusive");
        assertEquals(Money.of("100"), wallet.balance());
    }

    @Test
    void anOrderIsChargedAtMostOnce() {
        OrderPayments paid = new OrderPayments(Money.of("40"), false);
        assertEquals(ALREADY_CHARGED, wallet.charge(paid, Money.of("40"), LIMIT));
        assertEquals(Money.of("100"), wallet.balance());
    }

    @Test
    void aRefundedOrderIsNeverChargedAgain() {
        OrderPayments refunded = new OrderPayments(null, true);
        assertEquals(ORDER_CANCELLED, wallet.charge(refunded, Money.of("1"), LIMIT));
    }

    @Test
    void chargeNeverOverdraws() {
        assertEquals(INSUFFICIENT_FUNDS, wallet.charge(OrderPayments.NONE, Money.of("100.0001"), LIMIT));
        assertEquals(CHARGED, wallet.charge(OrderPayments.NONE, Money.of("100"), LIMIT));
        assertTrue(wallet.balance().isZero());
    }

    @Test
    void refundGivesBackWhatWasChargedAndAnUnchargedOrderGetsAZeroTombstone() {
        assertEquals(Money.of("40"), wallet.refund(new OrderPayments(Money.of("40"), false)));
        assertEquals(Money.of("140"), wallet.balance());
        assertEquals(Money.ZERO, wallet.refund(OrderPayments.NONE));
        assertEquals(Money.of("140"), wallet.balance());
    }

    @Test
    void refundingTwiceIsRejected() {
        assertThrows(IllegalStateException.class, () -> wallet.refund(new OrderPayments(Money.of("40"), true)));
    }

    @Test
    void assetsAreOnlyCreditedForAPaidAndActiveOrder() {
        Holding gold = Holding.empty("AU", "elemental", null);
        assertThrows(IllegalStateException.class,
                () -> wallet.receiveAssets(OrderPayments.NONE, gold, Grams.of("1"), Money.of("10")));
        assertThrows(IllegalStateException.class,
                () -> wallet.receiveAssets(new OrderPayments(Money.of("10"), true), gold, Grams.of("1"), Money.of("10")));

        wallet.receiveAssets(new OrderPayments(Money.of("10"), false), gold, Grams.of("1"), Money.of("10"));
        assertEquals(Grams.of("1"), gold.grams());
    }

    @Test
    void sellPaysBidTimesGramsAndOnlyFromWhatIsHeld() {
        Holding gold = new Holding("AU", "elemental", null, Grams.of("2"), Money.of("10"));
        assertTrue(wallet.sell(gold, Grams.of("3"), Money.of("50")).isEmpty(), "cannot sell more than held");

        assertEquals(Money.of("75"), wallet.sell(gold, Grams.of("1.5"), Money.of("50")).orElseThrow());
        assertEquals(Money.of("175"), wallet.balance());
        assertEquals(Grams.of("0.5"), gold.grams());
    }
}
