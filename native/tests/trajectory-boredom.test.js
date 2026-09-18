// trajectory-boredom.test.js — "boring is itself a surprise to avoid" (user,
// 2026-09-17), pinned end to end: detectTrajectoryBoredom (document-ledger.js)
// on a genuinely flat multi-turn exchange vs. a genuinely evolving one, and
// the fact it produces reaching the mouth's own cue channel (earned-cast.js)
// as a stated fact, never an instruction.
//
// WHY THIS IS A DIFFERENT MECHANISM THAN WHAT ALREADY EXISTED. pacing.js's
// flatline (consumed by pathos.js / earned-cast.js's `state.felt.flatline`)
// measures ONE text's own sentence-length rhythm. holon.js's echo/
// reproduction verdicts catch ONE repeated sentence within a turn. Neither
// looks at the TRAJECTORY of several assistant turns over a conversation —
// the failure this file pins is the real one that motivated the fix: two
// chatty small models converged, within ~10 turns, onto a fixed point
// ("## Dispute Resolution" every turn, restated with less change each time).
// detectTrajectoryBoredom reuses document-ledger.js's own Fisher permutation
// test (detectRepetition/detectRedundancy, already used for essay
// composition) pointed at the assistant's turns instead of an essay's
// sections — no new statistic and no hand-picked threshold: same p<0.05
// permutation this file already ships.
import test from "node:test";
import assert from "node:assert/strict";
import { detectTrajectoryBoredom } from "../the-fold/document-ledger.js";
import { cueBundle } from "../the-fold/earned-cast.js";

// A synthetic version of the actual bug: every turn opens on the same
// heading and restates the prior turn with only cosmetic changes.
const FLAT_TURNS = [
  "## Dispute Resolution\n\nThe parties should resolve this dispute through good faith negotiation, as outlined in the agreement, before pursuing further action.",
  "## Dispute Resolution\n\nThe parties should resolve this dispute through good faith negotiation, as outlined in the agreement, prior to pursuing further action.",
  "## Dispute Resolution\n\nThe parties should resolve this dispute via good faith negotiation, as outlined in the agreement, before pursuing further action.",
  "## Dispute Resolution\n\nThe parties should resolve this dispute through good faith negotiation, per the agreement, before pursuing further action.",
  "## Dispute Resolution\n\nThe parties should resolve this dispute through good faith negotiation, as the agreement outlines, before pursuing further action.",
];

// A genuinely evolving exchange — each turn a distinct topic and shape, the
// control this repo's own house rule (no hand-set thresholds; measure a
// null) requires before trusting a detector's positive.
const EVOLVING_TURNS = [
  "## Weather\n\nExpect scattered thunderstorms across the valley this afternoon, clearing by evening with a cool front moving in overnight.",
  "The recipe calls for browning the onions first, then deglazing the pan with white wine before adding the stock and simmering for twenty minutes.",
  "Saturn's rings are made mostly of ice particles ranging from tiny grains to chunks several meters across, held in place by shepherd moons.",
  "Q3 revenue grew 12% year over year, driven mainly by the enterprise segment, while churn in the SMB tier ticked up slightly.",
  "The bridge's suspension cables were re-tensioned last spring after inspectors found early-stage corrosion near the anchorage points.",
];

test("detectTrajectoryBoredom trips on a genuinely flat/repetitive turn sequence", () => {
  const r = detectTrajectoryBoredom(FLAT_TURNS);
  assert.equal(r.bored, true);
  assert.equal(r.n, FLAT_TURNS.length);
  assert.ok(r.basis && r.basis.includes("stopped changing"), `basis should state the fact plainly, got: ${r.basis}`);
  assert.ok(r.findings.length > 0);
});

test("detectTrajectoryBoredom does not trip on a genuinely evolving turn sequence", () => {
  const r = detectTrajectoryBoredom(EVOLVING_TURNS);
  assert.equal(r.bored, false);
  assert.equal(r.basis, null);
});

test("detectTrajectoryBoredom refuses (never trips) below its own two-turn floor", () => {
  const r = detectTrajectoryBoredom(["## Dispute Resolution\n\nJust one turn so far, nothing to compare a trajectory against."]);
  assert.equal(r.bored, false);
  assert.equal(r.n, 1);
});

test("a bored trajectory reaches the mouth as a stated FACT, never an instruction", () => {
  const flat = detectTrajectoryBoredom(FLAT_TURNS);
  assert.equal(flat.bored, true);
  const state = { felt: { trajectoryBored: true, trajectoryBasis: flat.basis } };
  const bundle = cueBundle({ act: "assertion", state, depth: 1 });
  assert.ok(bundle.mouth.includes("stopped changing"), `mouth should carry the measured fact, got: ${bundle.mouth}`);
  // Never an imperative telling the model to perform a property in language
  // — "the model is just the mouth" (this repo's own standing law).
  const lower = bundle.mouth.toLowerCase();
  assert.ok(!lower.includes("be more creative"), "must not instruct the model to fake creativity");
  assert.ok(!lower.includes("please"), "must be a stated fact, not a request");
});

test("an evolving trajectory adds no boredom fact to the mouth", () => {
  const evolving = detectTrajectoryBoredom(EVOLVING_TURNS);
  assert.equal(evolving.bored, false);
  const state = {}; // proxy-runner.mjs only sets state.felt.trajectoryBored when bored
  const bundle = cueBundle({ act: "assertion", state, depth: 1 });
  assert.ok(!bundle.mouth.toLowerCase().includes("stopped changing"));
});
