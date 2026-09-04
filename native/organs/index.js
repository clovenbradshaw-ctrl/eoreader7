// native/organs/index.js — THE SEAM. Every organ the-fold's surface calls
// is exported from here, and only from here, so the surface's imports never
// change as organs move down into this directory (Phase 0 of the
// organ migration, 2026-09-02: re-exported from their CURRENT the-fold
// paths; Phase 1 moves each file here and updates only this line).
//
// Names are EXPLICIT, generated off each organ's own `export` statements
// (never `export *`, whose silent exclusion of a colliding name is how a
// consumer discovers a missing export at call time). One name collides
// across organs — `REFUSALS`, each organ's own typed refusal table — and is
// exported under the organ's prefix: FRAME_REFUSALS, SIGNAL_REFUSALS, …
// Every organ is also available whole as a namespace (`frame.REFUSALS`).

export { WITNESS_OPERATING_POINT, askValue, calibrationFrames, competingFiller, contestedSearch, corroborateLedger, distinctRecipes, distinctSources, endsCopresentWindow, independentReadings, proposeCandidates, statingCandidates, textFeatures, thirdSourceCandidates, witnessNote } from "./corroboration.js";
export * as corroboration from "./corroboration.js";
export { SELECT_SCHEMA, WITNESS_SCHEMA, WITNESS_SLICE_MAX, becauseContained, becauseVerbatim, buildSelectMessages, buildWitnessMessages, foldSelect, foldTestimony, locateDecider, readTestimony, siblingSwap, witnessSlice } from "./testimony.js";
export * as testimony from "./testimony.js";
export { contextVectors, cosine, discoverCompanyKinds, foldPermitted, frameWords, kindFit, kindMembership, kindNotes } from "./kind-standing.js";
export * as kindStanding from "./kind-standing.js";
export { REFUSALS as SIGNAL_REFUSALS, REQUIRED, findSignal, phrase, scramble } from "./signal.js";
export * as signal from "./signal.js";
export { CLAIM_PREFIX, REFUSALS as NESTING_REFUSALS, attributionsOf, claimRef, corroborationOf, depthOf, disagreement, innerId, isClaimRef, leakCheck } from "./nesting.js";
export * as nesting from "./nesting.js";
export { REFUSALS as FRAME_REFUSALS, comparable, declareFrame, framed } from "./frame.js";
export * as frame from "./frame.js";
export { REFUSALS as BINDING_CORE_REFUSALS, bind } from "./binding-core.js";
export * as bindingCore from "./binding-core.js";
export { REFUSALS as FOLD_GATE_REFUSALS, reviewMerges } from "./fold-gate.js";
export * as foldGate from "./fold-gate.js";
export { DOCUMENT_KINDS, DOCUMENT_KINDS_META, readHeading, speakerAt, speakerSections } from "./speaker.js";
export * as speaker from "./speaker.js";
export { REFUSALS as OBLIGATION_REFUSALS, STANDINGS, admitObligations, coverage, mark, standings } from "./obligation.js";
export * as obligation from "./obligation.js";
export { REFUSALS as EVENT_ARRANGEMENTS_REFUSALS, arrangementNotes, arrangementsFrom } from "./event-arrangements.js";
export * as eventArrangements from "./event-arrangements.js";
export { SELF_WITNESS, isSelfWitness, landAct, landSelfAssertion, makeCapacityRunner, mergeTestimony, negationCandidates, perSourceReadings, readsNothing, speakerWho } from "./capacity-runner.js";
export * as capacityRunner from "./capacity-runner.js";
export { CAPACITIES, findCapacity, listCapacities, unresolvedCapacity } from "./capacities.js";
export * as capacities from "./capacities.js";
// Phase 3 organs. hypergraph's whole closure (cast, grounding, cite, source,
// asserted, web, measure, testimony, primary, capacity-runner, experiencer,
// quotes) crossed on 2026-09-02 — the closure was moved TOGETHER, so no moved
// organ imports the surface; the-fold keeps one-line shims at the old paths.
// The assertion ledger itself is now kernel/notes.js (medium-blind); this
// hyperlexicon.js is its text face.
export { assertionId, recipeId, REFUSALS as HYPERLEXICON_REFUSALS, VERB_CLASS, makeHyperlexicon } from "./hyperlexicon.js";
export { standingOf as noteStanding, sourceOfWitness, recipeOfWitness, kindOfWitness } from "../kernel/notes.js";
export { RANKE, PRIMARY_KIND, QUOTE_MIN_WORDS, claimOfNote, primaryWitness, standsOnAccountsOnly, leadsOf, footnoteLeads, footnoteLeadsForNote, markersIn, markersOfSpan, documentMatches, archiveAddressFor, chase, chaseLedger } from "./ranke.js";
export * as ranke from "./ranke.js";
export * as hyperlexicon from "./hyperlexicon.js";
export { makeGrammarLens, mismatchedConnectors } from "./grammar-lens.js";
export * as grammarLens from "./grammar-lens.js";
export { stageFromEdges } from "./hl.js";
export * as hl from "./hl.js";
export { EVIDENCE_FLOOR, scanFunctionalCandidates, acquireCandidates, recheckCandidates, promoteAndDeclare } from "./hl-acquire.js";
export * as hlAcquire from "./hl-acquire.js";
// hl.js also RE-EXPORTS the engine's own HL API (verdicts, stage builders) — names the seam generator's export scan missed, added when void-hl broke on BEYOND_REACH.
export { BOUND, CONTRADICTED, CONTESTED, UNBOUND, BEYOND_REACH, UNREFUTED, UNDETERMINED, flip, createStage, addAnchor, addEdge, declareFunctional, declareTransitive, declareComplete, extendStage, atomic, read, attach } from "./hl.js";
export { witnessSentences, endsFor, settledBy, rowFor, WITNESS_VERDICTS } from "./witness-sentences.js";
export * as witnessSentencesOrgan from "./witness-sentences.js";
// floor 6 — a corroborated note as a premise (derivation.js)
export { DERIVED_PREFIX, REFUSALS as DERIVATION_REFUSALS, isDerivedId, premisesOf, chemistryFor, substrateEdges, naiveJoin, redeal, makeDerivation } from "./derivation.js";
export * as derivation from "./derivation.js";

