// clearance.test.mjs — NUL·Figure's conformance: the establishment ladder
// against the REAL eoreader7 native adapters, no stubs. Every wall is shown
// to FIRE, not merely to exist (a wall nothing can trigger is a comment —
// R17), and every clearing standing is shown reachable.
//
// Fixtures carry ground truth BY CONSTRUCTION, declared before the run
// (the falsification-probe discipline). The ambiguity fixture reuses the
// adapter's own proven specimen shape (rich-referents.test.js's
// two-bearer construction) with this repo's names — the adapter's own
// conformance test declares {minPartners: 2, minSentences: 1} at fixture
// scale because the derived fences are book-scale statistics, and this
// file declares the same, echoed on the result.

import { test } from "node:test";
import assert from "node:assert/strict";

import { splitSentences } from "../adapters/text/spans.js";
import { extractSurfaces, discoverReferents, diaNorm } from "../adapters/text/surfaces.js";
import { resolvePronouns } from "../adapters/text/pronouns.js";
import { makeClearance, CELL } from "./clearance.js";

const ORGANS = { splitSentences, extractSurfaces, discoverReferents, fold: diaNorm };
const WITH_PRONOUNS = { ...ORGANS, resolvePronouns };

// host/corpus.js's own declared, disclosed-as-unvalidated operating point
// (P38) — reused, never re-derived.
const PRONOUN_NUMBERS = { minActivation: 0.05, minMargin: 0.2 };

const filler = (n) => `frame ${n} the ordinary business of the afternoon continued much as before with letters and accounts and quiet errands.`;
const f = (k, start) => Array.from({ length: k }, (_, i) => filler(start + i));

// A recurring figure (mid-sentence, so its capitalisation is its own), a
// one-off figure, and a word that only ever opens sentences.
const LADDER_TEXT = [
  "The council had summoned Elena Vasquez twice that spring.",
  "The clerk said Elena Vasquez kept meticulous records.",
  "Later the harbormaster asked Elena Vasquez about the missing crates.",
  "Meanwhile, the ledgers sat unread.",
  "Meanwhile, the fog thickened over the quay.",
  "Meanwhile, nobody spoke of the shortage.",
  "A visiting auditor, Tobias Grent, signed one page and left.",
].join(" ");

test("the cell is stamped in the organ's own code", () => {
  assert.deepEqual(CELL, { op: "NUL", grain: "Figure" });
});

test("organs are required — a clearance with no reader is refused at construction", () => {
  assert.throws(() => makeClearance({}), /injected organs/);
});

test("a genuinely recurring figure ESTABLISHES; a one-off is refused below the derived floor", () => {
  const { clearFigures } = makeClearance(ORGANS);
  const ledger = clearFigures(LADDER_TEXT);
  const elena = ledger.established.find((e) => e.surfaces.some((s) => /Vasquez/.test(s)));
  assert.ok(elena, "the recurring figure clears");
  assert.equal(elena.standing, "established");
  const tobias = ledger.refused.find((r) => /Tobias/.test(r.surface));
  assert.ok(tobias, "the one-off is refused, not silently dropped");
  assert.equal(tobias.type, "below_recurrence_floor");
  assert.equal(tobias.sentences, 1, "the refusal carries the figure's own counts");
  // The floor is disclosed by MEASUREMENT — bounds observed from the
  // organ's own behaviour, never re-derived here.
  assert.ok(ledger.floorObserved.admittedMinSentences > ledger.floorObserved.refusedMaxSentences);
  assert.equal(ledger.referentOptions.declared, false, "derived floors, and the result says so");
});

test("THE SPECIMEN: sentence-initial-only capitalisation never reaches presence — no_presence names it", () => {
  // "Meanwhile" opens three sentences, capitalised every time, and is
  // NEVER a figure: the native adapter refuses position-capitalisation at
  // the presence rung itself (L2 — the capitalisation is the sentence's).
  const { clearFigures, clearFigure } = makeClearance(ORGANS);
  const ledger = clearFigures(LADDER_TEXT);
  assert.ok(!ledger.presence.some((s) => /Meanwhile/i.test(s.surface)),
    "position-capitalisation earns no presence surface at all");
  const verdict = clearFigure(LADDER_TEXT, "Meanwhile");
  assert.equal(verdict.refused.type, "no_presence");
  assert.match(verdict.refused.detail, /sentence-initial/);
});

test("clearFigure resolves an established candidate through the fold, exact surface only", () => {
  const { clearFigure } = makeClearance(ORGANS);
  const verdict = clearFigure(LADDER_TEXT, "elena vasquez"); // folded match
  assert.equal(verdict.standing, "established");
  // Variant resolution is discoverReferents' clustering, never a second
  // matcher here — a spelling that is not a surface stays no_presence.
  const miss = clearFigure(LADDER_TEXT, "E. Vasquez");
  assert.equal(miss.refused.type, "no_presence");
});

