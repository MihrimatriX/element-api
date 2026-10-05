package com.elementmarket.inventory.messaging;

import com.elementmarket.inventory.config.RabbitConfig;
import com.elementmarket.inventory.stock.StockRepository;
import com.elementmarket.inventory.stock.StockRepository.ReserveResult;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Consumes order saga and desk events: reserves stock for new orders, releases it on cancel,
 * deducts it on completion and restocks grams sold back at the desk.
 * Each message is processed at most once thanks to the processed_messages table.
 */
@Component
public class InventoryListener {

    private static final Logger log = LoggerFactory.getLogger(InventoryListener.class);

    private static final String ELEMENT_SOLD_EVENT = "ElementSoldEvent";

    private final ObjectMapper objectMapper;
    private final StockRepository stock;
    private final EventPublisher publisher;

    public InventoryListener(ObjectMapper objectMapper, StockRepository stock, EventPublisher publisher) {
        this.objectMapper = objectMapper;
        this.stock = stock;
        this.publisher = publisher;
    }

    /**
     * Entry point for every message on the inventory queue. Malformed messages (bad JSON or UUID) are
     * rejected without requeue so they cannot loop; everything else is dispatched by {@link #handle}.
     * <p>
     * One tx per delivery (same as wallet): processed_messages mark + stock work commit together, so a crash
     * or DB blip mid-handler means redelivery re-applies the event instead of skipping it as a duplicate.
     * Publishes happen inside the tx (no outbox): a failed commit re-publishes on retry; the saga dedupes by state.
     */
    @Transactional(rollbackFor = Exception.class)
    @RabbitListener(queues = RabbitConfig.INVENTORY_QUEUE)
    public void onMessage(Message message) throws Exception {
        try {
            handle(message);
        } catch (JsonProcessingException | IllegalArgumentException e) {
            // Bad JSON / bad UUID never succeeds; the default requeue would redeliver it in a hot loop.
            throw new AmqpRejectAndDontRequeueException("Dropping malformed inventory message", e);
        }
    }

    /** Dedupes the delivery via processed_messages, then dispatches by MassTransit event type. */
    private void handle(Message message) throws Exception {
        byte[] body = message.getBody();
        String eventType = MassTransitMessage.typeOf(body, objectMapper);
        JsonNode payload = MassTransitMessage.messageOf(body, objectMapper);
        String orderIdText = MassTransitMessage.text(payload, "orderId", "OrderId");
        String messageIdText = MassTransitMessage.messageIdOf(body, objectMapper);

        UUID orderId = orderIdText != null ? UUID.fromString(orderIdText) : null;
        // Desk sales have no order id, so the envelope's message id identifies the sale instead.
        UUID saleKey = orderId;
        if (saleKey == null && ELEMENT_SOLD_EVENT.equals(eventType) && messageIdText != null) {
            saleKey = UUID.fromString(messageIdText);
        }
        if (eventType == null || saleKey == null) {
            return;
        }

        UUID messageId = resolveMessageId(messageIdText, eventType, saleKey);
        boolean isFirstDelivery = stock.tryMarkProcessed(messageId, eventType, orderId);
        if (!isFirstDelivery) {
            return;
        }

        // For every event except ElementSoldEvent, a non-null saleKey means orderId is non-null here.
        switch (eventType) {
            case "OrderSubmittedEvent" -> handleSubmit(orderId, payload);
            case "OrderStockReleaseEvent" -> stock.release(orderId, symbolOf(payload), quantityOf(payload));
            // Completion deducts what was actually reserved, so the event's symbol/quantity are not read.
            case "OrderCompletedEvent" -> stock.fulfill(orderId);
            case ELEMENT_SOLD_EVENT -> stock.restock(saleKey, symbolOf(payload), gramsOf(payload));
            default -> log.debug("Ignoring inventory event {}", eventType);
        }
    }

    /**
     * Uses the envelope's messageId when present; otherwise derives a stable id from type + key
     * so a redelivered message without an id is still recognised as a duplicate.
     */
    private static UUID resolveMessageId(String messageIdText, String eventType, UUID saleKey) {
        if (messageIdText != null) {
            return UUID.fromString(messageIdText);
        }
        String stableKey = eventType + ":" + saleKey;
        return UUID.nameUUIDFromBytes(stableKey.getBytes());
    }

    /** Tries to reserve stock and answers the saga with StockReservedEvent or StockReservationFailedEvent. */
    private void handleSubmit(UUID orderId, JsonNode payload) throws Exception {
        String symbol = symbolOf(payload);
        BigDecimal quantity = quantityOf(payload);
        ObjectNode reply = objectMapper.createObjectNode();
        reply.put("orderId", orderId.toString());
        if (symbol == null || quantity.signum() <= 0) {
            reply.put("reason", "Quantity must be positive.");
            publisher.publish("StockReservationFailedEvent", reply);
            return;
        }

        ReserveResult result = stock.reserve(orderId, symbol, quantity);
        if (result.ok()) {
            publisher.publish("StockReservedEvent", reply);
            return;
        }
        // No available amount means the order was already released or fulfilled: nothing to announce.
        if (result.available() != null) {
            reply.put("reason", "Insufficient stock. Available: " + result.available() + "g.");
            publisher.publish("StockReservationFailedEvent", reply);
        }
    }

    private static String symbolOf(JsonNode payload) {
        return MassTransitMessage.text(payload, "elementSymbol", "ElementSymbol");
    }

    private static BigDecimal quantityOf(JsonNode payload) {
        return BigDecimal.valueOf(MassTransitMessage.number(payload, "quantity", "Quantity"));
    }

    private static BigDecimal gramsOf(JsonNode payload) {
        return BigDecimal.valueOf(MassTransitMessage.number(payload, "grams", "Grams"));
    }
}
