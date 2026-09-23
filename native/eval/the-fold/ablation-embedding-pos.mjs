// native/eval/the-fold/ablation-embedding-pos.mjs — does ablating a word
// (replacing it with a placeholder) produce a context embedding that carries
// real, cross-lingual signal about the ablated word's grammatical category?
//
// THE QUESTION (user, 2026-09-23): build embeddings from clauses with a
// known-POS word ablated, so an unknown word can later be ablated the same
// way and its embedding compared against a reference list spanning multiple
// languages, tied to various degrees. Tested here, not assumed:
//
//   ARM A (ablated)      "The dog ___ the cat."           -- target masked
//   ARM B (non-ablated)  "The dog chased the cat."         -- control: does
//                         removing the word actually help, or does the full
//                         sentence classify just as well?
//   NULL (shuffled label) reference centroids built from real embeddings but
//                         RANDOMLY PERMUTED POS labels -- tests whether
//                         nearest-centroid "accuracy" is real POS signal or
//                         an embedding-space artifact (sentence length,
//                         topic clustering, anything but grammar).
//
// REFERENCE-SET COMPOSITION (the "tied to various degrees to all our
// languages" question): each held-out test item is classified against THREE
// reference sets built from the SAME training embeddings:
//   sameLanguage    only the test item's own language's centroids
//   otherLanguages  every language EXCEPT the test item's own (pure
//                   cross-lingual transfer -- the strongest, most useful
//                   case: bootstrapping POS for a language with zero
//                   labeled reference data of its own)
//   pooled          all languages' embeddings pooled into one centroid per
//                   POS (language-blind)
//
// Embedding: nomic-embed-text (Ollama, local, 137M) -- the same model and
// call pattern already proven working in variety-attribution.mjs's
// embeddingArm. POS set: VERB, NOUN, ADJ, ADV -- open classes that exist as
// UD's own universal categories in every treebank here, unlike closed
// classes whose realization varies more by language.
//
// Usage: node native/eval/the-fold/ablation-embedding-pos.mjs [--json OUT]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseConllu } from "../../kernel/eot-rich.js";
import { findTreebanks } from "../eot-roundtrip.mjs";
import { seeded } from "../../adapters/text/english-parser.js";
import { fisherGreater } from "./claim-null-scoring.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = arg("json", null);
const TRAIN_PER_CELL = Number(arg("train", 20));
const TEST_PER_CELL = Number(arg("test", 12));
const MASK = "___";
const POS_SET = ["VERB", "NOUN", "ADJ", "ADV"];

const LANGS = [
  { treebank: "ud-english-ewt-held", name: "English" }, // handled specially below (legacy path)
  { treebank: "ud-arabic-padt", name: "Arabic" },
  { treebank: "ud-greek-proiel", name: "Ancient Greek" },
  { treebank: "ud-hebrew-htb", name: "Hebrew" },
  { treebank: "ud-latin-perseus", name: "Latin" },
  { treebank: "ud-sanskrit-ufal", name: "Sanskrit (UFAL)" },
  { treebank: "ud-sanskrit-vedic", name: "Sanskrit (Vedic)" },
  { treebank: "ud-naija_pcm", name: "Naija Pidgin" },
];

// ── embedding call, identical pattern to variety-attribution.mjs's proven one ──
async function embed(texts) {
  const out = [];
  for (let i = 0; i < texts.length; i += 64) {
    const r = await fetch("http://localhost:11434/api/embed", { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: texts.slice(i, i + 64) }) });
    if (!r.ok) throw new Error(`embed ${r.status}: ${await r.text()}`);
    out.push(...(await r.json()).embeddings);
  }
  return out;
}
const norm = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const mean = (vs) => vs[0].map((_, j) => vs.reduce((s, v) => s + v[j], 0) / vs.length);

