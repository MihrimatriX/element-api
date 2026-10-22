package com.elementmarket.inventory.infrastructure;

import com.elementmarket.inventory.messaging.MassTransitMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.UUID;

/**
 * Sends one outbox row to the MassTransit fanout exchange named after its event type and waits for the
 * broker's publisher confirm, so the relay only marks a row published once RabbitMQ really has it.
 * Needs {@code spring.rabbitmq.publisher-confirm-type: simple}.
 */
@Component
public class RabbitOutboxPublisher implements OutboxRelay.Publisher {

    private static final String NO_ROUTING_KEY = "";
    private static final long CONFIRM_TIMEOUT_MS = 5_000;

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper mapper;

    public RabbitOutboxPublisher(RabbitTemplate rabbitTemplate, ObjectMapper mapper) {
        this.rabbitTemplate = rabbitTemplate;
        this.mapper = mapper;
    }

    @Override
    public void publish(UUID messageId, String eventType, String payloadJson) {
        byte[] body;
        try {
            ObjectNode payload = (ObjectNode) mapper.readTree(payloadJson);
            body = MassTransitMessage.publishBody(mapper, eventType, payload, messageId);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        MessageProperties properties = new MessageProperties();
        MassTransitMessage.headers(eventType).forEach(properties::setHeader);
        properties.setContentType(MassTransitMessage.CONTENT_TYPE);
        properties.setMessageId(messageId.toString());
        Message message = new Message(body, properties);

        rabbitTemplate.invoke(operations -> {
            operations.send(MassTransitMessage.exchange(eventType), NO_ROUTING_KEY, message);
            operations.waitForConfirmsOrDie(CONFIRM_TIMEOUT_MS);
            return null;
        });
    }
}
