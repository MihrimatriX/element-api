import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeProduct,
  filterBoard,
  formatChange,
  holdingValue,
  maskApiKey,
  nextSort,
  orderProgress,
  orderTone,
  quoteFor,
  saleProblem,
  sortBoard,
  summarizeCart,
  trendOf,
  webhookUrlProblem,
} from "../src/components/commerce/model.ts";
import { STATIC_ELEMENTS } from "../src/services/elementData.ts";

const board = [
  { symbol: "Fe", last: 0.4, bid: 0.39, ask: 0.41, change24hPct: -1.5, availableStock: 5 },
  { symbol: "Au", last: 74, bid: 73, ask: 75, change24hPct: 2, availableStock: 1000 },
  { symbol: "Na", last: 0.9, bid: 0.89, ask: 0.93, change24hPct: null },
];

describe("quote board", () => {
  it("sorts symbols A→Z first and numbers high→low first, flipping on a second click", () => {
    const bySymbol = { key: "symbol", direction: "asc" };
    assert.deepEqual(nextSort(bySymbol, "last"), { key: "last", direction: "desc" });
    assert.deepEqual(nextSort(bySymbol, "symbol"), { key: "symbol", direction: "desc" });
    assert.deepEqual(sortBoard(board, bySymbol).map((row) => row.symbol), ["Au", "Fe", "Na"]);
    assert.deepEqual(
      sortBoard(board, { key: "change24hPct", direction: "desc" }).map((row) => row.symbol),
      ["Au", "Fe", "Na"],
      "a missing change sorts last when descending",
    );
  });

  it("filters by symbol or Turkish-folded element name", () => {
    assert.deepEqual(filterBoard(board, "altin", STATIC_ELEMENTS).map((row) => row.symbol), ["Au"]);
    assert.deepEqual(filterBoard(board, "fe", STATIC_ELEMENTS).map((row) => row.symbol), ["Fe"]);
    assert.equal(filterBoard(board, "", STATIC_ELEMENTS).length, 3);
  });

  it("formats signed Turkish percentages and trends", () => {
    assert.equal(formatChange(1.234), "+%1,23");
    assert.equal(formatChange(-0.4), "-%0,40");
    assert.equal(formatChange(null), "—");
    assert.equal(trendOf(0), "flat");
    assert.equal(trendOf(-2), "down");
  });
});

describe("holdings and orders", () => {
  it("describes elemental and compound products from API rows", () => {
    assert.deepEqual(
      describeProduct(STATIC_ELEMENTS, { symbol: "AU", compoundSlug: "elemental", productLabel: "AU" }),
      { symbol: "Au", formula: "Au", elementName: "Altın", elemental: true },
    );
    assert.equal(
      describeProduct(STATIC_ELEMENTS, { symbol: "NA", compoundSlug: "nacl", productLabel: "NaCl · NA" }).formula,
      "NaCl",
    );
    assert.equal(describeProduct(STATIC_ELEMENTS, { symbol: "NA", compoundFormula: "NaCl" }).elemental, false);
  });

  it("values holdings at bid × multiplier and blocks impossible sales", () => {
    assert.equal(holdingValue({ grams: 10, multiplier: 0.5 }, 2), 10);
    assert.equal(holdingValue({ grams: 10, multiplier: null }, 2), null);
    assert.equal(saleProblem(1, undefined), "Bu ürün kasanda yok.");
    assert.equal(saleProblem(0, { grams: 2 }), "Gram girin.");
    assert.match(saleProblem(3, { grams: 2 }), /en fazla 2 g/);
    assert.equal(saleProblem(2, { grams: 2 }), null);
  });

  it("maps saga statuses to progress and badge tones", () => {
    assert.equal(orderProgress("Submitted"), 1);
    assert.equal(orderProgress("Completed"), 4);
    assert.equal(orderProgress("Compensated"), 0);
    assert.equal(orderTone("Shipping"), "info");
    assert.equal(orderTone("Failed"), "destructive");
    assert.equal(orderTone("Completed"), "success");
  });
});

describe("cart and account", () => {
  it("prices lines at ask × multiplier and flags grams over stock per element", () => {
    const quoteOf = (symbol) => quoteFor(board, STATIC_ELEMENTS, symbol);
    assert.deepEqual(quoteFor(board, STATIC_ELEMENTS, "XX"), { ask: 0, stock: 0 });
    const cart = [
      { symbol: "Fe", slug: "elemental-fe", qty: 3, formula: "Fe", label: "Demir", priceMult: 1 },
      { symbol: "Fe", slug: "steel", qty: 3, formula: "Fe", label: "Çelik", priceMult: 2 },
      { symbol: "Zz", slug: "x", qty: 1, formula: "Zz", label: "?", priceMult: 1 },
    ];
    const summary = summarizeCart(cart, STATIC_ELEMENTS, quoteOf);
    assert.equal(summary.lines.length, 2, "unknown elements are left out");
    assert.ok(Math.abs(summary.subtotal - (3 * 0.41 + 3 * 0.82)) < 1e-9);
    assert.equal(summary.overStock, true, "3 g + 3 g of Fe exceeds 5 g stock");
    assert.equal(summarizeCart(cart.slice(0, 1), STATIC_ELEMENTS, quoteOf).overStock, false);
  });

  it("masks keys like the server and only accepts https webhooks", () => {
    assert.equal(maskApiKey("ele_live_1234567890abcdef"), "ele_live_1234...cdef");
    assert.equal(webhookUrlProblem("https://example.com/hook"), null);
    assert.equal(webhookUrlProblem("http://example.com"), "Adres https:// ile başlamalı.");
    assert.equal(webhookUrlProblem(""), "Adres girin.");
    assert.match(webhookUrlProblem("not a url"), /Geçerli bir adres/);
  });
});
