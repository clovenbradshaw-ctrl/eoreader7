// predigest.test.mjs — conformance for predigest.js, against the REAL engine
// organs (eoreader7 native/, by relative sibling path — the import
// consequence.test.mjs already proves works in this environment). No stubs:
// the sedimentation tests run the engine's real derive/merge/compose, the
// projection tests run the-fold's real hyperlexicon door over the engine's
// real task-log, and the last case closes the full circle into the engine's
// real reaction substrate.

import test from "node:test";
import assert from "node:assert/strict";

import { deriveExperiencePrior, mergeExperiencePriors } from "../kernel/experience-priors.js";
import { deriveRhythmPrior, mergeRhythmPriors, composeExperience } from "../kernel/rhythm-priors.js";
import { hyperedge } from "../kernel/hypergraph.js";
import { createTaskLog, append, projectTasks, ENTRY_KINDS, OPERATOR_BASIS } from "../kernel/task-log.js";
import { GRAINS } from "../kernel/cube.js";
import { createHyperlexicon, giveHyperlexiconAffordance } from "../kernel/hyperlexicon.js";
import { createReactionSubstrate, closureAffordances, nominateFromExperience } from "../kernel/reaction.js";

import { makeHyperlexicon } from "../organs/hyperlexicon.js";
import { adaptTaskLog } from "./consequence.js";
import { sedimentReading, compilePriors, loadCompiledPriors, assertionEdges, COMPILED_SCHEMA } from "./predigest.js";

const ORGANS = { deriveExperiencePrior, deriveRhythmPrior, mergeExperiencePriors, mergeRhythmPriors, composeExperience };
const GIVER = "test:predigest";

// A completed-reading fixture in the engine's own entry shapes: mentions
// carry the `mention:{pos}:{slug}` / `text:{pos}` construction rhythm-priors
// reads positions from; edges carry real relations.
const readingWith = (source, relations, mentionPositions = [1, 3, 6]) => ({
  source,
  reading: {
    fold: {
      graphEntries: [
        ...mentionPositions.map((pos) => ({ schema: "EOMention@1", id: `mention:${pos}:being`, referent: `${source}:being`, witness: `text:${pos}` })),
        ...relations.map((rel, i) => hyperedge({
          id: `${source}:edge:${i}`, relation: rel,
          participants: [{ ref: `${source}:s${i}`, standing: "referent" }, { ref: `${source}:o${i}`, standing: "referent" }],
          witness: `text:${i}`,
        })),
      ],
      transformationObjects: [],
    },
    terrainState: {},
  },
});

test("sediment + compile: the artifact carries its receipts, and compiling never promotes", () => {
  const one = sedimentReading(readingWith("work:one", ["advised", "replaced"]), { giver: GIVER, organs: ORGANS });
  const two = sedimentReading(readingWith("work:two", ["advised"]), { giver: GIVER, organs: ORGANS });
  assert.equal(one.which.schema, "EOExperiencePrior@1");
  assert.equal(one.when.schema, "EORhythmPrior@1");

  const compiled = compilePriors([one, two], {
    giver: GIVER,
    corpus: [{ source: "work:one", path: "fixture", encounters: 3, capped: false }],
    received: [
      { schema: "MorphologyPrior@1", giver: "UniMorph English", path: "../priors/morphology-eng.json" },
      { gap: "not-present", detail: "POSPrior@1 lives in the frozen legacy engine submodule, uninitialized in this checkout" },
    ],
    organs: ORGANS,
  });
  assert.equal(compiled.schema, COMPILED_SCHEMA);
  assert.equal(compiled.giver, GIVER);
  assert.equal(compiled.sourceCount, 2);
  assert.equal(compiled.corpus.length, 1);
  assert.equal(compiled.received.length, 2);
  assert.ok(compiled.received.some((r) => r.gap === "not-present"), "an absent received prior is a named gap, never dropped");
  // Compiling never promotes: the engine's own standing triple survives whole.
  assert.equal(compiled.composed.standing, "defeasible_experience_prior");
  assert.equal(compiled.composed.witnessed, false);
  assert.equal(compiled.composed.admissible, false);
});

test("serialize → load → USE: a round-tripped artifact still gates nominations through the real engine organ", () => {
  const sedimented = [
    sedimentReading(readingWith("work:one", ["advised", "replaced"]), { giver: GIVER, organs: ORGANS }),
    sedimentReading(readingWith("work:two", ["advised"]), { giver: GIVER, organs: ORGANS }),
  ];
  const compiled = compilePriors(sedimented, { giver: GIVER, organs: ORGANS });
  const loaded = loadCompiledPriors(JSON.parse(JSON.stringify(compiled)));
  assert.equal(loaded.refused, null);
  assert.equal(loaded.experience.schema, "EOExperiencePrior@1");
  assert.equal(loaded.rhythm.schema, "EORhythmPrior@1");

  const gated = nominateFromExperience([loaded.experience], [
    { left: "advised", right: "married" },   // "advised" is a 2-work memory
    { left: "married", right: "poisoned" },  // no side remembered
  ]);
  assert.equal(gated.length, 1);
  assert.equal(gated[0].left, "advised");
});

