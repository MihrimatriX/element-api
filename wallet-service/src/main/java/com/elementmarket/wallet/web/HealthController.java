package com.elementmarket.wallet.web;

import org.springframework.amqp.rabbit.connection.Connection;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
public class HealthController {

    private final JdbcTemplate jdbc;
    private final ConnectionFactory connectionFactory;

    public HealthController(JdbcTemplate jdbc, ConnectionFactory connectionFactory) {
        this.jdbc = jdbc;
        this.connectionFactory = connectionFactory;
    }

    @GetMapping({"/health", "/health/ready"})
    public ResponseEntity<Map<String, Object>> health() {
        List<Map<String, Object>> checks = new ArrayList<>();
        long dbStart = System.nanoTime();
        boolean dbOk = false;
        try {
            jdbc.queryForObject("SELECT 1", Integer.class);
            dbOk = true;
        } catch (Exception ignored) {
        }
        checks.add(check("PostgreSQL", dbOk, (System.nanoTime() - dbStart) / 1_000_000.0));

        long rabbitStart = System.nanoTime();
        boolean rabbitOk = false;
        try (Connection c = connectionFactory.createConnection()) {
            rabbitOk = c.isOpen();
        } catch (Exception ignored) {
        }
        checks.add(check("RabbitMQ", rabbitOk, (System.nanoTime() - rabbitStart) / 1_000_000.0));

        boolean ok = dbOk && rabbitOk;
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", ok ? "Healthy" : "Unhealthy");
        body.put("checks", checks);
        return ResponseEntity.status(ok ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }

    @GetMapping("/health/live")
    public Map<String, Object> live() {
        return Map.of("status", "Healthy", "checks", List.of());
    }

    @GetMapping("/info")
    public Map<String, Object> info() {
        return Map.of(
                "name", "element-wallet-service",
                "version", "1.0.0",
                "links", Map.of(
                        "wallet", "/api/v1/me/wallet",
                        "holdings", "/api/v1/me/holdings",
                        "desk_sell", "/api/v1/desk/sell",
                        "health", "/health"));
    }

    private static Map<String, Object> check(String name, boolean ok, double ms) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", name);
        m.put("ok", ok);
        m.put("ms", ms);
        return m;
    }
}
