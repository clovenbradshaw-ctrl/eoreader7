// eval/contested-copresence.mjs — does opening the co-presence veto read
// more, or only bind more?
//
// The fix under test: kernel/contest.js::adjudicate, wired into
// adapters/text/pronouns.js. The old organ refused any frame carrying a
// named surface. On encyclopedic prose that is ~90% of frames, so the
// reported `bindings: 0` was measuring almost nothing and saying so
// nowhere. The new regime adjudicates every pronoun-bearing frame and makes
// co-presence raise the bar instead of close the door.
//
// A binding count alone cannot settle whether that is an improvement — a
// looser gate always binds more. So every arm below runs against a NULL:
// the same material with its frames shuffled, which destroys the thematic
// coherence one-hop recall is supposed to be reading and preserves
// everything else (same sentences, same names, same co-presence rate). If
// the adjudicated regime binds at the same rate on shuffled material as on
// real material, it is not reading; it is guessing under a looser bar, and
// this eval says so.

import fs from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { splitSentences } from "../../eoreader7/native/adapters/text/spans.js";
import { extractSurfaces, discoverReferents } from "../../eoreader7/native/adapters/text/surfaces.js";
import { resolvePronouns } from "../../eoreader7/native/adapters/text/pronouns.js";
import { extractReadable } from "../web.js";

const HERE = dirname(fileURLToPath(import.meta.url));

// MATERIAL. The run this driver reports was taken over plain-text extracts
// sitting in a session's own /tmp. Those bytes are gone with the session, so
// this reads the SAME two articles from the fixtures this repo already
// commits, through the SAME extractor mhc-battery.mjs already reads them
// with — one extraction path, not a second. The consequence is disclosed
// rather than hidden: a different extraction yields a different frame count,
// so the numbers below are not byte-identical to the RESULTS document's, and
// that document now carries the reproduction note saying so. What has to
// survive re-extraction is the FINDING (lift below 1 — the regime binds no
// better on coherent material than on shuffled), not the digits.
const FIXTURES = {
  borodino: "wikipedia-battle-of-borodino.html",
  "war-and-peace": "wikipedia-war-and-peace.html",
};
const materialText = (key) => extractReadable(fs.readFileSync(join(HERE, "fixtures", FIXTURES[key]), "utf8")).text;

// P38's declared, disclosed-as-unvalidated operating point — reused, never
// re-derived. contestedMargin is NEW and equally unvalidated: declared here
// with its reason (a contested frame must lead by half, not a fifth) and
// carrying no golden behind it. Swept below rather than asserted.
const FLOOR = { minActivation: 0.05, minMargin: 0.2 };
const CONTESTED = 0.5;
const SEED = 20260829;

// A LIFT COMPUTED AGAINST ONE SHUFFLE IS NOT A MEASUREMENT, and this driver
// used to print one as though it were. Measured on landing, on the committed
// fixtures: the W&P article's real binding count is FIXED at 12 while its
// shuffled count swings 4 -> 13 across seeds, so the single-seed lift lands
// anywhere from 0.92x to 3.00x with nothing about the reading having changed.
// The whole spread is one draw of the null.
//
// So the null arm is drawn over a declared SET of seeds and reported as a
// band. This is the same discipline `kernel/contest.js::nullAdjudicate` puts
// on its own verdict one layer down (draws declared, never one), applied here
// to the ratio this driver reports — and it is the same failure shape the
// `regime` block was added for: a number that hides its own denominator
// misleads, and so does a ratio that hides its own variance. The first seed
// is the one the reported run used, kept so that row stays comparable.
const NULL_SEEDS = [20260829, 1, 2, 3, 7, 11, 42, 101, 999, 12345, 777, 31337];

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function shuffleFrames(sentences, seed) {
  const r = rng(seed);
  const idx = sentences.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  // Re-number order so reading position is the shuffled position: the
  // engine's causality invariant must see a genuinely different reading,
  // not the same reading with relabelled frames.
  return idx.map((k, i) => ({ ...sentences[k], order: i }));
}

function prepare(key) {
  const text = materialText(key);
  const sentences = splitSentences(text);
  const presence = extractSurfaces(sentences);
  const { events } = discoverReferents(presence, {});
  const surfaces = new Map();
  for (const e of events) surfaces.set(e.surface, e.referent_id);
  return { sentences, surfaces };
}

function arm(sentences, surfaces, opts) {
  const { bindings, gaps, regime } = resolvePronouns(sentences, surfaces, opts);
  const reasons = {};
  for (const g of gaps) reasons[g.reason] = (reasons[g.reason] ?? 0) + 1;
  return { bindings, gaps, regime, reasons };
}

