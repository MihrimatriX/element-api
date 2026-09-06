package com.elementmarket.payment.web;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class InfoController {

    @Value("${spring.application.name:element-payment-service}")
    private String appName;

    @Value("${info.app.version:1.0.0}")
    private String version;

    @GetMapping("/info")
    public Map<String, Object> info() {
        Map<String, String> links = new LinkedHashMap<>();
        links.put("health", "/health");
        links.put("health_live", "/actuator/health/liveness");
        links.put("health_ready", "/actuator/health/readiness");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", appName);
        body.put("version", version);
        body.put("environment", System.getenv().getOrDefault("SPRING_PROFILES_ACTIVE", "default"));
        body.put("role", "payment-saga-worker");
        body.put("links", links);
        return body;
    }
}
