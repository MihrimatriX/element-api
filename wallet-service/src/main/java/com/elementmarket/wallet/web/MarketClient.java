package com.elementmarket.wallet.web;

import com.elementmarket.wallet.config.RabbitConfig.WalletSettings;
import com.elementmarket.wallet.ledger.LedgerRules;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.Optional;

/**
 * HTTP client for the catalog (element ticker) and compound services, used by the desk sell endpoint
 * to price a sale. Any network or parsing failure is reported as an empty Optional.
 */
@Component
public class MarketClient {

    private final RestClient http;
    private final WalletSettings settings;

    // Boot's builder carries spring.http.client.connect-timeout/read-timeout; RestClient.create() has none.
    public MarketClient(WalletSettings settings, RestClient.Builder http) {
        this.settings = settings;
        this.http = http.build();
    }

    /** Sellable product resolved from the compound service; priceMult scales the element's bid. */
    public record CompoundQuote(String slug, String formula, String label, double priceMult) {}

    /**
     * Returns the price the desk pays per gram: the ticker's bid, or last price minus the configured spread
     * when no bid is published. Empty when the catalog is unreachable or has no usable price.
     */
    public Optional<BigDecimal> resolveBid(String symbol) {
        try {
            JsonNode ticker = http.get()
                    .uri(settings.catalogUrl() + "/api/v1/elements/{symbol}/ticker", symbol)
                    .retrieve()
                    .body(JsonNode.class);
            if (ticker == null) {
                return Optional.empty();
            }
            double bid = number(ticker, "bid", "Bid");
            if (bid > 0) {
                return Optional.of(BigDecimal.valueOf(bid));
            }
            double lastPrice = number(ticker, "last", "Last");
            if (lastPrice > 0) {
                double priceAfterSpread = lastPrice * (1 - settings.spreadPct());
                return Optional.of(BigDecimal.valueOf(priceAfterSpread)
                        .setScale(LedgerRules.AMOUNT_SCALE, RoundingMode.HALF_UP));
            }
        } catch (Exception ignored) {
            // Catalog down or malformed answer: the caller turns an empty result into a 400.
        }
        return Optional.empty();
    }

    /**
     * Resolves which product is being sold. Plain-element slugs map to an "elemental" quote with multiplier 1
     * without a network call; other slugs must exist in the compound service and belong to the same element.
     */
    public Optional<CompoundQuote> resolveCompound(String symbol, String compoundSlug) {
        String upperSymbol = symbol.toUpperCase(Locale.ROOT);
        if (isPlainElementSlug(compoundSlug, upperSymbol)) {
            return Optional.of(new CompoundQuote(LedgerRules.DEFAULT_COMPOUND_SLUG, upperSymbol, upperSymbol, 1));
        }
        try {
            JsonNode compound = http.get()
                    .uri(settings.compoundUrl() + "/api/v1/compounds/{slug}", compoundSlug)
                    .retrieve()
                    .body(JsonNode.class);
            if (compound == null) {
                return Optional.empty();
            }
            String parentSymbol = textOrEmpty(compound, "elementSymbol", "ElementSymbol").toUpperCase(Locale.ROOT);
            boolean belongsToOtherElement = !parentSymbol.isEmpty() && !parentSymbol.equals(upperSymbol);
            if (belongsToOtherElement) {
                return Optional.empty();
            }
            double priceMultiplier = number(compound, "priceMult", "PriceMult");
            // Written as "not greater than zero" so a NaN multiplier is rejected too.
            if (!(priceMultiplier > 0)) {
                return Optional.empty();
            }

            String formula = textOrEmpty(compound, "formula", "Formula");
            if (formula.isEmpty()) {
                formula = compoundSlug;
            }
            String slug = textOrEmpty(compound, "slug", "Slug");
            if (slug.isEmpty()) {
                slug = compoundSlug;
            }
            String label = chooseLabel(compound, formula);
            return Optional.of(new CompoundQuote(slug, formula, label, priceMultiplier));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /** True for a missing slug, "elemental", the symbol itself (any case) or "elemental-{lowercase symbol}". */
    private static boolean isPlainElementSlug(String compoundSlug, String upperSymbol) {
        if (compoundSlug == null || compoundSlug.isBlank()) {
            return true;
        }
        String lowerSymbol = upperSymbol.toLowerCase(Locale.ROOT);
        return LedgerRules.DEFAULT_COMPOUND_SLUG.equals(compoundSlug)
                || compoundSlug.equalsIgnoreCase(upperSymbol)
                || compoundSlug.equals(LedgerRules.DEFAULT_COMPOUND_SLUG + "-" + lowerSymbol);
    }

    /** Prefers the Turkish name, then the English name, then the formula. */
    private static String chooseLabel(JsonNode compound, String formula) {
        String turkishName = textOrEmpty(compound, "nameTr", "NameTr");
        if (!turkishName.isEmpty()) {
            return turkishName;
        }
        String englishName = textOrEmpty(compound, "name", "Name");
        if (!englishName.isEmpty()) {
            return englishName;
        }
        return formula;
    }

    /** Reads a number by camelCase name, falling back to PascalCase; 0 when missing or not numeric. */
    private static double number(JsonNode node, String camelName, String pascalName) {
        JsonNode field = node.has(camelName) ? node.get(camelName) : node.path(pascalName);
        return field.asDouble(0);
    }

    /** Reads text by camelCase or PascalCase name, skipping JSON nulls; "" when neither is present. */
    private static String textOrEmpty(JsonNode node, String camelName, String pascalName) {
        if (node.has(camelName) && !node.get(camelName).isNull()) {
            return node.get(camelName).asText();
        }
        if (node.has(pascalName) && !node.get(pascalName).isNull()) {
            return node.get(pascalName).asText();
        }
        return "";
    }
}
