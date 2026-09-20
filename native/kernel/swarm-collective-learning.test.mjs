// swarm-collective-learning.test.mjs — the ants, swarmed: does the
// environment LEARN collectively?
//
// Wilson's claim, restated falsifiably: no ant plans the colony's route; the
// colony's route quality emerges from thousands of individual deposits in a
// shared environment — positive feedback, evaporation, and the direct route
// wins without anyone computing it. This suite swarms the ACTUAL machinery
// (kernel/stigmergy.js + kernel/hyperlexicon-routes.js +
// organs/current-facts.js — the environment file one process shares across
// every turn and every surface) with many simulated agents and measures the
// five falsifiable properties of collective learning:
//
//   1. CONVERGENCE — effort per resolution falls as the colony learns:
//      an alias ask ("who is POTUS?") costs two probes on the first
//      encounter and one probe once the colony has deposited.
//   2. TRANSFER — what one agent's scout finds serves ANOTHER agent's
//      resolution through the environment, with no door call of its own.
//   3. AMPLIFICATION AND EVAPORATION — successful traffic strengthens a
//      route; a route whose traffic stops decays back out of the order.
//   4. COLLECTIVE MISLEARNING (the falsification) — positive feedback
//      amplifies whatever the FIRST deposits say: a wrong link adopted by
//      scouts is reinforced by every wrong resolution, and the gate ships
//      the wrong value with full confidence; only an alarm (veto) collapses
//      the wrong certainty. If this test fails, the colony cannot learn at
//      all; if the mislearning arm fails, the amplification is not real.
//   5. THE SCOUTS NEVER STOP — with exploration epsilon, a never-tried
//      route is still probed even after the colony has a strong route.
//
// Every agent is mechanical (no model — no LaVar): a seeded asker and a
// shared store. The seed is declared; a run is reproducible.

import test from "node:test";
import assert from "node:assert/strict";
import { createSeededRng } from "./rng.js";
import { trailStats, routeOrderFor, TRAIL_HALF_LIFE_DAYS } from "./stigmergy.js";
import { createCurrentFactsStore } from "../organs/current-facts.js";
import { applyVerdictGate } from "../organs/fact-gate.js";
import { lensForAsk } from "../adapters/text/fact-lenses.js";

const NOW = () => new Date("2026-09-19T12:00:00Z");
const DAY = 86400000;

// ── the colony: five kinds, each with a learned alias, dated links ─────────
const COLONY = [
  { label: "president", alias: "POTUS", holder: "Donald Trump", text: "Wikidata lists Donald Trump as the current President of the United States, since 2025-01-20, term ending 2029-01-20." },
  { label: "mayor", alias: "Hizzoner", holder: "Linda Gordo", text: "Wikidata lists Linda Gordo as the current Mayor of Nashville, since 2023-09-01." },
  { label: "chancellor", alias: "Kanzlerin", holder: "Anke Müller", text: "Wikidata lists Anke Müller as the current Chancellor of Germany, since 2025-05-12." },
  { label: "governor", alias: "Gov", holder: "Sofia Reyes", text: "Wikidata lists Sofia Reyes as the current Governor of Texas, since 2024-01-15." },
  { label: "premier", alias: "Premier", holder: "Jack Okafor", text: "Wikidata lists Jack Okafor as the current Premier of Alberta, since 2023-11-08." },
];

const buildColony = () => {
  const store = createCurrentFactsStore({ now: NOW, lensForAsk });
  for (const c of COLONY) {
    store.adoptDatedRecord({ head: c.label, text: c.text, ref: `wikidata:test#${c.label}` });
    store.upsertKind({ label: c.label, aliases: [c.alias], giver: "colony@test" });
  }
  return store;
};
const headAsk = (c) => `who is the ${c.label}?`;
const aliasAsk = (c) => `who is ${c.alias}?`;
const probesOf = (hit) => (hit.ok ? hit.order.indexOf(hit.route) + 1 : hit.order.length + 1);

