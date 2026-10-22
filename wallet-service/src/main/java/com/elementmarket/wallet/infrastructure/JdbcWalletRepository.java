package com.elementmarket.wallet.infrastructure;

import com.elementmarket.wallet.application.Delivery;
import com.elementmarket.wallet.application.WalletRepository;
import com.elementmarket.wallet.domain.Grams;
import com.elementmarket.wallet.domain.Holding;
import com.elementmarket.wallet.domain.LedgerEntry;
import com.elementmarket.wallet.domain.Money;
import com.elementmarket.wallet.domain.OrderPayments;
import com.elementmarket.wallet.domain.Wallet;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** JDBC adapter of {@link WalletRepository}; plain SQL, no business rules. */
@Repository
public class JdbcWalletRepository implements WalletRepository {

    private static final RowMapper<Holding> HOLDING = (row, i) -> new Holding(
            row.getString("symbol"),
            row.getString("compound_slug"),
            row.getString("product_label"),
            Grams.of(row.getBigDecimal("grams")),
            Money.of(row.getBigDecimal("avg_cost_elx")));

    private final JdbcTemplate jdbc;

    public JdbcWalletRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean markDelivered(Delivery delivery) {
        return jdbc.update(
                """
                INSERT INTO processed_messages (message_id, event_type, order_id)
                VALUES (?, ?, ?) ON CONFLICT DO NOTHING
                """,
                delivery.messageId(), delivery.eventType(), delivery.orderId()) == 1;
    }

    @Override
    public void createIfMissing(UUID userId, Money welcomeGrant) {
        int inserted = jdbc.update(
                "INSERT INTO wallets (user_id, balance_elx) VALUES (?, ?) ON CONFLICT (user_id) DO NOTHING",
                userId, welcomeGrant.amount());
        if (inserted == 1) {
            record(LedgerEntry.grant(userId, welcomeGrant));
        }
    }

    @Override
    public Wallet lock(UUID userId) {
        Money balance = Money.of(jdbc.queryForObject(
                "SELECT balance_elx FROM wallets WHERE user_id = ? FOR UPDATE", BigDecimal.class, userId));
        return new Wallet(userId, balance);
    }

    @Override
    public OrderPayments paymentsFor(UUID orderId, UUID userId) {
        List<BigDecimal> charged = jdbc.queryForList(
                "SELECT elx FROM ledger WHERE order_id = ? AND user_id = ? AND kind = 'buy'",
                BigDecimal.class, orderId, userId);
        Boolean refunded = jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM ledger WHERE order_id = ? AND kind = 'refund')",
                Boolean.class, orderId);
        return new OrderPayments(
                charged.isEmpty() ? null : Money.of(charged.getFirst()), Boolean.TRUE.equals(refunded));
    }

    @Override
    public Optional<Holding> lockHolding(UUID userId, String symbol, String compoundSlug) {
        return jdbc.query(
                """
                SELECT symbol, compound_slug, product_label, grams, avg_cost_elx FROM holdings
                WHERE user_id = ? AND symbol = ? AND compound_slug = ? FOR UPDATE
                """,
                HOLDING, userId, symbol, compoundSlug).stream().findFirst();
    }

    @Override
    public void save(Wallet wallet) {
        jdbc.update(
                "UPDATE wallets SET balance_elx = ?, updated_at = NOW() WHERE user_id = ?",
                wallet.balance().amount(), wallet.userId());
    }

    @Override
    public void saveHolding(UUID userId, Holding holding) {
        if (holding.isEmpty()) {
            jdbc.update(
                    "DELETE FROM holdings WHERE user_id = ? AND symbol = ? AND compound_slug = ?",
                    userId, holding.symbol(), holding.compoundSlug());
            return;
        }
        jdbc.update(
                """
                INSERT INTO holdings (user_id, symbol, grams, avg_cost_elx, compound_slug, product_label)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (user_id, symbol, compound_slug) DO UPDATE SET
                  grams = EXCLUDED.grams,
                  avg_cost_elx = EXCLUDED.avg_cost_elx,
                  product_label = EXCLUDED.product_label
                """,
                userId, holding.symbol(), holding.grams().value(), holding.averageCost().amount(),
                holding.compoundSlug(), holding.productLabel());
    }

    @Override
    public void record(LedgerEntry entry) {
        jdbc.update(
                """
                INSERT INTO ledger (id, user_id, kind, elx, symbol, grams, order_id, compound_slug)
                VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, 'elemental'))
                """,
                UUID.randomUUID(),
                entry.userId(),
                entry.kind().column(),
                entry.amount().amount(),
                entry.symbol(),
                entry.grams() == null ? null : entry.grams().value(),
                entry.orderId(),
                entry.compoundSlug());
    }

    @Override
    public WalletView view(UUID userId) {
        return jdbc.queryForObject(
                "SELECT balance_elx, updated_at FROM wallets WHERE user_id = ?",
                (row, i) -> new WalletView(
                        Money.of(row.getBigDecimal("balance_elx")),
                        row.getObject("updated_at", Timestamp.class).toInstant()),
                userId);
    }

    @Override
    public List<Holding> holdings(UUID userId) {
        return jdbc.query(
                """
                SELECT symbol, compound_slug, product_label, grams, avg_cost_elx FROM holdings
                WHERE user_id = ? AND grams > 0
                ORDER BY symbol, compound_slug
                """,
                HOLDING, userId);
    }
}
