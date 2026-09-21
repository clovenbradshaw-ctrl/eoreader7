#!/usr/bin/env node
// Handle: Chomsky — principles are universal, parameters are set from little input.
// eval/udhr/ug-projection.mjs — THE FIRST UNIVERSAL-GRAMMAR TEST.
//
// The principle under test: every word of every language takes a cube cell
// (kernel/universal-grammar.js). If that principle is universal, a word's
// cell should be RECOVERABLE in a language the engine has never been given a
// grammar for, from nothing but the same meaning said in another language.
//
// The UDHR supplies exactly that and nothing more. Each language's thirty
// articles are aligned to English's by structure (udhr-corpus.mjs). Words are
// linked to English words by co-occurrence across the aligned units (Dice),
// the English word's cell is read from a part-of-speech prior measured on a
// real English treebank, and the cell is carried across the link.
//
// THE CHECK IS INDEPENDENT. For thirteen languages we also hold a
// part-of-speech prior measured on that language's OWN treebank. Nothing in
// that prior was used to make the projection. Agreement between the projected
// cell and the cell the language's own treebank implies is the score.
//
// NO HAND-SET CUT ANYWHERE. A link is kept only when its Dice beats what the
// same words reach when the units are SHUFFLED — the language's own null, at
// its 99th percentile. The score is reported beside its own null: the
// accuracy the same projected cells reach when shuffled among the same words,
// which is what the class distribution alone would buy.
//
//   node native/eval/udhr/ug-projection.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadUdhr } from "./udhr-corpus.mjs";
import { addressOfUpos } from "../../kernel/universal-grammar.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIORS = path.resolve(HERE, "..", "..", "priors");

/** prior file code → UDHR file code, where both exist */
export const VALIDATION = Object.freeze({
  arb: "arb", cmn: "cmn_hans", ell: "ell_monotonic", fas: "pes_1", fin: "fin", fra: "fra", heb: "heb",
  kor: "kor", rus: "rus", spa: "spa", tur: "tur", san: "san", jpn: "jpn",
});

