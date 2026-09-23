// eot-roundtrip.test.mjs — English through the fold-into-EOT-and-back
// round-trip, walled at its first measurement (2026-09-23, 12,544
// sentences / 204,578 tokens of UD_English-EWT): L1 0 gaps and every
// sentence's surface byte-exact; L2 every token and sentence rebuilt exactly
// from the meaning layer alone; L3 word order regenerated from meaning plus
// the other half's measured parameters at Kendall tau 0.778 (33.8% exact);
// basic order measured, not assumed: SVO. Floors sit at or below measurement.
import test from "node:test";
import assert from "node:assert/strict";
import { findTreebanks, runTreebank } from "./eot-roundtrip.mjs";

const english = findTreebanks().find((t) => t.name === "ud-english-ewt");

test("English is found by the round-trip", { skip: english ? false : "UD_English-EWT not present in this checkout" }, () => {
  assert.equal(english.files.length, 1);
});

test("English folds into EOT and back: lossless in, exact meaning, measured order", { skip: english ? false : "UD_English-EWT not present in this checkout" }, () => {
  const r = runTreebank(english);
  assert.equal(r.language, "en");
  assert.equal(r.l1.gaps, 0, `every English class, relation and feature places in the cube; gaps: ${JSON.stringify(r.l1.gapItems)}`);
  assert.equal(r.l1.surfaceExact, r.sentences, "every sentence re-serializes to its exact input bytes");
  assert.equal(r.l2.exact, r.l2.tokens, "the meaning layer alone rebuilds every token's annotation");
  const tau = r.l3.tauSum / r.l3.sentences;
  assert.ok(tau >= 0.75, `word order from meaning fell to tau ${tau.toFixed(3)} (measured 0.778)`);
  assert.equal(r.order.basic, "SVO", "English's basic order is measured from the treebank, not declared");
});
