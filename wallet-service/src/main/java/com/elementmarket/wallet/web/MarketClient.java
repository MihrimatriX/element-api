package com.elementmarket.wallet.web;

import com.elementmarket.wallet.config.RabbitConfig.WalletSettings;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.Optional;

@Component
public class MarketClient {

    private final RestClient http = RestClient.create();
    private final WalletSettings settings;

    public MarketClient(WalletSettings settings) {
        this.settings = settings;
    }

    public Optional<BigDecimal> resolveBid(String symbol) {
        try {
            JsonNode data = http.get()
                    .uri(settings.catalogUrl() + "/api/v1/elements/{symbol}/ticker", symbol)
                    .retrieve()
                    .body(JsonNode.class);
            if (data == null) return Optional.empty();
            double last = data.has("last") ? data.get("last").asDouble() : data.path("Last").asDouble(0);
            double bid = data.has("bid") ? data.get("bid").asDouble() : data.path("Bid").asDouble(0);
            if (bid > 0) return Optional.of(BigDecimal.valueOf(bid));
            if (last > 0) {
                double spread = settings.spreadPct();
                return Optional.of(BigDecimal.valueOf(last * (1 - spread)).setScale(4, RoundingMode.HALF_UP));
            }
        } catch (Exception ignored) {
        }
        return Optional.empty();
    }

    public record CompoundQuote(String slug, String formula, String label, double priceMult) {}

    public Optional<CompoundQuote> resolveCompound(String symbol, String compoundSlug) {
        String sym = symbol.toUpperCase(Locale.ROOT);
        if (compoundSlug == null
                || compoundSlug.isBlank()
                || "elemental".equals(compoundSlug)
                || compoundSlug.equalsIgnoreCase(sym)
                || compoundSlug.equals("elemental-" + sym.toLowerCase(Locale.ROOT))) {
            return Optional.of(new CompoundQuote("elemental", sym, sym, 1));
        }
        try {
            JsonNode data = http.get()
                    .uri(settings.compoundUrl() + "/api/v1/compounds/{slug}", compoundSlug)
                    .retrieve()
                    .body(JsonNode.class);
            if (data == null) return Optional.empty();
            String parent = text(data, "elementSymbol", "ElementSymbol").toUpperCase(Locale.ROOT);
            if (!parent.isEmpty() && !parent.equals(sym)) return Optional.empty();
            double mult = data.has("priceMult") ? data.get("priceMult").asDouble() : data.path("PriceMult").asDouble(0);
            if (!(mult > 0)) return Optional.empty();
            String formula = text(data, "formula", "Formula");
            if (formula.isEmpty()) formula = compoundSlug;
            String nameTr = text(data, "nameTr", "NameTr");
            String name = text(data, "name", "Name");
            String slug = text(data, "slug", "Slug");
            if (slug.isEmpty()) slug = compoundSlug;
            return Optional.of(new CompoundQuote(slug, formula, !nameTr.isEmpty() ? nameTr : (!name.isEmpty() ? name : formula), mult));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private static String text(JsonNode n, String a, String b) {
        if (n.has(a) && !n.get(a).isNull()) return n.get(a).asText();
        if (n.has(b) && !n.get(b).isNull()) return n.get(b).asText();
        return "";
    }
}
