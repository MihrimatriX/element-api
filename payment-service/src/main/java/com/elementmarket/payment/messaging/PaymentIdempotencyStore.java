package com.elementmarket.payment.messaging;

import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class PaymentIdempotencyStore {
    private final Set<UUID> processedOrders = ConcurrentHashMap.newKeySet();

    public boolean tryAcquire(UUID orderId) {
        return processedOrders.add(orderId);
    }
}
