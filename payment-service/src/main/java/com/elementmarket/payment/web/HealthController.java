package com.elementmarket.payment.web;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.amqp.rabbit.connection.Connection;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    private final ConnectionFactory connectionFactory;

    public HealthController(ConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        long totalStart = System.nanoTime();
        Map<String, Object> entries = new LinkedHashMap<>();

        long rabbitStart = System.nanoTime();
        boolean rabbitOk = false;
        String rabbitDescription = "RabbitMQ is unreachable.";
        try (Connection connection = connectionFactory.createConnection()) {
            rabbitOk = connection.isOpen();
            rabbitDescription = rabbitOk ? "RabbitMQ connection is open." : "RabbitMQ connection is not open.";
        } catch (Exception ignored) {
            rabbitOk = false;
        }
        long rabbitMs = (System.nanoTime() - rabbitStart) / 1_000_000L;
        entries.put("RabbitMQ", entry(rabbitOk, rabbitMs, rabbitDescription));

        long totalMs = (System.nanoTime() - totalStart) / 1_000_000L;
        boolean healthy = rabbitOk;

        Map<String, Object> body = Map.of(
                "status", healthy ? "Healthy" : "Unhealthy",
                "totalDuration", formatDuration(totalMs),
                "entries", entries);

        return ResponseEntity.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }

    private static Map<String, Object> entry(boolean ok, long durationMs, String description) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("data", Map.of());
        entry.put("description", description);
        entry.put("duration", formatDuration(durationMs));
        entry.put("status", ok ? "Healthy" : "Unhealthy");
        entry.put("tags", List.of());
        return entry;
    }

    /** HealthChecks.UI TimeSpan format: HH:mm:ss.fffffff */
    static String formatDuration(long ms) {
        Duration d = Duration.ofMillis(ms);
        long hours = d.toHours();
        long minutes = d.toMinutesPart();
        long seconds = d.toSecondsPart();
        int fraction = d.toMillisPart() * 10_000;
        return String.format("%02d:%02d:%02d.%07d", hours, minutes, seconds, fraction);
    }
}
