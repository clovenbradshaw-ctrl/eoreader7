// eval/mechanical-reasoning.mjs — the full circle, on real received data:
// content → EOT admission (the-fold hyperlexicon, P57) → the engine's
// reaction substrate (eoreader7 native/kernel/reaction.js) → never-stated
// facts derived mechanically under giver-licensed chemistry, with
// provenance walking back to byte addresses in the received files.
//
// MATERIAL: the three committed Wikidata fixtures (Q273546 Hannibal Hamlin,
// Q8612 Andrew Johnson, Q11699 the VP office — real captured EntityData,
// P56's own fixtures), parsed by the-fold's own wikidata.js. Succession
// facts are read off P39's replaces/replaced_by qualifiers; every
// assertion's span is a REAL byte address into the fixture file,
// self-verified before use (P5.2). Address precision is disclosed: the span
// points at the first place the file states that qid as a value, which is
// real bytes stating the fact's object — not a parse tree's exact
// qualifier node.
//
// THE CHEMISTRY IS OFFICE-SCOPED, and that is a soundness decision, not
// tidiness. `replaces` means immediate succession IN ONE OFFICE. Composing
// "A replaced B in office X" with "B replaced C in office Y" through the
// shared person is UNSOUND: A's start is B's X-end, C's end is B's Y-start,
// and nothing orders B's X-term against B's Y-term (Johnson entered the
// presidency in 1865 and the Senate in 1875 — a successor to his Senate
// seat postdates 1875, but a successor to his presidency, Grant, took
// office in 1869, BEFORE that seat's previous holder's term ended). So the
// relation itself carries the office (`replaces:<positionQid>`), and the
// closure is declared per office — chains across offices never bond because
// their relation strings differ. The chemistry encodes its own scope.
//
// AND OFFICE-SCOPING ALONE WAS NOT ENOUGH — found by RUNNING it, not by
// reasoning about it (P5.5). The first run derived BOTH DIRECTIONS of one
// pair for the Senate seat ("Hamlin after Q474290" and "Q474290 after
// Hamlin"), because Hamlin held that office for MULTIPLE TERMS and a
// person-level bridge conflates two different tenures: (A replaces B)'s B
// is one term, (B replaces C)'s B may be another, and nothing orders A's
// accession against C's departure across them. The identity the bridge
// needs is the TENURE, and Wikidata's qualifiers name only the PERSON —
// the referent-model lesson (P30/P38) at the term level: "the same person"
// is not "the same tenure". The sound, mechanical gate: person-bridged
// composition for an office is licensed only where `replaces:<office>` is
// FUNCTIONAL and INVERSE-FUNCTIONAL over persons in this material (nobody
// begins or leaves the office twice) — HL's own R2 vocabulary, checked by
// refutation search per office. An office with a counterexample gets NO
// chemistry, with the refuting person and their partners named; per the
// grain theorem the unrefuted ones are licensed as the DRIVER's declared
// risk (a named process-giver, declarations.js's own promote() wording),
// never as facts a corpus proved. A finer gate — refusing only chains
// whose BRIDGE person is multi-tenure, keeping single-tenure bridges in a
// refused office — is real, named future work; the reaction substrate
// consults affordances per relation pair and has no per-bridge veto hook.
//
// ARMS:
//   0  admission     the door's own counts; a fact stated by two fixtures
//                    folds to ONE note with TWO witnesses (P57 live)
//   1  control       empty hyperlexicon: everything withheld, zero derived
//   2  chemistry     per-office closure given: the transitive order derived,
//                    each fact with giver + provenance to fixture bytes
//   3  physics       cue + declared floor + measured-style window: the
//                    reaction front is visible in the per-step trace
//   4  priors        the compiled-priors artifact (eval/predigest-priors.mjs)
//                    gates candidate nominations — expected result on THIS
//                    material: zero pass, because the canon corpus never met
//                    `replaces:<qid>`; the gate refusing is the measurement
//
// Re-runnable eval driver, not a committed regression test. Writes
// eval/results/mechanical-reasoning.json.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hyperedge } from "../../eoreader7/native/kernel/hypergraph.js";
import { createTaskLog, append, projectTasks, ENTRY_KINDS, OPERATOR_BASIS } from "../../eoreader7/native/kernel/task-log.js";
import { GRAINS } from "../../eoreader7/native/kernel/cube.js";
import { createHyperlexicon, giveHyperlexiconAffordance } from "../../eoreader7/native/kernel/hyperlexicon.js";
import { acquireCompositionCandidates } from "../../eoreader7/native/kernel/relation-composition.js";
import { createReactionSubstrate, closureAffordances, nominateFromExperience } from "../../eoreader7/native/kernel/reaction.js";
import { refuteRelation, auditChemistry, vetoedPairs, afterVeto } from "../../eoreader7/native/kernel/refutation.js";

