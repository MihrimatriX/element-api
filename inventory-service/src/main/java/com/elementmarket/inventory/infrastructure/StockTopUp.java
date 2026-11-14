package com.elementmarket.inventory.infrastructure;

import com.elementmarket.inventory.application.InventoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Weekly restock of the simulated shelves. Set STOCK_RESTOCK_CRON to "-" to switch it off. */
@Component
public class StockTopUp {

    private static final Logger log = LoggerFactory.getLogger(StockTopUp.class);

    private final InventoryService inventory;

    public StockTopUp(InventoryService inventory) {
        this.inventory = inventory;
    }

    @Scheduled(cron = "${inventory.restock-cron:0 0 4 * * MON}")
    public void run() {
        int restocked = inventory.topUpStock();
        if (restocked > 0) {
            log.info("Weekly restock: {} element(s) back to the default stock", restocked);
        }
    }
}
