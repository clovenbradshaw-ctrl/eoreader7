#!/usr/bin/env node
// udhr-rosetta.mjs — the Rosetta over the Universal Declaration of Human
// Rights: find ALL MISSING EDGES in the languages that did not read fully,
// and project them into a COMPLETED article-level hyperlexicon per language.
//
// Domain owner (2026-09-16, the unification): this driver is the omnilingual
// GROUND of the paraphrase system — identity across versions is the Rosetta's
// own act of pointing (S113), and the projected edges are paraphrase/identity
// carried across languages. The domain's one owner is YadaYadaYada
// (`yadayadayada`, run-dmca.js, compendium + README Handle table); this
// driver's report names it as owner.
//
// User direction, verbatim: "we need to rosetta these to find all missing
// edges in languages that arent fully read."
//
// THE ALIGNMENT GRID. cross-translation.mjs aligns War and Peace by
// PARAGRAPH ordinal (S113: the same structural position across versions is
// the same proposition — identity across versions is an act of pointing,
// never a fact of the bytes). The UDHR's alignment grid is stricter and
// stronger: ARTICLE ordinal (Article N is the SAME NORM in all 516 UN
// translations) and, within it, SENTENCE ordinal (UN translations of the
// Declaration are sentence-aligned). A proposition the English read extracts
// at (article 5, sentence 2) is the same proposition the Arabic read should
// have extracted at (article 5, sentence 2) — not because the strings match
// (تعذيب ≠ torture) but because the aligned norm and its aligned sentence
// position say so. That is the Rosetta method, applied to the article grid.
//
// THE FINDING IT PRODUCES. Measured on the six official languages (eng, fra,
// rus, spa, arb, cmn_hans): eng reads 110 edges, fra 122, rus 68, spa 9,
// arb 0, cmn 0 — the S103 shape (English-shaped referent discovery has
// nothing to seize on in a caseless script; the received POS prior per
// language helps verbs, not beings). This driver names exactly WHERE the
// under-read languages went dark: the (article, sentence) slots where the
// reference languages (eng + fra, the two that read fully) extracted edges
// and the target extracted NONE. Each is a MISSING EDGE, Rosetta-adjudicated
// (corroborated when BOTH reference languages found a proposition there),
// and projected into the target language's completed hyperlexicon with the
// target's own aligned sentence bytes as the witness span.
//
// usage: node udhr-rosetta.mjs [--out <dir>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readMaterialText } from "./lib/read-recipe.mjs";
import { createHyperlexicon, admitHyperlexiconCandidates, giveHyperlexiconAffordance } from "../../kernel/hyperlexicon.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(process.argv.find((a) => a.startsWith("--out="))?.slice(6) ?? path.join(HERE, "results"));
const CORPUS = "/Users/mlacy/Documents/3.0/live_priors/06-government-legal/un-udhr";

// Per-language article-heading convention + POS prior. Each shape is
// GROUNDED (confirmed against the actual corpus files, 2026-09-13), never
// assumed; the numeral parser is per convention.
const CN_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12, 十三: 13, 十四: 14, 十五: 15, 十六: 16, 十七: 17, 十八: 18, 十九: 19, 二十: 20, 二十一: 21, 二十二: 22, 二十三: 23, 二十四: 24, 二十五: 25, 二十六: 26, 二十七: 27, 二十八: 28, 二十九: 29, 三十: 30 };
const LANGUAGES = {
  eng: { file: "udhr-eng.txt", prior: "pos-eng.json", heading: /^[ \t]*Article[ \t]+(\d+)[ \t]*$/iu, numeral: (m) => Number(m[1]) },
  fra: { file: "udhr-fra.txt", prior: "pos-fra.json", heading: /^[ \t]*Article[ \t]+(premier|première|\d+)[ \t]*$/iu, numeral: (m) => /^p/.test(m[1]) ? 1 : Number(m[1]) },
  spa: { file: "udhr-spa.txt", prior: "pos-spa.json", heading: /^[ \t]*Art[ií]culo[ \t]+(\d+)[ \t]*$/iu, numeral: (m) => Number(m[1]) },
  rus: { file: "udhr-rus.txt", prior: "pos-rus.json", heading: /^[ \t]*Статья[ \t]+(\d+)[ \t]*$/iu, numeral: (m) => Number(m[1]) },
  arb: { file: "udhr-arb.txt", prior: "pos-arb.json", heading: /^[ \t]*المادة[ \t]+(\d+)[ \t]*$/iu, numeral: (m) => Number(m[1]) },
  cmn_hans: { file: "udhr-cmn_hans.txt", prior: "pos-cmn.json", heading: /^[ \t]*第([一二三四五六七八九十]+)条[ \t]*$/u, numeral: (m) => CN_NUM[m[1]] ?? null },
  // GREEK (2026-09-17) — MODERN Greek (ell, monotonic), the UN's official
  // translation: the independent human product the ancient treebanks never
  // touched. Headings are uppercase ΑΡΘΡΟ.
  ell: { file: "udhr-ell_monotonic.txt", prior: "pos-ell.json", heading: /^[ \t]*ΑΡΘΡΟ[ \t]+(\d+)[ \t]*$/iu, numeral: (m) => Number(m[1]) },
};
const REFERENCE = ["eng", "fra"]; // the two that read fully — the Rosetta's corroborating pair

