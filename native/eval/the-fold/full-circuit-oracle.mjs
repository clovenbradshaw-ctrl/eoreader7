// eval/full-circuit-oracle.mjs — the full circuit on REAL material, judged
// by an INDEPENDENT oracle. The measurement full-circuit.mjs said it could
// not make: correspondence, not just coherence.
//
// MATERIAL: eval/fixtures/succession-tenures.json — 23 real Wikidata
// entities (Lincoln, Johnson, Hamlin, Grant, Colfax, Breckinridge...), one
// row per P39 tenure with its P1365 (replaces) / P1366 (replaced by)
// qualifiers. Retrieved 2026-08-28, giver on the file.
//
// ORACLE: eval/fixtures/succession-terms.json — the SAME entities' P580
// (start) / P582 (end) term dates. Different properties from the ones the
// derivation reads, so the oracle cannot leak into the derivation. A
// derived "X after Y in office O" is TRUE iff some term of X in O begins
// at or after some term of Y in O ends (P60's own verdict, verbatim).
//
// WHAT THIS MATERIAL GIVES EACH WALL that the relay could only simulate:
//   TRIANGULATION is REAL here. A succession edge X<-Y can be witnessed by
//   X's own record (P1365 "replaces Y") AND by Y's own record (P1366
//   "replaced by X"): two SOURCES (two entity records) through two
//   INSTRUMENTS (two Wikidata properties — same scope, different rule, the
//   spatial run's law by construction). A corroborated edge also resolves
//   IDENTITY at TENURE grain for free — the mutual match names which of
//   Y's tenures X succeeded — which is exactly the grain P60's fourth
//   amendment showed a one-to-one relation needs (a person who held a
//   Senate seat nine times is nine occurrences, not one entity).
//   PERTURBATION is the II.23 control on the ORACLE ITSELF: a REDEALT
//   material (succession targets shuffled among each office's own
//   holders — marginals kept, the relation destroyed) is run through the
//   identical circuit, and its derived facts must score at chance. If the
//   redealt arm scores high, the oracle is not discriminating and every
//   precision number here is void (resolution, II.23).
//
// THREE ARMS, scored apart:
//   N  naive        person grain, ALL edges (P60's own baseline shape)
//   C  the circuit  tenure grain, CORROBORATED edges only (both sources,
//                   both instruments), acquired -> declared -> composed ->
//                   vetoed
//   R  redealt      the circuit over the shuffled material (the control)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { distinctSources, distinctRecipes } from "../corroboration.js";
import { acquireCandidates, promoteAndDeclare } from "../hl-acquire.js";
import { stageFromEdges } from "../hl.js";
import { hyperedge } from "../../eoreader7/native/kernel/hypergraph.js";
import { createHyperlexicon as createChemistry, giveHyperlexiconAffordance } from "../../eoreader7/native/kernel/hyperlexicon.js";
import { createReactionSubstrate, closureAffordances } from "../../eoreader7/native/kernel/reaction.js";
import { auditChemistry, vetoedPairs } from "../../eoreader7/native/kernel/refutation.js";
import { createDeclarationLog, foldDeclarations } from "../../eoreader7/native/interpretation/declarations.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MATERIAL = path.join(HERE, "fixtures", "succession-tenures.json");
const ORACLE = path.join(HERE, "fixtures", "succession-terms.json");
const say = (s) => console.log(s);

// ── the material, addressed into its own bytes (ostension) ────────────────
const rawText = fs.readFileSync(MATERIAL, "utf8");
const material = JSON.parse(rawText);
const oracle = JSON.parse(fs.readFileSync(ORACLE, "utf8"));
const labelOf = (q) => oracle.entities[q]?.label ?? material.entities[q]?.label ?? q;

