// native/eval/the-fold/gfp-vs-svo-first.mjs — text->GFP->SVO vs text->SVO->GFP,
// the first time either pipeline ordering is run end-to-end on real, held-out
// English text and scored against gold.
//
// THE QUESTION: eoreader7 has two candidate routes from raw text to a GFP
// claim (kernel/gfp-claim.js's Ground/Figure/Pattern), and no code path has
// ever run either of them against real gold and a real null:
//
//   ROUTE A (GFP-first):  text -> relations-gfp.js's extractGfpRelations
//                          (figure-connector-figure adjacency, no grammar,
//                          no English assumptions) -> claimFromTriple ->
//                          project(claim, "SVO") for the surface the mouth
//                          would eventually see.
//   ROUTE B (SVO-first):  text -> english-parser.js's trained UD parser
//                          (95.2 UPOS / 81.2 UAS / 77.0 LAS held-out) ->
//                          the same deprel-based (nsubj/obj) role rule used
//                          to build gold -> claimFromTriple.
//
// GOLD is derived MECHANICALLY from the treebank's own gold deprel/upos
// labels (root VERB + its nsubj* + its obj/iobj), never hand-picked, using
// the identical rule applied to both routes' predictions.
//
// CORPUS: legacy-eoreader6.1/scripts/corpus/en_ewt-ud-train.conllu, the
// SAME every-tenth-sentence held-out split english-parser.js's own 95.2/
// 81.2/77.0 numbers were measured on (english-parser.test.mjs), so this
// experiment's numbers sit on the same footing as that baseline.
//
// NULL (Born, not a hand threshold): each held-out sentence's word order is
// independently Fisher-Yates scrambled (seeded, per-sentence) and BOTH
// routes are re-run unchanged on the scrambled text. A route that is really
// reading grammatical/positional structure should lose precision sharply
// under scrambling; a route extracting mostly from co-occurrence should not.
// A one-sided Fisher exact test (alpha=0.05, the same convention this repo's
// long-project harness already uses) checks natural precision against each
// route's OWN scrambled-condition precision.
//
// MATCHING never leaks gold into a prediction: both routes build their claim
// from their own output alone. At MATCH time only, a route's surface token
// is allowed to match gold's lemma via the house `stemsOf` suffix rule
// (morphology.js) applied to the SURFACE form — a generic morphological
// equivalence check, not a lookup into gold.
//
// Usage: node native/eval/the-fold/gfp-vs-svo-first.mjs [--limit N] [--json OUT]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseConllu } from "../../kernel/eot-rich.js";
import { claimFromTriple, project } from "../../kernel/gfp-claim.js";
import { extractGfpRelations } from "../../adapters/text/relations-gfp.js";
import { loadModel, analyse, seeded } from "../../adapters/text/english-parser.js";
import { stemsOf } from "../../adapters/text/morphology.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "../../..");
const EWT = path.join(ROOT, "legacy-eoreader6.1/scripts/corpus/en_ewt-ud-train.conllu");
const POS_PRIOR = path.join(ROOT, "native/priors/pos-en.json");
const PARSER_MODEL = path.join(ROOT, "native/priors/parser-eng-ewt.json");

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const LIMIT = arg("limit", null) ? Number(arg("limit", null)) : Infinity;
const OUT = arg("json", null);

// ── load ─────────────────────────────────────────────────────────────────
const allSents = parseConllu(fs.readFileSync(EWT, "utf8"));
let held = allSents.filter((_, i) => i % 10 === 9); // the SAME split english-parser.test.mjs uses
if (Number.isFinite(LIMIT)) held = held.slice(0, LIMIT);
const posPrior = JSON.parse(fs.readFileSync(POS_PRIOR, "utf8"));
const model = loadModel(JSON.parse(fs.readFileSync(PARSER_MODEL, "utf8")));

console.log(`held-out sentences: ${held.length} (of ${allSents.length} total, every-10th split)`);

