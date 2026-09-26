#!/usr/bin/env node
// build-verb-noun-backoff-prior.mjs -- offline corpus scan that builds
// native/priors/verb-noun-backoff-en.json, the data half of the
// register-agnostic verb/noun confidence backoff (see
// adapters/text/verb-noun-backoff.js for the runtime half).
//
// WHY THIS EXISTS: english-parser.test.mjs's own held-out COMPETENCE test
// and margin-calibration.test.mjs's real, population-scale measurement
// (20,034 held-out tokens; high-margin accuracy 0.9987 vs low-margin 0.9077,
// Fisher p=9.926e-264) together license a confidence-aware backoff for
// exactly the low-margin half. The motivating real failure -- "Photosynthesis
// converts light energy into..." mistagging "converts" as NOUN (margin
// 4.627) -- traces to a real data gap: `grep -c "^converts\t"
// legacy-eoreader6.1/scripts/corpus/en_ewt-ud-train.conllu` returns 0, and
// the lemma "convert" occurs only 3 times total in the whole training
// treebank (too sparse to build anything from alone).
//
// THE SIGNAL, MEASURED NOT ASSUMED: an earlier, narrower idea -- "a word
// ending in -s followed within a window by 'into' is probably a verb" --
// was tested against the real gold treebank (en_ewt-ud-train.conllu, the
// training 9/10 only, held-out tenth left untouched) across window sizes
// 1..8 and found NOT to generalize: best precision 0.30 at window 1 (20
// firings total), falling to 0.20-0.23 at larger windows, against a null
// base rate of P(VERB | ends in -s) = 0.1046 -- some lift, but far too weak
// and far too rare to safely flip a prediction. That path was abandoned
// after being measured, not before.
//
// What DOES show a real, usable signal, measured live against live_priors
// (2026-09-26): the tagger's own high-confidence (margin >= the measured
// median 26.886) votes on a word's MORPHOLOGICAL SIBLINGS -- the bare stem,
// the -ing form, the -ed form -- rather than on the ambiguous -s form
// itself. For convert/converts/converting/converted, scanning live_priors
// (all 13 numbered content categories, no genre hardcoded) found: convert=8
// high-confidence VERB/0 high-confidence NOUN, converting=2/0,
// converted=39/0 (+1 ADJ) -- but the EXACT ambiguous form "converts" itself
// showed 0 high-confidence VERB votes and 2 high-confidence NOUN votes (a
// real competing sense: "Time makes more converts than...", the religious
// noun). That is why the runtime module deliberately excludes the exact
// form's own votes from its family's evidence pool -- the ambiguous form's
// own high-confidence tags are exactly what is in question, so they are not
// independent evidence for it.
//
// GENRE-AGNOSTIC BY CONSTRUCTION: this script does not name a genre
// anywhere in its logic. It discovers every top-level directory under
// live_priors matching the numbered-category convention (/^\d\d-/) --
// live_priors' own organizing scheme for raw content, as opposed to its own
// tooling directories (derived-priors, digested, goldens, manifests,
// scripts, src) -- and treats all of them identically. A per-category
// character budget bounds runtime for this repo's own CI/test practicality;
// it is a practicality bound, not a genre filter, and the real per-category
// file/word counts actually scanned are written into the output's own
// provenance so the scope is disclosed, not hidden.
//
//   node build-verb-noun-backoff-prior.mjs [liveriorsRoot] [charBudgetPerCategory] [outPath]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel, tagSentenceWithMargins, sentences, tokenize } from "../adapters/text/english-parser.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const MODEL_PATH = path.join(ROOT, "native", "priors", "parser-eng-ewt.json");

// Reused, not re-derived: the real population median margin measured on the
// held-out tenth in margin-calibration.test.mjs.
export const MEDIAN_MARGIN = 26.886;

const liveriorsRoot = process.argv[2] || "/Users/mlacy/Documents/3.0/live_priors";
const charBudgetPerCategory = Number(process.argv[3] || 3000000);
const OUT_PATH = process.argv[4] || path.join(ROOT, "native", "priors", "verb-noun-backoff-en.json");

function discoverCategories(root) {
  let ents;
  try { ents = fs.readdirSync(root, { withFileTypes: true }); } catch { return []; }
  return ents.filter((e) => e.isDirectory() && /^\d\d-/.test(e.name)).map((e) => e.name).sort();
}