import { parseEntity } from "../wikidata.js";
import { makeHyperlexicon } from "../hyperlexicon.js";
import { adaptTaskLog } from "../consequence.js";
import { assertionEdges, loadCompiledPriors } from "../predigest.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, "fixtures", "wikidata");
const OUT = path.join(HERE, "results", "mechanical-reasoning.json");
const COMPILED = path.join(HERE, "results", "compiled-priors.json");

const CHEM_GIVER = "wikidata:P1365/P1366 immediate-succession semantics; per-office transitive closure declared by eval/mechanical-reasoning.mjs (cross-office composition is unsound — see this driver's header)";

const foldHl = makeHyperlexicon({ ...adaptTaskLog({ createTaskLog, append, ENTRY_KINDS, OPERATOR_BASIS, GRAINS }), projectTasks });

// ── read the received files, address every fact into their own bytes ──────
const files = fs.readdirSync(FIXTURES).filter((f) => f.endsWith(".json")).sort();
const raws = new Map(files.map((f) => [f, fs.readFileSync(path.join(FIXTURES, f), "utf8")]));
const entities = files.map((f) => parseEntity(JSON.parse(raws.get(f)))).filter(Boolean);
const labels = new Map(); // lowercase qid -> label
for (const e of entities) if (e.label) labels.set(e.qid.toLowerCase(), e.label);
const labelOf = (ref) => labels.get(ref) ?? `${ref.toUpperCase()} (label unresolved — no fixture on disk)`;

function addressOf(file, qid) {
  const raw = raws.get(file);
  const needle = `"id":"${qid}"`;
  const start = raw.indexOf(needle);
  if (start < 0) return null;
  // P5.2: the address is self-verified against the received bytes before use.
  if (raw.slice(start, start + needle.length) !== needle) throw new Error(`address self-verification failed: ${file}#${start}`);
  return { ref: `wikidata/${file}`, start, end: start + needle.length, text: needle };
}

const offered = [];
for (let i = 0; i < entities.length; i += 1) {
  const e = entities[i];
  const file = files[i];
  for (const p of e.positions ?? []) {
    const rel = `replaces:${p.position}`;
    if (p.replaces) {
      const span = addressOf(file, p.replaces);
      offered.push({ witness: file, assertion: { subject: e.qid, verb: rel, object: p.replaces, spans: span ? [span] : [] } });
    }
    if (p.replacedBy) {
      const span = addressOf(file, p.replacedBy);
      offered.push({ witness: file, assertion: { subject: p.replacedBy, verb: rel, object: e.qid, spans: span ? [span] : [] } });
    }
  }
}

// ── arm 0: admission through the fold's own door, one witness per file ─────
let log = foldHl.createHyperlexicon();
let heardTotal = 0;
const turnedAwayAll = [];
for (const file of files) {
  const batch = offered.filter((o) => o.witness === file).map((o) => o.assertion);
  const result = foldHl.admit(log, batch, { witness: `wikidata/${file}` });
  log = result.log;
  heardTotal += result.heard.length;
  turnedAwayAll.push(...result.turnedAway);
}
const folded = foldHl.foldHyperlexicon(log);
const corroborated = folded.filter((a) => a.witnesses.length >= 2);

const { edges, skipped } = assertionEdges(folded, { hyperedge, source: "wikidata-fixtures" });
const offices = [...new Set(folded.map((a) => a.verb))].map((v) => v.split(":")[1]);

