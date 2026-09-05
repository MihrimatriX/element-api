package com.elementmarket.payment.wallet;

import com.elementmarket.payment.config.RabbitConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;

@Component
public class OrderWalletClient {

    private static final Logger log = LoggerFactory.getLogger(OrderWalletClient.class);

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final RabbitConfig.PaymentSettings settings;

    public OrderWalletClient(RabbitConfig.PaymentSettings settings) {
        this.settings = settings;
    }

    public DebitOutcome debit(UUID orderId, UUID customerId, double amount) {
        String body = """
                {"orderId":"%s","customerId":"%s","amount":%s}
                """.formatted(orderId, customerId, amount);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(settings.orderServiceUrl().replaceAll("/$", "") + "/internal/wallet/debit"))
                .timeout(Duration.ofSeconds(8))
                .header("Content-Type", "application/json")
                .header("INTERNAL_API_KEY", settings.internalApiKey())
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            int code = response.statusCode();
            if (code == 200) return DebitOutcome.OK;
            if (code == 400 || code == 404 || code == 409) return DebitOutcome.REJECTED;
            if (code == 402) return DebitOutcome.INSUFFICIENT;
            log.warn("Wallet debit unexpected status {} body {}", code, response.body());
            return DebitOutcome.ERROR;
        } catch (Exception ex) {
            log.error("Wallet debit failed for order {}", orderId, ex);
            return DebitOutcome.ERROR;
        }
    }

    public enum DebitOutcome {
        OK,
        INSUFFICIENT,
        REJECTED,
        ERROR
    }
}
