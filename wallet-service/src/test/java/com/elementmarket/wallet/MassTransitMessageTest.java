package com.elementmarket.wallet;

import com.elementmarket.wallet.messaging.MassTransitMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class MassTransitMessageTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void readsPaymentRequestedCamelAndPascal() throws Exception {
        byte[] body = """
                {"messageType":["urn:message:Element.Shared.Events:PaymentRequestedEvent"],
                 "messageId":"00000000-0000-0000-0000-000000000099",
                 "message":{"orderId":"00000000-0000-0000-0000-000000000001",
                            "amount":75.25,
                            "CustomerId":"00000000-0000-0000-0000-000000000002"}}
                """.getBytes();

        assertEquals("PaymentRequestedEvent", MassTransitMessage.typeOf(body, mapper));
        var message = MassTransitMessage.messageOf(body, mapper);
        assertEquals("00000000-0000-0000-0000-000000000001", MassTransitMessage.text(message, "orderId", "OrderId"));
        assertEquals("00000000-0000-0000-0000-000000000002", MassTransitMessage.text(message, "customerId", "CustomerId"));
        assertEquals(75.25, MassTransitMessage.number(message, "amount", "Amount"));
    }

    @Test
    void nullCamelFieldFallsBackToPascalAndMissingFieldsGiveDefaults() throws Exception {
        byte[] body = """
                {"messageType":[],
                 "messageId":null,
                 "message":{"orderId":null,"OrderId":"00000000-0000-0000-0000-000000000003"}}
                """.getBytes();

        assertNull(MassTransitMessage.typeOf(body, mapper));
        assertNull(MassTransitMessage.messageIdOf(body, mapper));
        var message = MassTransitMessage.messageOf(body, mapper);
        assertEquals("00000000-0000-0000-0000-000000000003", MassTransitMessage.text(message, "orderId", "OrderId"));
        assertNull(MassTransitMessage.text(message, "customerId", "CustomerId"));
        assertEquals(0.0, MassTransitMessage.number(message, "amount", "Amount"));
    }

    @Test
    void publishBodyRoundTripsThroughTheReaders() throws Exception {
        var payload = mapper.createObjectNode().put("orderId", "00000000-0000-0000-0000-000000000004");

        byte[] body = MassTransitMessage.publishBody(mapper, "PaymentProcessedEvent", payload);

        assertEquals("PaymentProcessedEvent", MassTransitMessage.typeOf(body, mapper));
        assertNotNull(MassTransitMessage.messageIdOf(body, mapper));
        var message = MassTransitMessage.messageOf(body, mapper);
        assertEquals("00000000-0000-0000-0000-000000000004", MassTransitMessage.text(message, "orderId", "OrderId"));
        assertEquals("Element.Shared.Events:PaymentProcessedEvent", MassTransitMessage.exchange("PaymentProcessedEvent"));
    }
}
