// A uniqueness violation is a GRAIN signal, not only a veto — tested across
// two unrelated domains with one unmodified core.
//
// WHY THIS EXISTS. P60 shipped a refutation gate that refused an entire
// relation when a uniqueness violation appeared, and eval/derivation-precision
// priced that refusal at 15 true facts destroyed per 2 false ones prevented.
// Chasing the fix produced `person#office#start` — which works, and is
// POLITICS-SHAPED: it hardcodes "someone holds an office for a term" and goes
// dark on any material nobody labelled that way. That is exactly the mistake
// relation-composition.js's own header records the kernel making once already
// ("AN ARRANGEMENT HAS ENDS, NOT PARTS OF SPEECH... went dark on everything
// else — not because the structure was absent but because nobody wrote
// 'subject' on it"), committed a second time with a different schema.
//
// THE GENERAL RULE, with no domain in it:
//
//   An edge relates OCCURRENCES — the episodes its ends actually belong to —
//   not the durable entities those episodes belong to. When a relation the
//   material presents as one-to-one is violated at entity grain, that is
//   evidence THE GRAIN IS TOO COARSE, not evidence the relation is unsound.
//   Refine to the material's own occurrence identity and re-scan. If the
//   violation dissolves, the grain was the defect.
//
// The CORE below names no domain. Adapters — which are allowed to know their
// own material — supply edges, occurrence identity, and a binding that says
// which occurrence an entity-mention refers to. Two adapters run here:
// real Wikidata succession, and an invented hospital-bed occupancy corpus with
// the identical structure and zero politics. If the core needed an edit
// between them, it was never general.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hyperedge } from "../../eoreader7/native/kernel/hypergraph.js";
import { createHyperlexicon, giveHyperlexiconAffordance } from "../../eoreader7/native/kernel/hyperlexicon.js";
import { createReactionSubstrate, closureAffordances } from "../../eoreader7/native/kernel/reaction.js";
import { refuteRelation } from "../../eoreader7/native/kernel/refutation.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "results", "grain-refinement.json");
const GIVER = "eval/grain-refinement.mjs — per-relation transitive closure, declared as this driver's own risk";

// ─────────────────────────── THE CORE (domain-free) ────────────────────────
// An adapter hands in edges shaped { relation, a, b, aOcc, bOcc } where aOcc /
// bOcc are the occurrence ids of each end, or null when the material does not
// individuate that end. Nothing below asks what any of it means.

const edgeAt = (e, grain) => grain === "occurrence"
  ? { relation: e.relation, a: e.aOcc ?? e.a, b: e.bOcc ?? e.b }
  : { relation: e.relation, a: e.a, b: e.b };

function toHyperedges(rows, source) {
  return rows.map((r, i) => hyperedge({
    id: `${source}:${i}`, relation: r.relation, witness: { ref: source, index: i },
    participants: [
      { ref: String(r.a).toLowerCase(), standing: "referent", identity: source, display: String(r.a), role: null },
      { ref: String(r.b).toLowerCase(), standing: "referent", identity: source, display: String(r.b), role: null },
    ],
  }));
}

/** Scan every relation for a uniqueness violation at one grain. */
function scanAt(edges, grain) {
  const rows = edges.map((e) => edgeAt(e, grain));
  const relations = [...new Set(rows.map((r) => r.relation))];
  const hedges = toHyperedges(rows, `grain:${grain}`);
  return relations.map((rel) => {
    const scan = refuteRelation(hedges, rel, { expectUnique: true });
    return { relation: rel, refuted: scan.refuted, reasons: scan.reasons ?? [] };
  });
}

