package com.elementmarket.wallet.web;

import com.elementmarket.wallet.config.RabbitConfig.WalletSettings;
import com.elementmarket.wallet.ledger.LedgerRepository;
import com.elementmarket.wallet.messaging.EventPublisher;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.util.*;

@RestController
public class WalletController {

    private final LedgerRepository ledger;
    private final WalletSettings settings;
    private final MarketClient market;
    private final EventPublisher publisher;
    private final ObjectMapper objectMapper;

    public WalletController(
            LedgerRepository ledger,
            WalletSettings settings,
            MarketClient market,
            EventPublisher publisher,
            ObjectMapper objectMapper) {
        this.ledger = ledger;
        this.settings = settings;
        this.market = market;
        this.publisher = publisher;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/api/v1/me/wallet")
    public ResponseEntity<?> wallet(
            @RequestHeader(value = "INTERNAL_API_KEY", required = false) String key,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (!auth(key, userId)) return unauthorized();
        var row = ledger.getWallet(UUID.fromString(userId));
        return ResponseEntity.ok(Map.of(
                "balanceElx", ((Number) row.get("balance_elx")).doubleValue(),
                "currency", "KREDI",
                "updatedAt", ((Timestamp) row.get("updated_at")).toInstant().toString()));
    }

    @GetMapping("/api/v1/me/holdings")
    public ResponseEntity<?> holdings(
            @RequestHeader(value = "INTERNAL_API_KEY", required = false) String key,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (!auth(key, userId)) return unauthorized();
        List<Map<String, Object>> out = new ArrayList<>();
        for (var r : ledger.getHoldings(UUID.fromString(userId))) {
            out.add(Map.of(
                    "symbol", r.get("symbol"),
                    "grams", ((Number) r.get("grams")).doubleValue(),
                    "avgCostElx", ((Number) r.get("avg_cost_elx")).doubleValue(),
                    "compoundSlug", r.get("compound_slug"),
                    "productLabel", r.get("product_label") != null ? r.get("product_label") : r.get("symbol")));
        }
        return ResponseEntity.ok(out);
    }

    @PostMapping("/api/v1/desk/sell")
    public ResponseEntity<?> sell(
            @RequestHeader(value = "INTERNAL_API_KEY", required = false) String key,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody Map<String, Object> body) throws Exception {
        if (!auth(key, userId)) return unauthorized();
        Object symbolObj = body.get("symbol");
        Object gramsObj = body.get("grams");
        if (!(symbolObj instanceof String symbol) || !(gramsObj instanceof Number gramsNum)) {
            return ResponseEntity.badRequest().body(Map.of("error", "symbol and grams are required."));
        }
        String compoundSlug = body.get("compoundSlug") instanceof String s ? s : null;
        if (!symbol.matches("(?i)^[a-z]{1,3}$")) {
            return ResponseEntity.badRequest().body(Map.of("error", "symbol and grams are required."));
        }
        double grams = gramsNum.doubleValue();
        if (!(grams >= 0.0001 && grams <= 1_000_000)) {
            return ResponseEntity.badRequest().body(Map.of("error", "symbol and grams are required."));
        }
        String sym = symbol.toUpperCase(Locale.ROOT);
        var bidOpt = market.resolveBid(sym);
        if (bidOpt.isEmpty() || bidOpt.get().signum() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Could not determine bid for '" + sym + "'."));
        }
        var skuOpt = market.resolveCompound(sym, compoundSlug);
        if (skuOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unknown product."));
        }
        var sku = skuOpt.get();
        BigDecimal bid = bidOpt.get().multiply(BigDecimal.valueOf(sku.priceMult())).setScale(4, RoundingMode.HALF_UP);
        if (bid.multiply(BigDecimal.valueOf(grams)).setScale(4, RoundingMode.HALF_UP).signum() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Sale amount is too small."));
        }
        var result = ledger.sellAtBid(
                UUID.fromString(userId),
                sym,
                BigDecimal.valueOf(grams).setScale(4, RoundingMode.HALF_UP),
                bid,
                sku.slug());
        if (!result.ok()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error",
                    "no_holding".equals(result.reason()) ? "No holdings for this symbol." : "Insufficient holdings.",
                    "reason", result.reason()));
        }
        ObjectNode sold = objectMapper.createObjectNode();
        sold.put("elementSymbol", sym);
        sold.put("grams", grams);
        sold.put("customerId", userId);
        publisher.publish("ElementSoldEvent", sold);
        return ResponseEntity.ok(Map.of(
                "symbol", result.symbol(),
                "grams", result.grams().doubleValue(),
                "bid", result.bid().doubleValue(),
                "proceedsElx", result.proceeds().doubleValue(),
                "balanceElx", result.balanceElx().doubleValue(),
                "currency", "KREDI"));
    }

    private boolean auth(String key, String userId) {
        return secretsEqual(settings.internalApiKey(), key)
                && userId != null
                && userId.matches("(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");
    }

    /** Constant-time compare for INTERNAL_API_KEY. */
    static boolean secretsEqual(String expected, String provided) {
        if (expected == null || provided == null) return false;
        byte[] a = expected.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] b = provided.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return java.security.MessageDigest.isEqual(a, b);
    }

    private static ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
    }
}
