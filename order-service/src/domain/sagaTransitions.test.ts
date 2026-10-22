import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  sagaAccepts,
  sagaCanTimeOut,
  sagaNextStatus,
} from "./sagaTransitions.js";

describe("sagaCanTimeOut", () => {
  it("times out only states that wait for another service", () => {
    assert.equal(sagaCanTimeOut("Submitted"), true);
    assert.equal(sagaCanTimeOut("StockReserved"), true);
    assert.equal(sagaCanTimeOut("Shipping"), true);
    assert.equal(sagaCanTimeOut("Completed"), false);
    assert.equal(sagaCanTimeOut("Failed"), false);
  });
});

describe("sagaAccepts", () => {
  it("maps the happy path", () => {
    assert.equal(sagaAccepts("Submitted", "StockReservedEvent"), true);
    assert.equal(sagaAccepts("StockReserved", "PaymentProcessedEvent"), true);
    assert.equal(sagaAccepts("Shipping", "ShipmentDispatchedEvent"), true);
  });

  it("rejects stale events", () => {
    assert.equal(sagaAccepts("Completed", "PaymentProcessedEvent"), false);
    assert.equal(sagaAccepts("Submitted", "ShipmentDispatchedEvent"), false);
  });

  it("compensates late reservation/debit on a failed order without reviving it", () => {
    assert.equal(sagaAccepts("Failed", "StockReservedEvent"), true);
    assert.equal(sagaAccepts("Failed", "PaymentProcessedEvent"), true);
    assert.equal(sagaNextStatus("Failed", "PaymentProcessedEvent"), null);
    assert.equal(sagaAccepts("Failed", "ShipmentDispatchedEvent"), false);
  });
});

describe("sagaNextStatus", () => {
  it("advances Submitted → StockReserved → Shipping → Completed", () => {
    assert.equal(
      sagaNextStatus("Submitted", "StockReservedEvent"),
      "StockReserved",
    );
    assert.equal(
      sagaNextStatus("StockReserved", "PaymentProcessedEvent"),
      "Shipping",
    );
    assert.equal(
      sagaNextStatus("Shipping", "ShipmentDispatchedEvent"),
      "Completed",
    );
  });

  it("fails on reservation/payment/shipment failure events", () => {
    assert.equal(
      sagaNextStatus("Submitted", "StockReservationFailedEvent"),
      "Failed",
    );
    assert.equal(
      sagaNextStatus("StockReserved", "PaymentFailedEvent"),
      "Failed",
    );
    assert.equal(sagaNextStatus("Shipping", "ShipmentFailedEvent"), "Failed");
  });
});
