package com.elementmarket.wallet.application;

import java.util.Map;

/**
 * Port for integration events. Implementations write to the caller's transaction, so an event exists
 * exactly when the state change that caused it was committed; a relay delivers it to the broker later.
 */
@FunctionalInterface
public interface Outbox {

    void add(String eventType, Map<String, Object> payload);
}
