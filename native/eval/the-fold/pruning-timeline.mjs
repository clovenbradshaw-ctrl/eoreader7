// eval/pruning-timeline.mjs — the refutation horizon, measured on real data.
//
// THE QUESTION THIS ANSWERS, and it is the core risk the testing plan named:
// a refutation search over a SMALL corpus refuses almost nothing, because
// counterexamples have not arrived yet. "Unrefuted" is therefore a function
// of how much has been read, and a licence granted at four facts may be
// contradicted at forty. That is not a flaw to be tuned away — it is the
// shape of the thing — but it is only honest if it is MEASURED rather than
// assumed, and if the instrument takes the licence back when it happens.
//
// So this driver streams the real Wikidata succession facts in order, one at
// a time, re-auditing after each arrival, and reports for every office the
// exact point at which its licence dies: **survived N facts, refuted at N+1,
// by this counterexample.** That number is the refutation horizon, and it is
// the honest measure of how much a given "unrefuted" is worth.
//
// THE FULL LOOP RUNS, not a simulation of it. Chemistry is a real `composes`
// declaration on a real `declarations.js` register (candidate → promoted by a
// named giver → projected into affordances by `affordancesFromDeclarations`).
// When the audit refutes one, the declaration is CONCEDED with a real REC
// carrying the counterexample as its trigger, and the substrate WITHDRAWS
// what that licence produced — cascading to everything that rested on it.
// Nothing is deleted: the declaration log keeps the conceded entry, the
// substrate keeps its history, and both are reported.
//
// This is pruning, not learning: nothing here ever earns a licence from
// evidence (the falsification probe refuted that), and the register is the
// only thing that can grant one. What evidence does is take licences AWAY.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hyperedge } from "../../eoreader7/native/kernel/hypergraph.js";
import { createTaskLog, append, projectTasks, ENTRY_KINDS, OPERATOR_BASIS } from "../../eoreader7/native/kernel/task-log.js";
import { GRAINS } from "../../eoreader7/native/kernel/cube.js";
import { createHyperlexicon, giveHyperlexiconAffordance } from "../../eoreader7/native/kernel/hyperlexicon.js";
import { createReactionSubstrate, affordancesFromDeclarations } from "../../eoreader7/native/kernel/reaction.js";
import { auditChemistry, vetoedPairs } from "../../eoreader7/native/kernel/refutation.js";
import { createDeclarationLog, proposeCandidate, promote, concede, foldDeclarations } from "../../eoreader7/native/interpretation/declarations.js";

import { parseEntity } from "../wikidata.js";
import { makeHyperlexicon } from "../hyperlexicon.js";
import { adaptTaskLog } from "../consequence.js";
import { assertionEdges } from "../predigest.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, "fixtures", "wikidata");
const OUT = path.join(HERE, "results", "pruning-timeline.json");
const GIVER = "eval/pruning-timeline.mjs — per-office succession closure, declared as this driver's own risk";

const foldHl = makeHyperlexicon({ ...adaptTaskLog({ createTaskLog, append, ENTRY_KINDS, OPERATOR_BASIS, GRAINS }), projectTasks });

// ── the material, addressed and self-verified (P5.2), in arrival order ─────
const files = fs.readdirSync(FIXTURES).filter((f) => f.endsWith(".json")).sort();
const raws = new Map(files.map((f) => [f, fs.readFileSync(path.join(FIXTURES, f), "utf8")]));
const entities = files.map((f) => parseEntity(JSON.parse(raws.get(f)))).filter(Boolean);
const labels = new Map(entities.filter((e) => e.label).map((e) => [e.qid.toLowerCase(), e.label]));
const labelOf = (ref) => labels.get(ref) ?? String(ref ?? "").toUpperCase();

function addressOf(file, qid) {
  const raw = raws.get(file);
  const needle = `"id":"${qid}"`;
  const start = raw.indexOf(needle);
  if (start < 0) return null;
  if (raw.slice(start, start + needle.length) !== needle) throw new Error(`address self-verification failed: ${file}#${start}`);
  return { ref: `wikidata/${file}`, start, end: start + needle.length, text: needle };
}

const stream = [];
for (let i = 0; i < entities.length; i += 1) {
  const e = entities[i];
  const file = files[i];
  for (const p of e.positions ?? []) {
    const rel = `replaces:${p.position}`;
    if (p.replaces) stream.push({ file, subject: e.qid, verb: rel, object: p.replaces, spans: [addressOf(file, p.replaces)].filter(Boolean) });
    if (p.replacedBy) stream.push({ file, subject: p.replacedBy, verb: rel, object: e.qid, spans: [addressOf(file, e.qid)].filter(Boolean) });
  }
}

// ── chemistry from the REGISTER: candidate → given, per office ─────────────
const offices = [...new Set(stream.map((f) => f.verb.split(":")[1]))];
let declLog = createDeclarationLog();
const declOf = new Map(); // office -> task id
for (const office of offices) {
  const proposed = proposeCandidate(declLog, {
    kind: "composes",
    rel: `replaces:${office}`,
    yields: `after:${office}`,
    acquisition: { basis: "immediate succession in one office is 1:1; its closure is 'held after'" },
    source: "eval/pruning-timeline.mjs",
  });
  declLog = proposed.log;
  declOf.set(office, proposed.id);
  // Promotion is the ACT: a named giver takes the risk, per the grain
  // theorem. Nothing about the material earned this.
  declLog = promote(declLog, proposed.id, { giver: GIVER }).log;
}

const chemistryFrom = (log) => affordancesFromDeclarations(foldDeclarations(log))
  .reduce((hl, row) => giveHyperlexiconAffordance(hl, row), createHyperlexicon());

