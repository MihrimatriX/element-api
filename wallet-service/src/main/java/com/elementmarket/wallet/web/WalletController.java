package com.elementmarket.wallet.web;

import com.elementmarket.wallet.application.WalletRepository.WalletView;
import com.elementmarket.wallet.application.WalletService;
import com.elementmarket.wallet.application.WalletService.SaleResult;
import com.elementmarket.wallet.config.RabbitConfig.WalletSettings;
import com.elementmarket.wallet.domain.Grams;
import com.elementmarket.wallet.domain.Holding;
import com.elementmarket.wallet.domain.Money;
import com.elementmarket.wallet.web.MarketClient.CompoundQuote;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * User-facing wallet API (balance, holdings, desk sell). It is reached through the gateway, which checks the
 * user's API key and forwards the shared INTERNAL_API_KEY header plus the caller's X-User-Id.
 * This adapter only authenticates, validates input and shapes JSON; {@link WalletService} does the work.
 */
@RestController
public class WalletController {

    private static final String CURRENCY = "KREDI";
    private static final Pattern SYMBOL_PATTERN = Pattern.compile("(?i)^[a-z]{1,3}$");
    /** Slug goes into the compound-service URL path: same shape order-service accepts, no '/', '.', '%'. */
    private static final Pattern COMPOUND_SLUG_PATTERN = Pattern.compile("(?i)^[a-z0-9-]{1,64}$");
    private static final Pattern USER_ID_PATTERN =
            Pattern.compile("(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");
    private static final double MIN_SELL_GRAMS = 0.0001;
    private static final double MAX_SELL_GRAMS = 1_000_000;
    private static final String MISSING_FIELDS_ERROR = "symbol and grams are required.";

    private final WalletService wallets;
    private final WalletSettings settings;
    private final MarketClient market;

    public WalletController(WalletService wallets, WalletSettings settings, MarketClient market) {
        this.wallets = wallets;
        this.settings = settings;
        this.market = market;
    }

    /** Returns the caller's KREDI balance, creating the wallet with the welcome grant on first call. */
    @GetMapping("/api/v1/me/wallet")
    public ResponseEntity<?> wallet(
            @RequestHeader(value = "INTERNAL_API_KEY", required = false) String key,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (!isAuthorized(key, userId)) {
            return unauthorized();
        }
        WalletView wallet = wallets.walletOf(UUID.fromString(userId));
        return ResponseEntity.ok(Map.of(
                "balanceElx", wallet.balance().amount().doubleValue(),
                "currency", CURRENCY,
                "updatedAt", wallet.updatedAt().toString()));
    }

    /** Lists the grams the caller owns per element/compound with their average cost. */
    @GetMapping("/api/v1/me/holdings")
    public ResponseEntity<?> holdings(
            @RequestHeader(value = "INTERNAL_API_KEY", required = false) String key,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (!isAuthorized(key, userId)) {
            return unauthorized();
        }
        return ResponseEntity.ok(
                wallets.holdingsOf(UUID.fromString(userId)).stream().map(WalletController::toHoldingJson).toList());
    }

    /**
     * Sells grams back to the desk at the current bid (times the compound multiplier), credits KREDI
     * and queues ElementSoldEvent (inventory restock, catalog price nudge) in the same transaction.
     * The market quote is fetched here, before that transaction opens, so no lock waits on HTTP.
     */
    @PostMapping("/api/v1/desk/sell")
    public ResponseEntity<?> sell(
            @RequestHeader(value = "INTERNAL_API_KEY", required = false) String key,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody Map<String, Object> body) {
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
        Grams roundedGrams = Grams.of(BigDecimal.valueOf(grams));

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
        Money productBid = Money.of(elementBid.get().multiply(BigDecimal.valueOf(quote.priceMult())));
        // Same truncating rule the wallet pays out with, so a sale worth less than 0.0001 KREDI is refused.
        if (productBid.times(roundedGrams).isZero()) {
            return badRequest("Sale amount is too small.");
        }

        SaleResult sale = wallets.sell(UUID.fromString(userId), upperSymbol, roundedGrams, productBid, quote.slug());
        if (sale.failure() != null) {
            String error = "no_holding".equals(sale.failure())
                    ? "No holdings for this symbol."
                    : "Insufficient holdings.";
            return ResponseEntity.badRequest().body(Map.of(
                    "error", error,
                    "reason", sale.failure()));
        }
        return ResponseEntity.ok(Map.of(
                "symbol", upperSymbol,
                "grams", roundedGrams.value().doubleValue(),
                "bid", productBid.amount().doubleValue(),
                "proceedsElx", sale.proceeds().amount().doubleValue(),
                "balanceElx", sale.balance().amount().doubleValue(),
                "currency", CURRENCY));
    }

    /** Maps a holding to the wire shape; the product label falls back to the symbol. */
    private static Map<String, Object> toHoldingJson(Holding holding) {
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("symbol", holding.symbol());
        json.put("grams", holding.grams().value().doubleValue());
        json.put("avgCostElx", holding.averageCost().amount().doubleValue());
        json.put("compoundSlug", holding.compoundSlug());
        json.put("productLabel", holding.productLabel() != null ? holding.productLabel() : holding.symbol());
        return json;
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
