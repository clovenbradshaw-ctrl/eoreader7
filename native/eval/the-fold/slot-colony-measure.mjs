#!/usr/bin/env node
// slot-colony-measure.mjs — the real colony (organs/slot-colony.js), living in the 27 houses (organs/code-habitat.js), sent at the
// slots of the real tasks, with the real species.
//
// REGISTERED 2026-10-01, BEFORE THE FIRST RUN. Everything between here and "THE DRIVER" is the prediction; the run may not edit it.
//
// WHAT IS BEING TESTED. eoreader7 PR #148's fielded swarm fills each slot of a unit's answer with the cheapest species that works
// (copy, compose, branch, decide, null, optional, coalesce, joinPresent, template, map, argmax, topk), in an order a person wrote
// ("the order the stigmergy would learn"). This driver puts the SAME species — imported, never copied — into the colony, each
// declared in the house of the act it performs, and asks four questions of the order and one of the gate:
//
//   H1 FAITHFUL.   The colony, run in the species' own declared order, fills exactly the slots cheapFill fills, by the same
//                  species, on sets A, B, C and D. (Anchors: A 23/23, B 21/23, C 14/20, D 13/14 by #148's own census.)
//                  Falsified by any difference. A colony that is not faithful at its baseline cannot be compared at any other.
//   H2 DERIVED.    The order DERIVED from the species' houses (canonical chain) fills the same slot set as the declared order
//                  and wastes no more work (a candidate the held-out gate refuses). Falsified if it fills fewer slots, or wastes
//                  more work pooled over the held sets B, C, D.
//   H3 LEARNED.    A colony taught on set A (trails from a derived-order run, nothing else) and judged on B, C, D (taught-on-A,
//                  never on the set it is judged on: `online:false`) wastes less work than the declared order, and a ledger with the
//                  head→route association scrambled does not (mean over 20 seeds). Falsified if learned does not beat declared,
//                  or if the scrambled ledger does as well as the learned one.
//   H4 RESOLUTION. The work metric can see order: the REVERSED order wastes more work than the declared order, or changes who
//                  fills a slot, on at least one set. If it does not, H2 and H3 are unlicensed — a statistic that does not move
//                  when its axis moves has resolved nothing (II.23).
//   H5 NULL.       On slots whose shown targets were redealt across the examples (judged by the TRUE held-out runs), the colony
//                  fills nothing, in every order. Any fill makes the gate `gate_leaky`; no real fill is then reported as established.
//
//   H6 HOUSES.     The 27 houses DO something: the order derived from the species' houses wastes less work than the order from
//                  a random house assignment. Tested two ways on the full-information table (every species tried on every slot with
//                  the final environment, so any order can be scored without re-running): (a) all 720 permutations of WHICH of the six
//                  occupied houses holds which species-group, (b) 5,000 assignments of each species to a uniformly random house of the 27.
//                  HOLDS only if the real assignment is strictly better than at least 95% of the random ones (the repo's standing alpha,
//                  network-standing.js, reused — no new number) AND the random ones differ among themselves. If they do not differ the
//                  metric cannot resolve houses at all and H6 is UNRESOLVED, which is a result, not a pass.
//   H7 ORDER.      Order matters at all: the declared, derived and learned orders are scored against 100,000 uniformly random orders of
//                  the twelve species, same table, same rule (strictly better than 95% AND the random ones differ). Wasted work and
//                  measured ms are both reported; ms is a single measurement and noisy.
//   H8 REPLICATION. A fill is not an artefact of WHICH three examples were shown: for every task with at least six runs, the species are
//                  refitted on two other triples (the last three; a spread triple) and the rest of the runs held out. HOLDS only if every
//                  baseline fill is refilled under both. Otherwise the fraction and the slots are reported.
//   H9 UNDERDETERMINATION. Where two or more species clear the gate for one slot, the data cannot choose between them unless they agree
//                  off the data. Their candidates are run on 60 CROSSOVER inputs (parameters, and top-level keys of object parameters,
//                  recombined from different runs — no oracle needed). HOLDS only if every clearing candidate agrees on every crossover
//                  input. A disagreement is "the data does not pin this slot", never "this candidate is wrong": crossover can leave a
//                  task's intended domain.
//   H10 WEAK GATE.  Descriptive, no verdict: how many held-out runs stood behind each fill, and the share of fills that rest on ONE.
//   H5b POWER.     The null arm can see a cheat: with a species added that reads the TRUE held-out answers (an oracle leak), the null arm
//                  must report false fills. If it does not, H5 is blind and its pass means nothing (II.23).
//
// THE METRIC. `wasted` = attempts where a species returned a candidate and the held-out gate refused it (or could not test it).
// An attempt that returned no candidate is a type mismatch and costs ~nothing; `ms` is reported beside it, measured, never assumed.
//
// WHAT THIS CANNOT SHOW (declared in advance): the species were FITTED on set A, edited while fixing set B, left alone for set C
// during the first six species, and written for set D's shapes after that — each set carries that status in its row and A is a
// sanity row only. One run per arm; the gate is the species' own held-out runs, which the person who wrote the tasks also wrote:
// agreement with them is coherence, not intent. No model is called anywhere in this driver.
//
// REQUIRES a checkout of eoreader7 PR #148 (the species live there, not on main): ER7_SPECIES_DIR=<checkout>/native/the-fold.
// Without it the driver REFUSES, typed, and exits 2 — it never substitutes stand-in species (P95: refuse what the checkout lacks).
//
//   ER7_SPECIES_DIR=/path/to/er7/native/the-fold node native/eval/the-fold/slot-colony-measure.mjs [--json out.json]
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { colonize, kindOfSlot, scrambleTrails, nullArm, redealt, fillsOf, derivedOrder, declaredOrder } from "../../organs/slot-colony.js";
import { housesFor, occupancy, unitOf, leads, chainRank } from "../../organs/code-habitat.js";
import { routeOrderFor } from "../../kernel/stigmergy.js";
import { algebraAddresses } from "../../kernel/cube.js";

