package com.elementmarket.inventory.web;

import com.elementmarket.inventory.stock.StockRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class StockController {

    private final StockRepository stock;

    public StockController(StockRepository stock) {
        this.stock = stock;
    }

    @GetMapping("/api/v1/stock/{symbol}")
    public ResponseEntity<?> stock(@PathVariable String symbol) {
        if (symbol == null || !symbol.matches("(?i)^[a-z]{1,3}$")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid symbol."));
        }
        return ResponseEntity.ok(stock.getStock(symbol));
    }
}
