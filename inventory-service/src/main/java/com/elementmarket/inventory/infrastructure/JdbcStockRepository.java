package com.elementmarket.inventory.infrastructure;

import com.elementmarket.inventory.application.Delivery;
import com.elementmarket.inventory.application.StockRepository;
import com.elementmarket.inventory.domain.Grams;
import com.elementmarket.inventory.domain.Reservation;
import com.elementmarket.inventory.domain.StockItem;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/** JDBC adapter of {@link StockRepository}; plain SQL, no business rules. */
@Repository
public class JdbcStockRepository implements StockRepository {

    private static final RowMapper<StockItem> ITEM = (row, i) -> new StockItem(
            row.getString("symbol"),
            Grams.of(row.getBigDecimal("stock_grams")),
            Grams.of(row.getBigDecimal("reserved_grams")));

    private static final RowMapper<Reservation> RESERVATION = (row, i) -> new Reservation(
            row.getObject("order_id", UUID.class),
            row.getString("element_symbol"),
            Grams.of(row.getBigDecimal("quantity")),
            Reservation.Status.valueOf(row.getString("status").toUpperCase(Locale.ROOT)));

    private final JdbcTemplate jdbc;

    public JdbcStockRepository(JdbcTemplate jdbc) {
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
    public void createIfMissing(String symbol, Grams defaultStock) {
        jdbc.update(
                """
                INSERT INTO stock_items (symbol, stock_grams, reserved_grams)
                VALUES (?, ?, 0) ON CONFLICT (symbol) DO NOTHING
                """,
                symbol, defaultStock.value());
    }

    @Override
    public StockItem lock(String symbol) {
        return jdbc.queryForObject(
                "SELECT symbol, stock_grams, reserved_grams FROM stock_items WHERE symbol = ? FOR UPDATE",
                ITEM, symbol);
    }

    @Override
    public Optional<StockItem> find(String symbol) {
        return jdbc.query(
                "SELECT symbol, stock_grams, reserved_grams FROM stock_items WHERE symbol = ?",
                ITEM, symbol).stream().findFirst();
    }

    @Override
    public Optional<Reservation> lockReservation(UUID id) {
        return jdbc.query(
                """
                SELECT order_id, element_symbol, quantity, status FROM stock_reservations
                WHERE order_id = ? FOR UPDATE
                """,
                RESERVATION, id).stream().findFirst();
    }

    @Override
    public void save(StockItem item) {
        jdbc.update(
                "UPDATE stock_items SET stock_grams = ?, reserved_grams = ? WHERE symbol = ?",
                item.stock().value(), item.reserved().value(), item.symbol());
    }

    @Override
    public void add(Reservation reservation) {
        jdbc.update(
                """
                INSERT INTO stock_reservations (order_id, element_symbol, quantity, status)
                VALUES (?, ?, ?, ?)
                """,
                reservation.id(), reservation.symbol(), reservation.quantity().value(), reservation.status().column());
    }

    @Override
    public void save(Reservation reservation) {
        jdbc.update(
                "UPDATE stock_reservations SET status = ? WHERE order_id = ?",
                reservation.status().column(), reservation.id());
    }
}
