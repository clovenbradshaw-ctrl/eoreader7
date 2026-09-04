// contest-ladder.mjs — does the ladder actually move on REAL material?
//
// THE QUESTION. `premisesOf` gates floor 6 on a witness COUNT. Measured
// before (premise-levels.mjs): 24 of 25 succession premises are
// single-source, so the gate yields ZERO derived facts — the layer above
// is not sparse, it is empty. P89 replaced the gate with `carry`: admit at
// one source, carry the fragility on every product, and let the falling
// machinery (P88's dispute → settle → concede → cascade) be what licenses
// building rather than the count.
//
// This driver runs that claim against the SAME independent oracle
// derivation-precision.mjs uses, through the LEDGER PATH — hear the
// material into a real hyperlexicon, fold it, `premisesOf`, `derive` —
// which premise-levels.mjs recorded as never having run on real material
// at all (`makeDerivation` appears in capacities.js as a registry string
// and is invoked by no driver; derivation-precision builds the reaction
// substrate directly and bypasses the floor).
//
// THE ORACLE'S INDEPENDENCE is load-bearing and unchanged: the derivation
// reads P1365/P1366 (replaces / replaced by); the oracle reads P580/P582
// (start time / end time). Different properties — the oracle cannot agree
// with the derivation by construction.
//
// ZERO MODEL CALLS. Every stage here is arithmetic (P30 / "null the free
// stage first"): the selector, the floor, the cascade and the routing rule
// are all free, and they bound everything a paid stage could do.
//
// THE NULL. REDEAL_SEED=<n> shuffles each offered assertion's OBJECT among
// assertions of the SAME office — marginals kept exactly, the succession
// relation destroyed — the same null derivation-precision.mjs uses, so the
// arms here are comparable to the ones already on the record.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createTaskLog, append, projectTasks, ENTRY_KINDS, OPERATOR_BASIS } from "../../kernel/task-log.js";
import { GRAINS } from "../../kernel/cube.js";
import { parseEntity } from "../../../../the-fold/wikidata.js";
import { makeHyperlexicon } from "../../organs/hyperlexicon.js";
import { adaptTaskLog } from "../../../../the-fold/consequence.js";
import { makeDerivation, premisesOf } from "../../organs/derivation.js";
import { contestedSearch } from "../../organs/corroboration.js";
import { createDeclarationLog, proposeCandidate, promote } from "../../interpretation/declarations.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// CORPUS=wide runs the SAME ladder over the 2-hop crawl (158 entities)
// instead of the 3 committed entity files (23 entities). The oracle widens
// with it, and its independence is unchanged and explicit in the fixture's
// own header: "the oracle reads P580/P582 only; the derivation reads
// P1365/P1366 and tenure indices only — same pages, different properties."
// This driver never reads a date. Dates exist in the wide material and are
// dropped at load, which is the E' control derivation-precision.mjs runs by
// re-naming; here it is structural, because nothing else is ever read.
const WIDE = process.env.CORPUS === "wide";
const FIXTURES = path.join(HERE, "fixtures", "wikidata");
const WIDE_MATERIAL = path.join(HERE, "fixtures", "succession-tenures-wide.json");
const ORACLE = path.join(HERE, "fixtures", WIDE ? "succession-terms-wide.json" : "succession-terms.json");
const OUT = process.env.OUT_PATH ?? path.join(HERE, "results", "contest-ladder.json");
const GIVER = "native/eval/the-fold/contest-ladder.mjs — per-office succession composition, declared as this driver's own risk";
const MAX_STEPS = Number(process.env.MAX_STEPS ?? 6);

const taskLog = { ...adaptTaskLog({ createTaskLog, append, ENTRY_KINDS, OPERATOR_BASIS, GRAINS }), projectTasks };
const hl = makeHyperlexicon(taskLog);
const D = makeDerivation({ hl, taskLog });

