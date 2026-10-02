package com.elementmarket.inventory.config;

import com.elementmarket.inventory.messaging.MassTransitMessage;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.config.ContainerCustomizer;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.listener.SimpleMessageListenerContainer;
import org.springframework.amqp.rabbit.retry.MessageRecoverer;
import org.springframework.amqp.rabbit.retry.RepublishMessageRecoverer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Declares the inventory queue, binds it to the MassTransit exchanges it consumes, and exposes typed settings.
 * Exchange names follow MassTransit's "Element.Shared.Events:TypeName" convention so .NET and Node publishers reach us.
 */
@Configuration
public class RabbitConfig {

    /** Durable queue that receives every event inventory listens to. */
    public static final String INVENTORY_QUEUE = "inventory-service";
    /** Parking queue for deliveries that still fail after the listener retry budget. */
    public static final String INVENTORY_FAILED_QUEUE = INVENTORY_QUEUE + "_failed";

    @Bean
    public Queue inventoryQueue() {
        boolean durable = true;
        return new Queue(INVENTORY_QUEUE, durable);
    }

    @Bean
    public Queue inventoryFailedQueue() {
        boolean durable = true;
        return new Queue(INVENTORY_FAILED_QUEUE, durable);
    }

    /** Retries exhausted (spring.rabbitmq.listener.simple.retry): park, same *_failed convention as wallet/order. */
    @Bean
    public MessageRecoverer inventoryFailedRecoverer(RabbitTemplate rabbitTemplate) {
        return new RepublishMessageRecoverer(rabbitTemplate, "", INVENTORY_FAILED_QUEUE);
    }

    @Bean
    public FanoutExchange orderSubmittedEx() {
        return durableFanout("OrderSubmittedEvent");
    }

    @Bean
    public FanoutExchange stockReleaseEx() {
        return durableFanout("OrderStockReleaseEvent");
    }

    @Bean
    public FanoutExchange orderCompletedEx() {
        return durableFanout("OrderCompletedEvent");
    }

    @Bean
    public FanoutExchange elementSoldEx() {
        return durableFanout("ElementSoldEvent");
    }

    @Bean
    public Binding bindSubmitted(Queue inventoryQueue, FanoutExchange orderSubmittedEx) {
        return BindingBuilder.bind(inventoryQueue).to(orderSubmittedEx);
    }

    @Bean
    public Binding bindRelease(Queue inventoryQueue, FanoutExchange stockReleaseEx) {
        return BindingBuilder.bind(inventoryQueue).to(stockReleaseEx);
    }

    @Bean
    public Binding bindCompleted(Queue inventoryQueue, FanoutExchange orderCompletedEx) {
        return BindingBuilder.bind(inventoryQueue).to(orderCompletedEx);
    }

    @Bean
    public Binding bindSold(Queue inventoryQueue, FanoutExchange elementSoldEx) {
        return BindingBuilder.bind(inventoryQueue).to(elementSoldEx);
    }

    /**
     * Default (fatal) stops the listener for good if a reconnect looks like an auth failure, which happens
     * while the broker restarts: process up, /health 200, queue never consumed. Keep retrying instead.
     */
    @Bean
    public ContainerCustomizer<SimpleMessageListenerContainer> keepListenerRetrying() {
        return container -> container.setPossibleAuthenticationFailureFatal(false);
    }

    /** Collects the inventory.* properties into one immutable settings object. */
    @Bean
    public InventorySettings inventorySettings(
            @Value("${inventory.default-stock-grams:100000}") double defaultStockGrams) {
        return new InventorySettings(defaultStockGrams);
    }

    private static FanoutExchange durableFanout(String eventTypeName) {
        boolean durable = true;
        boolean autoDelete = false;
        return new FanoutExchange(MassTransitMessage.exchange(eventTypeName), durable, autoDelete);
    }

    /** Inventory configuration: grams seeded for a symbol on its first reservation (also reported for unseen symbols). */
    public record InventorySettings(double defaultStockGrams) {}
}