function addressOf(qid, tenureIdx) {
  // the i-th `"office":` occurrence inside this entity's own block — a real
  // byte span into the file as given, self-verified before it ships
  const entStart = rawText.indexOf(`"${qid}":`);
  if (entStart < 0) return null;
  let at = entStart, found = -1;
  for (let i = 0; i <= tenureIdx; i++) { found = rawText.indexOf(`"office":`, at); if (found < 0) return null; at = found + 1; }
  const end = rawText.indexOf("}", found) + 1;
  const span = { at: `succession-tenures.json#${found}-${end}`, text: rawText.slice(found, end) };
  if (rawText.slice(found, end) !== span.text) throw new Error("address self-verification failed");
  return span;
}

// ── tenure-grain nodes and the two-instrument witness table ──────────────
// node id: qid#office#tenureIndex. The mutual-match rule: X's tenure t in O
// says "replaces Y"; Y's tenure u in O says "replaced by X"; when both, the
// edge is corroborated and its object is RESOLVED to Y's tenure u.
function buildEdges(entities) {
  const tenuresOf = (q, office) => (entities[q]?.tenures ?? []).map((t, i) => ({ ...t, i })).filter((t) => t.office === office);
  const byKey = new Map(); // `${office}|${X}|${Y}` -> { office, X, Y, witnesses:[], resolved:{xt, yt}|null, spans }
  for (const [X, ent] of Object.entries(entities)) {
    (ent.tenures ?? []).forEach((t, i) => {
      if (t.replaces) {
        const key = `${t.office}|${X}|${t.replaces}`;
        const rec = byKey.get(key) ?? { office: t.office, X, Y: t.replaces, witnesses: [], spans: [], xt: i, yt: null };
        rec.witnesses.push(`${X}~P1365`);
        const s = addressOf(X, i); if (s) rec.spans.push(s.at);
        rec.xt = i;
        byKey.set(key, rec);
      }
      if (t.replacedBy) {
        const key = `${t.office}|${t.replacedBy}|${X}`;
        const rec = byKey.get(key) ?? { office: t.office, X: t.replacedBy, Y: X, witnesses: [], spans: [], xt: null, yt: i };
        rec.witnesses.push(`${X}~P1366`);
        const s = addressOf(X, i); if (s) rec.spans.push(s.at);
        rec.yt = i;
        byKey.set(key, rec);
      }
    });
  }
  const all = [...byKey.values()].filter((r) => entities[r.X] && entities[r.Y]); // both ends in the material
  for (const r of all) {
    r.sources = distinctSources(r.witnesses).size;
    r.instruments = distinctRecipes(r.witnesses).size;
    r.corroborated = r.sources >= 2 && r.instruments >= 2;
    // resolve X's tenure when only Y spoke: X's tenure in O that replaces Y
    if (r.xt == null) r.xt = tenuresOf(r.X, r.office).find((t) => t.replaces === r.Y)?.i ?? null;
    if (r.yt == null) r.yt = tenuresOf(r.Y, r.office).find((t) => t.replacedBy === r.X)?.i ?? null;
  }
  return all;
}

const toSubstrate = (recs, { grain, tag }) => recs.map((r) => {
  const n = (q, t) => (grain === "tenure" ? `${q}#${r.office}#${t ?? "?"}` : q);
  return hyperedge({
    // relation strings LOWERCASED here because hl-acquire folds every rel it
    // scans (replaces:q11699) and the declared chemistry is built from that
    // fold — the first run derived 0 everywhere because the substrate's
    // edges said replaces:Q11699 and the affordance said replaces:q11699.
    // Found by the run, not by review; the QID is restored to uppercase
    // only at the oracle lookup.
    id: `${tag}:${r.office}|${r.X}|${r.Y}`, relation: `replaces:${r.office.toLowerCase()}`,
    participants: [
      { ref: n(r.X, r.xt), standing: "referent", identity: grain, display: labelOf(r.X), role: null },
      { ref: n(r.Y, r.yt), standing: "referent", identity: grain, display: labelOf(r.Y), role: null },
    ],
    witness: r.spans[0] ?? `${tag}#${r.X}|${r.Y}`,
    meta: { source: tag, witnesses: r.witnesses, spans: r.spans, corroborated: r.corroborated },
  });
});
const hgEdges = (recs, grain) => recs.map((r) => ({
  id: `${r.office}|${r.X}|${r.Y}`, polarity: "+", label: `replaces:${r.office.toLowerCase()}`,
  end1: grain === "tenure" ? `${r.X}#${r.office}#${r.xt ?? "?"}` : r.X,
  end2: grain === "tenure" ? `${r.Y}#${r.office}#${r.yt ?? "?"}` : r.Y,
  refs: r.witnesses, spans: r.spans.map((at) => ({ at })),
}));

