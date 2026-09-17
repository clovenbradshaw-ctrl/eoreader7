// native/eval/lavar/lib/read-recipe.mjs — the ONE read recipe for the
// recursive reading pipeline over text, shared by cli/eoreader7.mjs and
// chapter-swarm.mjs (reconciled 2026-09-13: read-real.mjs predates the
// extraction and keeps its own inline copy; the CLI and the swarm are on
// this seam so neither re-derives the composition step).
//
// The recipe (read-real.mjs's own, trusted): createRecursiveReader +
// createCausalTextPerceiver (minRelationSurfaces:2, POS prior,
// descriptorAnchoring declared), one Encounter@1 at a time in
// textEncounters' own order, then the span-free bridge (identity, not
// containment), then the composition ledger, then Hyperlexicon NOMINATION at
// minWitnesses:1 (LAVAR.md 2026-09-13: a single independent chain site
// nominates; the cross-reading accumulator corroborates to >=2).
//
// Returns the FULL record the caller persists: fold, log, entries (raw +
// projected + participant bindings — a downstream re-read of the artifact
// must reproduce the chemistry, not a graph that re-reads at 0 chains).

import { anchorAsDefiniteBinding } from "../../../adapters/text/anchoring.js";
import { createCausalTextPerceiver, textEncounters } from "../../../adapters/text/recursive.js";
import { reviseTextFold } from "../../../adapters/text/revision.js";
import { createRecursiveReader } from "../../../kernel/reading.js";
import { createHyperlexicon, admitHyperlexiconCandidates } from "../../../kernel/hyperlexicon.js";
import { createRelationCompositionLedger, acquireCompositionCandidates } from "../../../kernel/relation-composition.js";
import { bridgeEdgeParticipants } from "./span-free-bridge.mjs";

export const DEFAULT_CANONICALIZATION_FLOOR = 2;
export const DEFAULT_ANCHORING = Object.freeze({ minActivation: 0.05, minMargin: 0.2 });

const emptyRetrieve = (_fold, evidence) => Object.freeze({
  schema: "EORelevantFold@1", witnessed: Object.freeze([...evidence]), provisional: Object.freeze([]),
  expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]),
  unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]),
});

/**
 * readEncounters(encounters, { source, posPrior, giver, canonicalizationFloor,
 * anchoring, language, roleConfig }) — the core pipeline, from already-loaded
 * encounters. `language` names the material; `roleConfig` is the ONLY thing
 * that brings English-SVO online (the language dispatch, relations-language.js
 * — all cognition reads GFP-shaped until a measured RoleConfig@1 is declared
 * for the language).
 */
export async function readEncounters(encounters = [], { source = "text", posPrior = null, giver = "reader:eoreader7", canonicalizationFloor = DEFAULT_CANONICALIZATION_FLOOR, anchoring = DEFAULT_ANCHORING, language = null, roleConfig = null } = {}) {
  const adapters = {
    revise: (a) => reviseTextFold({ ...a, canonicalizationFloor }),
    retrieve: emptyRetrieve,
  };
  const perceivers = () => [createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior, descriptorAnchoring: anchoring, language, roleConfig })];
  const reader = createRecursiveReader({ perceivers: perceivers(), adapters });
  for (const enc of encounters) await reader.step(enc);
  const fold = reader.getFold();
  const log = reader.getLog?.() ?? [];

  const rawEntries = fold.graphEntries ?? [];
  const projectedBindings = rawEntries.map(anchorAsDefiniteBinding).filter(Boolean);
  const { participantBindings } = bridgeEdgeParticipants(rawEntries);
  const entries = [...rawEntries, ...projectedBindings, ...participantBindings];
  const ledger = createRelationCompositionLedger(entries);
  const stats = ledger.diagnostics();

  const observed = acquireCompositionCandidates(entries, { minWitnesses: 1 });
  const hyperlexicon = admitHyperlexiconCandidates(createHyperlexicon(), observed.map((c) => ({
    left: c.left, right: c.right, giver,
    witnesses: (c.witnesses ?? []).slice(0, 3).map((w) => w?.[0]).filter(Boolean),
    meta: { independentSupport: c.meta?.support ?? 0, rememberedLeft: false, rememberedRight: false },
  })));

  return {
    encounters,
    fold, log, rawEntries, projectedBindings, participantBindings, entries, ledger, stats,
    candidates: observed, hyperlexicon,
  };
}

/**
 * readMaterialText(text, opts) — from a raw text string: build the
 * encounters and read. Byte offsets are relative to `text` (offset 0),
 * disclosed on the caller to re-anchor to the document if it needs to.
 */
export async function readMaterialText(text = "", opts = {}) {
  const source = opts.source ?? "text";
  const encounters = textEncounters(text, { source, offset: 0 });
  return readEncounters(encounters, { ...opts, source });
}