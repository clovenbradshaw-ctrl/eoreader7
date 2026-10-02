// aperture.test.mjs — S1's own ground, measured (see aperture.js's header).
//
// What must hold: this module runs on the SAME declared numbers reflex.js
// already named givers for, not a second set; the meter runs against the
// ENGINE'S REAL ORGANS (eoreader6 emergence/tiers.js), not a stub, the same
// discipline reflex.test.mjs and grounding.test.mjs already set; the first
// arrival is a typed gap exactly as SEED.md #1 requires, same as the self
// plane's own meter; and the entropy reading actually responds to what it
// claims to measure — repeating one sentence must not widen the ground, a
// genuinely foreign one must — checked, not asserted.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SURPRISE_ALPHA,
  SURPRISE_DRAWS,
  SURPRISE_SEED,
  SURPRISE_WINDOW,
  exchangeHeldGround,
  exchangeSurprise,
  makeApertureMeter,
  meterSnapshot,
  presentWindow,
  regimeAfter,
} from "./aperture.js";

import {
  SELF_TIERS,
  SURPRISE_ALPHA as REFLEX_ALPHA,
  SURPRISE_DRAWS as REFLEX_DRAWS,
  SURPRISE_SEED as REFLEX_SEED,
  SURPRISE_WINDOW as REFLEX_WINDOW,
} from "./reflex.js";

import { RECENCY_WINDOW } from "./fold.js";

import {
  createTierStack,
  foldThrough,
  gammaFor,
} from "../legacy-ported/packages/engine/emergence/tiers.js";

const meterOrgans = makeApertureMeter({ createTierStack, foldThrough });

test("the numbers are reflex.js's own, not a second declaration", () => {
  assert.equal(SURPRISE_WINDOW, REFLEX_WINDOW);
  assert.equal(SURPRISE_WINDOW, RECENCY_WINDOW, "one declaration of the present, not a second knob");
  assert.equal(SURPRISE_DRAWS, REFLEX_DRAWS);
  assert.equal(SURPRISE_ALPHA, REFLEX_ALPHA);
  assert.equal(SURPRISE_SEED, REFLEX_SEED);
});

test("the stack reuses SELF_TIERS' three names — one ladder, not a second vocabulary", () => {
  const meter = meterOrgans.create();
  assert.equal(meter.tiers.length, SELF_TIERS.length);
  assert.deepEqual(meter.tiers.map((t) => t.name), [...SELF_TIERS]);
  assert.equal(meter.tiers[0].gamma, gammaFor(SURPRISE_WINDOW));
});

test("the first arrival seeds belief and is a typed gap, never a number (SEED.md #1) — but the ground it seeded is already measurable", () => {
  const meter = meterOrgans.create();
  const o = meterOrgans.observe(meter, { turn: 1, role: "user", text: "the harbor figures held steady across the spring quarter" });
  assert.equal(o.bits, null);
  assert.ok(/no_ground/.test(o.gap));
  // Unlike bits/rank (placed against a continuation null that does not
  // exist yet), entropy is a direct reading of the prior tiers.js already
  // built while folding this arrival in — so it exists from arrival one.
  assert.ok(o.entropy > 0, "a sentence of several distinct forms has real width");
  assert.equal(o.apertureDelta, null, "no prior entropy to differ from yet");
  assert.equal(o.apertureDirection, null);
});

test("an arrival with nothing tokenizable is its own typed gap, and carries the ground forward unchanged", () => {
  const meter = meterOrgans.create();
  const first = meterOrgans.observe(meter, { turn: 1, role: "user", text: "the harbor figures held steady across the spring quarter" });
  const o = meterOrgans.observe(meter, { turn: 1, role: "assistant", text: "of the and to" });
  assert.ok(/empty_arrival/.test(o.gap));
  assert.equal(o.entropy, first.entropy, "nothing arrived, so the ground did not move");
  assert.equal(o.apertureDelta, null);
});

