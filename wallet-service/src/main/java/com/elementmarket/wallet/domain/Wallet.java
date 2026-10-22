package com.elementmarket.wallet.domain;

import java.util.Optional;
import java.util.UUID;

/**
 * Aggregate root of the wallet context: one user's KREDI balance and the rules for moving it.
 * The balance only changes through these methods, so "never below zero, each order charged and refunded
 * at most once, assets only for paid orders" are checked in one place. The repository loads it under a
 * row lock, which makes each decision safe against concurrent deliveries.
 */
public final class Wallet {

    private final UUID userId;
    private Money balance;

    public Wallet(UUID userId, Money balance) {
        this.userId = userId;
        this.balance = balance;
    }

    /** Charges a purchase once. Checks run in a fixed order: limit, duplicate, cancelled, funds. */
    public ChargeOutcome charge(OrderPayments order, Money amount, Money creditLimit) {
        if (amount.isZero() || amount.compareTo(creditLimit) > 0) {
            return ChargeOutcome.OVER_LIMIT;
        }
        if (order.isCharged()) {
            return ChargeOutcome.ALREADY_CHARGED;
        }
        if (order.refunded()) {
            return ChargeOutcome.ORDER_CANCELLED;
        }
        if (balance.compareTo(amount) < 0) {
            return ChargeOutcome.INSUFFICIENT_FUNDS;
        }
        balance = balance.minus(amount);
        return ChargeOutcome.CHARGED;
    }

    /**
     * Gives back what the order was charged and returns that amount. An order that was never charged
     * returns zero, which the caller records as a tombstone so a late charge is refused.
     */
    public Money refund(OrderPayments order) {
        if (order.refunded()) {
            throw new IllegalStateException("order already refunded");
        }
        Money amount = order.isCharged() ? order.charged() : Money.ZERO;
        balance = balance.plus(amount);
        return amount;
    }

    /** Credits delivered grams; a stray or forged event for an unpaid or refunded order must not mint assets. */
    public void receiveAssets(OrderPayments order, Holding holding, Grams grams, Money unitCost) {
        if (!order.isPaidAndActive()) {
            throw new IllegalStateException("assets credited for an unpaid or refunded order");
        }
        holding.add(grams, unitCost);
    }

    /** Sells grams back to the desk at the bid; empty when the holding does not cover them. */
    public Optional<Money> sell(Holding holding, Grams grams, Money bid) {
        if (!holding.covers(grams)) {
            return Optional.empty();
        }
        holding.remove(grams);
        Money proceeds = bid.times(grams);
        balance = balance.plus(proceeds);
        return Optional.of(proceeds);
    }

    public UUID userId() {
        return userId;
    }

    public Money balance() {
        return balance;
    }
}
