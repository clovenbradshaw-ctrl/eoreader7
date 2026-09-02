// eval/turbulence-pipeline.mjs — turbulence data through the pipeline
//
// User direction (2026-09-01): "take turbulence data through the pipeline
// too." The hardest medium so far, and hard in a NEW way: text, music and
// video all arrive as discrete events already (words, notes, shots).
// Turbulence is a continuous field. There is nothing to count until an
// instrument decides what an event IS — which makes this the sharpest test
// of the shared-instrument law the music run measured, because here the
// discretizer is not a decoder of pre-existing units, it CONSTITUTES them.
//
// STRATA (LEVELS.md, generalized): turbulence has NO S1 at all — no
// notation, no score, no captions; nobody writes turbulence down. Its S2
// is the sampled field itself. A pipeline that works here works with no
// human-authored layer anywhere in the stack.
//
// THE DECLARED GRAMMAR (ground truth, fixed BEFORE the run — the real
// structure this generator plants, and the one the literature names):
// the EJECTION-SWEEP CYCLE of a turbulent boundary layer. In quadrant
// analysis of the streamwise/wall-normal fluctuation pair (u', v'):
//   Q2 = ejection (u'<0, v'>0)  — slow fluid moving away from the wall
//   Q4 = sweep    (u'>0, v'<0)  — fast fluid moving toward the wall
// Q2 and Q4 carry most of the Reynolds stress and occur in a QUASI-CYCLE:
// an ejection is followed by a sweep. Q1/Q3 are the weak "interaction"
// quadrants. So the planted, checkable structure is: q1 and q3 events
// are PRECEDED BY q2 (the ejection frames them), which is exactly the
// `kind:before=<x>` shape the kind organ discovers — and the generator
// plants it explicitly so a discovery can be scored, not admired.
import fs from "node:fs";
import * as K from "../../eoreader7/native/organs/index.js";
import * as H from "../hyperlexicon.js";
import * as TL from "../../eoreader7/native/kernel/task-log.js";
import { distinctSources, distinctRecipes } from "../../eoreader7/native/organs/index.js";
import { runMeasurement, parseMeasure } from "../measure.js";
import * as nul from "../../eoreader7/nul/index.js";

const OUT = "/tmp/turbulence";
fs.mkdirSync(OUT, { recursive: true });

