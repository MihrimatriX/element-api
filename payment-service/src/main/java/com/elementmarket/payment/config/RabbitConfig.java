package com.elementmarket.payment.config;

import org.springframework.amqp.core.Queue;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String PAYMENT_QUEUE = "payment-processing";

    @Bean
    public Queue paymentProcessingQueue() {
        return new Queue(PAYMENT_QUEUE, true);
    }

    @Bean
    public PaymentSettings paymentSettings(
            @Value("${payment.simulate-delay-seconds:0}") int simulateDelaySeconds,
            @Value("${order-service.url:http://localhost:5003}") String orderServiceUrl,
            @Value("${internal.api-key:element-internal-dev-key}") String internalApiKey) {
        return new PaymentSettings(simulateDelaySeconds, orderServiceUrl, internalApiKey);
    }

    public record PaymentSettings(int simulateDelaySeconds, String orderServiceUrl, String internalApiKey) {}
}
