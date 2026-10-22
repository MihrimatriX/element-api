import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, describe, it } from "node:test";
import express from "express";
import { config } from "../config.js";
import { httpErrorHandler } from "../http.js";
import { resolveCompound } from "../services/priceResolver.js";
import { ordersRouter } from "./orders.js";

// Upstream (catalog/inventory/compound/wallet) calls go through global fetch; count them.
const realFetch = globalThis.fetch;
let upstream: (url: string) => Response = () => {
  throw new Error("unexpected upstream call");
};
let upstreamCalls = 0;
globalThis.fetch = (async (input: string | URL | Request) => {
  upstreamCalls++;
  return upstream(String(input));
}) as typeof fetch;

const app = express();
app.use(express.json({ limit: "32kb" }));
app.use("/api/v1/orders", ordersRouter);
app.use(httpErrorHandler);
const server = app.listen(0, "127.0.0.1");
let base = "";
const user = "550e8400-e29b-41d4-a716-446655440000";
const authed = {
  INTERNAL_API_KEY: config.internalApiKey,
  "X-User-Id": user,
  "Content-Type": "application/json",
};

before(async () => {
  await once(server, "listening");
  const addr = server.address();
  assert(addr && typeof addr === "object");
  base = `http://127.0.0.1:${addr.port}/api/v1/orders`;
});
after(() => {
  server.close();
  globalThis.fetch = realFetch;
});

describe("orders routes guards", () => {
  it("rejects calls without the gateway's internal key", async () => {
    const res = await realFetch(base, { headers: { "X-User-Id": user } });
    assert.equal(res.status, 401);
  });

  it("validates Idempotency-Key before any upstream price call", async () => {
    upstreamCalls = 0;
    const res = await realFetch(base, {
      method: "POST",
      headers: { ...authed, "Idempotency-Key": "not-a-uuid" },
      body: JSON.stringify({ elementSymbol: "Au", quantity: 1 }),
    });
    assert.equal(res.status, 400);
    assert.match(((await res.json()) as { detail: string }).detail, /Idempotency-Key/);
    assert.equal(upstreamCalls, 0);
  });

  it("caps the search term length", async () => {
    const res = await realFetch(`${base}/search?q=${"a".repeat(65)}`, {
      headers: authed,
    });
    assert.equal(res.status, 400);
  });
});

describe("resolveCompound pricing guard", () => {
  const compound = (elementSymbol: string) => () =>
    new Response(
      JSON.stringify({ slug: "auric-chloride", formula: "AuCl3", elementSymbol, priceMult: 3 }),
    );

  it("prices a compound only against its own parent element", async () => {
    upstream = compound("Au");
    assert.equal((await resolveCompound("au", "auric-chloride"))?.priceMult, 3);
    upstream = compound("H");
    assert.equal(await resolveCompound("Au", "auric-chloride"), null);
  });

  it("fails closed when the parent element is missing", async () => {
    upstream = compound("");
    assert.equal(await resolveCompound("H", "auric-chloride"), null);
  });
});
