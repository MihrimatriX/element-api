package com.elementmarket.wallet.application;

import com.elementmarket.wallet.domain.ChargeOutcome;
import com.elementmarket.wallet.domain.Grams;
import com.elementmarket.wallet.domain.Money;
import com.elementmarket.wallet.infrastructure.JdbcOutbox;
import com.elementmarket.wallet.infrastructure.JdbcWalletRepository;
import com.elementmarket.wallet.infrastructure.OutboxRelay;
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

import static org.junit.jupiter.api.Assertions.*;

/**
 * Runs the application service against a real Postgres to prove the transaction guarantees the unit tests
 * cannot: row locks under concurrency, ledger + outbox committing together and the CHECK constraints.
 */
@Testcontainers(disabledWithoutDocker = true)
class WalletServiceIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    private static final Money LIMIT = Money.of("50000");
    private static final Money GRANT = Money.of("100");

    private static JdbcTemplate jdbc;
    private static TransactionTemplate tx;
    private final ObjectMapper mapper = new ObjectMapper();
    private WalletService service;

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
        jdbc.execute("TRUNCATE outbox, processed_messages");
        service = new WalletService(new JdbcWalletRepository(jdbc), new JdbcOutbox(jdbc, mapper), tx, LIMIT, GRANT);
    }

    @Test
    void concurrentChargesNeverOverdraw() throws Exception {
        UUID user = UUID.randomUUID();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Callable<ChargeOutcome>> charges = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            charges.add(() -> service.chargeOrder(delivery("PaymentRequestedEvent"), user,
                    new BigDecimal("10"), "FE", Grams.of("1")).orElseThrow());
        }
        List<ChargeOutcome> outcomes = new ArrayList<>();
        for (Future<ChargeOutcome> outcome : pool.invokeAll(charges)) {
            outcomes.add(outcome.get());
        }
        pool.shutdown();

        assertEquals(10, outcomes.stream().filter(o -> o == ChargeOutcome.CHARGED).count());
        assertEquals(10, outcomes.stream().filter(o -> o == ChargeOutcome.INSUFFICIENT_FUNDS).count());
        assertEquals(0, balanceOf(user).signum());
        assertEquals(10, countOutbox("PaymentProcessedEvent"));
        assertEquals(10, countOutbox("PaymentFailedEvent"));
    }

    @Test
    void aRedeliveredMessageIsAppliedOnce() {
        UUID user = UUID.randomUUID();
        Delivery delivery = delivery("PaymentRequestedEvent");
        assertTrue(service.chargeOrder(delivery, user, new BigDecimal("30"), "FE", Grams.of("1")).isPresent());
        assertTrue(service.chargeOrder(delivery, user, new BigDecimal("30"), "FE", Grams.of("1")).isEmpty());

        assertEquals(0, new BigDecimal("70").compareTo(balanceOf(user)));
        assertEquals(1, countOutbox("PaymentProcessedEvent"));
    }

    @Test
    void ledgerAndOutboxCommitOrRollBackTogether() {
        UUID user = UUID.randomUUID();
        service.walletOf(user);
        Outbox broken = (type, payload) -> { throw new IllegalStateException("outbox down"); };
        WalletService failing = new WalletService(new JdbcWalletRepository(jdbc), broken, tx, LIMIT, GRANT);
        Delivery delivery = delivery("PaymentRequestedEvent");

        assertThrows(IllegalStateException.class,
                () -> failing.chargeOrder(delivery, user, new BigDecimal("30"), "FE", Grams.of("1")));

        assertEquals(0, new BigDecimal("100").compareTo(balanceOf(user)), "charge rolled back");
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM processed_messages", Integer.class),
                "dedupe mark rolled back, so the redelivery is applied");
        assertTrue(service.chargeOrder(delivery, user, new BigDecimal("30"), "FE", Grams.of("1")).isPresent());
    }

    @Test
    void refundReturnsTheChargeAndAssetsNeedAPaidOrder() {
        UUID user = UUID.randomUUID();
        UUID order = UUID.randomUUID();
        service.chargeOrder(new Delivery(UUID.randomUUID(), "PaymentRequestedEvent", order), user,
                new BigDecimal("40"), "AU", Grams.of("2"));
        service.creditAssets(new Delivery(UUID.randomUUID(), "AssetsCreditedEvent", order), user,
                "AU", Grams.of("2"), Money.of("40"), "elemental", null);
        assertEquals(Grams.of("2"), service.holdingsOf(user).getFirst().grams());
        assertEquals(Money.of("20"), service.holdingsOf(user).getFirst().averageCost());

        service.refundOrder(new Delivery(UUID.randomUUID(), "PaymentRefundRequestedEvent", order), user, "AU", Grams.of("2"));
        assertEquals(0, new BigDecimal("100").compareTo(balanceOf(user)));

        UUID unpaid = UUID.randomUUID();
        assertThrows(IllegalStateException.class, () -> service.creditAssets(
                new Delivery(UUID.randomUUID(), "AssetsCreditedEvent", unpaid), user,
                "AU", Grams.of("1"), Money.of("10"), "elemental", null));
    }

    @Test
    void sellCreditsProceedsAndQueuesElementSoldInTheSameTransaction() {
        UUID user = UUID.randomUUID();
        UUID order = UUID.randomUUID();
        service.chargeOrder(new Delivery(UUID.randomUUID(), "PaymentRequestedEvent", order), user,
                new BigDecimal("40"), "AU", Grams.of("2"));
        service.creditAssets(new Delivery(UUID.randomUUID(), "AssetsCreditedEvent", order), user,
                "AU", Grams.of("2"), Money.of("40"), "elemental", null);

        assertEquals("over_holding", service.sell(user, "AU", Grams.of("3"), Money.of("25"), "elemental").failure());
        assertEquals("no_holding", service.sell(user, "AG", Grams.of("1"), Money.of("25"), "elemental").failure());

        WalletService.SaleResult sale = service.sell(user, "AU", Grams.of("2"), Money.of("25"), "elemental");
        assertNull(sale.failure());
        assertEquals(Money.of("50"), sale.proceeds());
        assertEquals(Money.of("110"), sale.balance());
        assertTrue(service.holdingsOf(user).isEmpty());
        assertEquals(1, countOutbox("ElementSoldEvent"));
    }

    @Test
    void theDatabaseRejectsANegativeBalanceEvenIfCodeTriedIt() {
        UUID user = UUID.randomUUID();
        service.walletOf(user);
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE wallets SET balance_elx = -1 WHERE user_id = ?", user));
    }

    @Test
    void theRelayPublishesEachPendingEventOnceWithItsRowIdAsMessageId() {
        UUID user = UUID.randomUUID();
        service.chargeOrder(delivery("PaymentRequestedEvent"), user, new BigDecimal("10"), "FE", Grams.of("1"));
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

    private static Delivery delivery(String eventType) {
        return new Delivery(UUID.randomUUID(), eventType, UUID.randomUUID());
    }

    private static BigDecimal balanceOf(UUID user) {
        return jdbc.queryForObject("SELECT balance_elx FROM wallets WHERE user_id = ?", BigDecimal.class, user);
    }

    private static int countOutbox(String eventType) {
        return jdbc.queryForObject("SELECT count(*) FROM outbox WHERE event_type = ?", Integer.class, eventType);
    }
}
