// crown.test.mjs — BUILD-4 of the Per-Source Testimony spec: the crown
// render, tested against the REAL engine organs and the REAL BUILD-0/1/2
// pipeline (mintClaimId -> landAct -> perSourceReadings -> mergeTestimony),
// the exact no-stub discipline capacity-runner.test.mjs already holds to —
// reusing that file's own fixtures and helper shape rather than inventing
// parallel ones (LINCOLN_TEXT, LINCOLN_TEXT_2, LINCOLN_TEXT_NEGATED,
// freshGrid, freshRelationsRunner are all copied verbatim from there; two
// new fixtures are added below, both validated live against the real
// pipeline before being trusted in a test, exactly the way this file's own
// house style already requires elsewhere).

import { test } from "node:test";
import assert from "node:assert/strict";

import * as operators from "../kernel/cube.js";
import * as taskLog from "../kernel/task-log.js";
import { splitSentences } from "../adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../adapters/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../adapters/text/relations.js";
import { tokenize as engineTokenize } from "../adapters/text/material.js";
import { makeReferentIndex } from "../organs/cast.js";
import { makeRelationReader } from "../organs/hypergraph.js";
import { makeCapacityRunner, landAct, perSourceReadings, mergeTestimony, SELF_WITNESS } from "../organs/index.js";
import { makeGrid } from "./grid.js";
import { findCapacity, unresolvedCapacity } from "../organs/index.js";
import { renderCrown, checkTraceCoverage, verifyOrFallback, tokenize, KNOWN_CONNECTIVES } from "./crown.js";

function freshRelationsRunner() {
  const referentIndexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
  const relationsFor = makeRelationReader({
    splitSentences,
    extractSurfaces,
    discoverReferents,
    namesCorefer,
    diaNorm,
    discoverRelationVocab,
    extractRelations,
    tokenize: engineTokenize,
  });
  return makeCapacityRunner({ referentIndexFor, relationsFor });
}

function freshGrid() {
  const grid = makeGrid({ operators, taskLog });
  grid.withCapacities({ findCapacity, unresolvedCapacity });
  return grid;
}

// Copied verbatim from capacity-runner.test.mjs — same claim, same real
// specimens, so a reader who already knows those fixtures recognizes these.
const LINCOLN_TEXT =
  "Lincoln appointed Hamlin. Lincoln appointed Johnson. Lincoln nominated Seward. Hamlin visited Lincoln often. Johnson visited Lincoln rarely.";
const LINCOLN_TEXT_2 = "Lincoln appointed Hamlin. It was Lincoln's first major decision as president.";
const LINCOLN_TEXT_NEGATED = "Lincoln never appointed Hamlin. Lincoln appointed Johnson instead. Hamlin visited Lincoln often afterward.";
// NEW, validated live against the real pipeline before use (node
// scratchpad run, not guessed): a second, INDEPENDENTLY-WORDED refutation,
// needed for the CONTRADICTED-corroborated (2+ refusal) case, which
// LINCOLN_TEXT_NEGATED alone can't exercise (mergeTestimony needs two
// DISTINCT grounds to compute `standing: "corroborated"`). Two close
// variants that changed the negated clause's own surrounding words
// ("Hamlin never worked for Lincoln...", "...to any post...") measured
// "unheard", not "contradicted" — a real, disclosed extractor sensitivity,
// not assumed away; this phrasing keeps the proven-working
// "Lincoln never appointed Hamlin." clause byte-identical and only varies
// the surrounding sentences, which measured "contradicted" as needed.
const LINCOLN_TEXT_NEGATED_2 = "Lincoln never appointed Hamlin. Lincoln appointed Seward instead. Hamlin wrote to Lincoln about it.";

async function realReadings(sourcesText, claimTriple, claimLine) {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const claimId = await grid.mintClaimId(claimTriple);
  let log = grid.createLog();
  for (const [ground, text] of Object.entries(sourcesText)) {
    const sources = sourcesText;
    ({ log } = landAct(grid, log, `evaluate ${claimLine} at Link from differentiate ground ${ground} broken:rotation`, {
      sources,
      runCapacity,
      claimId,
    }));
  }
  return perSourceReadings(grid, log, claimId);
}

const CLAIM = { subject: "Lincoln", verb: "appointed", object: "Hamlin" };
const CLAIM_LINE = "Lincoln appointed Hamlin";

