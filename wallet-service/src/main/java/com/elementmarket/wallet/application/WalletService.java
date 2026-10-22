package com.elementmarket.wallet.application;

import com.elementmarket.wallet.application.WalletRepository.WalletView;
import com.elementmarket.wallet.domain.ChargeOutcome;
import com.elementmarket.wallet.domain.Grams;
import com.elementmarket.wallet.domain.Holding;
import com.elementmarket.wallet.domain.LedgerEntry;
import com.elementmarket.wallet.domain.Money;
import com.elementmarket.wallet.domain.OrderPayments;
import com.elementmarket.wallet.domain.Wallet;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Wallet use cases. Each public method is one ACID transaction: it records the delivery, locks the wallet row,
 * lets the {@link Wallet} aggregate decide, then writes the new state, the ledger line and the outgoing event.
 * They commit together or not at all, so a crash can neither lose an event nor publish one for undone work.
 */
public class WalletService {

    /** Wire reasons the order service shows to the buyer ("ELX" is the legacy currency name, kept on purpose). */
    static final String INSUFFICIENT_FUNDS_REASON = "INSUFFICIENT_ELX";
    static final String CREDIT_LIMIT_REASON = "Credit limit exceeded (50000 KREDI limit).";
    static final String ORDER_CANCELLED_REASON = "ORDER_CANCELLED";

    private final WalletRepository wallets;
    private final Outbox outbox;
    private final TransactionTemplate tx;
    private final Money creditLimit;
    private final Money welcomeGrant;

    public WalletService(
            WalletRepository wallets, Outbox outbox, TransactionTemplate tx, Money creditLimit, Money welcomeGrant) {
        this.wallets = wallets;
        this.outbox = outbox;
        this.tx = tx;
        this.creditLimit = creditLimit;
        this.welcomeGrant = welcomeGrant;
    }

    /**
     * Charges a purchase and queues the saga reply (PaymentProcessed or PaymentFailed).
     * Empty when this delivery was already processed.
     */
    public Optional<ChargeOutcome> chargeOrder(
            Delivery delivery, UUID customerId, BigDecimal requested, String symbol, Grams grams) {
        return tx.execute(status -> {
            if (!wallets.markDelivered(delivery)) {
                return Optional.<ChargeOutcome>empty();
            }
            // A zero or negative request cannot be Money; as zero it is refused by the limit rule.
            Money amount = requested.signum() > 0 ? Money.of(requested) : Money.ZERO;
            Wallet wallet = lockOrCreate(customerId);
            OrderPayments payments = wallets.paymentsFor(delivery.orderId(), customerId);

            ChargeOutcome outcome = wallet.charge(payments, amount, creditLimit);
            if (outcome == ChargeOutcome.CHARGED) {
                wallets.save(wallet);
                wallets.record(LedgerEntry.buy(customerId, amount, symbol, grams, delivery.orderId()));
            }
            queueSagaReply(delivery.orderId(), outcome);
            return Optional.of(outcome);
        });
    }

    /** Refunds a cancelled order once; an uncharged order gets a zero tombstone so a late charge is refused. */
    public void refundOrder(Delivery delivery, UUID customerId, String symbol, Grams grams) {
        tx.executeWithoutResult(status -> {
            if (!wallets.markDelivered(delivery)) {
                return;
            }
            Wallet wallet = lockOrCreate(customerId);
            OrderPayments payments = wallets.paymentsFor(delivery.orderId(), customerId);
            if (payments.refunded()) {
                return;
            }
            Money refunded = wallet.refund(payments);
            wallets.save(wallet);
            wallets.record(LedgerEntry.refund(customerId, refunded, symbol, grams, delivery.orderId()));
        });
    }

    /**
     * Adds delivered grams at the paid unit price. Throws for an unpaid or refunded order so the message
     * retries and then parks in the failed queue instead of minting sellable assets.
     */
    public void creditAssets(
            Delivery delivery,
            UUID customerId,
            String symbol,
            Grams grams,
            Money totalPrice,
            String compoundSlug,
            String productLabel) {
        tx.executeWithoutResult(status -> {
            if (!wallets.markDelivered(delivery)) {
                return;
            }
            Wallet wallet = lockOrCreate(customerId);
            OrderPayments payments = wallets.paymentsFor(delivery.orderId(), customerId);
            Holding holding = wallets.lockHolding(customerId, symbol, compoundSlug)
                    .orElseGet(() -> Holding.empty(symbol, compoundSlug, productLabel));
            holding.relabel(productLabel);

            wallet.receiveAssets(payments, holding, grams, totalPrice.per(grams));
            wallets.saveHolding(customerId, holding);
        });
    }

    /** Sells grams back to the desk at the bid, credits the proceeds and queues ElementSoldEvent. */
    public SaleResult sell(UUID userId, String symbol, Grams grams, Money bid, String compoundSlug) {
        return tx.execute(status -> {
            Wallet wallet = lockOrCreate(userId);
            Optional<Holding> owned = wallets.lockHolding(userId, symbol, compoundSlug);
            if (owned.isEmpty()) {
                return SaleResult.failed("no_holding");
            }
            Holding holding = owned.get();
            Optional<Money> sold = wallet.sell(holding, grams, bid);
            if (sold.isEmpty()) {
                return SaleResult.failed("over_holding");
            }
            Money proceeds = sold.get();
            wallets.save(wallet);
            wallets.saveHolding(userId, holding);
            wallets.record(LedgerEntry.sell(userId, proceeds, symbol, grams, compoundSlug));

            Map<String, Object> event = new LinkedHashMap<>();
            event.put("elementSymbol", symbol);
            event.put("grams", grams.value());
            event.put("customerId", userId.toString());
            outbox.add("ElementSoldEvent", event);
            return new SaleResult(null, proceeds, wallet.balance());
        });
    }

    /** Balance and last change, creating the wallet with the welcome grant on first call. */
    public WalletView walletOf(UUID userId) {
        return tx.execute(status -> {
            wallets.createIfMissing(userId, welcomeGrant);
            return wallets.view(userId);
        });
    }

    public List<Holding> holdingsOf(UUID userId) {
        return wallets.holdings(userId);
    }

    private Wallet lockOrCreate(UUID userId) {
        wallets.createIfMissing(userId, welcomeGrant);
        return wallets.lock(userId);
    }

    private void queueSagaReply(UUID orderId, ChargeOutcome outcome) {
        Map<String, Object> reply = new LinkedHashMap<>();
        reply.put("orderId", orderId.toString());
        String reason = switch (outcome) {
            // A duplicate means the order was already charged, so the saga can safely move on.
            case CHARGED, ALREADY_CHARGED -> null;
            case INSUFFICIENT_FUNDS -> INSUFFICIENT_FUNDS_REASON;
            case OVER_LIMIT -> CREDIT_LIMIT_REASON;
            case ORDER_CANCELLED -> ORDER_CANCELLED_REASON;
        };
        if (reason == null) {
            outbox.add("PaymentProcessedEvent", reply);
        } else {
            reply.put("reason", reason);
            outbox.add("PaymentFailedEvent", reply);
        }
    }

    /** A desk sale: {@code failure} is "no_holding" or "over_holding", otherwise proceeds and the new balance. */
    public record SaleResult(String failure, Money proceeds, Money balance) {

        static SaleResult failed(String failure) {
            return new SaleResult(failure, null, null);
        }
    }
}
