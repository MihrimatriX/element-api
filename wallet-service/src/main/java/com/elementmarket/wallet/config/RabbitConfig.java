package com.elementmarket.wallet.config;

import com.elementmarket.wallet.messaging.MassTransitMessage;
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
 * Declares the wallet queue, binds it to the MassTransit exchanges it consumes, and exposes typed wallet settings.
 * Exchange names follow MassTransit's "Element.Shared.Events:TypeName" convention so .NET and Node publishers reach us.
 */
@Configuration
public class RabbitConfig {

    /** Durable queue that receives every event the wallet listens to. */
    public static final String WALLET_QUEUE = "wallet-service";
    /** Parking queue for deliveries that still fail after the listener retry budget. */
    public static final String WALLET_FAILED_QUEUE = WALLET_QUEUE + "_failed";

    @Bean
    public Queue walletQueue() {
        boolean durable = true;
        return new Queue(WALLET_QUEUE, durable);
    }

    @Bean
    public Queue walletFailedQueue() {
        boolean durable = true;
        return new Queue(WALLET_FAILED_QUEUE, durable);
    }

    /** Retries exhausted (spring.rabbitmq.listener.simple.retry): park, same *_failed convention as order-service. */
    @Bean
    public MessageRecoverer walletFailedRecoverer(RabbitTemplate rabbitTemplate) {
        return new RepublishMessageRecoverer(rabbitTemplate, "", WALLET_FAILED_QUEUE);
    }

    /**
     * Default (true) permanently stops the listener when the broker closes the socket mid-handshake
     * (e.g. RabbitMQ still booting after a reboot) while /health stays green. Keep retrying instead.
     */
    @Bean
    public ContainerCustomizer<SimpleMessageListenerContainer> walletListenerCustomizer() {
        return container -> container.setPossibleAuthenticationFailureFatal(false);
    }

    @Bean
    public FanoutExchange paymentRequestedExchange() {
        return durableFanout("PaymentRequestedEvent");
    }

    @Bean
    public FanoutExchange paymentRefundExchange() {
        return durableFanout("PaymentRefundRequestedEvent");
    }

    @Bean
    public FanoutExchange assetsCreditedExchange() {
        return durableFanout("AssetsCreditedEvent");
    }

    @Bean
    public Binding bindPaymentRequested(Queue walletQueue, FanoutExchange paymentRequestedExchange) {
        return BindingBuilder.bind(walletQueue).to(paymentRequestedExchange);
    }

    @Bean
    public Binding bindPaymentRefund(Queue walletQueue, FanoutExchange paymentRefundExchange) {
        return BindingBuilder.bind(walletQueue).to(paymentRefundExchange);
    }

    @Bean
    public Binding bindAssetsCredited(Queue walletQueue, FanoutExchange assetsCreditedExchange) {
        return BindingBuilder.bind(walletQueue).to(assetsCreditedExchange);
    }

    /** Collects the wallet.* and internal.api-key properties into one immutable settings object. */
    @Bean
    public WalletSettings walletSettings(
            @Value("${wallet.credit-limit:50000}") double creditLimit,
            @Value("${wallet.welcome-grant:10000}") double welcomeGrant,
            @Value("${wallet.catalog-url:http://localhost:5002}") String catalogUrl,
            @Value("${wallet.compound-url:http://localhost:5007}") String compoundUrl,
            @Value("${wallet.market-spread-pct:0.008}") double spreadPct,
            @Value("${internal.api-key:element-internal-dev-key}") String internalApiKey) {
        return new WalletSettings(creditLimit, welcomeGrant, catalogUrl, compoundUrl, spreadPct, internalApiKey);
    }

    private static FanoutExchange durableFanout(String eventTypeName) {
        boolean durable = true;
        boolean autoDelete = false;
        return new FanoutExchange(MassTransitMessage.exchange(eventTypeName), durable, autoDelete);
    }

    /** Wallet configuration: purchase cap, signup grant, neighbour URLs, desk sell spread and the internal API key. */
    public record WalletSettings(
            double creditLimit,
            double welcomeGrant,
            String catalogUrl,
            String compoundUrl,
            double spreadPct,
            String internalApiKey) {}
}
