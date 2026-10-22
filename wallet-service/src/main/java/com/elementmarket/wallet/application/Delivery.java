package com.elementmarket.wallet.application;

import java.util.UUID;

/** Identity of one broker delivery: recorded once in processed_messages, inside the same transaction as its effects. */
public record Delivery(UUID messageId, String eventType, UUID orderId) {}
