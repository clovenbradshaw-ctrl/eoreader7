// eval/full-circuit.mjs — the three ways of knowing in RELAY, on one
// material, every handoff's refusal exercised.
//
// The question this answers (asked directly, 2026-09-02): "does our core
// mechanism do all three?" The honest answer was no — no single mechanism
// does, on purpose, and the separation is enforced in code (signal.js has
// zero composition vocabulary; reaction.js has zero perturbation
// vocabulary; hl-acquire stops at CANDIDATE, never GIVEN). What did not
// exist was one driver running the whole relay end to end, so "the pieces
// compose" could be upgraded to "the circuit is measured". This is that
// driver.
//
// THE RELAY, and the wall at each handoff:
//   1. DISCOVERY    (perturbation)  signal.js finds structure under the
//                                    search-aware null — or a measured
//                                    absence on the noise arm.
//   2. ARRANGEMENTS (ostension)     event-arrangements: edges with
//                                    self-verified event-ordinal addresses.
//   3. CORROBORATION (triangulation) the hyperlexicon folds witnesses; only
//                                    notes at >=2 SOURCES and >=2
//                                    INSTRUMENTS proceed. A planted
//                                    one-source edge is STOPPED HERE.
//   4. ACQUISITION  (refutation)    hl-acquire nominates `precedes` as a
//                                    functional CANDIDATE — never GIVEN.
//   5. DECLARATION  (testimony)     a NAMED giver promotes the candidate;
//                                    without this step the chemistry
//                                    yields nothing (the control proves it).
//   6. COMPOSITION  (construction)  reaction.js derives never-stated facts
//                                    with provenance to real addresses.
//   7. VETO         (refutation)    auditChemistry over raw+derived; the
//                                    control arm that SKIPS wall 3 lets a
//                                    cycle in, and the veto catches it.
//
// MATERIAL: a relay of handovers a->b->c->d->e, recorded twice (two
// sources) and read by two instruments, with noise tokens between
// handovers and ONE planted cycle-closer (e->a) in source-1 only. Ground
// truth by construction: `a precedes c` is TRUE and never stated; `e
// precedes a` is planted, uncorroborated, and would make the relation
// cyclic if it ever reached composition.
import { findSignal, phrase } from "../../eoreader7/native/organs/index.js";
import { discoverCompanyKinds } from "../../eoreader7/native/organs/index.js";
import { arrangementsFrom, arrangementNotes } from "../../eoreader7/native/organs/index.js";
import { makeHyperlexicon } from "../hyperlexicon.js";
import { distinctSources, distinctRecipes } from "../../eoreader7/native/organs/index.js";
import { acquireCandidates, promoteAndDeclare } from "../hl-acquire.js";
import { stageFromEdges } from "../hl.js";
import * as TL from "../../eoreader7/native/kernel/task-log.js";
import { hyperedge } from "../../eoreader7/native/kernel/hypergraph.js";
import { createHyperlexicon as createChemistry, giveHyperlexiconAffordance } from "../../eoreader7/native/kernel/hyperlexicon.js";
import { createReactionSubstrate, closureAffordances } from "../../eoreader7/native/kernel/reaction.js";
import { auditChemistry, vetoedPairs } from "../../eoreader7/native/kernel/refutation.js";
import { createDeclarationLog, foldDeclarations } from "../../eoreader7/native/interpretation/declarations.js";

const say = (s) => console.log(s);
const wall = (n, name, ok, detail) => say(`  wall ${n} ${name.padEnd(14)} ${ok ? "held ✓" : "BREACHED ✗"}  ${detail}`);