// ── sample tagged-word specimens from a treebank: one per sentence, seeded ──
function sampleSpecimens(sentences, seedKey, perCell) {
  const rand = seeded(seedKey);
  const byPos = Object.fromEntries(POS_SET.map((p) => [p, []]));
  const shuffledSents = [...sentences];
  for (let i = shuffledSents.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [shuffledSents[i], shuffledSents[j]] = [shuffledSents[j], shuffledSents[i]]; }
  for (const s of shuffledSents) {
    if (POS_SET.every((p) => byPos[p].length >= perCell)) break;
    const forms = s.tokens.map((t) => t.form);
    for (const t of s.tokens) {
      if (!POS_SET.includes(t.upos)) continue;
      if (!/^[\p{L}]{2,}$/u.test(t.form)) continue;
      if (byPos[t.upos].length >= perCell) continue;
      const idx = t.id - 1;
      if (forms[idx] !== t.form) continue; // multi-word-token id mismatch guard
      const ablated = forms.slice(0, idx).concat(MASK, forms.slice(idx + 1)).join(" ");
      const full = forms.join(" ");
      byPos[t.upos].push({ pos: t.upos, form: t.form, ablated, full });
    }
  }
  return byPos;
}

function loadUdTreebank(tbEntry) {
  const rows = tbEntry.files.flatMap((f) => parseConllu(fs.readFileSync(f, "utf8")));
  return rows.filter((s) => s.tokens.length >= 4);
}

