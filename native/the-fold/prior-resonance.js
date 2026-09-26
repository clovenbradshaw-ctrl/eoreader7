// native/the-fold/prior-resonance.js — which of live_priors' own real
// content resonates with a declared topic/void, by real embedding
// similarity, gated by corpus-resonance.js's own measured-null discipline
// (embed/cosine/buildResonanceCache/resonantMatch/NULL_QUERIES are
// IMPORTED from there, never restated — a second copy is how this exact
// mechanism drifts, this repo's own repeated P22/P24/P39 lesson).
//
// WHY THIS FILE, AND NOT predigest.js's COMPILED ARTIFACT: checked before
// writing anything (search-before-invent). the-fold's predigest.js compiles
// EOCompiledPriors@1, which stores NO per-document embeddable text at all —
// only structural/statistical cross-work signatures (EOExperiencePrior@1/
// EORhythmPrior@1) keyed by source id, plus a corpus MANIFEST of {source,
// path, encounters, capped}. The one artifact on disk this session
// (native/eval/the-fold/results/compiled-priors.json, generated 2026-09-02)
// was measured directly before this file was written: 0 of its 112 corpus
// entries are from live_priors (that run's own live_priors walk produced
// nothing), and all 68 of its eo-wiki entries fail to resolve on disk today
// (that sibling repo has since moved or been removed). Building against
// that artifact would mostly return typed gaps, not signal. The genuinely
// useful, present, current corpus for "which prior resonates with this
// void" is live_priors itself — which is also what this project's own
// standing question ("what priors to activate based on the void defined")
// traced back to, through the-fold's priors.js/priors-toggles.js and
// form-priors.js, before this file existed. predigest.js's compiled
// artifact stays a real, separate, disclosed-stale mechanism (POLICIES.md
// P60/P256) — not force-fit here.
//
// THE FALSIFIED ALTERNATIVE, DISCLOSED RATHER THAN RE-TRIED: a cheap
// structural "shape" signal (POS-tag distribution + mean sentence length +
// type-token ratio, zero model calls) was measured directly against real
// live_priors samples across 5 categories in a prior session and found
// INDISTINGUISHABLE FROM CHANCE (0.1786 leave-one-out accuracy, at/below
// the 0.20 floor for 5 balanced categories, 0.3ms/document) while real
// embeddings reached 0.8214 accuracy at a real, non-prohibitive cost
// (102.3ms/document, 318x slower but not remotely prohibitive for this
// task). This file uses embeddings only, on that measured basis — no
// cheaper structural heuristic is offered as an alternative anywhere here.

import fs from "node:fs";
import path from "node:path";
import { embed, cosine, buildResonanceCache, NULL_QUERIES } from "./corpus-resonance.js";

const TEXT_EXTENSIONS = new Set([".txt", ".md"]);

/**
 * walkCorpusDir(dir, { maxFiles }) — a real, bounded directory walk (the
 * one crossing: fs.readdirSync) returning [{path}] with `path` RELATIVE TO
 * `dir`, text files only (.txt/.md), dotfiles and dot-directories skipped.
 * `maxFiles` is a declared runaway backstop (P9 — never silently
 * unbounded); the walk stops as soon as it is hit, so it is a bound on
 * WORK done, not merely on the returned list's length.
 */
export function walkCorpusDir(dir, { maxFiles = Infinity } = {}) {
  const out = [];
  const stack = [""];
  while (stack.length && out.length < maxFiles) {
    const rel = stack.pop();
    const full = path.join(dir, rel);
    let entries;
    try { entries = fs.readdirSync(full, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (out.length >= maxFiles) break;
      if (e.name.startsWith(".")) continue;
      const relPath = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) { stack.push(relPath); continue; }
      if (TEXT_EXTENSIONS.has(path.extname(e.name).toLowerCase())) out.push({ path: relPath });
    }
  }
  return out;
}

/**
 * readExcerpt(fullPath, { excerptChars }) — a real, bounded slice of a
 * real file's own bytes, never a summary or a guess. Reuses the already-
 * measured shape-vs-embedding experiment's own choice: a mid-document
 * slice (skip past the first third, when the file is long enough to make
 * that meaningful) rather than the head, since a document's opening is
 * its least representative part (title, front matter, boilerplate).
 * Returns null (never throws) when the file cannot be read at all — the
 * caller types the gap; this function only ever reports "readable or not."
 */
export function readExcerpt(fullPath, { excerptChars = 3000 } = {}) {
  let raw;
  try { raw = fs.readFileSync(fullPath, "utf8"); } catch { return null; }
  const start = raw.length > excerptChars * 2 ? Math.floor(raw.length / 3) : 0;
  const text = raw.slice(start, start + excerptChars).replace(/\s+/g, " ").trim();
  return text || null;
}