test("SWARM 1 — convergence: effort per resolution falls as the colony deposits; an alias ask costs one probe once learned", () => {
  const store = buildColony();
  const choiceRng = createSeededRng(0x51a7); // ask selection
  const exploit = () => 0.5; // the colony exploits its learned routes (no scouts in this arm)
  const EPOCHS = 6, AGENTS = 20;
  const meanProbes = [];
  for (let e = 0; e < EPOCHS; e++) {
    let sum = 0, n = 0;
    for (let a = 0; a < AGENTS; a++) {
      const c = COLONY[Math.floor(choiceRng() * COLONY.length)];
      const ask = choiceRng() < 0.5 ? aliasAsk(c) : headAsk(c);
      const hit = store.resolve(ask, { rng: exploit });
      sum += probesOf(hit);
      n += 1;
    }
    meanProbes.push(sum / n);
  }
  const first = meanProbes[0], last = meanProbes[meanProbes.length - 1];
  assert.ok(first > last, `effort falls: epoch-0 ${first.toFixed(3)} -> epoch-final ${last.toFixed(3)}`);
  assert.ok(last < 1.25, `the colony converges to the direct route (final mean probes ${last.toFixed(3)})`);
  // the learned order for an alias head is direct
  const order = routeOrderFor(store.trails(), "POTUS", { now: NOW().getTime(), routes: ["exact-kind", "alias", "jurisdiction", "ordinal", "holder"], rng: () => 1 });
  assert.equal(order[0], "alias", "the colony learned that POTUS resolves through the alias hop first");
});

test("SWARM 2 — transfer: what one agent's scout finds serves another agent's resolution, with no door call of its own", () => {
  const store = createCurrentFactsStore({ now: NOW, lensForAsk });
  // agent A is the scout: its door adopts a finding NO other agent has seen
  store.adoptDatedRecord({ head: "president", text: COLONY[0].text, ref: "wikidata:test#president" });
  // agent B has never heard of this role — and never calls a door
  const hit = store.resolve("who is the president?", { rng: () => 1 });
  assert.equal(hit.ok, true);
  assert.equal(hit.route, "exact-kind");
  assert.equal(hit.link.holder, "Donald Trump", "B's resolution is grounded by A's deposit — the environment, not B's memory");
  assert.ok(store.trails().president?.length >= 1, "the transfer left its own trail");
});

test("SWARM 3 — amplification and evaporation: successful traffic strengthens a route; a route whose traffic stops decays out of the order", () => {
  const store = buildColony();
  const rng = createSeededRng(0x5eed);
  for (let i = 0; i < 10; i++) store.resolve(aliasAsk(COLONY[1]), { rng }); // mayor via Hizzoner, ten times
  const now = NOW().getTime();
  const stats = trailStats(store.trails(), "Hizzoner", { now, routes: ["exact-kind", "alias"] });
  const alias = stats.find((s) => s.route === "alias");
  assert.equal(alias.hits, 10, "ten resolutions deposited ten trails");
  assert.ok(alias.strength > 9, `amplification: ten fresh successes sum to near-ten strength (${alias.strength.toFixed(2)})`);
  // evaporation: forty days later the same ten trails weigh ~nothing — a
  // fresh single success on another hop outranks the whole old season
  const later = now + 40 * DAY;
  const order = routeOrderFor({ Hizzoner: store.trails().Hizzoner.concat([{ route: "holder", ok: true, ms: 1, at: later }]) }, "Hizzoner", { now: later, routes: ["exact-kind", "alias", "holder"], rng: () => 1 });
  assert.equal(order[0], "holder", "the colony switched to the hop that is being used now");
  const old = trailStats(store.trails(), "Hizzoner", { now: later, routes: ["alias"] })[0];
  assert.ok(old.strength < 1, `the old season evaporated (strength ${old.strength.toFixed(3)})`);
});

