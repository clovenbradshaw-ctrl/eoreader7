// pos-prior.js — the received English part-of-speech prior, read for two
// questions the generation pipeline keeps asking. Node-only (it reads a file),
// so it is kept out of modules that may also load in a browser; they take its
// answers as optional predicates instead.
//
//   isFunctionWord(w) — the prior's dominant class for w is a function class
//                       (determiner, adposition, conjunction, pronoun, …).
//   isCommonWord(w)   — the prior knows w and its dominant class is not a
//                       proper noun: "This", "While", "Today", "Finally" at the
//                       start of a sentence are capitals, not names.
//
// A word the prior has never seen is NOT common — an unknown capital may be a
// name, and the gate must still test it ("Vanderbilt", "Cumberland").
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let POS = null;
function prior() {
  if (POS !== null) return POS;
  try { POS = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "priors", "pos-eng.json"), "utf8")); }
  catch { POS = false; }
  return POS;
}
const FUNCTION_CLASSES = new Set(["ADP", "CCONJ", "SCONJ", "DET", "PRON", "AUX", "PART", "INTJ", "NUM", "PUNCT", "SYM", "X"]);
const dominant = (w) => {
  const p = prior();
  const e = p && p.forms?.[String(w).toLowerCase()];
  if (!e) return null;
  return Object.entries(e).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};
export const isFunctionWord = (w) => FUNCTION_CLASSES.has(dominant(w));
export const isCommonWord = (w) => { const d = dominant(w); return d !== null && d !== "PROPN"; };

/** The prior's dominant class for a word, or null when it has not seen it. */
export const dominantClass = (w) => dominant(w);