function report(label, key) {
  const { sentences, surfaces } = prepare(key);
  const shuffled = shuffleFrames(sentences, SEED);

  console.log(`\n${"=".repeat(72)}\n${label}\n${"=".repeat(72)}`);
  console.log(`${sentences.length} frames, ${new Set(surfaces.values()).size} admitted referents\n`);

  const arms = [
    ["REFUSED    (shipped behaviour — co-presence vetoes)", sentences, { ...FLOOR }],
    ["ADJUDICATED (fix — co-presence raises the bar)", sentences, { ...FLOOR, contestedMargin: CONTESTED }],
    ["NULL: refused, frames shuffled", shuffled, { ...FLOOR }],
    ["NULL: adjudicated, frames shuffled", shuffled, { ...FLOOR, contestedMargin: CONTESTED }],
  ];

  const out = [];
  for (const [name, sents, opts] of arms) {
    const a = arm(sents, surfaces, opts);
    out.push({ name, ...a });
    const r = a.regime;
    console.log(name);
    console.log(`  frames with a pronoun: ${r.framesWithPronouns}   co-present: ${r.framesCoPresent}   ADJUDICATED: ${r.framesAdjudicated}`);
    console.log(`  bindings ${a.bindings.length}   gaps ${a.gaps.length}   ${JSON.stringify(a.reasons)}`);
    const rate = r.framesAdjudicated > 0 ? a.bindings.length / r.framesAdjudicated : 0;
    console.log(`  bindings per adjudicated frame: ${rate.toFixed(3)}\n`);
  }

  // The verdict this eval exists to give, drawn over the declared seed set
  // rather than the one shuffle the first version reported.
  const real = out[1];
  const realRate = real.bindings.length / Math.max(1, real.regime.framesAdjudicated);
  const lifts = [];
  for (const seed of NULL_SEEDS) {
    const n = arm(shuffleFrames(sentences, seed), surfaces, { ...FLOOR, contestedMargin: CONTESTED });
    const nr = n.bindings.length / Math.max(1, n.regime.framesAdjudicated);
    lifts.push(nr > 0 ? realRate / nr : (realRate > 0 ? Infinity : 0));
  }
  const finite = lifts.filter((l) => Number.isFinite(l));
  const lo = finite.length ? Math.min(...finite) : 0;
  const hi = finite.length ? Math.max(...finite) : 0;
  const fmt = (l) => (Number.isFinite(l) ? `${l.toFixed(2)}x` : "∞");
  console.log(`  ADJUDICATED vs its own shuffled null, over ${NULL_SEEDS.length} declared seeds:`);
  console.log(`    real rate ${realRate.toFixed(3)} (fixed)   lift ${fmt(lifts[0])} at the reported seed, band ${fmt(lo)}–${fmt(hi)}${finite.length < lifts.length ? ` (${lifts.length - finite.length} infinite)` : ""}`);
  console.log(`  reading: ${
    real.bindings.length === 0
      ? "no bindings on real material — the gate was not the binding constraint here"
      : lo >= 2
        ? "binds on coherent material and collapses on shuffled at EVERY declared seed — the bar is reading, not guessing"
        : hi <= 1
          ? "binds no better than shuffled at every declared seed — NOT READING; the extra bindings are the looser bar, not comprehension"
          : "the band straddles 1 — at these counts the seed decides the verdict, so this ratio settles nothing either way"
  }`);

  // Sample the contested bindings — the ones the old organ could never make.
  const contestedBindings = real.bindings.filter((b) => (b.coPresent ?? []).length > 0);
  console.log(`\n  contested bindings (impossible under the shipped organ): ${contestedBindings.length}`);
  for (const b of contestedBindings.slice(0, 6)) {
    const s = sentences.find((x) => x.order === b.sentenceOrder);
    console.log(`    "${b.pronoun}" → ${b.referentId}  (margin ${(b.margin * 100).toFixed(0)}% over bar ${(b.barApplied * 100).toFixed(0)}%, vs ${b.coPresent.join(", ")})`);
    console.log(`       ${s.text.trim().slice(0, 100)}`);
  }
  return { label, out };
}

// A sweep, because contestedMargin is declared and unvalidated: show what it
// buys across its whole legal range instead of defending one number.
function sweep(label, key) {
  const { sentences, surfaces } = prepare(key);
  const shuffled = shuffleFrames(sentences, SEED);
  console.log(`\n  contestedMargin sweep — ${label}`);
  console.log(`    bar    bindings   null   lift`);
  for (const bar of [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
    const a = arm(sentences, surfaces, { ...FLOOR, contestedMargin: bar });
    const n = arm(shuffled, surfaces, { ...FLOOR, contestedMargin: bar });
    const lift = n.bindings.length > 0 ? a.bindings.length / n.bindings.length : (a.bindings.length > 0 ? Infinity : 0);
    console.log(`    ${bar.toFixed(2)}   ${String(a.bindings.length).padStart(6)}   ${String(n.bindings.length).padStart(5)}   ${lift === Infinity ? "∞" : lift.toFixed(2)}x`);
  }
}

report("BORODINO — encyclopedic, 90% of frames carry a name", "borodino");
sweep("Borodino", "borodino");
report("WAR AND PEACE article — mixed expository/narrative", "war-and-peace");
sweep("War and Peace article", "war-and-peace");
