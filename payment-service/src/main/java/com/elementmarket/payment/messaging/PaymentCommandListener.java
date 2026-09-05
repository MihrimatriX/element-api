package com.elementmarket.payment.messaging;

import com.elementmarket.payment.config.RabbitConfig;
import com.elementmarket.payment.domain.PaymentDecision;
import com.elementmarket.payment.wallet.OrderWalletClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

@Component
public class PaymentCommandListener {

    private static final Logger log = LoggerFactory.getLogger(PaymentCommandListener.class);

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;
    private final RabbitConfig.PaymentSettings settings;
    private final OrderWalletClient walletClient;

    public PaymentCommandListener(
            RabbitTemplate rabbitTemplate,
            ObjectMapper objectMapper,
            RabbitConfig.PaymentSettings settings,
            OrderWalletClient walletClient) {
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
        this.settings = settings;
        this.walletClient = walletClient;
    }

    @RabbitListener(queues = RabbitConfig.PAYMENT_QUEUE)
    public void onMessage(Message message) throws Exception {
        var command = MassTransitMessage.parseCommand(message.getBody(), objectMapper);
        log.info("Processing payment for order {} amount {} customer {}",
                command.orderId(), command.amount(), command.customerId());

        // The durable wallet ledger decides whether this order was paid.
        // An in-memory 'in progress' marker must never be treated as payment success.

        if (settings.simulateDelaySeconds() > 0) {
            Thread.sleep(settings.simulateDelaySeconds() * 1000L);
        }

        var outcome = PaymentDecision.evaluate(BigDecimal.valueOf(command.amount()));
        if (outcome == PaymentDecision.Outcome.CREDIT_LIMIT_EXCEEDED) {
            publishFailed(command.orderId(), "Credit limit exceeded (50000 KREDI limit).");
            return;
        }

        var debit = walletClient.debit(command.orderId(), command.customerId(), command.amount());
        switch (debit) {
            case OK -> publishProcessed(command.orderId());
            case INSUFFICIENT -> {
                publishFailed(command.orderId(), "INSUFFICIENT_ELX");
            }
            case REJECTED -> publishFailed(command.orderId(), "ORDER_NOT_PAYABLE");
            case ERROR -> {
                throw new IllegalStateException("Wallet debit failed for order " + command.orderId());
            }
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