// ── the material ──────────────────────────────────────────────────────────
const lcg = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const CHAIN = ["a", "b", "c", "d", "e"];
const NOISE = ["n1", "n2", "n3", "n4", "n5", "n6"];
function relayLog(seed, { plantCycle }) {
  const r = lcg(seed);
  const phrases = [];
  for (let k = 0; k < 24; k++) {
    for (let i = 0; i + 1 < CHAIN.length; i++) {
      // a handover phrase: some noise, the pair, some noise
      const toks = [NOISE[Math.floor(r() * 6)], CHAIN[i], CHAIN[i + 1], NOISE[Math.floor(r() * 6)]];
      phrases.push({ text: toks.join(" ") });
    }
    if (plantCycle && k % 3 === 0) phrases.push({ text: `${NOISE[Math.floor(r() * 6)]} e a ${NOISE[Math.floor(r() * 6)]}` });
  }
  return phrases;
}
const SOURCES = [
  { ref: "relay-log-1", material: relayLog(7, { plantCycle: true }) },   // carries the planted e->a
  { ref: "relay-log-2", material: relayLog(4242, { plantCycle: false }) },
];
const INSTRUMENTS = [
  { recipe: "phrases-as-given@v1", discretize: (m) => m },
  { recipe: "phrases-paired@v1", discretize: (m) => { const out = []; for (let i = 0; i + 1 < m.length; i += 2) out.push({ text: m[i].text + " " + m[i + 1].text }); return out; } },
];
const VOCAB = [...CHAIN, ...NOISE];

say("── THE FULL CIRCUIT: three ways of knowing in relay ──\n");

// ── 1. DISCOVERY (perturbation) ───────────────────────────────────────────
const found = await findSignal(SOURCES, {
  instruments: INSTRUMENTS, vocabulary: VOCAB, discoverKinds: discoverCompanyKinds, clean: (t) => t,
  draws: 100, seed: 0, alpha: 0.05, minMentions: 8, minShare: 0.5, minMembers: 1,
});
say(`1. DISCOVERY — ${phrase(found)}`);
for (const f of found.findings) say(`     ${f.subject} -> ${f.kind}  share ${f.share.toFixed(2)}  src ${f.sources.length} inst ${f.instruments.length}`);
// WHAT DISCOVERY CAN AND CANNOT SEE HERE — a finding, not a shortfall. A
// KIND asks "what always precedes X"; in a relay every MIDDLE station both
// receives (preceded by its predecessor) and hands over (phrase-initial,
// preceded by noise), so b/c/d sit at share exactly 0.50 — split company —
// and do not beat a 0.50 ceiling. Only `e`, which never opens a phrase,
// is unambiguous: found, and corroborated 2 sources x 2 instruments. The
// ARRANGEMENT a->b (floor 2) is still 100% recurrent — the two floors
// answer different questions, which is exactly why the relay needs both.
const eKind = found.findings.find((f) => f.subject === "e" && f.kind === "kind:before=d");
wall(1, "perturbation", !found.refused && found.control.passed && Boolean(eKind?.corroborated),
  `e<-d beats the ceiling ${found.searchCeiling?.toFixed(3)} and is corroborated 2x2; middle stations split their company (share 0.50, by construction); control ${found.control?.passed ? "passed" : "survived"}`);
// the refusal, exercised: pure noise finds nothing
const noiseOnly = await findSignal(
  [{ ref: "noise-1", material: (() => { const r = lcg(99); return Array.from({ length: 96 }, () => ({ text: [0, 1, 2, 3].map(() => NOISE[Math.floor(r() * 6)]).join(" ") })); })() }],
  { instruments: INSTRUMENTS, vocabulary: NOISE, discoverKinds: discoverCompanyKinds, clean: (t) => t, draws: 100, seed: 0, alpha: 0.05, minMentions: 8, minShare: 0.5, minMembers: 1 });
wall(1, "(noise arm)", !noiseOnly.refused && noiseOnly.findings.length === 0, `noise: ${noiseOnly.findings?.length ?? "refused"} findings — a measured absence`);

