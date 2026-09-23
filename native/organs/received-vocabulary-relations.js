// native/organs/received-vocabulary-relations.js — a SECOND, disclosed way
// for a verb to enter the relation vocabulary (2026-09-23).
//
// User direction, this session: "i suspect our problem is trying to go from
// english to GFP then SVO rather than vice versa" — checked, not assumed.
// Measured live: `extractRelations` (relations.js) is already fully
// case-agnostic at match time -- handed a vocabulary directly, it reads
// "result|is|always a string" out of lowercase code prose exactly as
// readily as a capitalised name. The bottleneck is one step upstream:
// `discoverRelationVocab` only admits a verb into that vocabulary when it
// sits next to a capitalised, non-sentence-initial SURFACE somewhere in the
// material (relations.js's own header: "the vocabulary is derived, never
// typed in" -- from proper-noun adjacency). Code identifiers (`result`,
// `config.port`, `moduleA`) and short, subject-first turn claims (a single
// sentence whose one name is sentence-initial, so extractSurfaces never
// confirms it) structurally never clear that gate, regardless of how good
// prose comprehension gets elsewhere -- this is a register mismatch, not a
// comprehension one.
//
// THE FIX IS NARROW ON PURPOSE. This does not touch relations.js or
// surfaces.js -- both stay exactly as measured and tested. It adds a
// SECOND, small, RECEIVED vocabulary (the same discipline pos-eng.json and
// morphology-eng.json already hold in this exact reading pipeline: given
// data, never typed in as a hand list for the whole language) that a
// caller UNIONS on top of whatever discoverRelationVocab finds. Unlike the
// old 90-word hand list this file's sibling module's own header records
// being reverted for (it stood in for ALL relation discovery, silently),
// this list stands in for NOTHING that already works: it only ever WIDENS
// which verbs `extractRelations` may match, and every edge it is
// responsible for is tagged so a caller can tell it apart from a fully
// measured, surface-anchored one -- disclosed, never silent (THE-NULL-
// STATES.md's fourth law, applied to a gain rather than a gap).
//
// DERIVED, NOT GUESSED. RECEIVED_RELATION_VERBS is the union of two real,
// checkable sources, not this session's intuition about what code prose
// probably says: (a) the copulas/possession verbs ("is", "has", …) every
// property or identity claim in GFP notation is naturally phrased with --
// "X has-type Y" and "X is Y" are the same claim shape one lens apart
// (kernel/gfp-claim.js's own SURFACES), and (b) the verb surface forms
// already measured in real use across this repo's own reasoning specs and
// tests (grep '"rel"' across native/tests, native/eval, cli -- has-type,
// imports, depends-on/depends, precedes/before, returns, requires,
// contains, extends, implements, calls, throws, governs, checks). Nothing
// here was picked to make any particular test sentence pass.
//
// PURE. No model call, no IO, no network.
import { extractSurfaces } from "../adapters/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../adapters/text/relations.js";

export const RECEIVED_RELATION_VERBS = Object.freeze([
  // Copula / possession -- the surface form nearly every property or
  // identity claim ("X has-type Y", "X is Y") is phrased with.
  "is", "are", "was", "were", "has", "have", "had",
  // Measured in real use across this repo's own reasoning specs (see
  // header): the small, recurring set of code/claim-description predicates.
  "returns", "depends", "imports", "requires", "contains",
  "extends", "implements", "calls", "throws", "governs", "checks",
  "precedes", "declares",
]);

/**
 * readWithReceivedVocabulary(text, { surfaces, received, ...extractOpts })
 * — the SAME two-step read `discoverRelationVocab` + `extractRelations`
 * already do, with `received` (default RECEIVED_RELATION_VERBS) UNIONED
 * into the discovered set before matching. `surfaces` may be supplied
 * (already-discovered surface strings/objects, the caller's own); default
 * discovers them fresh via the same `extractSurfaces` the rest of the
 * pipeline uses -- this never re-derives surface detection, only reuses it.
 *
 * Returns `{ edges, discoveredVerbs, receivedVerbsUsed }`: `edges` split
 * by which vocabulary source is responsible for each -- an edge whose verb
 * is in `discoveredVerbs` would have been found by the existing pipeline
 * alone; one only in `receivedVerbsUsed` would not have been, and is the
 * disclosed, weaker-witnessed gain this module exists to add.
 */
export function readWithReceivedVocabulary(text, { surfaces = null, received = RECEIVED_RELATION_VERBS, ...extractOpts } = {}) {
  const s = String(text ?? "");
  const surfaceList = surfaces ?? extractSurfaces([{ text: s }]).map((x) => x.surface);
  const discovered = surfaceList.length ? discoverRelationVocab(s, { surfaces: surfaceList, minSurfaces: 1 }).verbs : new Set();
  const receivedSet = received instanceof Set ? received : new Set(received ?? []);
  const verbs = new Set([...discovered, ...receivedSet]);
  if (!verbs.size) return { edges: [], discoveredVerbs: discovered, receivedVerbsUsed: new Set() };
  const edges = extractRelations(s, { verbs, ...extractOpts });
  const receivedVerbsUsed = new Set(edges.map((e) => e.verb.toLowerCase()).filter((v) => receivedSet.has(v) && !discovered.has(v)));
  return { edges, discoveredVerbs: discovered, receivedVerbsUsed };
}
