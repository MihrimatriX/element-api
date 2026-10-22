import assert from "node:assert/strict";
import { it } from "node:test";

globalThis.window = { location: { origin: "https://elements.example" } };
const { safeReturnTo } = await import("../src/services/session.ts");

it("safeReturnTo keeps same-origin paths", () => {
  assert.equal(safeReturnTo("/account"), "/account");
  assert.equal(safeReturnTo("/lab?x=1#h"), "/lab?x=1#h");
});

it("safeReturnTo rejects off-origin returnTo (react-router falls back to location.assign)", () => {
  for (const bad of [
    null,
    "",
    "https://evil.com",
    "javascript:alert(1)",
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r/evil.com",
  ])
    assert.equal(safeReturnTo(bad), "/collection", JSON.stringify(bad));
});
