// premise-levels.mjs — ZERO model calls.
//
// THE QUESTION (user, 2026-09-04): corroboration should not be a GATE ("only
// counts when two sources say it") but a LEVEL of knowledge. `premisesOf`
// still sorts every note into premises-or-stopped on a hard floor, and that
// is the last binary in the chain — it sits where NEW facts get composed.
//
// A level is only real if it PREDICTS something. This asks whether it does,
// against the one independent oracle this repo has: the succession derivation
// judged by P580/P582 term dates it never reads (derivation-precision.mjs).
//
// THE INHERITANCE RULE UNDER TEST: a derived fact has no witnesses of its own,
// so it is carried by its premises. It is graded here by the WEAKEST premise
// in its own chain -- if levels are real, precision must fall as weaker
// premises are admitted, and a chain is only as good as its worst link.
//
// CONTROL (II.23): REDEAL_SEED shuffles each office's objects among its own
// assertions, keeping marginals exactly and destroying the succession
// relation -- the same control derivation-precision.mjs already uses.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTaskLog, append, projectTasks, ENTRY_KINDS, OPERATOR_BASIS } from "../../kernel/task-log.js";
import { GRAINS } from "../../kernel/cube.js";
import { parseEntity } from "../../../../the-fold/wikidata.js";
import { makeHyperlexicon } from "../../organs/hyperlexicon.js";
import { adaptTaskLog } from "../../../../the-fold/consequence.js";
import { distinctSources } from "../../organs/corroboration.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, "fixtures", "wikidata");
const ORACLE = path.join(HERE, "fixtures", "succession-terms.json");
const foldHl = makeHyperlexicon({ ...adaptTaskLog({ createTaskLog, append, ENTRY_KINDS, OPERATOR_BASIS, GRAINS }), projectTasks });

const files = fs.readdirSync(FIXTURES).filter((f) => f.endsWith(".json")).sort();
const raws = new Map(files.map((f) => [f, fs.readFileSync(path.join(FIXTURES, f), "utf8")]));
const entities = files.map((f) => parseEntity(JSON.parse(raws.get(f)))).filter(Boolean);

// P5.2: an assertion with no verified address is REFUSED at admission — the
// spans are not decoration here, they are what lets the claim be admitted.
function addressOf(file, qid) {
  const raw = raws.get(file);
  const needle = `"id":"${qid}"`;
  const start = raw.indexOf(needle);
  if (start < 0) return null;
  if (raw.slice(start, start + needle.length) !== needle) throw new Error(`address self-verification failed: ${file}`);
  return { ref: `wikidata/${file}`, start, end: start + needle.length, text: needle };
}
function buildOffered() {
const offered = [];
entities.forEach((e, i) => {
  const file = files[i];
  for (const p of e.positions ?? []) {
    const rel = `replaces:${p.position}`;
    if (p.replaces) { const s = addressOf(file, p.replaces); offered.push({ witness: file, a: { subject: e.qid, verb: rel, object: p.replaces, spans: s ? [s] : [] } }); }
    if (p.replacedBy) { const s = addressOf(file, e.qid); offered.push({ witness: file, a: { subject: p.replacedBy, verb: rel, object: e.qid, spans: s ? [s] : [] } }); }
  }
});
return offered;
}
function redeal(offered, seedIn) {
  let seed = seedIn >>> 0;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const byVerb = new Map();
  for (const o of offered) { if (!byVerb.has(o.a.verb)) byVerb.set(o.a.verb, []); byVerb.get(o.a.verb).push(o); }
  for (const list of byVerb.values()) {
    const objects = list.map((o) => o.a.object);
    for (let i = objects.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [objects[i], objects[j]] = [objects[j], objects[i]]; }
    list.forEach((o, k) => { o.a.object = objects[k]; });
  }
  return offered;
}
function foldOf(offered) {
  let log = foldHl.createHyperlexicon();
  for (const file of files) log = foldHl.admit(log, offered.filter((o) => o.witness === file).map((o) => o.a), { witness: `wikidata/${file}` }).log;
  return foldHl.foldHyperlexicon(log);
}
const folded = foldOf(buildOffered());

// ── the premises, GRADED (not gated) ─────────────────────────────────────
const key = (office, from, to) => `${office}|${from}|${to}`;
const raw = folded.map((a) => ({
  office: a.verb.split(":")[1],
  from: String(a.subject).toUpperCase(),
  to: String(a.object).toUpperCase(),
  sources: distinctSources(a.witnesses ?? []).size,
}));
const levelOf = new Map(raw.map((r) => [key(r.office, r.from, r.to), r.sources]));
const dist = {};
for (const r of raw) dist[r.sources] = (dist[r.sources] ?? 0) + 1;
console.log(`premises: ${raw.length}`);
console.log(`  by source count: ${Object.entries(dist).sort().map(([k, v]) => `${k} source(s): ${v}`).join("   ")}`);

