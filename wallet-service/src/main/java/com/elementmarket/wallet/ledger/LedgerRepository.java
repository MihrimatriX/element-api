package com.elementmarket.wallet.ledger;

import com.elementmarket.wallet.config.RabbitConfig.WalletSettings;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * JDBC access to wallets, the append-only ledger and holdings.
 * Every money-moving method locks the wallet row first so concurrent messages cannot double-spend.
 */
@Repository
public class LedgerRepository {

    /**
     * Outcome of a purchase debit, mapped by the listener to PaymentProcessed / PaymentFailed.
     * CANCELLED means the order already has a refund (or refund tombstone), so it must never be charged.
     */
    public enum DebitResult { OK, DUPLICATE, INSUFFICIENT, LIMIT, CANCELLED }

    private static final String KIND_BUY = "buy";
    private static final String KIND_REFUND = "refund";

    private final JdbcTemplate jdbc;
    private final WalletSettings settings;

    public LedgerRepository(JdbcTemplate jdbc, WalletSettings settings) {
        this.jdbc = jdbc;
        this.settings = settings;
    }

    /**
     * Records a message id once; returns false when it was already processed (idempotent consumer).
     * Joins the listener's transaction, so the mark rolls back together with the ledger work.
     */
    @Transactional
    public boolean tryMarkProcessed(UUID messageId, String eventType, UUID orderId) {
        int insertedRows = jdbc.update(
                """
                INSERT INTO processed_messages (message_id, event_type, order_id)
                VALUES (?, ?, ?) ON CONFLICT DO NOTHING
                """,
                messageId, eventType, orderId);
        return insertedRows == 1;
    }

    /** Creates the wallet with the welcome grant on first touch and returns the current balance. */
    @Transactional
    public BigDecimal ensureWallet(UUID userId) {
        // Local default is 10000; the public compose file sets WALLET_WELCOME_GRANT=1000 to discourage signup grinding.
        BigDecimal welcomeGrant = BigDecimal.valueOf(settings.welcomeGrant());
        int insertedRows = jdbc.update(
                """
                INSERT INTO wallets (user_id, balance_elx, updated_at)
                VALUES (?, ?, NOW()) ON CONFLICT (user_id) DO NOTHING
                """,
                userId, welcomeGrant);
        boolean isNewWallet = insertedRows > 0;
        if (isNewWallet) {
            jdbc.update(
                    """
                    INSERT INTO ledger (id, user_id, kind, elx, created_at)
                    VALUES (?, ?, 'grant', ?, NOW())
                    """,
                    UUID.randomUUID(), userId, welcomeGrant);
        }
        return readBalance(userId);
    }

    /** Returns the wallet row (balance_elx, updated_at), creating the wallet if needed. */
    @Transactional
    public Map<String, Object> getWallet(UUID userId) {
        ensureWallet(userId);
        return jdbc.queryForMap(
                "SELECT balance_elx, updated_at FROM wallets WHERE user_id = ?", userId);
    }

    /** Lists the user's non-empty holdings, ordered by symbol and compound. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getHoldings(UUID userId) {
        return jdbc.queryForList(
                """
                SELECT symbol, grams, avg_cost_elx, compound_slug, product_label
                FROM holdings WHERE user_id = ? AND grams > 0
                ORDER BY symbol, compound_slug
                """,
                userId);
    }

    /**
     * Charges a purchase once per order: checks the credit limit, duplicates, an earlier refund
     * (cancelled order) and the balance before writing.
     */
    @Transactional
    public DebitResult debit(UUID userId, UUID orderId, BigDecimal amount, String symbol, BigDecimal grams) {
        if (LedgerRules.evaluateDebit(amount, settings.creditLimit()) == LedgerRules.DebitGate.LIMIT) {
            return DebitResult.LIMIT;
        }
        ensureWallet(userId);
        BigDecimal balance = lockWalletAndReadBalance(userId);
        if (hasOrderLedgerEntry(orderId, KIND_BUY)) {
            return DebitResult.DUPLICATE;
        }
        // Refund (or its zero tombstone) already recorded: order is dead. A late/replayed request must not charge.
        if (hasOrderLedgerEntry(orderId, KIND_REFUND)) {
            return DebitResult.CANCELLED;
        }
        if (!LedgerRules.canAfford(balance, amount)) {
            return DebitResult.INSUFFICIENT;
        }

        addToBalance(userId, amount.negate());
        insertOrderLedgerEntry(KIND_BUY, userId, amount, symbol, grams, orderId);
        return DebitResult.OK;
    }

