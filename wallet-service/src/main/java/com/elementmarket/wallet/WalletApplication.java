package com.elementmarket.wallet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Spring Boot entry point for the wallet service (KREDI balance, ledger, holdings and desk sells). */
@SpringBootApplication
public class WalletApplication {

    /** Starts the wallet service. */
    public static void main(String[] args) {
        SpringApplication.run(WalletApplication.class, args);
    }
}
