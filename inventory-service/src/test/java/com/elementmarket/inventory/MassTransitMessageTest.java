package com.elementmarket.inventory;

import com.elementmarket.inventory.messaging.MassTransitMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MassTransitMessageTest {
    @Test
    void readsOrderSubmitted() throws Exception {
        var mapper = new ObjectMapper();
        byte[] body = """
                {"messageType":["urn:message:Element.Shared.Events:OrderSubmittedEvent"],
                 "message":{"OrderId":"00000000-0000-0000-0000-000000000001",
                            "ElementSymbol":"AU","Quantity":1.5}}
                """.getBytes();
        assertEquals("OrderSubmittedEvent", MassTransitMessage.typeOf(body, mapper));
        var msg = MassTransitMessage.messageOf(body, mapper);
        assertEquals("AU", MassTransitMessage.text(msg, "elementSymbol", "ElementSymbol"));
        assertEquals(1.5, MassTransitMessage.number(msg, "quantity", "Quantity"));
    }
}
