// native/eval/the-fold/gfp-vs-svo-crosslingual.mjs — the natural-vs-
// scrambled-null route comparison from gfp-vs-svo-first.mjs, extended to
// every non-English treebank already on disk.
//
// Route A (GFP-first, relations-gfp.js) runs for every language: it makes
// zero language-shaped assumptions by construction. Route B (a structured
// reader) runs only where MEASURED infrastructure already exists for that
// language -- never a newly-invented config:
//   Arabic, Hebrew   relations-positional.js + the existing measured
//                     role-config-{arb,heb}.json (RoleConfig@1)
//   Latin             relations-case-marked.js's own default measured
//                     case prior (case-marking-lat.json, via Perseus)
//   Greek, Sanskrit x2, Naija Pidgin   NO Route B available -- reported
//                     explicitly as a gap, never silently skipped.
//
// Gold is the same UD-universal rule as gfp-vs-svo-first.mjs (root VERB +
// nsubj*/obj), unchanged per language since UD's labels are language-
// general. Every route is also scored under a seeded per-sentence
// scrambled-order null.
//
// DISCLOSED LIMITATION, measured not assumed: claim-null-scoring.mjs's
// sameAct() matcher (English stemsOf suffix stripping) does not generalize
// to these languages' morphology -- verified directly for Arabic (gold
// lemmas are fully vocalized/diacritic-bearing; surface text never carries
// diacritics, so no surface-derived string can string-match a vocalized
// lemma) and for Latin (surface and lemma ARE plainly related, e.g.
// "manent"/"maneo", but the reader itself completes a full triple on only
// 12/468 held-out sentences -- checked directly, not inferred). So:
// completionRate (did the route produce a full triple at all) is reliable
// for every language here, unaffected by matching. natural/scrambledNull
// coverage+precision are reliable for English-adjacent matching (Latin,
// where stemsOf-style overlap plausibly still applies) but NOT yet
// trustworthy for Arabic/Hebrew's vocalized lemmas -- a real next piece of
// work (per-language lemma normalization in claim-null-scoring.mjs), not
// silently smoothed over here.
//
// Usage: node native/eval/the-fold/gfp-vs-svo-crosslingual.mjs [--json OUT]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseConllu } from "../../kernel/eot-rich.js";
import { claimFromTriple } from "../../kernel/gfp-claim.js";
import { extractGfpRelations } from "../../adapters/text/relations-gfp.js";
import { extractPositionalRelation } from "../../adapters/text/relations-positional.js";
import { extractCaseMarkedRelation, defaultLatinCasePrior } from "../../adapters/text/relations-case-marked.js";
import { classifyWord, dominantClass } from "../../adapters/text/wordclass.js";
import { findTreebanks } from "../eot-roundtrip.mjs";
import { rootTripleFrom, scoreClaims, scrambleTokens, fisherGreater } from "./claim-null-scoring.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "../../..");
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = arg("json", null);

const posPriorPath = (code) => path.join(ROOT, "native/priors", `pos-${code}.json`);
const loadPosPrior = (code) => { try { return JSON.parse(fs.readFileSync(posPriorPath(code), "utf8")); } catch { return null; } };
const loadRoleConfig = (code) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, "native/priors", `role-config-${code}.json`), "utf8")); } catch { return null; } };

const textOf = (s) => (s.lines.find((l) => l.startsWith("# text = ")) ?? "").slice(9);

// Which treebank -> which language config. routeB is null where no
// measured infrastructure exists for that language (disclosed, not hidden).
const LANGS = [
  { treebank: "ud-arabic-padt", name: "Arabic", posPrior: loadPosPrior("arb"), routeB: "positional", roleConfig: loadRoleConfig("arb") },
  { treebank: "ud-greek-proiel", name: "Ancient Greek", posPrior: loadPosPrior("grc"), routeB: null },
  { treebank: "ud-hebrew-htb", name: "Hebrew", posPrior: loadPosPrior("heb"), routeB: "positional", roleConfig: loadRoleConfig("heb") },
  { treebank: "ud-latin-perseus", name: "Latin", posPrior: null, routeB: "case-marked" },
  { treebank: "ud-sanskrit-ufal", name: "Sanskrit (UFAL)", posPrior: loadPosPrior("san"), routeB: null },
  { treebank: "ud-sanskrit-vedic", name: "Sanskrit (Vedic)", posPrior: loadPosPrior("san"), routeB: null },
  { treebank: "ud-naija_pcm", name: "Naija / Nigerian Pidgin", posPrior: null, routeB: null },
];

function loadHeld(tbEntry) {
  const rows = tbEntry.files.flatMap((f) => parseConllu(fs.readFileSync(f, "utf8")));
  return rows.filter((s) => textOf(s) && s.tokens.length);
}