// ── the closure, carrying the LEVEL of every link it used ────────────────
function closure(admit, rawRows = raw) {
  const usable = rawRows.filter((r) => admit(r.sources));
  const seen = new Set(usable.map((r) => key(r.office, r.from, r.to)));
  let frontier = usable.map((r) => ({ ...r, minLevel: r.sources, links: 1, uses: new Set([key(r.office, r.from, r.to)]) }));
  const out = new Map();
  for (let step = 0; step < 12 && frontier.length; step += 1) {
    const next = [];
    for (const l of frontier) for (const r of usable) {
      if (l.office !== r.office || l.to !== r.from) continue;
      const k = key(l.office, l.from, r.to);
      if (seen.has(k) || out.has(k)) continue;
      // THE INHERITANCE RULE: the chain is as strong as its weakest link, and
      // it REMEMBERS every premise it rests on -- which is what makes a
      // concession propagate instead of merely lowering a score.
      const row = { office: l.office, from: l.from, to: r.to,
        minLevel: Math.min(l.minLevel, r.sources), links: l.links + 1,
        uses: new Set([...l.uses, key(r.office, r.from, r.to)]) };
      out.set(k, row); next.push(row);
    }
    frontier = next;
  }
  return [...out.values()];
}

// ── the independent oracle (P580/P582 — different properties by construction)
const oracle = JSON.parse(fs.readFileSync(ORACLE, "utf8"));
const stamp = (t) => (typeof t === "string" && t.length > 10) ? Number(t.slice(1, 5)) * 10000 + Number(t.slice(6, 8)) * 100 + Number(t.slice(9, 11)) : null;
function verdict(office, X, Y) {
  const ex = oracle.entities[X], ey = oracle.entities[Y];
  if (!ex || !ey) return "UNVERIFIABLE";
  const tx = ex.terms[office] ?? [], ty = ey.terms[office] ?? [];
  if (!tx.length || !ty.length) return "UNVERIFIABLE";
  const xs = tx.map((t) => stamp(t.start)).filter((n) => n !== null);
  const ye = ty.map((t) => stamp(t.end)).filter((n) => n !== null);
  if (!xs.length || !ye.length) return "UNVERIFIABLE";
  return xs.some((x) => ye.some((y) => x >= y)) ? "TRUE" : "FALSE";
}
const tally = (rows) => {
  const c = { TRUE: 0, FALSE: 0, UNVERIFIABLE: 0 };
  for (const r of rows) c[verdict(r.office, r.from, r.to)] += 1;
  const decided = c.TRUE + c.FALSE;
  return { n: rows.length, ...c, decided, precision: decided ? Number((c.TRUE / decided).toFixed(3)) : null };
};

console.log(`\n=== ARM 1: the GATE as it stands — premises admitted only at 2+ sources, vs all ===`);
for (const [name, admit] of [["floor 2 (the shipped gate)", (s) => s >= 2], ["floor 1 (no gate)", (s) => s >= 1]]) {
  const d = closure(admit); const t = tally(d);
  console.log(`  ${name.padEnd(26)} derived ${String(t.n).padStart(4)}  true ${String(t.TRUE).padStart(4)}  false ${String(t.FALSE).padStart(3)}  unverifiable ${String(t.UNVERIFIABLE).padStart(4)}  precision ${t.precision ?? "-"}`);
}

