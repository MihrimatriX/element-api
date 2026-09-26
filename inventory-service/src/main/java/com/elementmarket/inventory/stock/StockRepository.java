package com.elementmarket.inventory.stock;

import com.elementmarket.inventory.config.RabbitConfig.InventorySettings;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Repository
public class StockRepository {

    private final JdbcTemplate jdbc;
    private final InventorySettings settings;

    public StockRepository(JdbcTemplate jdbc, InventorySettings settings) {
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
    public Map<String, Object> ensureItem(String symbol) {
        String sym = symbol.toUpperCase(Locale.ROOT);
        jdbc.update(
                """
                INSERT INTO stock_items (symbol, stock_grams, reserved_grams)
                VALUES (?, ?, 0) ON CONFLICT (symbol) DO NOTHING
                """,
                sym, BigDecimal.valueOf(settings.defaultStockGrams()));
        return jdbc.queryForMap(
                "SELECT stock_grams, reserved_grams FROM stock_items WHERE symbol = ? FOR UPDATE", sym);
    }

    @Transactional
    public Map<String, Object> getStock(String symbol) {
        Map<String, Object> item = ensureItem(symbol);
        String sym = symbol.toUpperCase(Locale.ROOT);
        BigDecimal stock = (BigDecimal) item.get("stock_grams");
        BigDecimal reserved = (BigDecimal) item.get("reserved_grams");
        return Map.of(
                "symbol", sym,
                "stockGrams", stock.doubleValue(),
                "reservedGrams", reserved.doubleValue(),
                "availableGrams", stock.subtract(reserved).doubleValue());
    }

    @Transactional
    public String reservationStatus(UUID orderId) {
        List<String> rows = jdbc.query(
                "SELECT status FROM stock_reservations WHERE order_id = ?",
                (rs, i) -> rs.getString(1),
                orderId);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    @Transactional
    public ReserveResult reserve(UUID orderId, String symbol, BigDecimal quantity) {
        String existing = reservationStatus(orderId);
        if (existing != null) {
            return "Reserved".equals(existing) ? ReserveResult.ALREADY_RESERVED : ReserveResult.ALREADY_HANDLED;
        }
        Map<String, Object> item = ensureItem(symbol);
        BigDecimal available = StockRules.available(
                (BigDecimal) item.get("stock_grams"), (BigDecimal) item.get("reserved_grams"));
        if (!StockRules.canReserve(
                (BigDecimal) item.get("stock_grams"),
                (BigDecimal) item.get("reserved_grams"),
                quantity)) {
            return ReserveResult.insufficient(available);
        }
        String sym = symbol.toUpperCase(Locale.ROOT);
        jdbc.update(
                "UPDATE stock_items SET reserved_grams = reserved_grams + ? WHERE symbol = ?",
                quantity, sym);
        jdbc.update(
                """
                INSERT INTO stock_reservations (order_id, element_symbol, quantity, status)
                VALUES (?, ?, ?, 'Reserved')
                """,
                orderId, sym, quantity);
        return ReserveResult.OK;
    }

    @Transactional
    public void release(UUID orderId, String symbol, BigDecimal quantity) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT status, element_symbol, quantity FROM stock_reservations WHERE order_id = ? FOR UPDATE",
                orderId);
        if (rows.isEmpty()) {
            jdbc.update(
                    """
                    INSERT INTO stock_reservations (order_id, element_symbol, quantity, status)
                    VALUES (?, ?, ?, 'Released')
                    """,
                    orderId,
                    symbol == null || symbol.isBlank() ? "?" : symbol.toUpperCase(Locale.ROOT),
                    quantity);
            return;
        }
        if (!"Reserved".equals(rows.getFirst().get("status"))) return;
        String sym = String.valueOf(rows.getFirst().get("element_symbol"));
        BigDecimal qty = (BigDecimal) rows.getFirst().get("quantity");
        ensureItem(sym);
        jdbc.update(
                "UPDATE stock_items SET reserved_grams = GREATEST(0, reserved_grams - ?) WHERE symbol = ?",
                qty, sym);
        jdbc.update("UPDATE stock_reservations SET status = 'Released' WHERE order_id = ?", orderId);
    }

    @Transactional
    public void fulfill(UUID orderId, String symbol, BigDecimal quantity) {
        String status = reservationStatus(orderId);
        if (status == null || !"Reserved".equals(status)) return;
        ensureItem(symbol);
        jdbc.update(
                """
                UPDATE stock_items
                SET stock_grams = GREATEST(0, stock_grams - ?),
                    reserved_grams = GREATEST(0, reserved_grams - ?)
                WHERE symbol = ?
                """,
                quantity, quantity, symbol.toUpperCase(Locale.ROOT));
        jdbc.update("UPDATE stock_reservations SET status = 'Fulfilled' WHERE order_id = ?", orderId);
    }

    @Transactional
    public void restock(UUID saleId, String symbol, BigDecimal grams) {
        Integer exists = jdbc.queryForList(
                        "SELECT 1 FROM stock_reservations WHERE order_id = ?", saleId)
                .isEmpty()
                ? 0
                : 1;
        if (exists == 1) return;
        ensureItem(symbol);
        String sym = symbol.toUpperCase(Locale.ROOT);
        jdbc.update("UPDATE stock_items SET stock_grams = stock_grams + ? WHERE symbol = ?", grams, sym);
        jdbc.update(
                """
                INSERT INTO stock_reservations (order_id, element_symbol, quantity, status)
                VALUES (?, ?, ?, 'Sold')
                """,
                saleId, sym, grams);
    }

    public record ReserveResult(boolean ok, boolean alreadyReserved, BigDecimal available) {
        static final ReserveResult OK = new ReserveResult(true, false, null);
        static final ReserveResult ALREADY_RESERVED = new ReserveResult(true, true, null);
        static final ReserveResult ALREADY_HANDLED = new ReserveResult(false, false, null);
        static ReserveResult insufficient(BigDecimal available) {
            return new ReserveResult(false, false, available);
        }
    }
}