// ── the tenure gate, now the KERNEL's organ rather than this driver's ─────
// This check was hand-written here, inline, when the live run surfaced the
// multi-tenure bug. It is now `kernel/refutation.js::refuteRelation` — the
// same two shapes (uniqueness violation, cycle) generalized out of this
// driver so one implementation answers "what does the material positively
// say against composing this relation" everywhere. The falsification probe
// (eval/results/falsification-RESULTS.md) is why it is a VETO organ and not
// a licensing one: structurally identical chains with opposite ground truth
// are indistinguishable to it, so `refuted: false` is never a licence and
// the organ says so on every result it returns.
//
// Faithfulness is checked, not assumed: the verdicts below must reproduce
// the hand-written check's own answer (6 offices licensed, the Senate seat
// refused on Hamlin's three distinct predecessors), and `power` discloses
// any office too thin for the scan to have refuted anything at all.
const officeGate = offices.map((office) => {
  // `expectUnique` is DECLARED, not assumed: immediate succession in one
  // office is 1:1 (that claim is what the tenure bug violated). The organ
  // refuses to guess — see refutation.js on why an undeclared relation gets
  // the cycle check alone.
  const scan = refuteRelation(edges, `replaces:${office}`, { expectUnique: true });
  return {
    office,
    label: labelOf(office.toLowerCase()),
    // NOT "the scan licensed it": this driver licenses every office as its own
    // declared risk, and the scan only removes. `licensedOffices` below is
    // computed through afterVeto so nothing unlicensed can survive; this field
    // reports that office's own outcome under it.
    licensed: afterVeto([office], { [office]: scan }).survivors.length === 1,
    power: scan.power,
    examined: scan.examined,
    reasons: scan.reasons,
    refutations: [
      ...scan.uniqueness.violations.map((v) => ({
        person: labelOf(v.referent),
        evidence: v.side === "functional" ? "began the office twice" : "left the office twice",
        partners: v.partners.map(labelOf),
      })),
      ...scan.cycles.examples.map((c) => ({ evidence: "cycle", chain: c.map(labelOf) })),
    ],
    disclosure: scan.disclosure,
  };
});
const licensedOffices = afterVeto(
  offices,                                            // what the giver licensed
  Object.fromEntries(officeGate.map((g) => [g.office, { refuted: !g.licensed, reasons: g.reasons }])),
).survivors;

// ── arm 1: control — no given chemistry, nothing derives ──────────────────
const control = createReactionSubstrate({ entries: edges, hyperlexicon: createHyperlexicon(), window: null })
  .settle({ cue: null, floor: null, maxSteps: 8 });

// ── arm 2: per-office closure chemistry, gated, full derivation ───────────
let chemistry = createHyperlexicon();
const affordanceRows = licensedOffices.flatMap((office) =>
  closureAffordances({ base: `replaces:${office}`, yields: `after:${office}`, giver: CHEM_GIVER }));
for (const row of affordanceRows) chemistry = giveHyperlexiconAffordance(chemistry, row);

const substrate = createReactionSubstrate({ entries: edges, hyperlexicon: chemistry, window: null });

// Two walls, not one, and they answer different questions. The office gate
// above decides WHICH chemistry is given at all. The audit re-asks, of the
// chemistry that was given, whether the material refutes it — and it must
// agree with the gate here (both read the same organ over the same edges),
// so disagreement would be a real finding rather than a formality.
const preAudit = auditChemistry(edges, chemistry);
const settled = substrate.settle({ cue: null, floor: null, maxSteps: 12, veto: vetoedPairs(preAudit) });

// The audit run AGAIN over raw PLUS derived edges. This is the one check
// the gate structurally cannot make: a closure that contradicts itself only
// does so once its own products exist (a derived "after" cycle refutes the
// closure that produced it). Nothing licenses this beyond the same scan.
const postAudit = auditChemistry(substrate.edges(), chemistry);
const selfRefuted = postAudit.filter((row) => row.refuted);

const edgeById = new Map(edges.map((e) => [e.id, e]));
for (const d of settled.derived) edgeById.set(d.edge.id, d.edge);
const provenanceOf = (edgeId, acc = []) => {
  const edge = edgeById.get(edgeId);
  if (!edge?.meta?.derived) { acc.push(edge.witness); return acc; }
  for (const parent of edge.meta.parents) provenanceOf(parent, acc);
  return acc;
};
const sentence = (d) => {
  const office = labelOf(d.relation.split(":")[1].toLowerCase());
  return `${labelOf(d.from)} held "${office}" after ${labelOf(d.to)} — derived (depth ${d.depth}, ${d.paths} path(s)), never stated by any fixture; witnesses: ${[...new Set(provenanceOf(d.edge.id))].join(", ")}`;
};

