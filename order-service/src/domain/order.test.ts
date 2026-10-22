import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  InvalidOrderError,
  isOrderTotalAllowed,
  Order,
  type OrderFacts,
} from "./order.js";
import { sagaNextStatus } from "./sagaTransitions.js";

const facts: OrderFacts = {
  id: "11111111-1111-4111-8111-111111111111",
  customerId: "22222222-2222-4222-8222-222222222222",
  elementSymbol: "AU",
  quantity: 2.5,
  totalPrice: 120.1234,
  compoundSlug: null,
  compoundFormula: null,
  productLabel: "AU",
};

const at = (status: string, overrides: Partial<OrderFacts> = {}) =>
  Order.restore({ ...facts, ...overrides }, status, null);
const types = (order: Order) => order.events.map((event) => event.type);
const compensation = ["OrderStockReleaseEvent", "PaymentRefundRequestedEvent"];

describe("Order.place", () => {
  it("starts Submitted and records the status and submitted events", () => {
    const order = Order.place(facts);
    assert.equal(order.status, "Submitted");
    assert.deepEqual(order.events, [
      {
        type: "UpdateOrderStatusEvent",
        payload: {
          orderId: facts.id,
          customerId: facts.customerId,
          status: "Submitted",
          errorMessage: null,
        },
      },
      {
        type: "OrderSubmittedEvent",
        payload: {
          orderId: facts.id,
          customerId: facts.customerId,
          elementSymbol: "AU",
          quantity: 2.5,
          totalPrice: 120.1234,
        },
      },
    ]);
  });

  it("allows totals above zero up to the inclusive credit limit", () => {
    assert.equal(isOrderTotalAllowed(0.0001), true);
    assert.equal(isOrderTotalAllowed(50_000), true);
    assert.equal(isOrderTotalAllowed(50_000.0001), false);
    assert.equal(isOrderTotalAllowed(0), false);
    assert.equal(isOrderTotalAllowed(Number.NaN), false);
  });

  it("refuses an invalid total or quantity", () => {
    for (const bad of [
      { totalPrice: 0 },
      { totalPrice: 50_000.01 },
      { totalPrice: Number.NaN },
      { quantity: 0 },
      { quantity: -1 },
      { quantity: Number.POSITIVE_INFINITY },
    ]) {
      assert.throws(() => Order.place({ ...facts, ...bad }), InvalidOrderError);
    }
  });
});