async function main() {
  const banks = findTreebanks();
  const data = {}; // lang -> { train: {POS:[specimens]}, test: {POS:[specimens]} }

  console.log("=== sampling specimens per language x POS ===");
  for (const lang of LANGS) {
    let sentences;
    if (lang.treebank === "ud-english-ewt-held") {
      const EWT = path.join(here, "../../../legacy-eoreader6.1/scripts/corpus/en_ewt-ud-train.conllu");
      const all = parseConllu(fs.readFileSync(EWT, "utf8"));
      sentences = all.filter((_, i) => i % 10 === 9); // the standing held-out split
    } else {
      const tb = banks.find((b) => b.name === lang.treebank);
      if (!tb) { console.log(`skip ${lang.name}: treebank not found`); continue; }
      sentences = loadUdTreebank(tb);
    }
    const rand = seeded(`ablation-split-${lang.treebank}`);
    const shuffled = [...sentences];
    for (let i = shuffled.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    const half = Math.floor(shuffled.length / 2);
    const trainSents = shuffled.slice(0, half), testSents = shuffled.slice(half);
    const train = sampleSpecimens(trainSents, `ablation-train-${lang.treebank}`, TRAIN_PER_CELL);
    const test = sampleSpecimens(testSents, `ablation-test-${lang.treebank}`, TEST_PER_CELL);
    const counts = POS_SET.map((p) => `${p}:${train[p].length}/${test[p].length}`).join(" ");
    console.log(`  ${lang.name}: ${counts}`);
    data[lang.name] = { train, test };
  }

  console.log("\n=== embedding (ablated + non-ablated, train + test) ===");
  const embedded = {}; // lang -> {train:{POS:[{pos,ablatedVec,fullVec}]}, test:{...}}
  for (const [langName, d] of Object.entries(data)) {
    embedded[langName] = { train: {}, test: {} };
    for (const split of ["train", "test"]) {
      for (const pos of POS_SET) {
        const specimens = d[split][pos];
        if (!specimens.length) { embedded[langName][split][pos] = []; continue; }
        const ablatedVecs = (await embed(specimens.map((s) => s.ablated))).map(norm);
        const fullVecs = (await embed(specimens.map((s) => s.full))).map(norm);
        embedded[langName][split][pos] = specimens.map((s, i) => ({ pos, form: s.form, ablatedVec: ablatedVecs[i], fullVec: fullVecs[i] }));
      }
    }
    console.log(`  embedded ${langName}`);
  }

  // ── build reference centroids per language x POS, per arm ──────────────
  function centroidsFor(arm, langFilter) {
    // arm: "ablatedVec" | "fullVec". langFilter: (langName) => bool
    const byPos = Object.fromEntries(POS_SET.map((p) => [p, []]));
    for (const [langName, d] of Object.entries(embedded)) {
      if (!langFilter(langName)) continue;
      for (const pos of POS_SET) for (const item of d.train[pos]) byPos[pos].push(item[arm]);
    }
    const out = {};
    for (const pos of POS_SET) if (byPos[pos].length) out[pos] = norm(mean(byPos[pos]));
    return out;
  }

  function classify(vec, centroids) {
    let best = null, bestScore = -Infinity;
    for (const [pos, c] of Object.entries(centroids)) { const s = cos(vec, c); if (s > bestScore) { bestScore = s; best = pos; } }
    return best;
  }

  function scoreCondition(arm, refComposition, { shuffleLabels = false, seedKey = "" } = {}) {
    // refComposition: (langName) => (testLangName) => filter fn per test item
    let n = 0, correct = 0;
    const perLangPos = {};
    for (const [langName, d] of Object.entries(embedded)) {
      for (const pos of POS_SET) {
        for (const item of d.test[pos]) {
          const langFilter = refComposition(langName);
          let centroids = centroidsFor(arm, langFilter);
          if (shuffleLabels) centroids = shuffleCentroidLabels(centroids, `${seedKey}|${langName}|${pos}`);
          if (!Object.keys(centroids).length) continue;
          const pick = classify(item[arm], centroids);
          n += 1;
          const key = `${langName}:${pos}`;
          perLangPos[key] = perLangPos[key] ?? { n: 0, ok: 0 };
          perLangPos[key].n += 1;
          if (pick === item.pos) { correct += 1; perLangPos[key].ok += 1; }
        }
      }
    }
    return { n, correct, accuracy: n ? +(correct / n).toFixed(4) : null, perLangPos };
  }

  function shuffleCentroidLabels(centroids, seedKey) {
    const rand = seeded(seedKey);
    const keys = Object.keys(centroids);
    const vals = keys.map((k) => centroids[k]);
    const shuffledVals = [...vals];
    for (let i = shuffledVals.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [shuffledVals[i], shuffledVals[j]] = [shuffledVals[j], shuffledVals[i]]; }
    return Object.fromEntries(keys.map((k, i) => [k, shuffledVals[i]]));
  }

  console.log("\n=== scoring ===");
  const compositions = {
    sameLanguage: (testLang) => (langName) => langName === testLang,
    otherLanguages: (testLang) => (langName) => langName !== testLang,
    pooled: () => () => true,
  };

  const results = {};
  for (const [compName, compFn] of Object.entries(compositions)) {
    results[compName] = {};
    for (const arm of ["ablatedVec", "fullVec"]) {
      const real = scoreCondition(arm, compFn);
      const nullScore = scoreCondition(arm, compFn, { shuffleLabels: true, seedKey: `null-${compName}-${arm}` });
      const armLabel = arm === "ablatedVec" ? "ablated" : "nonAblated";
      results[compName][armLabel] = {
        accuracy: real.accuracy, n: real.n, correct: real.correct,
        nullAccuracy: nullScore.accuracy,
        fisherRealGreaterThanNull: +fisherGreater(real.correct, real.n - real.correct, nullScore.correct, nullScore.n - nullScore.correct).toExponential(3),
      };
      console.log(`  ${compName} / ${armLabel}: accuracy=${real.accuracy} (n=${real.n}) vs shuffled-null=${nullScore.accuracy}`);
    }
  }

  // chance baseline for reference (1/|POS_SET| if uniform)
  results.chanceBaseline = +(1 / POS_SET.length).toFixed(4);

  console.log("\n=== FULL RESULTS ===");
  console.log(JSON.stringify(results, null, 2));
  if (OUT) { fs.writeFileSync(OUT, JSON.stringify(results, null, 2)); console.log(`written to ${OUT}`); }
}

main().catch((e) => { console.error(e); process.exit(1); });
