// eoreader7 · build-pos-prior — Universal Dependencies CoNLL-U in,
// POSPrior@1 out: the form-level tally native/adapters/text/wordclass.js's
// own classifyWord already consumes (`posPrior.forms[lower] ->
// {UPOS: count}`), unconditional — AMBIGUITY IS PRESERVED, NEVER RESOLVED
// here, matching this repo's own build-construction-prior.mjs discipline
// one level down (that file's conditional layer collapses nothing either;
// it only adds a SECOND, next-token-conditioned view on top of this one).
//
// LANGUAGE-GENERAL BY CONSTRUCTION. Every UD treebank shares one column
// layout (ID FORM LEMMA UPOS XPOS FEATS HEAD DEPREL DEPS MISC) and one
// tagset (UPOS), so this script has no English-specific code anywhere —
// the language is a CLI argument and a provenance field, never a branch.
// Reused unmodified for English (UD_English-EWT), Russian (UD_Russian-GSD)
// and Finnish (UD_Finnish-TDT); see the-fold's own CLAUDE.md for why the
// existing hand-written EN gate is being widened this way (the "POS-
// vocabulary gate" entry in the UDHR blind-spots pass).
//
// SOURCE, FETCHED SEPARATELY (no ambient network I/O in a data-transform
// script — build-construction-prior.mjs's own discipline):
//   curl -sSL -o en_ewt-ud-train.conllu \
//     https://raw.githubusercontent.com/UniversalDependencies/UD_English-EWT/master/en_ewt-ud-train.conllu
//   curl -sSL -o ru_gsd-ud-train.conllu \
//     https://raw.githubusercontent.com/UniversalDependencies/UD_Russian-GSD/master/ru_gsd-ud-train.conllu
//   curl -sSL -o fi_tdt-ud-train.conllu \
//     https://raw.githubusercontent.com/UniversalDependencies/UD_Finnish-TDT/master/fi_tdt-ud-train.conllu
// All three are CC BY-SA 4.0 (Universal Dependencies' own stated licence
// for each of these treebanks) — attribution recorded in the output's own
// provenance. No treebank sentence text is embedded, only aggregate counts.
//
// Usage: node native/scripts/build-pos-prior.mjs <in.conllu> <out.json> <lang> <giver-url>

import { readFileSync, writeFileSync } from "node:fs";

const IN = process.argv[2];
const OUT = process.argv[3];
const LANGUAGE = process.argv[4];
const GIVER_URL = process.argv[5];
const TAB = String.fromCharCode(9);

if (!IN || !OUT || !LANGUAGE || !GIVER_URL) {
  console.error("usage: node build-pos-prior.mjs <in.conllu> <out.json> <lang> <giver-url>");
  process.exit(1);
}

const raw = readFileSync(IN, "utf8");

// pass 0: read the treebank into (form, upos) pairs — identical shape to
// build-construction-prior.mjs's own pass 0, one column fewer read (LEMMA
// unused here; declension-rus.json's own build script is the LEMMA
// consumer, kept separate on purpose — two different questions, two files)
let sentenceCount = 0;
let tokenCount = 0;
const forms = new Map();
let inSentence = false;
for (const line of raw.split("\n")) {
  if (line.startsWith("#")) continue;
  if (line.trim() === "") { inSentence = false; continue; }
  if (!inSentence) { sentenceCount += 1; inSentence = true; }
  const cols = line.split(TAB);
  if (cols.length < 4) continue;
  if (!/^[0-9]+$/.test(cols[0])) continue; // skip multi-word ranges (3-4) and empty nodes (3.1)
  const form = cols[1].toLowerCase();
  const upos = cols[3];
  tokenCount += 1;
  if (!forms.has(form)) forms.set(form, {});
  const row = forms.get(form);
  row[upos] = (row[upos] ?? 0) + 1;
}

const out = {};
for (const [form, row] of forms) out[form] = row;

const ambiguousForms = [...forms.values()].filter((row) => Object.keys(row).length > 1).length;

writeFileSync(
  OUT,
  JSON.stringify({
    schema: "POSPrior@1",
    language: LANGUAGE,
    provenance: {
      giver: `Universal Dependencies — ${GIVER_URL} (train split), human-annotated gold treebank`,
      license: "CC BY-SA 4.0",
      source: GIVER_URL,
      builder: "eoreader7 native/scripts/build-pos-prior.mjs",
      sentences_read: sentenceCount,
      tokens_read: tokenCount,
      distinct_forms: forms.size,
      ambiguous_forms: ambiguousForms,
      note: "ambiguity preserved, never resolved: a form keeps every UPOS tag the treebank ever gave it, with real counts",
    },
    forms: out,
  }),
);
console.error(
  `${LANGUAGE}: ${sentenceCount} sentences, ${tokenCount} tokens, ${forms.size} distinct forms ` +
    `(${ambiguousForms} ambiguous) -> ${OUT}`,
);
