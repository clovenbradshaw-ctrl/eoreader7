// trajectory-churn.test.js — detectTrajectoryChurn (document-ledger.js), the
// mirror of detectTrajectoryBoredom, pinned end to end on the SAME fixtures
// that file ships plus one live-shaped conversation (2026-09-25).
//
// The boredom test's own "healthy" control — five turns on five unrelated
// topics — is exactly the stream this detector exists to name: nothing recurs,
// nothing is ever confirmed, every turn is novel. It passes the boredom test
// perfectly and settles on nothing. The flat fixture settles in any order
// (boredom's territory); a conversation that holds a cast for a stretch and
// then moves to another settles in sequence — the band between.
import test from "node:test";
import assert from "node:assert/strict";
import { detectTrajectoryChurn, detectTrajectoryBoredom } from "../the-fold/document-ledger.js";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FLAT_TURNS = [
  "## Dispute Resolution\n\nThe parties should resolve this dispute through good faith negotiation, as outlined in the agreement, before pursuing further action.",
  "## Dispute Resolution\n\nThe parties should resolve this dispute through good faith negotiation, as outlined in the agreement, prior to pursuing further action.",
  "## Dispute Resolution\n\nThe parties should resolve this dispute via good faith negotiation, as outlined in the agreement, before pursuing further action.",
  "## Dispute Resolution\n\nThe parties should resolve this dispute through good faith negotiation, per the agreement, before pursuing further action.",
  "## Dispute Resolution\n\nThe parties should resolve this dispute through good faith negotiation, as the agreement outlines, before pursuing further action.",
];

const EVOLVING_TURNS = [
  "## Weather\n\nExpect scattered thunderstorms across the valley this afternoon, clearing by evening with a cool front moving in overnight.",
  "The recipe calls for browning the onions first, then deglazing the pan with white wine before adding the stock and simmering for twenty minutes.",
  "Saturn's rings are made mostly of ice particles ranging from tiny grains to chunks several meters across, held in place by shepherd moons.",
  "Q3 revenue grew 12% year over year, driven mainly by the enterprise segment, while churn in the SMB tier ticked up slightly.",
  "The bridge's suspension cables were re-tensioned last spring after inspectors found early-stage corrosion near the anchorage points.",
];

// Five turns holding one cast, then five holding another — regimes.
const LIVE_TURNS = [
  "Raskolnikov walks to the office of Porfiry rehearsing what Porfiry might already suspect about the pawnbroker.",
  "Porfiry keeps Raskolnikov talking about the article, circling the pawnbroker without naming the murder.",
  "Raskolnikov leaves Porfiry convinced the investigator knows; the flat of the pawnbroker is mentioned twice.",
  "Porfiry sends for Raskolnikov again, and the ledger of the pawnbroker becomes the pretext for the visit.",
  "Raskolnikov and Porfiry meet a third time; the pawnbroker is never named and always present.",
  "Sonia reads Lazarus aloud while Katerina, the widow of Marmeladov, coughs through the wall of the lodging.",
  "Katerina spends the funeral money on a dinner; Sonia sits silent and Marmeladov is remembered drunk.",
  "The yellow ticket of Sonia comes up; Katerina defends her; the children of Marmeladov watch from the corner.",
  "Katerina is put out into the street singing; Sonia runs after her; the name Marmeladov is on every tongue.",
  "Sonia keeps the cross; Katerina dies; the Marmeladov children are placed, and the lodging empties.",
];

test("the evolving control settles on nothing: churning, never_settles", () => {
  const r = detectTrajectoryChurn(EVOLVING_TURNS, { pValue: 0.05, rng: mulberry32(1) });
  assert.equal(r.churning, true);
  assert.equal(r.verdict, "never_settles");
  assert.equal(detectTrajectoryBoredom(EVOLVING_TURNS).bored, false, "the same stream passes the boredom test — that is the point");
});

test("the flat fixture settles in any order — boredom's territory, not churn", () => {
  const r = detectTrajectoryChurn(FLAT_TURNS, { pValue: 0.05, shuffles: 200, rng: mulberry32(2) });
  assert.equal(r.churning, false);
  assert.equal(r.verdict, "settled_any_order");
  assert.ok(r.settled.includes("dispute") && r.settled.includes("negotiation"));
});

test("a conversation that holds a cast, then moves to another, settles in sequence — the band between", () => {
  const r = detectTrajectoryChurn(LIVE_TURNS, { pValue: 0.05, shuffles: 400, rng: mulberry32(3) });
  assert.equal(r.churning, false);
  assert.equal(r.verdict, "settles_in_sequence", r.basis);
  assert.ok(r.settled.includes("raskolnikov") && r.settled.includes("porfiry") && r.settled.includes("sonia"), r.settled.join(","));
  assert.equal(detectTrajectoryBoredom(LIVE_TURNS).bored, false);
});

test("refuses, typed, below the floor", () => {
  const r = detectTrajectoryChurn(["One turn only, and it is long enough to count as a turn."], { pValue: 0.05 });
  assert.equal(r.churning, false);
  assert.equal(r.verdict, "too_short");
});