/** Derive the transitive closure of every relation, at one grain. */
function deriveAt(edges, grain, relations) {
  const rows = edges.map((e) => edgeAt(e, grain));
  const hedges = toHyperedges(rows, `grain:${grain}`);
  const hl = relations
    .flatMap((r) => closureAffordances({ base: r, yields: `after:${r}`, giver: GIVER }))
    .reduce((acc, row) => giveHyperlexiconAffordance(acc, row), createHyperlexicon());
  const sub = createReactionSubstrate({ entries: hedges, hyperlexicon: hl, window: null });
  sub.settle({ cue: null, floor: null, maxSteps: 12 });
  return sub.derived().map((d) => ({
    relation: d.edge.relation.replace(/^after:/, ""),
    a: String(d.edge.participants[0]?.ref ?? ""),
    b: String(d.edge.participants[d.edge.participants.length - 1]?.ref ?? ""),
  }));
}

/**
 * THE MOVE. Scan at entity grain; where a relation is refuted, re-scan it at
 * occurrence grain. A violation that dissolves under refinement was a grain
 * defect; one that survives is a real property of the material.
 */
function refineGrain(edges) {
  const coarse = scanAt(edges, "entity");
  const fine = scanAt(edges, "occurrence");
  const fineBy = new Map(fine.map((r) => [r.relation, r]));
  return coarse.map((c) => {
    const f = fineBy.get(c.relation);
    return {
      relation: c.relation,
      refutedAtEntityGrain: c.refuted,
      refutedAtOccurrenceGrain: f?.refuted ?? null,
      verdict: !c.refuted ? "clean at entity grain"
        : f && !f.refuted ? "GRAIN DEFECT — the violation dissolves when ends are occurrences"
        : "real — the violation survives refinement",
      reasons: c.reasons,
    };
  });
}

// ─────────────────────────── ADAPTERS (domain-aware) ───────────────────────
// Each returns { name, edges, project, score }. `project` maps an occurrence
// back to its entity for reporting; `score` is an oracle that never reads the
// succession qualifiers the derivation ran on.

function wikidataAdapter() {
  const src = JSON.parse(fs.readFileSync(path.join(HERE, "fixtures", "succession-tenures.json"), "utf8"));
  const occId = (q, t, i) => `${q}#${t.office}#${t.start ?? `stmt${i}`}`;
  // which occurrence does a bare entity-mention refer to? the one whose
  // boundary meets this edge's boundary. NAMING an occurrence, never ordering.
  const byEntityOffice = new Map();
  for (const [q, v] of Object.entries(src.entities)) {
    v.tenures.forEach((t, i) => {
      const k = `${q}|${t.office}`;
      if (!byEntityOffice.has(k)) byEntityOffice.set(k, []);
      byEntityOffice.get(k).push({ ...t, occ: occId(q, t, i) });
    });
  }
  const bindAt = (entity, office, boundary) => {
    const list = byEntityOffice.get(`${entity}|${office}`) ?? [];
    const hit = list.find((t) => t.end === boundary) ?? list.find((t) => t.start === boundary);
    return hit ? hit.occ : null;
  };
  const edges = [];
  for (const [q, v] of Object.entries(src.entities)) {
    v.tenures.forEach((t, i) => {
      const rel = `replaces:${t.office}`, occ = occId(q, t, i);
      if (t.replaces) edges.push({ relation: rel, a: q, b: t.replaces, aOcc: occ, bOcc: bindAt(t.replaces, t.office, t.start) });
      if (t.replacedBy) edges.push({ relation: rel, a: t.replacedBy, b: q, aOcc: bindAt(t.replacedBy, t.office, t.end), bOcc: occ });
    });
  }
  const project = (ref) => String(ref).split("#")[0].toUpperCase();
  const oracle = JSON.parse(fs.readFileSync(path.join(HERE, "fixtures", "succession-terms.json"), "utf8"));
  const stamp = (t) => (typeof t === "string" && t.length > 10)
    ? Number(t.slice(1, 5)) * 10000 + Number(t.slice(6, 8)) * 100 + Number(t.slice(9, 11)) : null;
  const score = (rel, a, b) => {
    const office = rel.split(":")[1];
    const ex = oracle.entities[project(a)], ey = oracle.entities[project(b)];
    if (!ex || !ey) return "UNVERIFIABLE";
    const tx = (ex.terms[office] ?? []).map((t) => stamp(t.start)).filter((n) => n !== null);
    const ty = (ey.terms[office] ?? []).map((t) => stamp(t.end)).filter((n) => n !== null);
    if (!tx.length || !ty.length) return "UNVERIFIABLE";
    return tx.some((x) => ty.some((y) => x >= y)) ? "TRUE" : "FALSE";
  };
  return { name: "wikidata succession (real, political)", edges, project, score };
}

