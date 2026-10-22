package com.elementmarket.inventory.application;

import com.elementmarket.inventory.domain.Grams;
import com.elementmarket.inventory.domain.ReserveOutcome;
import com.elementmarket.inventory.infrastructure.JdbcOutbox;
import com.elementmarket.inventory.infrastructure.JdbcStockRepository;
import com.elementmarket.inventory.infrastructure.OutboxRelay;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static com.elementmarket.inventory.domain.ReserveOutcome.*;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Runs the application service against a real Postgres to prove the transaction guarantees the unit tests
 * cannot: row locks under concurrency, stock + outbox committing together and the CHECK constraints.
 */
@Testcontainers(disabledWithoutDocker = true)
class InventoryServiceIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    private static final Grams DEFAULT_STOCK = Grams.of("100");

    private static JdbcTemplate jdbc;
    private static TransactionTemplate tx;
    private final ObjectMapper mapper = new ObjectMapper();
    private InventoryService service;

    @BeforeAll
    static void createSchema() {
        DriverManagerDataSource dataSource =
                new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        new ResourceDatabasePopulator(new ClassPathResource("schema.sql")).execute(dataSource);
        jdbc = new JdbcTemplate(dataSource);
        tx = new TransactionTemplate(new DataSourceTransactionManager(dataSource));
    }

    @BeforeEach
    void setUp() {
        jdbc.execute("TRUNCATE stock_items, stock_reservations, outbox, processed_messages");
        service = new InventoryService(new JdbcStockRepository(jdbc), new JdbcOutbox(jdbc, mapper), tx, DEFAULT_STOCK);
    }

    @Test
    void concurrentReservationsNeverOversell() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Callable<ReserveOutcome>> orders = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            orders.add(() -> service.reserveForOrder(submitted(UUID.randomUUID()), "au", new BigDecimal("10")).orElseThrow());
        }
        List<ReserveOutcome> outcomes = new ArrayList<>();
        for (Future<ReserveOutcome> outcome : pool.invokeAll(orders)) {
            outcomes.add(outcome.get());
        }
        pool.shutdown();

        assertEquals(10, outcomes.stream().filter(o -> o == RESERVED).count());
        assertEquals(10, outcomes.stream().filter(o -> o == INSUFFICIENT_STOCK).count());
        assertEquals(0, new BigDecimal("100").compareTo(reservedOf("AU")));
        assertEquals(10, countOutbox("StockReservedEvent"));
        assertEquals(10, countOutbox("StockReservationFailedEvent"));
    }

    @Test
    void aRedeliveredMessageIsAppliedOnceAndAReplayIsConfirmedWithoutReservingAgain() {
        UUID order = UUID.randomUUID();
        Delivery delivery = submitted(order);
        assertEquals(RESERVED, service.reserveForOrder(delivery, "AU", new BigDecimal("10")).orElseThrow());
        assertTrue(service.reserveForOrder(delivery, "AU", new BigDecimal("10")).isEmpty(), "same delivery skipped");
        assertEquals(ALREADY_RESERVED,
                service.reserveForOrder(submitted(order), "AU", new BigDecimal("10")).orElseThrow());

        assertEquals(0, new BigDecimal("10").compareTo(reservedOf("AU")));
        assertEquals(2, countOutbox("StockReservedEvent"), "the replay is confirmed again");
    }

    @Test
    void stockAndOutboxCommitOrRollBackTogether() {
        Outbox broken = (type, payload) -> { throw new IllegalStateException("outbox down"); };
        InventoryService failing =
                new InventoryService(new JdbcStockRepository(jdbc), broken, tx, DEFAULT_STOCK);
        UUID order = UUID.randomUUID();
        Delivery delivery = submitted(order);

        assertThrows(IllegalStateException.class, () -> failing.reserveForOrder(delivery, "AU", new BigDecimal("10")));

        assertEquals(0, count("stock_items"), "seed and reservation rolled back");
        assertEquals(0, count("stock_reservations"));
        assertEquals(0, count("processed_messages"), "dedupe mark rolled back, so the redelivery is applied");
        assertEquals(RESERVED, service.reserveForOrder(delivery, "AU", new BigDecimal("10")).orElseThrow());
        assertEquals(0, new BigDecimal("10").compareTo(reservedOf("AU")));
    }

    @Test
    void releaseAndFulfilMoveTheReservedRowExactlyOnce() {
        UUID released = UUID.randomUUID();
        service.reserveForOrder(submitted(released), "AU", new BigDecimal("10"));
        // The release event names another symbol: the reservation row, not the event, decides what is given back.
        service.releaseOrder(delivery("OrderStockReleaseEvent", released), "FE");
        service.releaseOrder(delivery("OrderStockReleaseEvent", released), "AU");
        assertEquals(0, reservedOf("AU").signum());
        assertEquals("Released", statusOf(released));
        assertEquals(ALREADY_HANDLED,
                service.reserveForOrder(submitted(released), "AU", new BigDecimal("10")).orElseThrow());

        UUID shipped = UUID.randomUUID();
        service.reserveForOrder(submitted(shipped), "AU", new BigDecimal("10"));
        service.fulfillOrder(delivery("OrderCompletedEvent", shipped));
        service.fulfillOrder(delivery("OrderCompletedEvent", shipped));
        service.releaseOrder(delivery("OrderStockReleaseEvent", shipped), "AU");
        assertEquals(0, new BigDecimal("90").compareTo(stockOf("AU")));
        assertEquals(0, reservedOf("AU").signum());
        assertEquals("Fulfilled", statusOf(shipped));
        assertEquals(2, countOutbox("StockReservedEvent"), "a closed order is never announced again");
    }

    @Test
    void aReleaseBeforeItsReservationStopsTheLateSubmit() {
        UUID order = UUID.randomUUID();
        service.releaseOrder(delivery("OrderStockReleaseEvent", order), null);
        assertEquals("Released", statusOf(order));

        assertEquals(ALREADY_HANDLED, service.reserveForOrder(submitted(order), "AU", new BigDecimal("10")).orElseThrow());
        assertEquals(0, count("stock_items"), "nothing was reserved");
        assertEquals(0, count("outbox"));
    }

    @Test
    void restockAddsSoldGramsOncePerSale() {
        UUID sale = UUID.randomUUID();
        service.restock(delivery("ElementSoldEvent", null), sale, "au", Grams.of("2.5"));
        service.restock(delivery("ElementSoldEvent", null), sale, "au", Grams.of("2.5"));

        assertEquals(0, new BigDecimal("102.5").compareTo(stockOf("AU")));
        assertEquals("Sold", statusOf(sale));
    }

    @Test
    void refusedReservationsCarryTheWireReasons() {
        UUID invalid = UUID.randomUUID();
        UUID tooMuch = UUID.randomUUID();
        assertEquals(INVALID_QUANTITY, service.reserveForOrder(submitted(invalid), "AU", BigDecimal.ZERO).orElseThrow());
        assertEquals(INVALID_QUANTITY, service.reserveForOrder(submitted(UUID.randomUUID()), null, BigDecimal.ONE).orElseThrow());
        assertEquals(INSUFFICIENT_STOCK,
                service.reserveForOrder(submitted(tooMuch), "AU", new BigDecimal("100.0001")).orElseThrow());

        assertEquals("Quantity must be positive.", reasonFor(invalid));
        assertEquals("Insufficient stock. Available: 100.0000g.", reasonFor(tooMuch));
    }

    @Test
    void theDatabaseRejectsNegativeStockAndOversellingEvenIfCodeTriedIt() {
        service.reserveForOrder(submitted(UUID.randomUUID()), "AU", new BigDecimal("10"));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE stock_items SET stock_grams = -1, reserved_grams = 0 WHERE symbol = 'AU'"));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE stock_items SET reserved_grams = stock_grams + 1 WHERE symbol = 'AU'"));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE stock_reservations SET status = 'Lost'"));
    }

    @Test
    void thePublicReadNeverWrites() {
        assertEquals(DEFAULT_STOCK, service.stockOf("fe").available());
        assertEquals("FE", service.stockOf("fe").symbol());
        assertEquals(0, count("stock_items"));
    }

    @Test
    void theRelayPublishesEachPendingEventOnceWithItsRowIdAsMessageId() {
        service.reserveForOrder(submitted(UUID.randomUUID()), "AU", new BigDecimal("10"));
        UUID rowId = jdbc.queryForObject("SELECT id FROM outbox", UUID.class);

        List<UUID> sent = new ArrayList<>();
        OutboxRelay failingRelay = new OutboxRelay(jdbc, tx, (id, type, json) -> { throw new IllegalStateException("broker down"); });
        assertThrows(IllegalStateException.class, failingRelay::publishPending);
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM outbox WHERE published_at IS NULL", Integer.class),
                "a failed publish leaves the row pending");

        OutboxRelay relay = new OutboxRelay(jdbc, tx, (id, type, json) -> sent.add(id));
        relay.publishPending();
        relay.publishPending();
        assertEquals(List.of(rowId), sent);
    }

    private static Delivery submitted(UUID orderId) {
        return delivery("OrderSubmittedEvent", orderId);
    }

    private static Delivery delivery(String eventType, UUID orderId) {
        return new Delivery(UUID.randomUUID(), eventType, orderId);
    }

    private static BigDecimal stockOf(String symbol) {
        return jdbc.queryForObject("SELECT stock_grams FROM stock_items WHERE symbol = ?", BigDecimal.class, symbol);
    }

    private static BigDecimal reservedOf(String symbol) {
        return jdbc.queryForObject("SELECT reserved_grams FROM stock_items WHERE symbol = ?", BigDecimal.class, symbol);
    }

    private static String statusOf(UUID id) {
        return jdbc.queryForObject("SELECT status FROM stock_reservations WHERE order_id = ?", String.class, id);
    }

    private static String reasonFor(UUID orderId) {
        return jdbc.queryForObject(
                "SELECT payload->>'reason' FROM outbox WHERE payload->>'orderId' = ?", String.class, orderId.toString());
    }

    private static int count(String table) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table, Integer.class);
    }

    private static int countOutbox(String eventType) {
        return jdbc.queryForObject("SELECT count(*) FROM outbox WHERE event_type = ?", Integer.class, eventType);
    }
}
