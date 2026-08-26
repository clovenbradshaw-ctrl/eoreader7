#!/usr/bin/env node
// eval/measured-memory-b.mjs — increment B of wiring-the-measured-memory-v2:
// the two curves, measured, rather than assumed live from A/C's own unit
// tests. Re-runnable driver, not a committed regression test (this repo's
// own P19/P27 posture) — `npm test` never calls this file.
//
// B1 — the writer's own return-form curve (kernel/return-curve.js,
// eoreader7, real, imported as-is). B2 — this conversation's own need-odds
// versus the received ACT-R prior (the exact cell/margin mechanism
// retrieval.js/consequence.js already carry, exercised here at a scale a
// unit test should not pay for).
//
// NO REAL 40+ TURN CONVERSATION TRANSCRIPT WITH RECORD CITATIONS EXISTS ON
// THIS DISK — this instrument's own conversations are not captured that way
// (fold.js discards nothing now, per increment A, but nothing has RUN it
// long enough yet to leave a real log). Rather than wait for one, this
// driver builds a SYNTHETIC conversation with GROUND TRUTH BY CONSTRUCTION
// — this repo's own established fallback when no real corpus exists
// (hl-acquire.test.mjs's invented chronicle; P29's asserted-eval.mjs
// synthetic adversarial suite) — and states that plainly rather than
// dressing a constructed fixture up as captured data. The construction
// itself is disclosed below, in full, before either measurement runs.
//
// Usage: node eval/measured-memory-b.mjs

import { createActivation, dmdWindow } from "../../eoreader7/native/kernel/activation.js";
import { returnCurve } from "../../eoreader7/native/kernel/return-curve.js";
import { tokens, codeOf, recall, encodeFrame } from "../../eoreader7/native/memory/activation.js";
import { createRetrievalIndex, encodeRecord, recallCandidates, recordCitation } from "../retrieval.js";
import { deriveRecordWindow, buildWarrantRecord } from "../fold.js";

const SEED = 20260826;
const mulberry = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rnd = mulberry(SEED);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// ── The construction, disclosed before either measurement runs ────────────
//
// TOPICS declare their own return regime — how many turns apart the topic
// resurfaces, and what FORM the user uses to bring it back (a genre-level
// prior, S15's own writer-decay finding, applied by hand rather than
// measured from a real corpus this pass does not have): a topic active
// within the last few turns is referenced by a bare pronoun-shaped form; a
// topic dormant past ~15 turns is re-glossed by the user with its full
// name, exactly as S15 measured real writers doing (bare-name/regloss
// returns dominate past the activation layer's own short reach). TOPIC
// PROSE ("koniag contract renewal terms", "harbor dredging budget line",
// …) is deliberately distinct across topics so B1's/B2's own vocabulary
// overlap is never a confound between them.
const TOPICS = [
  { key: "koniag", full: "the koniag contract renewal", gapTurns: 3, prose: "koniag contract renewal terms pricing schedule negotiation" },
  { key: "harbor", full: "the harbor dredging budget line", gapTurns: 9, prose: "harbor dredging budget line federal matching funds request" },
  { key: "audit", full: "the pension audit findings", gapTurns: 22, prose: "pension audit findings actuarial assumptions discrepancy report" },
  { key: "zoning", full: "the riverside zoning variance", gapTurns: 40, prose: "riverside zoning variance setback requirement appeal hearing" },
];
const TURNS = 90;
const DISTRACTOR = (n) => `unrelated administrative note number ${n} about routine scheduling`;

/** One synthetic turn per position: which topic (if any) it returns to,
 * and — B1's own event shape — the FORM the user's own words take. A
 * topic returns exactly on its own declared gapTurns cadence, deterministic
 * so this file's own numbers reproduce; noise turns between returns are
 * plain distractors, never counted as a return of anything. */
function buildConversation() {
  const events = []; // B1: {key, at, form}
  const records = []; // B2: {order, at, topicKey|null, gist}
  const lastSeenAt = new Map();
  for (let t = 0; t < TURNS; t++) {
    const due = TOPICS.filter((topic) => t > 0 && t % topic.gapTurns === 0);
    if (due.length) {
      const topic = pick(due);
      const gap = lastSeenAt.has(topic.key) ? t - lastSeenAt.get(topic.key) : null;
      // The writer's own device (S15, applied by declared prior, not
      // measured — see header): recently active -> pronoun-shaped; long
      // gap -> the topic's own full re-gloss.
      const form = gap != null && gap <= 4 ? "pronoun" : "regloss";
      events.push({ key: topic.key, at: t, form });
      records.push({ order: records.length, at: t, topicKey: topic.key, gist: `${topic.prose} update turn ${t}` });
      lastSeenAt.set(topic.key, t);
    } else {
      records.push({ order: records.length, at: t, topicKey: null, gist: DISTRACTOR(t) });
    }
  }
  return { events, records };
}

// ── B1: does the writer's own return-form curve set a real window? ────────

