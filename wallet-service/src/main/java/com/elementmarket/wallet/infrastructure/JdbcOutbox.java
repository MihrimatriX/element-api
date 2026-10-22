package com.elementmarket.wallet.infrastructure;

import com.elementmarket.wallet.application.Outbox;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

/** Writes integration events to the outbox table inside the caller's transaction; {@link OutboxRelay} sends them. */
@Component
public class JdbcOutbox implements Outbox {

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public JdbcOutbox(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    @Override
    public void add(String eventType, Map<String, Object> payload) {
        try {
            jdbc.update(
                    "INSERT INTO outbox (id, event_type, payload) VALUES (?, ?, ?::jsonb)",
                    UUID.randomUUID(), eventType, mapper.writeValueAsString(payload));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("unserializable " + eventType + " payload", e);
        }
    }
}