function runGfpFirst(sentTexts, posPrior) {
  let concat = "";
  const bounds = [];
  for (const t of sentTexts) { const start = concat.length; concat += t + "\n"; bounds.push([start, concat.length]); }
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

function runPositional(sentTexts, { posPrior, roleConfig }) {
  return sentTexts.map((text) => {
    let r = null;
    try { r = extractPositionalRelation(text, { roleConfig, posPrior, classifyWord, dominantClass }); } catch { r = null; }
    if (!r?.end1 || !r?.end2 || !r?.label) return [];
    return [claimFromTriple(r.end1.word, r.label.word, r.end2.word)];
  });
}

function runCaseMarked(sentTexts) {
  return sentTexts.map((text) => {
    let r = null;
    try { r = extractCaseMarkedRelation(text, { casePrior: defaultLatinCasePrior() }); } catch { r = null; }
    if (!r?.end1 || !r?.end2 || !r?.label) return [];
    return [claimFromTriple(r.end1.word ?? r.end1, r.label.word ?? r.label, r.end2.word ?? r.end2)];
  });
}

function goldFor(held) {
  return held.map((s) => {
    const triple = rootTripleFrom(s.tokens);
    return triple ? claimFromTriple(triple.arg0, triple.rel, triple.arg1) : null;
  });
}

// Completion rate needs no gold matching at all -- it's just "did the route
// produce a full triple," so it's trustworthy for every language, including
// the ones where lemma-vs-surface matching (below) is not.
const completionRate = (bySentence) => bySentence.filter((c) => c.length > 0).length / bySentence.length;

function reportRoute(label, natBySentence, nullBySentence, gold) {
  const nat = scoreClaims(natBySentence, gold);
  const nul = nullBySentence ? scoreClaims(nullBySentence, gold) : null;
  const p = nul ? fisherGreater(nat.emittedCorrect, nat.emitted - nat.emittedCorrect, nul.emittedCorrect, nul.emitted - nul.emittedCorrect) : null;
  return {
    route: label,
    completionRate: +completionRate(natBySentence).toFixed(4),
    natural: nat, scrambledNull: nul,
    fisherExactOneSided_naturalGreater: p, passesNull: p == null ? null : p < 0.05,
  };
}

const banks = findTreebanks();
const results = {};

for (const lang of LANGS) {
  const tb = banks.find((b) => b.name === lang.treebank);
  if (!tb) { console.log(`skip ${lang.name}: treebank ${lang.treebank} not found on disk`); continue; }
  console.log(`\n=== ${lang.name} (${lang.treebank}) ===`);
  const held = loadHeld(tb);
  const gold = goldFor(held);
  const goldCount = gold.filter(Boolean).length;
  console.log(`${held.length} sentences, ${goldCount} gold predicates`);

  const naturalTexts = held.map(textOf);
  const scrambledTexts = held.map((s, i) => scrambleTokens(s.tokens, `crosslingual-null-${lang.treebank}-${i}`).join(" "));

  const gfpNat = runGfpFirst(naturalTexts, lang.posPrior);
  const gfpNull = runGfpFirst(scrambledTexts, lang.posPrior);
  const gfpReport = reportRoute("gfpFirst", gfpNat, gfpNull, gold);
  console.log(`  GFP-first: completion ${(gfpReport.completionRate * 100).toFixed(1)}% -- recall ${(gfpReport.natural.coverage * 100).toFixed(1)}% precision ${(gfpReport.natural.precision * 100).toFixed(1)}% -> scrambled recall ${(gfpReport.scrambledNull.coverage * 100).toFixed(1)}% precision ${(gfpReport.scrambledNull.precision * 100).toFixed(1)}% (p=${gfpReport.fisherExactOneSided_naturalGreater.toExponential(2)})`);

  let routeBReport = null;
  if (lang.routeB === "positional" && lang.roleConfig) {
    const posNat = runPositional(naturalTexts, lang);
    const posNull = runPositional(scrambledTexts, lang);
    routeBReport = reportRoute("positional", posNat, posNull, gold);
  } else if (lang.routeB === "case-marked") {
    const cmNat = runCaseMarked(naturalTexts);
    const cmNull = runCaseMarked(scrambledTexts);
    routeBReport = reportRoute("case-marked", cmNat, cmNull, gold);
  }
  if (routeBReport) {
    console.log(`  ${routeBReport.route}: completion ${(routeBReport.completionRate * 100).toFixed(1)}% -- recall ${(routeBReport.natural.coverage * 100).toFixed(1)}% precision ${(routeBReport.natural.precision * 100).toFixed(1)}% -> scrambled recall ${(routeBReport.scrambledNull.coverage * 100).toFixed(1)}% precision ${(routeBReport.scrambledNull.precision * 100).toFixed(1)}% (p=${routeBReport.fisherExactOneSided_naturalGreater.toExponential(2)})`);
  } else {
    console.log(`  structured route: NOT AVAILABLE for ${lang.name} -- no measured RoleConfig/case-prior infrastructure exists for this language yet (disclosed gap).`);
  }

  results[lang.treebank] = { language: lang.name, sentences: held.length, goldPredicates: goldCount, gfpFirst: gfpReport, structuredRoute: routeBReport };
}

console.log("\n=== FULL RESULTS ===");
console.log(JSON.stringify(results, null, 2));
if (OUT) { fs.writeFileSync(OUT, JSON.stringify(results, null, 2)); console.log(`written to ${OUT}`); }