// ── the oracle (P580/P582 only) ───────────────────────────────────────────
const stamp = (t) => (typeof t === "string" && t.length > 10) ? Number(t.slice(1, 5)) * 10000 + Number(t.slice(6, 8)) * 100 + Number(t.slice(9, 11)) : null;
function verdict(office, X, Y) {
  const ex = oracle.entities[X], ey = oracle.entities[Y];
  if (!ex || !ey) return "UNVERIFIABLE";
  const tx = ex.terms[office] ?? [], ty = ey.terms[office] ?? [];
  const xs = tx.map((t) => stamp(t.start)).filter((n) => n !== null), ye = ty.map((t) => stamp(t.end)).filter((n) => n !== null);
  if (!xs.length || !ye.length) return "UNVERIFIABLE";
  return xs.some((x) => ye.some((y) => x >= y)) ? "TRUE" : "FALSE";
}
const person = (ref) => String(ref).split("#")[0];
const tenureIdx = (ref) => { const t = String(ref).split("#")[2]; return t === undefined || t === "?" ? null : Number(t); };
// THE ORACLE AT TENURE GRAIN — P60's own grain lesson applied to the JUDGE.
// The person-grain verdict ("SOME term of X begins after SOME term of Y
// ends") is nearly always true for two holders of one office, so under
// the redeal null a derived fact is TRUE ~0.82 of the time and 8/8 cannot
// discriminate (measured, 50 seeds). The circuit composes at TENURE grain
// (corroboration resolved which tenure succeeded which), so it can be
// judged there: THIS tenure of X begins at/after THAT tenure of Y ends —
// a random tenure pair is "after" only half the time. The judge reads
// only P580/P582; the derivation read only P1365/P1366 and tenure INDICES
// (E-prime's own posture — dates never entered the derivation).
function verdictTenure(office, X, xt, Y, yt) {
  if (xt == null || yt == null) return "UNVERIFIABLE";
  const sx = stamp(material.entities[X]?.tenures?.[xt]?.start), ey = stamp(material.entities[Y]?.tenures?.[yt]?.end);
  if (sx == null || ey == null) return "UNVERIFIABLE";
  return sx >= ey ? "TRUE" : "FALSE";
}
const officeOf = (rel) => rel.split(":")[1].toUpperCase();

