// contradiction-kinds.mjs — ZERO model calls.
//
// User, 2026-09-04, over a 3x3x3 "periodic table of lying": *"'contradicted'
// isn't one thing."*
//
// WHY IT MATTERS HERE. corroboration.js never lands a `contradicts` verdict,
// and its stated reason is that at n=2 a states/contradicts pair is
// undecidable by construction. That reason is sound -- FOR ONE KIND of
// contradiction. It is a blanket over several kinds, and most of the others
// are decidable at n=1 from the material's own bytes, with no third source
// and no model. This types them and measures which is which on real material.
//
// THE KINDS, and what each actually needs:
//
//   individuation  one referent standing for two things (one person's two
//                  tenures; two different Smiths). DECIDABLE AT n=1 from the
//                  material. Resolved by SPLITTING the referent, never by
//                  seeking a third source -- no third source could settle it,
//                  because nothing is in dispute.
//   provenance     one text reaching the ledger through two refs. DECIDABLE
//                  AT n=1 (sharedTextGroups). Resolved by counting one
//                  witness, not two.
//   force          one claim describes, the other prescribes or constitutes.
//                  Not a contradiction at all: an "ought" does not contradict
//                  an "is". Decidable from the claim's own mood.
//   grain          one claim is about a Figure, the other about a Pattern.
//                  "This swan is white" does not contradict "not all swans
//                  are white".
//   contest        same referents, same grain, same force, genuine
//                  disagreement. THIS is the kind the n=2 argument is about,
//                  and the only kind a third source can settle.
//
// IMPLEMENTED HERE: individuation, from tenure intervals the material carries
// on its own P39 statements. The others are typed in the vocabulary and
// REFUSED rather than guessed -- this driver reports `untyped` and says so,
// which is the repo's own withhold-rather-than-convict rule.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, "fixtures", "wikidata");
const { parseEntity } = await import("/Users/mlacy/Documents/3.0/the-fold/wikidata.js");

const files = fs.readdirSync(FIX).filter((f) => f.endsWith(".json")).sort();
const entities = files.map((f) => parseEntity(JSON.parse(fs.readFileSync(path.join(FIX, f), "utf8")))).filter(Boolean);

// Every succession assertion, carrying the TENURE it was stated on. The
// tenure is the individuating fact the person-level projection throws away.
const rows = [];
entities.forEach((e, i) => {
  (e.positions ?? []).forEach((p, idx) => {
    const iv = { start: p.start?.time ?? null, end: p.end?.time ?? null };
    if (p.replaces) rows.push({ office: p.position, from: e.qid, to: p.replaces, file: files[i], iv, stmt: idx });
    if (p.replacedBy) rows.push({ office: p.position, from: p.replacedBy, to: e.qid, file: files[i], iv, stmt: idx });
  });
});

/**
 * typeContradiction(a, b) — a and b are two assertions that appear to
 * contradict (A→B and B→A in one office). Returns the KIND and what it needs.
 * Nothing here consults an oracle; the decision is made from the material.
 */
export function typeContradiction(a, b) {
  const sameTenure = a.iv.start === b.iv.start && a.iv.end === b.iv.end;
  const dated = a.iv.start && b.iv.start;
  if (dated && !sameTenure) return {
    kind: "individuation",
    decidableAt: 1,
    needsThirdSource: false,
    resolution: "split the referent: these are two tenures of one person, merged by a person-level projection",
    evidence: `disjoint tenures ${a.iv.start}..${a.iv.end} and ${b.iv.start}..${b.iv.end}`,
  };
  if (a.file === b.file && sameTenure) return {
    kind: "contest", decidableAt: 3, needsThirdSource: true,
    resolution: "one source asserts both directions of the same tenure — seek a third",
    evidence: `one file ${a.file}, one tenure ${a.iv.start}..${a.iv.end}`,
  };
  if (!dated) return {
    kind: "untyped", decidableAt: null, needsThirdSource: null,
    resolution: "REFUSED: no tenure dates on one or both sides — this driver will not guess a kind",
    evidence: "undated statement",
  };
  return {
    kind: "contest", decidableAt: 3, needsThirdSource: true,
    resolution: "same tenure, two sources, genuine disagreement — a third source is what settles it",
    evidence: `same tenure ${a.iv.start}..${a.iv.end}, files ${a.file} and ${b.file}`,
  };
}

