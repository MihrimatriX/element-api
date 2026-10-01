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

/**
 * JDBC access to per-symbol stock and per-order reservations.
 * A stock_reservations row moves Reserved -> Released or Fulfilled; desk sales are stored as "Sold" rows
 * so the same table also makes restocks idempotent.
 */
@Repository
public class StockRepository {

    private static final String STATUS_RESERVED = "Reserved";
    /** Placeholder symbol for a release that arrives before (or without) its reservation. */
    private static final String UNKNOWN_SYMBOL = "?";

    private final JdbcTemplate jdbc;
    private final InventorySettings settings;

    public StockRepository(JdbcTemplate jdbc, InventorySettings settings) {
        this.jdbc = jdbc;
        this.settings = settings;
    }

    /**
     * Records a message id once; returns false when it was already processed (idempotent consumer).
     * Joins the listener's transaction: the mark commits or rolls back together with the stock work.
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

    /** Seeds the symbol with the default stock on first touch, then locks and returns its row. */
    @Transactional
    public Map<String, Object> ensureItem(String symbol) {
        String upperSymbol = symbol.toUpperCase(Locale.ROOT);
        jdbc.update(
                """
                INSERT INTO stock_items (symbol, stock_grams, reserved_grams)
                VALUES (?, ?, 0) ON CONFLICT (symbol) DO NOTHING
                """,
                upperSymbol, BigDecimal.valueOf(settings.defaultStockGrams()));
        return jdbc.queryForMap(
                "SELECT stock_grams, reserved_grams FROM stock_items WHERE symbol = ? FOR UPDATE", upperSymbol);
    }

    /**
     * Returns stock, reserved and available grams for a symbol (response body of GET /api/v1/stock/{symbol}).
     * Public, anonymous read: never INSERT or lock. An unseen symbol reports the default seed it would get.
     */
    public Map<String, Object> getStock(String symbol) {
        String upperSymbol = symbol.toUpperCase(Locale.ROOT);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT stock_grams, reserved_grams FROM stock_items WHERE symbol = ?", upperSymbol);
        boolean unseenSymbol = rows.isEmpty();
        BigDecimal stockGrams = unseenSymbol
                ? BigDecimal.valueOf(settings.defaultStockGrams())
                : (BigDecimal) rows.getFirst().get("stock_grams");
        BigDecimal reservedGrams = unseenSymbol
                ? BigDecimal.ZERO
                : (BigDecimal) rows.getFirst().get("reserved_grams");
        return Map.of(
                "symbol", upperSymbol,
                "stockGrams", stockGrams.doubleValue(),
                "reservedGrams", reservedGrams.doubleValue(),
                "availableGrams", stockGrams.subtract(reservedGrams).doubleValue());
    }

    /** Returns the order's reservation status (Reserved / Released / Fulfilled / Sold), or null if none. */
    @Transactional
    public String reservationStatus(UUID orderId) {
        List<String> statuses = jdbc.query(
                "SELECT status FROM stock_reservations WHERE order_id = ?",
                (resultSet, rowNumber) -> resultSet.getString(1),
                orderId);
        if (statuses.isEmpty()) {
            return null;
        }
        return statuses.getFirst();
    }

    /** Reserves grams for an order once; a second call reports the existing outcome instead of reserving twice. */
    @Transactional
    public ReserveResult reserve(UUID orderId, String symbol, BigDecimal quantity) {
        String existingStatus = reservationStatus(orderId);
        if (existingStatus != null) {
            if (STATUS_RESERVED.equals(existingStatus)) {
                return ReserveResult.ALREADY_RESERVED;
            }
            return ReserveResult.ALREADY_HANDLED;
        }

        Map<String, Object> item = ensureItem(symbol);
        BigDecimal stockGrams = (BigDecimal) item.get("stock_grams");
        BigDecimal reservedGrams = (BigDecimal) item.get("reserved_grams");
        if (!StockRules.canReserve(stockGrams, reservedGrams, quantity)) {
            BigDecimal availableGrams = StockRules.available(stockGrams, reservedGrams);
            return ReserveResult.insufficient(availableGrams);
        }

        String upperSymbol = symbol.toUpperCase(Locale.ROOT);
        jdbc.update(
                "UPDATE stock_items SET reserved_grams = reserved_grams + ? WHERE symbol = ?",
                quantity, upperSymbol);
        jdbc.update(
                """
                INSERT INTO stock_reservations (order_id, element_symbol, quantity, status)
                VALUES (?, ?, ?, 'Reserved')
                """,
                orderId, upperSymbol, quantity);
        return ReserveResult.OK;
    }