// ── the material, addressed into its own bytes (P5.2) ─────────────────────
const files = WIDE ? ["succession-tenures-wide.json"] : fs.readdirSync(FIXTURES).filter((f) => f.endsWith(".json")).sort();
const raws = new Map(files.map((f) => [f, fs.readFileSync(WIDE ? WIDE_MATERIAL : path.join(FIXTURES, f), "utf8")]));
const entities = WIDE ? [] : files.map((f) => parseEntity(JSON.parse(raws.get(f)))).filter(Boolean);
function addressOf(file, qid) {
  const raw = raws.get(file);
  const needle = WIDE ? `"${qid}"` : `"id":"${qid}"`;
  const start = raw.indexOf(needle);
  if (start < 0) return null;
  if (raw.slice(start, start + needle.length) !== needle) throw new Error(`address self-verification failed: ${file}`);
  return { ref: `wikidata/${file}`, at: `wikidata/${file}#${start}-${start + needle.length}`, start, end: start + needle.length, text: needle };
}

const offered = [];
if (WIDE) {
  // Person-grain, exactly the narrow run's shape, so the two are comparable.
  // ONLY `replaces` / `replacedBy` are read — `start` and `end` sit in these
  // rows and are never touched, which is what keeps the oracle independent.
  const file = files[0];
  const rows = JSON.parse(raws.get(file)).entities;
  for (const [qid, e] of Object.entries(rows)) {
    for (const t of e.tenures ?? []) {
      const rel = `replaces:${t.office}`;
      if (t.replaces) { const s = addressOf(file, qid); offered.push({ witness: `wikidata/${file}`, subject: qid, verb: rel, object: t.replaces, spans: s ? [s] : [] }); }
      if (t.replacedBy) { const s = addressOf(file, qid); offered.push({ witness: `wikidata/${file}`, subject: t.replacedBy, verb: rel, object: qid, spans: s ? [s] : [] }); }
    }
  }
}
entities.forEach((e, i) => {
  const file = files[i];
  for (const p of e.positions ?? []) {
    const rel = `replaces:${p.position}`;
    if (p.replaces) { const s = addressOf(file, p.replaces); offered.push({ witness: `wikidata/${file}`, subject: e.qid, verb: rel, object: p.replaces, spans: s ? [s] : [] }); }
    if (p.replacedBy) { const s = addressOf(file, e.qid); offered.push({ witness: `wikidata/${file}`, subject: p.replacedBy, verb: rel, object: e.qid, spans: s ? [s] : [] }); }
  }
});

// ── the null: shuffle objects within office, marginals kept ───────────────
if (process.env.REDEAL_SEED) {
  let x = Number(process.env.REDEAL_SEED) >>> 0 || 1;
  const rnd = () => ((x = (1103515245 * x + 12345) >>> 0) / 4294967296);
  const byRel = new Map();
  offered.forEach((o, i) => { if (!byRel.has(o.verb)) byRel.set(o.verb, []); byRel.get(o.verb).push(i); });
  for (const idxs of byRel.values()) {
    const objs = idxs.map((i) => offered[i].object);
    for (let i = objs.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [objs[i], objs[j]] = [objs[j], objs[i]]; }
    idxs.forEach((i, k) => { offered[i] = { ...offered[i], object: objs[k] }; });
  }
}

// ── hear it into a real ledger ────────────────────────────────────────────
let log = hl.createHyperlexicon();
for (const o of offered) log = hl.hear(log, { subject: o.subject, verb: o.verb, object: o.object, witness: o.witness, spans: o.spans });
const notes = hl.foldHyperlexicon(log);

// ── the licence, from the register's GIVEN tier alone ─────────────────────
const relations = [...new Set(offered.map((o) => o.verb))];
let decl = createDeclarationLog();
for (const rel of relations) {
  const p = proposeCandidate(decl, { kind: "composes", rel, yields: `after:${rel}`, acquisition: { note: "succession composes transitively within one office" }, source: "wikidata P1365/P1366" });
  decl = promote(p.log, p.id, { giver: GIVER }).log;
}

