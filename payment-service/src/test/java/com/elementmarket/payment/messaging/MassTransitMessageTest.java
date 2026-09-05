package com.elementmarket.payment.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MassTransitMessageTest {

    @Test
    void parseCommandReadsCustomerId() throws Exception {
        var mapper = new ObjectMapper();
        byte[] body = """
                {"messageType":["urn:message:Element.Shared.Events:ProcessPaymentCommand"],
                 "message":{"orderId":"00000000-0000-0000-0000-000000000001",
                            "amount":75.25,
                            "customerId":"00000000-0000-0000-0000-000000000002"}}
                """.getBytes();
        var cmd = MassTransitMessage.parseCommand(body, mapper);
        assertEquals("00000000-0000-0000-0000-000000000001", cmd.orderId().toString());
        assertEquals("00000000-0000-0000-0000-000000000002", cmd.customerId().toString());
        assertEquals(75.25, cmd.amount());
    }
}
