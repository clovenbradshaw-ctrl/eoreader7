// node --test hl-acquire.test.mjs
//
// Two tiers, deliberately: (1) direct-edge unit tests giving precise
// control over ground truth — refuted vs. candidate vs. underpowered vs.
// the trap (looks unrefuted on a small stage, refuted on a larger one);
// (2) ONE end-to-end run through the REAL relation reader and REAL
// grammar lens over prose invented for this file, never Wikipedia, never
// a famous text. That second tier exists on purpose and should not be
// skipped or replaced with more of the first: the whole discipline this
// module is built to survive is "it worked on famous material, which
// proves nothing about whether it's reading structure or riding
// familiarity" — the same test a cast-list extractor needs run against
// an invented play rather than Hamlet. War and Peace, where this
// mechanism was first tried, could be memorized; nothing below can be.

import { test } from "node:test";
import assert from "node:assert/strict";
import { scanFunctionalCandidates, acquireCandidates, recheckCandidates, promoteAndDeclare, EVIDENCE_FLOOR } from "./hl-acquire.js";
import { createDeclarationLog, foldDeclarations } from "../eoreader7/native/interpretation/declarations.js";
import { createStage, addAnchor, addEdge, read, BOUND, CONTRADICTED, UNBOUND } from "../eoreader7/native/interpretation/hl.js";

const edge = (subject, verb, object, ref) => ({ subject, verb, object, polarity: "+", refs: [ref] });

test("minShare is declared by the caller, never a silent default, ONLY when a real classifyConnector is supplied — pinned as a regression", () => {
  // Found live, same bug class as grammar-lens.js's own fixed
  // `{ minShare = 0.9 }`: this file independently carried a SECOND,
  // DIFFERENT unexamined default (`{ minShare = 0.5 }`) for the identical
  // parameter. Two silent numbers for one decision, in two files, is
  // exactly the "hand-tuning per specimen" this file's own header already
  // refuses.
  const edges = [edge("zorlan", "governs", "kethra", "r1"), edge("brannic", "governs", "voss", "r2")];
  const fakeLens = () => ({ settled: true, thraxClass: "verb" });
  assert.throws(() => scanFunctionalCandidates(edges, { classifyConnector: fakeLens }), /minShare is declared/);
  // But genuinely inert (never required) when no lens is injected at all —
  // forcing a meaningless number on a check nobody asked for would be its
  // own unexamined ceremony, not a fix.
  assert.doesNotThrow(() => scanFunctionalCandidates(edges));
});

test("EVIDENCE_FLOOR is binding.js's own structural minimum (2), not a hand-set number", () => {
  assert.equal(EVIDENCE_FLOOR, 2);
});

test("scan: refutes immediately from the corpus's own counterexample", () => {
  const edges = [
    edge("zorlan", "rules", "kethra", "r1"),
    edge("zorlan", "rules", "ostry", "r2"), // same subject+verb, different object — refutes
  ];
  const scan = scanFunctionalCandidates(edges);
  assert.equal(scan.refuted.length, 1);
  assert.equal(scan.refuted[0].rel, "rules");
  assert.equal(scan.candidates.length, 0, "a refuted relation is never also offered as a candidate");
});

test("scan: an underpowered relation (below the floor) is withheld, not offered", () => {
  const edges = [edge("iyla", "founded", "meris", "r1")]; // one subject only
  const scan = scanFunctionalCandidates(edges);
  assert.equal(scan.candidates.length, 0);
  assert.equal(scan.underpowered.length, 1);
  assert.equal(scan.underpowered[0].rel, "founded");
});

test("scan: a relation clearing the floor with zero counterexamples is a CANDIDATE, never given", () => {
  const edges = [
    edge("zorlan", "governs", "kethra", "r1"),
    edge("brannic", "governs", "voss", "r2"),
  ];
  const scan = scanFunctionalCandidates(edges);
  assert.equal(scan.candidates.length, 1);
  assert.equal(scan.candidates[0].rel, "governs");
  assert.equal(scan.candidates[0].subjects, 2);
});

