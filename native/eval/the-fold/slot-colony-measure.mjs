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
// ---------------------------------------------------------------------------------------------------------------------------------
// AMENDED 2026-10-01, AFTER THE FIRST RUN AND AN INDEPENDENT REVIEW OF IT. The registered text above is unchanged. What the run and the
// review found, and what the driver now does about each — kept here so the amendment is as visible as the registration:
//   (1) NONDETERMINISM. Two identical runs differed in the learned arm: kernel/stigmergy.js breaks equal-strength trail ties by mean
//       latency, every deposit shares one `at`, so wall-clock jitter in the TEACHING run chose the order. Teaching now reads a unit clock
//       (every attempt costs one unit); the wall-clock arm is E0 below. Two runs now agree on every non-timing line.
//   (2) H6(b) HAD A BUG. The random house assignment was drawn inside the lambda `sim` calls once per SLOT, so each slot saw a different
//       assignment; "the real assignment beats 90% of random ones" was false. One draw per trial now (the old draw is printed, labelled).
//   (3) THE REGISTERED BAR FOR H6 AND H7 CANNOT BE PASSED. "Strictly better than 95% of random draws" is unreachable when more than 5% of
//       draws already sit at the metric's floor (37% of random orders waste nothing). Printing FALSIFIED for all of them was a statistic
//       that cannot move reporting that it did not (II.23, against my own registration). Such a verdict is now UNRESOLVED, with the
//       registered rule's own word beside it. No registered H1–H5, H8–H10 verdict changes under the amendments.
//   (4) THE FULL-INFORMATION TABLE LEAKED. Rows were built with every sibling's fill present; a colony holds only earlier keys. Three
//       refusals became no-candidates under the corrected environment (13 → 10). The table now uses the earlier-keys environment, and the
//       simulation is checked against the real colony runs (they agree on `wasted` in all four orders).
//   (5) THE NULL ARM EXERCISED THE GATE ON 26 OF 158 SLOTS. 132 redealt slots drew no candidate from any species, so "0 false fills" said
//       nothing about them. The arm now reports how many slots the gate was evaluated on; the species that choose by the held-out runs get
//       the gate as a counted `env.gate`, not as a raw property of the slot. H5b is true by construction (the leak species reads the
//       answers) and is labelled so; E5 is a second, realistic null (another slot's targets).
//   (6) `wasted` COUPLES TO PASSES (a refused candidate is re-gated each pass). E6 reports the four orders with `skipUnchanged`.
// POST-HOC, NOT REGISTERED (run with --exploratory; no verdict words): E0 wall-clock teaching, E1 every shown triple, E2 absent values,
// E3 leave-one-species-out, E4 who fills a slot under each order, E5 cross-slot null, E6 skipUnchanged, E7 cross-teaching, E8 transfer.
//
// REQUIRES a checkout of eoreader7 PR #148 (the species live there, not on main): ER7_SPECIES_DIR=<checkout>/native/the-fold.
// Without it the driver REFUSES, typed, and exits 2 — it never substitutes stand-in species (P95: refuse what the checkout lacks).
//
//   ER7_SPECIES_DIR=/path/to/er7/native/the-fold node native/eval/the-fold/slot-colony-measure.mjs [--exploratory] [--json out.json]   (~2 min with --exploratory)
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
// the species that choose among their own candidates by the held-out runs (optional, coalesce, joinPresent) are handed the gate as
// `env.gate`, which the colony COUNTS — so a gate used as a search oracle is on the row, and the null arm can tell whether it was ever run
const accept = (env) => (f) => env.gate({ f }) === true;