test("measurement is deterministic: the same conversation measures identically twice", () => {
  const feed = [
    "the harbor figures held steady across the spring quarter",
    "the harbor figures held steady across the spring quarter",
    "suddenly zeppelins burned violet over midnight skies beyond the estuary",
  ];
  const run = () => {
    const meter = meterOrgans.create();
    feed.forEach((text, i) => meterOrgans.observe(meter, { turn: i + 1, role: "user", text }));
    return meter.observations.map((o) => [o.entropy, o.apertureDelta, o.apertureDirection, o.gap]);
  };
  assert.deepEqual(run(), run());
});

test("repeating one sentence does not widen the ground; a genuinely foreign one does — measured, not asserted", () => {
  const meter = meterOrgans.create();
  const repeat = "the harbor figures held steady across the spring quarter";
  meterOrgans.observe(meter, { turn: 1, role: "user", text: repeat });
  const secondRepeat = meterOrgans.observe(meter, { turn: 2, role: "user", text: repeat });
  const thirdRepeat = meterOrgans.observe(meter, { turn: 3, role: "user", text: repeat });
  const novel = meterOrgans.observe(meter, {
    turn: 4,
    role: "user",
    text: "meanwhile a stranger arrived speaking of cathedrals and comets and drowned kings",
  });

  assert.ok(
    Math.abs(novel.apertureDelta) > Math.abs(secondRepeat.apertureDelta),
    "the foreign sentence moves the ground's own width further than a repeat does",
  );
  assert.ok(
    Math.abs(novel.apertureDelta) > Math.abs(thirdRepeat.apertureDelta),
    "further than the settled repeat, not just further than the first one",
  );
  assert.equal(novel.apertureDirection, "widening", "new, unrelated vocabulary widens what the ground holds");
});

test("apertureDirection agrees with the sign of apertureDelta, three-valued like nul.pattern()'s opened", () => {
  const meter = meterOrgans.create();
  meterOrgans.observe(meter, { turn: 1, role: "user", text: "the harbor figures held steady across the spring quarter" });
  const o = meterOrgans.observe(meter, { turn: 2, role: "user", text: "beyond the harbor a comet burned violet" });
  if (o.apertureDelta > 0) assert.equal(o.apertureDirection, "widening");
  else if (o.apertureDelta < 0) assert.equal(o.apertureDirection, "narrowing");
  else assert.equal(o.apertureDirection, null);
});

test("observations are append-only and frozen — evidence cannot be edited in place", () => {
  const meter = meterOrgans.create();
  const o = meterOrgans.observe(meter, { turn: 1, role: "user", text: "the harbor figures held steady across the spring quarter" });
  assert.ok(Object.isFrozen(o));
  assert.equal(meter.observations.length, 1);
  assert.equal(meter.observations[0], o);
});

// ── the learning state, tracked per arrival and per snapshot ────────────────

test("every measured observation carries the tier's learning state: novelRate, mass, forms", () => {
  const meter = meterOrgans.create();
  const first = meterOrgans.observe(meter, { turn: 1, role: "user", text: "the harbor figures held steady across the spring quarter" });
  assert.equal(first.novelRate, 1, "an empty prior makes every form novel — rate 1 by arithmetic, not by choice");
  assert.ok(first.mass > 0);
  assert.ok(first.forms > 0);
  const repeat = meterOrgans.observe(meter, { turn: 2, role: "user", text: "the harbor figures held steady across the spring quarter" });
  assert.ok(repeat.novelRate < first.novelRate, "a verbatim repeat brings nothing new — the rate falls");
  assert.equal(repeat.forms, first.forms, "no new vocabulary, same breadth");
});

test("novelRate falling while bits stay measured IS the learning signal — the two causes on one row", () => {
  const meter = meterOrgans.create();
  const feed = [
    "the harbor figures held steady across the spring quarter",
    "the summer harbor figures ran higher than the spring quarter",
    "the harbor figures for spring and summer both held above the winter baseline",
    "spring and summer harbor figures stayed above baseline",
  ];
  feed.forEach((text, i) => meterOrgans.observe(meter, { turn: i + 1, role: "user", text }));
  const rates = meter.observations.map((o) => o.novelRate);
  assert.ok(rates[rates.length - 1] < rates[0], "circling the same ground, the expected novelty settles");
});