console.log(`\n=== ARM 2: the LEVEL — every derived fact graded by its WEAKEST premise ===`);
const all = closure((s) => s >= 1);
const byLevel = new Map();
for (const d of all) { if (!byLevel.has(d.minLevel)) byLevel.set(d.minLevel, []); byLevel.get(d.minLevel).push(d); }
console.log(`  weakest premise    derived   true  false  unverifiable   precision on decided`);
for (const lvl of [...byLevel.keys()].sort((a, b) => a - b)) {
  const t = tally(byLevel.get(lvl));
  console.log(`  ${String(lvl + " source(s)").padEnd(18)} ${String(t.n).padStart(5)}  ${String(t.TRUE).padStart(5)}  ${String(t.FALSE).padStart(5)}  ${String(t.UNVERIFIABLE).padStart(12)}   ${t.precision ?? "-"}`);
}
// ── ARM 4: STABILITY, which needs no oracle at all ───────────────────────
// User, 2026-09-04: "we should be able to build very high with a single
// source, but it is unstable knowledge, able to be knocked over easily."
// That is not a gate and not a score. It is a STRUCTURAL property: build
// freely, and carry how far a concession would propagate. `concede`
// (REC-Figure, derivation.js) already withdraws every product resting on a
// premise transitively -- this measures what that concession would cost,
// which is computable with no ground truth and so survives the oracle's
// failure above.
function stability(rawRows, derived) {
  const carries = new Map();          // premise -> derived facts resting on it
  for (const r of rawRows) carries.set(key(r.office, r.from, r.to), []);
  for (const d of derived) for (const u of d.uses) if (carries.has(u)) carries.get(u).push(d);
  return [...carries.entries()].map(([k, ds]) => {
    const r = rawRows.find((x) => key(x.office, x.from, x.to) === k);
    return { premise: k, sources: r?.sources ?? 0, collapses: ds.length,
      tallest: ds.reduce((m, d) => Math.max(m, d.links), 0) };
  }).sort((a, b) => b.collapses - a.collapses);
}
console.log(`\n=== ARM 4: STABILITY — what one concession would knock over ===`);
const st = stability(raw, all);
const load = st.filter((x) => x.collapses > 0);
console.log(`  ${load.length} of ${st.length} premises carry at least one derived fact`);
console.log(`  single-source premises carrying anything: ${load.filter((x) => x.sources < 2).length}`);
console.log(`\n  the load-bearing premises, most costly concession first:`);
for (const x of load.slice(0, 10))
  console.log(`    ${String(x.sources)} source(s)  conceding it withdraws ${String(x.collapses).padStart(2)} derived fact(s), tallest ${x.tallest} links   ${x.premise}`);
const totalIfWorst = load.length ? load[0].collapses : 0;
console.log(`\n  TALLEST TOWER ON ONE SOURCE: the single most load-bearing premise is attested by ${load[0]?.sources ?? 0} source(s)`);
console.log(`  and ${totalIfWorst} of the ${all.length} derived facts (${(100 * totalIfWorst / (all.length || 1)).toFixed(0)}%) rest on it.`);
const fragile = all.filter((d) => [...d.uses].some((u) => (st.find((x) => x.premise === u)?.sources ?? 0) < 2)).length;
console.log(`  ${fragile} of ${all.length} derived facts (${(100 * fragile / (all.length || 1)).toFixed(0)}%) have at least one single-source premise in their chain.`);

// CONTROL (II.23): redeal destroys the succession relation. If the real
// material's load concentrates on a few premises and the redealt material's
// does not, concentration is a property of the succession, not of the count.
const BAND = Number(process.env.BAND ?? 12);
const tops = [];
for (let d = 1; d <= BAND; d += 1) {
  const f2 = foldOf(redeal(buildOffered(), d));
  const raw2 = f2.map((a) => ({ office: a.verb.split(":")[1], from: String(a.subject).toUpperCase(), to: String(a.object).toUpperCase(), sources: distinctSources(a.witnesses ?? []).size }));
  const all2 = closure((s2) => s2 >= 1, raw2);
  const st2 = stability(raw2, all2).filter((x) => x.collapses > 0);
  tops.push(all2.length ? Number((100 * (st2[0]?.collapses ?? 0) / all2.length).toFixed(1)) : 0);
}
tops.sort((a, b) => a - b);
const realTop = Number((100 * totalIfWorst / (all.length || 1)).toFixed(1));
const reach = tops.filter((t) => t >= realTop).length;
console.log(`\n  CONTROL — succession redealt, ${BAND} draws. Share of derived facts resting on the single most load-bearing premise:`);
console.log(`    real ${realTop}%   redealt median ${tops[BAND >> 1]}% (${tops[0]}-${tops.at(-1)})`);
// DIRECTION MATTERS on a concentration statistic. A hub-shaped dependency is
// the FRAGILE one, so the question is whether the real material concentrates
// MORE than chance, not merely whether it differs. Below the null is the good
// side: real succession spreads its load, and it is the REDEAL that builds
// towers on single premises.
const below = tops.filter((t) => t <= realTop).length;
console.log(below === 0
  ? `    -> real sits BELOW every redeal: the real succession spreads its load; concentration is what destroying the relation produces.`
  : `    -> ${below}/${BAND} redeals are at or below real (${reach}/${BAND} at or above): the spread is not distinguishable from chance.`);

console.log(`\n=== ARM 3: chain length, the other thing a derived fact could inherit ===`);
const byLinks = new Map();
for (const d of all) { if (!byLinks.has(d.links)) byLinks.set(d.links, []); byLinks.get(d.links).push(d); }
for (const n of [...byLinks.keys()].sort((a, b) => a - b)) {
  const t = tally(byLinks.get(n));
  console.log(`  ${n} links  derived ${String(t.n).padStart(4)}  true ${String(t.TRUE).padStart(4)}  false ${String(t.FALSE).padStart(3)}  precision ${t.precision ?? "-"}`);
}
