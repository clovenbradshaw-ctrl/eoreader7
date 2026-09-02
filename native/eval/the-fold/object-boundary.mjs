// eval/the-fold/object-boundary.mjs — the received object boundary (P74
// lever 3), measured before it ships. Two arms over the same real book
// through the SAME production reader bundle: baseline (the object runs to
// the measured function-word class, or the clause terminator below the
// corpus floor) vs bounded (objectBoundaryFrom: the POS prior's ADP/SCONJ-
// dominant forms plus the received clause classes).
//
// What is reported, and why each number:
//   edges, distinct objects      — the cut must not lose edges (it can only
//                                  shorten an object, never refuse one)
//   debris rate                  — share of objects that CONTAIN a boundary
//                                  token after their first token; the thing
//                                  the cut exists to remove
//   end2Face rate                — share of edges whose object resolved to
//                                  exactly one earned referent face — the
//                                  Station-3→4 wire; the baseline P74 set
//   object token length (median) — the shape of what changed
//   THE MARGINAL CHANGES (LP11)  — every judgment is on what the cut MOVED,
//                                  never on the aggregate: a sample of
//                                  before→after pairs printed for reading
//   THE COST                     — known multiword referent surfaces that
//                                  carry a boundary token inside them
//                                  ("Duke of Wellington"): how many exist,
//                                  and how many objects the cut truncated
//                                  INSIDE such a surface
// A control built to fail (II.23): the cut applied with the boundary set
// REDEALT (the same number of forms drawn at random from the prior's
// non-boundary forms) must NOT lower the debris rate — if a random word
// set "helps", the measure is counting something other than adjuncts.
import { readFileSync } from "node:fs";
const FOLD = new URL("../../../../the-fold/", import.meta.url).pathname;
const NATIVE = new URL("../..", import.meta.url).pathname;
const { makeRelationReader } = await import(`${FOLD}/hypergraph.js`);
const { chunkSource, blankLabelRows } = await import(`${FOLD}/source.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations, objectBoundaryFrom } = await import(`${NATIVE}/adapters/text/relations.js`);
const { tokenize } = await import(`${NATIVE}/adapters/text/material.js`);
const enginePriors = await import(`${NATIVE}/adapters/text/priors.js`);

const BOOK = process.env.BOOK ?? `${FOLD}/../live_priors/01-literature-books/gutenberg/pg345_Dracula.txt`;
const CAP = Number(process.env.CAP ?? 400);          // passages read — declared, a slice not the whole
const MIN_SHARE = 0.5;                                // hypergraph.js's own GRAMMAR_MIN_SHARE, cited not re-chosen
const SEED = Number(process.env.SEED ?? 7);
const posPrior = JSON.parse(readFileSync(`${FOLD}/priors-data/pos-prior-eng.json`, "utf8"));
const text = readFileSync(BOOK, "utf8");
const passages = chunkSource("book.txt", text).slice(0, CAP);
const boundary = objectBoundaryFrom(posPrior, { minShare: MIN_SHARE });

function reader({ objectBoundaryFrom: obf } = {}) {
  return makeRelationReader({
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
    posPriorFor: () => posPrior,
    determiners: new Set([...enginePriors.DEFINITE_DETERMINERS, ...enginePriors.INDEFINITE_DETERMINERS]),
    negationWords: enginePriors.NEGATION_WORDS,
    blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
    resolvePronouns,
    nounPhraseSubjects: true,
    ...(obf ? { objectBoundaryFrom: obf, boundedObjects: true } : {}),
  });
}
const lcg = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
function redealtBoundary(seed) {
  const r = lcg(seed);
  const pool = Object.keys(posPrior.forms).filter((f) => !boundary.has(f));
  const out = new Set();
  while (out.size < boundary.size) out.add(pool[Math.floor(r() * pool.length)]);
  return out;
}

function measure(rel, label) {
  const edges = rel.edges ?? [];
  const objs = edges.map((e) => String(e.end2 ?? e.object ?? ""));
  const toks = (o) => o.toLowerCase().split(/\s+/).filter(Boolean);
  const debris = objs.filter((o) => toks(o).slice(1).some((t) => boundary.has(t))).length;
  const faced = edges.filter((e) => e.end2Face).length;
  const lens = objs.map((o) => toks(o).length).sort((a, b) => a - b);
  const median = lens.length ? lens[Math.floor(lens.length / 2)] : 0;
  return { label, edges: edges.length, distinctObjects: new Set(objs.map((o) => o.toLowerCase())).size, debrisRate: edges.length ? debris / edges.length : 0, end2FaceRate: edges.length ? faced / edges.length : 0, medianObjectTokens: median, objs, rows: edges };
}

const t0 = Date.now();
const base = measure(reader()(passages, { pool: passages }), "baseline");
const bound = measure(reader({ objectBoundaryFrom })(passages, { pool: passages }), "bounded");
const redealt = measure(reader({ objectBoundaryFrom: () => redealtBoundary(SEED) })(passages, { pool: passages }), "redealt-control");
const say = (s) => console.log(s);
say(`object boundary — ${BOOK.split("/").pop()}, ${passages.length} passage(s), minShare ${MIN_SHARE}, boundary forms ${boundary.size}, ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
say(`arm                edges  distinct-objects  debris-rate  end2Face-rate  median-obj-tokens`);
for (const m of [base, bound, redealt]) say(`${m.label.padEnd(18)} ${String(m.edges).padStart(5)}  ${String(m.distinctObjects).padStart(16)}  ${m.debrisRate.toFixed(3).padStart(11)}  ${m.end2FaceRate.toFixed(3).padStart(13)}  ${String(m.medianObjectTokens).padStart(17)}`);

// THE MARGINAL CHANGES — paired by the edge's own ADDRESS START and verb
// (the trim never moves a match's start; it can change how many matches a
// per-sentence limit admits, so index pairing is not safe — found by running).
const addr = (e) => { const a = e.spans?.[0]?.at ?? e.refs?.[0] ?? ""; const m = String(a).match(/^(.*#\d+)-\d+$/); return `${m ? m[1] : a}|${String(e.label ?? e.verb)}|${String(e.end1 ?? e.subject)}`; };
const after = new Map(bound.rows.map((e) => [addr(e), e]));
const moved = [];
let paired = 0, facedGained = 0, facedLost = 0, unpaired = 0;
for (const e of base.rows) {
  const b = after.get(addr(e));
  if (!b) { unpaired += 1; continue; }
  paired += 1;
  const before = String(e.end2 ?? e.object), afterO = String(b.end2 ?? b.object);
  if (before !== afterO) { moved.push([before, afterO]); if (!e.end2Face && b.end2Face) facedGained += 1; if (e.end2Face && !b.end2Face) facedLost += 1; }
}
say(`\npaired ${paired} of ${base.edges} baseline edges by address (${unpaired} unpaired; bounded has ${bound.edges - paired} not in baseline — matches a per-sentence limit newly admitted).`);
say(`moved by the cut: ${moved.length}; among them end2Face GAINED ${facedGained}, LOST ${facedLost}. A sample (LP11 — judged on the marginal, never the aggregate):`);
const r = lcg(SEED);
for (const [b, a] of moved.slice().sort(() => r() - 0.5).slice(0, 24)) say(`  "${b}"  →  "${a}"`);

// THE LEXICON ON THIS TEXT — the cut can only land on tokens the prior
// attests, so its reach here is the prior's coverage here.
{
  const occ = new Map();
  for (const p of passages) for (const t of tokenize(String(p.text ?? ""))) occ.set(t, (occ.get(t) ?? 0) + 1);
  let known = 0, total = 0, knownTypes = 0;
  const oov = [];
  for (const [t, n] of occ) { total += n; if (posPrior.forms[t]) { known += n; knownTypes += 1; } else oov.push([t, n]); }
  oov.sort((a, b) => b[1] - a[1]);
  say(`\nlexicon on this text: ${(100 * known / total).toFixed(1)}% of token occurrences attested (${knownTypes} of ${occ.size} types, ${(100 * knownTypes / occ.size).toFixed(1)}%); top out-of-vocabulary: ${oov.slice(0, 16).map(([t, n]) => `${t}×${n}`).join(", ")}`);
  // and the boundary's own blind spots: object tokens (after the first) the prior does not know at all
  const blind = new Map();
  for (const e of bound.rows) for (const t of String(e.end2 ?? e.object).toLowerCase().split(/\s+/).slice(1)) if (t && !posPrior.forms[t]) blind.set(t, (blind.get(t) ?? 0) + 1);
  say(`object tokens the prior cannot classify (no cut possible there): ${blind.size} types; top: ${[...blind].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t, n]) => `${t}×${n}`).join(", ")}`);
}

// THE COST — multiword referent surfaces carrying a boundary token inside
const refs = discoverReferents(extractSurfaces(splitSentences(passages.map((p) => p.text).join("\n\n"))), {});
const surfaces = new Set();
for (const ev of refs?.events ?? []) if (ev?.surface) surfaces.add(String(ev.surface));
const withBoundary = [...surfaces].filter((s) => s.split(/\s+/).slice(1, -1).some((t) => boundary.has(t.toLowerCase())));
const truncatedInside = moved.filter(([b]) => withBoundary.some((s) => b.toLowerCase().includes(s.toLowerCase()))).length;
say(`\ncost: ${withBoundary.length} of ${surfaces.size} known referent surfaces carry a boundary token inside them${withBoundary.length ? ` (e.g. ${withBoundary.slice(0, 5).map((s) => `"${s}"`).join(", ")})` : ""}; the cut truncated an object INSIDE such a surface ${truncatedInside} time(s).`);
say(`control: the redealt boundary (same size, random non-boundary forms) reads debris ${redealt.debrisRate.toFixed(3)} vs bounded ${bound.debrisRate.toFixed(3)} — ${redealt.debrisRate >= base.debrisRate - 1 / Math.max(1, base.edges) ? "the control did NOT lower the debris rate (within one edge): the measure counts adjuncts" : "THE CONTROL LOWERED IT — the measure is not counting adjuncts; do not trust the bounded number"}`);
