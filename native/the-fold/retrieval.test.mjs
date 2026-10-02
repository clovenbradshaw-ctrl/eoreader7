// node --test retrieval.test.mjs
//
// Against the REAL eoreader7 native/memory/activation.js — checked out at
// ../eoreader7 in this session, the same relative-import convention every
// cast.js-pattern test in this repo already uses (ground-ledger.test.mjs,
// build-log.test.mjs, …). Degrades to a typed skip on a checkout without
// eoreader7 as a sibling, matching fold.test.mjs's own guard.

import { test } from "node:test";
import fs from "node:fs";
import assert from "node:assert/strict";

import {
  createRetrievalIndex,
  encodeRecord,
  recallCandidates,
  recordCitation,
} from "./retrieval.js";

let organs = null;
try {
  const mod = await import("../memory/activation.js");
  organs = { tokens: mod.tokens, codeOf: mod.codeOf, recall: mod.recall, encodeFrame: mod.encodeFrame };
} catch {
  organs = null;
}

// memory/activation.js's own idf is INCREMENTAL (READ-so-far vs. this word's
// df-so-far) — a word's first-ever appearance is only as distinctive as the
// read count already earns it (idf = log(read/df), df clamped to >= 1), so
// a real corpus needs a real warm-up before a shared phrase clears the
// distinctiveness floor at all; a two-or-three-sentence fixture never would.
// This is a genuine, disclosed property of the reused organ (its own header:
// "in a very short document nothing can be both recurring and rare, and the
// code is correctly empty"), not a retrieval.js defect — these fixtures are
// sized to actually exercise real recall rather than the cold-start edge.
const distractor = (n) => `report number ${n} covers topic area ${n} entirely on its own terms today`;

function warmUp(index, n) {
  for (let i = 0; i < n; i++) encodeRecord(index, i, { gist: distractor(i) }, organs);
  return n;
}

test("encodeRecord/recallCandidates require the injected organs — never a silent default", () => {
  const index = createRetrievalIndex();
  assert.throws(() => encodeRecord(index, 0, { gist: "x" }, {}), /injected organs/);
  assert.throws(() => recallCandidates(index, "x", {}, { turnIndex: 1 }), /injected organs/);
});

test("recallCandidates requires a declared turnIndex — the caller's own clock (P5.4)", () => {
  if (!organs) return;
  const index = createRetrievalIndex();
  assert.throws(() => recallCandidates(index, "x", organs, {}), /turnIndex is declared/);
});

test("a dormant record surfaces on a later question sharing its distinctive, already-recurring vocabulary", () => {
  if (!organs) return;
  const index = createRetrievalIndex();
  let n = warmUp(index, 16);
  encodeRecord(index, n, { gist: "koniag contract renewal status remains pending" }, organs); // order 16
  encodeRecord(index, n + 1, { gist: distractor(n + 1) }, organs); // order 17
  encodeRecord(index, n + 2, { gist: "koniag contract renewal status was confirmed" }, organs); // order 18
  encodeRecord(index, n + 3, { gist: distractor(n + 3) }, organs); // order 19

  // minMargin: 0 — this test is about the CUE's generate step (does the
  // right POSSIBLE set surface at all), not the margin gate, which has its
  // own dedicated test below.
  const { candidates, gap } = recallCandidates(index, "any news on the koniag contract renewal", organs, { turnIndex: 25, minMargin: 0 });
  assert.equal(gap, null);
  const orders = candidates.map((c) => c.order).sort((a, b) => a - b);
  assert.deepEqual(orders, [16, 18], "both koniag/contract records surface, no distractor does");
});

test("retrieval_no_cue: a question sharing no vocabulary with anything encoded", () => {
  if (!organs) return;
  const index = createRetrievalIndex();
  let n = warmUp(index, 16);
  encodeRecord(index, n, { gist: "koniag contract renewal status remains pending" }, organs);
  encodeRecord(index, n + 1, { gist: "koniag contract renewal status was confirmed" }, organs);
  const { candidates, gap, detail } = recallCandidates(index, "recommend a recipe for banana bread please", organs, { turnIndex: 25 });
  assert.deepEqual(candidates, []);
  assert.equal(gap, "retrieval_no_cue");
  assert.ok(detail);
});

test("retrieval_no_cue: a word seen only once is not yet a cue — the third occurrence is the first that can recall", () => {
  if (!organs) return;
  const index = createRetrievalIndex();
  let n = warmUp(index, 16);
  // "koniag" appears exactly once across the whole store — df stays at 1,
  // never clearing the recurrence gate that makes a word a CUE (it may
  // still be a TRACE; nothing can fire ON it yet).
  encodeRecord(index, n, { gist: "the koniag matter came up briefly today in passing" }, organs);
  const { candidates, gap } = recallCandidates(index, "any update on koniag", organs, { turnIndex: 25 });
  assert.deepEqual(candidates, []);
  assert.equal(gap, "retrieval_no_cue");
});

