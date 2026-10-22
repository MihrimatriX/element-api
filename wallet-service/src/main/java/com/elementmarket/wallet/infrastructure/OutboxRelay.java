package com.elementmarket.wallet.infrastructure;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.UUID;

/**
 * Sends committed outbox rows to the broker, oldest first, one row per transaction: the row stays locked
 * (SKIP LOCKED lets a second instance take the next one) until the broker confirms, then it is marked
 * published. A crash between confirm and mark re-sends that row with the same message id, which consumers
 * dedupe: delivery is at least once, never lost.
 */
@Component
public class OutboxRelay {

    private static final Logger log = LoggerFactory.getLogger(OutboxRelay.class);
    private static final int MAX_ROWS_PER_TICK = 100;

    /** Broker side of the relay; must return only after the broker has accepted the message. */
    @FunctionalInterface
    public interface Publisher {
        void publish(UUID messageId, String eventType, String payloadJson);
    }

    private record PendingEvent(UUID id, String eventType, String payload) {}

    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final Publisher publisher;

    public OutboxRelay(JdbcTemplate jdbc, TransactionTemplate tx, Publisher publisher) {
        this.jdbc = jdbc;
        this.tx = tx;
        this.publisher = publisher;
    }

    @Scheduled(fixedDelayString = "${wallet.outbox.poll-ms:500}")
    public void poll() {
        try {
            publishPending();
        } catch (RuntimeException e) {
            log.warn("Outbox relay paused, will retry: {}", e.toString());
        }
    }

    /** Publishes pending rows until none are left (or the per-tick cap); stops at the first failure. */
    public void publishPending() {
        for (int sent = 0; sent < MAX_ROWS_PER_TICK; sent++) {
            Boolean published = tx.execute(status -> publishOldest());
            if (!Boolean.TRUE.equals(published)) {
                return;
            }
        }
    }

    private boolean publishOldest() {
        List<PendingEvent> next = jdbc.query(
                """
                SELECT id, event_type, payload::text FROM outbox
                WHERE published_at IS NULL
                ORDER BY created_at
                LIMIT 1 FOR UPDATE SKIP LOCKED
                """,
                (row, i) -> new PendingEvent(row.getObject(1, UUID.class), row.getString(2), row.getString(3)));
        if (next.isEmpty()) {
            return false;
        }
        PendingEvent event = next.getFirst();
        publisher.publish(event.id(), event.eventType(), event.payload());
        jdbc.update("UPDATE outbox SET published_at = NOW() WHERE id = ?", event.id());
        return true;
    }
}