// ── the circuit, as a function of the material ───────────────────────────
async function runCircuit(recs, { grain, tag, declare = true }) {
  const edges = recs.filter((r) => grain === "person" || r.corroborated);
  const hg = hgEdges(edges, grain);
  let declarations = createDeclarationLog();
  const acquired = acquireCandidates(declarations, hg, { source: `${tag} (${grain} grain)` });
  declarations = acquired.log;
  const fold = foldDeclarations(declarations);
  const candidateOffices = fold.candidates.map((c) => officeOf(c.rel));
  const refutedOffices = acquired.scan.refuted.map((r) => officeOf(r.rel));
  let chem = createChemistry();
  const GIVER = "wikidata P1365/P1366 immediate-succession semantics; per-office transitive closure declared by eval/full-circuit-oracle.mjs as this driver's own risk — a stand-in giver, disclosed";
  const stage = stageFromEdges(hg);
  const given = [];
  if (declare) for (const c of fold.candidates) {
    ({ log: declarations } = promoteAndDeclare(declarations, stage, c.rel, { giver: GIVER }));
    for (const row of closureAffordances({ base: c.rel, yields: `after:${officeOf(c.rel).toLowerCase()}`, giver: GIVER })) chem = giveHyperlexiconAffordance(chem, row);
    given.push(c.rel);
  }
  const sub = toSubstrate(edges, { grain, tag });
  const pre = auditChemistry(sub, chem);
  const substrate = createReactionSubstrate({ entries: sub, hyperlexicon: chem, window: null });
  const settled = substrate.settle({ cue: null, floor: null, maxSteps: 12, veto: vetoedPairs(pre) });
  const post = auditChemistry(substrate.edges(), chem);
  const facts = settled.derived.map((d) => {
    const [a, b] = d.edge.participants.map((p) => p.ref);
    return { office: officeOf(d.edge.relation), from: person(a), to: person(b), xt: tenureIdx(a), yt: tenureIdx(b), depth: d.depth, selfPerson: person(a) === person(b) };
  }).filter((f) => !f.selfPerson);
  const scored = facts.map((f) => ({ ...f, verdict: grain === "tenure" ? verdictTenure(f.office, f.from, f.xt, f.to, f.yt) : verdict(f.office, f.from, f.to) }));
  const c = { TRUE: 0, FALSE: 0, UNVERIFIABLE: 0 };
  for (const s of scored) c[s.verdict] += 1;
  const decided = c.TRUE + c.FALSE;
  return {
    edges: edges.length, corroborated: edges.filter((e) => e.corroborated).length,
    candidates: candidateOffices.length, refuted: refutedOffices.length, given: given.length,
    preRefuted: pre.filter((r) => r.refuted).length, postRefuted: post.filter((r) => r.refuted).length,
    derived: scored.length, ...c, precision: decided ? c.TRUE / decided : null,
    falseFacts: scored.filter((s) => s.verdict === "FALSE").map((s) => `${labelOf(s.from)} after ${labelOf(s.to)} (${labelOf(s.office)})`),
    trueSample: scored.filter((s) => s.verdict === "TRUE").slice(0, 4).map((s) => `${labelOf(s.from)} after ${labelOf(s.to)} (${labelOf(s.office)}, depth ${s.depth})`),
  };
}

// ── the redealt material (the II.23 control on the oracle) ───────────────
function redeal(entities, seed) {
  let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const out = JSON.parse(JSON.stringify(entities));
  // per office: collect every stated replaces-target, shuffle the targets
  // among the SAME tenure slots — marginals kept exactly, the relation
  // destroyed; replacedBy is recomputed to stay consistent with the shuffle
  // so the redealt material is as "well-formed" as the real one
  const slots = new Map();
  for (const [q, ent] of Object.entries(out)) (ent.tenures ?? []).forEach((t, i) => { if (t.replaces) { if (!slots.has(t.office)) slots.set(t.office, []); slots.get(t.office).push({ q, i, target: t.replaces }); } });
  for (const [, list] of slots) {
    const targets = list.map((x) => x.target);
    for (let i = targets.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [targets[i], targets[j]] = [targets[j], targets[i]]; }
    list.forEach((x, k) => { out[x.q].tenures[x.i].replaces = targets[k]; });
  }
  for (const ent of Object.values(out)) for (const t of ent.tenures ?? []) t.replacedBy = null;
  for (const [q, ent] of Object.entries(out)) (ent.tenures ?? []).forEach((t) => {
    if (!t.replaces || !out[t.replaces]) return;
    const prev = (out[t.replaces].tenures ?? []).find((u) => u.office === t.office && !u.replacedBy);
    if (prev) prev.replacedBy = q;
  });
  return out;
}

// ── run ──────────────────────────────────────────────────────────────────
say("── THE FULL CIRCUIT vs AN INDEPENDENT ORACLE (real Wikidata succession) ──\n");
const real = buildEdges(material.entities);
say(`material: ${Object.keys(material.entities).length} entities, ${real.length} succession edges; corroborated (2 sources x 2 instruments): ${real.filter((r) => r.corroborated).length}, single-witness: ${real.filter((r) => !r.corroborated).length}`);