test("the trap: a genuinely non-functional relation looks unrefuted on a small stage, and IS refuted once more material arrives — recheck concedes it, never silently", () => {
  // Stage 1: "trades" has 2 subjects, 1 object each — clears the floor,
  // reads exactly like a real candidate. It is NOT actually functional
  // (people trade with many people); the small sample just hasn't shown
  // that yet. This is the coincidental-validation trap named explicitly.
  const stage1Edges = [
    edge("zorlan", "governs", "kethra", "r1"),
    edge("brannic", "governs", "voss", "r2"),
    edge("iyla", "founded", "meris", "r3"),
    edge("zorlan", "trades", "brannic", "r4"),
    edge("brannic", "trades", "iyla", "r5"),
  ];
  let log = createDeclarationLog();
  const acquired = acquireCandidates(log, stage1Edges, { source: "synthetic-chronicle#1" });
  log = acquired.log;
  const fold1 = foldDeclarations(log);
  const rels1 = fold1.candidates.map((c) => c.rel).sort();
  assert.deepEqual(rels1, ["governs", "trades"], "both clear the floor at stage 1 — trades looks exactly as valid as governs");

  // Stage 2: more material. Zorlan turns out to trade with Iyla too —
  // the same subject, a second distinct object. The trap springs.
  // Cumulative, not incremental — recheck sees everything seen so far.
  const stage2Edges = stage1Edges.concat([edge("zorlan", "trades", "iyla", "r6")]);
  const rechecked = recheckCandidates(log, stage2Edges);
  log = rechecked.log;
  assert.equal(rechecked.conceded.length, 1);
  assert.equal(rechecked.conceded[0].rel, "trades");
  assert.match(rechecked.conceded[0].trigger, /zorlan.*binds 2/);

  const fold2 = foldDeclarations(log);
  assert.deepEqual(fold2.candidates.map((c) => c.rel), ["governs"], "trades left the live candidate set");
  assert.equal(fold2.conceded.length, 1);
  assert.equal(fold2.conceded[0].rel, "trades");
  // Append-only: the original candidacy is still ON the log, just conceded.
  assert.ok(log.entries.some((e) => e.rel === "trades" && e.kind === "propose"), "the original proposal is never deleted");
});

test("a candidate never convicts on its own — R2 does nothing until promoted with a named giver", () => {
  const edges = [
    edge("zorlan", "governs", "kethra", "r1"),
    edge("brannic", "governs", "voss", "r2"),
  ];
  let log = createDeclarationLog();
  ({ log } = acquireCandidates(log, edges, { source: "synthetic-chronicle#1" }));
  const stage = createStage();
  addAnchor(stage, "zorlan");
  addAnchor(stage, "ostry");
  // No promotion happened. Even though "governs" is a live candidate,
  // hl.js's stage was never told — R2 has nothing to fire from.
  assert.throws(() => promoteAndDeclare(log, stage, "rules", { giver: "x" }), /no live candidate/);
  const { log: log2 } = promoteAndDeclare(log, stage, "governs", { giver: "chronicle editor: one governor per province" });
  assert.equal(stage.functional.has("governs"), true);
  const fold = foldDeclarations(log2);
  assert.equal(fold.given.length, 1);
  assert.equal(fold.given[0].giver, "chronicle editor: one governor per province");
});

test("grammar lens rejects a non-verb connector before it can ever become a candidate, when injected", () => {
  const edges = [
    edge("zorlan", "of", "kethra", "r1"),
    edge("brannic", "of", "voss", "r2"),
  ];
  const fakeLens = (edgeArg) => ({ settled: true, thraxClass: edgeArg.verb === "of" ? "preposition" : "verb" });
  const scan = scanFunctionalCandidates(edges, { classifyConnector: fakeLens, minShare: 0.5 });
  assert.equal(scan.candidates.length, 0);
  assert.equal(scan.rejectedByGrammar.length, 1);
  assert.equal(scan.rejectedByGrammar[0].rel, "of");
});

test("an unsettled (out-of-vocabulary) connector is a disclosed gap, not a rejection", () => {
  const edges = [edge("zorlan", "xenoglosses", "kethra", "r1"), edge("brannic", "xenoglosses", "voss", "r2")];
  const fakeLens = () => ({ settled: false, thraxClass: null });
  const scan = scanFunctionalCandidates(edges, { classifyConnector: fakeLens, minShare: 0.5 });
  assert.equal(scan.rejectedByGrammar.length, 0);
  assert.equal(scan.candidates.length, 1, "unsettled stays IN the count — an unsettled reading is a gap, not a mismatch finding");
});

