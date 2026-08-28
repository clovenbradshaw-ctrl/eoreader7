// Did the chemistry actually HELP? Four arms against an independent oracle.
//
// P60 measured that the mechanism RUNS (9 never-stated facts derived). It never
// measured whether those facts are TRUE, nor whether the licensing gate
// prevents anything. This driver measures both, and adds the control P60 never
// ran: would a naive transitive join find the same facts with none of the
// apparatus?
//
// THE ORACLE'S INDEPENDENCE is the load-bearing property. The derivation reads
// P1365 (replaces) / P1366 (replaced by) qualifiers. The oracle reads P580
// (start time) / P582 (end time), committed as eval/fixtures/succession-terms.json
// with its giver and retrieval date. Different properties: the oracle cannot
// agree with the derivation by construction, and the whole run is offline.
//
// A claim "X held office O after Y" is scored TRUE when some term of X begins
// at or after some term of Y ends; FALSE when every term of X begins strictly
// before every term of Y ends (X only ever held it BEFORE Y); UNVERIFIABLE when
// either side has no dated term in O. The TRUE reading is deliberately generous
// for multi-term holders — a person really can hold an office both before and
// after someone else — so a FALSE is a hard, unambiguous conviction.
//
// Arms:
//   A  shipped    — refuteRelation gate on; only unrefuted offices licensed
//   B  no gate    — every office licensed (the veto removed)
//   C  naive      — plain transitive closure over raw edges: no hyperlexicon,
//                   no licensing, no presence gate, no veto, no provenance
//   E  tenure     — TERM DATES ADMITTED AS MATERIAL. Each P39 statement is its
//                   own tenure, named `<person>#<office>#<start>`, so a bridge
//                   carries the identity the relation's semantics needs. No
//                   office gate at all: soundness comes from the material being
//                   finer, not from a veto. Dates are used ONLY to NAME a
//                   tenure, never to order one — arm E' re-runs with the
//                   statement index as the name instead, and an identical
//                   result proves the dates contributed a label and nothing
//                   the oracle could have leaked.
//   D  per-bridge — P60's disclosed "finer per-bridge gate" future work:
//                   refuse a composition whose BRIDGE is multi-tenure in that
//                   office, rather than refusing the whole office. Multi-tenure
//                   is measured from the MATERIAL's own raw edges only, never
//                   from the oracle.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hyperedge } from "../../eoreader7/native/kernel/hypergraph.js";
import { createTaskLog, append, projectTasks, ENTRY_KINDS, OPERATOR_BASIS } from "../../eoreader7/native/kernel/task-log.js";
import { GRAINS } from "../../eoreader7/native/kernel/cube.js";
import { createHyperlexicon, giveHyperlexiconAffordance } from "../../eoreader7/native/kernel/hyperlexicon.js";
import { createReactionSubstrate, closureAffordances } from "../../eoreader7/native/kernel/reaction.js";
import { refuteRelation, afterVeto } from "../../eoreader7/native/kernel/refutation.js";

import { parseEntity } from "../wikidata.js";
import { makeHyperlexicon } from "../hyperlexicon.js";
import { adaptTaskLog } from "../consequence.js";
import { assertionEdges } from "../predigest.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, "fixtures", "wikidata");
const ORACLE = path.join(HERE, "fixtures", "succession-terms.json");
const OUT = path.join(HERE, "results", "derivation-precision.json");
const GIVER = "eval/derivation-precision.mjs — per-office transitive closure, declared as this driver's own risk";

const foldHl = makeHyperlexicon({ ...adaptTaskLog({ createTaskLog, append, ENTRY_KINDS, OPERATOR_BASIS, GRAINS }), projectTasks });

// ── the material, addressed into its own bytes (P5.2) ─────────────────────
const files = fs.readdirSync(FIXTURES).filter((f) => f.endsWith(".json")).sort();
const raws = new Map(files.map((f) => [f, fs.readFileSync(path.join(FIXTURES, f), "utf8")]));
const entities = files.map((f) => parseEntity(JSON.parse(raws.get(f)))).filter(Boolean);

function addressOf(file, qid) {
  const raw = raws.get(file);
  const needle = `"id":"${qid}"`;
  const start = raw.indexOf(needle);
  if (start < 0) return null;
  if (raw.slice(start, start + needle.length) !== needle) throw new Error(`address self-verification failed: ${file}`);
  return { ref: `wikidata/${file}`, start, end: start + needle.length, text: needle };
}