function seeded(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
export const tokens = (text) => {
  const out = [];
  for (const { segment, isWordLike } of segmenter.segment(String(text ?? ""))) if (isWordLike) out.push(segment.toLocaleLowerCase());
  return out;
};

/** Aligned units: paragraph by paragraph where both translations split an
 *  article into the same number of paragraphs, else the whole article. */
export function alignUnits(a, b) {
  const units = [];
  const both = [[a.preamble, b.preamble], ...a.articles.map((art, i) => [art.paragraphs, b.articles[i]?.paragraphs ?? []])];
  for (const [pa, pb] of both) {
    if (pa.length && pa.length === pb.length) for (let i = 0; i < pa.length; i++) units.push([pa[i], pb[i]]);
    else units.push([pa.join(" "), pb.join(" ")]);
  }
  return units;
}

/** Co-occurrence counts across units, and each word's unit frequency. */
function cooccur(unitsA, unitsB) {
  const fa = new Map(), fb = new Map(), c = new Map();
  for (let u = 0; u < unitsA.length; u++) {
    const A = unitsA[u], B = unitsB[u];
    for (const w of A) fa.set(w, (fa.get(w) ?? 0) + 1);
    for (const x of B) {
      fb.set(x, (fb.get(x) ?? 0) + 1);
      let row = c.get(x); if (!row) { row = new Map(); c.set(x, row); }
      for (const w of A) row.set(w, (row.get(w) ?? 0) + 1);
    }
  }
  return { fa, fb, c };
}

/** For each word of B, its best Dice partners in A (all partners tied at the best). */
function bestLinks({ fa, fb, c }) {
  const out = new Map();
  for (const [x, row] of c) {
    let best = 0, who = [];
    for (const [w, n] of row) {
      const d = (2 * n) / (fa.get(w) + fb.get(x));
      if (d > best + 1e-12) { best = d; who = [w]; } else if (Math.abs(d - best) <= 1e-12) who.push(w);
    }
    out.set(x, { dice: best, partners: who, freq: fb.get(x) });
  }
  return out;
}

/** THE NULL IS STRATIFIED BY FREQUENCY (measured 2026-09-21: an unstratified
 *  99th percentile came out at exactly 1.0 in all thirteen languages and
 *  linked nothing). A word seen in one unit reaches Dice 1 with any English
 *  one-off in the same unit, shuffled or not, and such words dominate the
 *  null's tail. So each word faces the chance ceiling of words seen as often
 *  as it was. A one-off's ceiling is 1, so no one-off is ever linked: a
 *  single co-occurrence cannot tell a translation from an accident, and the
 *  record says so rather than guessing. */
const freqBin = (k) => (k <= 4 ? String(k) : k <= 7 ? "5-7" : k <= 15 ? "8-15" : "16+");

export function projectLanguage(eng, target, { pivot, shuffles = 20 } = {}) {
  const units = alignUnits(eng, target);
  const A = units.map(([e]) => new Set(tokens(e)));
  const B = units.map(([, x]) => new Set(tokens(x)));
  const truth = bestLinks(cooccur(A, B));
  // THE NULL: the same words, the same units, the alignment shuffled.
  const rand = seeded(`${target.code}#null`);
  const nullBest = new Map();
  for (let s = 0; s < shuffles; s++) {
    const perm = B.map((_, i) => i);
    for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    for (const { dice, freq } of bestLinks(cooccur(A, perm.map((i) => B[i]))).values()) {
      const k = freqBin(freq); if (!nullBest.has(k)) nullBest.set(k, []); nullBest.get(k).push(dice);
    }
  }
  const cutOf = new Map();
  for (const [k, v] of nullBest) { v.sort((a, b) => a - b); cutOf.set(k, v[Math.floor(0.99 * (v.length - 1))]); }
  const cutFor = (freq) => cutOf.get(freqBin(freq)) ?? 1;
  const cut = Object.fromEntries([...cutOf.entries()].sort().map(([k, v]) => [k, Number(v.toFixed(2))]));

  const projected = new Map();
  let linked = 0, ambiguous = 0, unpivoted = 0;
  for (const [x, { dice, partners, freq }] of truth) {
    if (dice <= cutFor(freq)) continue;
    linked++;
    const cells = new Set(partners.map((w) => pivot(w)).filter(Boolean));
    if (!cells.size) { unpivoted++; continue; }
    if (cells.size > 1) { ambiguous++; continue; }
    projected.set(x, { cell: [...cells][0], via: partners[0], dice });
  }
  return { code: target.code, units: units.length, vocab: truth.size, cut, linked, ambiguous, unpivoted, projected };
}

function priorOf(code) {
  const f = path.join(PRIORS, `pos-${code}.json`);
  if (!fs.existsSync(f)) return null;
  const forms = JSON.parse(fs.readFileSync(f, "utf8")).forms ?? {};
  return (w) => {
    const e = forms[w] ?? forms[w?.toLowerCase?.()];
    if (!e) return null;
    const top = Object.entries(e).sort((a, b) => b[1] - a[1])[0]?.[0];
    return top ?? null;
  };
}

export function score(projected, priorUpos, { shuffles = 200, seed = "score" } = {}) {
  const pairs = [];
  for (const [x, p] of projected) {
    const u = priorUpos(x);
    const cell = u ? addressOfUpos(u)?.cell : null;
    if (cell) pairs.push([p.cell, cell]);
  }
  if (!pairs.length) return { n: 0 };
  const acc = pairs.filter(([a, b]) => a === b).length / pairs.length;
  const rand = seeded(seed);
  const nulls = [];
  const proj = pairs.map((p) => p[0]);
  for (let s = 0; s < shuffles; s++) {
    const perm = [...proj];
    for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    nulls.push(perm.filter((c, i) => c === pairs[i][1]).length / pairs.length);
  }
  nulls.sort((a, b) => a - b);
  return { n: pairs.length, acc, nullMean: nulls.reduce((a, b) => a + b, 0) / nulls.length, null99: nulls[Math.floor(0.99 * (nulls.length - 1))] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const all = loadUdhr().filter((d) => d.blocks === 31);
  const byCode = new Map(all.map((d) => [d.code, d]));
  const eng = byCode.get("eng");
  const engUpos = priorOf("eng");
  const pivot = (w) => { const u = engUpos(w); return u ? addressOfUpos(u)?.cell ?? null : null; };
  console.log(`${"prior".padEnd(5)} ${"udhr".padEnd(14)} ${"units".padStart(5)} ${"vocab".padStart(5)} ${"cut5-7".padStart(5)} ${"linked".padStart(6)} ${"proj".padStart(5)} | ${"checked".padStart(7)} ${"agree".padStart(6)} ${"null".padStart(6)} ${"null99".padStart(6)}`);
  const rows = [];
  for (const [pcode, ucode] of Object.entries(VALIDATION)) {
    const target = byCode.get(ucode);
    if (!target) { console.log(`${pcode.padEnd(5)} ${ucode.padEnd(14)} — no segmented translation`); continue; }
    const r = projectLanguage(eng, target, { pivot });
    const prior = priorOf(pcode);
    const s = prior ? score(r.projected, prior, { seed: pcode }) : { n: 0 };
    rows.push({ prior: pcode, udhr: ucode, ...r, projected: r.projected.size, score: s });
    console.log(`${pcode.padEnd(5)} ${ucode.padEnd(14)} ${String(r.units).padStart(5)} ${String(r.vocab).padStart(5)} ${String(r.cut["5-7"] ?? "-").padStart(5)} ${String(r.linked).padStart(6)} ${String(r.projected.size).padStart(5)} | ${String(s.n).padStart(7)} ${s.n ? (100 * s.acc).toFixed(1).padStart(5) + "%" : "   n/a"} ${s.n ? (100 * s.nullMean).toFixed(1).padStart(5) + "%" : ""} ${s.n ? (100 * s.null99).toFixed(1).padStart(5) + "%" : ""}`);
  }
  const out = path.resolve(HERE, "..", "results", "ug-projection.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), rows }, null, 2));
  console.log(`\n${out}`);
}
