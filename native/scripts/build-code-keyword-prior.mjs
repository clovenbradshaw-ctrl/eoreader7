#!/usr/bin/env node
// build-code-keyword-prior — LanguageLawPrior@1 in, CodeKeywordPrior@1 out:
// the per-language CLOSED CLASS the code reader must never mistake for a
// declared name.
//
// LANGUAGE-GENERAL BY CONSTRUCTION. Every LanguageLawPrior@1 carries the
// same `lexical` shape (`keywords`, optional `softKeywords`, optional
// `builtins`), so this script has no per-language branch anywhere — the
// language is a CLI argument and a provenance field, never a branch. Built
// unmodified for Python (CPython-introspected) and JavaScript
// (tree-sitter-derived); see the ants' forage (PY∩JS=18 shared, 17
// python-only, 25 javascript-only) for why one blended list cannot serve.
//
// POLARITY (S83's own asymmetric rule, applied to code): a form the giver
// SETTLES as a hard keyword can never name a being — refused. A form the
// giver never saw is admitted — a witness cannot refuse what it never saw.
// Soft keywords (python `match`/`case`/`type`/`_`) and builtins (`list`,
// `id`, `type`, ...) are LEGALLY DECLARABLE and therefore recorded but
// NEVER refused — shadowing a builtin is a real, disclosed fact about the
// material, not a parse failure. (Ant 1's own warning: `type` is a double
// hazard — builtin AND soft keyword — and still declarable.)
//
// SOURCE, INTACT ELSEWHERE (no ambient network I/O in a data-transform
// script — build-pos-prior.mjs's own discipline): the input is a
// live_priors LanguageLawPrior@1 file, derived from the running engine
// (python: keyword.kwlist + dir(builtins)) or the tree-sitter grammar
// (javascript: anonymous lowercase tokens). Never hand-typed: this is a
// projection of the giver, not a re-definition of it.
//
// Usage: node native/scripts/build-code-keyword-prior.mjs <in-law-prior.json> <out.json> <lang>
//   <lang> must equal the input's own `language` field (checked, not trusted).

import { readFileSync, writeFileSync } from "node:fs";

const IN = process.argv[2];
const OUT = process.argv[3];
const LANGUAGE = process.argv[4];

if (!IN || !OUT || !LANGUAGE) {
  console.error("usage: node build-code-keyword-prior.mjs <in-law-prior.json> <out.json> <lang>");
  process.exit(1);
}

const giver = JSON.parse(readFileSync(IN, "utf8"));

if (giver.schema !== "LanguageLawPrior@1") {
  console.error(`refusing: ${IN} is schema ${giver.schema}, not LanguageLawPrior@1`);
  process.exit(1);
}
if (giver.language !== LANGUAGE) {
  console.error(`refusing: input language is ${giver.language}, asked for ${LANGUAGE}`);
  process.exit(1);
}

const keywords = [...(giver.lexical?.keywords ?? [])];
const softKeywords = [...(giver.lexical?.softKeywords ?? [])];
const builtins = Array.isArray(giver.builtins) ? [...giver.builtins] : [];

// The giver's own junk check (measured on the typescript prior: its 21
// "keywords" are grammar.js-heuristic debris like `binary`, `call`,
// `typescript` — only 3 intersect javascript). A keyword list that shares
// almost nothing with its own sibling grammar is not a closed class.
if (keywords.length === 0) {
  console.error(`refusing: ${IN} carries no lexical.keywords — nothing to refuse on`);
  process.exit(1);
}

const overlap = new Set(softKeywords).intersection
  ? [...new Set(softKeywords)].filter((w) => keywords.includes(w))
  : softKeywords.filter((w) => keywords.includes(w));
if (overlap.length) {
  console.error(`refusing: ${overlap.length} forms are both hard and soft keywords (${overlap.slice(0, 5).join(", ")}) — the giver contradicts itself`);
  process.exit(1);
}

writeFileSync(
  OUT,
  JSON.stringify({
    schema: "CodeKeywordPrior@1",
    language: LANGUAGE,
    provenance: {
      giver: giver.giver?.resource ?? "live_priors LanguageLawPrior@1",
      giverNote: giver.giver?.note ?? null,
      source: IN,
      builder: "eoreader7 native/scripts/build-code-keyword-prior.mjs",
      keywords_read: keywords.length,
      soft_keywords_read: softKeywords.length,
      builtins_read: builtins.length,
      note: "hard keywords refuse (cannot name a being); soft keywords and builtins are recorded but never refuse (legally declarable — shadowing is a fact about the material, not a parse failure)",
    },
    keywords,
    softKeywords,
    builtins,
  }),
);
console.error(
  `${LANGUAGE}: ${keywords.length} hard keywords, ${softKeywords.length} soft, ${builtins.length} builtins -> ${OUT}`,
);