// A hand-built self-witness reading, matching perSourceReadings' own real
// output shape field-for-field. No real pipeline in this repo produces a
// self:model reading today (perSourceReadings only ever projects a
// judge()-computed RESULT cell, which is inherently material-grounded) —
// this mirrors the exact precedent capacity-runner.test.mjs's own
// "squarePolarity (via a mocked runCapacity)" test already sets: a
// realistically-shaped input constructed by hand to unit-test a real,
// reachable branch that the live pipeline cannot yet drive end to end.
function selfModelReading({ verdict, subject = CLAIM.subject, verb = CLAIM.verb, object = CLAIM.object }) {
  return {
    claim_id: "@self-witness-fixture",
    who: SELF_WITNESS,
    read: [],
    revision: null,
    verdict,
    polarity: verdict === "holds" ? "+" : verdict === "refused" ? "-" : null,
    edges: verdict === "holds" || verdict === "refused" ? [{ subject, verb, object, refs: [] }] : [],
    grammar: [],
    corroboration: verdict === "undetermined" ? null : { passages: 0, sources: 0 },
    emitted_by: "the-fold:app.js:selfAssertion",
  };
}

// ── tokenize / KNOWN_CONNECTIVES — the shared alphabet every render and
// the trace-coverage veto both use ─────────────────────────────────────────

test("tokenize: splits words from declared punctuation, keeps apostrophes and hyphens inside a word", () => {
  assert.deepEqual(tokenize("Lincoln appointed Hamlin."), ["Lincoln", "appointed", "Hamlin", "."]);
  assert.deepEqual(tokenize("Bezukhov's well-known claim, 17th."), ["Bezukhov's", "well-known", "claim", ",", "17th", "."]);
  assert.deepEqual(tokenize(""), []);
  assert.deepEqual(tokenize(null), []);
});

test("tokenize: a period inside a witness/source name stays glued into ONE token — the disclosed TOKEN_RE gap named in this file's own header, closed 2026-08-20", () => {
  // The exact real specimen that hit this: eval/material-dialogue-stress.mjs
  // drove renderCrown against a source literally named "titanic-a.txt" (an
  // ordinary filename, not a contrived one) and got "According to
  // titanic-a. txt, ..." — see TOKEN_RE's own header for the full account.
  // Reproduced here with both that name and this file's own "lincoln.txt"
  // (already a real ground name throughout capacity-runner.test.mjs).
  assert.deepEqual(tokenize("titanic-a.txt"), ["titanic-a.txt"]);
  assert.deepEqual(tokenize("lincoln.txt"), ["lincoln.txt"]);
});

test("tokenize: a real sentence-final period is never swallowed into the word before it — not even when that word is a period-bearing witness name sitting directly against it with no space, the adjacency this fix was specifically checked against", () => {
  assert.deepEqual(tokenize("Lincoln appointed Hamlin."), ["Lincoln", "appointed", "Hamlin", "."]);
  // DISAGREE's own witness-list-then-period shape (no comma) when a side
  // has exactly one witness: the witness's OWN internal period sits
  // directly before the connective's period, nothing between them — see
  // the real DISAGREE render below.
  assert.deepEqual(tokenize("lincoln.txt."), ["lincoln.txt", "."]);
});

test("KNOWN_CONNECTIVES: the vocabulary is closed and frozen — cannot be silently extended at runtime", () => {
  assert.throws(() => {
    KNOWN_CONNECTIVES["new-id"] = "should not be settable";
  });
  assert.ok(!Object.hasOwn(KNOWN_CONNECTIVES, "new-id"));
});

test("KNOWN_CONNECTIVES: every declared surface tokenizes to at least one real token — none are accidentally empty", () => {
  for (const [id, surface] of Object.entries(KNOWN_CONNECTIVES)) {
    const toks = tokenize(surface);
    assert.ok(toks.length > 0, `connective "${id}" tokenized to nothing`);
  }
});

// ── checkTraceCoverage — the wall, tested directly and adversarially ───────

test("checkTraceCoverage: a well-formed real AGREE render passes with zero violations", () => {
  const merged = { case: "AGREE", standing: "corroborated", holds: [
    { who: "a", verdict: "holds", edges: [{ subject: "Lincoln", verb: "appointed", object: "Hamlin" }] },
    { who: "b", verdict: "holds", edges: [{ subject: "Lincoln", verb: "appointed", object: "Hamlin" }] },
  ], refused: [], undetermined: [] };
  const crown = renderCrown(merged);
  assert.equal(crown.verified, true);
  assert.deepEqual(crown.violations, []);
  const recheck = checkTraceCoverage(crown, { ...CLAIM, witnesses: ["a", "b"] });
  assert.equal(recheck.ok, true);
});

