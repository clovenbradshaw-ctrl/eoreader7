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

export { WITNESS_OPERATING_POINT, askValue, calibrationFrames, competingFiller, corroborateLedger, distinctRecipes, distinctSources, endsCopresentWindow, independentReadings, proposeCandidates, statingCandidates, textFeatures, thirdSourceCandidates, witnessNote } from "./corroboration.js";
export * as corroboration from "./corroboration.js";
export { SELECT_SCHEMA, WITNESS_SCHEMA, WITNESS_SLICE_MAX, becauseContained, becauseVerbatim, buildSelectMessages, buildWitnessMessages, foldSelect, foldTestimony, locateDecider, readTestimony, siblingSwap, witnessSlice } from "../../../the-fold/testimony.js";
export * as testimony from "../../../the-fold/testimony.js";
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
export { SELF_WITNESS, isSelfWitness, landAct, landSelfAssertion, makeCapacityRunner, mergeTestimony, negationCandidates, perSourceReadings, readsNothing, speakerWho } from "../../../the-fold/capacity-runner.js";
export * as capacityRunner from "../../../the-fold/capacity-runner.js";
export { CAPACITIES, findCapacity, listCapacities, unresolvedCapacity } from "./capacities.js";
export * as capacities from "./capacities.js";
// Phase 3 organs — re-exported from the-fold until each moves (hypergraph is
// deferred: its closure reaches the-fold's surface through grounding.js →
// source.js/web.js, and a moved organ may not import the surface).
export { assertionId, recipeId, REFUSALS as HYPERLEXICON_REFUSALS, VERB_CLASS, makeHyperlexicon } from "../../../the-fold/hyperlexicon.js";
export * as hyperlexicon from "../../../the-fold/hyperlexicon.js";
export { makeGrammarLens, mismatchedConnectors } from "../../../the-fold/grammar-lens.js";
export * as grammarLens from "../../../the-fold/grammar-lens.js";
export { stageFromEdges } from "../../../the-fold/hl.js";
export * as hl from "../../../the-fold/hl.js";
export { EVIDENCE_FLOOR, scanFunctionalCandidates, acquireCandidates, recheckCandidates, promoteAndDeclare } from "../../../the-fold/hl-acquire.js";
export * as hlAcquire from "../../../the-fold/hl-acquire.js";