// ── arm 3: physics — cue Hamlin, declared floor, window 8 ─────────────────
const physicsSubstrate = createReactionSubstrate({ entries: edges, hyperlexicon: chemistry, window: 8 });
const physics = physicsSubstrate.settle({ cue: ["q273546"], floor: 0.05, maxSteps: 12 });

// ── arm 4: the compiled priors gate the nominations ───────────────────────
let priorsArm = { gap: "not-present", detail: "eval/results/compiled-priors.json not found — run eval/predigest-priors.mjs first" };
if (fs.existsSync(COMPILED)) {
  const loaded = loadCompiledPriors(JSON.parse(fs.readFileSync(COMPILED, "utf8")));
  if (loaded.refused) priorsArm = { refused: loaded.refused };
  else {
    const candidates = acquireCompositionCandidates(edges, { minWitnesses: 2 });
    const gated = nominateFromExperience([loaded.experience], candidates);
    priorsArm = {
      compiledWorks: loaded.composed.sourceCount,
      observedCandidates: candidates.length,
      nominated: gated.length,
      reading: gated.length === 0
        ? "the gate refused every nomination: the compiled canon corpus never met these relation forms — cross-work memory cannot vouch for chemistry it has not seen, which is the gate working, not failing"
        : gated.map((g) => ({ left: g.left, right: g.right, workSupport: g.meta.workSupport })),
    };
  }
}

// ── report ────────────────────────────────────────────────────────────────
const out = {
  schema: "EOMechanicalReasoning@1",
  declared: { chemGiver: CHEM_GIVER, physics: { window: 8, floor: 0.05, cue: ["q273546 (Hannibal Hamlin)"] }, maxSteps: 12 },
  material: {
    fixtures: files,
    entities: entities.map((e) => ({ qid: e.qid, label: e.label, positions: e.positions.length })),
    offered: offered.length,
    unaddressed: offered.filter((o) => !o.assertion.spans.length).length,
  },
  admission: {
    heard: heardTotal,
    turnedAway: turnedAwayAll.map((t) => ({ reason: t.reason, detail: t.detail })),
    notes: folded.length,
    corroborated: corroborated.map((a) => ({
      assertion: `${labelOf(a.subject.toLowerCase?.() ?? a.subject)} —${a.verb}→ ${labelOf(a.object.toLowerCase?.() ?? a.object)}`,
      witnesses: a.witnesses,
      spans: a.spans.map((s) => s.at),
    })),
    projected: { edges: edges.length, skipped },
  },
  control: { derived: control.derived.length, withheld: control.withheld, quiescent: control.quiescent },
  chemistry: {
    officeGate,
    licensedOffices: licensedOffices.length,
    refusedOffices: officeGate.filter((g) => !g.licensed).length,
    affordanceRows: affordanceRows.length,
    quiescent: settled.quiescent,
    steps: settled.steps,
    derived: settled.derived.map((d) => ({ relation: d.relation, from: d.from, to: d.to, depth: d.depth, paths: d.paths, sentence: sentence(d) })),
    withheld: settled.withheld,
    vetoed: settled.vetoed,
    terminal: settled.terminal.length,
  },
  audit: {
    organ: "eoreader7 native/kernel/refutation.js — the veto organ; refuted:false is never a licence",
    preSettle: { rows: preAudit.length, refuted: preAudit.filter((r) => r.refuted).length, partialPower: preAudit.filter((r) => r.power !== "sufficient").length },
    postSettle: { rows: postAudit.length, refuted: selfRefuted.length, detail: selfRefuted.map((r) => ({ left: r.left, right: r.right, reasons: r.refutedBy.flatMap((s) => s.reasons) })) },
    agreesWithGate: preAudit.filter((r) => r.refuted).length === 0,
    selfConsistent: selfRefuted.length === 0,
    reading: selfRefuted.length === 0
      ? "the closure's own products contradict none of it — no derived cycle, no uniqueness violation introduced by derivation"
      : "the closure contradicts itself once its products exist — the licence is refuted BY WHAT IT PRODUCED and must be conceded",
  },
  physics: { steps: physics.steps, derived: physics.derived.length, quiescent: physics.quiescent },
  priors: priorsArm,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
