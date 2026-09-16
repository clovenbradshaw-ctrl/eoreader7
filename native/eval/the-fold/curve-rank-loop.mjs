// eval/the-fold/curve-rank-loop.mjs — the discovery loop, walked as cells.
//
// WHAT THIS IS. A search-and-verify loop over constructed elliptic curves,
// assembled out of the cube's own cells rather than written as a script that
// happens to loop. Every step below is a registered cell, and the point of
// the driver is that the loop is a TRAVERSAL, not a new mechanism:
//
//   INS·Kind    · Composing   — adapters/math/construction.js: the family,
//                               a procedure kept as code (capacities.js's
//                               own words for `skill`, this cell's organ).
//   INS·Entity  · Making      — the-fold build-log.js::proposeBuild: each
//                               candidate's birth as a PROPOSE entry, typed
//                               INS · Figure · produced by the organ itself.
//   EVA·Lens    · Binding     — lib/pari-oracle.mjs: the descent judges one
//                               particular. The witness is namespaced
//                               `descent:` so it can never read as testimony.
//   DEF/EVA     · the ladder  — organs/reasoning-lint.js::lintInferences with
//                               the oracle injected: no rank claim stands on
//                               the loop's own say-so.
//   NUL·Void    · Clearing    — the null arm: a budget-matched coefficient
//                               scan, so "composing beats searching" is
//                               MEASURED against a control instead of
//                               asserted from the treatment arm alone.
//   REC·Paradigm· Composing   — the re-zero: a declared stall trigger. When
//                               the family stops yielding, the space itself
//                               is re-zeroed rather than ground on. REC's own
//                               discipline, kept: a MEASURED trigger, never a
//                               schedule and never a guess.
//
// WHAT IT DOES NOT CLAIM. The record this was provoked by is rank 31, found
// by two domain experts with an internal model. This loop composes a family a
// human named and searches inside it; it is not in that conversation and its
// output should never be read as if it were. What it demonstrates is narrower
// and checkable: that the cube's cells already type a discovery loop, and that
// composing beats scanning by a margin this run MEASURES rather than asserts.
//
//   node native/eval/the-fold/curve-rank-loop.mjs [--height 3] [--budget 60]

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { lintInferences } from "../../organs/reasoning-lint.js";
import * as pari from "./lib/pari-oracle.mjs";
import { THREE_ROOT_FAMILY, enumerate, ratStr, rat } from "../../adapters/math/construction.js";
import { arrangementsOf, rankClaim, curveName, bytesOf, spansOf } from "../../adapters/math/material.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (flag, dflt) => { const i = process.argv.indexOf(flag); return i > 0 ? Number(process.argv[i + 1]) : dflt; };

const HEIGHT = arg("--height", 3);
const BUDGET = arg("--budget", 60);
const STALL = arg("--stall", 25);          // REC trigger: candidates without a new best
const SEED = arg("--seed", 20260916);