// ── the oracle: P580/P582 only, offline ───────────────────────────────────
const oracle = JSON.parse(fs.readFileSync(ORACLE, "utf8"));
const labelOf = (q) => oracle.entities[q]?.label ?? q;
const stamp = (t) => (typeof t === "string" && t.length > 10)
  ? Number(t.slice(1, 5)) * 10000 + Number(t.slice(6, 8)) * 100 + Number(t.slice(9, 11)) : null;
function verdict(office, X, Y) {
  const ex = oracle.entities[X], ey = oracle.entities[Y];
  if (!ex || !ey) return ["UNVERIFIABLE", "no entity data"];
  const tx = ex.terms[office] ?? [], ty = ey.terms[office] ?? [];
  if (!tx.length || !ty.length) return ["UNVERIFIABLE", "office not held per P39"];
  const xs = tx.map((t) => stamp(t.start)).filter((n) => n !== null);
  const ye = ty.map((t) => stamp(t.end)).filter((n) => n !== null);
  if (!xs.length || !ye.length) return ["UNVERIFIABLE", "no P580/P582 dates"];
  if (xs.some((x) => ye.some((y) => x >= y))) return ["TRUE", "a term of X begins at/after a term of Y ends"];
  return ["FALSE", "every term of X begins strictly before every term of Y ends"];
}
const officeOf = (verb) => String(verb).split(":").slice(1).join(":");

function scoreArm(name, out) {
  const rows = out.derived.map((d) => {
    const [v, why] = verdict(officeOf(d.verb.replace(/^after:/, "")), d.subject, d.object);
    return { id: d.id, office: officeOf(d.verb.replace(/^after:/, "")), from: d.subject, to: d.object, depth: d.depth, restsOn: d.restsOn, verdict: v, why };
  });
  const c = { TRUE: 0, FALSE: 0, UNVERIFIABLE: 0 };
  for (const r of rows) c[r.verdict] += 1;
  const decided = c.TRUE + c.FALSE;
  const thin = rows.filter((r) => (r.restsOn?.sources ?? 0) < 2).length;
  return {
    arm: name, premises: out.premises.length, stopped: out.stopped.length, carried: out.carried.length,
    derived: rows.length, ...c,
    precisionOnDecided: decided ? Number((c.TRUE / decided).toFixed(3)) : null,
    restingOnSingleSource: thin,
    maxDepth: rows.reduce((m, r) => Math.max(m, r.depth ?? 0), 0),
    falseFacts: rows.filter((r) => r.verdict === "FALSE").map((r) => `${labelOf(r.from)} after ${labelOf(r.to)} (${r.office})`),
    rows,
  };
}

const FLOOR = { sources: 2, instruments: 0 };
const gated = D.derive(log, { declarations: decl, floor: FLOOR, carry: false, maxSteps: MAX_STEPS });
const carried = D.derive(log, { declarations: decl, floor: FLOOR, carry: true, maxSteps: MAX_STEPS });
const L0 = scoreArm("L0 gate (carry:false) — the shipped floor", gated);
const L1 = scoreArm("L1 carry (carry:true) — admit at one source, carry the fragility", carried);

// ── the fragility this buys, priced ───────────────────────────────────────
const levels = premisesOf(notes, { floor: FLOOR, carry: true });
const liveDerived = D.foldDerived(carried.log).length;
const exposures = levels.premises.map((n) => {
  const ex = D.exposure(carried.log, n.id);
  return { id: n.id, sources: n.level.sources, withdrawn: ex.withdrawn.length, share: liveDerived ? Number((ex.withdrawn.length / liveDerived).toFixed(3)) : 0, depth: ex.depth };
}).sort((a, b) => b.withdrawn - a.withdrawn);
const worst = exposures[0] ?? null;

