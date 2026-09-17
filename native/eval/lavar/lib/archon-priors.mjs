// native/eval/lavar/lib/archon-priors.mjs — an archon's composition
// chemistry, read once from its own public-domain text and stored as a
// PRIOR, never a source.
//
// User direction (2026-09-17, verbatim): "the actual text as the ant's
// priming ground... not new architecture" — this file is exactly the
// pieces this repo already has, composed: `read-recipe.mjs`'s own
// `readMaterialText` (the SAME recipe chapter-swarm.mjs and cli/eoreader7.mjs
// already run), `kernel/hyperlexicon.js`'s `compositionAffordance` (the
// SAME lookup `correctedFitness` will consult), and the tiered-priors
// contract `live_priors/derived-priors/` already keeps for every other
// corpus pocket in this project: a NAMED POCKET that steers composition,
// never one that supplies content.
//
// WHAT TRANSFERS, AND WHAT DOES NOT (the 2026-09-13 finding, "the label is
// the lens, the grain is not" — Wilson's own consilience law, unification by
// LEVEL, never by collapsing levels): an archon's stored chemistry is
// `EOHyperlexicon@1` composition entries — WHICH RELATION-LABEL PAIRS
// compose, at which grain. It never carries the archon's own sentences,
// referents, or named entities — `stripArchonReferents` below strips
// anything that is not a bare composition-affordance row before the file
// ever touches disk, so a grounded ant is primed with a SHAPE of
// composition, never handed Nietzsche's or Ramakrishna's actual words to
// read Alice in Wonderland through.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripContainer } from "../../../adapters/text/spans.js";
import { readMaterialText } from "./read-recipe.mjs";
import { compositionAffordance, pairKey, createHyperlexicon, giveHyperlexiconAffordance } from "../../../kernel/hyperlexicon.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// The tiered-priors pocket this project already keeps for corpus-derived
// material — read live_priors's own README (derived-priors/) before moving
// this default; it is not re-derived here, only reused.
export const DEFAULT_ARCHON_PRIOR_DIR = path.resolve(HERE, "../../../../../live_priors/derived-priors/archon-priors");

export const ARCHON_PRIOR_SCHEMA = "EOArchonPrior@1";

// The recursive reader's own per-call cost does not scale to a whole book in
// one flat read (measured live: a 389K-char flat read on this checkout did
// not finish inside a multi-minute budget). chapter-swarm.mjs already solved
// exactly this by reading per CHAPTER and accumulating corroboration across
// chapters (nominationByPair, below, mirrors its own pattern verbatim) — an
// archon's own text is chunked the same way, at a bounded, MEASURED size
// (20,000 chars read in ~7s on this checkout's 60K-char pilot slice), never
// read whole.
export const DEFAULT_ARCHON_CHUNK_CHARS = 20000;

/**
 * chunkArchonText(text, chunkChars) — paragraph-boundary chunks, each no
 * larger than `chunkChars` (a paragraph itself larger than the target is
 * kept whole rather than cut mid-sentence — matches this repo's own
 * "never guess a cut inside a sentence" discipline).
 */
