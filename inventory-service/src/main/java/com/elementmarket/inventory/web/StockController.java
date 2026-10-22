package com.elementmarket.inventory.web;

import com.elementmarket.inventory.application.InventoryService;
import com.elementmarket.inventory.domain.StockItem;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.regex.Pattern;

/** Public stock lookup used by the web app and by the order service's pre-check before submitting an order. */
@RestController
public class StockController {

    private static final Pattern SYMBOL_PATTERN = Pattern.compile("(?i)^[a-z]{1,3}$");

    private final InventoryService inventory;

    public StockController(InventoryService inventory) {
        this.inventory = inventory;
    }

    /** Returns stock, reserved and available grams for a 1-3 letter element symbol (case-insensitive); read-only. */
    @GetMapping("/api/v1/stock/{symbol}")
    public ResponseEntity<?> stock(@PathVariable String symbol) {
        if (symbol == null || !SYMBOL_PATTERN.matcher(symbol).matches()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid symbol."));
        }
        StockItem item = inventory.stockOf(symbol);
        return ResponseEntity.ok(Map.of(
                "symbol", item.symbol(),
                "stockGrams", item.stock().value().doubleValue(),
                "reservedGrams", item.reserved().value().doubleValue(),
                "availableGrams", item.available().value().doubleValue()));
    }
}