test("checkTraceCoverage: a token with ZERO trace entries is caught — the fabrication shape itself", () => {
  // "Lincoln appointed Hamlin." with the trailing period's own trace entry
  // simply dropped — one real token now has no covering entry at all.
  const text = "Lincoln appointed Hamlin.";
  const trace = [
    { index: 0, token: "Lincoln", source: { kind: "claim", field: "subject" } },
    { index: 1, token: "appointed", source: { kind: "claim", field: "verb" } },
    { index: 2, token: "Hamlin", source: { kind: "claim", field: "object" } },
    // index 3 ('.') deliberately omitted
  ];
  const check = checkTraceCoverage({ text, trace }, { ...CLAIM, witnesses: [] });
  assert.equal(check.ok, false);
  assert.ok(check.violations.some((v) => v.type === "zero-coverage" && v.index === 3 && v.token === "."));
});

test("checkTraceCoverage: TWO trace entries claiming the SAME token is caught as duplicate-coverage, and correctly leaves a real token uncovered", () => {
  const text = "Lincoln appointed Hamlin.";
  const trace = [
    { index: 0, token: "Lincoln", source: { kind: "claim", field: "subject" } },
    { index: 0, token: "Lincoln", source: { kind: "claim", field: "subject" } }, // duplicate of index 0
    { index: 2, token: "Hamlin", source: { kind: "claim", field: "object" } },
    { index: 3, token: ".", source: { kind: "connective", id: "period" } },
  ];
  const check = checkTraceCoverage({ text, trace }, { ...CLAIM, witnesses: [] });
  assert.equal(check.ok, false);
  assert.ok(check.violations.some((v) => v.type === "duplicate-coverage" && v.index === 0));
  assert.ok(check.violations.some((v) => v.type === "zero-coverage" && v.index === 1), "index 1 ('appointed') was never actually covered");
});

test("checkTraceCoverage: a trace entry citing an UNDECLARED connective id is refused — the closed-vocabulary wall", () => {
  const text = "Lincoln appointed Hamlin.";
  const trace = [
    { index: 0, token: "Lincoln", source: { kind: "claim", field: "subject" } },
    { index: 1, token: "appointed", source: { kind: "claim", field: "verb" } },
    { index: 2, token: "Hamlin", source: { kind: "claim", field: "object" } },
    { index: 3, token: ".", source: { kind: "connective", id: "an-invented-connective-nobody-declared" } },
  ];
  const check = checkTraceCoverage({ text, trace }, { ...CLAIM, witnesses: [] });
  assert.equal(check.ok, false);
  assert.ok(check.violations.some((v) => v.type === "unsupported-source" && v.index === 3));
});

test("checkTraceCoverage: THE EXACT SEWARD SHAPE — a trace entry claims a word came from the claim's own object field, but that word is not actually in it", () => {
  // This is the mechanical shape of the motivating failure: a model
  // "corrects" Hamlin to Seward and the wrong name ships as if it were
  // sourced. Here the claim's real object is "Hamlin"; the trace lies and
  // says "Seward" is that same object field.
  const text = "Lincoln appointed Seward.";
  const trace = [
    { index: 0, token: "Lincoln", source: { kind: "claim", field: "subject" } },
    { index: 1, token: "appointed", source: { kind: "claim", field: "verb" } },
    { index: 2, token: "Seward", source: { kind: "claim", field: "object" } }, // the lie
    { index: 3, token: ".", source: { kind: "connective", id: "period" } },
  ];
  const check = checkTraceCoverage({ text, trace }, { ...CLAIM, witnesses: [] }); // CLAIM.object is "Hamlin"
  assert.equal(check.ok, false);
  assert.ok(check.violations.some((v) => v.type === "unsupported-source" && v.token === "Seward"));
});

test("checkTraceCoverage: ADVERSARIAL — corrupting a REAL renderCrown output's text without updating its trace is caught, proving the wall holds on real output, not only on hand-built fixtures", () => {
  const merged = { case: "AGREE", standing: "corroborated", holds: [
    { who: "a", verdict: "holds", edges: [{ subject: "Lincoln", verb: "appointed", object: "Hamlin" }] },
    { who: "b", verdict: "holds", edges: [{ subject: "Lincoln", verb: "appointed", object: "Hamlin" }] },
  ], refused: [], undetermined: [] };
  const real = renderCrown(merged);
  assert.equal(real.text, "Lincoln appointed Hamlin.");
  assert.equal(real.verified, true);

  // Tamper exactly the way the motivating failure tampered: swap the true
  // object for a plausible-sounding wrong one, same length, text only.
  const tampered = { text: real.text.replace("Hamlin", "Seward"), trace: real.trace };
  const check = checkTraceCoverage(tampered, { ...CLAIM, witnesses: ["a", "b"] });
  assert.equal(check.ok, false);
  assert.ok(check.violations.some((v) => v.type === "token-mismatch" && v.expected === "Seward" && v.got === "Hamlin"));
});