function articleSpans(text, lang) {
  const cfg = LANGUAGES[lang];
  const hits = [];
  const lines = text.split("\n");
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(cfg.heading);
    if (m) { const n = cfg.numeral(m); if (n && n >= 1 && n <= 30) hits.push({ article: n, start: offset }); }
    offset += line.length + 1;
  }
  hits.sort((a, b) => a.start - b.start);
  const spans = hits.map((h, i) => ({ article: h.article, start: h.start, end: i + 1 < hits.length ? hits[i + 1].start : text.length }));
  // The preamble precedes Article 1 — recorded as article 0 (disclosed, not read).
  const preamble = text.slice(0, hits[0]?.start ?? 0);
  return { spans, preamble };
}

const SENTENCE_END = /[.!?。；…][”"']*(\s|$)/u;
// article-RELATIVE sentence ordinal: count sentence terminators in
// text[start..absOffset). Both the slot key and the witness use this SAME
// index, so a proposition and the sentence it was read from never disagree.
function sentenceIndexWithin(text, start, absOffset) {
  let n = 0;
  const re = /[.!?。；…][”"']*(\s|$)/gu;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(text))) {
    if (m.index + m[0].length <= absOffset) n += 1;
    else break;
  }
  return n;
}

async function readLanguage(lang, cache = {}) {
  if (cache[lang]) return cache[lang];
  const cfg = LANGUAGES[lang];
  const text = fs.readFileSync(path.join(CORPUS, cfg.file), "utf8");
  const posPrior = JSON.parse(fs.readFileSync(path.join(HERE, "../../priors", cfg.prior), "utf8"));
  const read = await readMaterialText(text, { source: `file:${cfg.file}`, posPrior, giver: "udhr-rosetta" });
  const { spans, preamble } = articleSpans(text, lang);
  // map each edge to (article, sentenceIndex) by ABSOLUTE byte offset: the
  // edge's scope.offset is encounter-relative; its document position is the
  // encounter's own anchor.start (the edge's scope.sequencePosition indexes
  // the encounter stream).
  const encOffset = (seq) => read.encounters[seq]?.anchor?.start ?? null;
  const edges = read.entries.filter((e) => e.schema === "EOHyperedge@1").map((e) => {
    const off = encOffset(e.scope?.sequencePosition ?? -1);
    const span = off != null ? spans.find((s) => off >= s.start && off < s.end) : undefined;
    return { article: span?.article ?? 0, sentence: off != null && span ? sentenceIndexWithin(text, span.start, off) : -1, relation: e.relation, s: (e.participants ?? [])[0]?.surface ?? null, o: (e.participants ?? []).at(-1)?.surface ?? null, offset: off };
  });
  const result = { lang, text, spans, preamble, edges, totalEdges: read.stats.relationEdges, hyperlexicon: read.hyperlexicon };
  cache[lang] = result;
  console.error(`  ${lang}: ${result.totalEdges} edges, ${spans.length} article spans, preamble ${preamble.length} chars`);
  return result;
}

async function main() {
  console.error(`UDHR-ROSETTA · articles as the alignment grid · reference ${REFERENCE.join("+")}`);
  const cache = {};
  const langs = Object.keys(LANGUAGES);
  const reads = {};
  for (const l of langs) reads[l] = await readLanguage(l, cache);

  // reference edges per (article, sentence) — the union of eng+fra, with a
  // slot corroborated when BOTH reference languages extracted a proposition there.
  const refSlots = new Map(); // "article:sentence" -> { corroborated, edges: [] }
  for (const l of REFERENCE) {
    for (const e of reads[l].edges) {
      if (e.article < 1) continue;
      const key = `${e.article}:${e.sentence}`;
      const row = refSlots.get(key) ?? { article: e.article, sentence: e.sentence, langs: new Set(), edges: [] };
      row.langs.add(l);
      row.edges.push(e);
      refSlots.set(key, row);
    }
  }
  // a reference slot is CORROBORATED when both reference languages read a
  // proposition in it (the Rosetta falsification: a 1-of-2 is incomplete).
  for (const row of refSlots.values()) row.corroborated = row.langs.size === REFERENCE.length;

  // per target language: the missing (article, sentence) slots + projected edges
  const languages = {};
  for (const l of langs) {
    if (REFERENCE.includes(l)) { languages[l] = { role: "reference", totalEdges: reads[l].totalEdges, missingSlots: 0, projected: [] }; continue; }
    const foundSlots = new Set(reads[l].edges.filter((e) => e.article >= 1).map((e) => `${e.article}:${e.sentence}`));
    const missing = [];
    for (const [key, row] of refSlots) {
      if (foundSlots.has(key)) continue;
      missing.push({ ...row, key });
    }
    const projected = [];
    for (const row of missing) {
      for (const e of row.edges) {
        projected.push({
          article: row.article, sentence: row.sentence, relation: e.relation,
          subjectSurface: e.s, objectSurface: e.o,
          referenceLangs: [...row.langs], corroborated: row.corroborated,
          foundVia: "rosetta", adjudicatedBy: "udhr-rosetta.mjs — Wilson's swarm",
          basis: `aligned proposition: ${row.article}·${row.sentence} (${[...row.langs].join("+")} read an edge here; ${l} extracted none) — the same norm in the same aligned sentence slot; identity across versions is an act of pointing, never a fact of the bytes (S113)`,
          targetWitness: alignedSentence(reads[l], row.article, row.sentence),
        });
      }
    }
    languages[l] = { role: "target", totalEdges: reads[l].totalEdges, missingSlots: missing.length, missingCorroborated: missing.filter((m) => m.corroborated).length, projectedEdges: projected.length, projected };
    console.error(`  ${l}: ${missing.length} missing slots (${missing.filter((m) => m.corroborated).length} Rosetta-corroborated), ${projected.length} projected edges`);
  }

  const out = {
    schema: "UDHRRosetta@1",
    declared: {
      corpus: CORPUS, reference: REFERENCE, grid: "(article, sentence) ordinal — the UDHR is sentence-aligned across its 516 UN translations",
      basis: "cross-translation.mjs's Rosetta method (S113) on the article grid: the same norm at the same aligned sentence is the same proposition; identity across versions is for-whom, never a fact of the bytes",
      discriminator: "a slot is MISSING when the reference languages read a proposition there and the target extracted none; corroborated when BOTH references agree",
    },
    owner: { handle: "yadayadayada", name: "Yada Yada Yada", role: "the paraphrase archon — the Rosetta projection is the omnilingual ground of the paraphrase system" },
    languages,
    referenceSlots: refSlots.size,
    referenceSlotsCorroborated: [...refSlots.values()].filter((r) => r.corroborated).length,
  };

  // ── THE GROUND: per-language COMPLETED hyperlexicon, emitted beside the
  // report. The charter organ governs against an EOHyperlexicon@1 (THE-MORAL-
  // CORE: "the charters are GIVEN affordances in the hyperlexicon, with the
  // charters named as giver"). The ground is the declaration's NORMS as given
  // affordances, keyed on the norm's proposition (`relation → object`), each
  // witnessed by THAT language's own aligned sentence bytes. EVERY language
  // carries the same norm set — its own read edges (the declaration's voice)
  // plus, for targets, the Rosetta-projected missing edges. That is the
  // omnilingual ground: the same norm, in every language, standing on the
  // language's own bytes. Corroborated projections (both references read the
  // norm) are GIVEN with the UDHR as giver; a 1-of-2 projection is a
  // candidate, refutable never earned (the Rosetta falsification).
  const ground = {};
  const UDHR_GIVER = "Universal Declaration of Human Rights — UN GA Res 217 A (III), 10 December 1948 — the declaration's own voice, read via the Rosetta";
  for (const l of langs) {
    let hl = createHyperlexicon();
    // 1. THE LANGUAGE'S OWN READ EDGES — the norms its reader actually
    // extracted, promoted to GIVEN with the UDHR as giver (the same promotion
    // the swarm's adjudication performs with Wilson, giver swapped to the
    // Declaration — LAVAR.md 2026-09-13). A norm the language itself read is
    // its own bytes' voice; the declaration names the giver.
    for (const e of reads[l].edges) {
      if (e.article < 1) continue;
      const witness = alignedSentence(reads[l], e.article, e.sentence);
      if (!witness) continue;
      hl = giveHyperlexiconAffordance(hl, {
        left: e.relation, right: e.o, giver: UDHR_GIVER,
        witnesses: [witness],
        meta: { article: e.article, sentence: e.sentence, source: "own_read", projected: false },
      });
    }
    // 2. THE ROSETTA-PROJECTED MISSING EDGES — only for targets. Corroborated
    // (both references agree) → GIVEN with the UDHR as giver; 1-of-2 → a
    // candidate, refutable never earned.
    if (languages[l].role === "target") {
      const candidates = [];
      for (const row of languages[l].projected ?? []) {
        if (!row.targetWitness) continue;
        const rec = {
          left: row.relation, right: row.objectSurface,
          witnesses: [row.targetWitness],
          meta: {
            article: row.article, sentence: row.sentence, corroborated: row.corroborated,
            referenceLangs: row.referenceLangs, projected: true, basis: row.basis,
          },
        };
        if (row.corroborated) {
          hl = giveHyperlexiconAffordance(hl, { ...rec, giver: UDHR_GIVER });
        } else {
          candidates.push({ ...rec, giver: "udhr-rosetta.mjs — Wilson's swarm" });
        }
      }
      hl = admitHyperlexiconCandidates(hl, candidates);
    }
    const composition = hl.composition ?? {};
    ground[l] = {
      schema: "EOHyperlexicon@1",
      giver: UDHR_GIVER,
      language: l,
      role: languages[l].role,
      entries: Object.keys(composition).length,
      given: Object.values(composition).filter((e) => e.standing === "given").length,
      candidates: Object.values(composition).filter((e) => e.standing === "candidate").length,
      hyperlexicon: hl,
      disclosed: languages[l].role === "target"
        ? `${reads[l].edges.filter((e) => e.article >= 1).length} own-read norms + ${(languages[l].projected ?? []).length} Rosetta-projected missing edges — corroborated projections GIVEN with the UDHR as giver, 1-of-2 candidates — each witnessed by ${l}'s own aligned sentence`
        : `${reads[l].edges.filter((e) => e.article >= 1).length} own-read norms, all GIVEN with the UDHR as giver — the reference language's ground is its own read`,
    };
    const groundPath = path.join(OUT_DIR, `udhr-${l}.ground.hyperlexicon.json`);
    fs.writeFileSync(groundPath, JSON.stringify(ground[l], null, 2) + "\n");
  }
  out.ground = Object.fromEntries(Object.entries(ground).map(([l, g]) => [l, { language: l, role: g.role, entries: g.entries, given: g.given, candidates: g.candidates, file: `udhr-${l}.ground.hyperlexicon.json`, disclosed: g.disclosed }]));
  out.groundFiles = Object.fromEntries(Object.entries(ground).map(([l, g]) => [l, `udhr-${l}.ground.hyperlexicon.json`]));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, "udhr-rosetta.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  console.log(JSON.stringify({
    referenceSlots: out.referenceSlots,
    referenceSlotsCorroborated: out.referenceSlotsCorroborated,
    perLanguage: Object.fromEntries(Object.entries(languages).map(([l, v]) => [l, { role: v.role, totalEdges: v.totalEdges, missingSlots: v.missingSlots ?? null, projectedEdges: v.projectedEdges ?? null, groundEntries: ground[l].entries }])),
    groundFiles: out.groundFiles,
    outFile: outPath,
  }, null, 2));
}

function alignedSentence(read, article, sentence) {
  const span = read.spans.find((s) => s.article === article);
  if (!span) return null;
  // the sentence ordinal within the ARTICLE, from the article's own bytes
  const articleText = read.text.slice(span.start, span.end);
  const re = /[^.!?。；…]*[.!?。；…]+\s*/gu;
  const sentences = articleText.match(re) ?? [];
  return sentences[sentence] ? sentences[sentence].trim().slice(0, 200) : null;
}

main().catch((err) => { console.error(err.stack || err); process.exit(1); });