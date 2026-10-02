import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  glossaryTerms,
  initialOf,
  letterAnchor,
  termsByLetter,
} from "../src/components/reference/glossary-terms.ts";
import {
  guideQuestions,
  guideSteps,
} from "../src/components/reference/guide-content.ts";

/** Account-only pages: they render FeatureUnavailable when accounts are off. */
const ACCOUNT_ONLY = /^\/(register|login|market|shop|account)\b/;

const stepLinks = (accountsEnabled) =>
  guideSteps(accountsEnabled).flatMap((step) => step.links.map((link) => link.to));

const guideCopy = (accountsEnabled) =>
  [
    ...guideSteps(accountsEnabled).map((step) => step.body),
    ...guideQuestions(accountsEnabled).map((item) => `${item.question} ${item.answer}`),
  ].join("\n");

describe("handbook (/nasil)", () => {
  it("keeps the deep links into the lab, games and notebook", () => {
    for (const accountsEnabled of [true, false]) {
      const links = stepLinks(accountsEnabled);
      for (const to of [
        "/element/fe",
        "/lab?lesson=everyday",
        "/collection",
        "/lab/formula?compound=nacl",
        "/lab/detective",
      ])
        assert.ok(links.includes(to), `${to} with accounts ${accountsEnabled}`);
    }
  });

  it("does not send users to account pages when accounts are off", () => {
    assert.deepEqual(stepLinks(false).filter((to) => ACCOUNT_ONLY.test(to)), []);
    assert.ok(stepLinks(true).includes("/register?returnTo=/collection"));
    assert.ok(stepLinks(true).includes("/market"));
  });

  it("describes the lab as it works today", () => {
    for (const accountsEnabled of [true, false]) {
      const copy = guideCopy(accountsEnabled);
      assert.match(copy, /Dene’ye bas/);
      assert.match(copy, /sürükle/);
      assert.doesNotMatch(copy, /Birleştir|iki kez bas/i);
      assert.doesNotMatch(copy, /5080|3000/, "no dev ports in user-facing answers");
    }
  });
});

describe("glossary (/sozluk)", () => {
  it("points account-only links at the /demo tour when accounts are off", () => {
    const off = glossaryTerms(false);
    assert.deepEqual(off.filter((term) => ACCOUNT_ONLY.test(term.link.to)), []);
    assert.equal(off.find((term) => term.id === "alis-fiyati").link.to, "/demo");
    assert.equal(
      glossaryTerms(true).find((term) => term.id === "alis-fiyati").link.to,
      "/market",
    );
  });

  it("gives every term a unique anchor", () => {
    const ids = glossaryTerms(true).map((term) => term.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("files terms under Turkish initials in dictionary order", () => {
    assert.equal(initialOf("izomer"), "İ");
    const letters = termsByLetter(glossaryTerms(true));
    assert.ok(letters.get("İ").some((term) => term.id === "izomer"));
    assert.deepEqual(
      letters.get("S").map((term) => term.term),
      ["Satış fiyatı", "slug", "Stoikiometri"],
    );
    const total = [...letters.values()].reduce((sum, terms) => sum + terms.length, 0);
    assert.equal(total, glossaryTerms(true).length, "no term is lost by grouping");
  });

  it("builds letter anchors with Turkish lower-casing", () => {
    assert.equal(letterAnchor("Ç"), "harf-ç");
    assert.equal(letterAnchor("İ"), "harf-i");
  });

  it("matches the lab's controls in its definitions", () => {
    const copy = glossaryTerms(true)
      .map((term) => term.definition)
      .join("\n");
    assert.doesNotMatch(copy, /Birleştir|iki kez bas/i);
  });
});
