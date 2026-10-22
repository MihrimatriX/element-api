package com.elementmarket.wallet.config;

import com.elementmarket.wallet.application.Outbox;
import com.elementmarket.wallet.application.WalletRepository;
import com.elementmarket.wallet.application.WalletService;
import com.elementmarket.wallet.config.RabbitConfig.WalletSettings;
import com.elementmarket.wallet.domain.Money;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;

/** Builds the framework-free {@link WalletService} from its ports and turns on the outbox relay schedule. */
@Configuration
@EnableScheduling
public class WalletWiring {

    @Bean
    public WalletService walletService(
            WalletRepository wallets, Outbox outbox, TransactionTemplate tx, WalletSettings settings) {
        return new WalletService(
                wallets,
                outbox,
                tx,
                Money.of(BigDecimal.valueOf(settings.creditLimit())),
                Money.of(BigDecimal.valueOf(settings.welcomeGrant())));
    }
}