// ── 2. ARRANGEMENTS (ostension) + 3. CORROBORATION (triangulation) ───────
const hl = makeHyperlexicon(TL);
let log = hl.createHyperlexicon();
let spanChecks = 0;
for (const src of SOURCES) for (const inst of INSTRUMENTS) {
  const stream = inst.discretize(src.material);
  const { arrangements } = arrangementsFrom(stream, { ref: src.ref, label: "precedes", minRecurrence: 4 });
  spanChecks += arrangements.reduce((n, a) => n + a.spans.length, 0);
  for (const n of arrangementNotes(arrangements, { witness: src.ref, recipe: inst.recipe })) log = hl.hear(log, n);
}
const notes = hl.foldHyperlexicon(log).filter((n) => n.verb === "precedes" && CHAIN.includes(n.subject) && CHAIN.includes(n.object));
say(`\n2. ARRANGEMENTS — ${notes.length} chain notes on the ledger, ${spanChecks} event-ordinal spans self-verified at the cut`);
wall(2, "ostension", spanChecks > 0 && notes.every((n) => n.spans.length > 0), "every note carries addresses in its stream's own coordinates");

const corroborated = notes.filter((n) => distinctSources(n.witnesses).size >= 2 && distinctRecipes(n.witnesses).size >= 2);
const stopped = notes.filter((n) => !corroborated.includes(n));
say(`3. CORROBORATION — ${corroborated.length} notes at >=2 sources AND >=2 instruments proceed; ${stopped.length} stopped`);
for (const n of stopped) say(`     stopped: ${n.subject} precedes ${n.object}  (sources ${distinctSources(n.witnesses).size}, instruments ${distinctRecipes(n.witnesses).size})`);
const plantedStopped = stopped.some((n) => n.subject === "e" && n.object === "a");
wall(3, "triangulation", plantedStopped && corroborated.length === 4, `the planted e->a (one source) is stopped; the 4 real handovers proceed`);

// ── 4. ACQUISITION (refutation, candidate never given) ───────────────────
// polarity "+" is DECLARED here: an arrangement read off a handover stream
// has no negation (there is nothing in the medium that could say "a did
// NOT precede b"), and the acquisition scan rightly refuses an edge whose
// polarity is unknown — found by the scan skipping every edge silently on
// the first run (its `polarity !== "+"` gate), not by review.
const edgesFor = (ns) => ns.map((n) => ({ id: `note:${n.id}`, end1: n.subject, label: n.verb, end2: n.object, polarity: "+", refs: n.witnesses, spans: n.spans }));
const cleanEdges = edgesFor(corroborated);
let declarations = createDeclarationLog();
const acquired = acquireCandidates(declarations, cleanEdges, { source: "relay-logs (corroborated notes only)" });
declarations = acquired.log;
const cand = foldDeclarations(declarations).candidates.find((c) => c.rel === "precedes");
say(`\n4. ACQUISITION — candidates: ${acquired.proposed.map((p) => p.rel).join(", ") || "(none)"}`);
wall(4, "candidate-only", Boolean(cand) && foldDeclarations(declarations).given.length === 0, `"precedes" is a CANDIDATE (functional over ${cleanEdges.length} corroborated edges), and nothing is GIVEN`);

// ── 5. DECLARATION (testimony) — and the control without it ──────────────
const toSubstrateEdges = (edges, tag) => edges.map((e) => hyperedge({
  id: `${tag}:${e.id}`, relation: e.label,
  participants: [{ ref: e.end1, standing: "referent", identity: "relay", display: e.end1, role: null }, { ref: e.end2, standing: "referent", identity: "relay", display: e.end2, role: null }],
  witness: e.spans?.[0]?.at ?? `${tag}#${e.id}`, meta: { source: tag, witnesses: e.refs ?? [], spans: (e.spans ?? []).map((s) => s.at) },
}));
const subEdges = toSubstrateEdges(cleanEdges, "clean");
const unlicensed = createReactionSubstrate({ entries: subEdges, hyperlexicon: createChemistry(), window: null }).settle({ cue: null, floor: null, maxSteps: 8 });
wall(5, "no-license", unlicensed.derived.length === 0, `without a giver's declaration the chemistry derives ${unlicensed.derived.length} — construction cannot self-license`);