test("meterSnapshot reads the whole ladder's state off the tiers the engine maintains", () => {
  const meter = meterOrgans.create();
  meterOrgans.observe(meter, { turn: 1, role: "user", text: "the harbor figures held steady across the spring quarter" });
  meterOrgans.observe(meter, { turn: 1, role: "assistant", text: "the report puts the spring figure at twelve percent above baseline" });
  const snap = meterSnapshot(meter);
  assert.equal(snap.length, SELF_TIERS.length);
  assert.deepEqual(snap.map((t) => t.name), [...SELF_TIERS]);
  assert.ok(snap[0].observations >= 2, "tier 0 heard both arrivals");
  assert.ok(snap[0].entropy > 0, "the discourse ground has real width");
  assert.ok(snap[0].mass > 0);
  assert.ok(snap[0].forms > 0);
  assert.equal(typeof snap[0].shifts, "number");
});

// ── the refresh gate: the engine's own "the ground did not change" ──────────

test("exchangeHeldGround refuses gaps — withheld is never 'nothing moved'", () => {
  const meter = meterOrgans.create();
  const first = meterOrgans.observe(meter, { turn: 1, role: "user", text: "the harbor figures held steady across the spring quarter" });
  const second = meterOrgans.observe(meter, { turn: 1, role: "assistant", text: "the report puts the spring figure at twelve percent above baseline" });
  assert.ok(first.gap, "the first arrival is a typed gap");
  assert.equal(exchangeHeldGround([first, second]), false, "a gap in the exchange refuses the hold");
  assert.equal(exchangeHeldGround([]), false);
  assert.equal(exchangeHeldGround(null), false);
});

test("a settled exchange holds; a topic pivot refuses — the ACTUAL transcript of a live qwen2.5:14b run, not a hand-authored stand-in", () => {
  // aperture.js's header tells this fixture's own story: a first version of
  // exchangeHeldGround (censored-above only) read fine against hand-typed
  // repeats, then held straight through this exact pivot when run against a
  // real model's own answers (eval/summary-refresh-gate-eval.mjs,
  // 2026-08-17) — a real model paraphrases even its own repeats, which
  // widens the null enough that "exceeds every one of 200 draws" stops
  // being a reliable bar. This is the transcript that caught it, kept
  // verbatim so the regression stays pinned to the actual failure rather
  // than to a synthetic proxy for it.
  const meter = meterOrgans.create();
  const transcript = [
    ["What does the report say about harbor traffic in spring? Answer in one sentence, inventing a specific plausible number if you have to.",
     "The report indicates that harbor traffic increased by 15% in the spring due to an uptick in cargo shipments and tourism."],
    ["And the summer figure? One sentence.",
     "The report shows that harbor traffic further increased by 22% in the summer, driven primarily by tourism and recreational boat activities."],
    ["So is the ferry schedule what's driving both seasons? One sentence.",
     "The ferry schedule is a significant factor in driving the increased harbor traffic during both spring and summer, as it accommodates the surge in cargo and tourist activities."],
    ["What was the spring figure again? One sentence.",
     "The report indicates that harbor traffic increased by 15% in the spring due to an uptick in cargo shipments and tourism."],
    ["And that was driven by the ferries? One sentence.",
     "The increase in harbor traffic by 15% during the spring was partly driven by the ferries, which accommodated the surge in cargo and tourist activities."],
    ["Remind me of the summer number? One sentence.",
     "The report shows that harbor traffic further increased by 22% in the summer, driven primarily by tourism and recreational boat activities."],
    ["So both seasons sit above baseline because of the ferries? One sentence.",
     "Both spring and summer harbor traffic figures sit above baseline due to the increased ferry schedules that accommodate the surge in cargo and tourist activities."],
    ["Now, completely separately — what do you know about volcanic soil chemistry in Iceland? One sentence.",
     "Volcanic soil in Iceland is rich in minerals such as silica and volcanic ash, which contribute to its fertility and distinct chemical composition."],
  ];

  const byTurn = transcript.map(([q, a], i) => [
    meterOrgans.observe(meter, { turn: i + 1, role: "user", text: q }),
    meterOrgans.observe(meter, { turn: i + 1, role: "assistant", text: a }),
  ]);

  // Turn 4 ("what was the spring figure again" — a verbatim repeat of turn
  // 1's answer): measured rank 0.93/0.975, deep in the ordinary half. Holds.
  assert.equal(exchangeHeldGround(byTurn[3]), true, "a verbatim repeat, deep in the null's ordinary half, holds the ground");

  // Turn 8, the pivot: measured rank 0.01 on BOTH arrivals — the 99th
  // percentile of surprise, one step short of exceeding the null's own
  // maximum outright. This is the turn the naive (censored-above-only)
  // gate missed live; rank > 0.5 catches it.
  const pivot = byTurn[7];
  assert.ok(pivot[0].rank < 0.5 && pivot[1].rank < 0.5, "the pivot sits far on the surprising side of the null's own median");
  assert.equal(exchangeHeldGround(pivot), false, "a real topic change refuses the hold: this is the turn a summary must rewrite on");
});

