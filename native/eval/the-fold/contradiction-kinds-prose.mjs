// contradiction-kinds-prose.mjs — ZERO model calls.
//
// contradiction-kinds.mjs typed the succession fixtures and found 2 of 2
// apparent contradictions were INDIVIDUATION, needing no third source. This
// runs the same question over real prose: the 34-host cited-source corpus.
//
// THE KIND THE FIXTURES COULD NOT SHOW. A contradiction requires a relation
// that admits ONE value. "Aldrin was afraid it might topple" and "Aldrin was
// an elder at the Webster Presbyterian Church" are both true; the copula was
// never functional. That is not a contest, not individuation, not force --
// it is the act's own ARITY, and it is the dominant kind in prose.
//
// FUNCTIONALITY IS MEASURED, NEVER DECLARED. For each act, over subjects
// carrying two or more notes on it, the share whose objects are DISJOINT. A
// functional act ("was born in") should almost never do this; the copula
// should do it constantly. The floor separating them is READ OFF A NULL --
// acts reassigned among the notes, marginals kept -- never picked.
import { readFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const HERE = new URL("./", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const { textFeatures } = await import(`${NATIVE}/organs/corroboration.js`);
const { AUXILIARY_VERBS, DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS, NEGATION_WORDS } = await import(`${NATIVE}/adapters/text/priors.js`);
const posPrior = JSON.parse(readFileSync(`${FIX}pos-prior-eng.json`, "utf8"));

// The NINE MODALS, taken from the received closed class rather than typed
// here: AUXILIARY_VERBS minus the copula's own forms and the tense/polarity
// auxiliaries have/do. A modal-bearing act is not a plain description, so a
// modal claim and a bare claim are not rivals for one value.
const TENSE_AUX = new Set(["am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did"]);
const MODALS = new Set([...AUXILIARY_VERBS].filter((w) => !TENSE_AUX.has(w)));

const walk = JSON.parse(readFileSync(`${HERE}results/${process.env.FROM ?? "ranke-backwards.json"}`, "utf8"));
const parse = (r) => { const m = String(r.note).match(/^(.*?) —(.*?)→ (.*)$/); return m ? { ...r, e1: m[1], lab: m[2], e2: m[3] } : null; };
const rows = walk.real.rows.map(parse).filter(Boolean);
const F = (t) => [...textFeatures(t)];
const auxDominant = (w) => { const a = posPrior.forms?.[String(w).toLowerCase()]; if (!a) return false; const t = Object.values(a).reduce((x, y) => x + y, 0); return t > 0 && (a.AUX ?? 0) / t > 0.5; };
const headAct = (act) => { const t = String(act ?? "").trim().split(/\s+/).filter(Boolean); for (let i = t.length - 1; i >= 0; i -= 1) if (!auxDominant(t[i])) return t[i].toLowerCase(); return t.at(-1)?.toLowerCase() ?? ""; };

// ── functionality, measured per act ──────────────────────────────────────
function functionality(list) {
  const bySubjAct = new Map();
  for (const r of list) {
    const f = F(r.e1); if (!f.length) continue;
    const k = f.sort().join("|") + "::" + headAct(r.lab);
    if (!bySubjAct.has(k)) bySubjAct.set(k, []);
    bySubjAct.get(k).push(r);
  }
  const perAct = new Map(); // act -> {subjects, splitSubjects}
  for (const [k, group] of bySubjAct) {
    const act = k.split("::")[1]; if (!act) continue;
    if (!perAct.has(act)) perAct.set(act, { subjects: 0, split: 0 });
    const a = perAct.get(act); a.subjects += 1;
    if (group.length < 2) continue;
    let disjoint = false;
    for (let i = 0; i < group.length && !disjoint; i += 1)
      for (let j = i + 1; j < group.length; j += 1) {
        const x = F(group[i].e2), y = F(group[j].e2);
        if (x.length && y.length && !x.some((w) => y.includes(w))) { disjoint = true; break; }
      }
    if (disjoint) a.split += 1;
  }
  return perAct;
}
const realFn = functionality(rows);
const rate = (m, act) => { const a = m.get(act); return a && a.subjects ? a.split / a.subjects : 0; };

// ── the floor, read off a null ───────────────────────────────────────────
// Acts reassigned among the notes: every act kept, every note kept, only
// WHICH act a note carries destroyed. An act whose split-rate under the real
// assignment is inside the redealt spread carries no information about arity.
const DRAWS = Number(process.env.DRAWS ?? 20);
let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const nullRates = new Map();
for (let d = 0; d < DRAWS; d += 1) {
  const shuffled = rows.map((r) => ({ ...r }));
  const acts = shuffled.map((r) => r.lab);
  for (let i = acts.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [acts[i], acts[j]] = [acts[j], acts[i]]; }
  shuffled.forEach((r, k) => { r.lab = acts[k]; });
  const fn = functionality(shuffled);
  for (const [act, a] of fn) {
    if (!nullRates.has(act)) nullRates.set(act, []);
    nullRates.get(act).push(a.subjects ? a.split / a.subjects : 0);
  }
}
// NON-FUNCTIONAL = a split-rate ABOVE everything the null produced for that act.
function nonFunctional(act) {
  const draws = (nullRates.get(act) ?? []).slice().sort((a, b) => a - b);
  if (draws.length < DRAWS / 2) return { verdict: null, why: "too few null draws for this act — refused, not guessed" };
  const r = rate(realFn, act), top = draws.at(-1);
  return { verdict: r > top, real: r, nullMax: top, nullMedian: draws[draws.length >> 1] };
}

// ── the typer ────────────────────────────────────────────────────────────
const hasModal = (s) => String(s ?? "").toLowerCase().split(/\s+/).some((w) => MODALS.has(w));
const negated = (s) => String(s ?? "").toLowerCase().split(/\s+/).some((w) => NEGATION_WORDS.has(w));
const bare = (s) => { const w = String(s ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? ""; return !DEFINITE_DETERMINERS.has(w) && !INDEFINITE_DETERMINERS.has(w); };

export function typeProseContradiction(a, b) {
  if (a.e1.trim().toLowerCase() !== b.e1.trim().toLowerCase())
    return { kind: "individuation", n: 1, lever: "the subjects are different surfaces merged by a feature key — split them", ev: `"${a.e1}" vs "${b.e1}"` };
  const nf = nonFunctional(headAct(a.lab));
  if (nf.verdict === true)
    return { kind: "non-functional", n: 1, lever: "the act admits many values — two values are not rivals", ev: `split-rate ${nf.real.toFixed(2)} above every null draw (max ${nf.nullMax.toFixed(2)})` };
  if (hasModal(a.lab) !== hasModal(b.lab))
    return { kind: "force", n: 1, lever: "one side carries a modal — a claim about what would be does not contest what was", ev: `"${a.lab}" vs "${b.lab}"` };
  if (negated(a.e2) !== negated(b.e2))
    return { kind: "polarity", n: 2, lever: "one side is negated — a real rival, and still undecidable at two sources", ev: `"${a.e2.slice(0, 40)}" vs "${b.e2.slice(0, 40)}"` };
  if (bare(a.e1) !== bare(b.e1))
    return { kind: "grain", n: 1, lever: "one subject is bare (a kind), the other determined (an individual)", ev: `"${a.e1}" vs "${b.e1}"` };
  if (nf.verdict === null)
    return { kind: "untyped", n: null, lever: `REFUSED: ${nf.why}`, ev: "" };
  return { kind: "contest", n: 3, lever: "same subject, functional act, same force and polarity — a third source is the lever", ev: `${a.host ?? "?"} vs ${b.host ?? "?"}` };
}

// ── run it ───────────────────────────────────────────────────────────────
const bySubjAct = new Map();
for (const r of rows) { const f = F(r.e1); if (!f.length) continue; const k = f.sort().join("|") + "::" + r.lab.toLowerCase(); if (!bySubjAct.has(k)) bySubjAct.set(k, []); bySubjAct.get(k).push(r); }
const pairs = [];
for (const group of bySubjAct.values()) for (let i = 0; i < group.length; i += 1) for (let j = i + 1; j < group.length; j += 1) {
  const x = F(group[i].e2), y = F(group[j].e2);
  if (x.length && y.length && !x.some((w) => y.includes(w))) pairs.push([group[i], group[j]]);
}
console.log(`notes ${rows.length}; apparent contradictions (same subject + act, disjoint objects): ${pairs.length}\n`);
const tally = {}; const examples = {};
for (const [a, b] of pairs) {
  const t = typeProseContradiction(a, b);
  tally[t.kind] = (tally[t.kind] ?? 0) + 1;
  if (!examples[t.kind]) examples[t.kind] = { a, b, t };
}
console.log("kind             count   decidable at   lever");
for (const [k, v] of Object.entries(tally).sort((x, y) => y[1] - x[1])) {
  const e = examples[k].t;
  console.log(`${k.padEnd(16)} ${String(v).padStart(5)}   n=${String(e.n ?? "-").padEnd(11)} ${e.lever}`);
}
const needThird = tally.contest ?? 0;
console.log(`\n  needing a third source: ${needThird} of ${pairs.length}`);
console.log(`  resolvable at n=1:      ${pairs.length - needThird - (tally.polarity ?? 0) - (tally.untyped ?? 0)} of ${pairs.length}`);
console.log(`\nOne specimen per kind:`);
for (const [k, { a, b, t }] of Object.entries(examples)) {
  console.log(`\n  [${k}]  ${t.ev}`);
  console.log(`    ${a.e1} —${a.lab}→ ${a.e2.slice(0, 62)}`);
  console.log(`    ${b.e1} —${b.lab}→ ${b.e2.slice(0, 62)}`);
}