// ── verifyOrFallback — a render that fails its own wall never ships ────────

test("verifyOrFallback: a clean render passes through unchanged, verified true", () => {
  const rendered = { text: "Lincoln appointed Hamlin.", trace: [
    { index: 0, token: "Lincoln", source: { kind: "claim", field: "subject" } },
    { index: 1, token: "appointed", source: { kind: "claim", field: "verb" } },
    { index: 2, token: "Hamlin", source: { kind: "claim", field: "object" } },
    { index: 3, token: ".", source: { kind: "connective", id: "period" } },
  ] };
  const out = verifyOrFallback(rendered, { ...CLAIM, witnesses: [] });
  assert.equal(out.text, rendered.text);
  assert.equal(out.verified, true);
});

test("verifyOrFallback: a corrupted render never ships as the wrong claim — it falls back to a fixed, honest withheld sentence, which is itself independently trace-clean", () => {
  const corrupted = {
    text: "Lincoln appointed Seward.",
    trace: [
      { index: 0, token: "Lincoln", source: { kind: "claim", field: "subject" } },
      { index: 1, token: "appointed", source: { kind: "claim", field: "verb" } },
      { index: 2, token: "Seward", source: { kind: "claim", field: "object" } },
      { index: 3, token: ".", source: { kind: "connective", id: "period" } },
    ],
  };
  const out = verifyOrFallback(corrupted, { ...CLAIM, witnesses: [] });
  assert.equal(out.verified, false);
  assert.ok(out.violations.length > 0);
  // The wrong name never ships:
  assert.ok(!out.text.includes("Seward"), `fallback text leaked the fabricated word: "${out.text}"`);
  // And what DOES ship is itself honest — re-checking the fallback's own
  // {text, trace} pair against NO claim fields at all (it uses none) comes
  // back clean, proving the safety net is not itself a second thing that
  // could fabricate.
  const selfCheck = checkTraceCoverage(out, {});
  assert.equal(selfCheck.ok, true, JSON.stringify(selfCheck.violations));
});

// ── renderCrown: AGREE — real two-source corroboration ─────────────────────

test("renderCrown: AGREE — real two-source corroboration renders one bare confident sentence; both sources are demoted to apparatus, never named inline", async () => {
  const readings = await realReadings({ lincoln: LINCOLN_TEXT, lincoln2: LINCOLN_TEXT_2 }, CLAIM, CLAIM_LINE);
  const merged = mergeTestimony(readings);
  assert.equal(merged.case, "AGREE");
  const crown = renderCrown(merged);
  assert.equal(crown.text, "Lincoln appointed Hamlin.");
  assert.equal(crown.verified, true);
  assert.ok(!crown.text.includes("lincoln"), "AGREE must not name its sources inline — see this file's own disclosed design choice");
  assert.deepEqual(crown.apparatus.sources.sort(), ["lincoln", "lincoln2"]);
  assert.equal(crown.apparatus.standing, "corroborated");
});

// ── renderCrown: SINGLE — real one-source claim ─────────────────────────────

test("renderCrown: SINGLE — real one-source claim discloses single-witness standing INLINE, and never renders identically to AGREE", async () => {
  const readings = await realReadings({ lincoln: LINCOLN_TEXT }, CLAIM, CLAIM_LINE);
  const merged = mergeTestimony(readings);
  assert.equal(merged.case, "SINGLE");
  const crown = renderCrown(merged);
  assert.ok(crown.text.includes("lincoln"), "SINGLE must name its lone witness inline");
  // The standing tag is retired from the sentence (2026-08-20, chat-voice
  // pass): "According to <witness>," IS the single-standing disclosure in
  // plain English, and the exact standing rides on apparatus below.
  assert.ok(crown.text.startsWith("According to"), "SINGLE's witness-naming prefix is what carries the uncorroborated standing now");
  assert.ok(!crown.text.includes("independent corroboration"), "the retired standing tag must not resurface in the sentence");
  assert.equal(crown.apparatus.standing, "single", "the exact standing rides on apparatus, not on an inline tag");
  assert.equal(crown.verified, true);
  assert.notEqual(crown.text, "Lincoln appointed Hamlin.", "a one-witness claim is a different epistemic object than a corroborated one — the surface must carry the difference");
});