// ── shared: the mechanical deprel-based role rule, applied to gold AND to
// each route's own predicted rows (never mixed) ────────────────────────────
function rootTripleFrom(tokens) {
  const byHead = new Map();
  for (const t of tokens) {
    if (t.head == null) continue;
    if (!byHead.has(t.head)) byHead.set(t.head, []);
    byHead.get(t.head).push(t);
  }
  const root = tokens.find((t) => t.upos === "VERB" && t.deprel === "root");
  if (!root) return null;
  const kids = byHead.get(root.id) ?? [];
  const subj = kids.find((t) => /^nsubj/.test(t.deprel));
  const obj = kids.find((t) => t.deprel === "obj") ?? kids.find((t) => t.deprel === "iobj");
  if (!subj || !obj) return null; // intransitive/no-object roots excluded by declaration
  return { arg0: subj.lemma, rel: root.lemma, arg1: obj.lemma };
}

// ── a generic surface->lemma equivalence for MATCHING ONLY (never used to
// construct a prediction) — the house stemsOf suffix rule, both directions ──
function sameAct(surface, lemma) {
  const s = String(surface).toLowerCase();
  const l = String(lemma).toLowerCase();
  if (s === l) return true;
  if (stemsOf(s).has(l)) return true;
  if (stemsOf(l).has(s)) return true;
  return false;
}
function claimsMatch(a, b) {
  if (!a || !b) return false;
  if (!sameAct(a.rel, b.rel)) return false;
  if (!sameAct(a.roles.ARG0 ?? "", b.roles.ARG0 ?? "")) return false;
  if (!sameAct(a.roles.ARG1 ?? "", b.roles.ARG1 ?? "")) return false;
  return true;
}

// ── seeded per-sentence scramble (Fisher-Yates), reusing the house seeded() ─
// Exported so other structural-vs-lexical nulls can reuse the identical rule
// (e.g. a per-variety lens null) instead of re-deriving it.
export function scrambleTokens(tokens, seedKey) {
  const rand = seeded(seedKey);
  const forms = tokens.map((t) => t.form);
  for (let i = forms.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [forms[i], forms[j]] = [forms[j], forms[i]];
  }
  return forms;
}

// ── GOLD, per sentence ───────────────────────────────────────────────────
const gold = held.map((s) => {
  const triple = rootTripleFrom(s.tokens);
  return triple ? claimFromTriple(triple.arg0, triple.rel, triple.arg1) : null;
});
const goldCount = gold.filter(Boolean).length;
console.log(`gold predicates (root VERB + nsubj* + obj/iobj): ${goldCount}/${held.length} sentences`);

// ── ROUTE A: GFP-first, over concatenated text, mapped back by offset ─────
function runRouteA(sentTexts) {
  let concat = "";
  const bounds = []; // [start, end) per sentence index
  for (const t of sentTexts) {
    const start = concat.length;
    concat += t + "\n";
    bounds.push([start, concat.length]);
  }
  const arrangements = extractGfpRelations(concat, { posPrior });
  const bySentence = Array.from({ length: sentTexts.length }, () => []);
  for (const a of arrangements) {
    const idx = bounds.findIndex(([s, e]) => a.offset >= s && a.offset < e);
    if (idx === -1) continue;
    const headTok = String(a.label).split(/[^-\p{L}\p{N}]+/u).filter(Boolean)[0];
    if (!headTok) continue;
    bySentence[idx].push(claimFromTriple(a.end1, headTok, a.end2));
  }
  return bySentence;
}

// ── ROUTE B: SVO-first via the trained parser, one sentence at a time ─────
function runRouteB(sentForms) {
  return sentForms.map((forms) => {
    if (!forms.length) return [];
    let rows;
    try { rows = analyse(model, forms); } catch { return []; }
    const triple = rootTripleFrom(rows.map((r) => ({ id: r.id, head: r.head, deprel: r.deprel, upos: r.upos, lemma: r.lemma })));
    return triple ? [claimFromTriple(triple.arg0, triple.rel, triple.arg1)] : [];
  });
}