test("an ambiguous bare form is WITHHELD with its candidates — never established, never a third being", () => {
  // The adapter's own proven two-bearer construction (rich-referents), its
  // own declared fixture-scale fences, carried through the ladder intact.
  const text = [
    "At dawn Mikhail Kutuzov read the first dispatch beside the map table.",
    "By evening Mikhail Kutuzov had signed nothing and said less than that.",
    "At last Mikhail Kutuzov chose the older road and the longer delay.",
    "Meanwhile Mikhail Barclay argued for the withdrawal along the north road.",
    "In the council Mikhail Barclay stood alone against the older marshals.",
    "By autumn Mikhail Barclay had ceded the command without one word more.",
    "Some said Mikhail favoured caution above any glory the court could offer.",
    "Others said Mikhail had already chosen and would not be moved from it.",
    "Down the road Kate watched. Near the mill Kate waited. All month Kate counted the days.",
  ].join(" ");
  const { clearFigures, clearFigure } = makeClearance(ORGANS);
  const declared = { referents: { minPartners: 2, minSentences: 1 } };
  const ledger = clearFigures(text, declared);
  assert.equal(ledger.referentOptions.declared, true, "declared fences are echoed, never silent");
  const gap = ledger.withheld.find((w) => w.surface === "Mikhail");
  assert.ok(gap, "the ambiguity is carried through as a typed withholding");
  assert.equal(gap.type, "ambiguous_surface");
  assert.equal(gap.candidates.length, 2, "both bearers named as candidates");
  assert.ok(!ledger.established.some((e) => e.surfaces.includes("Mikhail")),
    "the ambiguous form is never among the established");
  const verdict = clearFigure(text, "Mikhail", declared);
  assert.equal(verdict.refused.type, "ambiguous_surface");
  // The exclusion wall, pinned by what kills its mutant (adversarial
  // review proved deleting the ambiguous-exclusion passed every prior
  // test): a withheld surface must never ALSO land in refused wearing a
  // false below_recurrence_floor label.
  assert.ok(!ledger.refused.some((r) => r.surface === "Mikhail"),
    "an ambiguous surface is withheld ONLY — never double-bucketed into refused");
});

test("the rung is ALWAYS typed: organ + declared numbers over empty presence still RUNS, never null", () => {
  // Adversarial review's real finding: the empty-presence early return
  // left pronounRung null exactly when the organ was injected and the
  // numbers declared — the P41 hazard shape (a null a consumer misreads
  // as not-skipped). Pronoun-rich all-lowercase material has no presence
  // surfaces and still deserves the organ's own honest gaps.
  const { clearFigures } = makeClearance(WITH_PRONOUNS);
  const ledger = clearFigures("she walked to the mill. she waited by the gate.", { pronouns: PRONOUN_NUMBERS });
  assert.deepEqual(ledger.presence, []);
  assert.deepEqual(ledger.pronounRung, { ran: true, bindings: 0, gaps: 2 },
    "the organ ran over an empty referent map and typed both pronoun mentions as gaps");
});

test("a declaration outside the organ's own walls is a typed skip, not a mid-run throw", () => {
  const { clearFigures } = makeClearance(WITH_PRONOUNS);
  const ledger = clearFigures(LADDER_TEXT, { pronouns: { minActivation: -1, minMargin: 0.2 } });
  assert.equal(ledger.pronounRung.skipped.reason, "skipped_undeclared");
  const over = clearFigures(LADDER_TEXT, { pronouns: { minActivation: 0.05, minMargin: 2 } });
  assert.equal(over.pronounRung.skipped.reason, "skipped_undeclared",
    "the organ's own wall is minMargin in [0,1] — mirrored, never a mid-run throw");
});

test("the pronoun rung binds under DECLARED numbers — standing 'bound' is reachable", () => {
  // The organ binds by causal thematic recall (its own tests' physics):
  // the pronoun's sentence must carry the referent's thematic company.
  const text = [
    ...f(3, 0),
    "In the garden Elena Vasquez knelt and pressed her palms into the warm garden soil.",
    ...f(3, 3),
    "That morning Elena Vasquez trimmed the garden roses growing along the garden wall in the soil.",
    ...f(3, 6),
    "At noon Elena Vasquez watered the garden roses again, kneeling in the soft garden soil.",
    ...f(6, 9),
    "The garden soil there was rich, and she loved working the garden roses after rain.",
  ].join(" ");
  const { clearFigures } = makeClearance(WITH_PRONOUNS);
  const ledger = clearFigures(text, { pronouns: PRONOUN_NUMBERS });
  assert.deepEqual(ledger.pronounRung, { ran: true, bindings: 1, gaps: 0 });
  const elena = ledger.established.find((e) => e.surfaces.includes("Elena Vasquez"));
  assert.equal(elena.standing, "bound");
  assert.equal(elena.bindings, 1);
});

test("P41: a rung that did not run NEVER reports a pass — both typed skips fire", () => {
  const noOrgan = makeClearance(ORGANS).clearFigures(LADDER_TEXT);
  assert.equal(noOrgan.pronounRung.skipped.reason, "skipped_no_organ");
  const undeclared = makeClearance(WITH_PRONOUNS).clearFigures(LADDER_TEXT);
  assert.equal(undeclared.pronounRung.skipped.reason, "skipped_undeclared");
  // and neither skip ever upgrades a standing:
  for (const ledger of [noOrgan, undeclared]) {
    assert.ok(ledger.established.every((e) => e.standing === "established"),
      "'bound' is unreachable when the rung did not run");
  }
});

test("empty material returns an empty ledger with the rung typed, never a throw", () => {
  const { clearFigures } = makeClearance(ORGANS);
  const ledger = clearFigures("");
  assert.deepEqual(ledger.presence, []);
  assert.deepEqual(ledger.established, []);
  assert.equal(ledger.pronounRung.skipped.reason, "skipped_no_organ");
});
