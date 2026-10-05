package com.elementmarket.wallet.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Minimal MassTransit envelope helpers so this Java service can talk to the .NET and Node services on RabbitMQ.
 * Reads accept both camelCase and PascalCase field names because publishers differ in casing.
 */
public final class MassTransitMessage {

    /** Content type MassTransit uses for its JSON envelope. */
    public static final String CONTENT_TYPE = "application/vnd.masstransit+json";

    private static final String EVENTS_NAMESPACE = "Element.Shared.Events:";
    private static final String URN_PREFIX = "urn:message:" + EVENTS_NAMESPACE;

    private MassTransitMessage() {}

    /** Returns the short event type name (e.g. "PaymentRequestedEvent") from the envelope, or null if absent. */
    public static String typeOf(byte[] body, ObjectMapper mapper) throws Exception {
        JsonNode root = mapper.readTree(body);
        JsonNode messageTypes = root.get("messageType");
        if (messageTypes == null || !messageTypes.isArray() || messageTypes.isEmpty()) {
            return null;
        }
        String urn = messageTypes.get(0).asText();
        int lastColon = urn.lastIndexOf(':');
        if (lastColon < 0) {
            return urn;
        }
        return urn.substring(lastColon + 1);
    }

    /** Returns the "message" payload, or the whole document when it was sent without an envelope. */
    public static JsonNode messageOf(byte[] body, ObjectMapper mapper) throws Exception {
        JsonNode root = mapper.readTree(body);
        if (root.has("message")) {
            return root.get("message");
        }
        return root;
    }

    /** Returns the envelope's messageId, or null when the publisher did not set one. */
    public static String messageIdOf(byte[] body, ObjectMapper mapper) throws Exception {
        JsonNode root = mapper.readTree(body);
        JsonNode messageId = root.get("messageId");
        if (messageId == null || messageId.isNull()) {
            return null;
        }
        return messageId.asText();
    }

    /** Reads a text field by its camelCase or PascalCase name; null when neither is present. */
    public static String text(JsonNode message, String camelName, String pascalName) {
        JsonNode field = findField(message, camelName, pascalName);
        if (field == null) {
            return null;
        }
        return field.asText();
    }

    /** Reads a numeric field by its camelCase or PascalCase name; 0 when neither is present. */
    public static double number(JsonNode message, String camelName, String pascalName) {
        JsonNode field = findField(message, camelName, pascalName);
        if (field == null) {
            return 0;
        }
        return field.asDouble();
    }

    /** Wraps a payload in a MassTransit envelope with fresh message and conversation ids. */
    public static byte[] publishBody(ObjectMapper mapper, String typeName, ObjectNode payload) throws Exception {
        ObjectNode envelope = mapper.createObjectNode();
        envelope.put("messageId", UUID.randomUUID().toString());
        envelope.put("conversationId", UUID.randomUUID().toString());
        envelope.set("messageType", mapper.valueToTree(List.of(URN_PREFIX + typeName)));
        envelope.set("message", payload);
        return mapper.writeValueAsBytes(envelope);
    }

    /** AMQP headers MassTransit consumers expect next to the body. */
    public static Map<String, Object> headers(String typeName) {
        return Map.of(
                "MT-Message-Type", URN_PREFIX + typeName,
                "Content-Type", CONTENT_TYPE);
    }

    /** Name of the fanout exchange MassTransit uses for the given event type. */
    public static String exchange(String typeName) {
        return EVENTS_NAMESPACE + typeName;
    }

    /** Returns the first non-null field among the camelCase and PascalCase names, or null. */
    private static JsonNode findField(JsonNode message, String camelName, String pascalName) {
        JsonNode camelField = message.get(camelName);
        if (camelField != null && !camelField.isNull()) {
            return camelField;
        }
        JsonNode pascalField = message.get(pascalName);
        if (pascalField != null && !pascalField.isNull()) {
            return pascalField;
        }
        return null;
    }
}
