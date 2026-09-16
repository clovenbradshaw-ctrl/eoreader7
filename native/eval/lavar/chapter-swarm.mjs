#!/usr/bin/env node
// chapter-swarm.mjs — Wilson's swarm, run over CHAPTERS through the RECURSIVE
// reading pipeline (the read-real recipe), not the EOT ledger.
//
// User direction, verbatim: "we need a swarm to do this type of chapter
// analysis and use the CV if needed." The "type" is read-real.mjs's own
// recursive read (holograph + Hyperlexicon) — the same machinery
// cli/eoreader7.mjs runs on one file, here run per chapter and ACCUMULATED
// across the book.
//
// WHY A SWARM AND NOT ONE READ. LAVAR.md (2026-09-13) rule 1: a single
// independent chain site NOMINATES at `minWitnesses: 1`; the cross-reading
// accumulator corroborates to >=2. Measured: W&P ch1-3 has 18-23 pair types,
// every one at support 1 — a single read nominates many, corroborates none,
// and the Earth Charter nominates none at all. The second witness is supposed
// to come from the NEXT reading. This driver IS that next reading, run once
// per chapter, unioned by the hyperlexicon's own accumulator
// (admitHyperlexiconCandidates, which dedups witnesses by content-addressed
// id across readings). A pair two chapters both nominate is the book's own
// chemistry, promoted to GIVEN with Wilson named as giver (the swarm's
// standing adjudication role — primed-read.mjs's own).
//
// CV, WHEN NEEDED. A chapter whose plain-text bytes carry structure the flat
// reader cannot see (a table, a multi-column layout, box-drawing, a scan) is
// read WRONG as prose. `native/organs/look.js` names the trigger
// (weirdFormattingScore) and the capacity: render the bytes the way a person
// sees them (QuickLook) and read the image (Tesseract OCR, then a vision
// model). With `--cv`, a triggered chapter is rendered and OCR'd, and the
// reader reads the OCR text; the vision model's read rides beside it as a
// disclosed note. Without `--cv`, a triggered chapter is still NAMED
// (`cv_recommended`) rather than silently read as prose — the trigger is
// never suppressed.
//
// usage: node chapter-swarm.mjs <book.txt> [--lang eng] [--cv] [--out <dir>]
//        [--limit-per-chapter N]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectAndMatch } from "./structure-rec.mjs";
import { readMaterialText } from "./lib/read-recipe.mjs";
import { createHyperlexicon, admitHyperlexiconCandidates, giveHyperlexiconAffordance } from "../../kernel/hyperlexicon.js";
import { pairKey } from "../../kernel/hyperlexicon.js";
import { weirdFormattingScore, renderTextToImage, ocrFullImage, lookAtImage } from "../../organs/look.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GIVER = "chapter-swarm.mjs — Wilson's swarm";
const PRIOR_BY_LANG = { en: "pos-eng.json", eng: "pos-eng.json", fr: "pos-fra.json", fra: "pos-fra.json", ru: "pos-rus.json", rus: "pos-rus.json", spa: "pos-spa.json", es: "pos-spa.json", arb: "pos-arb.json", ar: "pos-arb.json", cmn: "pos-cmn.json", cmn_hans: "pos-cmn.json", zh: "pos-cmn.json", tur: "pos-tur.json", heb: "pos-heb.json", ell: "pos-ell.json", fas: "pos-fas.json", kor: "pos-kor.json" };

const arg = (name, dflt = null) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const idx = process.argv.indexOf(`--${name}`);
  return idx > -1 ? (process.argv[idx + 1] ?? true) : dflt;
};

const bookPath = process.argv[2];
if (!bookPath || bookPath.startsWith("--")) {
  console.error("usage: node chapter-swarm.mjs <book.txt> [--lang eng] [--cv] [--out <dir>] [--limit-per-chapter N]");
  process.exit(1);
}
const LANG = String(arg("lang", "eng"));
const USE_CV = Boolean(arg("cv", false));
const OUT_DIR = path.resolve(String(arg("out", path.join(HERE, "results"))));
const LIMIT_PER_CHAPTER = arg("limit-per-chapter", null) ? Number(arg("limit-per-chapter")) : null;

