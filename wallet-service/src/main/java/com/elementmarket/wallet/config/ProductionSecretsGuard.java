package com.elementmarket.wallet.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Locale;

/** Fail fast in prod-like envs when INTERNAL_API_KEY is missing or a known dev default. */
@Component
public class ProductionSecretsGuard implements ApplicationRunner {

    private final Environment environment;
    private final String internalApiKey;

    public ProductionSecretsGuard(
            Environment environment,
            @Value("${internal.api-key:}") String internalApiKey) {
        this.environment = environment;
        this.internalApiKey = internalApiKey == null ? "" : internalApiKey;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!prodLike()) return;
        if (internalApiKey.length() < 32
                || internalApiKey.equals("element-internal-dev-key")
                || internalApiKey.toLowerCase(Locale.ROOT).contains("changeme")) {
            throw new IllegalStateException(
                    "Configure a unique production INTERNAL_API_KEY of at least 32 characters.");
        }
    }

    private boolean prodLike() {
        String elementEnv = System.getenv("ELEMENT_ENV");
        if (elementEnv != null && elementEnv.equalsIgnoreCase("prod")) return true;
        return Arrays.stream(environment.getActiveProfiles())
                .anyMatch(p -> p.equalsIgnoreCase("production") || p.equalsIgnoreCase("prod"));
    }
}
