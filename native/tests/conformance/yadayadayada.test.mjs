// native/conformance/yadayadayada.test.mjs — THE PARAPHRASE ARCHON IS THE
// SINGLE OWNER OF THE OMNILINGUAL PARAPHRASE SYSTEM, AND IT CANNOT BE
// STRIPPED FROM THE GROUND without breaking the build.
//
// 2026-09-16 (the unification): the dispersed paraphrase machinery — run-dmca's
// shadow chase + record equate, the witness's read, the Rosetta projection —
// reports to ONE archon: YadaYadaYada. This is the pin for that decision:
//   remove the compendium entry  →  the owner's credit is unresolvable  →  red
//   run a paraphrase chase       →  the basis names the owner            →  red if silent
//   strip the organ's export     →  the named owner is gone              →  red
//
// The cells Alexander and Ranke still adjudicate within the seam; the DOMAIN
// has one owner, and every response that draws on it credits it by name.

import { test } from "node:test";
import assert from "node:assert/strict";

import { archonOf, creditedQuote, matchArchons } from "../organs/archon-compendium.js";
import { PARAPHRASE, runDMCA, categorizeCreativity, chaseParaphrase } from "../organs/run-dmca.js";

test("the owner is registered in the compendium with a credit line — it rides the ground", () => {
  const a = archonOf("yadayadayada");
  assert.ok(a, "missing compendium entry for the paraphrase archon");
  assert.equal(a.handle, PARAPHRASE.handle);
  assert.ok(a.credit && a.credit.length > 0, "the paraphrase archon is always credited");
  assert.equal(creditedQuote(a.handle), a.credit);
});

test("the organ names its own owner — PARAPHRASE resolves to the registered handle", () => {
  assert.equal(PARAPHRASE.name, "Yada Yada Yada");
  assert.equal(PARAPHRASE.handle, "yadayadayada");
});

test("a paraphrase question matches the owner through the compendium door", () => {
  const hits = matchArchons("is this just a paraphrase of the source, or does it restate the claim in other words?");
  assert.ok(hits.some((h) => h.handle === "yadayadayada"), "a paraphrase question must surface the paraphrase archon");
});

test("a paraphrase chase credits its owner by name — never silent on the thing it drew on", () => {
  const sources = new Map([["fr", "The Bastille was stormed on July 14, 1789 by the crowd of Paris."]]);
  const text = "The Parisian crowd stormed the Bastille fortress in July of 1789, beginning the revolution.";
  const dmca = runDMCA({ text, sources });
  assert.equal(dmca.paraphraseUnmeasured, true, "precondition: the verbatim instrument is silent on a real reworded claim");
  const categorized = categorizeCreativity({ text, sources });
  assert.ok(
    categorized.basis.includes("YadaYadaYada"),
    `the chase must name its owner; basis says: "${categorized.basis.slice(0, 200)}"`,
  );
  const chased = chaseParaphrase({ text, sources });
  assert.ok(
    chased.categorized.basis.includes("YadaYadaYada"),
    `the stanced chase must name its owner; basis says: "${chased.categorized.basis.slice(0, 200)}"`,
  );
});