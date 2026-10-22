package com.elementmarket.inventory.domain;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static com.elementmarket.inventory.domain.ReserveOutcome.*;
import static org.junit.jupiter.api.Assertions.*;

class StockItemTest {

    /** 100 g on the shelf, 40 g of it held by {@link #heldOrder}. */
    private final StockItem gold = new StockItem("AU", Grams.of("100"), Grams.of("40"));
    private final Reservation heldOrder = Reservation.reserved(UUID.randomUUID(), "AU", Grams.of("40"));

    @Test
    void availableIsStockMinusReserved() {
        assertEquals(Grams.of("60"), gold.available());
    }

    @Test
    void reserveTakesFromWhatIsAvailableAndTheBoundaryIsInclusive() {
        assertEquals(RESERVED, gold.reserve(Grams.of("60")));
        assertEquals(Grams.of("100"), gold.reserved());
        assertTrue(gold.available().isZero());
    }

    @Test
    void reserveNeverOversells() {
        assertEquals(INSUFFICIENT_STOCK, gold.reserve(Grams.of("60.0001")));
        assertEquals(Grams.of("40"), gold.reserved(), "a refused reservation changes nothing");
    }

    @Test
    void aZeroReservationIsAProgrammingError() {
        assertThrows(IllegalArgumentException.class, () -> gold.reserve(Grams.ZERO));
    }

    @Test
    void moreReservedThanInStockCannotBeLoaded() {
        assertThrows(IllegalArgumentException.class, () -> new StockItem("AU", Grams.of("1"), Grams.of("2")));
    }

    @Test
    void releaseGivesBackWhatTheReservationHoldsExactlyOnce() {
        gold.release(heldOrder);

        assertEquals(Grams.of("0"), gold.reserved());
        assertEquals(Grams.of("100"), gold.stock());
        assertEquals(Reservation.Status.RELEASED, heldOrder.status());
        assertThrows(IllegalStateException.class, () -> gold.release(heldOrder));
        assertThrows(IllegalStateException.class, () -> gold.fulfill(heldOrder), "a released order cannot ship");
    }

    @Test
    void fulfilTakesTheReservedGramsOutOfStockForGood() {
        gold.fulfill(heldOrder);

        assertEquals(Grams.of("60"), gold.stock());
        assertEquals(Grams.of("0"), gold.reserved());
        assertEquals(Grams.of("60"), gold.available(), "shipping does not change what can still be sold");
        assertEquals(Reservation.Status.FULFILLED, heldOrder.status());
        assertThrows(IllegalStateException.class, () -> gold.fulfill(heldOrder));
        assertThrows(IllegalStateException.class, () -> gold.release(heldOrder));
    }

    @Test
    void aReservationOnlyMovesTheItemItWasMadeFor() {
        Reservation iron = Reservation.reserved(UUID.randomUUID(), "FE", Grams.of("1"));
        assertThrows(IllegalArgumentException.class, () -> gold.release(iron));
        assertTrue(iron.isActive());
    }

    @Test
    void restockAddsSoldBackGramsToStock() {
        gold.restock(Grams.of("2.5"));
        assertEquals(Grams.of("102.5"), gold.stock());
        assertEquals(Grams.of("62.5"), gold.available());
    }
}