function* walkTxt(dir) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkTxt(p);
    else if (e.isFile() && e.name.endsWith(".txt")) yield p;
  }
}

export function scanCategory(model, categoryDir, charBudget) {
  const counts = new Map(); // form -> { VERB, NOUN, PROPN, ADJ, OTHER }
  let charsRead = 0, filesRead = 0, sentencesTagged = 0, wordsTagged = 0;
  for (const file of walkTxt(categoryDir)) {
    if (charsRead >= charBudget) break;
    let text;
    try { text = fs.readFileSync(file, "utf8"); } catch { continue; }
    filesRead++;
    const slice = text.slice(0, Math.max(0, charBudget - charsRead));
    charsRead += slice.length;
    for (const { text: sentText } of sentences(slice)) {
      const words = tokenize(sentText).map((t) => t.form).filter((w) => w.length);
      if (!words.length) continue;
      const { tags, margins } = tagSentenceWithMargins(model.tagger, words);
      sentencesTagged++;
      wordsTagged += words.length;
      for (let i = 0; i < words.length; i++) {
        if (margins[i] === null || margins[i] < MEDIAN_MARGIN) continue; // confident votes only
        const form = words[i].toLowerCase();
        if (!/^[a-z]+$/.test(form)) continue;
        let rec = counts.get(form);
        if (!rec) { rec = { VERB: 0, NOUN: 0, PROPN: 0, ADJ: 0, OTHER: 0 }; counts.set(form, rec); }
        const key = ["VERB", "NOUN", "PROPN", "ADJ"].includes(tags[i]) ? tags[i] : "OTHER";
        rec[key]++;
      }
    }
    if (charsRead >= charBudget) break;
  }
  return { counts, filesRead, charsRead, sentencesTagged, wordsTagged };
}

function main() {
  if (!fs.existsSync(MODEL_PATH)) { console.error(`model not found: ${MODEL_PATH}`); process.exit(1); }
  const model = loadModel(JSON.parse(fs.readFileSync(MODEL_PATH, "utf8")));
  const categories = discoverCategories(liveriorsRoot);
  if (!categories.length) { console.error(`no numbered category directories found under ${liveriorsRoot}`); process.exit(1); }

  const merged = new Map();
  const categoryStats = {};
  for (const cat of categories) {
    const t0 = Date.now();
    const { counts, filesRead, charsRead, sentencesTagged, wordsTagged } = scanCategory(model, path.join(liveriorsRoot, cat), charBudgetPerCategory);
    categoryStats[cat] = { filesRead, charsRead, sentencesTagged, wordsTagged, distinctFormsWithConfidentVote: counts.size };
    for (const [form, rec] of counts) {
      let acc = merged.get(form);
      if (!acc) { acc = { VERB: 0, NOUN: 0, PROPN: 0, ADJ: 0, OTHER: 0 }; merged.set(form, acc); }
      for (const k of Object.keys(rec)) acc[k] += rec[k];
    }
    console.log(`${cat}: ${filesRead} files, ${charsRead} chars, ${sentencesTagged} sentences, ${wordsTagged} words, ${counts.size} forms w/ a confident vote (${Date.now() - t0}ms)`);
  }

  const counts = {};
  for (const [form, rec] of merged) {
    const total = rec.VERB + rec.NOUN + rec.PROPN + rec.ADJ + rec.OTHER;
    if (total > 0) counts[form] = rec;
  }

  const out = {
    schema: "VerbNounBackoffPrior@1",
    medianMarginUsed: MEDIAN_MARGIN,
    provenance: {
      source: liveriorsRoot,
      note: "genre-agnostic: every top-level live_priors directory matching the numbered-category convention (/^\\d\\d-/) was eligible and none was special-cased; a per-category character budget bounds runtime and is disclosed below, not hidden",
      charBudgetPerCategory,
      categoriesScanned: categories,
      categoryStats,
      builtAt: new Date().toISOString(),
      builder: "native/scripts/build-verb-noun-backoff-prior.mjs",
      modelUsed: "native/priors/parser-eng-ewt.json",
    },
    counts,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(out));
  console.log(`\nwrote ${OUT_PATH} (${Object.keys(counts).length} distinct forms with at least one confident vote)`);
}

main();