test("R2 actually fires on the real hl.js stage after promotion — the full loop closed", () => {
  const edges = [
    edge("zorlan", "governs", "kethra", "r1"),
    edge("brannic", "governs", "voss", "r2"),
  ];
  let log = createDeclarationLog();
  ({ log } = acquireCandidates(log, edges, { source: "synthetic-chronicle#1" }));
  const stage = createStage();
  for (const a of ["zorlan", "kethra", "ostry"]) addAnchor(stage, a);
  ({ log } = promoteAndDeclare(log, stage, "governs", { giver: "chronicle editor" }));
  assert.equal(read(stage, ["atom", "governs", "zorlan", "kethra"]), UNBOUND, "not asserted on this stage — still unbound, not bound");
  // Now assert it and check R2 fires against a different object.
  addEdge(stage, { rel: "governs", s: "zorlan", o: "kethra", polarity: "+", source: "chronicle" });
  assert.equal(read(stage, ["atom", "governs", "zorlan", "kethra"]), BOUND);
  assert.equal(read(stage, ["atom", "governs", "zorlan", "ostry"]), CONTRADICTED, "R2, from the promoted declaration alone");
});

// ── end to end: real organs, prose invented for this file ──────────────
test("end to end, adversarial: real reader + real grammar lens over INVENTED prose no model has seen", async () => {
  const { splitSentences } = await import("../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js"
  );
  const { discoverRelationVocab, extractRelations } = await import(
    "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js"
  );
  const { tokenize, buildFrequencyTable, functionWordSet } = await import(
    "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/material.js"
  );
  const { classifyWord, dominantClass } = await import("../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/wordclass.js");
  const { makeGrammarLens } = await import("./grammar-lens.js");
  const { makeRelationReader } = await import("./hypergraph.js");
  const { readFileSync } = await import("node:fs");

  const posPrior = JSON.parse(readFileSync("../eoreader7/legacy-eoreader6.1/scripts/corpus/pos-prior-eng.json", "utf8"));
  const lens = makeGrammarLens({ classifyWord, dominantClass, posPrior });

  const organs = {
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
    discoverRelationVocab, extractRelations, tokenize, buildFrequencyTable, functionWordSet,
  };

  // Invented for this file: a fictional chronicle. Zorlan and Brannic
  // are not real, recorded historical or literary figures — nothing
  // here is recoverable by recall, only by reading the sentences.
  // "governs" is genuinely functional in-world (one governor per
  // province at a time); "advises" is NOT (an advisor can advise many
  // people) but LOOKS exactly as clean as "governs" on this small
  // sample — the coincidental-validation trap, live.
  const stage1 = [{
    ref: "chronicle#1",
    text: "Zorlan governs the province of Kethra. Brannic governs the province of Voss. " +
          "Iyla founded the city of Meris. Zorlan advises Brannic. Brannic advises Iyla.",
  }];

  const reader1 = makeRelationReader(organs)(stage1);
  assert.ok(reader1.examined);
  assert.ok(reader1.edges.length > 0, "the real reader heard edges in invented prose");

  let log = createDeclarationLog();
  // 0.5, not a fresh pick — the SAME declared constant grammar-lens.test.mjs
  // already uses for this identical parameter (its own comment: chosen
  // before any example was checked against it, not walked to whatever
  // value makes these particular words settle). One considered number
  // reused across the repo, not two different unexamined ones.
  const acquired = acquireCandidates(log, reader1.edges, { classifyConnector: lens, minShare: 0.5, source: "chronicle#1 (invented, adversarial)" });
  log = acquired.log;
  const fold1 = foldDeclarations(log);
  const rels1 = fold1.candidates.map((c) => c.rel).sort();
  assert.deepEqual(rels1, ["advises", "governs"], "both clear the floor through the REAL extractor — advises looks exactly as valid as governs");

  // The corpus grows. Re-read as one enlarged passage set — never diff
  // two separate reader instances; the extractor's own vocabulary
  // discovery needs real material, and this mirrors how a re-read
  // would actually happen: over the whole corpus so far.
  const grown = stage1.concat([{ ref: "chronicle#2", text: "Zorlan advises Iyla." }]);
  const reader2 = makeRelationReader(organs)(grown);
  const rechecked = recheckCandidates(log, reader2.edges);
  log = rechecked.log;

  assert.ok(rechecked.conceded.some((c) => c.rel === "advises"), "the real pipeline reproduces the trap and its concession — not a hand-built one");
  const fold2 = foldDeclarations(log);
  assert.deepEqual(fold2.candidates.map((c) => c.rel), ["governs"], "advises left the live set; governs survives, through real extraction both times");
});