describe("Order.apply", () => {
  it("requests payment once stock is reserved", () => {
    const order = at("Submitted");
    order.apply("StockReservedEvent");
    assert.equal(order.status, "StockReserved");
    assert.equal(order.statusChanged, true);
    assert.deepEqual(types(order), ["UpdateOrderStatusEvent", "PaymentRequestedEvent"]);
    assert.deepEqual(order.events[1].payload, {
      orderId: facts.id,
      customerId: facts.customerId,
      amount: 120.1234,
      elementSymbol: "AU",
      quantity: 2.5,
    });
  });

  it("fails an over-limit order instead of requesting payment", () => {
    const order = at("Submitted", { totalPrice: 60_000 });
    order.apply("StockReservedEvent");
    assert.equal(order.status, "Failed");
    assert.equal(order.failureReason, "Credit limit exceeded (50000 KREDI limit).");
    assert.deepEqual(types(order), [
      "UpdateOrderStatusEvent",
      "UpdateOrderStatusEvent",
      ...compensation,
    ]);
  });

  it("requests shipment once payment is processed", () => {
    const order = at("StockReserved");
    order.apply("PaymentProcessedEvent");
    assert.equal(order.status, "Shipping");
    assert.deepEqual(types(order), ["UpdateOrderStatusEvent", "ShipmentRequestedEvent"]);
    assert.equal(order.events[0].payload.errorMessage, null);
    assert.equal(order.events[0].payload.trackingNumber, null);
  });

  it("completes with the tracking number and credits the assets", () => {
    const order = at("Shipping");
    order.apply("ShipmentDispatchedEvent", { trackingNumber: "TRK-1" });
    assert.equal(order.status, "Completed");
    assert.equal(order.trackingNumber, "TRK-1");
    assert.deepEqual(types(order), [
      "UpdateOrderStatusEvent",
      "AssetsCreditedEvent",
      "OrderCompletedEvent",
    ]);
    assert.equal(order.events[0].payload.trackingNumber, "TRK-1");
    assert.deepEqual(order.events[1].payload, {
      orderId: facts.id,
      customerId: facts.customerId,
      elementSymbol: "AU",
      quantity: 2.5,
      totalPrice: 120.1234,
      compoundSlug: "elemental",
      productLabel: "AU",
    });
  });

  it("fails with the given reason and compensates once", () => {
    for (const [status, event] of [
      ["Submitted", "StockReservationFailedEvent"],
      ["StockReserved", "PaymentFailedEvent"],
      ["Shipping", "ShipmentFailedEvent"],
    ]) {
      const order = at(status);
      order.apply(event, { reason: "boom" });
      assert.equal(order.status, "Failed");
      assert.equal(order.failureReason, "boom");
      assert.deepEqual(types(order), ["UpdateOrderStatusEvent", ...compensation]);
      assert.equal(order.events[0].payload.errorMessage, "boom");
    }
  });

  it("uses a default reason for a payment failure without one", () => {
    const order = at("StockReserved");
    order.apply("PaymentFailedEvent");
    assert.equal(order.failureReason, "Payment failed");
  });

  it("compensates a late reservation or debit without reviving a failed order", () => {
    const reserved = at("Failed");
    reserved.apply("StockReservedEvent");
    assert.equal(reserved.status, "Failed");
    assert.equal(reserved.statusChanged, false);
    assert.deepEqual(types(reserved), ["OrderStockReleaseEvent"]);

    const debited = at("Failed");
    debited.apply("PaymentProcessedEvent");
    assert.equal(debited.statusChanged, false);
    assert.deepEqual(types(debited), ["PaymentRefundRequestedEvent"]);
  });

  it("ignores stale, unknown and post-terminal events", () => {
    for (const [status, event] of [
      ["Submitted", "ShipmentDispatchedEvent"],
      ["Shipping", "StockReservedEvent"],
      ["Completed", "ShipmentFailedEvent"],
      ["Completed", "PaymentProcessedEvent"],
      ["Failed", "ShipmentDispatchedEvent"],
      ["Failed", "StockReservationFailedEvent"],
      ["Submitted", "SomethingElseEvent"],
    ]) {
      const order = at(status);
      order.apply(event, { reason: "late" });
      assert.equal(order.status, status, `${status} + ${event}`);
      assert.equal(order.statusChanged, false);
      assert.deepEqual(order.events, []);
    }
  });

  it("follows the saga transition matrix for every status and event", () => {
    const statuses = ["Submitted", "StockReserved", "Shipping", "Completed", "Failed"];
    const events = [
      "StockReservedEvent",
      "StockReservationFailedEvent",
      "PaymentProcessedEvent",
      "PaymentFailedEvent",
      "ShipmentDispatchedEvent",
      "ShipmentFailedEvent",
    ];
    for (const status of statuses) {
      for (const event of events) {
        const order = at(status);
        order.apply(event);
        assert.equal(order.status, sagaNextStatus(status, event) ?? status, `${status} + ${event}`);
      }
    }
  });
});

describe("Order.expire", () => {
  it("fails an active order with the timeout reason and compensates", () => {
    const order = at("Shipping");
    assert.equal(order.expire(), true);
    assert.equal(order.status, "Failed");
    assert.equal(order.failureReason, "Saga timed out in state Shipping");
    assert.deepEqual(types(order), ["UpdateOrderStatusEvent", ...compensation]);
    // The timeout status event has never carried a trackingNumber field.
    assert.equal("trackingNumber" in order.events[0].payload, false);
  });

  it("leaves a finished order alone", () => {
    for (const status of ["Completed", "Failed"]) {
      const order = at(status);
      assert.equal(order.expire(), false);
      assert.equal(order.status, status);
      assert.deepEqual(order.events, []);
    }
  });
});
