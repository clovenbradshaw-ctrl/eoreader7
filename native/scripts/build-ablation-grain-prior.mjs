// scripts/build-ablation-grain-prior.mjs — offline builder for
// adapters/text/ablation-grain-pressure.js's reference centroids. Mines
// real UD treebank data, calls the LOCAL embedding model only
// (nomic-embed-text, per direct user instruction -- free, already measured
// this session to be at least as good as much larger paid embedders on
// this specific signal), and writes provenanced prior JSON files.
//
// TWO PRIORS, deliberately not one:
//   ablation-grain-eng.json     ONE language, ONE declared period/region
//                                (2010s web English, UD_English-EWT) --
//                                the strong, specific holon.
//   ablation-grain-pooled.json  Every other treebank on disk, pooled --
//                                DISCLOSED as period/region-heterogeneous
//                                (spans Ancient Greek ~1st millennium BCE
//                                prose through modern web text), never
//                                claimed as one clean provenance. The
//                                weak, wide fallback holon, used only when
//                                no same-language-same-period set exists.
//
// Usage: node native/scripts/build-ablation-grain-prior.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseConllu } from "../kernel/eot-rich.js";
import { findTreebanks } from "../eval/eot-roundtrip.mjs";
import { seeded } from "../adapters/text/english-parser.js";
import { buildCentroidsFrom, buildDeltaPrompts } from "../adapters/text/ablation-grain-pressure.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..", "..");
const POS_SET = ["NOUN", "VERB", "PROPN", "ADJ", "ADV", "NUM", "PRON", "ADP", "DET", "AUX", "CCONJ", "PART", "SCONJ"];
const WORDS_PER_POS = 24;
const OCC_PER_WORD = 4;
const MIN_DOMINANCE = 0.8;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// This local Ollama instance is shared and, measured directly this session,
// contended enough by other concurrent sessions to trip a real
// HeadersTimeoutError (~5min undici default) -- a patient retry, not a
// bug fix, since the request itself is correct.
async function embed(texts) {
  const out = [];
  for (let i = 0; i < texts.length; i += 64) {
    const batch = texts.slice(i, i + 64);
    let attempt = 0, ok = false, lastErr = null;
    while (attempt < 5 && !ok) {
      try {
        const r = await fetch("http://localhost:11434/api/embed", { method: "POST", body: JSON.stringify({ model: "nomic-embed-text", input: batch }) });
        if (!r.ok) throw new Error(`embed ${r.status}: ${await r.text()}`);
        out.push(...(await r.json()).embeddings);
        ok = true;
      } catch (e) {
        lastErr = e;
        attempt += 1;
        console.log(`    local embed attempt ${attempt}/5 failed (${e.message ?? e}), retrying in 15s`);
        await sleep(15000);
      }
    }
    if (!ok) throw lastErr;
  }
  return out;
}
const norm = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
const sub = (a, b) => a.map((x, i) => x - b[i]);

function findQualifyingWords(sentences, seedKey, wordsPerPos) {
  const byWord = new Map();
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
  const qualifying = [];
  for (const [word, posMap] of byWord) {
    const total = [...posMap.values()].reduce((s, arr) => s + arr.length, 0);
    if (total < OCC_PER_WORD) continue;
    let bestPos = null, bestCount = 0;
    for (const [pos, arr] of posMap) if (arr.length > bestCount) { bestPos = pos; bestCount = arr.length; }
    if (bestCount / total < MIN_DOMINANCE || bestCount < OCC_PER_WORD) continue;
    qualifying.push({ word, pos: bestPos, occurrences: posMap.get(bestPos) });
  }
  const rand = seeded(seedKey);
  for (let i = qualifying.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [qualifying[i], qualifying[j]] = [qualifying[j], qualifying[i]]; }
  const byPos = Object.fromEntries(POS_SET.map((p) => [p, []]));
  for (const q of qualifying) if (byPos[q.pos].length < wordsPerPos) byPos[q.pos].push(q);
  return byPos;
}