    /**
     * Gives reserved grams back for a cancelled or failed order. When the release arrives before the reservation,
     * a "Released" row is written so the late OrderSubmitted is ignored instead of reserving stock forever.
     */
    @Transactional
    public void release(UUID orderId, String symbol, BigDecimal quantity) {
        List<Map<String, Object>> reservations = jdbc.queryForList(
                "SELECT status, element_symbol, quantity FROM stock_reservations WHERE order_id = ? FOR UPDATE",
                orderId);
        if (reservations.isEmpty()) {
            String symbolToRecord = symbol == null || symbol.isBlank()
                    ? UNKNOWN_SYMBOL
                    : symbol.toUpperCase(Locale.ROOT);
            jdbc.update(
                    """
                    INSERT INTO stock_reservations (order_id, element_symbol, quantity, status)
                    VALUES (?, ?, ?, 'Released')
                    """,
                    orderId, symbolToRecord, quantity);
            return;
        }

        Map<String, Object> reservation = reservations.getFirst();
        if (!STATUS_RESERVED.equals(reservation.get("status"))) {
            return;
        }
        // Trust the reservation row, not the event, for what to give back.
        String reservedSymbol = String.valueOf(reservation.get("element_symbol"));
        BigDecimal reservedQuantity = (BigDecimal) reservation.get("quantity");
        ensureItem(reservedSymbol);
        jdbc.update(
                "UPDATE stock_items SET reserved_grams = GREATEST(0, reserved_grams - ?) WHERE symbol = ?",
                reservedQuantity, reservedSymbol);
        jdbc.update("UPDATE stock_reservations SET status = 'Released' WHERE order_id = ?", orderId);
    }

    /**
     * Permanently removes the grams of a completed order from stock and clears its reservation.
     * Like {@link #release}, it deducts what was actually reserved, not whatever the completion event claims.
     */
    @Transactional
    public void fulfill(UUID orderId) {
        List<Map<String, Object>> reservations = jdbc.queryForList(
                "SELECT status, element_symbol, quantity FROM stock_reservations WHERE order_id = ? FOR UPDATE",
                orderId);
        if (reservations.isEmpty()) {
            return;
        }
        Map<String, Object> reservation = reservations.getFirst();
        if (!STATUS_RESERVED.equals(reservation.get("status"))) {
            return;
        }
        String reservedSymbol = String.valueOf(reservation.get("element_symbol"));
        BigDecimal reservedQuantity = (BigDecimal) reservation.get("quantity");
        ensureItem(reservedSymbol);
        jdbc.update(
                """
                UPDATE stock_items
                SET stock_grams = GREATEST(0, stock_grams - ?),
                    reserved_grams = GREATEST(0, reserved_grams - ?)
                WHERE symbol = ?
                """,
                reservedQuantity, reservedQuantity, reservedSymbol);
        jdbc.update("UPDATE stock_reservations SET status = 'Fulfilled' WHERE order_id = ?", orderId);
    }

    /** Puts grams sold back at the desk into stock, once per sale id. */
    @Transactional
    public void restock(UUID saleId, String symbol, BigDecimal grams) {
        if (hasReservationRow(saleId)) {
            return;
        }
        ensureItem(symbol);
        String upperSymbol = symbol.toUpperCase(Locale.ROOT);
        jdbc.update("UPDATE stock_items SET stock_grams = stock_grams + ? WHERE symbol = ?", grams, upperSymbol);
        jdbc.update(
                """
                INSERT INTO stock_reservations (order_id, element_symbol, quantity, status)
                VALUES (?, ?, ?, 'Sold')
                """,
                saleId, upperSymbol, grams);
    }

    private boolean hasReservationRow(UUID orderOrSaleId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT 1 FROM stock_reservations WHERE order_id = ?", orderOrSaleId);
        return !rows.isEmpty();
    }

    /**
     * Outcome of {@link #reserve}: ok (newly or already reserved), already handled (released/fulfilled),
     * or insufficient with the grams that were available.
     */
    public record ReserveResult(boolean ok, boolean alreadyReserved, BigDecimal available) {
        static final ReserveResult OK = new ReserveResult(true, false, null);
        static final ReserveResult ALREADY_RESERVED = new ReserveResult(true, true, null);
        static final ReserveResult ALREADY_HANDLED = new ReserveResult(false, false, null);

        static ReserveResult insufficient(BigDecimal available) {
            return new ReserveResult(false, false, available);
        }
    }
}
