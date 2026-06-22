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
        String orderId = msg.get("orderId").asText();
        double amount = msg.get("amount").asDouble();
        return new ProcessPaymentCommand(UUID.fromString(orderId), amount);
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

    public record ProcessPaymentCommand(UUID orderId, double amount) {}
}