test("renderCrown: SINGLE — a witness/source name containing a period (an ordinary filename shape, e.g. \"lincoln.txt\") renders as ONE clean token, never fragmenting into a stray mid-name space", async () => {
  // The exact bug this pins: before TOKEN_RE's 2026-08-20 fix,
  // witnessWords("lincoln.txt") split into three tokens ("lincoln", ".",
  // "txt") and renderCrown rendered "According to lincoln. txt, ..." —
  // found live via eval/material-dialogue-stress.mjs against a real source
  // literally named "titanic-a.txt" (see TOKEN_RE's own header). "lincoln.
  // txt" is used here rather than a fresh fixture because it is already a
  // real, proven ground name throughout capacity-runner.test.mjs — this is
  // that exact name pushed through crown.js's own render for the first
  // time.
  const readings = await realReadings({ "lincoln.txt": LINCOLN_TEXT }, CLAIM, CLAIM_LINE);
  const merged = mergeTestimony(readings);
  assert.equal(merged.case, "SINGLE");
  const crown = renderCrown(merged);
  assert.equal(crown.text, "According to lincoln.txt, Lincoln appointed Hamlin.");
  assert.ok(!crown.text.includes("lincoln. txt"), "the witness name must never fragment with a stray mid-name space");
  assert.equal(crown.verified, true);
  const recheck = checkTraceCoverage(crown, { ...CLAIM, witnesses: ["lincoln.txt"] });
  assert.equal(recheck.ok, true, JSON.stringify(recheck.violations));
});

// ── renderCrown: DISAGREE — the load-bearing case ───────────────────────────

test("renderCrown: DISAGREE — real opposed-polarity pair across two sources never resolves to a side, names both witnesses by name", async () => {
  const readings = await realReadings({ lincoln: LINCOLN_TEXT, lincolnNeg: LINCOLN_TEXT_NEGATED }, CLAIM, CLAIM_LINE);
  assert.deepEqual(readings.map((r) => r.verdict).sort(), ["holds", "refused"]); // confirm the real pair before rendering
  const merged = mergeTestimony(readings);
  assert.equal(merged.case, "DISAGREE");
  const crown = renderCrown(merged);
  assert.ok(crown.text.includes("lincoln") && crown.text.includes("lincolnNeg"), crown.text);
  assert.ok(crown.text.includes("Backing it") && crown.text.includes("Denying it"), "DISAGREE must always show both sides, never one alone");
  assert.notEqual(crown.text, "Lincoln appointed Hamlin.", "DISAGREE must never collapse to the bare AGREE-shaped assertion");
  assert.notEqual(crown.text, "it is not the case that Lincoln appointed Hamlin.", "DISAGREE must never collapse to the bare CONTRADICTED-shaped assertion either");
  assert.equal(crown.apparatus.standing, null, "DISAGREE structurally has no standing to report — mergeTestimony's own null, passed through unchanged");
  assert.equal(crown.verified, true);
});

test("renderCrown: DISAGREE — ADVERSARIAL, tries to break single-side collapse with a THIRD real source; every witness on every side is named, none silently truncated", async () => {
  const readings = await realReadings(
    { lincoln: LINCOLN_TEXT, lincoln2: LINCOLN_TEXT_2, lincolnNeg: LINCOLN_TEXT_NEGATED },
    CLAIM,
    CLAIM_LINE,
  );
  const merged = mergeTestimony(readings);
  assert.equal(merged.case, "DISAGREE");
  assert.equal(merged.holds.length, 2);
  assert.equal(merged.refused.length, 1);
  const crown = renderCrown(merged);
  for (const who of ["lincoln", "lincoln2", "lincolnNeg"]) {
    assert.ok(crown.text.includes(who), `expected "${who}" named in the DISAGREE render, got: ${crown.text}`);
  }
  assert.equal(crown.verified, true);
  assert.deepEqual(crown.apparatus.sources.sort(), ["lincoln", "lincoln2", "lincolnNeg"]);
});