test("ranking is generate-then-rank, never a blended scalar: the cue's own weight order and the score order can disagree, and score wins", () => {
  if (!organs) return;
  const index = createRetrievalIndex();
  let n = warmUp(index, 16);
  const a = n; // order 16 — encoded first, so the posting/edge weights the
  const b = n + 1; // order 17    cue itself computes favor `b` (see below)
  encodeRecord(index, a, { gist: "koniag contract renewal status pending review" }, organs);
  encodeRecord(index, b, { gist: "koniag contract renewal status pending review" }, organs);
  // `a` is cited again right before the question; `b` never is again.
  recordCitation(index, a, 30);

  const { candidates, gap } = recallCandidates(index, "koniag contract renewal status", organs, { turnIndex: 31, minMargin: 0 });
  assert.equal(gap, null);
  // memory/activation.js's own incremental idf gives the LATER-encoded
  // identical frame the higher posting weight (more had already been read
  // by the time it was coded) — so cueWeight alone would rank `b` first.
  const byCue = [...candidates].sort((x, y) => y.cueWeight - x.cueWeight);
  assert.equal(byCue[0].order, b, "cueWeight alone favors the later-encoded frame — the possibility signal, not the ranking");
  assert.equal(candidates[0].order, a, "but the ranking follows SCORE: the more recently re-cited record wins, contradicting cueWeight order");
  assert.match(candidates[0].basis, /declared: ACT-R base-level/);
});

test("need-odds supersedes the ACT-R prior once this conversation's own evidence clears the declared floor, and says so", () => {
  if (!organs) return;
  const index = createRetrievalIndex();
  let n = warmUp(index, 16);
  const a = n;
  encodeRecord(index, a, { gist: "koniag contract renewal status update notes" }, organs);
  encodeRecord(index, n + 1, { gist: "koniag contract renewal status update again" }, organs);
  // Drive enough citation events that SOME live record's own (recency,
  // frequency) cell, or its recency margin, clears NEED_ODDS_EVIDENCE_FLOOR
  // (5) — each recordCitation call trains every OTHER already-live
  // record's tally too (recordCitation's own header), not only `a`'s.
  for (let t = n + 2; t <= n + 10; t++) recordCitation(index, a, t);

  const { candidates, gap } = recallCandidates(index, "koniag contract renewal status", organs, { turnIndex: n + 11, needOddsFloor: 5 });
  assert.equal(gap, null);
  assert.ok(
    candidates.some((c) => /^measured:.*supersedes the received ACT-R prior/.test(c.basis)),
    `expected at least one candidate to report a measured supersession; got ${JSON.stringify(candidates.map((c) => c.basis))}`,
  );
  // And the ranking is still real: whichever record this conversation's
  // own evidence says is actually needed again outranks one it says is not.
  assert.equal(candidates[0].order, a, "the record genuinely re-cited nine times over ranks first");
});

test("retrieval_no_margin: candidates surface but the leader is not separated from the runner-up", () => {
  if (!organs) return;
  const index = createRetrievalIndex();
  let n = warmUp(index, 16);
  // Two records, identical text, identical citation history — a genuine
  // tie, never resolved by guessing.
  encodeRecord(index, n, { gist: "koniag contract renewal status pending review" }, organs);
  encodeRecord(index, n + 1, { gist: "koniag contract renewal status pending review" }, organs);
  const { candidates, gap, detail } = recallCandidates(index, "koniag contract renewal status", organs, { turnIndex: n + 5 });
  assert.deepEqual(candidates, []);
  assert.equal(gap, "retrieval_no_margin");
  assert.ok(detail);
});

test("encode-then-recall never retrieves a record from itself (causality, inherited from memory/activation.js)", () => {
  if (!organs) return;
  const index = createRetrievalIndex();
  let n = warmUp(index, 16);
  encodeRecord(index, n, { gist: "koniag contract renewal status pending review" }, organs);
  encodeRecord(index, n + 1, { gist: "koniag contract renewal status pending review" }, organs);
  const { candidates } = recallCandidates(index, "koniag contract renewal status", organs, { turnIndex: n + 5, minMargin: 0 });
  assert.ok(candidates.length > 0);
  assert.ok(candidates.every((c) => c.order === n || c.order === n + 1), "only real prior records are ever eligible, never a sentinel");
});

// ── the corpus rung (NeedPrior@1) ────────────────────────────────────────
// Odds come "from both this document itself, and the structure of similar
// documents its read in the past" (user direction, 2026-09-01). The ladder:
// own cell/margin at the evidence floor -> received corpus prior -> ACT-R.
// Never blended — precedence only, and the II.23 control below is BUILT TO
// FAIL: a poisoned prior must never override the material's own measurement.

const PRIOR_PATH = "/Users/mlacy/Documents/3.0/live_priors/derived-priors/need-priors/need-prior-eng-narrative.json";
const realPrior = fs.existsSync(PRIOR_PATH) ? JSON.parse(fs.readFileSync(PRIOR_PATH, "utf8")) : null;