// ── score one condition (natural or scrambled) for one route ──────────────
function score(bySentenceClaims) {
  let coveredGold = 0;
  let emitted = 0;
  let emittedCorrect = 0;
  for (let i = 0; i < held.length; i += 1) {
    const g = gold[i];
    const preds = bySentenceClaims[i] ?? [];
    emitted += preds.length;
    let hit = false;
    for (const p of preds) if (claimsMatch(p, g)) { hit = true; emittedCorrect += 1; }
    if (g && hit) coveredGold += 1;
  }
  return {
    coverage: goldCount ? coveredGold / goldCount : 0,
    coveredGold, goldCount,
    precision: emitted ? emittedCorrect / emitted : 0,
    emittedCorrect, emitted,
  };
}

// ── one-sided Fisher exact test (natural precision > scrambled precision),
// via log-factorial for numerical stability — no external dependency ──────
function lfact(n) { let s = 0; for (let i = 2; i <= n; i += 1) s += Math.log(i); return s; }
function lchoose(n, k) { if (k < 0 || k > n) return -Infinity; return lfact(n) - lfact(k) - lfact(n - k); }
function fisherGreater(a, b, c, d) {
  // 2x2: [[a,b],[c,d]] = [[natural correct, natural wrong],[scrambled correct, scrambled wrong]]
  const n = a + b + c + d;
  const row1 = a + b, col1 = a + c;
  let p = 0;
  const lo = Math.max(0, row1 - (n - col1));
  const hi = Math.min(row1, col1);
  for (let x = a; x <= hi; x += 1) {
    p += Math.exp(lchoose(row1, x) + lchoose(n - row1, col1 - x) - lchoose(n, col1));
  }
  return Math.min(1, Math.max(0, p));
}

// ── run both conditions, both routes ───────────────────────────────────────
const naturalTexts = held.map((s) => s.text ?? s.tokens.map((t) => t.form).join(" "));
const naturalForms = held.map((s) => s.tokens.map((t) => t.form));
const scrambledForms = held.map((s, i) => scrambleTokens(s.tokens, `gfp-vs-svo-null-${i}`));
const scrambledTexts = scrambledForms.map((forms) => forms.join(" "));

console.log("running Route A (GFP-first) natural...");
const aNat = score(runRouteA(naturalTexts));
console.log("running Route A (GFP-first) scrambled null...");
const aNull = score(runRouteA(scrambledTexts));
console.log("running Route B (SVO-first) natural...");
const bNat = score(runRouteB(naturalForms));
console.log("running Route B (SVO-first) scrambled null...");
const bNull = score(runRouteB(scrambledForms));

const aP = fisherGreater(aNat.emittedCorrect, aNat.emitted - aNat.emittedCorrect, aNull.emittedCorrect, aNull.emitted - aNull.emittedCorrect);
const bP = fisherGreater(bNat.emittedCorrect, bNat.emitted - bNat.emittedCorrect, bNull.emittedCorrect, bNull.emitted - bNull.emittedCorrect);

const report = {
  corpus: { file: EWT, splitRule: "every 10th sentence (i % 10 === 9)", heldOutSentences: held.length, goldPredicates: goldCount },
  routeA_gfpFirst: { natural: aNat, scrambledNull: aNull, fisherExactOneSided_naturalGreater: aP, passesNull: aP < 0.05 },
  routeB_svoFirst: { natural: bNat, scrambledNull: bNull, fisherExactOneSided_naturalGreater: bP, passesNull: bP < 0.05 },
};

console.log("\n=== RESULTS ===");
console.log(JSON.stringify(report, null, 2));

if (OUT) {
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`\nwritten to ${OUT}`);
}