// ── the contest arm: what the material's own disagreements actually are ──
//
// MEASURED, and it is the point: every apparent contradiction in this
// material is INTRA-SOURCE. Three different people are recorded as
// succeeding one person in one office — by the SAME FILE. That is not two
// sources disagreeing; it is one source recording disjoint tenures, and
// `dispute`'s one-perspective wall refuses it before any question of kind
// or routing arises. The n=2 disagreement the third-source seeker exists
// for does not occur here at all.
const byPair = new Map();
for (const n of notes) { const k = `${n.verb}|${n.object}`; if (!byPair.has(k)) byPair.set(k, []); byPair.get(k).push(n); }
const groups = [...byPair.values()].filter((g) => g.length > 1);
const apparent = groups.flatMap((g) => g.slice(1).map((n) => ({ note: n, rival: g[0] })));
const srcOf = (ws) => new Set((ws ?? []).map((w) => String(w).split("#")[0].split("~")[0]));
let crossSource = 0, sameSource = 0;
for (const { note, rival } of apparent) {
  const mine = srcOf(note.witnesses), theirs = srcOf(rival.witnesses);
  if ([...theirs].some((t) => !mine.has(t))) crossSource += 1; else sameSource += 1;
}

// C1 — the real material, offered to the act exactly as it stands.
let contestLog = carried.log;
const landedReal = [], refusedReal = {};
for (const { note, rival } of apparent) {
  const from = [...srcOf(rival.witnesses)][0];
  const r = hl.dispute(contestLog, note.id, {
    source: from,
    because: `the same office is also recorded as passing to ${labelOf(rival.subject)}`,
    kind: hl.DISPUTE_KINDS.INDIVIDUATION,
  });
  if (r.refused) refusedReal[r.refused.type] = (refusedReal[r.refused.type] ?? 0) + 1;
  else { contestLog = r.log; landedReal.push({ noteId: note.id, source: from }); }
}
const sources = files.map((f) => ({ ref: `wikidata/${f}`, text: raws.get(f) }));
const routedReal = contestedSearch(contestLog, hl, sources, { limit: 5, kinds: hl.NEEDS_THIRD_SOURCE });

// C2 — PLANTED AND DISCLOSED, because an arm that is never reached is a
// decoration (the denominator lesson). A genuine cross-source disagreement
// is landed against a note from a file that does not witness it, once as
// `individuation` and once as `contest`, so the routing rule is exercised
// in both directions on real notes rather than asserted.
// the premise with the MOST resting on it — so the planted arm exercises
// the cascade rather than a leaf that would take nothing with it
const target = notes.find((n) => n.id === (exposures.find((e) => e.withdrawn > 0)?.id)) ?? notes.find((n) => srcOf(n.witnesses).size === 1);
// A real outsider when the corpus has one; otherwise a DISCLOSED synthetic
// ref. The wide crawl is a single retrieval, so no real second source
// exists and a cross-source contest is unavailable BY CONSTRUCTION — which
// is itself reported (`crossSource: 0` above), not hidden behind a null.
const realOutsider = files.map((f) => `wikidata/${f}`).find((r) => !srcOf(target.witnesses).has(r));
const outsider = realOutsider ?? "PLANTED-OUTSIDER (disclosed: this corpus is one retrieval, so no real second source exists)";
const planted = { outsider, outsiderIsReal: Boolean(realOutsider) };
for (const kind of [hl.DISPUTE_KINDS.INDIVIDUATION, hl.DISPUTE_KINDS.CONTEST]) {
  const r = hl.dispute(carried.log, target.id, { source: outsider, because: `PLANTED (${kind}): this file records the office differently.`, kind });
  const search = r.refused ? null : contestedSearch(r.log, hl, sources, { limit: 5, kinds: hl.NEEDS_THIRD_SOURCE });
  const ex = r.refused ? null : D.exposure(r.log, target.id);
  planted[kind] = { landed: !r.refused, routedToThirdSource: search?.seeking.length ?? null, unrouted: search?.unrouted.length ?? null, wouldWithdraw: ex?.withdrawn.length ?? null };
}

