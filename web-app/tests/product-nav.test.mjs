import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STACK_REDIRECT,
  apiShortcut,
  moreRoutes,
  primaryRoutes,
} from "../src/productNav.ts";

describe("product foundation", () => {
  it("primary nav is atlas → lab → defter, not commerce", () => {
    assert.deepEqual(
      primaryRoutes.map((r) => r.to),
      ["/periodic", "/compounds", "/lab", "/collection", "/nasil"],
    );
  });

  it("API shortcut is visible and not buried only in more", () => {
    assert.equal(apiShortcut.to, "/developers");
    assert.ok(!moreRoutes.some((r) => r.to === "/developers"));
  });

  it("commerce demo is demoted to the end of more nav", () => {
    assert.equal(moreRoutes.at(-1)?.to, "/demo");
    assert.equal(moreRoutes.at(-1)?.label, "Kredi simülasyonu");
  });

  it("legacy /stack lands on about", () => {
    assert.equal(STACK_REDIRECT, "/hakkinda");
  });
});
