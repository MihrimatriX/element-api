package com.elementmarket.wallet.web;

import com.elementmarket.wallet.config.RabbitConfig.WalletSettings;
import com.elementmarket.wallet.ledger.LedgerRepository;
import com.elementmarket.wallet.ledger.LedgerRepository.SellResult;
import com.elementmarket.wallet.ledger.LedgerRules;
import com.elementmarket.wallet.messaging.EventPublisher;
import com.elementmarket.wallet.web.MarketClient.CompoundQuote;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * User-facing wallet API (balance, holdings, desk sell). It is reached through the gateway, which checks the
 * user's API key and forwards the shared INTERNAL_API_KEY header plus the caller's X-User-Id.
 */
@RestController
public class WalletController {

    private static final Logger log = LoggerFactory.getLogger(WalletController.class);

    private static final String CURRENCY = "KREDI";
    private static final Pattern SYMBOL_PATTERN = Pattern.compile("(?i)^[a-z]{1,3}$");
    /** Slug goes into the compound-service URL path: same shape order-service accepts, no '/', '.', '%'. */
    private static final Pattern COMPOUND_SLUG_PATTERN = Pattern.compile("(?i)^[a-z0-9-]{1,64}$");
    private static final Pattern USER_ID_PATTERN =
            Pattern.compile("(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");
    private static final double MIN_SELL_GRAMS = 0.0001;
    private static final double MAX_SELL_GRAMS = 1_000_000;
    private static final String MISSING_FIELDS_ERROR = "symbol and grams are required.";

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

    /** Returns the caller's KREDI balance, creating the wallet with the welcome grant on first call. */
    @GetMapping("/api/v1/me/wallet")
    public ResponseEntity<?> wallet(
            @RequestHeader(value = "INTERNAL_API_KEY", required = false) String key,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (!isAuthorized(key, userId)) {
            return unauthorized();
        }
        Map<String, Object> walletRow = ledger.getWallet(UUID.fromString(userId));
        double balance = ((Number) walletRow.get("balance_elx")).doubleValue();
        String updatedAt = ((Timestamp) walletRow.get("updated_at")).toInstant().toString();
        return ResponseEntity.ok(Map.of(
                "balanceElx", balance,
                "currency", CURRENCY,
                "updatedAt", updatedAt));
    }

    /** Lists the grams the caller owns per element/compound with their average cost. */
    @GetMapping("/api/v1/me/holdings")
    public ResponseEntity<?> holdings(
            @RequestHeader(value = "INTERNAL_API_KEY", required = false) String key,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (!isAuthorized(key, userId)) {
            return unauthorized();
        }
        List<Map<String, Object>> response = new ArrayList<>();
        for (Map<String, Object> holdingRow : ledger.getHoldings(UUID.fromString(userId))) {
            response.add(toHoldingJson(holdingRow));
        }
        return ResponseEntity.ok(response);
    }

