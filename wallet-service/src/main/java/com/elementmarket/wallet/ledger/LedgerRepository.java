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

@Repository
public class LedgerRepository {

    public enum DebitResult { OK, DUPLICATE, INSUFFICIENT, LIMIT }

    private final JdbcTemplate jdbc;
    private final WalletSettings settings;

    public LedgerRepository(JdbcTemplate jdbc, WalletSettings settings) {
        this.jdbc = jdbc;
        this.settings = settings;
    }

    @Transactional
    public boolean tryMarkProcessed(UUID messageId, String eventType, UUID orderId) {
        int n = jdbc.update(
                """
                INSERT INTO processed_messages (message_id, event_type, order_id)
                VALUES (?, ?, ?) ON CONFLICT DO NOTHING
                """,
                messageId, eventType, orderId);
        return n == 1;
    }

    @Transactional
    public BigDecimal ensureWallet(UUID userId) {
        // Local default 10000; public compose sets WALLET_WELCOME_GRANT=1000 (signup grinding).
        BigDecimal grant = BigDecimal.valueOf(settings.welcomeGrant());
        int inserted = jdbc.update(
                """
                INSERT INTO wallets (user_id, balance_elx, updated_at)
                VALUES (?, ?, NOW()) ON CONFLICT (user_id) DO NOTHING
                """,
                userId, grant);
        if (inserted > 0) {
            jdbc.update(
                    """
                    INSERT INTO ledger (id, user_id, kind, elx, created_at)
                    VALUES (?, ?, 'grant', ?, NOW())
                    """,
                    UUID.randomUUID(), userId, grant);
        }
        return jdbc.queryForObject(
                "SELECT balance_elx FROM wallets WHERE user_id = ?", BigDecimal.class, userId);
    }

    @Transactional
    public Map<String, Object> getWallet(UUID userId) {
        ensureWallet(userId);
        return jdbc.queryForMap(
                "SELECT balance_elx, updated_at FROM wallets WHERE user_id = ?", userId);
    }

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

    @Transactional
    public DebitResult debit(UUID userId, UUID orderId, BigDecimal amount, String symbol, BigDecimal grams) {
        if (LedgerRules.evaluateDebit(amount, settings.creditLimit()) == LedgerRules.DebitGate.LIMIT) {
            return DebitResult.LIMIT;
        }
        ensureWallet(userId);
        jdbc.queryForObject(
                "SELECT balance_elx FROM wallets WHERE user_id = ? FOR UPDATE", BigDecimal.class, userId);
        if (!jdbc.queryForList(
                        "SELECT id FROM ledger WHERE order_id = ? AND kind = 'buy'", orderId)
                .isEmpty()) {
            return DebitResult.DUPLICATE;
        }

        BigDecimal balance = jdbc.queryForObject(
                "SELECT balance_elx FROM wallets WHERE user_id = ?", BigDecimal.class, userId);
        if (balance.compareTo(amount) < 0) return DebitResult.INSUFFICIENT;

        jdbc.update(
                "UPDATE wallets SET balance_elx = balance_elx - ?, updated_at = NOW() WHERE user_id = ?",
                amount, userId);
        jdbc.update(
                """
                INSERT INTO ledger (id, user_id, kind, elx, symbol, grams, order_id, created_at)
                VALUES (?, ?, 'buy', ?, ?, ?, ?, NOW())
                """,
                UUID.randomUUID(), userId, amount, symbol, grams, orderId);
        return DebitResult.OK;
    }

