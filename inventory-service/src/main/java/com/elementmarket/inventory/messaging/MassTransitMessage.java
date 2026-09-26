package com.elementmarket.inventory.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Minimal MassTransit / System.Text.Json compatible envelope helpers. */
public final class MassTransitMessage {

    private static final String NS = "Element.Shared.Events:";

    private MassTransitMessage() {}

    public static String typeOf(byte[] body, ObjectMapper mapper) throws Exception {
        JsonNode root = mapper.readTree(body);
        if (!root.has("messageType") || !root.get("messageType").isArray() || root.get("messageType").isEmpty()) {
            return null;
        }
        String urn = root.get("messageType").get(0).asText();
        int i = urn.lastIndexOf(':');
        return i >= 0 ? urn.substring(i + 1) : urn;
    }

    public static JsonNode messageOf(byte[] body, ObjectMapper mapper) throws Exception {
        JsonNode root = mapper.readTree(body);
        return root.has("message") ? root.get("message") : root;
    }

    public static String messageIdOf(byte[] body, ObjectMapper mapper) throws Exception {
        JsonNode root = mapper.readTree(body);
        if (root.has("messageId") && !root.get("messageId").isNull()) {
            return root.get("messageId").asText();
        }
        return null;
    }

    public static String text(JsonNode msg, String camel, String pascal) {
        if (msg.has(camel) && !msg.get(camel).isNull()) return msg.get(camel).asText();
        if (msg.has(pascal) && !msg.get(pascal).isNull()) return msg.get(pascal).asText();
        return null;
    }

    public static double number(JsonNode msg, String camel, String pascal) {
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
                "Content-Type", "application/vnd.masstransit+json");
    }

    public static String exchange(String typeName) {
        return NS + typeName;
    }
}
