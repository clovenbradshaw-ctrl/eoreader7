// variety-lens.test.mjs — "we think this is this sort of English because…"
// Unit behaviour of the lens, then the measured walls (2026-09-23, 1,931
// held-out segments across 11 lenses): attribution 96.8%; both French-lexified
// controls voided 100% under English-only lenses; real English falsely voided
// at most 5.4%; Naija comprehension against gold 52.6% (web lens) -> 78.5%
// (own) -> 84.7% (web + own). Floors sit below the measurements.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cellOf } from "../../kernel/cube.js";
import { GFP_CLAIM_SCHEMA } from "../../kernel/gfp-claim.js";
import { wordsOf, buildLens, bitsPerWord, coverage, attribute, trainTagger, tagAccuracy } from "./variety-lens.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

test("the organ's cell: choosing the lens that binds a text is EVA·Figure, terrain Lens", () => {
  assert.equal(cellOf("EVA", "Figure").terrain, "Lens");
});

const pidgin = ["wetin dey happen for market today", "dem don go market", "i no sabi wetin dey happen", "na so e be for market"];
const standard = ["what is happening at the market today", "they have gone to the market", "i do not know what is happening", "that is how it is at the market"];

test("a lens finds text in its own variety less surprising, and knows more of its words", () => {
  const P = buildLens(pidgin, { id: "p" }), S = buildLens(standard, { id: "s" });
  const probe = wordsOf("wetin dey happen for market");
  assert.ok(bitsPerWord(P, probe) < bitsPerWord(S, probe));
  assert.ok(coverage(P, probe) > coverage(S, probe));
  assert.ok(Number.isFinite(bitsPerWord(S, wordsOf("zqxj vvkp"))), "an unseen spelling still gets a finite surprisal");
});

test("attribute says 'we think', names the margin, and emits a GFP claim", () => {
  const P = buildLens(pidgin, { id: "p", label: "pidgin" }), S = buildLens(standard, { id: "s", label: "standard" });
  const a = attribute(wordsOf("wetin dey happen for market"), [S, P], { reference: "s", id: "t1" });
  assert.equal(a.best, "p");
  assert.match(a.verdict, /^we think this is pidgin-like English, because the pidgin lens made it [\d.]+ bits\/word less surprising than the standard lens/);
  assert.equal(a.claim.schema, GFP_CLAIM_SCHEMA);
  assert.equal(a.claim.rel, "reads-best-through");
  assert.deepEqual({ ...a.claim.roles }, { ARG0: "t1", ARG1: "p" });
});

test("a segment no lens explains is left in the Void, never forced onto the nearest label", () => {
  const S = buildLens(standard, { id: "s", label: "standard" });
  const a = attribute(wordsOf("zqxj vvkp brrt"), [S], { bars: { s: 1 } });
  assert.equal(a.void, true);
  assert.match(a.verdict, /^no lens we hold explains this well/);
});

test("the tagger scores comprehension against gold", () => {
  const tagger = trainTagger([[["dey", "AUX"], ["market", "NOUN"]]]);
  assert.equal(tagAccuracy(tagger, [[["dey", "AUX"], ["market", "NOUN"]]]), 1);
});

// ── measured walls on real corpora (skipped if a corpus is absent) ─────────
const RESULTS_READY = fs.existsSync(path.resolve(HERE, "..", "..", "..", "..", "live_priors", "11-multi-language", "dialects-pidgins-creoles", "coraal"));

test("real varieties: held-out attribution, controls voided, comprehension rises under the variety's own lens", { skip: RESULTS_READY ? false : "live_priors corpora not present" }, async () => {
  const { run } = await import("../../eval/lavar/variety-attribution.mjs");
  const r = await run({ embed: false });
  assert.ok(r.attribution.accuracy >= 0.95, `overall ${r.attribution.accuracy} (measured 0.968)`);
  for (const id of ["web", "british-19c", "american-19c", "aave", "naija"]) assert.ok(r.attribution.perVariety[id].accuracy >= 0.95, `${id}: ${r.attribution.perVariety[id].accuracy}`);
  for (const id of ["haitian", "mauritian"]) assert.ok(r.controlsUnderEnglishOnlyLenses[id].void >= 0.95, `control ${id} must not pass as English: void ${r.controlsUnderEnglishOnlyLenses[id].void}`);
  for (const [id, c] of Object.entries(r.controlsUnderEnglishOnlyLenses)) if (c.lexifier === "English") assert.ok(c.void <= 0.08, `real English ${id} falsely voided ${c.void}`);
  const n = r.comprehensionAgainstGold.naija;
  assert.ok(n.ownTagger - n.webTagger >= 0.2, `Naija: own ${n.ownTagger} vs web ${n.webTagger} (measured 0.785 vs 0.526)`);
  assert.ok(n.webPlusOwn >= n.ownTagger, "the additive layer (web + own) never does worse than the own lens alone");
  for (const id of ["web", "british-19c", "american-19c", "aave", "naija"]) {
    const g = r.ablations.wordPairGainBitsPerWord[id];
    assert.ok(g.real > 0 && g.scrambled < 0, `${id}: word pairs should help on real order and hurt on scrambled order (${g.real}, ${g.scrambled})`);
  }
});