async function deltasForLanguage(sentences, seedKey) {
  const words = findQualifyingWords(sentences, seedKey, WORDS_PER_POS);
  const deltaByPos = {};
  for (const pos of POS_SET) {
    const items = words[pos];
    deltaByPos[pos] = [];
    if (!items.length) continue;
    const prompts = items.map((it) => buildDeltaPrompts(it.occurrences.slice(0, OCC_PER_WORD)));
    const withVecs = (await embed(prompts.map((p) => p.withPrompt))).map(norm);
    const ablatedVecs = (await embed(prompts.map((p) => p.ablatedPrompt))).map(norm);
    deltaByPos[pos] = withVecs.map((wv, i) => sub(wv, ablatedVecs[i]));
    console.log(`    ${pos}: ${items.length} words`);
  }
  return deltaByPos;
}

async function main() {
  console.log("=== English (UD_English-EWT, held-out tenth) ===");
  const EWT = path.join(ROOT, "legacy-eoreader6.1/scripts/corpus/en_ewt-ud-train.conllu");
  const engSents = parseConllu(fs.readFileSync(EWT, "utf8")).filter((_, i) => i % 10 === 9);
  const engDeltas = await deltasForLanguage(engSents, "ablation-grain-prior-eng");
  const engPrior = buildCentroidsFrom(engDeltas, {
    language: "eng", period: "2010s", region: "web text, mixed international sources (blogs, newsgroups, reviews)",
    corpus: "UD_English-EWT (held-out tenth)", giver: "Universal Dependencies",
  });
  fs.writeFileSync(path.join(ROOT, "native/priors/ablation-grain-eng.json"), JSON.stringify({ schema: "AblationGrainPrior@1", ...engPrior }, null, 2));
  console.log("written native/priors/ablation-grain-eng.json");

  console.log("\n=== pooled (every other treebank on disk) ===");
  const banks = findTreebanks();
  const POOL_LANGS = [
    { treebank: "ud-arabic-padt", name: "Arabic" },
    { treebank: "ud-greek-proiel", name: "Ancient Greek" },
    { treebank: "ud-hebrew-htb", name: "Hebrew" },
    { treebank: "ud-latin-perseus", name: "Latin" },
    { treebank: "ud-sanskrit-vedic", name: "Sanskrit (Vedic)" },
    { treebank: "ud-naija_pcm", name: "Naija Pidgin" },
  ];
  const pooledDeltaByPos = Object.fromEntries(POS_SET.map((p) => [p, []]));
  for (const lang of POOL_LANGS) {
    const tb = banks.find((b) => b.name === lang.treebank);
    if (!tb) { console.log(`  skip ${lang.name}: not found`); continue; }
    const rows = tb.files.flatMap((f) => parseConllu(fs.readFileSync(f, "utf8"))).filter((s) => s.tokens.length >= 4);
    console.log(`  ${lang.name} (${rows.length} sentences)`);
    const deltas = await deltasForLanguage(rows, `ablation-grain-prior-${lang.treebank}`);
    for (const pos of POS_SET) pooledDeltaByPos[pos].push(...deltas[pos]);
  }
  const pooledPrior = buildCentroidsFrom(pooledDeltaByPos, {
    language: "pooled: ar, grc, he, la, sa(Vedic), pcm",
    period: "HETEROGENEOUS -- spans ~1st-millennium-BCE prose (Ancient Greek PROIEL) through modern web/spoken text (Naija Pidgin); never treat as one period",
    region: "HETEROGENEOUS -- 6 distinct regions/traditions, pooled only because no same-language-same-period reference exists for these languages yet",
    corpus: "6 UD treebanks (see eot-roundtrip.mjs findTreebanks)", giver: "Universal Dependencies",
  });
  fs.writeFileSync(path.join(ROOT, "native/priors/ablation-grain-pooled.json"), JSON.stringify({ schema: "AblationGrainPrior@1", ...pooledPrior }, null, 2));
  console.log("written native/priors/ablation-grain-pooled.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