const raw = fs.readFileSync(bookPath, "utf8");
const source = `file:${path.basename(bookPath)}`;
const slug = path.basename(bookPath).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

const priorFile = PRIOR_BY_LANG[LANG] ?? "pos-eng.json";
const posPrior = JSON.parse(fs.readFileSync(path.join(HERE, "../../priors", priorFile), "utf8"));
console.error(`chapter-swarm: ${source} · lang ${LANG} (${priorFile}) · cv ${USE_CV ? "on" : "off"}`);

// ── 1. CHAPTERS — the document's own convention, detected (S107), never
// assumed. A book with no detectable convention is ONE chapter, disclosed.
// `--no-chapters` forces the single continuous read (the read-real recipe) —
// for a declaration like the UDHR the continuous read is the one that yields
// the full hyperlexicon; the article split is for cross-article corroboration. ──
const FORCE_CONTINUOUS = Boolean(arg("no-chapters", false));
const { convention, hits } = FORCE_CONTINUOUS ? { convention: null, hits: [] } : detectAndMatch(raw);
let chapters;
if (convention && hits.length) {
  chapters = hits.map((h, i) => ({
    index: i + 1,
    numeral: h.numeral,
    title: (h.titleLine ?? "").trim() || null,
    start: h.start,
    end: i + 1 < hits.length ? hits[i + 1].start : raw.length,
  }));
  console.error(`  convention: ${convention.name} — ${chapters.length} chapter(s), front matter ${hits[0].start} byte(s) disclosed, not read`);
} else {
  chapters = [{ index: 1, numeral: "1", title: null, start: 0, end: raw.length }];
  console.error(`  no chapter convention detected — reading the whole document as ONE chapter (disclosed)`);
}

// ── 2. READ EACH CHAPTER — the recursive pipeline, CV gate first. ──
const chapterReads = [];
const nominationByPair = new Map(); // pairKey -> { left, right, chapters:Set, witnesses:Set }
for (const ch of chapters) {
  const chapterText = raw.slice(ch.start, ch.end);
  const fmt = weirdFormattingScore(chapterText);
  let material = chapterText;
  const cv = { triggered: fmt.score > 0, score: fmt.score, signals: fmt.signals, used: false, ocrChars: 0, visionRead: null, error: null };

  if (fmt.score > 0 && USE_CV) {
    try {
      const rendered = renderTextToImage(chapterText, { label: `er7-chapter-${slug}-${ch.index}` });
      const ocr = ocrFullImage(rendered.imagePath);
      if (ocr && ocr.trim().length >= 0.5 * chapterText.trim().length) {
        material = ocr;
        cv.used = true;
        cv.ocrChars = ocr.length;
        try {
          const looked = await lookAtImage(rendered.imagePath, { name: `${slug} ch${ch.index}` });
          cv.visionRead = looked.visionRead;
        } catch (err) { cv.error = `vision: ${err.message}`; }
      } else {
        cv.error = `ocr yielded ${ocr?.length ?? 0} chars (< half the prose) — read the text as-is`;
      }
    } catch (err) {
      cv.error = err.message;
    }
  } else if (fmt.score > 0) {
    cv.error = "cv_recommended: weird formatting present, --cv not set; read as flat prose (disclosed, never suppressed)";
  }

  const result = await readMaterialText(LIMIT_PER_CHAPTER ? material.slice(0, LIMIT_PER_CHAPTER) : material, {
    source: `${source}#ch${ch.index}`, posPrior, giver: GIVER,
  });
  const cands = result.candidates.map((c) => ({ left: c.left, right: c.right, support: c.meta?.support ?? 0 }));
  for (const c of cands) {
    const k = pairKey(c.left, c.right);
    const row = nominationByPair.get(k) ?? { left: c.left, right: c.right, chapters: new Set(), witnesses: new Set() };
    row.chapters.add(ch.index);
    for (const w of (result.hyperlexicon.composition[k]?.witnesses ?? [])) row.witnesses.add(JSON.stringify(w));
    nominationByPair.set(k, row);
  }
  chapterReads.push({
    index: ch.index, numeral: ch.numeral, title: ch.title,
    span: [ch.start, ch.end], chars: chapterText.length, materialChars: material.length,
    cv,
    encounters: result.encounters.length,
    relationEdges: result.stats.relationEdges,
    referentBindings: result.stats.referentBindings,
    chainSites: result.stats.chainSites,
    pairTypes: result.stats.pairTypes,
    fullyReferentResolvedEdges: result.stats.fullyReferentResolvedEdges,
    candidates: cands,
  });
  console.error(`  ch${ch.index}${ch.title ? ` "${ch.title}"` : ""}: ${result.encounters.length} enc, ${result.stats.relationEdges} edges, ${result.stats.chainSites} chains, ${cands.length} nomination(s)${cv.used ? ` [CV: ${cv.ocrChars} OCR chars]` : cv.triggered ? " [CV triggered]" : ""}`);
}

