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

export { WITNESS_OPERATING_POINT, askValue, calibrationFrames, competingFiller, contestedSearch, corroborateLedger, distinctRecipes, distinctSources, endsCopresentWindow, facesReachable, independentReadings, proposeCandidates, statingCandidates, textFeatures, thirdSourceCandidates, witnessNote } from "./corroboration.js";
export * as corroboration from "./corroboration.js";
export { SELECT_SCHEMA, WITNESS_SCHEMA, WITNESS_SLICE_MAX, becauseContained, becauseVerbatim, buildSelectMessages, buildWitnessMessages, foldSelect, foldTestimony, locateDecider, readTestimony, siblingSwap, witnessSlice } from "./testimony.js";
export * as testimony from "./testimony.js";
export { contextVectors, cosine, discoverCompanyKinds, foldPermitted, frameWords, kindFit, kindMembership, kindNotes } from "./kind-standing.js";
export * as kindStanding from "./kind-standing.js";
export { REFUSALS as SIGNAL_REFUSALS, REQUIRED, findSignal, mechanismOf, phrase, scramble } from "./signal.js";
export * as signal from "./signal.js";
export { CLAIM_PREFIX, REFUSALS as NESTING_REFUSALS, attributionsOf, claimRef, corroborationOf, depthOf, disagreement, innerId, isClaimRef, leakCheck } from "./nesting.js";
export * as nesting from "./nesting.js";
export { REFUSALS as FRAME_REFUSALS, comparable, declareFrame, framed } from "./frame.js";
export * as frame from "./frame.js";
export { REFUSALS as BINDING_CORE_REFUSALS, bind } from "./binding-core.js";
export * as bindingCore from "./binding-core.js";
export { heardSurfaces, isPositionallySigned, POSITIONAL_SIGNATURE, NAMING_CLASSES } from "./heard-surfaces.js";
export * as heardSurfacesOrgan from "./heard-surfaces.js";
export { REFUSALS as FOLD_GATE_REFUSALS, reviewMerges, refuteIdentity, reviewIdentityMerges, reviewReferentAssignments } from "./fold-gate.js";
export * as foldGate from "./fold-gate.js";
export { DOCUMENT_KINDS, DOCUMENT_KINDS_META, MEETING_BOUNDARY_META, meetingBoundaries, meetingSections, readHeading, speakerAt, speakerSections, turnMarkerBoundaries } from "./speaker.js";
export * as speaker from "./speaker.js";
export { REFUSALS as OBLIGATION_REFUSALS, STANDINGS, admitObligations, coverage, mark, standings } from "./obligation.js";
export * as obligation from "./obligation.js";
export { REFUSALS as EVENT_ARRANGEMENTS_REFUSALS, arrangementNotes, arrangementsFrom } from "./event-arrangements.js";
export * as eventArrangements from "./event-arrangements.js";
export { SELF_WITNESS, isSelfWitness, landAct, landContest, landSelfAssertion, makeCapacityRunner, mergeTestimony, negationCandidates, perSourceReadings, readsNothing, speakerWho } from "./capacity-runner.js";
export * as capacityRunner from "./capacity-runner.js";
export { CAPACITIES, findCapacity, listCapacities, unresolvedCapacity } from "./capacities.js";
export * as capacities from "./capacities.js";
// Phase 3 organs. hypergraph's whole closure (cast, grounding, cite, source,
// asserted, web, measure, testimony, primary, capacity-runner, experiencer,
// quotes) crossed on 2026-09-02 — the closure was moved TOGETHER, so no moved
// organ imports the surface; the-fold keeps one-line shims at the old paths.
// The assertion ledger itself is now kernel/notes.js (medium-blind); this
// notes-text.js is its text face — renamed 2026-09-08 from hyperlexicon.js;
// see that file's own header for why (the name collided with the real
// Xushen ledger, kernel/hyperlexicon.js).
export { assertionId, recipeId, REFUSALS as NOTES_TEXT_REFUSALS, VERB_CLASS, makeNotesText } from "./notes-text.js";
export { standingOf as noteStanding, sourceOfWitness, recipeOfWitness, kindOfWitness, claimContestedByLedger } from "../kernel/notes.js";
export { reviseAgainstLedger } from "./ledger-revision.js";
export { RANKE, PRIMARY_KIND, QUOTE_MIN_WORDS, claimOfNote, primaryWitness, standsOnAccountsOnly, leadsOf, footnoteLeads, footnoteLeadsForNote, markersIn, markersOfSpan, documentMatches, archiveAddressFor, chase, chaseLedger } from "./ranke.js";
export * as ranke from "./ranke.js";
export * as notesText from "./notes-text.js";
export { makeGrammarLens, mismatchedConnectors } from "./grammar-lens.js";
export * as grammarLens from "./grammar-lens.js";
// The language dispatch (2026-09-16): all cognition reads GFP-shaped by
// default; English-SVO (or any positional language with a measured
// RoleConfig@1) comes online ONLY when the caller declares one for the
// language. Exported at the seam so the surface and the evals select a
// reader by language without importing an adapter path directly.
export { relationExtractorsFor } from "../adapters/text/relations-language.js";
export { extractGfpRelations, discoverGfpVocabulary } from "../adapters/text/relations-gfp.js";
export { makeGrainTyper, cellLabelOf, GRAIN_BY_THRAX } from "../adapters/text/grain-typing.js";
export { stageFromEdges } from "./hl.js";
export * as hl from "./hl.js";
export { EVIDENCE_FLOOR, scanFunctionalCandidates, acquireCandidates, recheckCandidates, promoteAndDeclare } from "./hl-acquire.js";
export * as hlAcquire from "./hl-acquire.js";
// hl.js also RE-EXPORTS the engine's own HL API (verdicts, stage builders) — names the seam generator's export scan missed, added when void-hl broke on BEYOND_REACH.
export { BOUND, CONTRADICTED, CONTESTED, UNBOUND, BEYOND_REACH, UNREFUTED, UNDETERMINED, flip, createStage, addAnchor, addEdge, declareFunctional, declareTransitive, declareComplete, extendStage, atomic, read, attach } from "./hl.js";
export { ALIAS_REFUSALS, aliasIndex, declaredAliases, shapesFrom } from "./aliases.js";
export * as aliases from "./aliases.js";
export { witnessSentences, endsFor, settledBy, rowFor, WITNESS_VERDICTS } from "./witness-sentences.js";
export * as witnessSentencesOrgan from "./witness-sentences.js";
// floor 6 — a corroborated note as a premise (derivation.js)
export { DERIVED_PREFIX, REFUSALS as DERIVATION_REFUSALS, isDerivedId, premisesOf, chemistryFor, substrateEdges, naiveJoin, redeal, makeDerivation } from "./derivation.js";
export * as derivation from "./derivation.js";

