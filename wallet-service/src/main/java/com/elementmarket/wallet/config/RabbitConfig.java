package com.elementmarket.wallet.config;

import com.elementmarket.wallet.messaging.MassTransitMessage;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String WALLET_QUEUE = "wallet-service";

    @Bean
    public Queue walletQueue() {
        return new Queue(WALLET_QUEUE, true);
    }

    @Bean
    public FanoutExchange paymentRequestedExchange() {
        return new FanoutExchange(MassTransitMessage.exchange("PaymentRequestedEvent"), true, false);
    }

    @Bean
    public FanoutExchange paymentRefundExchange() {
        return new FanoutExchange(MassTransitMessage.exchange("PaymentRefundRequestedEvent"), true, false);
    }

    @Bean
    public FanoutExchange assetsCreditedExchange() {
        return new FanoutExchange(MassTransitMessage.exchange("AssetsCreditedEvent"), true, false);
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

    public record WalletSettings(
            double creditLimit,
            double welcomeGrant,
            String catalogUrl,
            String compoundUrl,
            double spreadPct,
            String internalApiKey) {}
}