// ── the regime: surprise as posture, consumed, never displayed ──────────────

test("exchangeSurprise is continuous through the gate's own cut: censored-above is the ceiling, the null's median reads one half, censored-below is the floor", () => {
  assert.equal(exchangeSurprise([{ censored: "above", rank: null }]), 1);
  assert.equal(exchangeSurprise([{ censored: null, rank: 0.5 }]), 0.5);
  assert.equal(exchangeSurprise([{ censored: null, rank: 0.99 }]), 1 - 0.99, "a thoroughly ordinary arrival reads near the floor");
  assert.equal(exchangeSurprise([{ censored: "below", rank: null }]), 0);
  assert.equal(exchangeSurprise([{ gap: "no_ground" }]), 0, "a gap is withheld, and withheld cannot startle");
  assert.equal(exchangeSurprise([]), 0);
});

test("the exchange's surprise is the MAX of its arrivals — attention narrows onto the sharpest half, not the average", () => {
  const quiet = { censored: null, rank: 0.9 };
  const sharp = { censored: null, rank: 0.05 };
  assert.equal(exchangeSurprise([quiet, sharp]), 1 - 0.05);
});

test("regimeAfter: a startle sets the posture, release decays it at the tier's own gamma — one clock, not a second number", () => {
  const meter = meterOrgans.create();
  const tier = meter.tiers[0];
  const startled = regimeAfter(0, [{ censored: "above", rank: null }], tier);
  assert.equal(startled, 1);
  const oneQuietTurnLater = regimeAfter(startled, [{ censored: "below", rank: null }], tier);
  assert.equal(oneQuietTurnLater, tier.gamma, "the release IS the belief prior's own forgetting rate");
  const two = regimeAfter(oneQuietTurnLater, [{ censored: "below", rank: null }], tier);
  assert.ok(Math.abs(two - tier.gamma * tier.gamma) < 1e-12, "and it keeps falling on the same clock");
});

test("presentWindow: the present contracts toward ONE exchange under startle and rests at the declared baseline when calm", () => {
  assert.equal(presentWindow(0, RECENCY_WINDOW), RECENCY_WINDOW, "calm is the baseline, untouched");
  assert.equal(presentWindow(1, RECENCY_WINDOW), 2, "full startle narrows the present to the startling exchange itself");
  const mid = presentWindow(0.5, RECENCY_WINDOW);
  assert.ok(mid >= 2 && mid <= RECENCY_WINDOW, "between the two, between the two");
  assert.equal(presentWindow(null, RECENCY_WINDOW), RECENCY_WINDOW, "no regime yet is calm, not an error");
  assert.equal(presentWindow(2, RECENCY_WINDOW), 2, "an out-of-range regime clamps to the structural floor, never below one exchange");
});