    /**
     * Refunds an order once: gives back this user's purchase amount if it was charged. When nothing was
     * charged yet, a 0 KREDI refund is still written as a tombstone so a late debit() returns CANCELLED.
     */
    @Transactional
    public void refundIfDebited(UUID userId, UUID orderId, String symbol, BigDecimal grams) {
        ensureWallet(userId);
        lockWalletAndReadBalance(userId);
        if (hasOrderLedgerEntry(orderId, KIND_REFUND)) {
            return;
        }
        List<BigDecimal> buyAmounts = jdbc.query(
                "SELECT elx FROM ledger WHERE order_id = ? AND user_id = ? AND kind = 'buy'",
                (resultSet, rowNumber) -> resultSet.getBigDecimal(1),
                orderId, userId);

        // No debit yet -> the tombstone covers a PaymentRequested that arrives late
        // (timeout race, or replayed from wallet-service_failed).
        BigDecimal refundAmount = buyAmounts.isEmpty() ? BigDecimal.ZERO : buyAmounts.getFirst();
        if (refundAmount.signum() > 0) {
            addToBalance(userId, refundAmount);
        }
        insertOrderLedgerEntry(KIND_REFUND, userId, refundAmount, symbol, grams, orderId);
    }

    /**
     * Adds grams to a holding and recomputes its weighted average cost (4 decimals).
     * Throws IllegalStateException unless this user paid for the order and it was not refunded.
     */
    @Transactional
    public void addHolding(
            UUID userId,
            UUID orderId,
            String symbol,
            BigDecimal grams,
            BigDecimal unitCost,
            String compoundSlug,
            String productLabel) {
        ensureWallet(userId);
        lockWalletAndReadBalance(userId);
        // Assets only for an order this user actually paid and was not refunded; a stray/forged event must
        // not mint sellable holdings. Throw (not skip) so it retries, then parks in wallet-service_failed.
        Integer paidBuys = jdbc.queryForObject(
                """
                SELECT count(*) FROM ledger WHERE order_id = ? AND user_id = ? AND kind = 'buy'
                  AND NOT EXISTS (SELECT 1 FROM ledger r WHERE r.order_id = ? AND r.kind = 'refund')
                """,
                Integer.class, orderId, userId, orderId);
        if (paidBuys == null || paidBuys == 0) {
            throw new IllegalStateException("AssetsCredited for unpaid or refunded order " + orderId);
        }
        jdbc.update(
                """
                INSERT INTO holdings (user_id, symbol, grams, avg_cost_elx, compound_slug, product_label)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (user_id, symbol, compound_slug) DO UPDATE SET
                  avg_cost_elx = ROUND((holdings.grams * holdings.avg_cost_elx + EXCLUDED.grams * EXCLUDED.avg_cost_elx)
                    / (holdings.grams + EXCLUDED.grams), 4),
                  grams = holdings.grams + EXCLUDED.grams,
                  product_label = EXCLUDED.product_label
                """,
                userId, symbol, grams, unitCost, compoundSlug, productLabel);
    }