test("renderCrown: DISAGREE — structurally never emits a single-polarity claim standing alone; always shows Holding AND Refusing together, over several real and constructed pairs", async () => {
  const cases = [
    await realReadings({ lincoln: LINCOLN_TEXT, lincolnNeg: LINCOLN_TEXT_NEGATED }, CLAIM, CLAIM_LINE).then(mergeTestimony),
    { // a constructed 3-refuse/1-hold shape, the mirror image of the above
      case: "DISAGREE",
      standing: null,
      holds: [{ who: "x", verdict: "holds", edges: [{ subject: "Lincoln", verb: "appointed", object: "Hamlin" }] }],
      refused: [
        { who: "y1", verdict: "refused", edges: [{ subject: "Lincoln", verb: "appointed", object: "Hamlin" }] },
        { who: "y2", verdict: "refused", edges: [{ subject: "Lincoln", verb: "appointed", object: "Hamlin" }] },
        { who: "y3", verdict: "refused", edges: [{ subject: "Lincoln", verb: "appointed", object: "Hamlin" }] },
      ],
      undetermined: [],
    },
  ];
  for (const merged of cases) {
    const crown = renderCrown(merged);
    assert.ok(crown.text.includes("Backing it"), crown.text);
    assert.ok(crown.text.includes("Denying it"), crown.text);
    assert.ok(!/^(Lincoln|It is not the case)/.test(crown.text), "must never open as a bare one-sided assertion");
  }
});

test("renderCrown: DISAGREE — a period-bearing witness name sitting DIRECTLY before the connective period, no comma between them, never swallows the sentence-final period into the name", async () => {
  // The exact adjacency TOKEN_RE's own header names as the reason a bare
  // widening (matching colon's own fix exactly) would have been unsafe:
  // DISAGREE's "Backing it: <witness>." / "Denying it: <witness>." shape
  // glues the connective period flush against the LAST witness with no
  // comma when a side has exactly one witness — here that witness's own
  // name already ends mid-word in a period ("lincoln.txt"), so two periods
  // sit back to back with nothing between them. Independently re-checked
  // with checkTraceCoverage below, not just eyeballed off crown.text: this
  // is the exact bijection this fix was built to keep correct.
  const readings = await realReadings({ "lincoln.txt": LINCOLN_TEXT, "lincolnNeg.txt": LINCOLN_TEXT_NEGATED }, CLAIM, CLAIM_LINE);
  assert.deepEqual(readings.map((r) => r.verdict).sort(), ["holds", "refused"]); // confirm the real pair before rendering
  const merged = mergeTestimony(readings);
  assert.equal(merged.case, "DISAGREE");
  const crown = renderCrown(merged);
  assert.equal(crown.text, "Sources disagree on whether Lincoln appointed Hamlin. Backing it: lincoln.txt. Denying it: lincolnNeg.txt.");
  assert.equal(crown.verified, true);
  const recheck = checkTraceCoverage(crown, { ...CLAIM, witnesses: ["lincoln.txt", "lincolnNeg.txt"] });
  assert.equal(recheck.ok, true, JSON.stringify(recheck.violations));
});

// ── renderCrown: CONTRADICTED — the disclosed fifth case ───────────────────

test("renderCrown: CONTRADICTED (single) — real lone refutation renders a disclosed single-witness negative, mirroring SINGLE's own shape", async () => {
  const readings = await realReadings({ lincolnNeg: LINCOLN_TEXT_NEGATED }, CLAIM, CLAIM_LINE);
  const merged = mergeTestimony(readings);
  assert.equal(merged.case, "CONTRADICTED");
  assert.equal(merged.standing, "single");
  const crown = renderCrown(merged);
  assert.ok(crown.text.includes("lincolnNeg"), "single-standing CONTRADICTED must name its lone witness, exactly like SINGLE does");
  assert.ok(crown.text.includes("not the case"));
  // Mirrors SINGLE's own retired-tag shape (see that test's note): the
  // witness-naming prefix carries the standing, apparatus carries the word.
  assert.ok(!crown.text.includes("independent corroboration"), "the retired standing tag must not resurface here either");
  assert.equal(crown.apparatus.standing, "single");
  assert.equal(crown.verified, true);
});

test("renderCrown: CONTRADICTED (corroborated) — real independent double refutation renders ONE bare confident negative, sources demoted to apparatus exactly like AGREE", async () => {
  const readings = await realReadings({ neg1: LINCOLN_TEXT_NEGATED, neg2: LINCOLN_TEXT_NEGATED_2 }, CLAIM, CLAIM_LINE);
  assert.deepEqual(readings.map((r) => r.verdict).sort(), ["refused", "refused"]); // confirm the real double refutation before rendering
  const merged = mergeTestimony(readings);
  assert.equal(merged.case, "CONTRADICTED");
  assert.equal(merged.standing, "corroborated");
  const crown = renderCrown(merged);
  assert.equal(crown.text, "it is not the case that Lincoln appointed Hamlin.");
  assert.ok(!crown.text.includes("neg1") && !crown.text.includes("neg2"), "corroborated CONTRADICTED must demote sources to apparatus, mirroring AGREE");
  assert.deepEqual(crown.apparatus.sources.sort(), ["neg1", "neg2"]);
  assert.equal(crown.verified, true);
});

