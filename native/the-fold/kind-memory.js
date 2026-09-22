// native/the-fold/kind-memory.js — memory of KINDS OF THING (layer 8).
//
// The first sonnet costs a hunt: fetch instances, find a ground, run the
// null, learn what separates them. The second sonnet should cost a lookup.
// That is the whole of this organ — and it is the same discipline the
// vision side already keeps for seen things (kernel/kind-universe.js): a
// kind is not a row in a table, it is a RECORD OF LEARNINGS, each signed
// with the source it came from, each falsifiable, none ever edited.
//
// The five acts, by their operators, as in kind-universe:
//
//   SIG — a form learned for the first time is SIGNED provisional. One
//         source is one witness; what it says may be the form, or may be
//         that source's own habits (measured, 2026-09-22: learned from a
//         single edition each, "English sonnet" came out as "line 14
//         indented four spaces" and "Petrarchan sonnet" as "every line
//         indented three" — the typesetters' margins beat the rhyme
//         schemes, because margins are perfect and rhyme is not).
//   CON — a second DISTINCT source corroborates it; at the house's
//         canonicalization floor the kind is confirmed. And the lesson
//         above becomes the recall rule: a feature is recalled only if it
//         holds in MORE of the kind's sources than not. Typesetting does
//         not survive a second publisher; the rhyme scheme does.
//   SEG — the sources may not agree because they are looking at two kinds.
//         A split is proposed only when the source-partition is a surprise
//         against relabeling the sources at random — never because a
//         feature disagreed.
//   DEF — a feature is REFUTED by a counter-instance that is agreed to be
//         of the kind and does not have it. The refutation is a line, the
//         feature stays on file marked refuted, and every later recall is
//         rebuilt without it.
//   REC — learning again from more instances SUPERSEDES an earlier
//         learning from the same source; the superseded one stays.
//
// The store is JSON and pure data. Recall returns a paradigm shaped exactly
// like paradigm.js's, so evaluateParadigmEmergent scores against it with
// nothing rehydrated by hand.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { elementsOf } from "./medium.js";
import { emergentFacts } from "./form-prior.js";
import { unitFacts, PARADIGM_SCHEMA } from "./paradigm.js";
import { CANONICALIZATION_FLOOR } from "../kernel/kind-universe.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const KIND_MEMORY_PATH = path.join(HERE, "..", "memory", "kind-memory.json");
export const KIND_MEMORY_SCHEMA = "EOKindMemory@1";

