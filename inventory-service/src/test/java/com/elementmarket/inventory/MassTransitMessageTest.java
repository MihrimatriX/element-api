package com.elementmarket.inventory;

import com.elementmarket.inventory.messaging.MassTransitMessage;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class MassTransitMessageTest {

    /** Same setting as spring.jackson.deserialization.use-big-decimal-for-floats in application.yml. */
    private final ObjectMapper mapper = new ObjectMapper().enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS);

    @Test
    void readsOrderSubmitted() throws Exception {
        byte[] body = """
                {"messageType":["urn:message:Element.Shared.Events:OrderSubmittedEvent"],
                 "message":{"OrderId":"00000000-0000-0000-0000-000000000001",
                            "ElementSymbol":"AU","Quantity":0.1}}
                """.getBytes();

        assertEquals("OrderSubmittedEvent", MassTransitMessage.typeOf(body, mapper));
        var message = MassTransitMessage.messageOf(body, mapper);
        assertEquals("AU", MassTransitMessage.text(message, "elementSymbol", "ElementSymbol"));
        assertEquals(new BigDecimal("0.1"), MassTransitMessage.decimal(message, "quantity", "Quantity"));
        assertEquals(BigDecimal.ZERO, MassTransitMessage.decimal(message, "grams", "Grams"));
        assertNull(MassTransitMessage.messageIdOf(body, mapper));
    }

    @Test
    void publishBodyKeepsTheOutboxRowIdAsMessageId() throws Exception {
        var payload = mapper.createObjectNode().put("orderId", "00000000-0000-0000-0000-000000000002");
        UUID rowId = UUID.randomUUID();

        byte[] body = MassTransitMessage.publishBody(mapper, "StockReservedEvent", payload, rowId);

        assertEquals("StockReservedEvent", MassTransitMessage.typeOf(body, mapper));
        assertEquals(rowId.toString(), MassTransitMessage.messageIdOf(body, mapper));
        var message = MassTransitMessage.messageOf(body, mapper);
        assertEquals("00000000-0000-0000-0000-000000000002", MassTransitMessage.text(message, "orderId", "OrderId"));
        assertEquals("Element.Shared.Events:StockReservedEvent", MassTransitMessage.exchange("StockReservedEvent"));
    }
}