const SPECIES = [
  { name: "copy", cell: "CON·Figure", fill: (slot) => { const f = prefill.readPrefill(slot.contract, 3, { strict: false }).fields.find((x) => x.key === slot.key && x.kind === "copy"); return f ? { js: copyJs(slot.contract, f.from), f: (a) => getPath(a, f.from) } : null; } },
  { name: "compose", cell: "SYN·Figure", fill: (slot, env) => { if (!slot.wants.every(isNum)) return null; const r = synth.solveField(slot.contract, slot.key, slot.wants, siblingTerms(slot, env).map((t) => ({ expr: t.name, js: t.js, f: t.f }))); return r.kind === "solved" ? { js: r.term.js, f: r.term.f } : null; } },
  { name: "branch", cell: "DEF·Figure", fill: (slot) => S.branch(slot.contract, slot.key) },
  { name: "decide", cell: "DEF·Figure", fill: (slot, env) => S.decide(slot.contract, slot.wants, termsFor(slot, env)) },
  { name: "null", cell: "NUL·Figure", fill: (slot) => S.nullConstant(slot.contract, slot.wants) },
  { name: "optional", cell: "NUL·Figure", fill: (slot, env) => S.optional(slot.contract, slot.wants, accept(env)) },
  { name: "coalesce", cell: "NUL·Figure", fill: (slot, env) => S.coalesce(slot.contract, slot.wants, accept(env)) },
  { name: "joinPresent", cell: "SYN·Figure", fill: (slot, env) => S.joinPresent(slot.contract, slot.wants, accept(env)) },
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
  const agg = { set, mode, slots: 0, filled: 0, attempts: 0, work: 0, wasted: 0, ms: 0, by: {}, houses: {}, unfilled: [], env: {}, byPass: {}, passes: 0 };
  let trails = extra.trails ?? {};
  for (const c of contractsOf(set)) {
    const slots = slotsOfContract(c);
    const r = await colonize({ slots, ...opts({ mode, ...extra, trails: extra.chain ? trails : (extra.trails ?? {}) }) });
    if (extra.chain) trails = r.trails;
    agg.env[c.name] = r.filled;
    agg.slots += slots.length; agg.filled += r.filled.size; agg.attempts += r.attempts; agg.work += r.work; agg.wasted += r.wasted; agg.ms += r.ms;
    agg.passes = Math.max(agg.passes, r.passes);
    for (const [id, f] of r.filled) { agg.by[id] = f.species; agg.houses[f.cell] = (agg.houses[f.cell] ?? 0) + 1; agg.byPass[f.pass] = (agg.byPass[f.pass] ?? 0) + 1; }
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
// THE TEACHING RUN READS A UNIT CLOCK, NOT THE WALL. Found by the determinism check (run 2 of the first measurement differed in
// the learned arm): kernel/stigmergy.js breaks equal-strength ties by MEAN LATENCY, and every deposit here shares one `at`, so
// strengths tie exactly and wall-clock jitter in the teaching run decided the order. Every attempt costs one unit instead, so
// ties fall through to the default (derived) order and the whole driver is reproducible. The wall-clock arm is measured as its
// own labelled exploration (E0) below, never mixed into the registered reading.
const unitClock = () => { let t = 0; return () => ++t; };
const teach = async (clock, sets = ["A"]) => { let trails = {}; for (const c of sets.flatMap(contractsOf)) { const r = await colonize({ slots: slotsOfContract(c), ...opts({ mode: "derived", trails, clock }) }); trails = r.trails; } return trails; };
const taught = await teach(unitClock());
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
say(`- scrambled (20 seeds) wasted: mean ${scrMean.toFixed(2)}, min ${Math.min(...scrWasted)}, max ${Math.max(...scrWasted)}; per seed ${scrWasted.join(" ")}`);
say(`- seeds where the shuffled ledger wasted no more than the learned one: ${scrWasted.filter((w) => w <= P("learned").wasted).length} of ${scrWasted.length}; no more than declared: ${scrWasted.filter((w) => w <= P("declared").wasted).length} of ${scrWasted.length}`);

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
let leaky = 0, requested = 0, produced = 0, identity = 0, dropped = 0, noRedeal = 0, firstMode = true;
const h5rows = {};
for (const mode of ["declared", "derived", "reversed"]) {
  let tried = 0, falseFills = 0, gated = 0, unex = 0; const caught = [];
  for (const set of Object.keys(SETS)) for (const c of contractsOf(set)) {
    const rd = redealt(slotsOfContract(c));
    if (firstMode) { requested += rd.report.requested; produced += rd.report.produced; identity += rd.report.identity; dropped += rd.report.dropped; noRedeal += rd.noRedeal; }
    if (!rd.length) continue;
    const r = await nullArm({ slots: rd, species: SPECIES, mode });
    tried += r.tried; falseFills += r.falseFills; gated += r.gated; unex += r.unexercised; caught.push(...r.filled);
  }
  firstMode = false;
  h5rows[mode] = { tried, gated, unexercised: unex, falseFills };
  leaky += falseFills;
  say(`- ${mode.padEnd(9)} ${tried} redealt slots tried, the gate was evaluated on ${gated} of them (${unex} never saw a candidate), ${falseFills} false fills${caught.length ? `: ${caught.join(", ")}` : ""}`);
}
say(`- redeals asked for ${requested}: produced ${produced}, dropped ${dropped} (a constant field cannot be redealt), identity ${identity}; ${noRedeal} slots carry no redeal`);
say(`**H5: ${leaky === 0 ? `HOLDS — the gate let nothing through, on the ${h5rows.declared.gated} slots where it was ever run (${h5rows.declared.unexercised} redealt slots drew no candidate from any species, so they say nothing about the gate)` : `FALSIFIED — gate_leaky, ${leaky} false fill(s)`}**\n`);


// ---------------------------------------------------------------- H5b — can the null arm see a cheat?
say("## H5b the arm counts a fill when one is made — a species that reads the TRUE held-out answers is added (an oracle leak; true by construction, NOT evidence the gate is strong — see E5)");
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
// The table holds every species' outcome on every slot so that any ORDER can be scored without re-running. The first run built each
// row with the FINAL environment (every sibling's fill present), which leaks fills a colony would not have had yet: three `decide`
// refusals turned into no-candidates once only the earlier keys were present (found by review). `envMode` "earlier" is what a pass-1
// colony actually holds; "final" is kept only to print the size of that leak.
async function buildTable(envMode) {
  const out = [];
  for (const set of Object.keys(SETS)) for (const c of contractsOf(set)) {
    const env0 = declared[set].env[c.name], keyOrder = Object.keys(c.runs[0].want());
    for (const slot of slotsOfContract(c)) {
      const at = keyOrder.indexOf(slot.key);
      const env = new Map([...env0].filter(([id]) => id !== slot.id && (envMode === "final" || keyOrder.indexOf(id.slice(c.name.length + 1)) < at)));
      const row = {};
      for (const sp of SPECIES) {
        const t0 = performance.now(); let cand = null, gateCalls = 0;
        try { cand = await sp.fill(slot, { filled: new Map(env), gate: (x) => { gateCalls++; return slot.holds(x); } }); } catch { cand = null; }
        let outcome = "no-candidate"; if (cand !== null && cand !== undefined) { const ok = await slot.holds(cand); outcome = ok === true ? "pass" : ok === null ? "unverifiable" : "refused"; }
        row[sp.name] = { outcome, ms: performance.now() - t0, cand: outcome === "pass" ? cand : null, gateCalls };
      }
      out.push({ set, slot, row });
    }
  }
  return out;
}
const TABLE = await buildTable("earlier");
const TABLE_FINAL = await buildTable("final");
const refusedIn = (t) => t.reduce((a, e) => a + NAMES.filter((n) => e.row[n].outcome === "refused").length, 0);
const HELDT = TABLE.filter((e) => HELD.includes(e.set));
const sim = (rows, orderFor) => { let wasted = 0, ms = 0, unfilled = 0, attempts = 0; for (const e of rows) { let hit = false; for (const n of orderFor(e.slot)) { const r = e.row[n]; ms += r.ms; attempts++; if (r.outcome === "pass") { hit = true; break; } if (r.outcome === "refused" || r.outcome === "unverifiable") wasted++; } if (!hit) unfilled++; } return { wasted, ms, unfilled, attempts }; };
const ALPHA = 0.05; // the repo's standing alpha, network-standing.js (reused, not new): a claim must beat 1 - ALPHA of the random draws
// AMENDED after review (2026-10-01): the registered bar ("strictly better than 95% of the random draws") is UNREACHABLE when more than 5% of
// the draws already sit at the metric's floor — even the best possible order cannot be strictly better than a draw that is as good as it gets.
// The first run printed FALSIFIED for all of H6 and H7 without noticing the bar could not be passed. `ceiling` is the share of draws strictly
// worse than the floor; below 1 - ALPHA the verdict is UNRESOLVED (the registered rule's own word is kept beside it).
const verdict = (arr, v) => { const better = arr.filter((x) => x > v).length, equal = arr.filter((x) => x === v).length, worse = arr.filter((x) => x < v).length, n = arr.length, spread = Math.max(...arr) > Math.min(...arr); const floor = Math.min(...arr), ceiling = arr.filter((x) => x > floor).length / n; return { better, equal, worse, n, spread, ceiling, floorShare: 1 - ceiling, holds: spread && better / n >= 1 - ALPHA, unresolved: !spread, unreachable: spread && ceiling < 1 - ALPHA }; };
const word = (v) => (v.unresolved ? "UNRESOLVED — every random draw wastes the same, so the metric cannot see this" : v.unreachable ? `UNRESOLVED — the registered bar cannot be met: ${(v.floorShare * 100).toFixed(1)}% of the random draws already sit at the metric's floor, so even a perfect order could beat at most ${(v.ceiling * 100).toFixed(1)}% (the registered rule alone would print ${v.holds ? "HOLDS" : "FALSIFIED"})` : v.holds ? "HOLDS" : "FALSIFIED");
say(`## the full-information table — ${TABLE.length} slots × ${NAMES.length} species (environment: the sibling fills of EARLIER keys, as a pass-1 colony holds them); held sets B+C+D = ${HELDT.length} slots`);
const pass = (e) => NAMES.filter((n) => e.row[n].outcome === "pass");
const multi = TABLE.filter((e) => pass(e).length >= 2), none = TABLE.filter((e) => pass(e).length === 0);
say(`- slots with exactly one species clearing the gate: ${TABLE.filter((e) => pass(e).length === 1).length}; two or more: ${multi.length}; none: ${none.length}`);
say(`- candidates the gate REFUSED (a species offered something and the held-out runs rejected it), all species × all slots: ${refusedIn(TABLE)}, of which by species: ${NAMES.map((n) => [n, TABLE.filter((e) => e.row[n].outcome === "refused").length]).filter(([, k]) => k).map(([n, k]) => `${n} ${k}`).join(", ") || "none"} (the first run's table, built with every sibling's fill present, counted ${refusedIn(TABLE_FINAL)} — the leak)\n`);

// ---------------------------------------------------------------- H7 — order against random orders
const rngO = lcg(2026);
const perm = () => { const a = [...NAMES]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rngO() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const randW = [], randM = [], randA = [];
for (let i = 0; i < 100000; i++) { const o = perm(); const r = sim(HELDT, () => o); randW.push(r.wasted); randM.push(r.ms); randA.push(r.attempts); }
const orderOf = { declared: () => declaredOrder(SPECIES), derived: () => derivedOrder(SPECIES), reversed: () => [...derivedOrder(SPECIES)].reverse(), learned: (slot) => routeOrderFor(taught, `slot|${slot.kind}`, { now: NOW, routes: derivedOrder(SPECIES), explore: 0 }) };
say("## H7 order against 100,000 random orders of the twelve species (table simulation, held sets B+C+D)");
say(`- random orders: wasted min ${Math.min(...randW)}, median ${[...randW].sort((a, b) => a - b)[randW.length >> 1]}, max ${Math.max(...randW)}; ms min ${Math.min(...randM).toFixed(0)}, median ${[...randM].sort((a, b) => a - b)[randM.length >> 1].toFixed(0)}, max ${Math.max(...randM).toFixed(0)}`);
const h7 = {};
for (const m of ["declared", "derived", "learned", "reversed"]) {
  const r = sim(HELDT, orderOf[m]), v = verdict(randW, r.wasted), vm = verdict(randM, r.ms), va2 = verdict(randA, r.attempts);
  h7[m] = { wasted: r.wasted, ms: Math.round(r.ms), attempts: r.attempts, strictlyBetterThanRandom: v.better, equalToRandom: v.equal, worseThanRandom: v.worse, spread: v.spread, floorShare: v.floorShare };
  say(`- ${m.padEnd(9)} wasted ${r.wasted}: better than ${v.better} of ${v.n} random orders, equal to ${v.equal}, worse than ${v.worse} → ${word(v)}`);
  say(`  ${"".padEnd(9)} (descriptive) attempts ${r.attempts}: better than ${va2.better}/${va2.n} random orders; ms ${r.ms.toFixed(0)}: better than ${vm.better}/${vm.n} (single measurement)`);
}
{
  // the table is a SIMULATION of the colony; check it against the real runs it stands in for, so a divergence cannot hide
  const real = Object.fromEntries(["declared", "derived", "reversed", "learned"].map((m) => [m, P(m).wasted]));
  const simw = Object.fromEntries(["declared", "derived", "reversed", "learned"].map((m) => [m, sim(HELDT, orderOf[m]).wasted]));
  say(`- simulation vs the real colony runs (wasted, held sets): ${Object.keys(real).map((m) => `${m} ${simw[m]}/${real[m]}${simw[m] === real[m] ? "" : " ≠"}`).join(", ")} (sim/real; attempts differ because the real colony retries unfilled slots in a second pass)`);
  h7.simVsReal = Object.fromEntries(Object.keys(real).map((m) => [m, { sim: simw[m], real: real[m] }]));
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
const rngH2 = lcg(99), rand27perSlot = [];
// AS FIRST REGISTERED (a driver bug found by review): the lambda below ran once PER SLOT inside sim(), so every slot saw a different random house
// assignment. Kept, labelled, to show the effect of the bug; the verdict uses the corrected draw (one assignment per trial).
for (let i = 0; i < 5000; i++) rand27perSlot.push(sim(HELDT, () => orderFromCells(Object.fromEntries(SPECIES.map((x) => [x.name, all27[Math.floor(rngH2() * 27)]])))).wasted);
for (let i = 0; i < 5000; i++) { const o = orderFromCells(Object.fromEntries(SPECIES.map((x) => [x.name, all27[Math.floor(rngH() * 27)]]))); rand27.push(sim(HELDT, () => o).wasted); }
const va = verdict(groupW, realW), vb = verdict(rand27, realW), vbBug = verdict(rand27perSlot, realW);
say("## H6 do the houses carry the order? (real house assignment vs random ones; table simulation, held sets B+C+D)");
say(`- real assignment wasted ${realW} (${distinct.length} occupied houses: ${distinct.join(", ")})`);
say(`- (a) all ${groupW.length} permutations of which occupied house holds which species-group: wasted min ${Math.min(...groupW)} / max ${Math.max(...groupW)}; real is better than ${va.better}, equal to ${va.equal}, worse than ${va.worse} → ${word(va)}`);
say(`- (b) ${rand27.length} random assignments of each species to one of the 27 houses (one assignment per trial): wasted min ${Math.min(...rand27)} / max ${Math.max(...rand27)}; real is better than ${vb.better}, equal to ${vb.equal}, worse than ${vb.worse} → ${word(vb)}`);
say(`- (b, as first registered — a fresh assignment per SLOT, a driver bug): real better than ${vbBug.better}, equal to ${vbBug.equal}, worse than ${vbBug.worse}`);
{
  const cost = (key) => { const r = sim(HELDT, () => orderFromCells(realCells))[key]; const arr = []; const rg = lcg(7); for (let i = 0; i < 5000; i++) { const o = orderFromCells(Object.fromEntries(SPECIES.map((x) => [x.name, all27[Math.floor(rg() * 27)]]))); arr.push(sim(HELDT, () => o)[key]); } return { real: r, ...verdict(arr, r) }; };
  const ca = cost("attempts"), cm = cost("ms");
  say(`- (b, descriptive) on attempts the real assignment is better than ${ca.better}/${ca.n} random assignments, on ms ${cm.better}/${cm.n} (single measurement)`);
}
const h6 = va.holds && vb.holds, h6unresolved = va.unresolved || vb.unresolved || va.unreachable || vb.unreachable;
say(`**H6: ${h6 ? "HOLDS" : h6unresolved ? "UNRESOLVED — the registered bar cannot be met on this metric (see (a) and (b)); the registered rule alone would have printed FALSIFIED" : "FALSIFIED"}**\n`);

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
say(`- fills by pass in the declared run: ${Object.entries(Object.keys(SETS).reduce((a, st) => { for (const [k, v] of Object.entries(declared[st].byPass)) a[k] = (a[k] ?? 0) + v; return a; }, {})).map(([k, v]) => `pass ${k} → ${v}`).join(", ")} — the retry-and-environment machinery is exercised only if a fill lands after pass 1`);
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


// ================================================================ POST-HOC EXPLORATION (--exploratory) — NOT REGISTERED
// Everything below was written AFTER the first run, in response to what the registered falsifiers showed. It carries no verdict word
// (HOLDS/FALSIFIED belong to the registered H1–H10); it reports counts a reader can weigh, and it may not be cited as a pre-registered result.
if (process.argv.includes("--exploratory")) {
  say("\n# POST-HOC EXPLORATION — written after the first run; no verdicts, no pre-registration\n");

  // E0 — the wall-clock teaching run. kernel/stigmergy.js breaks equal-strength ties by mean latency, so the learned order depends on how
  // fast each species happened to run while it was taught. Teach 15 times on the real clock and see how much the registered arm moves.
  say("## E0 learned order when the teaching run reads the wall clock (15 independent teachings of set A, judged on B+C+D)");
  const e0 = [];
  for (let i = 0; i < 15; i++) {
    const tr = await teach(() => performance.now());
    const per = [];
    for (const set of HELD) per.push(await runSet(set, "learned", { trails: tr, explore: 0 }));
    const pl = pool(per);
    e0.push({ wasted: pl.wasted, attempts: pl.attempts, filled: pl.filled });
  }
  const hist = (xs) => Object.entries(xs.reduce((a, x) => ({ ...a, [x]: (a[x] ?? 0) + 1 }), {})).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}×${v}`).join(", ");
  say(`- wasted over 15 teachings: ${hist(e0.map((x) => x.wasted))}; attempts: ${hist(e0.map((x) => x.attempts))}; filled: ${hist(e0.map((x) => x.filled))} (declared wasted ${P("declared").wasted}, derived ${P("derived").wasted}, unit-clock learned ${P("learned").wasted})`);

  // E1 — every triple of shown examples, not two chosen ones. Tasks with at least five runs leave two or more held out. The identity triple
  // (the first three runs, the baseline itself) is excluded: it refills everything by construction and only inflates the denominator.
  say("\n## E1 all triples — every C(n,3) choice of three shown examples except the baseline's own (tasks with at least five runs), species refitted, the rest held out");
  const combos = (n) => { const o = []; for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) if (!(a === 0 && b === 1 && c === 2)) o.push([a, b, c]); return o; };
  let e1Tasks = 0, e1Refits = 0, e1Kept = 0, e1Gained = 0, e1FillsCovered = 0, e1FillsTotal = 0; const e1Lost = {}, e1Gain = {}, e1BySpecies = {};
  for (const set of Object.keys(SETS)) for (const c of contractsOf(set)) {
    e1FillsTotal += declared[set].env[c.name].size;
    if (c.runs.length < 5) continue;
    e1Tasks++;
    const base = new Set([...declared[set].env[c.name].keys()].map((id) => keyOf(c, id)));
    e1FillsCovered += base.size;
    for (const idxs of combos(c.runs.length)) {
      const r = await colonize({ slots: slotsOfContract(permute(c, idxs)), ...opts({ mode: "declared" }) });
      const alt = new Set([...r.filled.keys()].map((id) => keyOf(c, id)));
      e1Refits++;
      for (const k of base) {
        const sp = declared[set].by[`${c.name}.${k}`];
        e1BySpecies[sp] ??= { kept: 0, lost: 0 };
        if (alt.has(k)) { e1Kept++; e1BySpecies[sp].kept++; } else { const key = `${set}/${c.name}.${k}`; e1Lost[key] = (e1Lost[key] ?? 0) + 1; e1BySpecies[sp].lost++; }
      }
      for (const k of alt) if (!base.has(k)) { e1Gained++; const key = `${set}/${c.name}.${k}`; e1Gain[key] = (e1Gain[key] ?? 0) + 1; }
    }
  }
  const e1Opp = e1Kept + Object.values(e1Lost).reduce((a, b) => a + b, 0);
  say(`- ${e1Tasks} tasks cover ${e1FillsCovered} of the ${e1FillsTotal} fills (the registered H8 covered 12); ${e1Refits} refits; baseline fills refilled ${e1Kept} of ${e1Opp} (slot × other-triple) opportunities; slots lost under at least one triple: ${Object.keys(e1Lost).length}${Object.keys(e1Lost).length ? ` (${Object.entries(e1Lost).map(([k, v]) => `${k} ×${v}`).join(", ")})` : ""}`);
  say(`- by the species that filled the baseline slot: ${Object.entries(e1BySpecies).map(([k, v]) => `${k} ${v.kept}/${v.kept + v.lost}`).join(", ")}`);
  say(`- slots filled under some triple that the baseline did not fill: ${Object.keys(e1Gain).length} (${e1Gained} cases)${Object.keys(e1Gain).length ? ` — ${Object.entries(e1Gain).map(([k, v]) => `${k} ×${v}`).join(", ")}` : ""}`);

  // E2 — absent values. A copy, an optional and a coalesce can all clear the held-out gate while disagreeing exactly where a value is
  // missing; the registered crossover recombines present values and cannot create that case. Here a parameter (or one key of an object
  // parameter) is set to null, or removed, on every run, and the clearing species are compared.
  say("\n## E2 absent values — each parameter, and each key of each object parameter, set to null and then removed; slots cleared by two or more species");
  const absentInputs = (c) => {
    const out = [];
    for (const r of c.runs) {
      const a0 = r.args();
      c.params.forEach((_, p) => {
        const mk = (v) => { const a = clone(a0); a[p] = v; return a; };
        out.push(mk(null), mk(undefined));
        const d = a0[p];
        if (d && typeof d === "object" && !Array.isArray(d)) for (const k of Object.keys(d)) { const n = clone(a0); n[p][k] = null; out.push(n); const m = clone(a0); delete m[p][k]; out.push(m); }
      });
    }
    return out;
  };
  let e2Slots = 0, e2Disagree = 0, e2DisagreeValue = 0; const e2Pairs = {}, e2First = {};
  const loose = (v) => (v === undefined || v === "__undefined__" ? null : v); // null and undefined are two spellings of "absent" to a JSON consumer
  for (const e of multi) {
    e2Slots++;
    const names = pass(e), inputs = absentInputs(e.slot.contract);
    let dis = false, disValue = false;
    for (const args of inputs) {
      const outs = names.map((n) => evalC(e.row[n].cand, args));
      for (let i = 0; i < names.length; i++) for (let k = i + 1; k < names.length; k++) if (!same(outs[i], outs[k])) { dis = true; if (!same(loose(outs[i]), loose(outs[k]))) disValue = true; const pr = `${names[i]} vs ${names[k]}`; e2Pairs[pr] = (e2Pairs[pr] ?? 0) + 1; }
    }
    if (dis) e2Disagree++;
    if (disValue) e2DisagreeValue++;
    if (dis) e2First[`${e.set}/${e.slot.id}`] = `${names.join("/")}${disValue ? "" : " (null vs undefined only)"}`;
  }
  say(`- ${e2Slots} slots cleared by two or more species; ${e2Disagree} disagree on at least one absent-value input (the registered crossover found 0); ${e2DisagreeValue} still disagree after treating undefined as null`);
  say(`- disagreeing pairs (input counts): ${Object.entries(e2Pairs).map(([k, v]) => `${k} ×${v}`).join("; ") || "none"}`);
  say(`- slots: ${Object.entries(e2First).map(([k, v]) => `${k} [${v}]`).join("; ") || "none"}`);
  // which species does the DECLARED (cheapest-first) order commit to on those slots, and which would it have committed to had order been derived?
  const dOrd = declaredOrder(SPECIES), vOrd = derivedOrder(SPECIES);
  const firstOf = (e, ord) => ord.find((n) => e.row[n].outcome === "pass");
  const e2Committed = Object.keys(e2First).map((k) => { const e = multi.find((x) => `${x.set}/${x.slot.id}` === k); return `${k}: declared→${firstOf(e, dOrd)}, derived→${firstOf(e, vOrd)}`; });
  say(`- the species each order commits to on those slots: ${e2Committed.join("; ") || "none"}`);

  // E3 — leave one species out. Which slots does the colony lose without each species? A species no slot needs is redundant at this
  // evidence; a slot with a single clearing species is the only thing that species is for.
  say("\n## E3 leave one species out — slots (of all 80) the colony fails to fill without it, other eleven species in declared order");
  const e3 = [];
  for (const sp of SPECIES) {
    const rest = SPECIES.filter((x) => x.name !== sp.name);
    let lost = 0; const ids = [];
    for (const set of Object.keys(SETS)) for (const c of contractsOf(set)) {
      const r = await colonize({ slots: slotsOfContract(c), species: rest, now: NOW, mode: "declared", clock: unitClock() });
      for (const id of declared[set].env[c.name].keys()) if (!r.filled.has(id)) { lost++; ids.push(id); }
    }
    e3.push(`${sp.name} −${lost}${lost && lost <= 6 ? ` (${ids.join(", ")})` : ""}`);
  }
  say(`- ${e3.join("; ")}`);
  say(`- slots where THIS species is the only one that clears the gate (the table, earlier-keys environment): ${NAMES.map((n) => [n, TABLE.filter((e) => pass(e).length === 1 && pass(e)[0] === n).length]).map(([n, k]) => `${n} ${k}`).join(", ")} — copy −0 above is by construction: every copy slot is string-valued and optional covers it`);

  // E4 — what the registered "derived" order cost. 18 copy slots were refilled by optional because NUL·Figure precedes CON·Figure in the chain.
  say("\n## E4 who fills a slot under each order (identity, not just count) — slots whose filling species differs from the declared order's");
  for (const m of ["derived", "reversed", "learned"]) {
    const ch = identityChanged(arms.declared, arms[m]);
    const by = ch.reduce((a, x) => { const t = x.slice(x.indexOf(": ") + 2); return { ...a, [t]: (a[t] ?? 0) + 1 }; }, {});
    say(`- ${m.padEnd(9)} ${ch.length} slot(s) filled by a different species than declared: ${Object.entries(by).map(([k, v]) => `${k} ×${v}`).join(", ") || "none"}`);
  }
  // E5 — a stronger null than the registered one. The registered redeal rotates a slot's own targets, and 132 of its 158 slots drew no
  // candidate from any species, so it exercised the gate on 26. A CROSS-SLOT target is a different, realistic wrong answer: another slot's
  // shown targets of the same structural kind, put on this slot's inputs. A species that fits them is fitting the wrong function.
  say("\n## E5 cross-slot null — each slot given another slot's shown targets (same kind, different task), judged by its own true held-out runs");
  {
    const all = Object.keys(SETS).flatMap((st) => contractsOf(st).flatMap((c) => slotsOfContract(c).map((sl) => ({ c, sl }))));
    const byKind = {};
    for (const x of all) (byKind[x.sl.kind] ??= []).push(x);
    const rngE = lcg(5), cross = [];
    for (const { c, sl } of all) {
      const pool_ = (byKind[sl.kind] ?? []).filter((d) => d.c.name !== c.name && JSON.stringify(d.sl.wants) !== JSON.stringify(sl.wants));
      if (!pool_.length) continue;
      const donor = pool_[Math.floor(rngE() * pool_.length)];
      const c2 = { ...c, runs: c.runs.map((r, i) => (i < 3 ? { ...r, want: () => ({ ...r.want(), [sl.key]: donor.sl.wants[i] }) } : r)) };
      cross.push({ ...slotOf(c2, sl.key, donor.sl.wants), id: `${sl.id}←${donor.sl.id}` });
    }
    const r = await nullArm({ slots: cross, species: SPECIES, mode: "declared" });
    // how many offered a shown-fit candidate at all (the gate ran), by species
    const bySp = {};
    const rr = await colonize({ slots: cross, species: SPECIES, mode: "declared", clock: unitClock() });
    for (const row of rr.rows) if (row.outcome === "refused" || row.outcome === "filled" || row.outcome === "unverifiable") bySp[row.species] = (bySp[row.species] ?? 0) + 1;
    say(`- ${r.tried} cross-slot slots; the gate was evaluated on ${r.gated} of them (${r.unexercised} drew no candidate); ${r.falseFills} false fills → ${r.verdict}`);
    say(`- candidates offered and judged, by species: ${Object.entries(bySp).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`);
    out.exploratory = { ...(out.exploratory ?? {}), e5: { tried: r.tried, gated: r.gated, falseFills: r.falseFills, verdict: r.verdict } };
  }

  // E6 — the metric without its pass-coupling. `wasted` re-gates a refused candidate in every later pass; skipUnchanged retries a pair only
  // after a fill has landed since its last attempt.
  say("\n## E6 skipUnchanged — the same four orders with no re-gating of a pair whose environment did not change (held sets B+C+D, learned taught on A)");
  for (const m of ["declared", "derived", "reversed", "learned"]) {
    const base = P(m), sk = pool(await Promise.all(HELD.map((st) => runSet(st, m, { skipUnchanged: true, ...(m === "learned" ? { trails: taught, explore: 0 } : {}) }))));
    say(`- ${m.padEnd(9)} default: ${base.filled} filled, ${base.attempts} attempts, ${base.wasted} wasted → skipUnchanged: ${sk.filled} filled, ${sk.attempts} attempts, ${sk.wasted} wasted`);
  }

  // E7 — teach on each set in turn, judge on the others (A is fitted, so it is the weakest teacher and the cleanest check).
  say("\n## E7 cross-teaching — learned order taught on ONE set (unit clock), judged on the other three; derived and declared on the same sets");
  for (const X of Object.keys(SETS)) {
    const tr = await teach(unitClock(), [X]), rest = Object.keys(SETS).filter((k) => k !== X);
    const L = pool(await Promise.all(rest.map((st) => runSet(st, "learned", { trails: tr, explore: 0 })))), D = pool(rest.map((st) => arms.derived[st])), Dc = pool(rest.map((st) => arms.declared[st]));
    say(`- taught on ${X}, judged on ${rest.join("+")}: learned wasted ${L.wasted} (${L.filled} filled), derived ${D.wasted}, declared ${Dc.wasted}`);
  }

  // E8 — does a good order TRANSFER? Among random orders that waste nothing on the fitted set A rows, how many also waste nothing on B+C+D,
  // against how many random orders waste nothing on B+C+D at all. If order were noise the two shares would match.
  say("\n## E8 does a good order transfer — random orders judged on set A, then on B+C+D (table simulation, 100,000 orders)");
  {
    const rowsA = TABLE.filter((e) => e.set === "A"), rg = lcg(8);
    let zeroA = 0, zeroAandHeld = 0, zeroHeld = 0, n = 100000;
    for (let i = 0; i < n; i++) {
      const o = [...NAMES]; for (let k = o.length - 1; k > 0; k--) { const j = Math.floor(rg() * (k + 1)); [o[k], o[j]] = [o[j], o[k]]; }
      const wa = sim(rowsA, () => o).wasted, wh = sim(HELDT, () => o).wasted;
      if (wh === 0) zeroHeld++;
      if (wa === 0) { zeroA++; if (wh === 0) zeroAandHeld++; }
    }
    say(`- orders wasting 0 on A: ${zeroA}/${n}; of those, wasting 0 on B+C+D: ${zeroAandHeld}/${zeroA} (${(100 * zeroAandHeld / zeroA).toFixed(1)}%); orders wasting 0 on B+C+D, unconditionally: ${zeroHeld}/${n} (${(100 * zeroHeld / n).toFixed(1)}%)`);
    out.exploratory = { ...(out.exploratory ?? {}), e8: { zeroA, zeroAandHeld, zeroHeld, n } };
  }

  out.exploratory = { ...(out.exploratory ?? {}), e0, e1: { tasks: e1Tasks, refits: e1Refits, kept: e1Kept, lost: e1Lost, gained: e1Gain }, e2: { slots: e2Slots, disagree: e2Disagree, disagreeValue: e2DisagreeValue, pairs: e2Pairs }, e3 };
}

out.h = { h1: h1Diff === 0, h2, h3, h4: rev, h5: leaky === 0, h5b, h6: h6 ? true : h6unresolved ? "unresolved" : false, h8, h9, h7, thinFills: `${thin}/${fills10}` };
out.arms = Object.fromEntries(Object.entries(arms).map(([m, v]) => [m, Object.fromEntries(Object.entries(v).map(([s, r]) => [s, { slots: r.slots, filled: r.filled, attempts: r.attempts, work: r.work, wasted: r.wasted, ms: Math.round(r.ms) }]))]));
out.scrambledWasted = scrWasted;
const j = process.argv.indexOf("--json");
if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 2));
