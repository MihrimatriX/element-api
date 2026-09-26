package com.elementmarket.wallet.messaging;

import com.elementmarket.wallet.config.RabbitConfig;
import com.elementmarket.wallet.ledger.LedgerRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Component
public class WalletListener {

    private static final Logger log = LoggerFactory.getLogger(WalletListener.class);

    private final ObjectMapper objectMapper;
    private final LedgerRepository ledger;
    private final EventPublisher publisher;

    public WalletListener(ObjectMapper objectMapper, LedgerRepository ledger, EventPublisher publisher) {
        this.objectMapper = objectMapper;
        this.ledger = ledger;
        this.publisher = publisher;
    }

    @RabbitListener(queues = RabbitConfig.WALLET_QUEUE)
    public void onMessage(Message message) throws Exception {
        byte[] body = message.getBody();
        String type = MassTransitMessage.typeOf(body, objectMapper);
        JsonNode msg = MassTransitMessage.messageOf(body, objectMapper);
        String orderIdText = MassTransitMessage.text(msg, "orderId", "OrderId");
        if (type == null || orderIdText == null) return;
        UUID orderId = UUID.fromString(orderIdText);
        String mid = MassTransitMessage.messageIdOf(body, objectMapper);
        UUID messageId = mid != null ? UUID.fromString(mid) : UUID.nameUUIDFromBytes((type + ":" + orderId).getBytes());

        if (!ledger.tryMarkProcessed(messageId, type, orderId)) return;

        String customerText = MassTransitMessage.text(msg, "customerId", "CustomerId");
        UUID customerId = customerText != null ? UUID.fromString(customerText) : null;

        switch (type) {
            case "PaymentRequestedEvent" -> handlePayment(orderId, customerId, msg);
            case "PaymentRefundRequestedEvent" -> {
                if (customerId == null) return;
                ledger.refundIfDebited(
                        customerId,
                        orderId,
                        MassTransitMessage.text(msg, "elementSymbol", "ElementSymbol"),
                        BigDecimal.valueOf(MassTransitMessage.number(msg, "quantity", "Quantity")));
            }
            case "AssetsCreditedEvent" -> handleAssets(orderId, customerId, msg);
            default -> log.debug("Ignoring wallet event {}", type);
        }
    }

    private void handlePayment(UUID orderId, UUID customerId, JsonNode msg) throws Exception {
        if (customerId == null) return;
        BigDecimal amount = BigDecimal.valueOf(MassTransitMessage.number(msg, "amount", "Amount"));
        String symbol = MassTransitMessage.text(msg, "elementSymbol", "ElementSymbol");
        BigDecimal qty = BigDecimal.valueOf(MassTransitMessage.number(msg, "quantity", "Quantity"));
        var result = ledger.debit(customerId, orderId, amount, symbol, qty);
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("orderId", orderId.toString());
        switch (result) {
            case OK, DUPLICATE -> publisher.publish("PaymentProcessedEvent", payload);
            case INSUFFICIENT -> {
                payload.put("reason", "INSUFFICIENT_ELX");
                publisher.publish("PaymentFailedEvent", payload);
            }
            case LIMIT -> {
                payload.put("reason", "Credit limit exceeded (50000 KREDI limit).");
                publisher.publish("PaymentFailedEvent", payload);
            }
        }
    }

    private void handleAssets(UUID orderId, UUID customerId, JsonNode msg) {
        if (customerId == null) return;
        String symbol = MassTransitMessage.text(msg, "elementSymbol", "ElementSymbol");
        BigDecimal qty = BigDecimal.valueOf(MassTransitMessage.number(msg, "quantity", "Quantity"));
        BigDecimal total = BigDecimal.valueOf(MassTransitMessage.number(msg, "totalPrice", "TotalPrice"));
        String slug = MassTransitMessage.text(msg, "compoundSlug", "CompoundSlug");
        if (slug == null || slug.isBlank()) slug = "elemental";
        String label = MassTransitMessage.text(msg, "productLabel", "ProductLabel");
        if (symbol == null || qty.signum() <= 0 || total.signum() <= 0) return;
        BigDecimal unit = total.divide(qty, 4, RoundingMode.HALF_UP);
        ledger.addHolding(customerId, symbol, qty, unit, slug, label);
        log.info("Assets credited order {} {}g {}", orderId, qty, symbol);
    }
}