    @Transactional
    public void refundIfDebited(UUID userId, UUID orderId, String symbol, BigDecimal grams) {
        ensureWallet(userId);
        jdbc.queryForObject(
                "SELECT balance_elx FROM wallets WHERE user_id = ? FOR UPDATE", BigDecimal.class, userId);
        List<BigDecimal> buys = jdbc.query(
                "SELECT elx FROM ledger WHERE order_id = ? AND kind = 'buy'",
                (rs, i) -> rs.getBigDecimal(1),
                orderId);
        if (buys.isEmpty()) return;
        if (!jdbc.queryForList(
                        "SELECT id FROM ledger WHERE order_id = ? AND kind = 'refund'", orderId)
                .isEmpty()) {
            return;
        }

        BigDecimal amount = buys.getFirst();
        jdbc.update(
                "UPDATE wallets SET balance_elx = balance_elx + ?, updated_at = NOW() WHERE user_id = ?",
                amount, userId);
        jdbc.update(
                """
                INSERT INTO ledger (id, user_id, kind, elx, symbol, grams, order_id, created_at)
                VALUES (?, ?, 'refund', ?, ?, ?, ?, NOW())
                """,
                UUID.randomUUID(), userId, amount, symbol, grams, orderId);
    }

    @Transactional
    public void addHolding(
            UUID userId,
            String symbol,
            BigDecimal grams,
            BigDecimal unitCost,
            String compoundSlug,
            String productLabel) {
        ensureWallet(userId);
        jdbc.queryForObject(
                "SELECT user_id FROM wallets WHERE user_id = ? FOR UPDATE", UUID.class, userId);
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

    @Transactional
    public SellResult sellAtBid(UUID userId, String symbol, BigDecimal grams, BigDecimal bid, String compoundSlug) {
        ensureWallet(userId);
        jdbc.queryForObject(
                "SELECT user_id FROM wallets WHERE user_id = ? FOR UPDATE", UUID.class, userId);
        List<Map<String, Object>> holds = jdbc.queryForList(
                """
                SELECT grams FROM holdings
                WHERE user_id = ? AND symbol = ? AND compound_slug = ? FOR UPDATE
                """,
                userId, symbol, compoundSlug);
        if (holds.isEmpty()) return SellResult.fail("no_holding");
        BigDecimal have = (BigDecimal) holds.getFirst().get("grams");
        if (have.compareTo(grams) < 0) return SellResult.fail("over_holding");

        BigDecimal remaining = have.subtract(grams).setScale(4, RoundingMode.HALF_UP);
        if (remaining.signum() <= 0) {
            jdbc.update(
                    "DELETE FROM holdings WHERE user_id = ? AND symbol = ? AND compound_slug = ?",
                    userId, symbol, compoundSlug);
        } else {
            jdbc.update(
                    "UPDATE holdings SET grams = ? WHERE user_id = ? AND symbol = ? AND compound_slug = ?",
                    remaining, userId, symbol, compoundSlug);
        }
        BigDecimal proceeds = bid.multiply(grams).setScale(4, RoundingMode.HALF_UP);
        jdbc.update(
                "UPDATE wallets SET balance_elx = balance_elx + ?, updated_at = NOW() WHERE user_id = ?",
                proceeds, userId);
        jdbc.update(
                """
                INSERT INTO ledger (id, user_id, kind, elx, symbol, grams, compound_slug, created_at)
                VALUES (?, ?, 'sell', ?, ?, ?, ?, NOW())
                """,
                UUID.randomUUID(), userId, proceeds, symbol, grams, compoundSlug);
        BigDecimal balance = jdbc.queryForObject(
                "SELECT balance_elx FROM wallets WHERE user_id = ?", BigDecimal.class, userId);
        return SellResult.ok(symbol, grams, bid, proceeds, balance);
    }

    public record SellResult(
            boolean ok, String reason, String symbol, BigDecimal grams, BigDecimal bid,
            BigDecimal proceeds, BigDecimal balanceElx) {
        static SellResult fail(String reason) {
            return new SellResult(false, reason, null, null, null, null, null);
        }
        static SellResult ok(String symbol, BigDecimal grams, BigDecimal bid, BigDecimal proceeds, BigDecimal bal) {
            return new SellResult(true, null, symbol, grams, bid, proceeds, bal);
        }
    }
}
