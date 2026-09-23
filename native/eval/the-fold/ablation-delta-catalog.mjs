// native/eval/the-fold/ablation-delta-catalog.mjs — the "negative space" a
// part of speech makes: what does removing a word of a given POS change in
// embedding-space, and is that change universal across languages or
// language-specific?
//
// REFINED METHODOLOGY (user, 2026-09-23), a step up from
// ablation-embedding-pos.mjs's single-occurrence ablation:
//
//   For a word recurring several times with a CONSISTENT dominant POS,
//   gather up to N of its real occurrences (real sentences, not invented),
//   build ONE prompt with the word present in all of them and ONE prompt
//   with EVERY occurrence replaced by a placeholder, embed each ONCE, and
//   take delta = norm(withVec) - norm(ablatedVec). Averaging the signal
//   over several real contexts for the SAME lexical item is more robust
//   than one occurrence's idiosyncrasy -- the user's explicit ask.
//
// MODEL: nomic-embed-text (local, Ollama) is the only embedding-capable
// model on this instance -- checked directly this session: chat models
// (gemma2:2b, qwen2.5vl:7b, deepseek-v2:16b) all refuse with "this server
// does not support embeddings" (the --embeddings server flag isn't set for
// them), and this host's port does not expose /api/pull ("no such route on
// the channel"), so a bigger dedicated embedding model could not be pulled
// without touching shared inference infrastructure this project's own docs
// warn against restarting casually (reload-storm history). Disclosed, not
// silently worked around.
//
// POS SET: 13 of UD's 17 universal tags (all but PUNCT/SYM/INTJ/X, too rare
// or not meaning-bearing) -- open class (NOUN, VERB, PROPN, ADJ, ADV, NUM)
// and closed class (PRON, ADP, DET, AUX, CCONJ, PART, SCONJ) side by side,
// so NOUN vs PROPN and ADP vs the rest are directly comparable, per the
// user's own question.
//
// OUTPUTS:
//   1. Nearest-centroid classification (same 3 reference compositions and
//      shuffled-label null as ablation-embedding-pos.mjs) -- is there
//      exploitable signal at all, and does it need same-language reference
//      data or transfer from other languages alone?
//   2. A PAIRWISE SEPARABILITY CATALOG: for every POS pair, the cosine
//      similarity between their mean delta directions, per language AND
//      pooled. Low similarity = separable (a real signal for that pair);
//      high similarity = confusable. A pair separable in EVERY language is
//      reported as UNIVERSAL; separable in only some, LANGUAGE-SPECIFIC.
//   3. Delta magnitude per POS per language -- tests whether content words
//      (NOUN/VERB/PROPN/ADJ/ADV/NUM) leave measurably bigger holes than
//      function words (PRON/ADP/DET/AUX/CCONJ/PART/SCONJ).
//
// Usage: node native/eval/the-fold/ablation-delta-catalog.mjs [--json OUT] [--words N] [--occ N]

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
const TRAIN_WORDS = Number(arg("words", 14));
const TEST_WORDS = Number(arg("testwords", 7));
const OCC_PER_WORD = Number(arg("occ", 4)); // how many real occurrences pooled per word
const MIN_RECURRENCE = OCC_PER_WORD; // a word must recur at least this often to qualify
const MIN_DOMINANCE = 0.8; // >=80% of its occurrences must share the dominant POS
const MASK = "___";
const POS_SET = ["NOUN", "VERB", "PROPN", "ADJ", "ADV", "NUM", "PRON", "ADP", "DET", "AUX", "CCONJ", "PART", "SCONJ"];
const CONTENT_POS = new Set(["NOUN", "VERB", "PROPN", "ADJ", "ADV", "NUM"]);

const LANGS = [
  { treebank: "ud-english-ewt-held", name: "English" },
  { treebank: "ud-arabic-padt", name: "Arabic" },
  { treebank: "ud-greek-proiel", name: "Ancient Greek" },
  { treebank: "ud-hebrew-htb", name: "Hebrew" },
  { treebank: "ud-latin-perseus", name: "Latin" },
  { treebank: "ud-sanskrit-vedic", name: "Sanskrit (Vedic)" }, // UFAL dropped here: too sparse per-cell for 13 POS x word recurrence (see ablation-embedding-pos.mjs's own finding)
  { treebank: "ud-naija_pcm", name: "Naija Pidgin" },
];