    /** Sells grams from a holding at the given bid, credits the proceeds and returns the new balance. */
    @Transactional
    public SellResult sellAtBid(UUID userId, String symbol, BigDecimal grams, BigDecimal bid, String compoundSlug) {
        ensureWallet(userId);
        lockWalletAndReadBalance(userId);
        List<Map<String, Object>> holdingRows = jdbc.queryForList(
                """
                SELECT grams FROM holdings
                WHERE user_id = ? AND symbol = ? AND compound_slug = ? FOR UPDATE
                """,
                userId, symbol, compoundSlug);
        if (holdingRows.isEmpty()) {
            return SellResult.fail("no_holding");
        }
        BigDecimal ownedGrams = (BigDecimal) holdingRows.getFirst().get("grams");
        if (ownedGrams.compareTo(grams) < 0) {
            return SellResult.fail("over_holding");
        }

        BigDecimal remainingGrams = ownedGrams.subtract(grams).setScale(LedgerRules.AMOUNT_SCALE, RoundingMode.HALF_UP);
        if (remainingGrams.signum() <= 0) {
            jdbc.update(
                    "DELETE FROM holdings WHERE user_id = ? AND symbol = ? AND compound_slug = ?",
                    userId, symbol, compoundSlug);
        } else {
            jdbc.update(
                    "UPDATE holdings SET grams = ? WHERE user_id = ? AND symbol = ? AND compound_slug = ?",
                    remainingGrams, userId, symbol, compoundSlug);
        }

        BigDecimal proceeds = LedgerRules.proceeds(bid, grams);
        addToBalance(userId, proceeds);
        jdbc.update(
                """
                INSERT INTO ledger (id, user_id, kind, elx, symbol, grams, compound_slug, created_at)
                VALUES (?, ?, 'sell', ?, ?, ?, ?, NOW())
                """,
                UUID.randomUUID(), userId, proceeds, symbol, grams, compoundSlug);
        BigDecimal newBalance = readBalance(userId);
        return SellResult.ok(symbol, grams, bid, proceeds, newBalance);
    }

    /** Takes a row lock on the wallet for the rest of the transaction and returns its balance. */
    private BigDecimal lockWalletAndReadBalance(UUID userId) {
        return jdbc.queryForObject(
                "SELECT balance_elx FROM wallets WHERE user_id = ? FOR UPDATE", BigDecimal.class, userId);
    }

    private BigDecimal readBalance(UUID userId) {
        return jdbc.queryForObject(
                "SELECT balance_elx FROM wallets WHERE user_id = ?", BigDecimal.class, userId);
    }

    private boolean hasOrderLedgerEntry(UUID orderId, String kind) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id FROM ledger WHERE order_id = ? AND kind = ?", orderId, kind);
        return !rows.isEmpty();
    }

    /** Adds a signed amount to the balance (negative to charge) and bumps updated_at. */
    private void addToBalance(UUID userId, BigDecimal signedAmount) {
        jdbc.update(
                "UPDATE wallets SET balance_elx = balance_elx + ?, updated_at = NOW() WHERE user_id = ?",
                signedAmount, userId);
    }

    private void insertOrderLedgerEntry(
            String kind, UUID userId, BigDecimal amount, String symbol, BigDecimal grams, UUID orderId) {
        jdbc.update(
                """
                INSERT INTO ledger (id, user_id, kind, elx, symbol, grams, order_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                """,
                UUID.randomUUID(), userId, kind, amount, symbol, grams, orderId);
    }

    /** Result of a desk sale: either a failure reason ("no_holding" / "over_holding") or the sale figures. */
    public record SellResult(
            boolean ok,
            String reason,
            String symbol,
            BigDecimal grams,
            BigDecimal bid,
            BigDecimal proceeds,
            BigDecimal balanceElx) {

        static SellResult fail(String reason) {
            return new SellResult(false, reason, null, null, null, null, null);
        }

        static SellResult ok(
                String symbol, BigDecimal grams, BigDecimal bid, BigDecimal proceeds, BigDecimal balanceElx) {
            return new SellResult(true, null, symbol, grams, bid, proceeds, balanceElx);
        }
    }
}
