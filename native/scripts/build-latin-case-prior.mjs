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
import { grammarCell } from "../kernel/cube.js";

const IN = process.argv[2] ?? "native/eval/fixtures/ud-latin-perseus/la_perseus-ud-train.conllu";
// Moved to live_priors 2026-08-30 (act-priors' own precedent: "a received
// lexicon is content, not app logic, so it lives with the corpus") — the
// default OUT now names the canonical home directly rather than a local
// copy this repo would otherwise have to remember to re-sync by hand.
const OUT = process.argv[3] ?? "../live_priors/derived-priors/case-priors/case-marking-lat.json";
// LANGUAGE-GENERAL BY CONSTRUCTION (2026-09-17): the mechanism below — the
// word-ending tally of nominal Case|Number and verb Person|Number from a UD
// treebank — is the same for any inflectional language; what varies is the
// measured numbers, the schema name, and the provenance. Named arguments,
// each defaulting to the Latin values so the shipped artifact is rebuilt
// byte-identical by default. The mode is: one master builder, a
// CasePrior@1 (or LatinCasePrior@1) per language — never a per-language
// script. Reused for Ancient Greek (UD_Ancient_Greek-PROIEL) 2026-09-17.
const arg = (name, dflt) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? dflt;
const LANG = arg("lang", "lat");
const SCHEMA = arg("schema", "LatinCasePrior@1");
const GIVER = arg("giver", "Universal Dependencies UD_Latin-Perseus");
const URL = arg("url", "https://github.com/UniversalDependencies/UD_Latin-Perseus");
const LICENSE = arg("license", "CC BY-NC-SA 2.5 — non-commercial, share-alike; stated plainly, not glossed over");

const NOMINAL_UPOS = new Set(["NOUN", "PROPN", "ADJ", "PRON", "NUM"]);
const CASE_ENDING_LEN = 2;
const VERB_ENDING_LEN = 3;
// DIACRITIC-FREE ENDINGS (2026-09-17). Greek accents sit ON final vowels
// (τόν → "όν" ≠ "ον"): the ending key is built on the unaccented skeleton so
// a lookup side strips the same way. Latin is ASCII — strip is a no-op, the
// shipped Latin artifact is byte-identical.
const strip = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const lines = readFileSync(IN, "utf8").split("\n");
const caseTable = new Map();
const verbTable = new Map();
const voiceTable = new Map();
const moodTable = new Map();
const tenseTable = new Map();
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
    const ending = strip(lower).slice(-CASE_ENDING_LEN);
    const key = `${featMap.Case}|${featMap.Number ?? "?"}`;
    if (!caseTable.has(ending)) caseTable.set(ending, new Map());
    const m = caseTable.get(ending);
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  if ((upos === "VERB" || upos === "AUX") && featMap.VerbForm === "Fin" && featMap.Person && featMap.Number) {
    // THE FULL VERBAL PARADIGM (2026-09-17), measured: the ending carries
    // Person|Number (215/220), Voice (213/220), Mood (206/220) and Tense
    // (193/220) at decisive shares — a native speaker settles all four from
    // the verb itself. Each axis is tallied as its OWN projection so the
    // reader settles each with its own confidence floor (one fused bundle
    // would fragment to sparse rows).
    verbTokens++;
    const ending = strip(lower).slice(-VERB_ENDING_LEN);
    const tally = (table, key) => {
      if (!table.has(ending)) table.set(ending, new Map());
      const m = table.get(ending);
      m.set(key, (m.get(key) ?? 0) + 1);
    };
    tally(verbTable, `${featMap.Person}|${featMap.Number}`);
    if (featMap.Voice) tally(voiceTable, featMap.Voice);
    if (featMap.Mood) tally(moodTable, featMap.Mood);
    if (featMap.Tense) tally(tenseTable, featMap.Tense);
  }
}

const toRankedObject = (table, feature) => {
  const out = {};
  for (const [ending, counts] of table) {
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    out[ending] = {
      total,
      ranked: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key, n]) => {
        // THE CUBE PROJECTION (2026-09-17): each tallied feature bundle
        // carries its cube cell (grammarCell), so this prior IS the universal
        // grammar worn by this language's endings — the reader reads in cells.
        const cell = grammarCell(feature, key.split("|")[0]);
        return { key, count: n, share: n / total, ...(cell ? { cell: { op: cell.op, grain: cell.grain, terrain: cell.terrain, stance: cell.stance } } : {}) };
      }),
    };
  }
  return out;
};

writeFileSync(OUT, JSON.stringify({
  schema: SCHEMA,
  language: LANG,
  provenance: {
    giver: GIVER,
    url: URL,
    license: LICENSE,
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
  nominalEndings: toRankedObject(caseTable, "Case"),
  verbPersonalEndings: toRankedObject(verbTable, "Person"),
  verbVoiceByEnding: toRankedObject(voiceTable, "Voice"),
  verbMoodByEnding: toRankedObject(moodTable, "Mood"),
  verbTenseByEnding: toRankedObject(tenseTable, "Tense"),
}, null, 2));

console.log(`sentences: ${sentences}; nominal tokens: ${nominalTokens} (${caseTable.size} distinct endings); verb tokens: ${verbTokens} (${verbTable.size} distinct endings)`);
