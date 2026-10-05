package com.elementmarket.inventory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Spring Boot entry point for the inventory service (per-symbol stock in grams and order reservations). */
@SpringBootApplication
public class InventoryApplication {

    /** Starts the inventory service. */
    public static void main(String[] args) {
        SpringApplication.run(InventoryApplication.class, args);
    }
}