const report = {
  driver: "contest-ladder.mjs",
  corpus: WIDE ? "wide (158 entities, 2-hop crawl)" : "narrow (23 entities, committed seeds)",
  ran: new Date().toISOString().slice(0, 10),
  modelCalls: 0,
  redealSeed: process.env.REDEAL_SEED ?? null,
  material: { files, offeredAssertions: offered.length, notes: notes.length, distinctOffices: relations.length },
  floor: FLOOR, maxSteps: MAX_STEPS,
  premiseLevels: {
    atFloor: levels.premises.length - levels.carried.length,
    belowFloor: levels.carried.length,
    singleSourceShare: notes.length ? Number((levels.carried.length / notes.length).toFixed(3)) : 0,
  },
  arms: [L0, L1].map(({ rows, ...rest }) => rest),
  fragility: {
    liveDerived,
    worstConcession: worst,
    worstShare: worst?.share ?? 0,
    meanShare: exposures.length ? Number((exposures.reduce((s, e) => s + e.share, 0) / exposures.length).toFixed(3)) : 0,
  },
  contest: {
    apparentContradictionGroups: groups.length,
    apparentContradictions: apparent.length,
    crossSource, sameSource,
    landedAsDisputes: landedReal.length,
    refused: refusedReal,
    routedToThirdSource: routedReal.seeking.length,
    unrouted: routedReal.unrouted.length,
    planted,
  },
  rows: { L0: L0.rows, L1: L1.rows },
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));

const say = (s) => console.log(s);
say(`\n=== contest-ladder [${WIDE ? "WIDE 158-entity crawl" : "narrow 23-entity seeds"}] ${process.env.REDEAL_SEED ? `(REDEAL ${process.env.REDEAL_SEED})` : "(real)"} — ${report.modelCalls} model calls ===`);
say(`material: ${offered.length} offered assertions -> ${notes.length} notes across ${relations.length} offices, ${files.length} sources`);
say(`premise levels: ${report.premiseLevels.atFloor} at floor(>=2 sources), ${report.premiseLevels.belowFloor} below (${(report.premiseLevels.singleSourceShare * 100).toFixed(1)}% single-source)`);
for (const a of report.arms) say(`  ${a.arm}\n    premises ${a.premises} (stopped ${a.stopped}, carried ${a.carried}) -> derived ${a.derived}  TRUE ${a.TRUE} FALSE ${a.FALSE} UNVERIFIABLE ${a.UNVERIFIABLE}  precision ${a.precisionOnDecided ?? "n/a"}  maxDepth ${a.maxDepth}  resting on a single source: ${a.restingOnSingleSource}`);
if (report.arms[1].falseFacts.length) say(`    FALSE: ${report.arms[1].falseFacts.join("; ")}`);
say(`fragility: worst single concession withdraws ${worst?.withdrawn ?? 0} of ${liveDerived} (${((worst?.share ?? 0) * 100).toFixed(1)}%), mean ${(report.fragility.meanShare * 100).toFixed(1)}%`);
say(`contest (real): ${apparent.length} apparent contradictions in ${groups.length} groups — cross-source ${crossSource}, SAME-source ${sameSource}`);
say(`  landed as disputes: ${landedReal.length}; refused: ${JSON.stringify(refusedReal)}`);
say(`  routed to a third source: ${routedReal.seeking.length}`);
say(`contest (planted on the highest-exposure premise, disclosed — so the arm is REACHED, not decorative; outsider real: ${Boolean(realOutsider)}):`);
for (const [k, v] of Object.entries(planted).filter(([, v]) => v && typeof v === "object")) say(`  ${k}: landed ${v.landed}, routed ${v.routedToThirdSource}, unrouted ${v.unrouted}, would withdraw ${v.wouldWithdraw} of ${liveDerived}`);
say(`\nwrote ${OUT}\n`);
