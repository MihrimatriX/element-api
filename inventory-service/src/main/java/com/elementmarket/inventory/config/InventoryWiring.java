package com.elementmarket.inventory.config;

import com.elementmarket.inventory.application.InventoryService;
import com.elementmarket.inventory.application.Outbox;
import com.elementmarket.inventory.application.StockRepository;
import com.elementmarket.inventory.domain.Grams;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;

/** Builds the framework-free {@link InventoryService} from its ports and turns on the outbox relay schedule. */
@Configuration
@EnableScheduling
public class InventoryWiring {

    /** {@code defaultStockGrams}: seeded for a symbol on its first write, and reported for symbols never seen. */
    @Bean
    public InventoryService inventoryService(
            StockRepository stock,
            Outbox outbox,
            TransactionTemplate tx,
            @Value("${inventory.default-stock-grams:100000}") BigDecimal defaultStockGrams) {
        return new InventoryService(stock, outbox, tx, Grams.of(defaultStockGrams));
    }
}