function runB1(events) {
  const curve = returnCurve(events);
  console.log("\n=== B1: return-curve over the synthetic conversation's own return events ===");
  console.log(`declared: ${TOPICS.length} topics, each with its own hand-declared gapTurns cadence (giver: this file's own construction, not measured) — see header`);
  console.log(`returns measured: ${curve.returns}, forms discovered: ${JSON.stringify(curve.forms)}`);
  for (const bin of curve.bins) {
    console.log(`  gap ${bin.floor}-${bin.ceiling}: total ${bin.total}, counts ${JSON.stringify(bin.counts)}`);
  }
  console.log(`majorityWindow: ${JSON.stringify(curve.majorityWindow)}`);

  // FROZEN PREDICTION (stated here, before reading the numbers above into a
  // conclusion): pronoun returns majority only at the shortest bin(s);
  // regloss majority extends to the widest. This is S15's own real-book
  // finding, restated as the shape this CONSTRUCTED conversation was built
  // to reproduce — a check that the construction and B1's own math agree,
  // not a discovery about real writing (a real transcript's numbers, not
  // this file's, would be the discovery).
  const pronounWindow = curve.majorityWindow.pronoun;
  const reglossWindow = curve.majorityWindow.regloss;
  const holds = pronounWindow != null && reglossWindow != null && pronounWindow < reglossWindow;
  console.log(`frozen prediction (pronoun majority window < regloss majority window): ${holds ? "HOLDS" : "REFUSED"} (pronoun=${pronounWindow}, regloss=${reglossWindow})`);

  // What this buys A concretely: dmdWindow needs CANDIDATE depths to try
  // (it does not invent them — grid.js's own house rule, "which depths are
  // worth testing is not this function's to guess"). The return-curve's own
  // bin floors are a principled source for that candidate list — dyadic,
  // discovered from real returns rather than typed — shown here as the
  // concrete join between B1 and A, not wired into fold.js this pass
  // (A's own deriveRecordWindow ships with a caller-declared default
  // instead; this is the disclosed next step, not silently assumed done).
  const candidatesFromCurve = curve.bins.map((b) => b.floor).filter((f) => f > 1);
  console.log(`candidate depths B1's own bins would hand to dmdWindow: ${JSON.stringify(candidatesFromCurve)}`);
  return { curve, holds };
}

// ── B2: does this conversation's own need-odds beat the received prior? ───

function runB2(records) {
  const index = createRetrievalIndex();
  const organs = { tokens, codeOf, recall, encodeFrame };
  // Warm-up: memory/activation.js's own incremental idf needs real read
  // depth before anything can be distinctive — retrieval.test.mjs's own
  // documented finding, reused verbatim (see that file's header).
  for (const r of records) encodeRecord(index, r.order, { gist: r.gist }, organs);

  // Train need-odds the honest way: every time a topic's OWN turn recurs,
  // that IS the genuine "was this needed again" signal for every record
  // already live — recordCitation on the record that just returned.
  const byTopic = new Map();
  for (const r of records) {
    if (!r.topicKey) continue;
    if (!byTopic.has(r.topicKey)) byTopic.set(r.topicKey, []);
    byTopic.get(r.topicKey).push(r.order);
  }
  for (const orders of byTopic.values()) {
    for (let i = 1; i < orders.length; i++) recordCitation(index, orders[i - 1], orders[i]);
  }

  // FROZEN PREDICTION: the received ACT-R prior (d=0.5) already beats
  // undecayed accumulation on real text (S17's own measured result); this
  // driver does not re-litigate that baseline. What is genuinely open here
  // is whether THIS conversation, by its own final turn, holds enough
  // repeated-citation evidence to clear NEED_ODDS_EVIDENCE_FLOOR anywhere —
  // predicted YES for "koniag" (gapTurns=3, so it returns ~30 times over
  // 90 turns) and NO for "zoning" (gapTurns=40, returns twice) — a
  // conversation this short cannot earn evidence for a topic that rare,
  // and the honest answer is the declared prior standing, not a forced
  // supersession.
  const results = {};
  for (const [key, orders] of byTopic) {
    const last = orders.at(-1);
    const question = TOPICS.find((t) => t.key === key).prose;
    const { candidates, gap } = recallCandidates(index, question, organs, { turnIndex: TURNS + 1, minMargin: 0 });
    const self = candidates.find((c) => c.order === last);
    results[key] = { returns: orders.length, gap, basis: self?.basis ?? null };
  }
  console.log("\n=== B2: this conversation's own need-odds vs. the received ACT-R prior ===");
  for (const [key, r] of Object.entries(results)) {
    console.log(`  ${key}: ${r.returns} returns over ${TURNS} turns — ${r.gap ?? (r.basis?.startsWith("measured") ? "MEASURED (superseded)" : "declared (ACT-R prior stands)")}`);
  }
  const koniagMeasured = results.koniag?.basis?.startsWith("measured") ?? false;
  const zoningMeasured = results.zoning?.basis?.startsWith("measured") ?? false;
  const holds = koniagMeasured && !zoningMeasured;
  console.log(`frozen prediction (koniag's frequent returns earn a measured supersession; zoning's rare ones do not): ${holds ? "HOLDS" : "REFUSED"}`);
  return { results, holds };
}

function main() {
  const { events, records } = buildConversation();
  const b1 = runB1(events);
  const b2 = runB2(records);
  console.log("\n=== summary ===");
  console.log(`B1 frozen prediction: ${b1.holds ? "held" : "refused"}`);
  console.log(`B2 frozen prediction: ${b2.holds ? "held" : "refused"}`);
}

main();
