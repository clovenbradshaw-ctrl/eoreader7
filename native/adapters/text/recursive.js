import { tokenize, buildFrequencyTable, functionWordSet } from "./material.js";
import { splitSentences } from "./spans.js";
import { createSurfaceEvidence, accumulateSurfaceEvidence, surfacesFromEvidence, discoverReferents, diaNorm } from "./surfaces.js";
import { discoverRelationVocab, extractRelations } from "./relations.js";
import { directDescriptorOccurrences, descriptorOccurrence } from "./individuation.js";
import { createDescriptorAnchoring } from "./anchoring.js";
import { hyperedge } from "../../kernel/hypergraph.js";

const slug = (value) => diaNorm(value).replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const WORD_RE = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

function surfaceMap(events = []) {
  const map = new Map();
  for (const event of events) {
    if (event?.type !== "DEF.admit") continue;
    map.set(diaNorm(event.surface), event.referent_id);
  }
  return map;
}

function referentObjects(events = []) {
  const byId = new Map();
  for (const event of events) {
    if (event?.type !== "DEF.admit") continue;
    if (!byId.has(event.referent_id)) byId.set(event.referent_id, { schema: "EOReferent@1", id: event.referent_id, surfaces: [], provenance: [] });
    const ref = byId.get(event.referent_id);
    if (!ref.surfaces.includes(event.surface)) ref.surfaces.push(event.surface);
    ref.provenance.push(event.provenance);
  }
  return [...byId.values()].map((value) => Object.freeze({ ...value, surfaces: Object.freeze(value.surfaces), provenance: Object.freeze(value.provenance) }));
}

