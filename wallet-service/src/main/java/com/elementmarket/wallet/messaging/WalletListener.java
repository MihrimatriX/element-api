package com.elementmarket.wallet.messaging;

import com.elementmarket.wallet.application.Delivery;
import com.elementmarket.wallet.application.WalletService;
import com.elementmarket.wallet.config.RabbitConfig;
import com.elementmarket.wallet.domain.Grams;
import com.elementmarket.wallet.domain.Holding;
import com.elementmarket.wallet.domain.Money;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Inbound adapter for the order saga's wallet events: reads the MassTransit envelope and calls the matching
 * {@link WalletService} use case, which owns the transaction and the dedupe. An exception here makes the
 * broker retry the delivery and finally park it in wallet-service_failed.
 */
@Component
public class WalletListener {

    private static final Logger log = LoggerFactory.getLogger(WalletListener.class);

    private final ObjectMapper objectMapper;
    private final WalletService wallets;

    public WalletListener(ObjectMapper objectMapper, WalletService wallets) {
        this.objectMapper = objectMapper;
        this.wallets = wallets;
    }

    @RabbitListener(queues = RabbitConfig.WALLET_QUEUE)
    public void onMessage(Message message) throws Exception {
        byte[] body = message.getBody();
        String eventType = MassTransitMessage.typeOf(body, objectMapper);
        JsonNode payload = MassTransitMessage.messageOf(body, objectMapper);
        String orderIdText = MassTransitMessage.text(payload, "orderId", "OrderId");
        String customerIdText = MassTransitMessage.text(payload, "customerId", "CustomerId");
        if (eventType == null || orderIdText == null || customerIdText == null) {
            return;
        }
        UUID orderId = UUID.fromString(orderIdText);
        UUID customerId = UUID.fromString(customerIdText);
        Delivery delivery = new Delivery(resolveMessageId(body, eventType, orderId), eventType, orderId);
        String symbol = MassTransitMessage.text(payload, "elementSymbol", "ElementSymbol");
        BigDecimal quantity = MassTransitMessage.decimal(payload, "quantity", "Quantity");

        switch (eventType) {
            case "PaymentRequestedEvent" -> wallets.chargeOrder(
                    delivery, customerId, MassTransitMessage.decimal(payload, "amount", "Amount"),
                    symbol, Grams.of(quantity));
            case "PaymentRefundRequestedEvent" -> wallets.refundOrder(delivery, customerId, symbol, Grams.of(quantity));
            case "AssetsCreditedEvent" -> creditAssets(delivery, customerId, symbol, quantity, payload);
            default -> log.debug("Ignoring wallet event {}", eventType);
        }
    }

    /** Skips malformed deliveries (nothing to credit); the use case rejects unpaid or refunded orders. */
    private void creditAssets(Delivery delivery, UUID customerId, String symbol, BigDecimal quantity, JsonNode payload) {
        BigDecimal totalPrice = MassTransitMessage.decimal(payload, "totalPrice", "TotalPrice");
        if (symbol == null || quantity.signum() <= 0 || totalPrice.signum() <= 0) {
            return;
        }
        String compoundSlug = MassTransitMessage.text(payload, "compoundSlug", "CompoundSlug");
        if (compoundSlug == null || compoundSlug.isBlank()) {
            compoundSlug = Holding.ELEMENTAL;
        }
        String productLabel = MassTransitMessage.text(payload, "productLabel", "ProductLabel");
        wallets.creditAssets(delivery, customerId, symbol, Grams.of(quantity), Money.of(totalPrice), compoundSlug, productLabel);
        log.info("Assets credited order {} {}g {}", delivery.orderId(), quantity, symbol);
    }

    /**
     * Uses the envelope's messageId when present; otherwise derives a stable id from type + order
     * so a redelivered message without an id is still recognised as a duplicate.
     */
    private UUID resolveMessageId(byte[] body, String eventType, UUID orderId) throws Exception {
        String messageIdText = MassTransitMessage.messageIdOf(body, objectMapper);
        if (messageIdText != null) {
            return UUID.fromString(messageIdText);
        }
        return UUID.nameUUIDFromBytes((eventType + ":" + orderId).getBytes(StandardCharsets.UTF_8));
    }
}