export const emptyKindMemory = () => ({ schema: KIND_MEMORY_SCHEMA, kinds: {} });
export function loadKindMemory(p = KIND_MEMORY_PATH) {
  try { const s = JSON.parse(fs.readFileSync(p, "utf8")); return s?.schema === KIND_MEMORY_SCHEMA ? s : emptyKindMemory(); } catch { return emptyKindMemory(); }
}
export function saveKindMemory(store, p = KIND_MEMORY_PATH) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(store, null, 2)}\n`);
  return p;
}

const featureKey = (f) => `${f.slot}\u0000${f.value}`;
const unitOf = (u) => (Array.isArray(u?.elements) ? u : { elements: elementsOf(typeof u === "string" ? u : u?.text ?? "").elements });
const factsFn = (emergent) => (emergent ? (u) => emergentFacts(unitOf(u)) : (u) => unitFacts(unitOf(u)));

// ── SIG: sign a learning, with the source it came from ───────────────────
export function rememberParadigm(store, name, paradigm, { source, at = Date.now() } = {}) {
  if (!source) throw new TypeError("rememberParadigm: a learning without its source cannot be corroborated — name the source");
  if (paradigm?.refused) return { remembered: null, refused: paradigm.refused };
  const k = (store.kinds[name] ??= { status: "provisional", signedAt: at, revision: 0, learnings: [], refutations: [] });
  if (k.status === "refuted") throw new TypeError(`rememberParadigm: "${name}" is refuted — not re-signed silently`);
  for (const l of k.learnings) if (l.source === source && !l.superseded) { l.superseded = true; l.supersededAt = at; l.basisOfSupersede = "REC:learned_again_from_same_source"; }
  k.revision += 1;
  k.learnings.push({
    at, source, emergent: !!paradigm.emergent, instances: paradigm.instances, population: paradigm.population,
    cut: paradigm.satisfies?.cut ?? 1, balancedAccuracy: paradigm.satisfies?.balancedAccuracy ?? null,
    features: (paradigm.all ?? paradigm.features ?? []).map((f) => ({ slot: f.slot, value: String(f.value), cell: f.cell, key: f.key, p: f.p, support: f.support, contrast: f.contrast })),
    basis: paradigm.basis ?? null,
  });
  return confirmIfCorroborated(store, name);
}

// ── CON: corroboration is distinct sources, never a count of instances ───
export const kindSources = (store, name) => [...new Set((store.kinds?.[name]?.learnings ?? []).filter((l) => !l.superseded).map((l) => l.source))];
export function confirmIfCorroborated(store, name) {
  const k = store.kinds?.[name]; if (!k) return null;
  const c = kindSources(store, name).length;
  if (c >= CANONICALIZATION_FLOOR && k.status === "provisional") { k.status = "confirmed"; k.confirmedAt = Date.now(); }
  return { kind: name, status: k.status, corroboration: c, revision: k.revision };
}

// ── recall: the definition the sources agree on ──────────────────────────
// A feature is recalled iff it is held by more of the kind's live sources
// than not and has not been refuted. From one source that is every feature
// it found — and recall says so, in `singleSource`, because a definition no
// second witness has seen is the typesetter's as much as the form's.
export function recallKind(store, name) {
  const k = store.kinds?.[name];
  if (!k || k.status === "refuted") return { kind: name, known: false, status: k?.status ?? "unknown" };
  const live = k.learnings.filter((l) => !l.superseded);
  if (!live.length) return { kind: name, known: false, status: k.status };
  const sources = kindSources(store, name);
  const refuted = new Set((k.refutations ?? []).map((r) => r.feature));
  const bySource = new Map();
  for (const l of live) for (const f of l.features) {
    const key = featureKey(f);
    const e = bySource.get(key) ?? { f, sources: new Set() };
    e.sources.add(l.source); bySource.set(key, e);
  }
  const features = [], dropped = [];
  for (const [key, e] of bySource) {
    if (refuted.has(key)) { dropped.push({ ...e.f, why: "refuted" }); continue; }
    if (e.sources.size * 2 > sources.length) features.push({ ...e.f, sources: [...e.sources] });
    else dropped.push({ ...e.f, why: `held by ${e.sources.size} of ${sources.length} source(s) — a minority`, sources: [...e.sources] });
  }
  features.sort((a, b) => b.sources.length - a.sources.length || a.p - b.p);
  const cuts = live.map((l) => l.cut).sort((a, b) => a - b);
  const emergent = live.some((l) => l.emergent);
  const all = features;
  return {
    schema: PARADIGM_SCHEMA, kind: name, name, known: true, recalled: true, status: k.status, revision: k.revision,
    emergent, sources, singleSource: sources.length < CANONICALIZATION_FLOOR,
    features, all, dropped, facts: factsFn(emergent),
    satisfies: { cut: cuts[cuts.length >> 1] ?? 1 },
    instances: live.reduce((a, l) => a + (l.instances ?? 0), 0),
    // WHAT WOULD REFUTE IT — stated with the definition, not on request.
    falsifiableBy: features.slice(0, 5).map((f) => `an agreed ${name} whose ${f.key ?? `${f.slot}=${f.value}`} does not hold`),
    basis: `${name}: ${features.length} feature(s) agreed by more than half of ${sources.length} source(s)${dropped.length ? `, ${dropped.length} dropped` : ""}${sources.length < CANONICALIZATION_FLOOR ? " — ONE source only: what is recalled may be this source's habits, not the form" : ""}`,
  };
}

// ── DEF: a counter-instance refutes a feature ────────────────────────────
export function refuteFeature(store, name, { slot, value }, { by = null, reason = null, at = Date.now() } = {}) {
  const k = store.kinds?.[name]; if (!k) return { refuted: 0 };
  const key = featureKey({ slot, value: String(value) });
  if ((k.refutations ??= []).some((r) => r.feature === key)) return { refuted: 0, already: true };
  k.refutations.push({ feature: key, slot, value: String(value), by, reason, at, basis: "DEF:counter_instance" });
  k.revision += 1;
  return { refuted: 1, kind: name, revision: k.revision };
}

/** A unit agreed to be of the kind refutes every recalled feature it lacks. */
export function refuteByInstance(store, name, unit, { by = null, reason = "counter-instance" } = {}) {
  const r = recallKind(store, name);
  if (!r.known) return { refuted: 0 };
  const u = r.facts(unit);
  const out = [];
  for (const f of r.features) if (String(u.has(f.slot) ? u.get(f.slot) : "(absent)") !== f.value) { refuteFeature(store, name, f, { by, reason }); out.push(f.key ?? `${f.slot}=${f.value}`); }
  return { refuted: out.length, features: out };
}

// ── SEG: propose a split only when the sources' disagreement is a surprise ─
// Sources may disagree because they are reading two kinds (Shakespeare's
// sonnets and Petrarch's). The evidence is a feature that some sources ALL
// hold and the others ALL lack. How many such perfect splits would random
// source labels give? That is the null, and the proposal must beat it.
export function splitProposal(store, name, { draws = 400, rnd = Math.random } = {}) {
  const k = store.kinds?.[name]; if (!k) return { propose: false };
  const live = k.learnings.filter((l) => !l.superseded);
  const sources = kindSources(store, name);
  if (sources.length < 4) return { propose: false, basis: `${sources.length} source(s): a split needs at least two witnesses a side` };
  const held = []; // one Set(source) per feature
  const seen = new Map();
  for (const l of live) for (const f of l.features) { const key = featureKey(f); let e = seen.get(key); if (!e) { e = new Set(); seen.set(key, e); held.push(e); } e.add(l.source); }
  const n = sources.length;
  // the statistic: over every partition any feature's own source-set
  // induces, how many features split the sources PERFECTLY (all of one
  // side, none of the other)?
  const maxPerfect = (sets) => {
    let best = 0, bestA = null;
    for (const cand of sets) {
      const A = [...cand]; if (A.length < 2 || n - A.length < 2) continue;
      const inA = (ss) => sources.filter((s) => ss.has(s) && A.includes(s)).length;
      let m = 0;
      for (const ss of sets) { const a = inA(ss), b = [...ss].length - a; if ((a === A.length && b === 0) || (b === n - A.length && a === 0)) m++; }
      if (m > best) { best = m; bestA = A; }
    }
    return { n: best, A: bestA };
  };
  const obs = maxPerfect(held);
  if (!obs.A) return { propose: false, basis: "no partition of the sources splits any feature perfectly" };
  // THE NULL: keep every feature's marginal — how many sources hold it —
  // and destroy only WHICH sources, which is the whole claim. Features that
  // happen to be held by two sources each would rarely name the SAME two.
  const shuffled = () => held.map((ss) => { const pool = [...sources]; for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; } return new Set(pool.slice(0, ss.size)); });
  let ge = 0;
  for (let d = 0; d < draws; d++) if (maxPerfect(shuffled()).n >= obs.n) ge++;
  const p = (ge + 1) / (draws + 1), level = 1 / held.length;
  return { propose: p <= level, p, level, perfectSplits: obs.n, sides: [obs.A, sources.filter((s) => !obs.A.includes(s))], basis: `${obs.n} of ${held.length} feature(s) split the sources perfectly at the same cut; features whose source-sets are shuffled to the same sizes do as well p=${p.toFixed(4)} against level 1/${held.length}` };
}

// ── the lookup: which remembered kind does this satisfy? ─────────────────
export function recognizeKind(store, unit, { among = null } = {}) {
  const names = among ?? Object.keys(store.kinds ?? {});
  const scored = [];
  for (const n of names) {
    const r = recallKind(store, n);
    if (!r.known || !r.all.length) continue;
    const u = r.facts(unit);
    const held = r.all.filter((f) => String(u.has(f.slot) ? u.get(f.slot) : "(absent)") === f.value).length;
    const score = held / r.all.length;
    scored.push({ kind: n, score, held, of: r.all.length, satisfies: score >= r.satisfies.cut, status: r.status, sources: r.sources.length });
  }
  scored.sort((a, b) => b.score - a.score);
  return { best: scored.find((s) => s.satisfies) ?? null, scored, basis: scored.length ? `${scored.length} remembered kind(s) looked up; ${scored.filter((s) => s.satisfies).length} satisfied` : "nothing remembered yet — this costs a hunt" };
}