test("renderCrown: CONTRADICTED carries real computed information forward — it is never silently collapsed into UNDETERMINED's bare refusal", async () => {
  const readings = await realReadings({ lincolnNeg: LINCOLN_TEXT_NEGATED }, CLAIM, CLAIM_LINE);
  const merged = mergeTestimony(readings);
  const crown = renderCrown(merged);
  assert.notEqual(crown.text, "The material doesn't settle this.");
  // CONTRADICTED still names the actual claim words — UNDETERMINED never does.
  assert.ok(crown.text.includes("Lincoln") && crown.text.includes("Hamlin"));
});

// ── renderCrown: UNDETERMINED ───────────────────────────────────────────────

test("renderCrown: UNDETERMINED — real claim the material never settles renders a typed refusal, asserting nothing and naming no claim words", async () => {
  // Same real "Lincoln appointed Nobody" fixture capacity-runner.test.mjs's
  // own UNDETERMINED tests already use.
  const claim = { subject: "Lincoln", verb: "appointed", object: "Nobody" };
  const readings = await realReadings({ lincoln: LINCOLN_TEXT }, claim, "Lincoln appointed Nobody");
  const merged = mergeTestimony(readings);
  assert.equal(merged.case, "UNDETERMINED");
  const crown = renderCrown(merged);
  assert.equal(crown.text, "The material doesn't settle this.");
  assert.equal(crown.verified, true);
  assert.ok(!crown.text.includes("Lincoln") && !crown.text.includes("Nobody"), "UNDETERMINED must not surface any claim word — nothing was determined to assert");
});

test("renderCrown: an empty testimony set (mergeTestimony([])) also renders the same typed UNDETERMINED refusal, never a throw", () => {
  const crown = renderCrown(mergeTestimony([]));
  assert.equal(crown.text, "The material doesn't settle this.");
  assert.equal(crown.verified, true);
});

test("renderCrown: a malformed merge object claiming AGREE/SINGLE/CONTRADICTED/DISAGREE with no usable claim fields degrades to the safe UNDETERMINED sentence — never a throw", () => {
  // Not shaped like anything perSourceReadings/mergeTestimony would ever
  // really produce (a "holds" reading always carries edges — see
  // perSourceReadings' own construction) — a defensive floor, proven here
  // rather than merely asserted, matching "a gap is a result" (POLICIES P4).
  const edgeless = (who, verdict) => ({ who, verdict, edges: [] });
  for (const merged of [
    { case: "AGREE", standing: "corroborated", holds: [edgeless("a", "holds"), edgeless("b", "holds")], refused: [], undetermined: [] },
    { case: "SINGLE", standing: "single", holds: [edgeless("a", "holds")], refused: [], undetermined: [] },
    { case: "CONTRADICTED", standing: "single", holds: [], refused: [edgeless("a", "refused")], undetermined: [] },
    { case: "DISAGREE", standing: null, holds: [edgeless("a", "holds")], refused: [edgeless("b", "refused")], undetermined: [] },
  ]) {
    const crown = renderCrown(merged);
    assert.equal(crown.text, "The material doesn't settle this.", `case ${merged.case} did not degrade safely`);
    assert.equal(crown.verified, true);
    // The apparatus still honestly reports which case mergeTestimony
    // claimed, even though the sentence itself fell back — the fallback is
    // in the ASSERTION, not a lie about what was checked.
    assert.equal(crown.apparatus.case, merged.case);
  }
});

// ── every real case stays inside its own wall — the template path never
// trips checkTraceCoverage in practice, even though the check exists as a
// real, independent, adversarially-proven veto above ─────────────────────