test("with no own tallies, the corpus rung engages and its basis NAMES the giver", { skip: !organs }, () => {
  // One citation at n+2, queried at n+3: gap = 2, count = 1 -> cell "2|1".
  const prior = { giver: "test corpus", cells: { "2|1": { trials: 100, arrivals: 90 } }, recencyMargins: { "2": { trials: 200, arrivals: 100 } } };
  const index = createRetrievalIndex({ receivedNeedPrior: prior });
  const n = warmUp(index, 16);
  encodeRecord(index, n, { gist: "koniag contract renewal status remains pending" }, organs);
  encodeRecord(index, n + 1, { gist: "koniag contract renewal status was confirmed" }, organs);
  recordCitation(index, n, n + 2); // one citation, own tallies EMPTY
  const out = recallCandidates(index, "koniag contract renewal status", organs, { turnIndex: n + 3, minMargin: 0 });
  const top = out.candidates?.[0];
  assert.ok(top, `expected a candidate, got gap ${out.gap}`);
  assert.match(top.basis, /received corpus (cell|recency margin)/, top.basis);
  assert.match(top.basis, /test corpus/, "the giver rides the basis string — a reader can weigh the source");
});

test("II.23 CONTROL, built to fail: a poisoned prior must NOT override own evidence at the floor", { skip: !organs }, () => {
  // Own tallies say this cell arrives 100% of the time; the poisoned prior
  // says 0%. If the prior ever wins here, precedence is broken.
  const prior = { giver: "poison", cells: {}, recencyMargins: {} };
  const index = createRetrievalIndex({ receivedNeedPrior: prior });
  const n = warmUp(index, 16);
  encodeRecord(index, n, { gist: "koniag contract renewal status remains pending" }, organs);
  encodeRecord(index, n + 1, { gist: "koniag contract renewal status was confirmed" }, organs);
  // Build own evidence past the floor (5) IN THE CELL THE QUERY WILL ASK —
  // the floor is per-cell, and this fixture's first draft learned that the
  // hard way: 8 citations left the queried cell "2|8" with ONE trial, the
  // fall-through correctly yielded to the poisoned prior, and the control
  // caught its own author (S17 working as written). 16 citations put the
  // count in the f=8 dyadic band for 8 consecutive trials.
  for (let t = n + 2; t <= n + 16; t++) recordCitation(index, n, t); // 15 citations: count 15 stays in the f=8 dyadic band the trials accrued in
  for (const key of index.cellTallies.keys()) prior.cells[key] = { trials: 1000, arrivals: 0 };
  for (const r of index.recencyTallies.keys()) prior.recencyMargins[String(r)] = { trials: 1000, arrivals: 0 };
  const out = recallCandidates(index, "koniag contract renewal status", organs, { turnIndex: n + 17, minMargin: 0 });
  const top = out.candidates?.[0];
  assert.ok(top, `expected a candidate, got gap ${out.gap}`);
  assert.match(top.basis, /this conversation's own/, `own measurement must win: ${top.basis}`);
  assert.ok(top.score > 0.5, `poisoned prior leaked into the score: ${top.score}`);
});

test("no prior loaded: byte-identical ladder — ACT-R basis, exactly as before this rung existed", { skip: !organs }, () => {
  const index = createRetrievalIndex();
  const n = warmUp(index, 16);
  encodeRecord(index, n, { gist: "koniag contract renewal status remains pending" }, organs);
  encodeRecord(index, n + 1, { gist: "koniag contract renewal status was confirmed" }, organs);
  recordCitation(index, n, n + 2);
  const out = recallCandidates(index, "koniag contract renewal status", organs, { turnIndex: n + 3, minMargin: 0 });
  const top = out.candidates?.[0];
  assert.ok(top, `expected a candidate, got gap ${out.gap}`);
  assert.match(top.basis, /ACT-R base-level/, top.basis);
});

test("the REAL committed NeedPrior@1 loads, is held-out-validated, and engages (III.5: lit, not just present)", { skip: !organs || !realPrior }, () => {
  assert.equal(realPrior.schema, "NeedPrior@1");
  assert.ok(realPrior.heldOut.meanPrecisionPrior > realPrior.heldOut.meanPrecisionActr,
    "the committed artifact's own held-out record must show it EARNED the rung — an unvalidated prior is not received, it is guessed");
  const index = createRetrievalIndex({ receivedNeedPrior: realPrior });
  const n = warmUp(index, 16);
  encodeRecord(index, n, { gist: "koniag contract renewal status remains pending" }, organs);
  encodeRecord(index, n + 1, { gist: "koniag contract renewal status was confirmed" }, organs);
  recordCitation(index, n, n + 2);
  const out = recallCandidates(index, "koniag contract renewal status", organs, { turnIndex: n + 3, minMargin: 0 });
  const top = out.candidates?.[0];
  assert.ok(top, `expected a candidate, got gap ${out.gap}`);
  assert.match(top.basis, /received corpus/, `real prior did not engage: ${top.basis}`);
});
