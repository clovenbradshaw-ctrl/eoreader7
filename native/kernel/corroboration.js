// native/kernel/corroboration.js — OCCURRENCE-CORROBORATION, DOMAIN-BLIND
// (2026-09-22, extracted from kernel/kind-universe.js).
//
// THE PROBLEM THIS FIXES: this SIG→CON→DEF→REC bookkeeping — a concept is
// signed provisional on its first occurrence, confirmed once distinct
// sources corroborate it past a floor, refuted by a falsified occurrence,
// revised by a superseding one — was reached for independently three times:
// organs/mnemonic.js (vision recognition), the-fold/expertise.js (reading
// competency), the-fold/kind-memory.js (learned paradigms). Each import
// went sideways into kind-universe.js, a module named and framed entirely
// around visual recognition ("every recognized region is a referent
// occurrence"), even though none of these four functions ever touched a
// descriptor, a distance, or a pixel. That is Simon's watchmaker problem:
// a part reused by three independent assemblies belongs at the level below
// all three, not inside whichever assembly happened to need it first.
//
// WHAT STAYS BEHIND: kind-universe.js's SEG (splitProposals), the
// within-kind bound, and the void — all of them measure DISTANCE between
// descriptors (shadow-echo.js), which is real vision-specific geometry with
// no general form yet. Pulling those down would be inventing a
// generalization nothing has asked for. Only the four acts that operate on
// bare OCCURRENCE ROWS — {id, source, at, falsified} — move here.
//
// AN "ENTRY" is any object shaped { status, revision, occurrences: [...] }.
// Callers own their own store's key structure (concepts, kinds, whatever
// name fits their domain) and pass the one entry these functions act on.
import { stableHash } from "./rng.js";

// the corroboration floor is the house's own canonicalizationFloor (ENTITY
// assembly): one arrival has no co-arrival to test.
export const CANONICALIZATION_FLOOR = 2;

// the hash salt stays "mnemonic|", unchanged from before this extraction —
// it is an internal namespace, not a public name, and any store already on
// disk has occurrence ids baked in against it. Changing it here would be a
// silent behavior change dressed as a rename.
export const occurrenceKey = (concept, source, region) =>
  stableHash(`mnemonic|${concept}|${String(source ?? "")}|${JSON.stringify(region ?? null)}`);

// ── SIG: sign a novel thing as a provisional kind ─────────────────────────
// A thing nothing recognizes is HIGH POSSIBILITY: it might be a new kind.
// It is signed provisionally, and becomes a real kind only when occurrences
// from distinct sources corroborate it (CON, below).
export function signProvisionalKind(store, { name, source, region, at = Date.now() }) {
  const entry = store.concepts[name] ?? {
    revision: 0,
    modality: "image",
    status: "provisional",
    signedAt: at,
    occurrences: [],
    items: [],
  };
  if (entry.status === "refuted") throw new TypeError(`signProvisionalKind: "${name}" is refuted — a refuted kind is not re-signed silently`);
  entry.revision += 1;
  const id = occurrenceKey(name, source, region);
  if (!entry.occurrences.some((o) => o.id === id)) {
    entry.occurrences.push({
      id,
      source: source ?? null,
      region: region ?? null,
      at,
      falsified: false,
      basis: "SIG:novel_occurrence",
    });
  }
  store.concepts[name] = entry;
  return { signed: name, status: entry.status };
}