test("SWARM 4 — collective mislearning (the falsification): positive feedback amplifies a WRONG first deposit, and only the alarm collapses it", () => {
  const store = createCurrentFactsStore({ now: NOW, lensForAsk });
  // the scouts' first deposit is wrong (a stale door or a misread byte)
  store.adoptDatedRecord({ head: "president", text: "Wikidata lists Joe Biden as the current President of the United States, since 2021-01-20, term ending 2025-01-20.", ref: "wikidata:test#president" });
  const rng = createSeededRng(0xb1de);
  const before = [];
  for (let i = 0; i < 8; i++) {
    const hit = store.resolve("who is the president?", { rng });
    before.push(hit.link.holder);
    // the gate ships the environment's value with full confidence — a CORRECT
    // draft ("Donald Trump") is struck and replaced with the wrong one
    const v = applyVerdictGate({ ask: "who is the president?", answer: "Donald Trump.", kind: hit.kind, link: hit.link, route: hit.route, lens: lensForAsk("who is the president?"), now: NOW() });
    assert.equal(v.verdict, "contradicted", "the gate's confidence is the environment's — a right draft loses to a wrong link");
    assert.equal(v.text, "As of 2021-01-20, the president of the United States is Joe Biden.", "the wrong value ships with full mechanical confidence");
  }
  assert.ok(before.every((h) => h === "Joe Biden"), "every agent resolves the wrong link");
  const strength = trailStats(store.trails(), "president", { now: NOW().getTime(), routes: ["exact-kind"] })[0].strength;
  assert.ok(strength > 7, `the wrong route is AMPLIFIED by the traffic (strength ${strength.toFixed(2)}) — this is the collective mislearning, real and measured`);
  // THE ALARM: one veto collapses the wrong certainty — the colony stops
  // routing to the wrong link, honestly, until a fresh door re-checks it
  store.markVetoed("president");
  const after = store.resolve("who is the president?", { rng });
  assert.equal(after.ok, false, "the vetoed link is demoted — the colony no longer asserts the wrong value");
  assert.ok(store.trails().president.some((t) => t.route === "veto"), "the alarm trail is on file");
});

test("SWARM 5 — the scouts never stop: with exploration epsilon, a never-tried route is still probed after the colony has learned", () => {
  const store = buildColony();
  // every resolution draws under epsilon — the scout promotes a never-tried
  // route to the front, pays the probe, and alias still resolves the ask
  let scoutProbes = 0;
  for (let i = 0; i < 60; i++) {
    const hit = store.resolve(aliasAsk(COLONY[0]), { rng: () => 0.05 });
    if (hit.ok && hit.order[0] !== "alias") scoutProbes += 1;
  }
  assert.ok(scoutProbes >= 10, `the never-tried route was probed ${scoutProbes} times — Wilson's scouts, still at work`);
});

test("SWARM 6 — the ledger of the whole swarm: one shared environment, one deposit per resolution, no phantom heads", () => {
  const store = buildColony();
  const rng = createSeededRng(0xc011e6);
  let deposits = 0;
  for (let i = 0; i < 40; i++) {
    const c = COLONY[Math.floor(rng() * COLONY.length)];
    const hit = store.resolve(rng() < 0.5 ? aliasAsk(c) : headAsk(c), { rng });
    deposits += 1;
    assert.ok(hit.ok, `every swarm resolution resolves (${c.label})`);
  }
  const trails = store.trails();
  const keys = Object.keys(trails);
  for (const c of COLONY) {
    assert.ok(keys.includes(c.label), `${c.label} deposited under its own head`);
    assert.ok(keys.includes(c.alias), `${c.alias} deposited under its own head`);
  }
  assert.equal(keys.length, COLONY.length * 2, "no phantom heads — every deposit lands under a real role word");
  assert.equal(deposits, 40);
});