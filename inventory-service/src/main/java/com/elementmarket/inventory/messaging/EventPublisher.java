package com.elementmarket.inventory.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class EventPublisher {
    // ponytail: publish after JDBC commit (no outbox). Add transactional outbox if dual-write bites.
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    public EventPublisher(RabbitTemplate rabbitTemplate, ObjectMapper objectMapper) {
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
    }

    public void publish(String typeName, ObjectNode payload) throws Exception {
        String exchange = MassTransitMessage.exchange(typeName);
        byte[] body = MassTransitMessage.publishBody(objectMapper, typeName, payload);
        MessageProperties props = new MessageProperties();
        MassTransitMessage.headers(typeName).forEach(props::setHeader);
        props.setContentType("application/vnd.masstransit+json");
        rabbitTemplate.send(exchange, "", new Message(body, props));
    }
}