// ── stream the facts, re-auditing after every arrival ─────────────────────
let hlLog = foldHl.createHyperlexicon();
let chemistry = chemistryFrom(declLog);
// ONE substrate that GROWS, never rebuilt per arrival. This is both the
// faithful model of a reader who has read this much, and the only shape in
// which withdrawal has anything to do: a licence that produced facts at
// arrival 10 and is refuted at arrival 11 must have those facts taken back.
// (Rebuilding per arrival hid that entirely — the veto and the audit landed
// in the same pass, so nothing was ever derived under a licence before it
// was refused, and `withdrew` was structurally always 0.)
let substrate = createReactionSubstrate({ entries: [], hyperlexicon: chemistry, window: null });

const horizon = new Map();   // office -> { survivedFacts, refutedAt, reasons, counterexample }
const concessions = [];
const timeline = [];

for (let i = 0; i < stream.length; i += 1) {
  const fact = stream[i];
  const before = foldHl.foldHyperlexicon(hlLog).length;
  hlLog = foldHl.admit(hlLog, [fact], { witness: `wikidata/${fact.file}` }).log;
  const folded = foldHl.foldHyperlexicon(hlLog);
  const { edges } = assertionEdges(folded, { hyperedge, source: "wikidata-fixtures" });

  // Grow the substrate with what just arrived (already-known edges are
  // ignored), then read the material as it now stands.
  substrate.admit(edges);
  const audit = auditChemistry(substrate.edges(), chemistry);
  substrate.settle({ cue: null, floor: null, maxSteps: 12, veto: vetoedPairs(audit) });

  // A licence the material has now refuted is CONCEDED, and its products
  // withdrawn — the loop closing on real data, not a simulation of it.
  for (const row of audit.filter((r) => r.refuted)) {
    const office = String(row.left).split(":")[1];
    if (horizon.has(office)) continue;
    const scan = row.refutedBy[0];
    const counterexample = scan.uniqueness.violations[0]
      ? `${labelOf(scan.uniqueness.violations[0].referent)} ${scan.uniqueness.violations[0].side === "functional" ? "began" : "left"} the office more than once (${scan.uniqueness.violations[0].partners.map(labelOf).join(", ")})`
      : scan.cycles.examples[0] ? `cycle: ${scan.cycles.examples[0].map(labelOf).join(" → ")}` : "unstated";
    const trigger = `refuted at fact ${i + 1}: ${counterexample}`;

    const taken = substrate.withdraw({ giver: GIVER, left: row.left, right: row.right }, { trigger });
    const conceded = concede(declLog, declOf.get(office), { trigger });
    if (conceded.ok) declLog = conceded.log;
    chemistry = chemistryFrom(declLog);

    horizon.set(office, {
      office, label: labelOf(office.toLowerCase()),
      survivedFacts: i, refutedAtFact: i + 1,
      reasons: scan.reasons, counterexample,
      withdrewProducts: taken.length,
      cascaded: taken.filter((t) => t.cascadeDepth > 0).length,
    });
    concessions.push({ office, trigger, conceded: conceded.ok, withdrew: taken.length });
  }

  if (folded.length !== before) {
    timeline.push({ fact: i + 1, notes: folded.length, edges: edges.length, derived: substrate.derived().length, livesRefuted: horizon.size });
  }
}

// ── the final state, from the register rather than a local variable ───────
const finalFold = foldDeclarations(declLog);
const surviving = finalFold.given.map((d) => ({ rel: d.rel, yields: d.yields, giver: d.giver }));
const finalChem = chemistryFrom(declLog);
const { edges: finalEdges } = assertionEdges(foldHl.foldHyperlexicon(hlLog), { hyperedge, source: "wikidata-fixtures" });
const finalSettled = { derived: substrate.derived(), vetoed: [] };
const finalWithdrawn = substrate.withdrawn();

const out = {
  schema: "EOPruningTimeline@1",
  question: "how long does a licence survive as the corpus grows — and does the instrument take it back when the material refutes it?",
  declared: { giver: GIVER, offices: offices.length, facts: stream.length },
  refutationHorizon: [...horizon.values()].sort((a, b) => a.refutedAtFact - b.refutedAtFact),
  survivedTheWholeStream: offices.filter((o) => !horizon.has(o)).map((o) => ({ office: o, label: labelOf(o.toLowerCase()), disclosure: "unrefuted by THIS material — not a licence earned, and not a claim of soundness" })),
  concessions,
  register: {
    given: surviving.length,
    conceded: finalFold.conceded.length,
    concededDetail: finalFold.conceded.map((d) => ({ rel: d.rel, reason: d.concessionReason })),
    note: "the conceded declarations are kept on the append-only log, never deleted — the past stays queryable",
  },
  finalBelief: {
    derived: finalSettled.derived.length,
    history: substrate.history().length,
    withdrawnAcrossRun: finalWithdrawn.length,
    withdrawnDetail: finalWithdrawn.slice(0, 6).map((w) => ({ fact: `${labelOf(w.from)} —${w.relation}→ ${labelOf(w.to)}`, cascadeDepth: w.depth, trigger: w.trigger })),
    note: "history is everything ever derived; withdrawal marks, never deletes",
  },
  timeline: timeline.slice(-12),
  reading: horizon.size === 0
    ? "no licence was refuted by this material — the horizon is beyond this corpus, which is a statement about the corpus, not about the licences"
    : `${horizon.size} of ${offices.length} licences died inside this corpus; the earliest at fact ${[...horizon.values()].sort((a, b) => a.refutedAtFact - b.refutedAtFact)[0].refutedAtFact}. An 'unrefuted' licence is worth exactly as much as the material that has failed to refute it.`,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