// Degrees Kelsen — the reasoning linter (2026-09-11) — the seed's
// precedence order run over the holograph; consumes regime.js's tag +
// isSettled + precedence through an injected notes door, and produces typed
// coherence findings at three declared strictness levels.
export { LINT_STRICTNESS, SEVERITY, findClaimCycle, lintContent, lintInferences, lintLedger, lintReport, lintTimeline, findingKey } from "./reasoning-lint.js";
export * as reasoningLint from "./reasoning-lint.js";

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
// The pathos organ (2026-09-13, Abhinavagupta) — the felt shape of a reading:
// rhythm (Murch) + curve (surprise/tension/release) + strain gated by the
// ledger, for a declared experiencer, and the REC·Ground re-ground when the
// ground fails — a recorded concession, never an idle one.
export { STRAIN, strainOf, pathosOf, reGroundCondition, reGround, landReGround } from "./pathos.js";
export * as pathosOrgan from "./pathos.js";
export { MIN_QUOTE_WORDS, applyQuotes, extractQuotedSpans, normalizedIndex, quoteFindings, quoteOpens, verifyQuotes } from "./quotes.js";
export * as quotesOrgan from "./quotes.js";
// The look organ (2026-09-12) — the native "looking" capacity, ported from
// The look organ (organs/look.js) is deliberately NOT re-exported here:
// it imports node:child_process / node:fs / node:os / node:path and reads
// process.env at module load, so it cannot LOAD in a browser — and this
// index is the browser page's own seam, so a static re-export of it dragged
// node built-ins into every page import and killed the whole module graph
// (net::ERR_FAILED on `node:fs` etc., found driving the real page). Its
// consumers — the proxy's workspace pass, LaVar, look.test.mjs — all import
// it directly by path, server-side only, exactly as the split law requires
// (pure organs in the seam, I/O organs at their caller).