// Pluggable embedding backend, picked by --model. Voyage's key is read only
// from the environment at call time -- never written to this file, never
// logged, never committed. voyage-4-large/voyage-4/voyage-4-lite/voyage-4-nano
// are Voyage AI (Anthropic's own recommended embedding provider, confirmed
// via https://platform.claude.com/docs/en/build-with-claude/embeddings --
// Anthropic has no first-party embeddings endpoint); nomic-embed-text is the
// local Ollama fallback already proven working this session. This is the
// user-directed size ladder: establish a quality ceiling with the largest
// model, then step down to find where the signal disappears.
const EMBED_MODEL = arg("model", "nomic-embed-text");
const isVoyageModel = (m) => m.startsWith("voyage-");

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function embed(texts) {
  const out = [];
  const batchSize = isVoyageModel(EMBED_MODEL) ? 128 : 64;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    if (isVoyageModel(EMBED_MODEL)) {
      const key = process.env.VOYAGE_API_KEY;
      if (!key) throw new Error("VOYAGE_API_KEY not set in environment");
      // A free-tier Voyage account is rate-limited to 3 RPM/10K TPM (measured
      // this session) -- retry-with-backoff is the safety net, aggressive
      // batching above (128 texts/request, all POS x split slots merged
      // per language) is the primary strategy that keeps request COUNT low.
      let attempt = 0, json = null;
      const MAX_ATTEMPTS = 12;
      while (attempt < MAX_ATTEMPTS) {
        const r = await fetch("https://api.voyageai.com/v1/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ input: batch, model: EMBED_MODEL }),
        });
        if (r.ok) { json = await r.json(); break; }
        if (r.status === 429) {
          const retryAfter = Number(r.headers.get("retry-after")) || 25;
          console.log(`    voyage 429, backing off ${retryAfter}s (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
          await sleep(retryAfter * 1000);
          attempt += 1;
          continue;
        }
        throw new Error(`voyage embed ${r.status}: ${await r.text()}`);
      }
      if (!json) throw new Error("voyage embed: exhausted retries under rate limit");
      out.push(...json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding));
    } else {
      const r = await fetch("http://localhost:11434/api/embed", { method: "POST", body: JSON.stringify({ model: EMBED_MODEL, input: batch }) });
      if (!r.ok) throw new Error(`embed ${r.status}: ${await r.text()}`);
      out.push(...(await r.json()).embeddings);
    }
  }
  return out;
}
const norm = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const mag = (v) => Math.hypot(...v);
const cos = (a, b) => { const ma = mag(a), mb = mag(b); if (!ma || !mb) return 0; return a.reduce((s, x, i) => s + x * b[i], 0) / (ma * mb); };
const mean = (vs) => vs[0].map((_, j) => vs.reduce((s, v) => s + v[j], 0) / vs.length);

function loadUdTreebank(tbEntry) {
  const rows = tbEntry.files.flatMap((f) => parseConllu(fs.readFileSync(f, "utf8")));
  return rows.filter((s) => s.tokens.length >= 4);
}

/** Find words recurring >=MIN_RECURRENCE times with a dominant POS
 *  >=MIN_DOMINANCE, within `sentences`. Returns { pos -> [{word, sents:[{tokens,targetIdx}]}] }. */
function findQualifyingWords(sentences, seedKey, wordsPerPos) {
  const byWord = new Map(); // lowercase form -> {upos -> [{sentTokens, idx}]}
  for (const s of sentences) {
    const forms = s.tokens.map((t) => t.form);
    s.tokens.forEach((t, idx) => {
      if (!/^[\p{L}]{2,}$/u.test(t.form)) return;
      if (!POS_SET.includes(t.upos)) return;
      const key = t.form.toLowerCase();
      if (!byWord.has(key)) byWord.set(key, new Map());
      const posMap = byWord.get(key);
      if (!posMap.has(t.upos)) posMap.set(t.upos, []);
      posMap.get(t.upos).push({ forms, idx });
    });
  }
  const qualifying = []; // {word, pos, occurrences}
  for (const [word, posMap] of byWord) {
    const total = [...posMap.values()].reduce((s, arr) => s + arr.length, 0);
    if (total < MIN_RECURRENCE) continue;
    let bestPos = null, bestCount = 0;
    for (const [pos, arr] of posMap) if (arr.length > bestCount) { bestPos = pos; bestCount = arr.length; }
    if (bestCount / total < MIN_DOMINANCE) continue; // ambiguous word, skip
    if (bestCount < MIN_RECURRENCE) continue;
    qualifying.push({ word, pos: bestPos, occurrences: posMap.get(bestPos) });
  }
  const rand = seeded(seedKey);
  for (let i = qualifying.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [qualifying[i], qualifying[j]] = [qualifying[j], qualifying[i]]; }
  const byPos = Object.fromEntries(POS_SET.map((p) => [p, []]));
  for (const q of qualifying) { if (byPos[q.pos].length < wordsPerPos) byPos[q.pos].push(q); }
  return byPos;
}

/** Build the WITH and ABLATED prompts for one qualifying word from up to
 *  OCC_PER_WORD of its real occurrences. */
function buildPrompts(q) {
  const occ = q.occurrences.slice(0, OCC_PER_WORD);
  const withLines = occ.map((o) => o.forms.join(" "));
  const ablatedLines = occ.map((o) => o.forms.slice(0, o.idx).concat(MASK, o.forms.slice(o.idx + 1)).join(" "));
  return { withPrompt: withLines.join("\n"), ablatedPrompt: ablatedLines.join("\n") };
}

async function main() {
  const banks = findTreebanks();
  const perLang = {}; // lang -> {train:{pos:[{word,delta,mag}]}, test:{...}}

  console.log("=== finding qualifying words + building deltas ===");
  for (const lang of LANGS) {
    let sentences;
    if (lang.treebank === "ud-english-ewt-held") {
      const EWT = path.join(here, "../../../legacy-eoreader6.1/scripts/corpus/en_ewt-ud-train.conllu");
      sentences = parseConllu(fs.readFileSync(EWT, "utf8")).filter((_, i) => i % 10 === 9);
    } else {
      const tb = banks.find((b) => b.name === lang.treebank);
      if (!tb) { console.log(`skip ${lang.name}: treebank not found`); continue; }
      sentences = loadUdTreebank(tb);
    }
    const rand = seeded(`catalog-split-${lang.treebank}`);
    const shuffled = [...sentences];
    for (let i = shuffled.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    const half = Math.floor(shuffled.length / 2);
    const trainSents = shuffled.slice(0, half), testSents = shuffled.slice(half);

    const trainWords = findQualifyingWords(trainSents, `catalog-train-${lang.treebank}`, TRAIN_WORDS);
    const testWords = findQualifyingWords(testSents, `catalog-test-${lang.treebank}`, TEST_WORDS);
    const counts = POS_SET.map((p) => `${p}:${trainWords[p].length}/${testWords[p].length}`).join(" ");
    console.log(`  ${lang.name}: ${counts}`);

    // Batch EVERY (split, pos) slot for this language into exactly two
    // embed() calls total (all "with" prompts, all "ablated" prompts) --
    // not one call per (split, pos, arm). At the original per-cell batching
    // (~4 calls x 13 POS x 2 splits = ~52 requests/language) a rate-limited
    // free-tier Voyage account (3 RPM) would take ~2 hours for this whole
    // run; consolidating to 2 requests/language keeps this to ~1 request
    // every few seconds, comfortably inside the limit with the backoff in
    // embed() as a safety net, not the primary strategy.
    perLang[lang.name] = { train: {}, test: {} };
    const slots = []; // {split, pos, items}
    for (const [split, words] of [["train", trainWords], ["test", testWords]]) {
      for (const pos of POS_SET) {
        const items = words[pos];
        perLang[lang.name][split][pos] = [];
        if (items.length) slots.push({ split, pos, items });
      }
    }
    if (slots.length) {
      const allPrompts = slots.map((s) => s.items.map(buildPrompts));
      const withFlat = allPrompts.flatMap((ps) => ps.map((p) => p.withPrompt));
      const ablatedFlat = allPrompts.flatMap((ps) => ps.map((p) => p.ablatedPrompt));
      const withVecsFlat = (await embed(withFlat)).map(norm);
      const ablatedVecsFlat = (await embed(ablatedFlat)).map(norm);
      let cursor = 0;
      for (let s = 0; s < slots.length; s += 1) {
        const { split, pos, items } = slots[s];
        const n = items.length;
        const withVecs = withVecsFlat.slice(cursor, cursor + n);
        const ablatedVecs = ablatedVecsFlat.slice(cursor, cursor + n);
        cursor += n;
        perLang[lang.name][split][pos] = items.map((it, i) => {
          const delta = sub(withVecs[i], ablatedVecs[i]);
          return { word: it.word, pos, delta, magnitude: mag(delta) };
        });
      }
    }
    console.log(`  embedded ${lang.name}`);
  }

  // ── 1. nearest-centroid classification, 3 reference compositions, null ──
  function centroidsFor(langFilter) {
    const byPos = Object.fromEntries(POS_SET.map((p) => [p, []]));
    for (const [langName, d] of Object.entries(perLang)) {
      if (!langFilter(langName)) continue;
      for (const pos of POS_SET) for (const item of d.train[pos]) byPos[pos].push(norm(item.delta));
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
  function shuffleLabels(centroids, seedKey) {
    const rand = seeded(seedKey);
    const keys = Object.keys(centroids), vals = keys.map((k) => centroids[k]);
    const sv = [...vals];
    for (let i = sv.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [sv[i], sv[j]] = [sv[j], sv[i]]; }
    return Object.fromEntries(keys.map((k, i) => [k, sv[i]]));
  }
  function scoreComposition(langFilterFactory, { shuffle = false, seedKey = "" } = {}) {
    let n = 0, correct = 0;
    for (const [langName, d] of Object.entries(perLang)) {
      for (const pos of POS_SET) {
        for (const item of d.test[pos]) {
          let centroids = centroidsFor(langFilterFactory(langName));
          if (shuffle) centroids = shuffleLabels(centroids, `${seedKey}|${langName}|${pos}`);
          if (!Object.keys(centroids).length) continue;
          const pick = classify(norm(item.delta), centroids);
          n += 1; if (pick === pos) correct += 1;
        }
      }
    }
    return { n, correct, accuracy: n ? +(correct / n).toFixed(4) : null };
  }
  const compositions = {
    sameLanguage: (testLang) => (l) => l === testLang,
    otherLanguages: (testLang) => (l) => l !== testLang,
    pooled: () => () => true,
  };
  console.log("\n=== classification (delta-based, nearest-centroid) ===");
  const classification = {};
  for (const [name, fn] of Object.entries(compositions)) {
    const real = scoreComposition(fn);
    const nul = scoreComposition(fn, { shuffle: true, seedKey: `null-${name}` });
    classification[name] = { accuracy: real.accuracy, n: real.n, nullAccuracy: nul.accuracy, fisherRealGreaterThanNull: +fisherGreater(real.correct, real.n - real.correct, nul.correct, nul.n - nul.correct).toExponential(3) };
    console.log(`  ${name}: accuracy=${real.accuracy} (n=${real.n}) vs shuffled-null=${nul.accuracy}`);
  }
  classification.chanceBaseline = +(1 / POS_SET.length).toFixed(4);

  // ── 2. pairwise separability catalog, per language + pooled ─────────────
  function meanDeltaDirsByPos(langFilter) {
    const byPos = Object.fromEntries(POS_SET.map((p) => [p, []]));
    for (const [langName, d] of Object.entries(perLang)) {
      if (!langFilter(langName)) continue;
      for (const pos of POS_SET) for (const item of d.train[pos].concat(d.test[pos])) byPos[pos].push(norm(item.delta));
    }
    const out = {};
    for (const pos of POS_SET) if (byPos[pos].length) out[pos] = norm(mean(byPos[pos]));
    return out;
  }
  function pairwiseSims(dirsByPos) {
    const pairs = {};
    for (let i = 0; i < POS_SET.length; i += 1) for (let j = i + 1; j < POS_SET.length; j += 1) {
      const a = POS_SET[i], b = POS_SET[j];
      if (!dirsByPos[a] || !dirsByPos[b]) continue;
      pairs[`${a}-${b}`] = +cos(dirsByPos[a], dirsByPos[b]).toFixed(4);
    }
    return pairs;
  }
  console.log("\n=== pairwise POS separability (lower cosine = more separable) ===");
  const perLanguageSims = {};
  for (const langName of Object.keys(perLang)) {
    perLanguageSims[langName] = pairwiseSims(meanDeltaDirsByPos((l) => l === langName));
  }
  const pooledSims = pairwiseSims(meanDeltaDirsByPos(() => true));

  // universal vs language-specific: a pair is "separable" in a language if
  // cosine < SEPARABLE_THRESHOLD (a measured band, not hand-picked: the
  // median pairwise cosine across ALL pairs and languages -- pairs below
  // their own population's median are the separable half, by construction).
  const allSims = Object.values(perLanguageSims).flatMap((s) => Object.values(s));
  const sortedSims = [...allSims].sort((a, b) => a - b);
  const medianSim = sortedSims[Math.floor(sortedSims.length / 2)];
  console.log(`  median pairwise cosine across all languages/pairs (the separability line, not hand-picked): ${medianSim.toFixed(4)}`);

  const pairNames = Object.keys(pooledSims);
  const catalog = pairNames.map((pairName) => {
    const perLangValues = Object.fromEntries(Object.entries(perLanguageSims).map(([l, s]) => [l, s[pairName]]).filter(([, v]) => v != null));
    const separableIn = Object.entries(perLangValues).filter(([, v]) => v < medianSim).map(([l]) => l);
    const langCount = Object.keys(perLangValues).length;
    const verdict = separableIn.length === langCount && langCount > 1 ? "universal" : separableIn.length > 0 ? "language-specific" : "not separable";
    return { pair: pairName, pooledCosine: pooledSims[pairName], perLanguage: perLangValues, separableIn, verdict };
  }).sort((a, b) => a.pooledCosine - b.pooledCosine);

  console.log("  most separable pairs (pooled):");
  for (const c of catalog.slice(0, 10)) console.log(`    ${c.pair}: pooled=${c.pooledCosine} verdict=${c.verdict} separableIn=[${c.separableIn.join(",")}]`);

  // ── 3. delta magnitude: content vs function words ────────────────────
  console.log("\n=== delta magnitude per POS (content vs function word) ===");
  const magnitudeByPos = {};
  for (const pos of POS_SET) {
    const all = Object.values(perLang).flatMap((d) => (d.train[pos] ?? []).concat(d.test[pos] ?? []));
    if (!all.length) continue;
    magnitudeByPos[pos] = { meanMagnitude: +(all.reduce((s, it) => s + it.magnitude, 0) / all.length).toFixed(4), n: all.length, contentWord: CONTENT_POS.has(pos) };
    console.log(`  ${pos} (${CONTENT_POS.has(pos) ? "content" : "function"}): mean |delta| = ${magnitudeByPos[pos].meanMagnitude} (n=${all.length})`);
  }
  const contentMags = Object.values(magnitudeByPos).filter((m) => m.contentWord).map((m) => m.meanMagnitude);
  const functionMags = Object.values(magnitudeByPos).filter((m) => !m.contentWord).map((m) => m.meanMagnitude);
  const avgContent = contentMags.reduce((a, b) => a + b, 0) / contentMags.length;
  const avgFunction = functionMags.reduce((a, b) => a + b, 0) / functionMags.length;
  console.log(`  mean content-word |delta| = ${avgContent.toFixed(4)}, mean function-word |delta| = ${avgFunction.toFixed(4)}`);

  const results = { embedModel: EMBED_MODEL, classification, separability: { medianSim, catalog, pooledSims, perLanguageSims }, magnitude: { byPos: magnitudeByPos, avgContent: +avgContent.toFixed(4), avgFunction: +avgFunction.toFixed(4) } };
  console.log("\n=== FULL RESULTS ===");
  console.log(JSON.stringify(results, null, 2));
  if (OUT) { fs.writeFileSync(OUT, JSON.stringify(results, null, 2)); console.log(`written to ${OUT}`); }
}

main().catch((e) => { console.error(e); process.exit(1); });
