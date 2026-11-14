package com.elementmarket.inventory.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.amqp.autoconfigure.RabbitProperties;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * application.yml must still bind to the listener's retry budget. A framework upgrade can rename the key
 * (Spring Boot 4: max-attempts became max-retries) and ignore the old one without an error; the listener
 * then falls back to the default and a failing message reaches inventory-service_failed after fewer tries.
 */
class ListenerRetryConfigTest {

    @Test
    void failingMessageGetsFiveAttemptsBeforeTheRecovererTakesIt() throws IOException {
        var environment = new StandardEnvironment();
        new YamlPropertySourceLoader().load("application", new ClassPathResource("application.yml"))
                .forEach(environment.getPropertySources()::addLast);

        var retry = Binder.get(environment).bind("spring.rabbitmq", RabbitProperties.class).get()
                .getListener().getSimple().getRetry();

        assertTrue(retry.isEnabled());
        assertEquals(4, retry.getMaxRetries(), "1 first delivery + 4 retries = 5 attempts");
    }
}