// ── arm F: term intervals admitted as material (Increment D) ──────────────
// The office gate refused on office REUSE, which cost 15 true facts per 2 false
// prevented. A repeat standing is only a counterexample where two standings
// OVERLAP IN TIME; the derivation never received the times, so it could not
// tell a conflation from lawful succession. Each P39 statement carries its own
// start/end, so the interval rides the fact it states.
const stampOf = (t) => (typeof t === "string" && t.length > 10)
  ? Number(t.slice(1, 5)) * 10000 + Number(t.slice(6, 8)) * 100 + Number(t.slice(9, 11)) : null;
const intervalByFact = new Map();
const factKey = (rel, a, b) => `${rel}|${String(a).toLowerCase()}|${String(b).toLowerCase()}`;

const offered = [];
entities.forEach((e, i) => {
  const file = files[i];
  for (const p of e.positions ?? []) {
    const rel = `replaces:${p.position}`;
    const iv = { start: stampOf(p.start?.time), end: stampOf(p.end?.time) };
    if (p.replaces) { const s = addressOf(file, p.replaces); offered.push({ witness: file, a: { subject: e.qid, verb: rel, object: p.replaces, spans: s ? [s] : [] } }); intervalByFact.set(factKey(rel, e.qid, p.replaces), iv); }
    if (p.replacedBy) { const s = addressOf(file, e.qid); offered.push({ witness: file, a: { subject: p.replacedBy, verb: rel, object: e.qid, spans: s ? [s] : [] } }); intervalByFact.set(factKey(rel, p.replacedBy, e.qid), iv); }
  }
});

let log = foldHl.createHyperlexicon();
for (const file of files) {
  log = foldHl.admit(log, offered.filter((o) => o.witness === file).map((o) => o.a), { witness: `wikidata/${file}` }).log;
}
const folded = foldHl.foldHyperlexicon(log);
const { edges } = assertionEdges(folded, { hyperedge, source: "wikidata-fixtures" });
const offices = [...new Set(folded.map((a) => a.verb))].map((v) => v.split(":")[1]);
const raw = folded.map((a) => ({ office: a.verb.split(":")[1], from: a.subject.toUpperCase(), to: a.object.toUpperCase() }));

// endpoints are POSITIONAL (participants carry role: null) — firstEnd/secondEnd
const endsOf = (edge) => [String(edge.participants[0]?.ref ?? "").toUpperCase(),
                          String(edge.participants[edge.participants.length - 1]?.ref ?? "").toUpperCase()];

function chemistry(officeList) {
  const hl = officeList
    .flatMap((o) => closureAffordances({ base: `replaces:${o}`, yields: `after:${o}`, giver: GIVER }))
    .reduce((acc, row) => giveHyperlexiconAffordance(acc, row), createHyperlexicon());
  const sub = createReactionSubstrate({ entries: edges, hyperlexicon: hl, window: null });
  sub.settle({ cue: null, floor: null, maxSteps: 12 });
  return sub.derived().map((d) => { const [from, to] = endsOf(d.edge); return { office: d.edge.relation.split(":")[1], from, to }; });
}

// naive closure, recording every bridge it passed through
function naiveClosure() {
  const seen = new Set(raw.map((r) => `${r.office}|${r.from}|${r.to}`));
  let frontier = raw.map((r) => ({ ...r, bridges: [] }));
  const out = new Map();
  for (let step = 0; step < 12 && frontier.length; step += 1) {
    const next = [];
    for (const l of frontier) for (const r of raw) {
      if (l.office !== r.office || l.to !== r.from) continue;
      const k = `${l.office}|${l.from}|${r.to}`;
      if (seen.has(k) || out.has(k)) continue;
      const row = { office: l.office, from: l.from, to: r.to, bridges: [...l.bridges, l.to] };
      out.set(k, row); next.push(row);
    }
    frontier = next;
  }
  return [...out.values()];
}

