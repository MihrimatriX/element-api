package com.elementmarket.wallet.messaging;

import com.elementmarket.wallet.config.RabbitConfig;
import com.elementmarket.wallet.ledger.LedgerRepository;
import com.elementmarket.wallet.ledger.LedgerRepository.DebitResult;
import com.elementmarket.wallet.ledger.LedgerRules;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

/**
 * Consumes the order saga's wallet events: charges purchases, refunds cancelled orders and credits delivered grams.
 * Each message is processed at most once thanks to the processed_messages table.
 */
@Component
public class WalletListener {

    private static final Logger log = LoggerFactory.getLogger(WalletListener.class);

    /** Wire reason the order service shows for an unaffordable purchase (legacy "ELX" name kept on purpose). */
    private static final String INSUFFICIENT_FUNDS_REASON = "INSUFFICIENT_ELX";
    private static final String CREDIT_LIMIT_REASON = "Credit limit exceeded (50000 KREDI limit).";
    private static final String ORDER_CANCELLED_REASON = "ORDER_CANCELLED";

    private final ObjectMapper objectMapper;
    private final LedgerRepository ledger;
    private final EventPublisher publisher;

    public WalletListener(ObjectMapper objectMapper, LedgerRepository ledger, EventPublisher publisher) {
        this.objectMapper = objectMapper;
        this.ledger = ledger;
        this.publisher = publisher;
    }

    /**
     * Entry point for every message on the wallet queue; dispatches by MassTransit event type.
     * One tx per delivery: if the DB or broker drops mid-handler, the processed_messages mark rolls back
     * with the ledger work, so the redelivery is applied instead of skipped as a duplicate.
     */
    @Transactional(rollbackFor = Exception.class)
    @RabbitListener(queues = RabbitConfig.WALLET_QUEUE)
    public void onMessage(Message message) throws Exception {
        byte[] body = message.getBody();
        String eventType = MassTransitMessage.typeOf(body, objectMapper);
        JsonNode payload = MassTransitMessage.messageOf(body, objectMapper);
        String orderIdText = MassTransitMessage.text(payload, "orderId", "OrderId");
        if (eventType == null || orderIdText == null) {
            return;
        }
        UUID orderId = UUID.fromString(orderIdText);

        UUID messageId = resolveMessageId(body, eventType, orderId);
        boolean isFirstDelivery = ledger.tryMarkProcessed(messageId, eventType, orderId);
        if (!isFirstDelivery) {
            return;
        }

        String customerIdText = MassTransitMessage.text(payload, "customerId", "CustomerId");
        UUID customerId = customerIdText != null ? UUID.fromString(customerIdText) : null;

        switch (eventType) {
            case "PaymentRequestedEvent" -> handlePayment(orderId, customerId, payload);
            case "PaymentRefundRequestedEvent" -> handleRefund(orderId, customerId, payload);
            case "AssetsCreditedEvent" -> handleAssets(orderId, customerId, payload);
            default -> log.debug("Ignoring wallet event {}", eventType);
        }
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
        String stableKey = eventType + ":" + orderId;
        return UUID.nameUUIDFromBytes(stableKey.getBytes());
    }

    /** Debits the purchase and answers the saga with PaymentProcessedEvent or PaymentFailedEvent. */
    private void handlePayment(UUID orderId, UUID customerId, JsonNode payload) throws Exception {
        if (customerId == null) {
            return;
        }
        BigDecimal amount = BigDecimal.valueOf(MassTransitMessage.number(payload, "amount", "Amount"));
        String symbol = MassTransitMessage.text(payload, "elementSymbol", "ElementSymbol");
        BigDecimal quantity = BigDecimal.valueOf(MassTransitMessage.number(payload, "quantity", "Quantity"));
        DebitResult result = ledger.debit(customerId, orderId, amount, symbol, quantity);

        ObjectNode reply = objectMapper.createObjectNode();
        reply.put("orderId", orderId.toString());
        switch (result) {
            // A duplicate means the order was already charged, so the saga can safely move on.
            case OK, DUPLICATE -> publisher.publish("PaymentProcessedEvent", reply);
            case INSUFFICIENT -> {
                reply.put("reason", INSUFFICIENT_FUNDS_REASON);
                publisher.publish("PaymentFailedEvent", reply);
            }
            case LIMIT -> {
                reply.put("reason", CREDIT_LIMIT_REASON);
                publisher.publish("PaymentFailedEvent", reply);
            }
            // The order was already refunded/cancelled: refuse a late or replayed charge.
            case CANCELLED -> {
                reply.put("reason", ORDER_CANCELLED_REASON);
                publisher.publish("PaymentFailedEvent", reply);
            }
        }
    }

    /**
     * Returns the charged amount for a cancelled or failed order. If it was never charged, the ledger
     * records a 0 KREDI refund tombstone so a late PaymentRequested is refused.
     */
    private void handleRefund(UUID orderId, UUID customerId, JsonNode payload) {
        if (customerId == null) {
            return;
        }
        String symbol = MassTransitMessage.text(payload, "elementSymbol", "ElementSymbol");
        BigDecimal quantity = BigDecimal.valueOf(MassTransitMessage.number(payload, "quantity", "Quantity"));
        ledger.refundIfDebited(customerId, orderId, symbol, quantity);
    }

    /**
     * Adds the delivered grams to the buyer's holdings at the paid unit price.
     * The ledger throws for an unpaid or refunded order, so the message retries and then parks in wallet-service_failed.
     */
    private void handleAssets(UUID orderId, UUID customerId, JsonNode payload) {
        if (customerId == null) {
            return;
        }
        String symbol = MassTransitMessage.text(payload, "elementSymbol", "ElementSymbol");
        BigDecimal quantity = BigDecimal.valueOf(MassTransitMessage.number(payload, "quantity", "Quantity"));
        BigDecimal totalPrice = BigDecimal.valueOf(MassTransitMessage.number(payload, "totalPrice", "TotalPrice"));
        String compoundSlug = MassTransitMessage.text(payload, "compoundSlug", "CompoundSlug");
        if (compoundSlug == null || compoundSlug.isBlank()) {
            compoundSlug = LedgerRules.DEFAULT_COMPOUND_SLUG;
        }
        String productLabel = MassTransitMessage.text(payload, "productLabel", "ProductLabel");
        if (symbol == null || quantity.signum() <= 0 || totalPrice.signum() <= 0) {
            return;
        }

        BigDecimal unitCost = totalPrice.divide(quantity, LedgerRules.AMOUNT_SCALE, RoundingMode.HALF_UP);
        ledger.addHolding(customerId, orderId, symbol, quantity, unitCost, compoundSlug, productLabel);
        log.info("Assets credited order {} {}g {}", orderId, quantity, symbol);
    }
}