/**
 * resonantCorpusEntries(queryText, entries, { baseDir, excerptChars, top,
 * ollamaUrl, model }) — the general ranker. `entries` is any array of
 * {path, ...} — live_priors' own walk, or (should its paths ever resolve
 * again) predigest.js's compiled corpus manifest; same shape, same
 * function, never two rankers for two candidate lists. `baseDir` is
 * REQUIRED and never guessed or defaulted — a hand-picked default here
 * would silently paper over the exact stale-path problem measured in this
 * file's own header. Returns { matches, ceiling, consulted, gaps } —
 * natural-frequency, never "confirmed": a source whose file cannot be read
 * is a typed gap, collected and returned, never thrown and never silently
 * dropped from the count.
 */
export async function resonantCorpusEntries(queryText, entries, { baseDir, excerptChars = 3000, top = 3, ollamaUrl, model } = {}) {
  if (!baseDir) throw new TypeError("resonantCorpusEntries: baseDir is required — a corpus entry's path is only ever relative to a caller-declared root, never assumed");
  const opts = { ollamaUrl, model };
  const gaps = [];
  const readable = [];
  for (const entry of entries ?? []) {
    const full = path.resolve(baseDir, entry.path);
    const text = readExcerpt(full, { excerptChars });
    if (text == null) { gaps.push({ gap: "source_unreadable", path: entry.path }); continue; }
    readable.push({ entry, text });
  }
  if (!readable.length) return { matches: [], ceiling: null, consulted: 0, gaps };

  const cache = await buildResonanceCache(readable, (r) => r.text, { ...opts, calibration: NULL_QUERIES });
  // The cache's own resonantMatch (corpus-resonance.js) returns only the
  // single best item above the ceiling; a void may resonate with more
  // than one source, so the full ranked list above the SAME ceiling is
  // built directly here over the cache's own vectors — one query
  // embedding, not one per candidate.
  const [queryVec] = await embed([String(queryText ?? "")], opts);
  const ranked = cache.itemVecs
    .map((iv) => ({ entry: iv.item.entry, similarity: cosine(queryVec, iv.vec) }))
    .filter((r) => r.similarity > cache.ceiling)
    .sort((a, b) => b.similarity - a.similarity);
  return { matches: ranked.slice(0, top), ceiling: cache.ceiling, consulted: readable.length, gaps };
}

/**
 * resonantLivePriorsCategories(queryText, { liveDir, perCategory, top,
 * excerptChars, ollamaUrl, model }) — the direct answer to "which
 * content-category prior should activate for this void": samples
 * `perCategory` (default 6 — the shape-vs-embedding predecessor's own
 * sample size per category, not re-picked) real documents from each of
 * live_priors' own top-level category directories, ranks them against
 * `queryText`, and folds surviving document-level matches UP to their
 * category — a category is relevant if ANY of its sampled documents
 * cleared the measured null; absence of a clearing document says nothing
 * about the rest of the category (kind-standing.js's own foldPermitted
 * discipline, one register over: positive evidence moves the standing,
 * a thin/negative sample never does). Never claims a category-level
 * embedding exists — there isn't one to compute honestly.
 */
// live_priors' own real content-category convention — every genuine
// category (01-literature-books, 06-government-legal, ..., 18-childrens-
// books) is prefixed with a two-digit number; the corpus's own machinery
// directories (derived-priors, digested, goldens, manifests, scripts, src)
// never are. Caught by RUNNING this organ against the real, unfiltered
// corpus (a live demonstration reported "scripts" and "goldens" as
// resonant categories, both real machinery directories, not content) —
// fixed structurally, matching the-fold's own priors-toggles.js walk rule,
// rather than a hardcoded exclusion list that goes stale as new machinery
// directories are added.
const CATEGORY_DIR_RE = /^\d\d-/;

export async function resonantLivePriorsCategories(queryText, { liveDir, perCategory = 6, top = 3, excerptChars = 3000, ollamaUrl, model } = {}) {
  let cats;
  try { cats = fs.readdirSync(liveDir, { withFileTypes: true }).filter((e) => e.isDirectory() && CATEGORY_DIR_RE.test(e.name)); }
  catch { return { matches: [], ceiling: null, consulted: 0, categoriesSampled: 0, gaps: [{ gap: "corpus_absent", detail: liveDir }] }; }

  const entries = [];
  for (const cat of cats) {
    const files = walkCorpusDir(path.join(liveDir, cat.name), { maxFiles: perCategory * 4 });
    for (const f of files.slice(0, perCategory)) entries.push({ path: path.join(cat.name, f.path), category: cat.name });
  }

  const result = await resonantCorpusEntries(queryText, entries, { baseDir: liveDir, excerptChars, top: entries.length, ollamaUrl, model });
  const byCategory = new Map();
  for (const m of result.matches) {
    const prev = byCategory.get(m.entry.category);
    if (!prev || m.similarity > prev.similarity) byCategory.set(m.entry.category, m);
  }
  const categoryMatches = [...byCategory.entries()]
    .map(([category, m]) => ({ category, similarity: m.similarity, path: m.entry.path }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, top);
  return { matches: categoryMatches, ceiling: result.ceiling, consulted: result.consulted, categoriesSampled: cats.length, gaps: result.gaps };
}