function occupancyAdapter() {
  const src = JSON.parse(fs.readFileSync(path.join(HERE, "fixtures", "occupancy-synthetic.json"), "utf8"));
  const eps = src.episodes.map((e, i) => ({ ...e, occ: `${e.occupant}#${e.slot}#${e.start}` }));
  const bindAt = (occupant, slot, boundary) => {
    const l = eps.filter((e) => e.occupant === occupant && e.slot === slot);
    const hit = l.find((e) => e.end === boundary) ?? l.find((e) => e.start === boundary);
    return hit ? hit.occ : null;
  };
  const edges = [];
  for (const e of eps) {
    const rel = `replaces:${e.slot}`;
    if (e.replaces) edges.push({ relation: rel, a: e.occupant, b: e.replaces, aOcc: e.occ, bOcc: bindAt(e.replaces, e.slot, e.start) });
    if (e.replacedBy) edges.push({ relation: rel, a: e.replacedBy, b: e.occupant, aOcc: bindAt(e.replacedBy, e.slot, e.end), bOcc: e.occ });
  }
  const project = (ref) => String(ref).split("#")[0].toUpperCase();
  const score = (rel, a, b) => {          // oracle: episode dates only
    const slot = rel.split(":")[1];
    const sx = eps.filter((e) => e.occupant === project(a) && e.slot === slot).map((e) => e.start);
    const ey = eps.filter((e) => e.occupant === project(b) && e.slot === slot).map((e) => e.end);
    if (!sx.length || !ey.length) return "UNVERIFIABLE";
    return sx.some((x) => ey.some((y) => x >= y)) ? "TRUE" : "FALSE";
  };
  return { name: "hospital-bed occupancy (invented, non-political)", edges, project, score };
}

// ─────────────────────────────── RUN BOTH ──────────────────────────────────
function runAdapter(ad) {
  const grains = refineGrain(ad.edges);
  const rels = [...new Set(ad.edges.map((e) => e.relation))];
  const report = {};
  for (const grain of ["entity", "occurrence"]) {
    const derived = deriveAt(ad.edges, grain, rels);
    const seen = new Set(); const facts = [];
    for (const d of derived) {
      const a = ad.project(d.a), b = ad.project(d.b);
      if (a === b) continue;                       // degenerate at entity grain
      const k = `${d.relation}|${a}|${b}`;
      if (seen.has(k)) continue; seen.add(k);
      facts.push({ relation: d.relation, a, b, verdict: ad.score(d.relation, d.a, d.b) });
    }
    const c = { TRUE: 0, FALSE: 0, UNVERIFIABLE: 0 };
    for (const f of facts) c[f.verdict] += 1;
    const decided = c.TRUE + c.FALSE;
    report[grain] = { derived: facts.length, ...c,
      precision: decided ? Number((c.TRUE / decided).toFixed(3)) : null,
      falseFacts: facts.filter((f) => f.verdict === "FALSE").map((f) => `${f.a} after ${f.b} (${f.relation})`) };
  }
  return { adapter: ad.name, relations: rels.length, edges: ad.edges.length,
    grainSignal: grains.filter((g) => g.refutedAtEntityGrain), byGrain: report };
}

const results = [runAdapter(wikidataAdapter()), runAdapter(occupancyAdapter())];
const out = {
  schema: "EOGrainRefinement@1",
  claim: "a uniqueness violation is evidence the endpoint grain is too coarse, not only grounds to refuse the relation",
  coreIsDomainFree: "the core (edgeAt / scanAt / deriveAt / refineGrain) names no entity type, no relation, and no domain; both adapters run it unmodified",
  results,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