// ── the field: two independent runs of the same flow ─────────────────────
// A Kolmogorov-ish background (power-law-weighted Fourier modes, random
// phases) plus PLANTED coherent ejection-sweep bursts. Two runs differ in
// seed, Reynolds-like scaling and sample rate: genuinely different data
// stating one structure, the same design the music/video runs used.
function lcg(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function flow({ seed, n, burstEvery, amp }) {
  const rnd = lcg(seed);
  const u = new Float64Array(n), v = new Float64Array(n);
  // background: 40 modes, energy ~ k^(-5/3) (Kolmogorov inertial range),
  // so amplitude ~ sqrt(E(k)) ~ k^(-5/6)
  for (let m = 1; m <= 40; m++) {
    const e = Math.pow(m, -5 / 6);
    const pu = rnd() * 2 * Math.PI, pv = rnd() * 2 * Math.PI;
    for (let i = 0; i < n; i++) {
      u[i] += e * Math.sin((2 * Math.PI * m * i) / n + pu);
      v[i] += e * Math.sin((2 * Math.PI * m * i) / n + pv);
    }
  }
  // A coherent structure ORGANIZES the local flow — it damps the background
  // and imposes its own motion. The first generator ADDED an offset instead,
  // and the run refuted it: an event's stress then depends on background
  // PHASE, so the same planted ejection read |u'v'| = 0.8 in one place and
  // 7.3 in another, and the hole filter deleted half the grammar. Found by
  // printing one burst's quadrants and stresses side by side, not reasoned.
  for (let s0 = burstEvery; s0 + 48 < n; s0 += burstEvery) {
    const w = 10;
    const impose = (o, du, dv) => {
      for (let i = 0; i < w && o + i < n; i++) {
        u[o + i] = 0.25 * u[o + i] + du * amp;
        v[o + i] = 0.25 * v[o + i] + dv * amp;
      }
    };
    impose(s0, -1.0, +1.0);        // Q2 EJECTION
    impose(s0 + w, +1.0, -1.0);    // Q4 SWEEP — immediately after
    impose(s0 + 2 * w, -1.0, +1.0);// Q2 again
    impose(s0 + 3 * w, +0.9, +0.9);// Q1 interaction
  }
  return { u, v };
}
const runA = flow({ seed: 7, n: 4096, burstEvery: 96, amp: 1.6 });
const runB = flow({ seed: 4242, n: 3072, burstEvery: 72, amp: 1.2 });

// ── F0, the licensed statistical door: is there structure at all? ────────
// measure.js's own gate + nul, not a hand-rolled test. The declaration is
// fixed before the run (eoreader6.1's tune-nothing rule): window 8 = the
// planted structure's own width, draws 200 = this repo's standing null-arm
// number, seed 0.
fs.writeFileSync(`${OUT}/run-a.csv`, "u,v\n" + [...runA.u].map((x, i) => `${x},${runA.v[i]}`).join("\n"));
const table = { head: ["u", "v"], rows: [...runA.u].map((x, i) => [x, runA.v[i]]) };
// through the REAL door — parseMeasure, not a hand-built object: a
// hand-built declaration reached admit() with the wrong field names and
// was refused `undeclared`, which is the door working. The declaration is
// fixed before the run (eoreader6.1's tune-nothing rule): window 8 = the
// planted structure's own half-width, draws 200 = this repo's standing
// null-arm number, windowMean/shuffle = a pair nul itself licenses.
const parsed = parseMeasure(`/measure ${OUT}/run-a.csv series:u as:windowMean broken:shuffle draws:200 window:8 seed:0`);
const decl = parsed.decl;
const measured = runMeasurement(decl, table, { nul });
console.log("── TURBULENCE ──");
console.log(`F0 (measure.js + nul, declaration fixed before the run): ${
  measured.refused ? "refused: " + measured.refused.type + " — " + measured.refused.what
  : measured.gap ? "gap: " + measured.gap.type
  : `${measured.censored ? "censored " + measured.censored : "rank " + measured.rank} (observed vs ${decl.draws} shuffles)`}`);

// ── F0→F1: the instrument constitutes the events ─────────────────────────
// TWO GENUINELY DIFFERENT DISCRETIZERS, because the music run measured that
// two sources through one instrument are one reading. Neither is "the"
// right answer; they disagree at the margins, which is the point.
//   quadrant-sign: the textbook quadrant rule on raw signs
//   quadrant-hyperbolic: the standard HOLE filter — only |u'v'| above a
//     multiple of the RMS stress counts as an event, the rest is "lull"
function quadrant(uu, vv) { return uu < 0 ? (vv > 0 ? "q2" : "q3") : (vv > 0 ? "q1" : "q4"); }
// Runs collapse to one event; a "lull" breaks the stream into bursts the
// way silence did for music. A burst of fewer than two events carries no
// company and is dropped.
function collapse(seq) {
  const ev = seq.filter((t, i) => t !== seq[i - 1]);
  return ev.join(" ").split(/\s*lull\s*/).map((p) => p.trim())
    .filter((p) => p.split(" ").length >= 2).map((text) => ({ text }));
}
// INSTRUMENT A — the textbook HOLE filter: an event is stress above a
// multiple of the whole record's mean |u'v'|. Global threshold.
function eventsHole({ u, v }, holeSize) {
  let s = 0; for (let i = 0; i < u.length; i++) s += Math.abs(u[i] * v[i]);
  const thr = holeSize * (s / u.length);
  return collapse([...u].map((_, i) => (Math.abs(u[i] * v[i]) < thr ? "lull" : quadrant(u[i], v[i]))));
}
// INSTRUMENT B — a LOCAL PEAK rule: an event is stress within a fraction of
// the local window maximum. No global threshold anywhere, so it does not
// share A's normalization and cannot share A's normalization errors — which
// is the requirement the music run established (two sources through one
// instrument are one reading).
function eventsPeak({ u, v }, frac, W) {
  const n = u.length, out = [];
  for (let i = 0; i < n; i++) {
    let mx = 0;
    for (let j = Math.max(0, i - W); j < Math.min(n, i + W); j++) mx = Math.max(mx, Math.abs(u[j] * v[j]));
    out.push(Math.abs(u[i] * v[i]) < frac * mx ? "lull" : quadrant(u[i], v[i]));
  }
  return collapse(out);
}

const VOCAB = ["q1", "q2", "q3", "q4"];
// The null arm is REQUIRED here and the run is why: on a 4-symbol alphabet
// where q2 is ~half of all events, the bare share floor is cleared by
// chance and the shuffle control survives (II.23 — the statistic does not
// resolve the claim). draws 200 = this repo's standing null-arm number,
// alpha 0.05 = its standing convention, seed 0. Declared before the run.
const FLOORS = { minMentions: 8, minShare: 0.4, minMembers: 2, clean: (t) => t,
                 nullArm: { draws: 200, seed: 0, alpha: 0.05 } };
const HOLE_RECIPE = "quadrant-hole-v1@H1.5-mean-uv";
const PEAK_RECIPE = "quadrant-localpeak-v1@frac0.4-W24";

const aHole = eventsHole(runA, 1.5), aPeak = eventsPeak(runA, 0.4, 24);
const bHole = eventsHole(runB, 1.5), bPeak = eventsPeak(runB, 0.4, 24);
console.log(`run A: ${aHole.length} bursts (hole) / ${aPeak.length} bursts (peak); first: "${aHole[0]?.text}"`);

const kHoleA = K.discoverCompanyKinds(aHole, VOCAB, FLOORS);
const kHoleB = K.discoverCompanyKinds(bHole, VOCAB, FLOORS);
const kPeakA = K.discoverCompanyKinds(aPeak, VOCAB, FLOORS);
const kPeakB = K.discoverCompanyKinds(bPeak, VOCAB, FLOORS);
const show = (tag, ks) => console.log(`  ${tag}: ${ks.map((k) => k.name + " = " + k.members.join(",")).join(" | ") || "(nothing)"}`);
show("run A, hole instrument", kHoleA);
show("run A, peak instrument", kPeakA);
show("run B, hole instrument", kHoleB);

// II.23 control, in-pass: shuffle events within each burst -> kinds dissolve
let sd = 5; const rr = () => ((sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const shuffled = aHole.map((p) => { const w = p.text.split(" "); for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(rr() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; } return { text: w.join(" ") }; });
const kShuf = K.discoverCompanyKinds(shuffled, VOCAB, FLOORS);
console.log(`  II.23 shuffle control: ${kShuf.length === 0 ? "kinds dissolve ✓" : "SURVIVED — UNLICENSED: " + kShuf.map((k) => k.name).join(",")}`);

// ── F5: two runs × two instruments into the one ledger ───────────────────
const hl = H.makeHyperlexicon(TL);
let log = hl.createHyperlexicon();
const land = (kinds, witness, recipe) => { for (const n of K.kindNotes(kinds, { witness, recipe })) log = hl.hear(log, n); };
land(kHoleA, "flow-run-a", HOLE_RECIPE);
land(kHoleB, "flow-run-b", HOLE_RECIPE);
land(kPeakA, "flow-run-a", PEAK_RECIPE);
land(kPeakB, "flow-run-b", PEAK_RECIPE);
console.log("  ledger:");
for (const n of hl.foldHyperlexicon(log)) {
  const src = distinctSources(n.witnesses).size, inst = distinctRecipes(n.witnesses).size;
  console.log(`    ${n.id}  sources ${src} · instruments ${inst}` +
    (src >= 2 && inst >= 2 ? "  <- CORROBORATED (independent runs AND independent instruments)"
      : inst < 2 ? "  <- one instrument only" : "  <- one run only"));
}
// SCORED against the grammar declared before the run
const found = hl.foldHyperlexicon(log);
const hit = found.filter((n) => n.object === "kind:before=q2" && ["q4", "q1"].includes(n.subject));
const miss = found.filter((n) => n.object !== "kind:before=q2" || !["q4", "q1"].includes(n.subject));
console.log(`\nDECLARED GRAMMAR (fixed before the run): an ejection q2 precedes the sweep q4 and the q1 interaction.`);
console.log(`SCORE: ${hit.length} membership(s) matching the planted grammar, ${miss.length} not matching.`);
console.log(hit.every((n) => distinctRecipes(n.witnesses).size >= 2 && distinctSources(n.witnesses).size >= 2)
  ? "Every matching membership is corroborated by independent RUNS and independent INSTRUMENTS."
  : "Some matching membership lacks run- or instrument-independence (see the ledger above).");
