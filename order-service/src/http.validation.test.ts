import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { keysMatch } from "./httpAuth.js";
import { createOrderBodySchema, idempotencyKeySchema } from "./schemas.js";
import { httpErrorHandler, isQuantity, problem } from "./http.js";
import { intFromEnv } from "./config.js";
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
    const result = createOrderBodySchema.safeParse({
      elementSymbol: "Fe",
      quantity: 1.5,
    });
    assert.equal(result.success, true);
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
      const address = server.address();
      assert(address && typeof address === "object");
      const res = await fetch(`http://127.0.0.1:${address.port}/x`);
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

describe("createOrderBodySchema quantity", () => {
  it("rounds float noise to the stored 4-decimal value", () => {
    const body = createOrderBodySchema.parse({ elementSymbol: "Fe", quantity: 0.1 + 0.2 });
    assert.equal(body.quantity, 0.3);
  });
});

describe("httpErrorHandler", () => {
  it("answers a malformed URL escape with 400, not a retryable 503", async () => {
    const app = express();
    app.get("/:id", (_req, res) => res.json({}));
    app.use(httpErrorHandler);
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const address = server.address();
      assert(address && typeof address === "object");
      const res = await fetch(`http://127.0.0.1:${address.port}/%zz`);
      assert.equal(res.status, 400);
    } finally {
      server.close();
    }
  });
});

describe("intFromEnv", () => {
  it("uses the fallback when unset or empty and rejects a typo", () => {
    delete process.env.TEST_INT;
    assert.equal(intFromEnv("TEST_INT", 7), 7);
    process.env.TEST_INT = "";
    assert.equal(intFromEnv("TEST_INT", 7), 7);
    process.env.TEST_INT = "42";
    assert.equal(intFromEnv("TEST_INT", 7), 42);
    process.env.TEST_INT = "abc";
    assert.throws(() => intFromEnv("TEST_INT", 7), /TEST_INT/);
    delete process.env.TEST_INT;
  });
});