// Phase 4 (2026-09-14) — four more of the-fold's surface files cross. All
// four are pure (no the-fold import survived the move); a test exercising a
// the-fold-only file (holon.js's prompts, render.js's block splitter) split
// off and stayed in the-fold, importing the organ through its shim.
export { APPARATUS_TERMS, apparatusMentions, assertModelFacing, mouthFacing, speaksOfApparatus, strikeAddresses } from "./firewall.js";
export * as firewallOrgan from "./firewall.js";
export { claimKey, claimNature, composedSentence, createClaimLedger } from "./claims.js";
export * as claimsOrgan from "./claims.js";
export { buildFactBlock, dedupeSourceText } from "./fact-block.js";
export * as factBlockOrgan from "./fact-block.js";
export { makeAposiopesis } from "./aposiopesis.js";
export * as aposiopesis from "./aposiopesis.js";
export { classifySentences, sentenceSpans, stripNarrationSentences, stripScaffoldNarration } from "./provenance.js";
export * as provenanceOrgan from "./provenance.js";
// THE LATENT MIND (2026-09-15) — the archon compendium: the public-domain /
// fair-use record of whose work the reading's methods come from, the mind
// ethos thinks with at the core. Exported at the seam so the surface can
// quote an archon's credited work and offer it as an affordance.
export { ARCHON_COMPENDIUM, ARCHONS, ARCHON_COMPENDIUM_SCHEMA, archonOf, compendium, creditedQuote, matchArchons } from "./archon-compendium.js";
export * as archonCompendium from "./archon-compendium.js";
// Apollo (homeostasis) + Thea (remedy): pure, browser-safe. The dispatch
// bridge (apollo-swarm.js, eoSwarm wiring) is server-side only — import by path.
export { APOLLO_CHANNELS, APOLLO_REFUSALS, createBaseline, observe as apolloObserve, surpriseOf as apolloSurpriseOf, snapshot as apolloSnapshot } from "./apollo.js";
export * as apollo from "./apollo.js";
export { THEA_ACTIONS, THEA_REFUSALS, craftRemedy } from "./thea.js";
export * as thea from "./thea.js";
// The what organ (2026-09-16, Cuvier) and the anchors organ (2026-09-16,
// Tycho) are deliberately NOT re-exported here, exactly as look.js is not:
// each composes an adapter (adapters/code/anchors.js) that imports node:fs at
// module load, so a static re-export dragged a node built-in into every page
// import and killed the whole module graph on a static host (net::ERR_FAILED
// on `node:fs`, found driving the real GitHub Pages build). Their consumers —
// the er7 proxy's workspace pass, the eval drivers, their own test files —
// import them directly by path, server-side only, the same split the look.js
// exclusion below already states for itself.
// The current-facts witness (2026-09-19, Wilson) — the hyperlexicon's kinds,
// their dated links, and the stigmergic trails of the hops that found them.
// Server-side only, like the what/anchor organs: it composes kernel/rng-less
// pure modules plus node:fs for the environment file, so it is NOT statically
// re-exported for the same static-host reason as what.js/anchor.js above.
