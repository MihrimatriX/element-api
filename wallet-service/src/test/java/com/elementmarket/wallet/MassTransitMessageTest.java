package com.elementmarket.wallet;

import com.elementmarket.wallet.messaging.MassTransitMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MassTransitMessageTest {
    @Test
    void readsPaymentRequestedCamelAndPascal() throws Exception {
        var mapper = new ObjectMapper();
        byte[] body = """
                {"messageType":["urn:message:Element.Shared.Events:PaymentRequestedEvent"],
                 "messageId":"00000000-0000-0000-0000-000000000099",
                 "message":{"orderId":"00000000-0000-0000-0000-000000000001",
                            "amount":75.25,
                            "CustomerId":"00000000-0000-0000-0000-000000000002"}}
                """.getBytes();
        assertEquals("PaymentRequestedEvent", MassTransitMessage.typeOf(body, mapper));
        var msg = MassTransitMessage.messageOf(body, mapper);
        assertEquals("00000000-0000-0000-0000-000000000001", MassTransitMessage.text(msg, "orderId", "OrderId"));
        assertEquals("00000000-0000-0000-0000-000000000002", MassTransitMessage.text(msg, "customerId", "CustomerId"));
        assertEquals(75.25, MassTransitMessage.number(msg, "amount", "Amount"));
    }
}