test("loadCompiledPriors refuses at the door, typed: wrong schema, no giver, malformed half", () => {
  assert.equal(loadCompiledPriors({ schema: "Nope@1" }).refused.type, "wrong_schema");
  assert.equal(loadCompiledPriors({ schema: COMPILED_SCHEMA }).refused.type, "no_giver");
  assert.equal(loadCompiledPriors({ schema: COMPILED_SCHEMA, giver: GIVER, composed: { schema: "Wrong@1" } }).refused.type, "no_composed_experience");
  const walls = compilePriors(
    [sedimentReading(readingWith("w", ["said"]), { giver: GIVER, organs: ORGANS })],
    { giver: GIVER, organs: ORGANS },
  );
  const broken = JSON.parse(JSON.stringify(walls));
  broken.composed = { ...broken.composed, experience: { ...broken.composed.experience, schema: "Tampered@1" } };
  assert.equal(loadCompiledPriors(broken).refused.type, "malformed_half");
});

// ── the other door: fold assertions → engine edges → mechanical reasoning ──

const NATIVE_TASK_LOG = adaptTaskLog({ createTaskLog, append, ENTRY_KINDS, OPERATOR_BASIS, GRAINS });
const foldHl = makeHyperlexicon({ ...NATIVE_TASK_LOG, projectTasks });

const span = (ref, start, text) => ({ ref, start, end: start + text.length, text });

function admittedAssertions() {
  const log = foldHl.createHyperlexicon();
  const { log: next, heard, turnedAway } = foldHl.admit(log, [
    { subject: "Johnson", verb: "replaces", object: "Hamlin", spans: [span("wd:Q8612", 100, "P1365: Q273546")] },
    { subject: "Hamlin", verb: "replaces", object: "Breckinridge", spans: [span("wd:Q273546", 220, "P1365: Q1124467")] },
    // The same fact from a second witness: unions, never a second note.
    { subject: "Johnson", verb: "replaces", object: "Hamlin", spans: [span("wd:Q273546", 300, "P1366: Q8612")], witness: "wd:Q273546" },
  ], { witness: "wd:Q8612" });
  assert.equal(turnedAway.length, 0);
  assert.equal(heard.length, 3);
  const folded = foldHl.foldHyperlexicon(next);
  assert.equal(folded.length, 2, "two assertions, the repeat folded into one note");
  return folded;
}

test("assertionEdges: the fold's own EOT reading projects into the engine's edge shape, addressed and disclosed", () => {
  const folded = admittedAssertions();
  const { edges, skipped } = assertionEdges(folded, { hyperedge, source: "test:wikidata" });
  assert.equal(edges.length, 2);
  assert.equal(skipped.length, 0);
  const johnson = edges.find((e) => e.participants[0].ref === "johnson");
  assert.equal(johnson.schema, "EOHyperedge@1");
  assert.equal(johnson.relation, "replaces");
  assert.match(johnson.witness, /^wd:Q\d+#\d+-\d+$/, "the witness is the assertion's own byte address");
  assert.equal(johnson.participants[0].identity, "assertion-log", "endpoint identity is disclosed as the log's own, never smuggled as coreference");
  assert.equal(johnson.participants[0].display, "Johnson");
  assert.equal(johnson.meta.spans.length, 2, "both witnesses' spans ride the edge");

  const spanless = assertionEdges([{ id: "x", subject: "a", verb: "b", object: "c", spans: [] }], { hyperedge });
  assert.equal(spanless.edges.length, 0);
  assert.equal(spanless.skipped[0].reason, "unaddressed");
});

test("the full circle: fold assertions → reaction substrate → a never-stated fact, derived with provenance to the fold's own addresses", () => {
  const folded = admittedAssertions();
  const { edges } = assertionEdges(folded, { hyperedge, source: "test:wikidata" });
  const chemistry = closureAffordances({ base: "replaces", yields: "after", giver: "test:succession-semantics" })
    .reduce((hl, row) => giveHyperlexiconAffordance(hl, row), createHyperlexicon());
  const substrate = createReactionSubstrate({ entries: edges, hyperlexicon: chemistry, window: null });
  const settled = substrate.settle({ cue: null, floor: null, maxSteps: 6 });
  assert.equal(settled.quiescent, true);
  const derived = settled.derived.find((d) => d.from === "johnson" && d.to === "breckinridge");
  assert.ok(derived, "after(johnson, breckinridge) is never stated and must be derived");
  assert.equal(derived.relation, "after");
  assert.equal(derived.giver, "test:succession-semantics");
  // Provenance closes to the fold's own byte addresses.
  const byId = new Map(edges.map((e) => [e.id, e]));
  for (const parent of derived.edge.meta.parents) {
    assert.match(byId.get(parent).witness, /^wd:Q\d+#\d+-\d+$/);
  }
});
