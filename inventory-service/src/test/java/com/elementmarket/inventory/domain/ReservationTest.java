package com.elementmarket.inventory.domain;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ReservationTest {

    private static final UUID ORDER = UUID.randomUUID();

    @Test
    void aRepeatedSubmitConfirmsAnActiveReservationAndIgnoresAClosedOne() {
        assertEquals(ReserveOutcome.ALREADY_RESERVED, Reservation.reserved(ORDER, "AU", Grams.of("1")).resubmitted());
        assertEquals(ReserveOutcome.ALREADY_HANDLED, Reservation.releasedBeforeReserve(ORDER, "AU").resubmitted());
        assertEquals(ReserveOutcome.ALREADY_HANDLED, Reservation.sale(ORDER, "AU", Grams.of("1")).resubmitted());
    }

    @Test
    void aReleaseThatArrivesFirstLeavesAClosedTombstoneHoldingNothing() {
        Reservation tombstone = Reservation.releasedBeforeReserve(ORDER, "AU");
        assertFalse(tombstone.isActive());
        assertEquals(Reservation.Status.RELEASED, tombstone.status());
        assertTrue(tombstone.quantity().isZero());
    }

    @Test
    void aDeskSaleIsRecordedClosedSoItRestocksOnce() {
        Reservation sale = Reservation.sale(ORDER, "AU", Grams.of("2"));
        assertFalse(sale.isActive());
        assertEquals(Reservation.Status.SOLD, sale.status());
    }

    @Test
    void statusesUseTheStoredColumnValues() {
        assertEquals("Reserved", Reservation.Status.RESERVED.column());
        assertEquals("Released", Reservation.Status.RELEASED.column());
        assertEquals("Fulfilled", Reservation.Status.FULFILLED.column());
        assertEquals("Sold", Reservation.Status.SOLD.column());
    }
}