const N = await runCircuit(real, { grain: "person", tag: "naive" });
const C = await runCircuit(real, { grain: "tenure", tag: "circuit" });
// THE CONTROL AS A DISTRIBUTION, not a threshold. Two seeds scored 0.75
// and 0.67 — not ~0.5 — because the oracle's chance rate for a random
// within-office pair is HIGH (any two holders of one office are
// time-ordered, and a multi-term holder gives "after" several chances).
// A fixed 0.6 gate was therefore the wrong test; II.23's is: where does
// the real arm sit in the distribution the redeal produces? Fifty seeds.
const SEEDS = 50;
const redeals = [];
for (let k = 0; k < SEEDS; k++) redeals.push(await runCircuit(buildEdges(redeal(material.entities, 1000 + k * 17)), { grain: "tenure", tag: `redealt-${k}` }));
const decidedR = redeals.filter((r) => r.precision != null);
const precisions = decidedR.map((r) => r.precision).sort((a, b) => a - b);
const q = (arr, f) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(f * arr.length))] : null;
const perfectRuns = decidedR.filter((r) => r.FALSE === 0 && (r.TRUE + r.FALSE) >= C.derived).length;
const falseRate = decidedR.reduce((a, r) => a + r.FALSE, 0) / Math.max(1, decidedR.reduce((a, r) => a + r.TRUE + r.FALSE, 0));

const row = (name, r) => say(`  ${name.padEnd(30)} edges ${String(r.edges).padStart(3)} · offices cand/refuted/given ${r.candidates}/${r.refuted}/${r.given} · derived ${String(r.derived).padStart(3)} · TRUE ${r.TRUE} FALSE ${r.FALSE} UNVERIFIABLE ${r.UNVERIFIABLE} · precision ${r.precision == null ? "—" : r.precision.toFixed(3)} · veto pre/post ${r.preRefuted}/${r.postRefuted}`);
say("\narm");
row("N naive (person, all edges)", N);
row("C circuit (tenure, corroborated)", C);
row("R redealt, seed 1000 (one draw)", redeals[0]);
say(`  R redealt, ${SEEDS} seeds (the null)   decided runs ${decidedR.length} · precision median ${q(precisions, 0.5)?.toFixed(3)} · 95th ${q(precisions, 0.95)?.toFixed(3)} · max ${q(precisions, 0.999)?.toFixed(3)} · pooled FALSE rate ${falseRate.toFixed(3)} · runs with 0 FALSE at >=${C.derived} decided: ${perfectRuns}/${decidedR.length}`);

say("\nC's derived facts (never stated by any record):");
for (const t of C.trueSample) say(`  ✓ ${t}`);
if (C.falseFacts.length) { say("C's FALSE facts:"); for (const f of C.falseFacts) say(`  ✗ ${f}`); }

say("\n── THE GATES ──");
const chanceP = 1 - falseRate; // per-fact chance of TRUE under the null
const pAllTrue = Math.pow(chanceP, C.derived);
say(`II.23 resolution: under the redeal null a derived fact is TRUE with p≈${chanceP.toFixed(2)}; the circuit's ${C.TRUE}/${C.TRUE + C.FALSE} all-TRUE has p≈${pAllTrue.toFixed(3)} under that null, and ${perfectRuns}/${decidedR.length} redealt runs matched it — ${perfectRuns / Math.max(1, decidedR.length) <= 0.05 ? "DISCRIMINATED at alpha 0.05" : "NOT discriminated at alpha 0.05: the material is too small for the circuit's precision to beat the oracle's own chance rate"}`);
say(`triangulation's value: the ${N.derived - C.derived} facts the naive arm derives that the circuit does not are exactly its ${N.UNVERIFIABLE} UNVERIFIABLE ones — single-witness edges reach facts the oracle cannot judge; corroboration kept the circuit inside what the oracle can see (${C.UNVERIFIABLE} unverifiable)`);
say(`construction's reach: ${C.derived} never-stated facts from ${C.edges} corroborated edges, ${C.FALSE} false; naive ${N.derived} from ${N.edges}, ${N.FALSE} false`);
