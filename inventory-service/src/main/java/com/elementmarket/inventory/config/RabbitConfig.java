package com.elementmarket.inventory.config;

import com.elementmarket.inventory.messaging.MassTransitMessage;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String INVENTORY_QUEUE = "inventory-service";

    @Bean
    public Queue inventoryQueue() {
        return new Queue(INVENTORY_QUEUE, true);
    }

    @Bean FanoutExchange orderSubmittedEx() {
        return new FanoutExchange(MassTransitMessage.exchange("OrderSubmittedEvent"), true, false);
    }
    @Bean FanoutExchange stockReleaseEx() {
        return new FanoutExchange(MassTransitMessage.exchange("OrderStockReleaseEvent"), true, false);
    }
    @Bean FanoutExchange orderCompletedEx() {
        return new FanoutExchange(MassTransitMessage.exchange("OrderCompletedEvent"), true, false);
    }
    @Bean FanoutExchange elementSoldEx() {
        return new FanoutExchange(MassTransitMessage.exchange("ElementSoldEvent"), true, false);
    }

    @Bean Binding bindSubmitted(Queue inventoryQueue, FanoutExchange orderSubmittedEx) {
        return BindingBuilder.bind(inventoryQueue).to(orderSubmittedEx);
    }
    @Bean Binding bindRelease(Queue inventoryQueue, FanoutExchange stockReleaseEx) {
        return BindingBuilder.bind(inventoryQueue).to(stockReleaseEx);
    }
    @Bean Binding bindCompleted(Queue inventoryQueue, FanoutExchange orderCompletedEx) {
        return BindingBuilder.bind(inventoryQueue).to(orderCompletedEx);
    }
    @Bean Binding bindSold(Queue inventoryQueue, FanoutExchange elementSoldEx) {
        return BindingBuilder.bind(inventoryQueue).to(elementSoldEx);
    }

    @Bean
    public InventorySettings inventorySettings(
            @Value("${inventory.default-stock-grams:100000}") double defaultStockGrams) {
        return new InventorySettings(defaultStockGrams);
    }

    public record InventorySettings(double defaultStockGrams) {}
}
