package com.elementmarket.wallet.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Fails startup in production-like environments when INTERNAL_API_KEY is missing, too short or a known dev default,
 * so a misconfigured deployment never runs with a guessable service key.
 */
@Component
public class ProductionSecretsGuard implements ApplicationRunner {

    private static final int MIN_KEY_LENGTH = 32;
    private static final String DEV_DEFAULT_KEY = "element-internal-dev-key";
    // "replace-with" prefixes every secret in docker/.env.public.*.example; those are long enough to pass the length check.
    private static final List<String> PLACEHOLDER_MARKERS = List.of("changeme", "replace-with");

    private final Environment environment;
    private final String internalApiKey;

    public ProductionSecretsGuard(
            Environment environment,
            @Value("${internal.api-key:}") String internalApiKey) {
        this.environment = environment;
        this.internalApiKey = internalApiKey == null ? "" : internalApiKey;
    }

    /** Throws on startup when the environment is production-like and the internal key is weak. */
    @Override
    public void run(ApplicationArguments args) {
        if (!isProductionLike()) {
            return;
        }
        boolean isTooShort = internalApiKey.length() < MIN_KEY_LENGTH;
        boolean isDevDefault = internalApiKey.equals(DEV_DEFAULT_KEY);
        String lowerCaseKey = internalApiKey.toLowerCase(Locale.ROOT);
        boolean isPlaceholder = PLACEHOLDER_MARKERS.stream().anyMatch(lowerCaseKey::contains);
        if (isTooShort || isDevDefault || isPlaceholder) {
            throw new IllegalStateException(
                    "Configure a unique production INTERNAL_API_KEY of at least 32 characters.");
        }
    }

    /** Production-like means ELEMENT_ENV=prod or an active "production"/"prod" Spring profile. */
    private boolean isProductionLike() {
        String elementEnv = System.getenv("ELEMENT_ENV");
        if (elementEnv != null && elementEnv.equalsIgnoreCase("prod")) {
            return true;
        }
        return Arrays.stream(environment.getActiveProfiles())
                .anyMatch(profile -> profile.equalsIgnoreCase("production") || profile.equalsIgnoreCase("prod"));
    }
}