// Exported for cast-prior.js — one implementation of "does this material
// attest this surface", not a second copy that can drift from the
// perceiver's own reading of the same question.
export function containsSurface(text, surface) {
  const hay = diaNorm(text);
  const needle = diaNorm(surface);
  if (!needle) return false;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(needle)}([^\\p{L}\\p{N}]|$)`, "u").test(hay);
}

// ── EVERY KNOWN SURFACE IN ONE PASS (2026-09-07) ─────────────────────────
// `currentReferents` and `referentsInSpan` asked `containsSurface` once per
// known surface per sentence — normalising the sentence again and compiling a
// fresh RegExp each time. The cast grows with the read, so that is
// O(surfaces) regexes per sentence: profiled at 240 KB of War and Peace it
// was 14% of the read and grew 6.4x for 1.79x the sentences.
//
// The index is built ONCE per refresh, when the surface map changes, and a
// sentence is scanned once: at each word start, the surfaces whose first
// token is that word are checked with `startsWith` and the same after-
// boundary `containsSurface` uses. It is EXACT to `containsSurface`'s rule
// — (^|non-alnum) needle (non-alnum|$) over diaNorm'd text — because a
// needle that begins with a letter or digit can only match at a word start.
// A needle that begins with anything else keeps the regex path, per needle.
// Order is carried as the surface map's own insertion order, so every caller
// that depended on map order (`referentsInSpan`'s grouping,
// `witnessRelatedPairs`' first-three) reproduces it by sorting hits by it.
const ALNUM_RE = /[\p{L}\p{N}]/u;
const WORD_START_RE = /[\p{L}\p{N}]+/gu;
const alnumAt = (s, i) => i < s.length && ALNUM_RE.test(String.fromCodePoint(s.codePointAt(i)));
export function surfaceIndex(surfaces) {
  const byFirst = new Map();   // first token -> [needle]
  const fallback = [];         // needles not beginning with a letter/digit: the regex path
  const order = new Map();     // needle -> position in the given order
  for (const surface of surfaces) {
    const needle = diaNorm(surface);
    if (!needle || order.has(needle)) continue;
    order.set(needle, order.size);
    const m = needle.match(/^[\p{L}\p{N}]+/u);
    if (!m) { fallback.push(needle); continue; }
    if (!byFirst.has(m[0])) byFirst.set(m[0], []);
    byFirst.get(m[0]).push(needle);
  }
  return Object.freeze({ byFirst, fallback, order });
}
/** The needles (diaNorm'd surfaces) present in `text`, in the index's own order. */
export function surfacesIn(text, index) {
  const hay = diaNorm(text);
  const present = new Set();
  WORD_START_RE.lastIndex = 0;
  let m;
  while ((m = WORD_START_RE.exec(hay))) {
    const cands = index.byFirst.get(m[0]);
    if (!cands) continue;
    for (const needle of cands) {
      if (present.has(needle)) continue;
      if (hay.startsWith(needle, m.index) && !alnumAt(hay, m.index + needle.length)) present.add(needle);
    }
  }
  for (const needle of index.fallback) if (containsSurface(hay, needle)) present.add(needle);
  return [...present].sort((a, b) => index.order.get(a) - index.order.get(b));
}
/** The per-refresh matcher: the index over the surface map, and each referent's own needles. */
function surfaceMatcher(map, referents) {
  return Object.freeze({ index: surfaceIndex(map.keys()), map, referents: referents.map((ref) => ({ ref, needles: new Set(ref.surfaces.map(diaNorm).filter(Boolean)) })) });
}

function currentReferents(text, matcher) {
  if (!matcher) return [];
  const present = new Set(surfacesIn(text, matcher.index));
  // The referent's own surfaces may not all be keys of the map (the map is
  // surface -> id after coreference); those are asked one by one, as before.
  return matcher.referents.filter(({ ref, needles }) => [...needles].some((n) => present.has(n) || (!matcher.index.order.has(n) && containsSurface(text, n)))).map(({ ref }) => ref);
}

function referentsInSpan(span, matcher) {
  const matches = new Map();
  for (const surface of surfacesIn(span, matcher.index)) {
    const ref = matcher.map.get(surface);
    if (!matches.has(ref)) matches.set(ref, []);
    matches.get(ref).push(surface);
  }
  return matches;
}

function resolveParticipant(surface, matcher, sequencePosition, relationIndex, role) {
  const exact = matcher.map.get(diaNorm(surface));
  if (exact) return { ref: exact, role, standing: "referent", surface, resolution: "exact_surface" };
  const candidates = referentsInSpan(surface, matcher);
  if (candidates.size === 1) {
    const [[ref, matchedSurfaces]] = candidates;
    return { ref, role, standing: "referent", surface, resolution: "unique_surface_in_span", matchedSurfaces };
  }
  const lexical = slug(surface) || "unknown";
  const occurrence = `occ:${sequencePosition}:${relationIndex}:${role}`;
  return {
    ref: occurrence,
    occurrence,
    surfaceKey: `surface:${lexical}`,
    role,
    standing: "unresolved_surface",
    surface,
    candidateReferents: [...candidates.keys()],
  };
}

function earnedClosedClass(table) {
  if (!table?.total || table.freq.size === 0) return new Set();
  const candidate = functionWordSet(table);
  return candidate.size * 2 < table.freq.size ? candidate : new Set();
}

// A relation form's composition standing, from the received POS prior.
// Absent prior, or absent form: eligible (nothing has been shown against it).
function relationStanding(verb, posPrior) {
  const counts = posPrior?.forms?.[diaNorm(String(verb ?? ""))];
  if (!counts) return Object.freeze({ eligible: true, basis: "no received evidence about this form; absence is not a refusal" });
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  if (!total) return Object.freeze({ eligible: true, basis: "no received evidence about this form; absence is not a refusal" });
  let dominant = null, best = -1;
  for (const [tag, n] of Object.entries(counts)) if (n > best) { best = n; dominant = tag; }
  const eligible = dominant === "VERB";
  return Object.freeze({
    eligible,
    dominantClass: dominant,
    share: best / total,
    basis: eligible
      ? "treebank-dominant VERB — eligible as portable relation memory"
      : `treebank-dominant ${dominant} — an auxiliary or non-verb form does not become familiarity by recurring`,
    giver: "UD_English-EWT via bin/priors/pos/en-ud-ewt.json",
  });
}

function lexicalNounOccurrences(text, sequencePosition, encounterRef, posPrior) {
  if (!posPrior?.forms) return [];
  const out = [];
  let ordinal = 0;
  for (const match of text.matchAll(WORD_RE)) {
    const raw = match[0];
    const form = diaNorm(raw);
    const counts = posPrior.forms[form];
    if (!counts) continue;
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const nounShare = total ? (counts.NOUN ?? 0) / total : 0;
    if (nounShare <= 0.5) continue;
    const surfaceKey = `surface:${slug(raw) || "unknown"}`;
    out.push(Object.freeze({
      schema: "EOLexicalOccurrence@1",
      id: `lex:${sequencePosition}:${ordinal}`,
      surfaceKey,
      surface: raw,
      upos: "NOUN",
      standing: "occurrence",
      encounterRef,
      offset: match.index,
      witness: `text:${sequencePosition}:${match.index}`,
    }));
    ordinal += 1;
  }
  return out;
}

function taskTargetSurfaceKeys(orientation = {}) {
  const out = new Set();
  for (const task of orientation.activeTasks ?? []) {
    for (const target of task.targets ?? []) {
      if (typeof target === "string" && target.startsWith("surface:")) out.add(target);
    }
  }
  return out;
}

/**
 * A Fold task may make a previously unremarkable surface worth checking for.
 * This emits only occurrence evidence. It does NOT promote the surface to a
 * referent or assert that two occurrences corefer.
 */
function taskTargetOccurrences(text, sequencePosition, encounterRef, orientation, alreadySeen = new Set()) {
  const out = [];
  let ordinal = 0;
  for (const surfaceKey of taskTargetSurfaceKeys(orientation)) {
    if (alreadySeen.has(surfaceKey)) continue;
    const surface = surfaceKey.slice("surface:".length).replace(/_/g, " ");
    if (!surface || !containsSurface(text, surface)) continue;
    out.push(Object.freeze({
      schema: "EOTaskTargetOccurrence@1",
      id: `task-target:${sequencePosition}:${ordinal}`,
      surfaceKey,
      surface,
      standing: "task_nominated_occurrence",
      encounterRef,
      witness: `text:${sequencePosition}:task-target:${ordinal}`,
      provenance: Object.freeze({ giver: "active-reading-task", basis: "targeted recurrence check" }),
    }));
    ordinal += 1;
  }
  return out;
}

function mergeRelationEvidence(store, candidates = []) {
  for (const candidate of candidates) {
    if (!candidate?.verb) continue;
    if (!store.has(candidate.verb)) store.set(candidate.verb, { surfaceForms: new Set(), relatedPairs: new Set(), upos: candidate.upos ?? null, verbDominant: candidate.verbDominant !== false });
    const record = store.get(candidate.verb);
    for (const surface of candidate.surfaceForms ?? []) record.surfaceForms.add(surface);
    if (candidate.upos) record.upos = candidate.upos;
    if (candidate.verbDominant === false) record.verbDominant = false;
  }
}

// FOLD-CONDITIONED ADMISSION — "the high determines the probability of the
// low", done as conditioning rather than as a lookup list.
//
// The engine's own gate counts ONE kind of evidence: distinct capitalized
// surfaces the verb was seen beside. That is anchor evidence, and it starves
// on first-person material where the cast is rarely named in the same clause
// as its own predicates (measured on Dracula's opening 700 sentences: 74
// candidates nominated, 2 admitted).
//
// A verb witnessed BETWEEN TWO BEINGS THIS READING HAS ALREADY ESTABLISHED is
// also relation evidence, and it comes from the material, not from a table —
// the Entity terrain, already earned, conditioning what counts as evidence at
// the Link terrain below it. Counted at the SAME declared strength as anchor
// evidence (minSurfaces), so no new number is introduced and neither path is
// privileged. Measured on the same slice: 2 -> 21 verbs, every one warranted
// by Dracula's own text.
//
// NOT a loosened gate and NOT a received lexicon standing in for reading
// (READING-POLICY P2: "statistics derived from the material, not lookup
// lists"; P3: "never patch a missing prior by loosening an engine gate").
// The grammar prior's role here is unchanged and one-directional: it may
// REFUSE a candidate (verbDominant === false) and may never admit one.
function admittedRelationVerbs(store, minSurfaces) {
  const verbs = new Set();
  for (const [verb, record] of store) {
    if (record.verbDominant === false) continue; // grammar refuses; it never admits
    const anchorEvidence = record.surfaceForms.size;
    const relationEvidence = record.relatedPairs?.size ?? 0;
    if (anchorEvidence >= minSurfaces || relationEvidence >= minSurfaces) verbs.add(verb);
  }
  return verbs;
}

/**
 * Witness, over the new batch only, which candidate verbs occur in a sentence
 * that names at least two already-established referents — recording the PAIR,
 * so "witnessed relating these two beings" is counted once however often that
 * one sentence repeats, exactly as distinct surfaces are counted once each.
 */
function witnessRelatedPairs(store, sentences, refs, matcher = null) {
  if (!refs?.size || !store.size) return;
  const index = matcher?.index ?? surfaceIndex(refs.keys());
  // The verbs were diaNorm'd once per verb per sentence; once per verb.
  const verbs = [...store].map(([verb, record]) => [diaNorm(verb), record]);
  for (const sentence of sentences) {
    const hay = diaNorm(sentence.text);
    // The first three hits in map order — the original stopped after the third.
    const present = surfacesIn(sentence.text, index).slice(0, 3).map((surface) => refs.get(surface));
    const distinct = [...new Set(present)];
    if (distinct.length < 2) continue;
    const pairKey = distinct.slice(0, 2).sort().join("\u0000");
    for (const [verb, record] of verbs) {
      if (!record.relatedPairs) record.relatedPairs = new Set();
      if (hay.includes(verb)) record.relatedPairs.add(pairKey);
    }
  }
}

export function createCausalTextPerceiver({ minRelationSurfaces = 2, refreshEvery = 25, posPrior = null, descriptorAnchoring = null, addresses = "birth" } = {}) {
  // `addresses` (2026-09-07): "birth" — the default, decided by measurement
  // (the-fold POLICIES.md P168) — hands the previous refresh's addresses to
  // discoverReferents so a being keeps the id it was born with (surfaces.js,
  // `prior`); "founder" mints a cluster's id from whichever member founds it
  // at each refresh, the reading as it was until P168, kept so the
  // oscillation it produces stays reproducible (tests/referent-merge.test.js).
  if (addresses !== "founder" && addresses !== "birth") throw new TypeError('addresses is "founder" or "birth"');
  if (!Number.isInteger(refreshEvery) || refreshEvery < 1) throw new TypeError("refreshEvery must be a positive integer");
  if (posPrior && (posPrior.schema !== "POSPrior@1" || !posPrior.provenance?.source)) throw new TypeError("posPrior must be a giver-named POSPrior@1");
  // OPT-IN: descriptor anchoring (one-hop activation recall binding
  // definite/possessive descriptors to the admitted cast — anchoring.js).
  // Off by default so every existing caller is byte-identical; when
  // supplied, its floors are DECLARED by the caller (anchoring.js throws
  // otherwise — pronouns.js's own contract, applied unchanged).
  const anchoring = descriptorAnchoring ? createDescriptorAnchoring(descriptorAnchoring) : null;
  const priorSentences = [];
  let priorText = "";
  let relationRefreshFrom = 0;
  const relationEvidence = new Map();
  let cache = { closed: new Set(), refs: new Map(), referents: [], matcher: surfaceMatcher(new Map(), []), gaps: [], merges: [], reassignments: [], verbs: new Set() };
  // discoverReferents re-clusters everything on every refresh, so the same
  // merge is rediscovered each time. It lands ONCE, in the observation of the
  // sentence whose refresh first proved it.
  const emittedMerges = new Set();
  // THE FOLD IS THE ACTIVATION — nothing is re-read. Each sentence's
  // surface evidence and word counts are folded in ONCE (arithmetic tier:
  // monotone accumulation, S10); refresh() only PROJECTS from the
  // accumulated evidence. The old shape re-tokenized and re-scanned the
  // whole prefix every 25 encounters — O(n²), measured: 75s on
  // Frankenstein, ~80min on Les Misérables, which is re-reading wearing a
  // refresh's name (S4). The split is exact: the per-sentence evidence
  // depends on nothing but the sentence; functionWords bite only in the
  // projection — proven by a byte-identical full-Frankenstein diff before
  // this landed.
  const surfaceEvidence = createSurfaceEvidence();
  const runningFreq = new Map();
  let runningTotal = 0;
  let foldedTo = 0;

  const refresh = () => {
    for (const sent of priorSentences.slice(foldedTo)) {
      accumulateSurfaceEvidence([sent], surfaceEvidence);
      for (const w of tokenize(sent.text)) { runningFreq.set(w, (runningFreq.get(w) || 0) + 1); runningTotal += 1; }
    }
    foldedTo = priorSentences.length;
    const table = { freq: runningFreq, total: runningTotal };
    const closed = earnedClosedClass(table);
    const surfaces = surfacesFromEvidence(surfaceEvidence, { functionWords: closed });
    const discovered = discoverReferents(surfaces, addresses === "birth" ? { prior: { refs: cache.refs, born: cache.born ?? new Map(), next: cache.bornNext ?? 0 } } : {});
    // REASSIGNMENT ACROSS REFRESHES, RECORDED (P165). discoverReferents
    // re-clusters from scratch every refresh, longest surface first. So at
    // refresh k a fragment ("Vasili") that has cleared its sentence floor
    // gets its own id; at refresh k+1 the fuller name ("Prince Vasili
    // Kuragin") clears ITS floor, is processed first, the fragment now
    // corefers with it and is REASSIGNED — but ref:auto:vasili was already
    // emitted into the fold at refresh k and is never revisited. That orphan
    // is the "three ids for one being" residue the-fold's P156 found and had
    // to reconstruct by inference. The `merges` branch does not cover it:
    // measured on 120 KB of real material it fired 0 times, because its
    // condition (one surface spanning two established clusters' full token
    // sets) is nearly unreachable under longest-first assignment.
    //
    // The old map is still in hand here. A surface whose id CHANGED is a
    // reassignment, witnessed by that surface, and it is recorded where it
    // was decided instead of being inferred downstream from dormancy.
    const nextRefs = surfaceMap(discovered.events);
    const originalSurface = new Map();
    for (const e of discovered.events) if (e?.type === "DEF.admit" && !originalSurface.has(diaNorm(e.surface))) originalSurface.set(diaNorm(e.surface), e.surface);
    const reassignments = [];
    // A merge of two prior beings is already testimony (discovered.merges);
    // its bearers' id changes are not a second record.
    const foldedByMerge = new Set((discovered.merges ?? []).flatMap((m) => m.folded ?? []));
    for (const [key, from] of cache.refs ?? []) {
      const to = nextRefs.get(key);
      if (to && to !== from && !foldedByMerge.has(from)) reassignments.push({ kept: to, folded: [from], witness: originalSurface.get(key) ?? key, basis: "reassigned on refresh — the fuller name cleared its floor and this surface now corefers with it" });
    }
    const batchSentences = priorSentences.slice(relationRefreshFrom);
    const batchText = batchSentences.map((sentence) => sentence.text).join("\n");
    if (batchText && surfaces.length) {
      const relationResult = discoverRelationVocab(batchText, {
        surfaces,
        functionWords: closed,
        minSurfaces: 1,
        posPrior,
      });
      mergeRelationEvidence(relationEvidence, relationResult.candidates);
    }
    // Fold-conditioned evidence, over the SAME new batch the vocabulary scan
    // uses — never a rescan of everything read so far.
    const referents = referentObjects(discovered.events);
    const matcher = surfaceMatcher(nextRefs, referents);
    witnessRelatedPairs(relationEvidence, batchSentences, nextRefs, matcher);
    relationRefreshFrom = priorSentences.length;
    cache = {
      closed,
      refs: nextRefs,
      referents,
      matcher,
      gaps: discovered.gaps,
      // THE MERGE RECORD, KEPT (P165). discoverReferents detects when two
      // surface clusters name one being and records it — `merges.push({kept,
      // folded, witness})` — and this cache used to read `events` and `gaps`
      // and never `merges`. So the testimony was computed and thrown away,
      // and the projection's own header — "a node at cursor 500 may be two
      // nodes at cursor 200, and scrubbing the cursor SHOWS that" — was left
      // to whoever compared two node lists. the-fold's cursor.js had to
      // RECONSTRUCT merges from dormancy plus surface capture and mark every
      // one `inferred`, because the record it needed was unavailable.
      merges: discovered.merges ?? [],
      reassignments,
      born: discovered.addresses?.born ?? cache.born,
      bornNext: discovered.addresses?.next ?? cache.bornNext,
      verbs: admittedRelationVerbs(relationEvidence, minRelationSurfaces),
    };
  };

  return Object.freeze({
    id: "text/recursive",
    async perceive(encounter, orientation = {}) {
      if (encounter?.modality !== "text" || typeof encounter.material !== "string") return [];
      const sequencePosition = encounter.sequencePosition ?? priorSentences.length;
      const encounterRef = `encounter:${sequencePosition}`;
      if (priorSentences.length === 0 || priorSentences.length % refreshEvery === 0) refresh();

      const relations = extractRelations(encounter.material, { verbs: cache.verbs, functionWords: cache.closed });
      const edges = relations.map((rel, index) => hyperedge({
        id: `edge:text:${sequencePosition}:${index}`,
        relation: rel.verb,
        participants: [
          resolveParticipant(rel.subject, cache.matcher, sequencePosition, index, "subject"),
          resolveParticipant(rel.object, cache.matcher, sequencePosition, index, "object"),
        ],
        witness: `text:${sequencePosition}:${rel.offset}`,
        scope: { sequencePosition, offset: rel.offset },
        eo: { op: "CON", grain: "Figure" },
        // compositionStanding: whether this relation FORM is eligible to be
        // carried as portable experience or composed with another relation.
        // experience-priors.js reads exactly this field ("auxiliaries/noise
        // do not become familiarity merely because they appeared often") but
        // nothing on this side ever set it, so a reader's carried memory
        // filled with `were`/`would`/`has`/`could` — measured, not
        // hypothesized (the first experienced-new-book run's own carried
        // memory was 4 auxiliaries and nothing else). Decided by the SAME
        // received POS prior the descriptor-head gate already uses: a form
        // the treebank says is dominantly AUX (or any non-VERB class) is
        // ineligible; a form ABSENT from the prior stays eligible, the same
        // absent-is-a-gap-not-a-mismatch polarity that gate already holds.
        meta: { polarity: rel.polarity, source: encounter.source, encounterRef, compositionStanding: relationStanding(rel.verb, posPrior) },
      }));

      const seenReferents = currentReferents(encounter.material, cache.matcher);
      // A merge is TESTIMONY, not an inference: it arrives with the surface
      // that proved it. The folded referents are never deleted — the fold is
      // upsert-only and cursor scrubbing depends on replaying the past — they
      // are MARKED, by this entry, as folded into the kept one.
      const mergeEntries = [];
      const witnessedMerges = (cache.merges ?? []).map((m) => ({ ...m, basis: m.basis ?? "name-variant coreference — a witnessed merge, recorded where it was decided" }));
      for (const m of [...witnessedMerges, ...(cache.reassignments ?? [])]) {
        const key = `${m.kept}|${[...(m.folded ?? [])].sort().join("+")}`;
        if (emittedMerges.has(key) || !m.kept || !(m.folded ?? []).length) continue;
        emittedMerges.add(key);
        mergeEntries.push(Object.freeze({
          schema: "EOReferentMerge@1",
          id: `merge:${sequencePosition}:${slug(m.kept)}:${(m.folded ?? []).map(slug).join("+")}`,
          kept: m.kept,
          folded: Object.freeze([...(m.folded ?? [])]),
          witness: m.witness ?? null,
          encounterRef: `encounter:${sequencePosition}`,
          provenance: { giver: "surfaces/discoverReferents", tier: "engine", basis: m.basis },
        }));
      }
      const mentions = seenReferents.map((ref) => Object.freeze({
        schema: "EOMention@1",
        id: `mention:${sequencePosition}:${slug(ref.id)}`,
        referent: ref.id,
        encounterRef,
        anchor: encounter.anchor,
        witness: `text:${sequencePosition}`,
        source: encounter.source,
      }));
      const lexicalOccurrences = lexicalNounOccurrences(encounter.material, sequencePosition, encounterRef, posPrior);
      const lexicalKeys = new Set(lexicalOccurrences.map((occ) => occ.surfaceKey));
      const targetedOccurrences = taskTargetOccurrences(encounter.material, sequencePosition, encounterRef, orientation, lexicalKeys);
      const activeIds = new Set(seenReferents.map((ref) => ref.id));
      for (const edge of edges) for (const participant of edge.participants ?? []) if (participant.standing === "referent") activeIds.add(participant.ref);
      const gaps = cache.gaps
        .filter((gap) => activeIds.has(gap.referent))
        .map((gap) => ({ schema: "EOReferentGap@1", id: `gap:referent:${slug(gap.referent)}`, ...gap }));

      const currentSentence = { text: encounter.material, offset: encounter.anchor?.start ?? 0, order: priorSentences.length };

      // Descriptor anchoring runs on EVERY sentence when enabled — the
      // activation frames must accumulate causally whether or not this
      // sentence carries a descriptor — and its evidence rides the
      // candidate's graphEntries so it passes through witness like every
      // other observation (nomination is not admission).
      let anchorEvidence = [];
      let descriptorOccsEmitted = [];
      if (anchoring) {
        // Only descriptors whose HEAD token survives two cuts are offered
        // for anchoring. Measured on Frankenstein's opening letters:
        // without them, "the most" / "that the" / "the first" —
        // determiner-plus-function/adjective bigrams, not descriptions of
        // any being — bound confidently to the only cast member in reach
        // and flooded the alternatives with furniture. Cut 1: the
        // perceiver's OWN frequency-derived closed class (cache.closed) —
        // never a hand list. Cut 2: when a POSPrior@1 is supplied (the
        // same received prior lexicalNounOccurrences already reads), a
        // head the treebank POSITIVELY says is not a noun ("most": ADV/ADJ
        // only; "first": ADJ-dominant) is refused; a head ABSENT from the
        // prior is kept — an unknown word cannot be proven furniture, and
        // furniture is by nature high-frequency and therefore present
        // (the same absent-is-a-gap-not-a-mismatch polarity
        // grammar-lens.js records for the identical prior).
        // Edge participants first: an anchored descriptor is only worth
        // something to composition if it resolves an endpoint an EDGE
        // actually has. These carry their participant's own occurrence id
        // so the binding lands in the id space the ledger reads.
        const participantOccs = edges.flatMap((edge) => (edge.participants ?? [])
          .filter((p) => p.standing === "unresolved_surface")
          .map((p) => {
            const occ = descriptorOccurrence(p, { encounterRef, edge });
            return occ ? { ...occ, participantOccurrence: p.occurrence ?? p.ref } : null;
          })
          .filter(Boolean));
        const descriptorOccs = [...participantOccs, ...directDescriptorOccurrences(encounter.material, { encounterRef })].filter((occ) => {
          const head = (occ.canonicalSurface ?? "").split(/\s+/).at(-1);
          if (!head || cache.closed.has(head)) return false;
          const counts = posPrior?.forms?.[diaNorm(head)];
          if (!counts) return true;
          const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
          const nounShare = total ? ((counts.NOUN ?? 0) + (counts.PROPN ?? 0)) / total : 0;
          return nounShare > 0.5;
        });
        anchorEvidence = anchoring.observe(currentSentence, descriptorOccs, cache.referents).evidence;
        // The occurrences themselves are perceptions too — emitted so a
        // downstream organ (descriptorBeings) can count recurrence of the
        // ones anchoring could NOT bind, instead of re-deriving the stream.
        descriptorOccsEmitted = descriptorOccs;
      }

      priorSentences.push(currentSentence);
      priorText += `${priorText ? "\n" : ""}${encounter.material}`;

      if (edges.length === 0 && seenReferents.length === 0 && lexicalOccurrences.length === 0 && targetedOccurrences.length === 0 && anchorEvidence.length === 0 && descriptorOccsEmitted.length === 0) return [];
      return [{
        candidate: {
          distinctions: [
            ...seenReferents.map((ref) => ({ referent: ref.id, surfaces: ref.surfaces })),
            ...edges.map((edge) => ({ relation: edge.relation, participants: edge.participants })),
            ...lexicalOccurrences.map((occ) => ({ occurrence: occ.id, surfaceKey: occ.surfaceKey, upos: occ.upos })),
            ...targetedOccurrences.map((occ) => ({ occurrence: occ.id, surfaceKey: occ.surfaceKey, taskNominated: true })),
          ],
          hyperedges: edges,
          graphEntries: [...seenReferents, ...mergeEntries, ...mentions, ...lexicalOccurrences, ...targetedOccurrences, ...gaps, ...anchorEvidence, ...descriptorOccsEmitted],
        },
        anchor: encounter.anchor,
        evidence: encounter.material,
        nominationCause: targetedOccurrences.length ? ["bottom_up_difference", "active_task"] : "bottom_up_difference",
      }];
    },
  });
}

export function textEncounters(text, { source = "text", offset = 0 } = {}) {
  return splitSentences(text).map((sentence) => ({
    schema: "Encounter@1",
    source,
    modality: "text",
    anchor: { start: offset + sentence.offset, end: offset + sentence.offset + sentence.text.length },
    extent: sentence.text.length,
    material: sentence.text,
    sequencePosition: sentence.order,
  }));
}