export function chunkArchonText(text, chunkChars = DEFAULT_ARCHON_CHUNK_CHARS) {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  const chunks = [];
  let current = "";
  for (const para of paragraphs) {
    if (current && current.length + para.length + 2 > chunkChars) {
      chunks.push(current);
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * A PUBLIC-DOMAIN-CONFIRMED roster only. Every entry names its own source
 * and the check that confirmed it — never assumed from an author's era
 * alone (this repo's own "always credited" discipline, archon-compendium.js
 * P55/P56). Ramakrishna is deliberately narrowed to the Sanskrit/Bengali
 * original and the earliest (1907, Max Müller-era) English renderings —
 * the Kathamrita's own most commonly quoted translation (Nikhilananda,
 * 1942) is NOT public domain in the US until 2038 (95 years post-1942
 * publication under 17 U.S.C. §304) and is excluded here by that same
 * check, not merely by caution.
 */
export const ARCHON_ROSTER = Object.freeze({
  nietzsche: Object.freeze({
    name: "Friedrich Nietzsche",
    // Multiple WORKS per archon, not one — corroboration within a single
    // ~400K-char book measured live at ZERO (below, "THE MEASURED FINDING"):
    // no pair repeated independently across 2+ of that book's own 22
    // chunks. Cross-WORK corroboration (this array) generalizes
    // chapter-swarm.mjs's own cross-CHAPTER accumulator one level up — the
    // same recurring composition move showing up in two DIFFERENT books is
    // real corroboration a single book's internal chunking cannot supply.
    works: Object.freeze([
      { gutenbergId: 4363, title: "Beyond Good and Evil", translator: "Helen Zimmern", pdBasis: "author died 1900; this translation published 1907 — both clear of any US or life+70 term" },
      { gutenbergId: 52263, title: "Twilight of the Idols / The Antichrist", translator: "Anthony M. Ludovici", pdBasis: "this translation published 1911 (Complete Works of Nietzsche, ed. Oscar Levy) — clear of any US term" },
    ]),
  }),
  // Additional roster entries (Homer, Marcus Aurelius, Whitman, Tolstoy…)
  // are named future work, per the pilot-first sequencing this pass
  // committed to — not fabricated here without their own fetched-and-run
  // pilot.
});

/**
 * stripArchonReferents(hyperlexicon) — the wall this module exists to
 * enforce: an archon's stored chemistry may carry a LABEL PAIR (what
 * composes with what) and a GRAIN, and nothing else that could be read as
 * the archon's own content. `witnesses` (the archon's own text spans that
 * evidenced the composition) are dropped — a witness is exactly the
 * archon's sentence, which this pocket must never carry forward as
 * material a grounded ant's reading could quote or resolve referents
 * against.
 */
export function stripArchonReferents(hyperlexicon) {
  const stripped = {};
  for (const [key, entry] of Object.entries(hyperlexicon.composition ?? {})) {
    if (entry.standing !== "given") continue; // only licensed chemistry travels, never a bare candidate
    stripped[key] = Object.freeze({
      left: entry.left,
      right: entry.right,
      standing: "given",
      giver: entry.giver,
      witnesses: Object.freeze([]), // the wall: no archon prose crosses
      provenance: Object.freeze({ giver: entry.giver, basis: "archon prior — composition shape only, witnesses stripped" }),
      meta: Object.freeze({ independentSupport: entry.meta?.independentSupport ?? 0 }),
    });
  }
  return Object.freeze(stripped);
}

/**
 * buildArchonPrior(archonKey, texts, { posPrior, canonicalizationFloor,
 * chunkChars, minChunks, onChunk }) — run the SAME read-recipe
 * chapter-swarm.mjs runs, per bounded CHUNK rather than any one work flat
 * (which does not finish inside a tractable budget — measured live: a
 * 389K-char flat read did not complete inside several minutes), and
 * accumulate nominations ACROSS EVERY CHUNK OF EVERY WORK exactly the way
 * chapter-swarm.mjs's own `nominationByPair` accumulates across chapters —
 * generalized one level up, from chapters of one book to works of one
 * archon's corpus (THE MEASURED FINDING, below, is why this generalization
 * was necessary rather than optional). `texts` is an array of raw strings,
 * one per `ARCHON_ROSTER[archonKey].works` entry, in the same order (a
 * bare string is accepted for a single-work archon and wrapped).
 *
 * A pair nominated by `minChunks` or more DISTINCT chunks (from the SAME
 * work or DIFFERENT works — a chunk's identity is `work#chunkIndex`, so
 * two hits inside one work's own chunking count exactly as they did
 * before) is promoted to `given`, named by giver, and carried into the
 * returned, storable EOArchonPrior@1; a pair nominated by fewer chunks
 * stays a candidate and — per `stripArchonReferents`'s own wall — never
 * crosses into the persisted prior at all. `onChunk(i, total)` is an
 * optional progress callback. Does not write to disk — `persistArchonPrior`
 * is the disk-writing half, kept separate so a test can call this without
 * touching the filesystem.
 *
 * THE MEASURED FINDING (2026-09-17, this checkout, kept here so it is not
 * re-measured): a single ~389K-char work (Beyond Good and Evil, 22 chunks,
 * 99 distinct nominated pairs) corroborated ZERO pairs at minChunks:2 —
 * no composition-affordance pair recurred independently across two of that
 * one book's own chunks. This is a real, disclosed result, not a defect —
 * it matches this project's own repeatedly-measured "corroboration is rare
 * within one reading" finding (the-fold's own P83: "not a weak witness but
 * the material"). It is why this function pools chunks across an archon's
 * WHOLE ROSTER of works rather than one.
 */
export async function buildArchonPrior(archonKey, texts, {
  posPrior = null,
  canonicalizationFloor,
  chunkChars = DEFAULT_ARCHON_CHUNK_CHARS,
  minChunks = 2, // the same ">=2 independent" bar this project holds everywhere (WITNESS_FLOOR, chapter-swarm's own corroboration rule)
  onChunk = null,
} = {}) {
  const entry = ARCHON_ROSTER[archonKey];
  if (!entry) throw new TypeError(`archon-priors: "${archonKey}" is not on the confirmed public-domain roster`);
  const textList = Array.isArray(texts) ? texts : [texts];
  if (textList.length !== entry.works.length) {
    throw new TypeError(`archon-priors: "${archonKey}" has ${entry.works.length} roster work(s); ${textList.length} text(s) were supplied`);
  }

  const giver = `archon:${archonKey} (${entry.name})`;
  // nominationByPair mirrors chapter-swarm.mjs's own accumulator, generalized
  // from chapters to works: pairKey -> { left, right, chunks:Set, witnesses:Set }
  const nominationByPair = new Map();
  let totalChars = 0, totalChunks = 0, totalEncounters = 0, totalRelationEdges = 0;

  for (let w = 0; w < entry.works.length; w += 1) {
    const work = entry.works[w];
    const { text: body } = stripContainer(textList[w]);
    if (!body.trim()) throw new Error(`archon-priors: "${archonKey}" work "${work.title}" stripped to nothing — container-strip likely mismatched this edition`);
    totalChars += body.length;
    const chunks = chunkArchonText(body, chunkChars);
    for (let i = 0; i < chunks.length; i += 1) {
      const chunkId = `w${w}c${i}`;
      totalChunks += 1;
      const read = await readMaterialText(chunks[i], {
        source: `archon:${archonKey}#${chunkId}`,
        giver: `${giver}, "${work.title}", tr. ${work.translator}`,
        posPrior,
        ...(canonicalizationFloor != null ? { canonicalizationFloor } : {}),
      });
      totalEncounters += read.encounters.length;
      totalRelationEdges += read.stats.relationEdges ?? 0;
      for (const c of read.candidates) {
        const k = pairKey(c.left, c.right);
        const row = nominationByPair.get(k) ?? { left: c.left, right: c.right, chunks: new Set(), witnesses: new Set() };
        row.chunks.add(chunkId);
        for (const wit of (read.hyperlexicon.composition[k]?.witnesses ?? [])) row.witnesses.add(JSON.stringify(wit));
        nominationByPair.set(k, row);
      }
      onChunk?.(totalChunks, work.title, w + 1, entry.works.length);
    }
  }

  // Promote pairs nominated by >=minChunks distinct chunks to GIVEN, on a
  // real hyperlexicon, so stripArchonReferents' own wall (only "given" rows,
  // witnesses stripped) is the SAME function that gates every other caller
  // of this file — no second, looser promotion rule duplicated here.
  let hl = createHyperlexicon();
  const corroborated = [...nominationByPair.values()].filter((row) => row.chunks.size >= minChunks);
  for (const row of corroborated) {
    hl = giveHyperlexiconAffordance(hl, { left: row.left, right: row.right, giver, witnesses: [...row.witnesses].slice(0, 5).map((w) => JSON.parse(w)), meta: { independentSupport: row.chunks.size, chunks: [...row.chunks] } });
  }

  const composition = stripArchonReferents(hl);
  return Object.freeze({
    schema: ARCHON_PRIOR_SCHEMA,
    archon: archonKey,
    giver: `archon:${archonKey}`,
    source: Object.freeze({ name: entry.name, works: entry.works }),
    builtFrom: Object.freeze({ chars: totalChars, works: entry.works.length, chunks: totalChunks, minChunks, encounters: totalEncounters, relationEdges: totalRelationEdges, nominatedPairs: nominationByPair.size }),
    composition,
    entryCount: Object.keys(composition).length,
    at: Date.now(),
  });
}

export function archonPriorPath(archonKey, dir = DEFAULT_ARCHON_PRIOR_DIR) {
  return path.join(dir, `${archonKey}.json`);
}

export function persistArchonPrior(prior, dir = DEFAULT_ARCHON_PRIOR_DIR) {
  fs.mkdirSync(dir, { recursive: true });
  const file = archonPriorPath(prior.archon, dir);
  fs.writeFileSync(file, JSON.stringify(prior, null, 2) + "\n");
  return file;
}

export function loadArchonPrior(archonKey, dir = DEFAULT_ARCHON_PRIOR_DIR) {
  const file = archonPriorPath(archonKey, dir);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/**
 * compositionAffordanceWithArchon(hl, archonPrior, left, right, opts) — the
 * fallback lookup an archon-grounded ant's `correctedFitness` consults: the
 * ant's OWN hyperlexicon (its own DMD-derived, per-run chemistry) is tried
 * FIRST and always wins — an archon primes what an ant is disposed to
 * notice, it never overrides what the ant's own reading actually earned.
 * Only on a genuine "unknown" from the ant's own hyperlexicon does the
 * archon's stored chemistry get consulted, as a `EOHyperlexicon@1`-shaped
 * lookup built fresh from the prior's composition rows (never mutating the
 * ant's own hl).
 */
export function compositionAffordanceWithArchon(hl, archonPrior, left, right, opts = {}) {
  const own = compositionAffordance(hl, left, right, opts);
  if (own.standing === "given") return own;
  if (!archonPrior) return own;
  const archonHl = { schema: "EOHyperlexicon@1", composition: archonPrior.composition, meta: { archon: archonPrior.archon } };
  const fromArchon = compositionAffordance(archonHl, left, right, opts);
  if (fromArchon.standing === "given") {
    return Object.freeze({ ...fromArchon, meta: Object.freeze({ ...fromArchon.meta, primedByArchon: archonPrior.archon }) });
  }
  return own;
}
