package com.elementmarket.inventory;

import com.elementmarket.inventory.messaging.MassTransitMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class MassTransitMessageTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void readsOrderSubmitted() throws Exception {
        byte[] body = """
                {"messageType":["urn:message:Element.Shared.Events:OrderSubmittedEvent"],
                 "message":{"OrderId":"00000000-0000-0000-0000-000000000001",
                            "ElementSymbol":"AU","Quantity":1.5}}
                """.getBytes();

        assertEquals("OrderSubmittedEvent", MassTransitMessage.typeOf(body, mapper));
        var message = MassTransitMessage.messageOf(body, mapper);
        assertEquals("AU", MassTransitMessage.text(message, "elementSymbol", "ElementSymbol"));
        assertEquals(1.5, MassTransitMessage.number(message, "quantity", "Quantity"));
    }

    @Test
    void publishBodyRoundTripsThroughTheReaders() throws Exception {
        var payload = mapper.createObjectNode().put("orderId", "00000000-0000-0000-0000-000000000002");

        byte[] body = MassTransitMessage.publishBody(mapper, "StockReservedEvent", payload);

        assertEquals("StockReservedEvent", MassTransitMessage.typeOf(body, mapper));
        assertNotNull(MassTransitMessage.messageIdOf(body, mapper));
        var message = MassTransitMessage.messageOf(body, mapper);
        assertEquals("00000000-0000-0000-0000-000000000002", MassTransitMessage.text(message, "orderId", "OrderId"));
    }
}
