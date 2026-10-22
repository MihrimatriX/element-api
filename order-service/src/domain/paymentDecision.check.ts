import assert from "node:assert/strict";
import { CREDIT_LIMIT, paymentDecision } from "./paymentDecision.js";

assert.equal(CREDIT_LIMIT, 50_000);
assert.equal(paymentDecision(50_000), "ok");
assert.equal(paymentDecision(50_000.01), "limit");
assert.equal(paymentDecision(1), "ok");
assert.equal(paymentDecision(Number.NaN), "limit");

console.log("paymentDecision.check: ok (50000 KREDI cap)");