// ── CON: corroboration — occurrences from DISTINCT sources ───────────────
// A kind's probability is its corroboration: distinct sources that have
// produced occurrences of it. One source repeating the same thing is one
// witness, not many. This is HISTORY (how often the kind has been seen),
// never a confidence SCORE — certainty is bounded geometry (the margin
// against the within-kind bound, which stays in kind-universe.js), and
// corroboration is the record that the geometry has been tested.
//
// The default accessors read the shape SIG/CON/DEF/REC above actually
// write: store.concepts[concept] = { occurrences: [{source, falsified}] }.
// A caller whose store is shaped differently (the-fold/kind-memory.js's
// store.kinds[name].learnings, keyed by `.superseded` rather than
// `.falsified`) injects its own { entryOf, occurrencesOf, aliveOf,
// sourceOf } rather than reimplementing this counting test a second time
// under a different name — the exact drift this repo's own history keeps
// naming (task-log.js's OPERATOR_ORDER, P22's duplicated runtime-type
// ternary) already happened once here, confirmed live: kind-memory.js's
// own `kindSources` re-derived this identical Set-of-distinct-sources
// test, field for field, under a name that gave no hint it was the same
// act. Every accessor is optional and defaults to today's exact behavior,
// so every 2-argument call below is byte-identical to before.
const DEFAULT_ENTRY_OF = (store, concept) => store.concepts?.[concept];
const DEFAULT_OCCURRENCES_OF = (entry) => entry.occurrences ?? [];
const DEFAULT_ALIVE_OF = (o) => !o.falsified;
const DEFAULT_SOURCE_OF = (o) => o.source ?? o.id;

/** The distinct, still-alive sources behind a concept — the array
 *  `corroboration()` below only ever reports the size of. Exported so a
 *  caller that needs the actual sources (not merely their count) reads
 *  this instead of re-deriving the Set. */
export function aliveSources(store, concept, { entryOf = DEFAULT_ENTRY_OF, occurrencesOf = DEFAULT_OCCURRENCES_OF, aliveOf = DEFAULT_ALIVE_OF, sourceOf = DEFAULT_SOURCE_OF } = {}) {
  const entry = entryOf(store, concept);
  if (!entry) return [];
  return [...new Set(occurrencesOf(entry).filter(aliveOf).map(sourceOf))];
}

export function corroboration(store, concept, opts) {
  return aliveSources(store, concept, opts).length;
}

export function confirmKind(store, concept, opts = {}) {
  const entry = (opts.entryOf ?? DEFAULT_ENTRY_OF)(store, concept);
  if (!entry) return null;
  const c = corroboration(store, concept, opts);
  if (c >= CANONICALIZATION_FLOOR && entry.status === "provisional") {
    entry.status = "confirmed";
    entry.confirmedAt = Date.now();
    return { confirmed: concept, corroboration: c };
  }
  return { confirmed: null, corroboration: c };
}

// ── DEF: falsification — the memory admits it was wrong ───────────────────
// The parent re-read the source and contradicted the lesson; the occurrence
// is marked refuted AND the lesson item it taught is marked refuted (they
// are the same lesson — one falsification, one memory line), and the
// concept's revision bumps, so every framework built from it is rebuilt
// without it. The refuted lines stay on file — a revision line, never an
// edit (the fold's own discipline).
export function falsifyOccurrence(store, concept, occurrenceId, { by = null, reason = null } = {}) {
  const entry = store.concepts?.[concept];
  if (!entry) return { falsified: 0 };
  let hit = 0;
  for (const o of entry.occurrences) {
    if (o.id !== occurrenceId || o.falsified) continue;
    o.falsified = true;
    o.falsifiedAt = Date.now();
    o.falsifiedBy = by;
    o.falsifyReason = reason;
    // the lesson that taught this occurrence is refuted with it
    for (const item of entry.items) {
      if (!item.refuted && String(item.source ?? "") === String(o.source ?? "") && JSON.stringify(item.region ?? null) === JSON.stringify(o.region ?? null)) {
        item.refuted = true;
        item.refutedBy = by;
        item.refuteReason = reason;
      }
    }
    hit += 1;
  }
  if (hit) entry.revision += 1;
  return { falsified: hit, revision: entry.revision };
}

// REC: a lesson is superseded — mark the old occurrence superseded and add
// the corrected lesson. The corrected lesson is the current memory; the
// superseded one stays on file as its revision history.
export function supersedeLesson(store, concept, occurrenceId, correctedLesson) {
  const entry = store.concepts?.[concept];
  if (!entry) return null;
  for (const o of entry.occurrences) {
    if (o.id === occurrenceId && !o.falsified && !o.superseded) {
      o.superseded = true;
      o.supersededAt = Date.now();
    }
  }
  entry.revision += 1;
  entry.items.push({ ...correctedLesson, refuted: false });
  return { revised: concept, revision: entry.revision };
}