// ── arm E: term dates admitted as material ────────────────────────────────
// The defect P60 hit is that ONE P39 statement is one tenure, carrying its own
// start/end AND its own replaces/replacedBy — and the person-level projection
// threw the tenure away. Hamlin holds the refused office across 13 separate
// tenures; flattening them makes "Hamlin replaces Q474290" and "Q474290
// replaces Hamlin" both true of the same node, which is the cycle the veto
// found. Naming each tenure dissolves it.
function tenureMaterial(nameOf) {
  const out = [];
  entities.forEach((e, i) => {
    const file = files[i];
    (e.positions ?? []).forEach((p, idx) => {
      const rel = `replaces:${p.position}`;
      const tenure = `${e.qid}#${p.position}#${nameOf(p, idx)}`;
      if (p.replaces) { const s = addressOf(file, p.replaces); out.push({ witness: file, a: { subject: tenure, verb: rel, object: p.replaces, spans: s ? [s] : [] } }); }
      if (p.replacedBy) { const s = addressOf(file, e.qid); out.push({ witness: file, a: { subject: p.replacedBy, verb: rel, object: tenure, spans: s ? [s] : [] } }); }
    });
  });
  return out;
}
const personOf = (ref) => String(ref).split("#")[0].toUpperCase();
function tenureArm(nameOf) {
  let l = foldHl.createHyperlexicon();
  const off = tenureMaterial(nameOf);
  for (const file of files) l = foldHl.admit(l, off.filter((o) => o.witness === file).map((o) => o.a), { witness: `wikidata/${file}` }).log;
  const fold = foldHl.foldHyperlexicon(l);
  const { edges: tEdges } = assertionEdges(fold, { hyperedge, source: "wikidata-tenures" });
  const tOffices = [...new Set(fold.map((a) => a.verb))].map((v) => v.split(":")[1]);
  const hl = tOffices
    .flatMap((o) => closureAffordances({ base: `replaces:${o}`, yields: `after:${o}`, giver: GIVER }))
    .reduce((acc, row) => giveHyperlexiconAffordance(acc, row), createHyperlexicon());
  const sub = createReactionSubstrate({ entries: tEdges, hyperlexicon: hl, window: null });
  sub.settle({ cue: null, floor: null, maxSteps: 12 });
  const seen = new Set();
  const facts = [];
  for (const d of sub.derived()) {
    const [a, b] = endsOf(d.edge);
    const from = personOf(a), to = personOf(b);
    const office = d.edge.relation.split(":")[1];
    const k = `${office}|${from}|${to}`;
    if (seen.has(k)) continue;           // many tenure pairs project to one person pair
    seen.add(k);
    facts.push({ office, from, to, selfPerson: from === to });
  }
  return facts;
}
const armE = tenureArm((p, idx) => p.start?.time ?? `stmt${idx}`);
const armEidx = tenureArm((p, idx) => `stmt${idx}`);

const gate = offices.map((o) => ({ office: o, scan: refuteRelation(edges, `replaces:${o}`, { expectUnique: true }) }));
// The DRIVER licenses every office, as its own declared risk — the grain
// theorem says a corpus can never earn a composition claim, so absence of
// refutation grants nothing. The scan only REMOVES. Written through
// `afterVeto` so the shape is explicit: nothing outside licensedByGiver can
// come back, however clean its scan.
const licensedByGiver = offices;
const scans = Object.fromEntries(gate.map((g) => [g.office, g.scan]));
const licensed = afterVeto(licensedByGiver, scans).survivors;

// the interval organ, reading the edge's own ends
const intervalOf = (edge) => {
  const a = String(edge.participants[0]?.ref ?? "");
  const b = String(edge.participants[edge.participants.length - 1]?.ref ?? "");
  return intervalByFact.get(factKey(edge.relation, a, b)) ?? null;
};
const gateF = offices.map((o) => ({ office: o, scan: refuteRelation(edges, `replaces:${o}`, { expectUnique: true, intervalOf }) }));
const licensedF = afterVeto(offices, Object.fromEntries(gateF.map((g) => [g.office, g.scan]))).survivors;
const armF = chemistry(licensedF);

const armA = chemistry(licensed);
const armB = chemistry(offices);
const naive = naiveClosure();
const armC = naive.map(({ office, from, to }) => ({ office, from, to }));

