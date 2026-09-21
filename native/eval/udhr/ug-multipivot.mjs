#!/usr/bin/env node
// Handle: Chomsky — the same principle, reached from many languages at once.
// eval/udhr/ug-multipivot.mjs — MULTI-PIVOT PROJECTION, LEAVE-ONE-OUT.
//
// The single-pivot test (ug-projection.mjs) recovered a word's cube cell from
// English alone and kept only 9–48 words a language: a word that never
// co-occurs with an English word sharply enough is never linked. Different
// languages link different words, so each target is aligned against EVERY
// language we hold a treebank prior for — never against itself — and each
// word takes the majority cell across the pivots that reached it.
//
// LEAVE-ONE-OUT. A language's own prior is used only to SCORE it, never as a
// pivot for it, so the check stays independent of what it checks.
//
// Pivots are the languages whose own prior actually covers their UDHR tokens
// (a prior in another script or tagging only verbs cannot type a pivot word):
// measured, not assumed — see `pivotCoverage` in the output.
//
//   node native/eval/udhr/ug-multipivot.mjs [--shuffles N]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadUdhr } from "./udhr-corpus.mjs";
import { projectLanguage, score, tokens, VALIDATION } from "./ug-projection.mjs";
import { addressOfUpos } from "../../kernel/universal-grammar.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIORS = path.resolve(HERE, "..", "..", "priors");

function priorOf(code) {
  const f = path.join(PRIORS, `pos-${code}.json`);
  if (!fs.existsSync(f)) return null;
  const forms = JSON.parse(fs.readFileSync(f, "utf8")).forms ?? {};
  return (w) => {
    const e = forms[w];
    if (!e) return null;
    return Object.entries(e).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  };
}

/** Share of a translation's word tokens its own prior can type. */
function coverage(doc, upos) {
  const toks = [...doc.preamble, ...doc.articles.flatMap((a) => a.paragraphs)].flatMap(tokens);
  if (!toks.length) return 0;
  return toks.filter((t) => upos(t)).length / toks.length;
}

/** Majority vote over the pivots' projected cells; a tie is ambiguous. */
export function vote(perPivot) {
  const votes = new Map();
  for (const [pivot, projected] of perPivot) {
    for (const [x, p] of projected) {
      if (!votes.has(x)) votes.set(x, new Map());
      const m = votes.get(x);
      m.set(p.cell, (m.get(p.cell) ?? 0) + 1);
    }
  }
  const out = new Map();
  let ties = 0;
  for (const [x, m] of votes) {
    const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) { ties++; continue; }
    const total = sorted.reduce((s, e) => s + e[1], 0);
    out.set(x, { cell: sorted[0][0], support: sorted[0][1], of: total });
  }
  return { projected: out, ties };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const si = process.argv.indexOf("--shuffles");
  const shuffles = si > 0 ? Number(process.argv[si + 1]) : 10;
  const docs = new Map(loadUdhr().filter((d) => d.blocks === 31).map((d) => [d.code, d]));
  const langs = { en: "eng", ...VALIDATION };
  // Which languages can serve as pivots: their own prior types their tokens.
  const pivots = [];
  console.log("pivot coverage (share of a translation's tokens its own prior can type):");
  for (const [pcode, ucode] of Object.entries(langs)) {
    const doc = docs.get(ucode); const upos = priorOf(pcode === "en" ? "eng" : pcode);
    if (!doc || !upos) continue;
    const cov = coverage(doc, upos);
    console.log(`   ${pcode.padEnd(4)} ${(100 * cov).toFixed(1)}%`);
    if (cov >= 0.25) pivots.push({ pcode, ucode, doc, cellOf: (w) => { const u = upos(w); return u ? addressOfUpos(u)?.cell ?? null : null; } });
  }
  console.log(`pivots: ${pivots.map((p) => p.pcode).join(" ")}\n`);

  console.log(`${"lang".padEnd(5)} ${"pivots".padStart(6)} ${"proj".padStart(5)} ${"ties".padStart(5)} | ${"checked".padStart(7)} ${"agree".padStart(6)} ${"null".padStart(6)} ${"null99".padStart(6)} | single-pivot checked`);
  const rows = [];
  for (const [pcode, ucode] of Object.entries(VALIDATION)) {
    const target = docs.get(ucode); const own = priorOf(pcode);
    if (!target) continue;
    const perPivot = [];
    for (const p of pivots) {
      if (p.pcode === pcode) continue; // leave one out
      perPivot.push([p.pcode, projectLanguage(p.doc, target, { pivot: p.cellOf, shuffles }).projected]);
    }
    const { projected, ties } = vote(perPivot);
    const s = own ? score(projected, own, { seed: pcode }) : { n: 0 };
    const single = perPivot.find(([k]) => k === "en")?.[1];
    const s1 = single && own ? score(single, own, { seed: pcode }) : { n: 0 };
    rows.push({ lang: pcode, pivots: perPivot.length, projected: projected.size, ties, score: s, singlePivot: s1 });
    console.log(`${pcode.padEnd(5)} ${String(perPivot.length).padStart(6)} ${String(projected.size).padStart(5)} ${String(ties).padStart(5)} | ${String(s.n).padStart(7)} ${s.n ? (100 * s.acc).toFixed(1).padStart(5) + "%" : "   n/a"} ${s.n ? (100 * s.nullMean).toFixed(1).padStart(5) + "%" : "      "} ${s.n ? (100 * s.null99).toFixed(1).padStart(5) + "%" : "      "} | ${s1.n ?? 0}`);
  }
  const out = path.resolve(HERE, "..", "results", "ug-multipivot.json");
  fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), shuffles, pivots: pivots.map((p) => p.pcode), rows }, null, 2));
  console.log(`\n${out}`);
}
