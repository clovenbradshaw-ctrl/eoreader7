// arrangement.test.mjs — end1/label/end2, added alongside subject/verb/object.
// A SEPARATE file on purpose, the same precedent hyperlexicon-stance.test.mjs
// and hypergraph-vocabulary-candidates.test.mjs already established:
// hypergraph.test.mjs reaches the engine through ../eoreader7/legacy-eoreader6.1,
// an uninitialised submodule in this checkout, so a case appended there would
// silently never execute. This tests against eoreader7's real NATIVE organs.
//
// WHY THIS EXISTS. The grammar-lens work already said the arrangement itself
// is earned as "an ordered first end, a label, an ordered second end," and
// that `subject`/`verb`/`object` are the SAE-grammar READING of it — a
// declared overlay, not the ground truth. But the STORED shape never held
// that distinction: every edge and claim in this file is keyed literally
// `.subject`/`.verb`/`.object`, at four separate construction sites
// (the primary edge loop, `judge()`, `edgeFace()`, and the `unheard`-verdict
// claim). `arrangementOf(t)` is the one place that maps a triple onto its
// earned names; used at all four sites so the mapping cannot drift the way
// four independent literals eventually would (this file's own history:
// DEF/EVA's `Array.find`, `synthesize`'s `String.includes`).
//
// ADDITIVE, NOT A RENAME. `subject`/`verb`/`object` are untouched at every
// site; `end1`/`label`/`end2` are added beside them. Migrating a consumer
// off the SAE names is real, scoped, future work (221 call sites across 22
// files, at last count) — not attempted here.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeRelationReader, arrangementOf } from "./hypergraph.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(HERE, "..");

async function loadOrgans() {
  const spans = await import(path.join(NATIVE, "adapters/text/spans.js"));
  const surfaces = await import(path.join(NATIVE, "adapters/text/surfaces.js"));
  const relations = await import(path.join(NATIVE, "adapters/text/relations.js"));
  const material = await import(path.join(NATIVE, "adapters/text/material.js"));
  const priors = await import(path.join(NATIVE, "adapters/text/priors.js"));
  const determiners = new Set([...priors.DEFINITE_DETERMINERS, ...priors.INDEFINITE_DETERMINERS]);
  const relationsFor = makeRelationReader({
    splitSentences: spans.splitSentences,
    extractSurfaces: surfaces.extractSurfaces,
    discoverReferents: surfaces.discoverReferents,
    namesCorefer: surfaces.namesCorefer,
    diaNorm: surfaces.diaNorm,
    discoverRelationVocab: relations.discoverRelationVocab,
    extractRelations: relations.extractRelations,
    tokenize: material.tokenize,
    determiners,
    negationWords: priors.NEGATION_WORDS,
  });
  return { relationsFor };
}

test("arrangementOf: a pure mapping from the SAE names to the earned ones, nothing else", () => {
  assert.deepEqual(
    arrangementOf({ subject: "Pierre", verb: "walked", object: "the market", polarity: false }),
    { end1: "Pierre", label: "walked", end2: "the market" },
  );
});

test("arrangementOf: undefined fields map through as undefined, never guessed", () => {
  assert.deepEqual(arrangementOf({}), { end1: undefined, label: undefined, end2: undefined });
});

// ── THE WIPE, COMPLETED (2026-09-02) ─────────────────────────────────────
// These four tests were the TRANSITION's own assertions: both name sets
// present and equal on every construction site, so consumers could migrate
// one at a time against a stable double-carriage. P76's amendment finished
// the consumer migration; this pass removed the old names from the four
// sites. The tests now assert the END STATE — earned names present and
// real, SAE names GONE — so a re-introduction of the double carriage fails
// loudly instead of drifting back in.

test("real edges (the primary edge loop) carry ONLY the earned names — the SAE fields are gone", async () => {
  const { relationsFor } = await loadOrgans();
  const p = { ref: "prose", text: "Pierre Bezukhov walked to the market. Pierre Bezukhov bought bread. Natasha Rostova sang a song. Natasha Rostova danced with joy." };
  const report = relationsFor([p], { pool: [p] });
  assert.ok(report.edges.length > 0, "real prose must produce real edges to test against");
  for (const e of report.edges) {
    assert.ok(typeof e.end1 === "string" && e.end1.length > 0, "end1 is a real surface");
    assert.ok(typeof e.label === "string" && e.label.length > 0, "label is a real connector");
    assert.ok(typeof e.end2 === "string" && e.end2.length > 0, "end2 is a real surface");
    assert.ok(!("subject" in e) && !("verb" in e) && !("object" in e),
      `the SAE fields are wiped, not merely shadowed: ${JSON.stringify(Object.keys(e))}`);
  }
});

test("edgeFace's projection (nearest/competing) carries ONLY the earned names too", async () => {
  const { relationsFor } = await loadOrgans();
  const p1 = { ref: "a.txt", text: "Abraham Lincoln appointed Hannibal Hamlin. Abraham Lincoln appointed Andrew Johnson." };
  const report = relationsFor([p1], { pool: [p1] });
  const { claims } = report.read("Abraham Lincoln appointed William Seward.");
  const withNearest = claims.find((c) => Array.isArray(c.nearest) && c.nearest.length > 0);
  assert.ok(withNearest, "a claim contesting an existing subject+verb bucket must surface `nearest` to test against");
  for (const n of withNearest.nearest) {
    assert.ok(n.end1 && n.label && n.end2, "the projection carries the earned names");
    assert.ok(!("subject" in n) && !("verb" in n) && !("object" in n), "and none of the SAE ones");
  }
});

test("judge()'s claim (via read()) carries ONLY the earned names", async () => {
  const { relationsFor } = await loadOrgans();
  const p = { ref: "prose", text: "Pierre Bezukhov walked to the market." };
  const report = relationsFor([p], { pool: [p] });
  const { claims } = report.read("Pierre Bezukhov walked to the market.");
  assert.ok(claims.length > 0, "a restated sentence must produce a claim to test against");
  for (const c of claims) {
    assert.ok(c.end1 && c.label && c.end2);
    assert.ok(!("subject" in c) && !("verb" in c) && !("object" in c),
      `wiped on claims too: ${JSON.stringify(Object.keys(c))}`);
  }
});

test("an 'unheard' claim (the fourth construction site) carries ONLY the earned names too", async () => {
  const { relationsFor } = await loadOrgans();
  const p = { ref: "prose", text: "Pierre Bezukhov walked to the market and bought bread." };
  const report = relationsFor([p], { pool: [p] });
  const { claims } = report.read("Pierre Bezukhov orchestrated the market.");
  const unheard = claims.find((c) => c.verdict === "unheard");
  assert.ok(unheard, "the material never uses 'orchestrated' — this must land on the unheard arm to test it");
  assert.ok(unheard.end1 && unheard.label && unheard.end2);
  assert.ok(!("subject" in unheard) && !("verb" in unheard) && !("object" in unheard));
});