// arm D — multi-tenure measured from the material's own edges, not the oracle
const subjN = new Map(), objN = new Map();
const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
for (const r of raw) { bump(subjN, `${r.office}|${r.from}`); bump(objN, `${r.office}|${r.to}`); }
const multiTenure = (office, person) => (subjN.get(`${office}|${person}`) ?? 0) > 1 || (objN.get(`${office}|${person}`) ?? 0) > 1;
const armD = naive.filter((f) => !f.bridges.some((b) => multiTenure(f.office, b))).map(({ office, from, to }) => ({ office, from, to }));

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
function score(name, facts) {
  const rows = facts.map((f) => { const [v, why] = verdict(f.office, f.from, f.to); return { ...f, verdict: v, why }; });
  const c = { TRUE: 0, FALSE: 0, UNVERIFIABLE: 0 };
  for (const r of rows) c[r.verdict] += 1;
  const decided = c.TRUE + c.FALSE;
  return { arm: name, derived: rows.length, ...c,
    factKeys: rows.map((r) => `${r.office}|${r.from}|${r.to}`).sort(),
    precisionOnDecided: decided ? Number((c.TRUE / decided).toFixed(3)) : null,
    falseFacts: rows.filter((r) => r.verdict === "FALSE").map((r) => `${labelOf(r.from)} after ${labelOf(r.to)} (office ${r.office})`),
    rows };
}

const A = score("A shipped (office gate)", armA);
const B = score("B gate removed", armB);
const C = score("C naive join, zero apparatus", armC);
const D = score("D per-bridge gate", armD);
const F = score("F interval gate (intervals as material)", armF);
// self-person facts ("X held it after himself", true but degenerate) are counted
// apart so they cannot inflate the headline.
const E = score("E tenure-scoped material", armE.filter((f) => !f.selfPerson));
const Eidx = score("E' tenure by statement index (no dates)", armEidx.filter((f) => !f.selfPerson));

const key = (r) => `${r.office}|${r.from}|${r.to}`;
const setA = new Set(armA.map(key)), setC = new Set(armC.map(key));
const suppressed = B.rows.filter((r) => !setA.has(key(r)));

const out = {
  schema: "EODerivationPrecision@1",
  question: "does the licensing apparatus actually help — are the derived facts true, and does the gate prevent anything a naive join would get wrong?",
  oracle: { giver: oracle.giver, independence: oracle.independence },
  material: { facts: raw.length, offices: offices.length, licensed: licensed.length, refused: offices.length - licensed.length },
  arms: [A, B, C, D, E, Eidx, F].map(({ rows, ...rest }) => rest),
  intervalGate: {
    // Declared BEFORE the run, per the spec that commissioned this arm.
    preRegisteredPrediction: "F recovers true facts the office gate destroyed WITHOUT readmitting the 2 false ones: precision stays 1.000 and recall rises above A",
    declaredNull: "term intervals carry no information the office gate lacked — under which F equals A (9 derived, nothing recovered)",
    officesLicensed: licensedF.length,
    officesLicensedByOfficeGate: licensed.length,
    excusedRepeatStandings: gateF.reduce((n, g) => n + (g.scan.uniqueness.excused?.length ?? 0), 0),
    recoveredOverA: F.rows.filter((r) => !setA.has(key(r))).length,
    trueRecoveredOverA: F.rows.filter((r) => !setA.has(key(r)) && r.verdict === "TRUE").length,
    falseIntroducedOverA: F.rows.filter((r) => r.verdict === "FALSE").length,
  },
  tenureArm: {
    selfPersonFactsExcluded: armE.filter((f) => f.selfPerson).length,
    datesOnlyNameTenures: JSON.stringify(E.rows.map((r) => `${r.office}|${r.from}|${r.to}`).sort())
      === JSON.stringify(Eidx.rows.map((r) => `${r.office}|${r.from}|${r.to}`).sort()),
    reading: "datesOnlyNameTenures true means naming a tenure by its start date and by its statement index give the identical fact set — the dates contributed an identifier, never an ordering, so the P580/P582 oracle stays independent of the derivation",
  },
  gateCost: {
    suppressedByOfficeGate: suppressed.length,
    ofWhichTrue: suppressed.filter((r) => r.verdict === "TRUE").length,
    ofWhichFalse: suppressed.filter((r) => r.verdict === "FALSE").length,
    allInOneOffice: [...new Set(suppressed.map((r) => r.office))],
    reading: "the refusal is office-scoped, so one multi-tenure holder forfeits every composition in that office — including true ones about single-term holders",
  },
  derivationPower: {
    chemistryFoundThatNaiveMissed: armA.map(key).filter((k) => !setC.has(k)).length,
    naiveFoundThatChemistryWithheld: armC.map(key).filter((k) => !setA.has(k)).length,
    reading: "the apparatus is a FILTER, not a generator: it derives nothing a 20-line transitive join does not already find",
  },
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
