package com.elementmarket.payment.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Minimal MassTransit / System.Text.Json compatible envelope helpers.
 */
public final class MassTransitMessage {

    private static final String NS = "Element.Shared.Events:";

    private MassTransitMessage() {}

    public static ProcessPaymentCommand parseCommand(byte[] body, ObjectMapper mapper) throws Exception {
        JsonNode root = mapper.readTree(body);
        JsonNode msg = root.has("message") ? root.get("message") : root;
        String orderId = text(msg, "orderId", "OrderId");
        double amount = number(msg, "amount", "Amount");
        String customerId = text(msg, "customerId", "CustomerId");
        if (orderId == null || customerId == null) {
            throw new IllegalArgumentException("ProcessPaymentCommand requires orderId and customerId");
        }
        return new ProcessPaymentCommand(UUID.fromString(orderId), amount, UUID.fromString(customerId));
    }

    private static String text(JsonNode msg, String camel, String pascal) {
        if (msg.has(camel) && !msg.get(camel).isNull()) return msg.get(camel).asText();
        if (msg.has(pascal) && !msg.get(pascal).isNull()) return msg.get(pascal).asText();
        return null;
    }

    private static double number(JsonNode msg, String camel, String pascal) {
        if (msg.has(camel) && !msg.get(camel).isNull()) return msg.get(camel).asDouble();
        if (msg.has(pascal) && !msg.get(pascal).isNull()) return msg.get(pascal).asDouble();
        return 0;
    }

    public static byte[] publishBody(ObjectMapper mapper, String typeName, ObjectNode payload) throws Exception {
        ObjectNode envelope = mapper.createObjectNode();
        envelope.put("messageId", UUID.randomUUID().toString());
        envelope.put("conversationId", UUID.randomUUID().toString());
        envelope.set("messageType", mapper.valueToTree(List.of("urn:message:" + NS + typeName)));
        envelope.set("message", payload);
        return mapper.writeValueAsBytes(envelope);
    }

    public static Map<String, Object> headers(String typeName) {
        return Map.of(
                "MT-Message-Type", "urn:message:" + NS + typeName,
                "Content-Type", "application/vnd.masstransit+json"
        );
    }

    public record ProcessPaymentCommand(UUID orderId, double amount, UUID customerId) {}
}
