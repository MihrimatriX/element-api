import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CREDIT_LIMIT, paymentDecision } from "./paymentDecision.js";

describe("paymentDecision", () => {
  it("accepts amounts at the inclusive 50000 KREDI cap", () => {
    assert.equal(CREDIT_LIMIT, 50_000);
    assert.equal(paymentDecision(50_000), "ok");
    assert.equal(paymentDecision(1), "ok");
  });

  it("rejects over-limit and non-finite amounts", () => {
    assert.equal(paymentDecision(50_000.01), "limit");
    assert.equal(paymentDecision(Number.NaN), "limit");
    assert.equal(paymentDecision(Number.POSITIVE_INFINITY), "limit");
  });
});