// Phase 3 (2026-09-02) — the reading closure crosses: the-fold keeps only the surface.
// Generated off each organ's own `export` statements; a name already exported by
// another organ is aliased under this organ's prefix, never silently dropped.
export { FORM_MIN_ARRIVALS, GRAMMAR_MIN_SHARE, MIN_SURFACES_PER_VERB, NEAREST_EDGES_MAX, arrangementOf, makeCaseMarkedRelationReader, makeRelationReader, queryEdges, queryFillers, relationFindings, relationsClean } from "./hypergraph.js";
export * as hypergraphOrgan from "./hypergraph.js";
export { makeCastHandles, makeCastResolver, makeReferentIndex } from "./cast.js";
export * as castOrgan from "./cast.js";
export { ABBREV, CLAIM_STOPWORDS, NUMBER_RE, abbreviationExpansion, blankStructure, buildLocalIndex, buildUnionIndex, checkGrounding, corroborateAtoms, extractAtoms, extractCheckableAtoms, hasNumber, hasWord, numberSet, splitSentences, tokenSupported, unsupportedClaims, wordSet } from "./grounding.js";
export * as groundingOrgan from "./grounding.js";
export { CORPUS_MINIMUM, MIN_RUN, NULL_SAMPLES, attribute, attributedRefs, commonTerms, coverage as CITE_coverage, namesIn, overlap, splitSentences as CITE_splitSentences, stripSelfCitations } from "./cite.js";
export * as citeOrgan from "./cite.js";
export { atmosphereBoundaries, blankLabelRows, buildSourceBlock, checkCitations, chunkSource, declaredIdentity, delimitedTable, foldDiacritics, foldTypography, identifyMaterial, openQuestions, readRange, retrieve, splitDelimited, stripContainer, stripItalicsMarkup, tokenize } from "./source.js";
export * as sourceOrgan from "./source.js";
export { WITNESS_FLOOR, assertionPhrase, orderArm, seedFrom, seededShuffle, shuffleSentenceWords, standingOf } from "./asserted.js";
export * as assertedOrgan from "./asserted.js";
export { ATTRS, WEB_ARCHIVE_TIMEOUT_MS, WEB_FETCH_MAX_BYTES, WEB_FETCH_TIMEOUT_MS, WEB_SEARCH_MAX_RESULTS, WEB_UA, archiveUrlFrom, decodeEntities, extForContentType, extractFeed, extractReadable, extractUrls, feedText, foldWebHistory, hostOf, looksLikeChallenge, normalizeUrl, pageFaceUrl, parseSearchResults, unwrapDdgHref } from "./web.js";
export * as webOrgan from "./web.js";
export { PAIRS_KEYS, SERIES_KEYS, admit, arrivalsFrom, licensedPairs, measureAcross, measurePairs, measureSeries, parseMeasure, phrase as MEASURE_phrase, probeMaterial, runMeasurement, seriesFrom, seriesFromMedia, sniffContainer, toTable, usage, wavSamples } from "./measure.js";
export * as measureOrgan from "./measure.js";
export { PRIMARY_CLASSES, PRIMARY_SNIPS_KEPT, PRIMARY_SOURCES_CONSULTED, classifyCitation, extractCitations, foldPrimary, isWikiFamilyHost, isWikipediaHost, rankPrimary, snipClaim, unwrapArchiveUrl } from "./primary.js";
export * as primaryOrgan from "./primary.js";
export { requireExperiencer, withExperiencer } from "./experiencer.js";
export * as experiencerOrgan from "./experiencer.js";
export { MIN_QUOTE_WORDS, applyQuotes, extractQuotedSpans, normalizedIndex, quoteFindings, quoteOpens, verifyQuotes } from "./quotes.js";
export * as quotesOrgan from "./quotes.js";
