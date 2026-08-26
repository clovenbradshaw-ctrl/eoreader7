// THROWAWAY investigation script — not clean, not meant to stay clean.
// Investigates whether widget.js::scoutSpan can locate real function
// definitions (ground/difference/witness) inside eoreader6.1's real
// nul/index.js, in contrast to a separate investigation that found
// packages/host/surfer.js::executePrompt essentially fails at this same
// task on this same file (lexical-coverage scoring dilutes across the
// whole file because those names recur constantly as cross-referenced
// vocabulary in comments).
//
// Run: node eval/_scratch-scout-investigate.mjs   (from /home/user/the-fold)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as enginePriors from "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/priors.js";
import { scoutSpan } from "../widget.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INFLECTIONAL_SUFFIXES = enginePriors.INFLECTIONAL_SUFFIXES;

const NUL_PATH = path.resolve(__dirname, "../../eoreader7/legacy-eoreader6.1/nul/index.js");
console.log("Reading:", NUL_PATH);
const code = fs.readFileSync(NUL_PATH, "utf8");
console.log(`File length: ${code.length} chars, ${code.split("\n").length} lines`);
console.log("suffixes instanceof Set:", INFLECTIONAL_SUFFIXES instanceof Set, "size:", INFLECTIONAL_SUFFIXES.size);
console.log("=".repeat(100));

function snippet(text, span) {
  const [a, b] = span;
  const full = text.slice(a, b);
  const head = full.slice(0, 150);
  const tail = full.length > 300 ? full.slice(-150) : full.slice(150);
  return { len: full.length, head, tail };
}

// Find the REAL definition line offsets for ground/difference/witness for
// ground-truth comparison (independent of scoutSpan — just a raw string
// search for "export const X =").
function findRealDef(text, name) {
  const re = new RegExp(`export const ${name}\\s*=`);
  const m = re.exec(text);
  if (!m) return null;
  return m.index;
}

const realDefs = {};
for (const name of ["ground", "difference", "witness", "pattern", "level", "licensed"]) {
  const idx = findRealDef(code, name);
  realDefs[name] = idx;
  console.log(`Real "export const ${name} =" found at char offset:`, idx);
}
console.log("=".repeat(100));

const cases = [
  { label: "fix the validation in ground", instruction: "fix the validation in ground", expectName: "ground" },
  { label: "improve the difference function", instruction: "improve the difference function", expectName: "difference" },
  { label: "the witness function needs better error handling", instruction: "the witness function needs better error handling", expectName: "witness" },
];

for (const c of cases) {
  console.log(`\n--- CASE: "${c.instruction}" (expecting to land on "${c.expectName}") ---`);
  let result;
  try {
    result = scoutSpan(c.instruction, code, INFLECTIONAL_SUFFIXES);
  } catch (err) {
    console.log("THREW:", err.message);
    continue;
  }
  if (!result) {
    console.log("scoutSpan returned: null");
    continue;
  }
  const { term, span } = result;
  console.log("scoutSpan returned term:", JSON.stringify(term));
  console.log("span:", span, `(${span[1] - span[0]} chars)`);
  const { len, head, tail } = snippet(code, span);
  console.log("slice length:", len);
  console.log("--- first ~150 chars of slice ---");
  console.log(head);
  console.log("--- last ~150 chars of slice ---");
  console.log(tail);
  const realIdx = realDefs[c.expectName];
  const containsRealDef = realIdx !== null && realIdx >= span[0] && realIdx < span[1];
  console.log(`Real "export const ${c.expectName} =" is at offset ${realIdx}. Span is [${span[0]}, ${span[1]}]. CONTAINS REAL DEF: ${containsRealDef}`);
}

console.log("\n" + "=".repeat(100));
console.log('--- CASE: "fix the frobnicate function" (expecting null — no match anywhere) ---');
try {
  const result = scoutSpan("fix the frobnicate function", code, INFLECTIONAL_SUFFIXES);
  console.log("scoutSpan returned:", result === null ? "null (correct — no false positive)" : JSON.stringify(result));
  if (result) {
    const { head, tail } = snippet(code, result.span);
    console.log("head:", head);
    console.log("tail:", tail);
  }
} catch (err) {
  console.log("THREW:", err.message);
}

console.log("\nDONE.");