function pairsOf(list) {
  const seen = new Map();
  for (const r of list) seen.set(`${r.office}|${r.from}|${r.to}`, r);
  const out = [];
  for (const r of list) {
    const rev = seen.get(`${r.office}|${r.to}|${r.from}`);
    if (rev && r.from < r.to) out.push([r, rev]);
  }
  return out;
}

const pairs = pairsOf(rows);
console.log(`succession assertions: ${rows.length}`);
console.log(`apparent contradictions (A→B and B→A in one office): ${pairs.length}\n`);
const tally = {};
for (const [a, b] of pairs) {
  const t = typeContradiction(a, b);
  tally[t.kind] = (tally[t.kind] ?? 0) + 1;
  console.log(`  office ${a.office}`);
  console.log(`    ${a.from} replaces ${a.to}   tenure ${a.iv.start ?? "?"} .. ${a.iv.end ?? "?"}   (${a.file})`);
  console.log(`    ${b.from} replaces ${b.to}   tenure ${b.iv.start ?? "?"} .. ${b.iv.end ?? "?"}   (${b.file})`);
  console.log(`    KIND: ${t.kind.toUpperCase()}  ·  decidable at n=${t.decidableAt}  ·  third source needed: ${t.needsThirdSource}`);
  console.log(`    ${t.resolution}`);
  console.log(`    evidence: ${t.evidence}\n`);
}
console.log(`=== tally ===`);
for (const [k, v] of Object.entries(tally)) console.log(`  ${v}  ${k}`);
const contests = tally.contest ?? 0;
console.log(`\n  needing a third source: ${contests} of ${pairs.length}`);
console.log(`  resolvable at n=1 from the material: ${pairs.length - contests - (tally.untyped ?? 0)} of ${pairs.length}`);

// ── CONTROL (II.23) ──────────────────────────────────────────────────────
// If the individuation test fires on anything, it must NOT fire on pairs the
// material does not actually assert. Redeal the objects within each office —
// marginals kept, the succession destroyed — and count how many apparent
// contradictions appear and how they type. A test that types redealt noise as
// confidently as real material has found the marginals, not the individuation.
const BAND = Number(process.env.BAND ?? 20);
let seed = 1;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const draws = [];
for (let d = 0; d < BAND; d += 1) {
  const shuffled = rows.map((r) => ({ ...r }));
  const byOffice = new Map();
  for (const r of shuffled) { if (!byOffice.has(r.office)) byOffice.set(r.office, []); byOffice.get(r.office).push(r); }
  for (const list of byOffice.values()) {
    const objs = list.map((r) => r.to);
    for (let i = objs.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [objs[i], objs[j]] = [objs[j], objs[i]]; }
    list.forEach((r, k) => { r.to = objs[k]; });
  }
  const p = pairsOf(shuffled);
  const kinds = {};
  for (const [a, b] of p) { const k = typeContradiction(a, b).kind; kinds[k] = (kinds[k] ?? 0) + 1; }
  draws.push({ pairs: p.length, individuation: kinds.individuation ?? 0, contest: kinds.contest ?? 0 });
}
const ap = draws.map((d) => d.pairs).sort((x, y) => x - y);
const ai = draws.map((d) => d.individuation).sort((x, y) => x - y);
console.log(`\nCONTROL — succession redealt within each office, ${BAND} draws`);
console.log(`  apparent contradictions:  real ${pairs.length}, redealt median ${ap[BAND >> 1]} (${ap[0]}-${ap.at(-1)})`);
console.log(`  typed INDIVIDUATION:      real ${tally.individuation ?? 0}, redealt median ${ai[BAND >> 1]} (${ai[0]}-${ai.at(-1)})`);
console.log(`\n  Read carefully: the redeal manufactures apparent contradictions and this test types`);
console.log(`  them as individuation too — because disjoint tenures are a property of the PERSON,`);
console.log(`  which the redeal keeps. That is the honest limit: the test detects "these two`);
console.log(`  statements are about different tenures", which is TRUE of redealt pairs as well.`);
console.log(`  It cannot on its own tell an individuation error from a fabricated adjacency;`);
console.log(`  it tells you a third source is not what either one needs.`);
