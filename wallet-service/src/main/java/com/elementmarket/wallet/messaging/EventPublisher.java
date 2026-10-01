package com.elementmarket.wallet.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/** Publishes integration events to RabbitMQ in the MassTransit envelope format the other services consume. */
@Component
public class EventPublisher {
    // ponytail: no outbox. Listener publishes inside its JDBC tx (failed commit -> redelivery re-publishes);
    // desk sell publishes after commit. Add transactional outbox if dual-write bites.

    private static final String NO_ROUTING_KEY = "";

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    public EventPublisher(RabbitTemplate rabbitTemplate, ObjectMapper objectMapper) {
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
    }

    /** Sends the payload to the fanout exchange named after the event type (e.g. "PaymentProcessedEvent"). */
    public void publish(String typeName, ObjectNode payload) throws Exception {
        String exchange = MassTransitMessage.exchange(typeName);
        byte[] body = MassTransitMessage.publishBody(objectMapper, typeName, payload);

        MessageProperties properties = new MessageProperties();
        MassTransitMessage.headers(typeName).forEach(properties::setHeader);
        properties.setContentType(MassTransitMessage.CONTENT_TYPE);

        rabbitTemplate.send(exchange, NO_ROUTING_KEY, new Message(body, properties));
    }
}