test("renderCrown: every one of the five real merge cases renders verified:true — the template path never needs its own fallback in practice", async () => {
  const agree = mergeTestimony(await realReadings({ lincoln: LINCOLN_TEXT, lincoln2: LINCOLN_TEXT_2 }, CLAIM, CLAIM_LINE));
  const single = mergeTestimony(await realReadings({ lincoln: LINCOLN_TEXT }, CLAIM, CLAIM_LINE));
  const disagree = mergeTestimony(await realReadings({ lincoln: LINCOLN_TEXT, lincolnNeg: LINCOLN_TEXT_NEGATED }, CLAIM, CLAIM_LINE));
  const contradicted = mergeTestimony(await realReadings({ lincolnNeg: LINCOLN_TEXT_NEGATED }, CLAIM, CLAIM_LINE));
  const undetermined = mergeTestimony(
    await realReadings({ lincoln: LINCOLN_TEXT }, { subject: "Lincoln", verb: "appointed", object: "Nobody" }, "Lincoln appointed Nobody"),
  );
  for (const [label, merged] of [["AGREE", agree], ["SINGLE", single], ["DISAGREE", disagree], ["CONTRADICTED", contradicted], ["UNDETERMINED", undetermined]]) {
    assert.equal(merged.case, label, `fixture drift: expected ${label}, computed ${merged.case}`);
    const crown = renderCrown(merged);
    assert.equal(crown.verified, true, `${label} render tripped its own wall: ${JSON.stringify(crown.violations)}`);
  }
});

// ── self-witness discipline, end to end into the crown (direct user
// instruction: "the model CAN say things that are 'ungrounded,' but really
// it's just grounded in itself" — a self-witness flows through the SAME
// merge and render machinery as any other witness, never a separate
// exceptional bucket; see capacity-runner.js::mergeTestimony's own AMENDED
// note for the corroboration-count half of this) ───────────────────────────

test("renderCrown: a self:model witness never leaks into an AGREE's inline sentence — demoted to apparatus exactly like a real corroborating source, but never hidden from it", async () => {
  const readings = await realReadings({ lincoln: LINCOLN_TEXT, lincoln2: LINCOLN_TEXT_2 }, CLAIM, CLAIM_LINE);
  const withSelf = [...readings, selfModelReading({ verdict: "holds" })];
  const merged = mergeTestimony(withSelf);
  assert.equal(merged.case, "AGREE", "two REAL holds still corroborate — the self-witness rides along without blocking a genuine AGREE");
  const crown = renderCrown(merged);
  assert.equal(crown.text, "Lincoln appointed Hamlin.", "the self-witness changes nothing about the sentence itself");
  assert.ok(crown.apparatus.sources.includes(SELF_WITNESS), "but it is NOT hidden from the disclosed apparatus — disclosed, never a silent drop");
});

test("renderCrown: ONE real hold + ONE self:model hold is SINGLE, not AGREE — and the crown names the self-witness verbatim, undisguised", async () => {
  const readings = await realReadings({ lincoln: LINCOLN_TEXT }, CLAIM, CLAIM_LINE);
  const withSelf = [...readings, selfModelReading({ verdict: "holds" })];
  const merged = mergeTestimony(withSelf);
  assert.equal(merged.case, "SINGLE", "a self-witness must never co-sign corroboration alongside a single real hold");
  assert.equal(merged.holds.length, 2, "both readings are still disclosed on the merge object");
  const crown = renderCrown(merged);
  assert.ok(crown.text.includes(SELF_WITNESS), `expected the self-witness named verbatim, got: ${crown.text}`);
  assert.ok(crown.text.includes("lincoln"), "the real source is named too — both witnesses disclosed, neither erased");
});

test("renderCrown: DISAGREE between a self:model assertion and a real source's refusal names BOTH verbatim — the mitigated Seward shape: the mouth's own claim never ships as if uncontested", async () => {
  const realRefusal = await realReadings({ lincolnNeg: LINCOLN_TEXT_NEGATED }, CLAIM, CLAIM_LINE);
  assert.deepEqual(realRefusal.map((r) => r.verdict), ["refused"]);
  const withSelf = [selfModelReading({ verdict: "holds" }), ...realRefusal];
  const merged = mergeTestimony(withSelf);
  assert.equal(merged.case, "DISAGREE", "mergeTestimony never adjudicates source trust — a self-witness opposed by a real refusal is a genuine disagreement, not silently resolved either way");
  const crown = renderCrown(merged);
  assert.ok(crown.text.includes(SELF_WITNESS), crown.text);
  assert.ok(crown.text.includes("lincolnNeg"), crown.text);
  // The reader can tell which is which because the label itself says so —
  // no special-casing anywhere in crown.js renders self:model any
  // differently from a filename; this is the whole mitigation.
  assert.ok(crown.text.includes(`Backing it: ${SELF_WITNESS}`), crown.text);
  assert.ok(crown.text.includes("Denying it: lincolnNeg"), crown.text);
});
