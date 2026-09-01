// eoreader7 · build-latin-case-prior — UD_Latin-Perseus CoNLL-U in,
// LatinCasePrior@1 out. Mirrors build-construction-prior.mjs's own
// discipline: a received treebank tallied once, ambiguity preserved,
// never collapsed to one majority verdict here.
//
// WORD-ENDING KEYED, NOT FORM KEYED. Latin is inflectional: the prior
// needs to generalize to word forms the 1,334 training sentences never
// saw, so the key is a word's final 2 characters (the standard
// simplification for Latin declension endings), not the exact form.
// Some endings are genuinely decisive in this corpus ("-am" is 100%
// Acc|Sing); most are not ("-is" spans five distinct Case|Number
// readings). Both are kept, with real counts — the caller decides its
// own confidence floor (relations-case-marked.js's declared
// MIN_TOP_SHARE), never this script.
//
// SCOPED TO NOMINAL TOKENS WITH A CASE FEATURE (NOUN/PROPN/ADJ/PRON/NUM).
// Verb personal-ending morphology is deliberately NOT mined here —
// relations-case-marked.js's own header records why: a mined 3-character
// suffix table under-covered badly (only 75 of 224 distinct endings
// cleared a volume-5 floor, because personal endings fragment by
// conjugation-stem vowel) and was replaced with a received closed class
// from standard Latin grammar. Verb-ending tallies are still recorded
// here (verbPersonalEndings) so that finding is itself reproducible from
// this script's own output, not just asserted.
import { readFileSync, writeFileSync } from "node:fs";

const IN = process.argv[2] ?? "native/eval/fixtures/ud-latin-perseus/la_perseus-ud-train.conllu";
// Moved to live_priors 2026-08-30 (act-priors' own precedent: "a received
// lexicon is content, not app logic, so it lives with the corpus") — the
// default OUT now names the canonical home directly rather than a local
// copy this repo would otherwise have to remember to re-sync by hand.
const OUT = process.argv[3] ?? "../live_priors/derived-priors/case-priors/case-marking-lat.json";

const NOMINAL_UPOS = new Set(["NOUN", "PROPN", "ADJ", "PRON", "NUM"]);
const CASE_ENDING_LEN = 2;
const VERB_ENDING_LEN = 3;

const lines = readFileSync(IN, "utf8").split("\n");
const caseTable = new Map();
const verbTable = new Map();
let nominalTokens = 0, verbTokens = 0, sentences = 0;

for (const line of lines) {
  if (line.startsWith("# sent_id")) sentences++;
  if (!line || line.startsWith("#")) continue;
  const cols = line.split("\t");
  if (cols.length < 6 || !/^\d+$/.test(cols[0])) continue; // skip multi-word-token ranges like "3-4"
  const [, form, , upos, , feats] = cols;
  if (feats === "_" || !feats) continue;
  const featMap = Object.fromEntries(feats.split("|").map((f) => f.split("=")));
  const lower = form.toLowerCase();

  if (NOMINAL_UPOS.has(upos) && featMap.Case) {
    nominalTokens++;
    const ending = lower.slice(-CASE_ENDING_LEN);
    const key = `${featMap.Case}|${featMap.Number ?? "?"}`;
    if (!caseTable.has(ending)) caseTable.set(ending, new Map());
    const m = caseTable.get(ending);
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  if ((upos === "VERB" || upos === "AUX") && featMap.VerbForm === "Fin" && featMap.Person && featMap.Number) {
    verbTokens++;
    const ending = lower.slice(-VERB_ENDING_LEN);
    const key = `${featMap.Person}|${featMap.Number}`;
    if (!verbTable.has(ending)) verbTable.set(ending, new Map());
    const m = verbTable.get(ending);
    m.set(key, (m.get(key) ?? 0) + 1);
  }
}

const toRankedObject = (table) => {
  const out = {};
  for (const [ending, counts] of table) {
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    out[ending] = {
      total,
      ranked: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key, n]) => ({ key, count: n, share: n / total })),
    };
  }
  return out;
};

writeFileSync(OUT, JSON.stringify({
  schema: "LatinCasePrior@1",
  provenance: {
    giver: "Universal Dependencies UD_Latin-Perseus",
    url: "https://github.com/UniversalDependencies/UD_Latin-Perseus",
    license: "CC BY-NC-SA 2.5 — non-commercial, share-alike; stated plainly, not glossed over",
    builtFrom: IN,
    sentences,
    nominalTokensObserved: nominalTokens,
    verbTokensObserved: verbTokens,
  },
  declared: {
    endingLength: CASE_ENDING_LEN,
    scope: "ambiguous word-final endings only; a form the treebank never saw returns a gap in the consuming organ, never a guess here",
    backoff: "the consuming organ's own declared confidence floor decides — this file only tallies",
  },
  nominalEndings: toRankedObject(caseTable),
  verbPersonalEndings: toRankedObject(verbTable),
}, null, 2));

console.log(`sentences: ${sentences}; nominal tokens: ${nominalTokens} (${caseTable.size} distinct endings); verb tokens: ${verbTokens} (${verbTable.size} distinct endings)`);