// ── 3. THE ACCUMULATOR — union nominations across chapters; a pair two
// chapters nominate is corroborated and promoted to GIVEN (Wilson giver). ──
const accumulated = [...nominationByPair.values()];
let hl = createHyperlexicon({ meta: { source, convention: convention?.name ?? null, chapters: chapters.length } });
hl = admitHyperlexiconCandidates(hl, accumulated.map((row) => ({
  left: row.left, right: row.right, giver: GIVER,
  witnesses: [...row.witnesses].slice(0, 5),
  meta: { independentSupport: row.chapters.size, chapters: [...row.chapters] },
})));
const corroborated = accumulated.filter((row) => row.chapters.size >= 2);
for (const row of corroborated) {
  hl = giveHyperlexiconAffordance(hl, {
    left: row.left, right: row.right, giver: GIVER,
    witnesses: [...row.witnesses].slice(0, 5),
    meta: { chapters: [...row.chapters], corroboratedBy: "chapter-swarm accumulator (>=2 chapters)" },
  });
}
const composition = Object.values(hl.composition);

// ── 4. GENEALOGY — Wilson's append-only lineage: one birth + fate per chapter
// read, so a chapter tried once is never abandoned silently. ──
const GENEALOGY = path.join(HERE, "results", "chapter-swarm-genealogy.jsonl");
for (const c of chapterReads) {
  const birth = { born: 1, parents: ["read-real-recipe"], genotype: `chapter-read:${c.cv.used ? "cv" : "text"}`, context: `${LANG}:ch${c.index}`, fate: "alive", edges: c.relationEdges, chains: c.chainSites, nominations: c.candidates.length };
  fs.appendFileSync(GENEALOGY, JSON.stringify(birth) + "\n");
  fs.appendFileSync(GENEALOGY, JSON.stringify({ ...birth, fate: c.candidates.length ? "kept" : "refused", __fate: true }) + "\n");
}

const out = {
  schema: "ChapterSwarmRead@1",
  declared: {
    source, lang: LANG, prior: priorFile, giver: GIVER,
    recipe: "read-real recursive pipeline, per chapter, minWitnesses:1 nomination",
    convention: convention?.name ?? null, chapters: chapters.length, cv: USE_CV,
    corroborationRule: "a pair nominated by >=2 chapters is promoted to GIVEN (Wilson giver); nomination is never licensing",
  },
  chapters: chapterReads,
  hyperlexicon: {
    schema: hl.schema,
    entries: composition.length,
    given: composition.filter((e) => e.standing === "given").map((e) => ({ left: e.left, right: e.right, chapters: e.meta.chapters ?? null, witnesses: e.provenance?.witnesses ?? null })),
    candidates: composition.filter((e) => e.standing === "candidate").map((e) => ({ left: e.left, right: e.right, independentSupport: e.meta.independentSupport ?? 0, chapters: e.meta.chapters ?? null })),
  },
  corroborated: corroborated.map((r) => ({ left: r.left, right: r.right, chapters: [...r.chapters] })),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const outPath = path.join(OUT_DIR, `${slug}-chapter-swarm.json`);
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");

console.log(JSON.stringify({
  chapters: chapters.length,
  totalRelationEdges: chapterReads.reduce((a, c) => a + c.relationEdges, 0),
  totalNominations: accumulated.length,
  corroboratedPairs: corroborated.length,
  hyperlexiconGiven: out.hyperlexicon.given.length,
  cvChapters: chapterReads.filter((c) => c.cv.used).length,
  outFile: outPath,
  genealogy: GENEALOGY,
}, null, 2));