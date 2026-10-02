package com.elementmarket.inventory.web;

import org.springframework.amqp.rabbit.connection.Connection;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Health and info endpoints in the same JSON shape as the .NET services, used by Docker and the gateway. */
@RestController
public class HealthController {

    private static final double NANOS_PER_MILLI = 1_000_000.0;

    private final JdbcTemplate jdbc;
    private final ConnectionFactory connectionFactory;

    public HealthController(JdbcTemplate jdbc, ConnectionFactory connectionFactory) {
        this.jdbc = jdbc;
        this.connectionFactory = connectionFactory;
    }

    /** Readiness: pings PostgreSQL and RabbitMQ; 200 when both answer, otherwise 503. */
    @GetMapping({"/health", "/health/ready"})
    public ResponseEntity<Map<String, Object>> health() {
        long postgresStart = System.nanoTime();
        boolean isPostgresUp = pingPostgres();
        Map<String, Object> postgresCheck = check("PostgreSQL", isPostgresUp, elapsedMillis(postgresStart));

        long rabbitStart = System.nanoTime();
        boolean isRabbitUp = pingRabbit();
        Map<String, Object> rabbitCheck = check("RabbitMQ", isRabbitUp, elapsedMillis(rabbitStart));

        boolean isHealthy = isPostgresUp && isRabbitUp;
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", isHealthy ? "Healthy" : "Unhealthy");
        body.put("checks", List.of(postgresCheck, rabbitCheck));
        HttpStatus status = isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
        return ResponseEntity.status(status).body(body);
    }

    /** Liveness: the process is up; no dependency checks. */
    @GetMapping("/health/live")
    public Map<String, Object> live() {
        return Map.of("status", "Healthy", "checks", List.of());
    }

    /** Service name, version and the most useful links. */
    @GetMapping("/info")
    public Map<String, Object> info() {
        return Map.of(
                "name", "element-inventory-service",
                "version", "1.0.0",
                "links", Map.of("stock", "/api/v1/stock/{symbol}", "health", "/health"));
    }

    private boolean pingPostgres() {
        try {
            jdbc.queryForObject("SELECT 1", Integer.class);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean pingRabbit() {
        boolean isOpen = false;
        try (Connection connection = connectionFactory.createConnection()) {
            isOpen = connection.isOpen();
        } catch (Exception ignored) {
            // An unreachable broker leaves isOpen false; an error while closing keeps the observed state.
        }
        return isOpen;
    }

    private static double elapsedMillis(long startNanos) {
        return (System.nanoTime() - startNanos) / NANOS_PER_MILLI;
    }

    private static Map<String, Object> check(String name, boolean ok, double elapsedMs) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("name", name);
        result.put("ok", ok);
        result.put("ms", elapsedMs);
        return result;
    }
}