const GIVER = "eval/full-circuit.mjs — a stand-in giver, DISCLOSED as such: the relay's handover semantics are declared by this driver, never by the material";
const stage = stageFromEdges(cleanEdges);
({ log: declarations } = promoteAndDeclare(declarations, stage, "precedes", { giver: GIVER }));
say(`5. DECLARATION — "precedes" promoted by a NAMED giver; given: ${foldDeclarations(declarations).given.map((g) => g.rel).join(", ")}`);
wall(5, "testimony", foldDeclarations(declarations).given.some((g) => g.rel === "precedes" && g.giver === GIVER), "the license carries its giver's name");

// ── 6. COMPOSITION (construction) ────────────────────────────────────────
let chemistry = createChemistry();
for (const row of closureAffordances({ base: "precedes", yields: "before", giver: GIVER })) chemistry = giveHyperlexiconAffordance(chemistry, row);
const preAudit = auditChemistry(subEdges, chemistry);
const substrate = createReactionSubstrate({ entries: subEdges, hyperlexicon: chemistry, window: null });
const settled = substrate.settle({ cue: null, floor: null, maxSteps: 12, veto: vetoedPairs(preAudit) });
const byId = new Map(substrate.edges().map((e) => [e.id, e]));
const provenance = (id, acc = []) => { const e = byId.get(id); if (!e?.meta?.derived) { acc.push(e?.witness); return acc; } for (const p of e.meta.parents) provenance(p, acc); return acc; };
say(`\n6. COMPOSITION — ${settled.derived.length} never-stated fact(s) derived`);
for (const d of settled.derived.slice(0, 6))
  say(`     ${d.from} before ${d.to}  (depth ${d.depth}, ${d.paths} path(s); provenance: ${[...new Set(provenance(d.edge.id))].join(", ")})`);
const aBeforeC = settled.derived.find((d) => d.from === "a" && d.to === "c");
const aBeforeE = settled.derived.find((d) => d.from === "a" && d.to === "e");
wall(6, "construction", Boolean(aBeforeC) && Boolean(aBeforeE) && !settled.derived.some((d) => d.from === d.to),
  `a before c and a before e derived (never stated), no self-loop, every product walking to real addresses`);

// ── 7. VETO — the control arm that SKIPS wall 3 ───────────────────────────
const postAudit = auditChemistry(substrate.edges(), chemistry);
wall(7, "veto (clean)", !postAudit.some((r) => r.refuted), `raw+derived audited: ${postAudit.filter((r) => r.refuted).length} refutation(s) on the clean circuit`);

const leaky = edgesFor(notes); // ALL notes, the planted e->a included — triangulation's wall skipped on purpose
const leakyEdges = toSubstrateEdges(leaky, "leaky");
const leakyAudit = auditChemistry(leakyEdges, chemistry);
const leakySub = createReactionSubstrate({ entries: leakyEdges, hyperlexicon: chemistry, window: null });
const leakySettled = leakySub.settle({ cue: null, floor: null, maxSteps: 12, veto: vetoedPairs(leakyAudit) });
const leakyPost = auditChemistry(leakySub.edges(), chemistry);
const cycleCaught = leakyAudit.some((r) => r.refuted) || leakyPost.some((r) => r.refuted) || (leakySettled.vetoed?.size ?? 0) > 0;
say(`7. VETO — control arm skipping wall 3: pre-audit refuted ${leakyAudit.filter((r) => r.refuted).length}, post-audit refuted ${leakyPost.filter((r) => r.refuted).length}, derived ${leakySettled.derived.length}`);
wall(7, "veto (leaky)", cycleCaught, `the planted cycle-closer, let past triangulation, is caught by refutation instead — two independent walls, one corruption`);

say(`\nEvery product of construction walks to an ostension address; every license names its giver; every count is of independent readings.`);