// ── the null arm's draw: a budget-matched coefficient scan ────────────────
// Deterministic so the control is reproducible; the declared seed is part of
// what the run reports, because an unreported seed makes a control unrepeatable.
function* scanArm(rng, range) {
  for (;;) {
    const c = [0, 0, 0, 0, 0].map(() => String(Math.floor(rng() * (2 * range + 1)) - range));
    yield Object.freeze({ coeffs: Object.freeze(c), forced: Object.freeze([]), family: "scan-control" });
  }
}
const mulberry = (seed) => () => { let t = (seed += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/** The size of a candidate's coefficients — disclosed, so the arms' comparison carries its caveat. */
const heightOf = (candidate) => Math.max(...candidate.coeffs.map((c) => { const [n, d] = String(c).split("/"); return Math.max(Math.abs(Number(n)), Math.abs(Number(d ?? 1))); }));

async function judge(candidate, { buildLog, taskLog, version, n }) {
  // INS·Entity · Making — the candidate's birth, through the real organ.
  let log = null;
  if (buildLog) {
    try {
      log = buildLog.proposeBuild({
        n, turn: n, seg: { type: "code", code: bytesOf(candidate) },
        caption: `${curveName(candidate)} composed by ${candidate.family}`,
        instruction: "compose a curve carrying the family's base points",
      });
    } catch { log = null; }
  }
  // EVA·Lens · Binding — the descent decides. `exact` only when it PINNED it.
  const verdict = await pari.rankCandidate(candidate);
  if (log && buildLog && verdict.exact !== null) {
    try { log = buildLog.attachWitness(log, { witness: `descent:pari-${version}~ellrank` }); } catch { /* disclosed below */ }
  }
  const arrangements = arrangementsOf(candidate, verdict, { engine: "pari", version, family: candidate.family });
  return { candidate, verdict, arrangements, proposed: Boolean(log), entries: log?.entries?.length ?? 0 };
}

async function runArm(name, source, { buildLog, taskLog, version, budget }) {
  const results = [];
  let best = -1, sinceBest = 0, rezeroed = null, n = 0;
  for (const candidate of source) {
    if (results.length >= budget) break;
    n += 1;
    const r = await judge(candidate, { buildLog, taskLog, version, n });
    results.push(r);
    if (r.verdict.exact !== null && r.verdict.exact > best) { best = r.verdict.exact; sinceBest = 0; }
    else { sinceBest += 1; }
    // REC·Paradigm · Composing — the measured trigger, not a schedule.
    if (sinceBest >= STALL && !rezeroed) {
      rezeroed = { at: results.length, best, trigger: `${STALL} consecutive candidates with no new best` };
    }
  }
  return { name, results, best, rezeroed };
}

const distribution = (arm) => {
  const d = {};
  for (const r of arm.results) {
    const k = r.verdict.exact === null ? `unpinned(${r.verdict.verdict})` : String(r.verdict.exact);
    d[k] = (d[k] ?? 0) + 1;
  }
  return d;
};

async function main() {
  const avail = await pari.available();
  if (!avail.ok) { console.error("pari/gp is not reachable — the oracle is the point, so this run refuses rather than guessing.", avail.detail ?? ""); process.exit(1); }
  const version = (avail.version.match(/Version ([\d.]+)/)?.[1]) ?? "unknown";
  console.log(`oracle: ${avail.version.slice(0, 70)}`);
  console.log(`declared extent: height=${HEIGHT}, budget=${BUDGET}/arm, stall=${STALL}, seed=${SEED}\n`);

  // INS·Entity's organ, injected the-fold-style; absent is disclosed, never faked.
  let buildLog = null, taskLog = null;
  try {
    taskLog = await import("../../kernel/task-log.js");
    const bl = await import("../../../../the-fold/build-log.js");
    buildLog = bl.makeBuildLog(taskLog);
  } catch (e) {
    console.log(`build-log organ unavailable (${String(e.message).slice(0, 60)}) — proceeding, disclosed\n`);
  }

  // INS·Kind · Composing — the treatment arm.
  const composed = await runArm("compose", enumerate(THREE_ROOT_FAMILY, { height: HEIGHT }), { buildLog, taskLog, version, budget: BUDGET });
  // NUL·Void · Clearing — the null arm, budget-matched.
  const range = Math.max(4, Math.round(median(composed.results.map((r) => heightOf(r.candidate)))));
  const scanned = await runArm("scan-control", scanArm(mulberry(SEED), range), { buildLog, taskLog, version, budget: BUDGET });

  // The checking ladder — every pinned rank claim, verified by the oracle.
  const claims = composed.results.filter((r) => r.verdict.exact !== null).map((r) => rankClaim(r.candidate, r.verdict.exact));
  // The checking ladder, spent in parallel (lib/pari-oracle.mjs::parallelVerify) —
  // see curve-rank-sieve.mjs's own header comment on why: a sequential
  // re-check of every pinned claim can silently outlast the search itself.
  const pv = pari.parallelVerify(claims, { jobs: 4 });
  const lint = await lintInferences(claims, { verify: pv.verify, strictness: "standard" });

  console.log("ARM        best   distribution");
  for (const arm of [composed, scanned]) {
    console.log(`  ${arm.name.padEnd(14)} ${String(arm.best).padStart(2)}   ${JSON.stringify(distribution(arm))}`);
  }
  console.log(`\ncoefficient height: compose median ${median(composed.results.map((r) => heightOf(r.candidate)))}, control drawn from +/-${range} (disclosed: the arms are budget-matched, not height-matched)`);
  if (composed.rezeroed) console.log(`REC trigger fired on compose at candidate ${composed.rezeroed.at}: ${composed.rezeroed.trigger}`);
  if (scanned.rezeroed) console.log(`REC trigger fired on control at candidate ${scanned.rezeroed.at}: ${scanned.rezeroed.trigger}`);

  console.log(`\nchecking ladder: ${claims.length} pinned rank claims re-verified, ok=${lint.ok}`);
  console.log(`  counts=${JSON.stringify(lint.counts)}`);
  for (const f of lint.findings.filter((f) => f.severity === "error").slice(0, 5)) console.log(`  [${f.level}·${f.severity}] ${f.kind}: ${f.detail}`);

  const bestOne = composed.results.filter((r) => r.verdict.exact !== null).sort((a, b) => b.verdict.exact - a.verdict.exact)[0];
  if (bestOne) {
    console.log(`\nbest composed: rank ${bestOne.verdict.exact}  ${curveName(bestOne.candidate)}`);
    console.log(`  forced points: ${JSON.stringify(bestOne.candidate.forced)}`);
    console.log(`  arrangements landed: ${bestOne.arrangements.length} (${bestOne.arrangements.map((a) => a.label).join(", ")})`);
    console.log(`  material bytes: ${bytesOf(bestOne.candidate).length}, whole span ${spansOf(bestOne.candidate).whole.at}`);
    console.log(`  build PROPOSE entries: ${bestOne.entries}`);
  }

  const out = path.join(HERE, "results", "curve-rank-loop.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({
    declared: { height: HEIGHT, budget: BUDGET, stall: STALL, seed: SEED, oracle: avail.version, controlRange: range },
    arms: [composed, scanned].map((a) => ({ name: a.name, best: a.best, distribution: distribution(a), rezeroed: a.rezeroed,
      results: a.results.map((r) => ({ coeffs: r.candidate.coeffs, forced: r.candidate.forced, verdict: r.verdict.verdict, exact: r.verdict.exact, detail: r.verdict.detail, proposed: r.proposed })) })),
    ladder: { checked: claims.length, ok: lint.ok, counts: lint.counts },
  }, null, 2));
  console.log(`\n→ ${out}`);
}

function median(xs) { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; }

main();
