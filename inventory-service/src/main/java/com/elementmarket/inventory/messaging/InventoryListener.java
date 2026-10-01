package com.elementmarket.inventory.messaging;

import com.elementmarket.inventory.config.RabbitConfig;
import com.elementmarket.inventory.stock.StockRepository;
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

@Component
public class InventoryListener {

    private static final Logger log = LoggerFactory.getLogger(InventoryListener.class);

    private final ObjectMapper objectMapper;
    private final StockRepository stock;
    private final EventPublisher publisher;

    public InventoryListener(ObjectMapper objectMapper, StockRepository stock, EventPublisher publisher) {
        this.objectMapper = objectMapper;
        this.stock = stock;
        this.publisher = publisher;
    }

    // One tx per delivery (same as wallet): processed_messages mark + stock work commit together, so a crash
    // or DB blip mid-handler means redelivery re-applies the event instead of skipping it as a duplicate.
    // Publishes happen inside the tx (no outbox): a failed commit re-publishes on retry; the saga dedupes by state.
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

    private void handle(Message message) throws Exception {
        byte[] body = message.getBody();
        String type = MassTransitMessage.typeOf(body, objectMapper);
        JsonNode msg = MassTransitMessage.messageOf(body, objectMapper);
        String orderIdText = MassTransitMessage.text(msg, "orderId", "OrderId");
        String mid = MassTransitMessage.messageIdOf(body, objectMapper);

        UUID orderId = orderIdText != null ? UUID.fromString(orderIdText) : null;
        UUID saleKey = orderId;
        if (saleKey == null && "ElementSoldEvent".equals(type) && mid != null) {
            saleKey = UUID.fromString(mid);
        }
        if (type == null || saleKey == null) return;

        UUID messageId = mid != null
                ? UUID.fromString(mid)
                : UUID.nameUUIDFromBytes((type + ":" + saleKey).getBytes());

        if (!stock.tryMarkProcessed(messageId, type, orderId)) return;

        switch (type) {
            case "OrderSubmittedEvent" -> handleSubmit(orderId, msg);
            case "OrderStockReleaseEvent" -> {
                if (orderId == null) return;
                stock.release(
                        orderId,
                        MassTransitMessage.text(msg, "elementSymbol", "ElementSymbol"),
                        BigDecimal.valueOf(MassTransitMessage.number(msg, "quantity", "Quantity")));
            }
            case "OrderCompletedEvent" -> {
                if (orderId == null) return;
                stock.fulfill(orderId);
            }
            case "ElementSoldEvent" -> stock.restock(
                    saleKey,
                    MassTransitMessage.text(msg, "elementSymbol", "ElementSymbol"),
                    BigDecimal.valueOf(MassTransitMessage.number(msg, "grams", "Grams")));
            default -> log.debug("Ignoring inventory event {}", type);
        }
    }

    private void handleSubmit(UUID orderId, JsonNode msg) throws Exception {
        if (orderId == null) return;
        String symbol = MassTransitMessage.text(msg, "elementSymbol", "ElementSymbol");
        BigDecimal quantity = BigDecimal.valueOf(MassTransitMessage.number(msg, "quantity", "Quantity"));
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("orderId", orderId.toString());
        if (symbol == null || quantity.signum() <= 0) {
            payload.put("reason", "Quantity must be positive.");
            publisher.publish("StockReservationFailedEvent", payload);
            return;
        }
        var result = stock.reserve(orderId, symbol, quantity);
        if (result.ok()) {
            publisher.publish("StockReservedEvent", payload);
            return;
        }
        if (result.available() != null) {
            payload.put("reason", "Insufficient stock. Available: " + result.available() + "g.");
            publisher.publish("StockReservationFailedEvent", payload);
        }
    }
}