const DIR = process.env.ER7_SPECIES_DIR;
if (!DIR || !fs.existsSync(path.join(DIR, "fielded-swarm.mjs"))) {
  console.error(JSON.stringify({ refused: "fixture_absent", detail: "ER7_SPECIES_DIR must name the-fold/ of an eoreader7 #148 checkout (fielded-swarm.mjs, species.mjs, synth-fields.mjs, prefill.mjs, diverse-*.mjs). Nothing was run, and no stand-in species were substituted." }));
  process.exit(2);
}
const load = (f) => import(pathToFileURL(path.join(DIR, f)).href);
const [{ DIVERSE }, { HELDOUT }, { FRESH }, { FRESH_C }, { FRESH_D }, swarm, prefill, synth, S] = await Promise.all(["diverse-tasks.mjs", "diverse-heldout.mjs", "diverse-fresh.mjs", "diverse-fresh-c.mjs", "diverse-fresh-d.mjs", "fielded-swarm.mjs", "prefill.mjs", "synth-fields.mjs", "species.mjs"].map(load));
const sha = (() => { try { return execFileSync("git", ["-C", DIR, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(); } catch { return "unknown"; } })();

// ---------------------------------------------------------------- THE SPECIES, adapted one-for-one from fielded-swarm.mjs cheapFill/fillSlot
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const same = (a, b) => (isNum(a) && isNum(b) ? Math.abs(a - b) < 1e-9 : JSON.stringify(a) === JSON.stringify(b));
const getPath = (v, p) => p.split(/\.|\[(\d+)\]/).filter((x) => x !== undefined && x !== "").reduce((a, k) => a?.[k], v);
const copyJs = (c, from) => from.replace(/^\[(\d+)\]/, (_, i) => c.params[Number(i)]).replace(/^(?=[A-Za-z_])/, "");
const baseTerms = (c) => synth.leaves(c).filter((t) => !t.arr && !t.constant).map((t) => ({ name: t.js.split(".").pop().replace(/[^\w]/g, " "), js: t.js, f: t.f }));
/** the numeric terms the sibling slots already filled have put into the environment (cheapFill adds compose and branch fills) */
function siblingTerms(slot, env) {
  const out = [];
  for (const k of Object.keys(slot.contract.runs[0].want())) {
    const got = env.filled.get(`${slot.contract.name}.${k}`);
    if (!got) continue;
    if (got.species === "compose") out.push({ name: k, js: `(${got.candidate.js})`, f: got.candidate.f });
    else if (got.species === "branch") out.push({ name: k, js: got.candidate.js, f: got.candidate.f });
  }
  return out;
}
const termsFor = (slot, env) => [...baseTerms(slot.contract), ...siblingTerms(slot, env)];
const accept = (slot) => (f) => slot.holds({ f }) === true;

const SPECIES = [
  { name: "copy", cell: "CON·Figure", fill: (slot) => { const f = prefill.readPrefill(slot.contract, 3, { strict: false }).fields.find((x) => x.key === slot.key && x.kind === "copy"); return f ? { js: copyJs(slot.contract, f.from), f: (a) => getPath(a, f.from) } : null; } },
  { name: "compose", cell: "SYN·Figure", fill: (slot, env) => { if (!slot.wants.every(isNum)) return null; const r = synth.solveField(slot.contract, slot.key, slot.wants, siblingTerms(slot, env).map((t) => ({ expr: t.name, js: t.js, f: t.f }))); return r.kind === "solved" ? { js: r.term.js, f: r.term.f } : null; } },
  { name: "branch", cell: "DEF·Figure", fill: (slot) => S.branch(slot.contract, slot.key) },
  { name: "decide", cell: "DEF·Figure", fill: (slot, env) => S.decide(slot.contract, slot.wants, termsFor(slot, env)) },
  { name: "null", cell: "NUL·Figure", fill: (slot) => S.nullConstant(slot.contract, slot.wants) },
  { name: "optional", cell: "NUL·Figure", fill: (slot) => S.optional(slot.contract, slot.wants, accept(slot)) },
  { name: "coalesce", cell: "NUL·Figure", fill: (slot) => S.coalesce(slot.contract, slot.wants, accept(slot)) },
  { name: "joinPresent", cell: "SYN·Figure", fill: (slot) => S.joinPresent(slot.contract, slot.wants, accept(slot)) },
  { name: "template", cell: "SYN·Figure", fill: (slot) => S.template(slot.contract, slot.wants) },
  { name: "map", cell: "SYN·Pattern", fill: (slot) => S.mapList(slot.contract, slot.wants) },
  { name: "argmax", cell: "EVA·Figure", fill: (slot) => S.argmax(slot.contract, slot.wants) },
  { name: "topk", cell: "EVA·Figure", fill: (slot) => S.topk(slot.contract, slot.wants) },
];

// ---------------------------------------------------------------- SLOTS
const rotate = (a, r) => a.map((_, i) => a[(i + r) % a.length]);
function slotOf(c, key, wants = c.runs.slice(0, 3).map((r) => r.want()[key])) {
  const held = c.runs.slice(3);
  const slot = {
    id: `${c.name}.${key}`, contract: c, key, wants, kind: kindOfSlot(wants),
    holds: (cand) => (held.length ? held.every((r) => { try { return same(cand.f(r.args()), r.want()[key]); } catch { return false; } }) : null),
  };
  slot.redeal = (rot) => {
    const w = rotate(c.runs.slice(0, 3).map((r) => r.want()[key]), rot);
    if (new Set(w.map((x) => JSON.stringify(x))).size < 2) return null;
    const c2 = { ...c, runs: c.runs.map((r, i) => (i < 3 ? { ...r, want: () => ({ ...r.want(), [key]: w[i] }) } : r)) };
    return { ...slotOf(c2, key, w), id: `${slot.id}~${rot}` };
  };
  return slot;
}
const flat = (c) => { const w = c.runs[0].want(); return w && typeof w === "object" && !Array.isArray(w); };
const SETS = { A: [...DIVERSE, ...HELDOUT], B: FRESH, C: FRESH_C, D: FRESH_D };
const STATUS = { A: "fitted — sanity only", B: "edited while fixing", C: "untouched for the first six species", D: "written after the app species" };
const contractsOf = (set) => SETS[set].map((d) => d.contract).filter(flat);
const slotsOfContract = (c) => Object.keys(c.runs[0].want()).map((k) => slotOf(c, k));

// ---------------------------------------------------------------- THE DRIVER
const NOW = Date.parse("2026-10-01T12:00:00Z");
const opts = (extra = {}) => ({ species: SPECIES, now: NOW, ...extra });

async function runSet(set, mode, extra = {}) {
  const agg = { set, mode, slots: 0, filled: 0, attempts: 0, work: 0, wasted: 0, ms: 0, by: {}, houses: {}, unfilled: [], env: {} };
  let trails = extra.trails ?? {};
  for (const c of contractsOf(set)) {
    const slots = slotsOfContract(c);
    const r = await colonize({ slots, ...opts({ mode, ...extra, trails: extra.chain ? trails : (extra.trails ?? {}) }) });
    if (extra.chain) trails = r.trails;
    agg.env[c.name] = r.filled;
    agg.slots += slots.length; agg.filled += r.filled.size; agg.attempts += r.attempts; agg.work += r.work; agg.wasted += r.wasted; agg.ms += r.ms;
    for (const [id, f] of r.filled) { agg.by[id] = f.species; agg.houses[f.cell] = (agg.houses[f.cell] ?? 0) + 1; }
    agg.unfilled.push(...r.unfilled.map((id) => ({ id, kind: slots.find((s) => s.id === id).kind })));
  }
  agg.trails = trails;
  return agg;
}
const lcg = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const pool = (rows) => rows.reduce((a, r) => ({ slots: a.slots + r.slots, filled: a.filled + r.filled, attempts: a.attempts + r.attempts, work: a.work + r.work, wasted: a.wasted + r.wasted, ms: a.ms + r.ms }), { slots: 0, filled: 0, attempts: 0, work: 0, wasted: 0, ms: 0 });
const fmt = (r) => `${r.filled}/${r.slots} filled · ${r.attempts} attempts · ${r.work} real checks · ${r.wasted} wasted · ${Math.round(r.ms)} ms`;
const out = { sha, date: "2026-10-01", sets: {} };
const lines = [];
const say = (s = "") => { lines.push(s); console.log(s); };

say(`# slot-colony-measure — species from eoreader7 #148 @ ${sha}, colony from this branch\n`);

// H1 — the colony in the declared order against cheapFill itself
say("## H1 faithful: colony(declared) vs cheapFill, slot by slot");
const declared = {};
let h1Diff = 0;
for (const set of Object.keys(SETS)) {
  declared[set] = await runSet(set, "declared");
  let ref = 0, refSlots = 0; const diffs = [];
  for (const c of contractsOf(set)) {
    const cheap = swarm.cheapFill(c);
    for (const k of Object.keys(c.runs[0].want())) { refSlots++; if (cheap[k]) ref++; const mine = declared[set].by[`${c.name}.${k}`]; if ((cheap[k]?.species ?? null) !== (mine ?? null)) diffs.push(`${c.name}.${k}: cheapFill=${cheap[k]?.species ?? "—"} colony=${mine ?? "—"}`); }
  }
  h1Diff += diffs.length;
  say(`- set ${set} (${STATUS[set]}): cheapFill ${ref}/${refSlots}, colony ${declared[set].filled}/${declared[set].slots}; ${diffs.length ? `${diffs.length} differ: ${diffs.join("; ")}` : "identical slot by slot, same species"}`);
}
say(`**H1: ${h1Diff === 0 ? "HOLDS" : `FALSIFIED — ${h1Diff} slot(s) differ`}**\n`);

// H2, H4 — the other fixed orders
say("## arms by order (one run each; trails taught on A for `learned`)");
const taught = (await (async () => { let trails = {}; for (const c of contractsOf("A")) { const r = await colonize({ slots: slotsOfContract(c), ...opts({ mode: "derived", trails }) }); trails = r.trails; } return trails; })());
const arms = { declared, derived: {}, reversed: {}, learned: {} };
for (const set of Object.keys(SETS)) {
  arms.derived[set] = await runSet(set, "derived");
  arms.reversed[set] = await runSet(set, "reversed");
  arms.learned[set] = await runSet(set, "learned", { trails: taught, explore: 0 });
}
const scrambledRuns = [];
for (let seed = 1; seed <= 20; seed++) {
  const scr = scrambleTrails(taught, lcg(seed)), per = {};
  for (const set of ["B", "C", "D"]) per[set] = await runSet(set, "learned", { trails: scr, explore: 0 });
  scrambledRuns.push(per);
}
for (const set of Object.keys(SETS)) {
  say(`### set ${set} — ${STATUS[set]}`);
  for (const m of ["declared", "derived", "reversed", "learned"]) say(`- ${m.padEnd(9)} ${fmt(arms[m][set])}`);
}
const HELD = ["B", "C", "D"];
const P = (m) => pool(HELD.map((s) => arms[m][s]));
const scrWasted = scrambledRuns.map((per) => pool(HELD.map((s) => per[s])).wasted);
const scrMean = scrWasted.reduce((a, b) => a + b, 0) / scrWasted.length;
say("\n### pooled over the held sets B + C + D");
for (const m of ["declared", "derived", "reversed", "learned"]) say(`- ${m.padEnd(9)} ${fmt(P(m))}`);
say(`- scrambled (20 seeds) wasted: mean ${scrMean.toFixed(2)}, min ${Math.min(...scrWasted)}, max ${Math.max(...scrWasted)}`);

const sameFills = (a, b) => Object.keys(SETS).every((s) => a[s].filled === b[s].filled && Object.keys(a[s].by).every((id) => id in b[s].by));
const identityChanged = (a, b) => Object.keys(SETS).flatMap((s) => Object.keys(a[s].by).filter((id) => b[s].by[id] && b[s].by[id] !== a[s].by[id]).map((id) => `${id}: ${a[s].by[id]}→${b[s].by[id]}`));
const h2 = sameFills(arms.declared, arms.derived) && P("derived").wasted <= P("declared").wasted;
const h3 = P("learned").wasted < P("declared").wasted && scrMean >= P("learned").wasted;
const rev = Object.keys(SETS).some((s) => arms.reversed[s].wasted > arms.declared[s].wasted) || identityChanged(arms.declared, arms.reversed).length > 0;
say(`\n**H2 derived order: ${h2 ? "HOLDS" : "FALSIFIED"}** — same fills as declared: ${sameFills(arms.declared, arms.derived)}; wasted ${P("derived").wasted} vs declared ${P("declared").wasted}; species that changed hands: ${identityChanged(arms.declared, arms.derived).join(", ") || "none"}`);
say(`**H3 learned order: ${h3 ? "HOLDS" : "FALSIFIED"}** — learned wasted ${P("learned").wasted} vs declared ${P("declared").wasted}; scrambled mean ${scrMean.toFixed(2)}; same fills as declared: ${sameFills(arms.declared, arms.learned)}`);
say(`**H4 the metric can see order: ${rev ? "HOLDS" : "FALSIFIED — H2 and H3 are unlicensed"}** — reversed wasted ${P("reversed").wasted} vs declared ${P("declared").wasted}; species that changed hands under reversal: ${identityChanged(arms.declared, arms.reversed).join(", ") || "none"}\n`);

// H5 — the null arm in every fixed order
say("## H5 the null arm — shown targets redealt across the examples, judged by the true held-out runs");
let leaky = 0;
for (const mode of ["declared", "derived", "reversed"]) {
  let tried = 0, falseFills = 0; const caught = [];
  for (const set of Object.keys(SETS)) for (const c of contractsOf(set)) {
    const rd = redealt(slotsOfContract(c));
    if (!rd.length) continue;
    const r = await nullArm({ slots: rd, species: SPECIES, mode });
    tried += r.tried; falseFills += r.falseFills; caught.push(...r.filled);
  }
  leaky += falseFills;
  say(`- ${mode.padEnd(9)} ${tried} redealt slots tried, ${falseFills} false fills${caught.length ? `: ${caught.join(", ")}` : ""}`);
}
say(`**H5: ${leaky === 0 ? "HOLDS — the gate let nothing through" : `FALSIFIED — gate_leaky, ${leaky} false fill(s)`}**\n`);


// ---------------------------------------------------------------- H5b — can the null arm see a cheat?
say("## H5b power of the null arm — a species that reads the TRUE held-out answers is added (an oracle leak)");
const oracleLeak = { name: "oracleLeak", cell: "INS·Figure", fill: (slot) => { const truth = new Map(slot.contract.runs.slice(3).map((r) => [JSON.stringify(r.args()), r.want()[slot.key]])); return { js: "(leak)", f: (a) => truth.get(JSON.stringify(a)) }; } };
let leakTried = 0, leakCaught = 0;
for (const set of Object.keys(SETS)) for (const c of contractsOf(set)) {
  const rd = redealt(slotsOfContract(c)); if (!rd.length) continue;
  const r = await nullArm({ slots: rd, species: [...SPECIES, oracleLeak] }); leakTried += r.tried; leakCaught += r.falseFills;
}
const h5b = leakCaught > 0;
say(`- ${leakTried} redealt slots, ${leakCaught} filled → **H5b: ${h5b ? "HOLDS — the null arm sees a cheat" : "FALSIFIED — the null arm is blind, H5 means nothing"}**\n`);

// ---------------------------------------------------------------- the full-information table: every species on every slot, the final environment
const clone = (v) => JSON.parse(JSON.stringify(v));
const NAMES = SPECIES.map((x) => x.name);
const TABLE = [];
for (const set of Object.keys(SETS)) for (const c of contractsOf(set)) {
  const env0 = declared[set].env[c.name];
  for (const slot of slotsOfContract(c)) {
    const env = new Map(env0); env.delete(slot.id);
    const row = {};
    for (const sp of SPECIES) {
      const t0 = performance.now(); let cand = null;
      try { cand = await sp.fill(slot, { filled: env }); } catch { cand = null; }
      let outcome = "no-candidate"; if (cand) { const ok = await slot.holds(cand); outcome = ok === true ? "pass" : ok === null ? "unverifiable" : "refused"; }
      row[sp.name] = { outcome, ms: performance.now() - t0, cand: outcome === "pass" ? cand : null };
    }
    TABLE.push({ set, slot, row });
  }
}
const HELDT = TABLE.filter((e) => HELD.includes(e.set));
const sim = (rows, orderFor) => { let wasted = 0, ms = 0, unfilled = 0; for (const e of rows) { let hit = false; for (const n of orderFor(e.slot)) { const r = e.row[n]; ms += r.ms; if (r.outcome === "pass") { hit = true; break; } if (r.outcome === "refused" || r.outcome === "unverifiable") wasted++; } if (!hit) unfilled++; } return { wasted, ms, unfilled }; };
const ALPHA = 0.05; // the repo's standing alpha, network-standing.js (reused, not new): a claim must beat 1 - ALPHA of the random draws
const verdict = (arr, v) => { const better = arr.filter((x) => x > v).length, equal = arr.filter((x) => x === v).length, worse = arr.filter((x) => x < v).length, n = arr.length, spread = Math.max(...arr) > Math.min(...arr); return { better, equal, worse, n, spread, holds: spread && better / n >= 1 - ALPHA, unresolved: !spread }; };
const word = (v) => (v.unresolved ? "UNRESOLVED — every random draw wastes the same, so the metric cannot see this" : v.holds ? "HOLDS" : "FALSIFIED");
say(`## the full-information table — ${TABLE.length} slots × ${NAMES.length} species (final environment); held sets B+C+D = ${HELDT.length} slots`);
const pass = (e) => NAMES.filter((n) => e.row[n].outcome === "pass");
const multi = TABLE.filter((e) => pass(e).length >= 2), none = TABLE.filter((e) => pass(e).length === 0);
say(`- slots with exactly one species clearing the gate: ${TABLE.filter((e) => pass(e).length === 1).length}; two or more: ${multi.length}; none: ${none.length}`);
say(`- candidates the gate REFUSED (a species offered something and the held-out runs rejected it), all species × all slots: ${TABLE.reduce((a, e) => a + NAMES.filter((n) => e.row[n].outcome === "refused").length, 0)}\n`);

// ---------------------------------------------------------------- H7 — order against random orders
const rngO = lcg(2026);
const perm = () => { const a = [...NAMES]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rngO() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const randW = [], randM = [];
for (let i = 0; i < 100000; i++) { const o = perm(); const r = sim(HELDT, () => o); randW.push(r.wasted); randM.push(r.ms); }
const orderOf = { declared: () => declaredOrder(SPECIES), derived: () => derivedOrder(SPECIES), reversed: () => [...derivedOrder(SPECIES)].reverse(), learned: (slot) => routeOrderFor(taught, `slot|${slot.kind}`, { now: NOW, routes: derivedOrder(SPECIES), explore: 0 }) };
say("## H7 order against 100,000 random orders of the twelve species (table simulation, held sets B+C+D)");
say(`- random orders: wasted min ${Math.min(...randW)}, median ${[...randW].sort((a, b) => a - b)[randW.length >> 1]}, max ${Math.max(...randW)}; ms min ${Math.min(...randM).toFixed(0)}, median ${[...randM].sort((a, b) => a - b)[randM.length >> 1].toFixed(0)}, max ${Math.max(...randM).toFixed(0)}`);
const h7 = {};
for (const m of ["declared", "derived", "learned", "reversed"]) {
  const r = sim(HELDT, orderOf[m]), v = verdict(randW, r.wasted), vm = verdict(randM, r.ms);
  h7[m] = { wasted: r.wasted, ms: Math.round(r.ms), strictlyBetterThanRandom: v.better, equalToRandom: v.equal, worseThanRandom: v.worse, spread: v.spread };
  say(`- ${m.padEnd(9)} wasted ${r.wasted}: better than ${v.better} of ${v.n} random orders, equal to ${v.equal}, worse than ${v.worse} → ${word(v)}; ms ${r.ms.toFixed(0)} better than ${vm.better}/${vm.n} (single measurement)`);
}
say("");

// ---------------------------------------------------------------- H6 — do the HOUSES carry the order?
const realCells = Object.fromEntries(SPECIES.map((x) => [x.name, x.cell]));
const orderFromCells = (cells) => SPECIES.map((x, i) => ({ n: x.name, i, r: chainRank(cells[x.name]) })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.n);
const realW = sim(HELDT, () => orderFromCells(realCells)).wasted;
const distinct = [...new Set(SPECIES.map((x) => x.cell))];
const perms = (arr) => (arr.length <= 1 ? [arr] : arr.flatMap((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map((r) => [x, ...r])));
const groupW = perms(distinct).map((pi) => { const map = Object.fromEntries(distinct.map((c, i) => [c, pi[i]])); return sim(HELDT, () => orderFromCells(Object.fromEntries(SPECIES.map((x) => [x.name, map[x.cell]])))).wasted; });
const all27 = algebraAddresses().map((c) => `${c.op}·${c.grain}`);
const rngH = lcg(99), rand27 = [];
for (let i = 0; i < 5000; i++) rand27.push(sim(HELDT, () => orderFromCells(Object.fromEntries(SPECIES.map((x) => [x.name, all27[Math.floor(rngH() * 27)]])))).wasted);
const va = verdict(groupW, realW), vb = verdict(rand27, realW);
say("## H6 do the houses carry the order? (real house assignment vs random ones; table simulation, held sets B+C+D)");
say(`- real assignment wasted ${realW} (${distinct.length} occupied houses: ${distinct.join(", ")})`);
say(`- (a) all ${groupW.length} permutations of which occupied house holds which species-group: wasted min ${Math.min(...groupW)} / max ${Math.max(...groupW)}; real is better than ${va.better}, equal to ${va.equal}, worse than ${va.worse} → ${word(va)}`);
say(`- (b) ${rand27.length} random assignments of each species to one of the 27 houses: wasted min ${Math.min(...rand27)} / max ${Math.max(...rand27)}; real is better than ${vb.better}, equal to ${vb.equal}, worse than ${vb.worse} → ${word(vb)}`);
const h6 = va.holds && vb.holds, h6unresolved = va.unresolved || vb.unresolved;
say(`**H6: ${h6 ? "HOLDS" : h6unresolved ? "UNRESOLVED — the metric cannot tell house assignments apart" : "FALSIFIED"}**\n`);

// ---------------------------------------------------------------- H8 — replication across shown triples
say("## H8 replication — species refitted on other triples of shown examples (tasks with at least six runs)");
const permute = (c, idxs) => ({ ...c, runs: [...idxs.map((i) => c.runs[i]), ...c.runs.filter((_, i) => !idxs.includes(i))] });
const keyOf = (c, id) => id.slice(c.name.length + 1);
let baseTotal = 0, tasksUsed = 0, tasksSkipped = 0; const lost = { last: [], spread: [] }, gained = { last: 0, spread: 0 }, kept = { last: 0, spread: 0 };
for (const set of Object.keys(SETS)) for (const c of contractsOf(set)) {
  if (c.runs.length < 6) { tasksSkipped++; continue; }
  tasksUsed++;
  const n = c.runs.length, base = new Set([...declared[set].env[c.name].keys()].map((id) => keyOf(c, id)));
  baseTotal += base.size;
  for (const [name, idxs] of [["last", [n - 3, n - 2, n - 1]], ["spread", [0, n >> 1, n - 1]]]) {
    const c2 = permute(c, idxs), r = await colonize({ slots: slotsOfContract(c2), ...opts({ mode: "declared" }) });
    const alt = new Set([...r.filled.keys()].map((id) => keyOf(c, id)));
    for (const k of base) { if (alt.has(k)) kept[name]++; else lost[name].push(`${set}/${c.name}.${k}`); }
    for (const k of alt) if (!base.has(k)) gained[name]++;
  }
}
const h8 = lost.last.length === 0 && lost.spread.length === 0;
say(`- ${tasksUsed} tasks used (${tasksSkipped} skipped: fewer than six runs, so no triple left three held-out); ${baseTotal} baseline fills`);
for (const name of ["last", "spread"]) say(`- triple "${name}": ${kept[name]}/${baseTotal} baseline fills refilled, ${lost[name].length} lost${lost[name].length ? ` (${lost[name].join(", ")})` : ""}, ${gained[name]} slots filled that the baseline did not`);
say(`**H8: ${h8 ? "HOLDS" : "FALSIFIED — a fill depended on which examples were shown"}**\n`);

// ---------------------------------------------------------------- H9 — underdetermination, by crossover inputs
say("## H9 underdetermination — slots where two or more species clear the gate, run on 60 crossover inputs");
const crossover = (c, rng, count = 60) => {
  const argv = c.runs.map((r) => r.args()), pick = () => argv[Math.floor(rng() * argv.length)];
  return [...argv, ...Array.from({ length: count }, () => c.params.map((_, p) => {
    const donor = pick()[p];
    if (donor && typeof donor === "object" && !Array.isArray(donor)) { const mixed = {}; for (const k of Object.keys(donor)) { const o = pick()[p]; mixed[k] = clone(o && typeof o === "object" && k in o ? o[k] : donor[k]); } return mixed; }
    return clone(donor);
  }))];
};
const evalC = (cand, args) => { try { const v = cand.f(clone(args)); return v === undefined ? "__undefined__" : v; } catch { return "__throws__"; } };
const rngX = lcg(11); let multiDisagree = 0; const shown9 = [];
for (const e of multi) {
  const names = pass(e), inputs = crossover(e.slot.contract, rngX);
  let first = null;
  for (const args of inputs) { const outs = names.map((n) => evalC(e.row[n].cand, args)); if (!outs.every((o) => same(o, outs[0]))) { first = { args, outs }; break; } }
  if (first) { multiDisagree++; if (shown9.length < 8) shown9.push(`${e.set}/${e.slot.id} [${names.join(" vs ")}] on ${JSON.stringify(first.args).slice(0, 70)} → ${first.outs.map((o) => JSON.stringify(o)?.slice(0, 28)).join(" | ")}`); }
}
const h9 = multiDisagree === 0;
say(`- ${multi.length} slots cleared by two or more species; ${multiDisagree} of them disagree off the data${shown9.length ? ":" : ""}`);
for (const l of shown9) say(`  - ${l}`);
say(`**H9: ${h9 ? `HOLDS on the ${multi.length} slot(s) it could test` : "FALSIFIED — the data does not pin these slots; the order that fills them is arbitrary"}** (slots with one clearing species cannot be tested this way: ${TABLE.filter((e) => pass(e).length === 1).length})\n`);

// ---------------------------------------------------------------- H10 — how thin is the gate
say("## H10 how many held-out runs stand behind each fill (descriptive, no verdict)");
const heldHist = {}; let fills10 = 0, thin = 0; const thinKinds = {};
for (const set of Object.keys(SETS)) for (const c of contractsOf(set)) for (const id of declared[set].env[c.name].keys()) {
  const held = c.runs.length - 3; heldHist[held] = (heldHist[held] ?? 0) + 1; fills10++;
  if (held <= 1) { thin++; const k = slotsOfContract(c).find((x) => x.id === id).kind; thinKinds[k] = (thinKinds[k] ?? 0) + 1; }
}
say(`- held-out runs per fill: ${Object.entries(heldHist).map(([k, v]) => `${k} → ${v}`).join(", ")}; ${thin} of ${fills10} fills rest on at most ONE held-out run${thin ? ` (kinds: ${Object.entries(thinKinds).map(([k, v]) => `${k} ×${v}`).join(", ")})` : ""}\n`);

// the habitat — where the fills landed, and which relevant houses nothing lives in
say("## the 27 houses — fills by house (declared order, pooled over A–D), residents, and leads");
const houseFills = {};
for (const set of Object.keys(SETS)) for (const [cell, n] of Object.entries(declared[set].houses)) houseFills[cell] = (houseFills[cell] ?? 0) + n;
const exemplar = contractsOf("A")[0];
const fills = Object.entries(houseFills).flatMap(([cell, n]) => Array.from({ length: n }, (_, i) => ({ slot: `#${i}`, species: "·", cell })));
const houses = occupancy(housesFor(unitOf(exemplar), SPECIES.map((s) => ({ name: s.name, cell: s.cell }))), fills);
for (const h of houses) say(`- ${h.cell.padEnd(11)} ${h.terrain.padEnd(10)} ${h.status.padEnd(9)} fills ${String(houseFills[h.cell] ?? 0).padStart(3)}  residents: ${h.residents.join(", ") || "—"}`);
say(`\nleads (relevant houses nothing lives in): ${leads(houses).map((h) => h.cell).join(", ")}`);
say("\n## what the colony could not fill, by structural kind");
for (const set of ["B", "C", "D"]) { const by = {}; for (const u of declared[set].unfilled) by[u.kind] = [...(by[u.kind] ?? []), u.id]; say(`- set ${set}: ${Object.entries(by).map(([k, v]) => `${k} ×${v.length} (${v.join(", ")})`).join("; ") || "none"}`); }

out.h = { h1: h1Diff === 0, h2, h3, h4: rev, h5: leaky === 0, h5b, h6: h6 ? true : h6unresolved ? "unresolved" : false, h8, h9, h7, thinFills: `${thin}/${fills10}` };
out.arms = Object.fromEntries(Object.entries(arms).map(([m, v]) => [m, Object.fromEntries(Object.entries(v).map(([s, r]) => [s, { slots: r.slots, filled: r.filled, attempts: r.attempts, work: r.work, wasted: r.wasted, ms: Math.round(r.ms) }]))]));
out.scrambledWasted = scrWasted;
const j = process.argv.indexOf("--json");
if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 2));
