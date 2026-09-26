import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { keysMatch } from "./httpAuth.js";
import { createOrderBodySchema, idempotencyKeySchema } from "./schemas.js";
import { isQuantity, problem } from "./http.js";
import express from "express";
import { once } from "node:events";

describe("keysMatch (timingSafeEqual)", () => {
  it("matches equal keys and rejects mismatches", () => {
    assert.equal(keysMatch("abc", "abc"), true);
    assert.equal(keysMatch("abc", "abd"), false);
    assert.equal(keysMatch("ab", "abc"), false);
    assert.equal(keysMatch(undefined, "abc"), false);
  });
});

describe("createOrderBodySchema", () => {
  it("accepts a valid body", () => {
    const r = createOrderBodySchema.safeParse({
      elementSymbol: "Fe",
      quantity: 1.5,
    });
    assert.equal(r.success, true);
  });

  it("rejects bad symbol or quantity", () => {
    assert.equal(
      createOrderBodySchema.safeParse({ elementSymbol: "IRON", quantity: 1 })
        .success,
      false,
    );
    assert.equal(
      createOrderBodySchema.safeParse({ elementSymbol: "Fe", quantity: 0 })
        .success,
      false,
    );
  });
});

describe("idempotencyKeySchema", () => {
  it("requires UUID", () => {
    assert.equal(idempotencyKeySchema.safeParse("not-a-uuid").success, false);
    assert.equal(
      idempotencyKeySchema.safeParse("550e8400-e29b-41d4-a716-446655440000")
        .success,
      true,
    );
  });
});

describe("problem+json", () => {
  it("returns application/problem+json with legacy error field", async () => {
    const app = express();
    app.get("/x", (_req, res) => problem(res, 400, "bad"));
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const addr = server.address();
      assert(addr && typeof addr === "object");
      const res = await fetch(`http://127.0.0.1:${addr.port}/x`);
      assert.equal(res.status, 400);
      assert.match(res.headers.get("content-type") ?? "", /problem\+json/);
      const body = (await res.json()) as { detail: string; error: string };
      assert.equal(body.detail, "bad");
      assert.equal(body.error, "bad");
    } finally {
      server.close();
    }
  });
});

describe("isQuantity", () => {
  it("keeps 4-decimal precision gate", () => {
    assert.equal(isQuantity(1.00001), false);
    assert.equal(isQuantity(1.0001), true);
  });
});
