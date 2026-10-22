package com.elementmarket.inventory.messaging;

import com.elementmarket.inventory.application.Delivery;
import com.elementmarket.inventory.application.InventoryService;
import com.elementmarket.inventory.config.RabbitConfig;
import com.elementmarket.inventory.domain.Grams;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Inbound adapter for order saga and desk events: reads the MassTransit envelope and calls the matching
 * {@link InventoryService} use case, which owns the transaction and the dedupe. Malformed messages are rejected
 * without requeue; any other exception makes the broker retry and finally park the delivery in
 * inventory-service_failed.
 */
@Component
public class InventoryListener {

    private static final Logger log = LoggerFactory.getLogger(InventoryListener.class);

    private static final String ELEMENT_SOLD_EVENT = "ElementSoldEvent";

    private final ObjectMapper objectMapper;
    private final InventoryService inventory;

    public InventoryListener(ObjectMapper objectMapper, InventoryService inventory) {
        this.objectMapper = objectMapper;
        this.inventory = inventory;
    }

    @RabbitListener(queues = RabbitConfig.INVENTORY_QUEUE)
    public void onMessage(Message message) throws Exception {
        try {
            handle(message);
        } catch (JsonProcessingException | IllegalArgumentException e) {
            // Bad JSON / UUID / negative grams never succeed; the default requeue would redeliver them in a hot loop.
            throw new AmqpRejectAndDontRequeueException("Dropping malformed inventory message", e);
        }
    }

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
        Delivery delivery = new Delivery(resolveMessageId(messageIdText, eventType, saleKey), eventType, orderId);
        String symbol = MassTransitMessage.text(payload, "elementSymbol", "ElementSymbol");

        // For every event except ElementSoldEvent, a non-null saleKey means orderId is non-null here.
        switch (eventType) {
            case "OrderSubmittedEvent" -> inventory.reserveForOrder(
                    delivery, symbol, MassTransitMessage.decimal(payload, "quantity", "Quantity"));
            case "OrderStockReleaseEvent" -> inventory.releaseOrder(delivery, symbol);
            // Completion deducts what was actually reserved, so the event's symbol/quantity are not read.
            case "OrderCompletedEvent" -> inventory.fulfillOrder(delivery);
            case ELEMENT_SOLD_EVENT -> {
                if (symbol == null) {
                    throw new IllegalArgumentException("ElementSoldEvent without a symbol");
                }
                Grams grams = Grams.of(MassTransitMessage.decimal(payload, "grams", "Grams"));
                inventory.restock(delivery, saleKey, symbol, grams);
            }
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
        return UUID.nameUUIDFromBytes((eventType + ":" + saleKey).getBytes(StandardCharsets.UTF_8));
    }
}
