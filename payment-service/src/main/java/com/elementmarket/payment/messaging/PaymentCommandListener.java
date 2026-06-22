package com.elementmarket.payment.messaging;

import com.elementmarket.payment.config.RabbitConfig;
import com.elementmarket.payment.domain.PaymentDecision;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class PaymentCommandListener {

    private static final Logger log = LoggerFactory.getLogger(PaymentCommandListener.class);

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;
    private final RabbitConfig.PaymentSettings settings;
    private final PaymentIdempotencyStore idempotencyStore;

    public PaymentCommandListener(
            RabbitTemplate rabbitTemplate,
            ObjectMapper objectMapper,
            RabbitConfig.PaymentSettings settings,
            PaymentIdempotencyStore idempotencyStore) {
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
        this.settings = settings;
        this.idempotencyStore = idempotencyStore;
    }

    @RabbitListener(queues = RabbitConfig.PAYMENT_QUEUE)
    public void onMessage(Message message) throws Exception {
        var command = MassTransitMessage.parseCommand(message.getBody(), objectMapper);
        log.info("Processing payment for order {} amount {}", command.orderId(), command.amount());

        if (!idempotencyStore.tryAcquire(command.orderId())) {
            log.info("Idempotent payment replay for order {} — republishing success", command.orderId());
            publishProcessed(command.orderId());
            return;
        }

        if (settings.simulateDelaySeconds() > 0) {
            Thread.sleep(settings.simulateDelaySeconds() * 1000L);
        }

        int roll = PaymentDecision.roll(settings.deterministic());
        var outcome = PaymentDecision.evaluate(
                java.math.BigDecimal.valueOf(command.amount()),
                roll);

        switch (outcome) {
            case CREDIT_LIMIT_EXCEEDED -> publishFailed(command.orderId(), "Credit limit exceeded ($50k limit).");
            case BANK_DECLINED -> publishFailed(command.orderId(), "Bank declined the transaction.");
            default -> publishProcessed(command.orderId());
        }
    }

    private void publishProcessed(UUID orderId) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("orderId", orderId.toString());
        publish("PaymentProcessedEvent", payload);
        log.info("Payment processed for order {}", orderId);
    }

    private void publishFailed(UUID orderId, String reason) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("orderId", orderId.toString());
        payload.put("reason", reason);
        publish("PaymentFailedEvent", payload);
        log.warn("Payment failed for order {}: {}", orderId, reason);
    }

    private void publish(String typeName, ObjectNode payload) throws Exception {
        String exchange = "Element.Shared.Events:" + typeName;
        byte[] body = MassTransitMessage.publishBody(objectMapper, typeName, payload);
        MessageProperties props = new MessageProperties();
        MassTransitMessage.headers(typeName).forEach(props::setHeader);
        props.setContentType("application/vnd.masstransit+json");
        Message msg = new Message(body, props);
        rabbitTemplate.send(exchange, "", msg);
    }
}