    /**
     * Sells grams back to the desk at the current bid (times the compound multiplier), credits KREDI
     * and publishes ElementSoldEvent so inventory restocks and the catalog nudges the price.
     */
    @PostMapping("/api/v1/desk/sell")
    public ResponseEntity<?> sell(
            @RequestHeader(value = "INTERNAL_API_KEY", required = false) String key,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody Map<String, Object> body) throws Exception {
        if (!isAuthorized(key, userId)) {
            return unauthorized();
        }
        if (!(body.get("symbol") instanceof String symbol) || !(body.get("grams") instanceof Number gramsNumber)) {
            return badRequest(MISSING_FIELDS_ERROR);
        }
        // A blank slug means the plain element, same as a missing one.
        String compoundSlug = body.get("compoundSlug") instanceof String slug && !slug.isBlank() ? slug : null;
        boolean invalidSlug = compoundSlug != null && !COMPOUND_SLUG_PATTERN.matcher(compoundSlug).matches();
        if (!SYMBOL_PATTERN.matcher(symbol).matches() || invalidSlug) {
            return badRequest(MISSING_FIELDS_ERROR);
        }
        double grams = gramsNumber.doubleValue();
        // Written as "not in range" so NaN is rejected too.
        if (!(grams >= MIN_SELL_GRAMS && grams <= MAX_SELL_GRAMS)) {
            return badRequest(MISSING_FIELDS_ERROR);
        }
        BigDecimal roundedGrams = BigDecimal.valueOf(grams).setScale(LedgerRules.AMOUNT_SCALE, RoundingMode.HALF_UP);

        String upperSymbol = symbol.toUpperCase(Locale.ROOT);
        Optional<BigDecimal> elementBid = market.resolveBid(upperSymbol);
        if (elementBid.isEmpty() || elementBid.get().signum() <= 0) {
            return badRequest("Could not determine bid for '" + upperSymbol + "'.");
        }
        Optional<CompoundQuote> product = market.resolveCompound(upperSymbol, compoundSlug);
        if (product.isEmpty()) {
            return badRequest("Unknown product.");
        }
        CompoundQuote quote = product.get();
        BigDecimal productBid = elementBid.get()
                .multiply(BigDecimal.valueOf(quote.priceMult()))
                .setScale(LedgerRules.AMOUNT_SCALE, RoundingMode.HALF_UP);
        // Same truncating rule the ledger pays out with, so a sale worth less than 0.0001 KREDI is refused.
        if (LedgerRules.proceeds(productBid, roundedGrams).signum() <= 0) {
            return badRequest("Sale amount is too small.");
        }

        SellResult result = ledger.sellAtBid(UUID.fromString(userId), upperSymbol, roundedGrams, productBid, quote.slug());
        if (!result.ok()) {
            String error = "no_holding".equals(result.reason())
                    ? "No holdings for this symbol."
                    : "Insufficient holdings.";
            return ResponseEntity.badRequest().body(Map.of(
                    "error", error,
                    "reason", result.reason()));
        }

        publishElementSold(upperSymbol, result.grams(), userId);
        return ResponseEntity.ok(Map.of(
                "symbol", result.symbol(),
                "grams", result.grams().doubleValue(),
                "bid", result.bid().doubleValue(),
                "proceedsElx", result.proceeds().doubleValue(),
                "balanceElx", result.balanceElx().doubleValue(),
                "currency", CURRENCY));
    }

    /**
     * Best-effort ElementSoldEvent (inventory restock + catalog price nudge) for the grams actually sold.
     * The sale is already committed, so a publish failure is only logged: a 500 here makes clients retry
     * and sell twice. ponytail: no outbox — add one if restock accuracy starts to matter.
     */
    private void publishElementSold(String upperSymbol, BigDecimal soldGrams, String userId) {
        ObjectNode soldEvent = objectMapper.createObjectNode();
        soldEvent.put("elementSymbol", upperSymbol);
        soldEvent.put("grams", soldGrams);
        soldEvent.put("customerId", userId);
        try {
            publisher.publish("ElementSoldEvent", soldEvent);
        } catch (Exception e) {
            log.warn("ElementSoldEvent publish failed after committed sale {} {}g: {}", upperSymbol, soldGrams, e.toString());
        }
    }

    /** Maps a holdings row to the wire shape; the product label falls back to the symbol. */
    private static Map<String, Object> toHoldingJson(Map<String, Object> holdingRow) {
        Object productLabel = holdingRow.get("product_label");
        if (productLabel == null) {
            productLabel = holdingRow.get("symbol");
        }
        return Map.of(
                "symbol", holdingRow.get("symbol"),
                "grams", ((Number) holdingRow.get("grams")).doubleValue(),
                "avgCostElx", ((Number) holdingRow.get("avg_cost_elx")).doubleValue(),
                "compoundSlug", holdingRow.get("compound_slug"),
                "productLabel", productLabel);
    }

    /** Requires the gateway's internal key and a UUID-shaped X-User-Id. */
    private boolean isAuthorized(String key, String userId) {
        return secretsEqual(settings.internalApiKey(), key)
                && userId != null
                && USER_ID_PATTERN.matcher(userId).matches();
    }

    /** Constant-time compare for INTERNAL_API_KEY so response timing does not leak the key. */
    static boolean secretsEqual(String expected, String provided) {
        if (expected == null || provided == null) {
            return false;
        }
        byte[] expectedBytes = expected.getBytes(StandardCharsets.UTF_8);
        byte[] providedBytes = provided.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expectedBytes, providedBytes);
    }

    private static ResponseEntity<Map<String, String>> badRequest(String error) {
        return ResponseEntity.badRequest().body(Map.of("error", error));
    }

    private static ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
    }
}
