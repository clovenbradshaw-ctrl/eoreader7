// native/adapters/text/anchoring.js — bind a definite/possessive descriptor
// occurrence to an already-admitted referent by the SAME one-hop activation
// recall pronouns.js already trusts for referent identity.
//
// This is the generalization the lineage already recorded ("a surface span
// is never the thing with a part of speech — the referent is"): pronouns.js
// resolves "he/she"; this file resolves "the creature" / "my father" — the
// same cue → recall → best-single-hop → floors → binding-or-typed-gap loop,
// over the same memory/activation.js organs, imported whole and never
// re-derived. What differs is only the surface class being resolved and the
// consumer: a pronoun binding informs coreference; a descriptor binding is
// IDENTITY EVIDENCE — it feeds deriveIdentityRevision's support/attack
// grammar (kernel/identity.js), which is what turns the ~900 forever-open
// descriptor hypotheses per novel into release traffic (see
// native/eval/results/understanding-scoreboard-RESULTS.md — the baseline
// this file exists to move).
//
// CAUSALITY: evidence at sentence n recalls only frames encoded from
// sentences < n (recall's own selfOrder exclusion). A binding never uses
// the sentence it is read from, and never anything later.
//
// CONSERVATIVE GATE, same discipline as pronouns.js: a descriptor is
// resolved only in a sentence that names NO admitted referent surface.
// A descriptor sharing its sentence with a name is left alone — this file
// does not adjudicate between a co-mentioned name and a descriptor (they
// are usually two different beings: "the creature" and "Frankenstein" in
// one sentence). Fewer, cleaner bindings over more, guessed ones.
//
// Declared numbers: minActivation / minMargin are REQUIRED (pronouns.js's
// own contract, verbatim) — how much recall counts as a real echo, and how
// far the winner must lead, are never defaults. No gender filter is
// applied: a descriptor is not reliably gendered, and a wrong hard filter
// is worse than none — disclosed, not hidden.

import { tokens, codeOf, recall, encodeFrame } from "../../memory/activation.js";

const DEFAULT_COMPLETION = 0.5;
const DEFAULT_TOP_EDGES = 6;
const DEFAULT_EDGE_SLOTS = 24;

const norm = (x) => String(x ?? "").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const slug = (x) => norm(x).replace(/\s+/g, "_");

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const surfaceMatcher = (surfaces) => {
  const parts = [...surfaces].filter(Boolean).sort((a, b) => b.length - a.length).map(escapeRe);
  if (!parts.length) return null;
  return new RegExp(`\\b(${parts.join("|")})\\b`, "giu");
};

/**
 * createDescriptorAnchoring — incremental: feed each sentence once, in
 * reading order, exactly as the causal perceiver already accumulates them.
 *
 * observe(sentence, occurrences, referents) →
 *   { evidence: EOAnchorEvidence@1[], gaps: [...] }
 *
 * `sentence`   {text, order, offset}
 * `occurrences` this sentence's descriptor occurrences (EOReferentOccurrence@1
 *   shape — only `definite`/`possessive` determinations are resolved; an
 *   indefinite ("a servant") never implies one being and is skipped, the
 *   same rule referentFromDescriptorHypothesis already states).
 * `referents`  the currently-admitted cast: [{id, display, surfaces}]
 */
export function createDescriptorAnchoring({
  minActivation,
  minMargin,
  idfFloor,
  minLen,
  completion = DEFAULT_COMPLETION,
  topEdges = DEFAULT_TOP_EDGES,
  edgeSlots = DEFAULT_EDGE_SLOTS,
} = {}) {
  if (!Number.isFinite(minActivation) || minActivation < 0)
    throw new TypeError("createDescriptorAnchoring: minActivation is declared — how much recall counts as a real echo is never a default");
  if (!Number.isFinite(minMargin) || minMargin < 0)
    throw new TypeError("createDescriptorAnchoring: minMargin is declared — how far a candidate must lead the runner-up is never a default");

  const state = { df: new Map(), gramDf: new Map(), posting: new Map(), edges: new Map(), read: 0 };
  const namedByFrame = new Map(); // sentence order -> Set(referentId)
  let matcher = null;
  let matcherSurfaceCount = -1;
  let surfaceToReferent = new Map();
  let displayById = new Map();

  const refreshCast = (referents) => {
    const surfaces = new Map();
    const displays = new Map();
    for (const ref of referents ?? []) {
      if (!ref?.id) continue;
      displays.set(ref.id, ref.display ?? (ref.surfaces ?? [])[0] ?? ref.id);
      for (const s of ref.surfaces ?? []) if (s) surfaces.set(s, ref.id);
    }
    if (surfaces.size !== matcherSurfaceCount) {
      matcher = surfaceMatcher(surfaces.keys());
      matcherSurfaceCount = surfaces.size;
    }
    surfaceToReferent = surfaces;
    displayById = displays;
  };

  const namedIn = (text) => {
    const named = new Set();
    if (!matcher) return named;
    matcher.lastIndex = 0;
    let m;
    while ((m = matcher.exec(text))) {
      // The matcher is case-insensitive; the surface map is not. Try the
      // literal hit, then each registered surface case-blind.
      const hit = m[1];
      const direct = surfaceToReferent.get(hit);
      if (direct) { named.add(direct); continue; }
      const key = norm(hit);
      for (const [surface, ref] of surfaceToReferent) {
        if (norm(surface) === key) { named.add(ref); break; }
      }
    }
    return named;
  };

  const observe = (sentence, occurrences = [], referents = []) => {
    refreshCast(referents);
    const ws = tokens(sentence.text);
    const { trace, cue } = codeOf(ws, state, { minLen, idfFloor });
    const named = namedIn(sentence.text);

    const evidence = [];
    const gaps = [];
    const resolvable = (occurrences ?? []).filter(
      (occ) => occ && (occ.determination === "definite" || occ.determination === "possessive"),
    );

    if (named.size === 0 && resolvable.length > 0) {
      const activation = recall(cue, state, { completion, topEdges, selfOrder: sentence.order });
      // BEST single hop per referent — pronouns.js's own discipline,
      // verbatim reasoning in its header: summing across frames rewards
      // ubiquity of naming, not strength of resemblance.
      const referentScore = new Map();
      for (const [order, amt] of activation) {
        const refs = namedByFrame.get(order);
        if (!refs) continue;
        for (const r of refs) if (amt > (referentScore.get(r) ?? -Infinity)) referentScore.set(r, amt);
      }
      const candidates = [...referentScore.entries()].sort((a, b) => b[1] - a[1]);

      for (const occ of resolvable) {
        if (!candidates.length) {
          gaps.push({ reason: "descriptor_no_candidate", tier: "engine", sentenceOrder: sentence.order, descriptor: occ.canonicalSurface, detail: "no admitted referent has been named and activated yet — nothing here to bind to" });
          continue;
        }
        // A margin computed against a runner-up of zero is not a
        // measurement — it is vacuously 1.0 whenever exactly one referent
        // has any recall at all, which is every sentence of a
        // one-character stretch. Measured on Frankenstein's opening
        // letters: with only Margaret admitted, "the stranger" (Victor,
        // not yet named) bound to her at full margin. binding.js's own
        // structural rule, applied here: one candidate has no competition
        // to test. Identity evidence canonicalizes edges, so it is held
        // to this stricter bar than a pronoun binding.
        if (candidates.length < 2) {
          gaps.push({ reason: "descriptor_no_competition", tier: "engine", sentenceOrder: sentence.order, descriptor: occ.canonicalSurface, top: candidates[0][0], detail: "only one referent has any recall — a margin against nothing is not a measurement" });
          continue;
        }
        const [topRef, topScore] = candidates[0];
        if (topScore < minActivation) {
          gaps.push({ reason: "descriptor_below_floor", tier: "engine", sentenceOrder: sentence.order, descriptor: occ.canonicalSurface, top: topRef, activation: topScore, detail: `top candidate's recall (${topScore.toFixed(3)}) does not clear minActivation (${minActivation})` });
          continue;
        }
        const second = candidates[1]?.[1] ?? 0;
        const margin = topScore > 0 ? (topScore - second) / topScore : 0;
        if (margin < minMargin) {
          gaps.push({ reason: "descriptor_no_margin", tier: "engine", sentenceOrder: sentence.order, descriptor: occ.canonicalSurface, top: topRef, runnerUp: candidates[1]?.[0] ?? null, margin, detail: `top candidate leads the runner-up by only ${(margin * 100).toFixed(1)}%, short of minMargin (${(minMargin * 100).toFixed(1)}%)` });
          continue;
        }
        evidence.push(Object.freeze({
          schema: "EOAnchorEvidence@1",
          id: `anchor:${sentence.order}:${slug(occ.canonicalSurface)}`,
          descriptor: occ.canonicalSurface,
          determination: occ.determination,
          occurrenceRef: occ.id ?? null,
          // The occurrence id an EDGE PARTICIPANT actually carries, when
          // this occurrence came from one. Edge participants live in their
          // own id space (`occ:{seq}:{rel}:{role}`), separate from
          // text-derived descriptor occurrences (`ref-occ:...`) — measured
          // at zero overlap, which is why binding only the latter left the
          // composition ledger with no bridges at all.
          participantOccurrence: occ.participantOccurrence ?? null,
          referent: topRef,
          referentSurface: displayById.get(topRef) ?? topRef,
          activation: topScore,
          margin,
          sentenceOrder: sentence.order,
          witness: `text:${sentence.order}:anchor:${slug(occ.canonicalSurface)}`,
          provenance: Object.freeze({
            giver: "text/anchoring::createDescriptorAnchoring",
            tier: "engine",
            basis: "one-hop activation recall over the already-admitted cast, floors declared by the caller",
          }),
        }));
      }
    }

    namedByFrame.set(sentence.order, named);
    encodeFrame(state, sentence.order, ws, trace, { edgeSlots });
    return { evidence, gaps };
  };

  return Object.freeze({ observe });
}

/**
 * Convert anchor evidence into deriveIdentityRevision's own support/attack
 * grammar, against the fold's live alternatives. Pure — no state.
 *
 *  - Every anchor SUPPORTS descriptor ↔ its bound referent's surface.
 *  - An anchor ATTACKS any LIVE alternative that pairs the same descriptor
 *    with a DIFFERENT referent surface: the same descriptor confidently
 *    bound to two different beings is incompatible multiplicity — exactly
 *    the "separated co-presentation" shape identity-evidence.js already
 *    types, arrived at through recall instead of copresence.
 */
export function identityEvidenceFromAnchors(anchors = [], fold = {}) {
  const supports = [];
  const attacks = [];
  const live = (fold?.unresolvedAlternatives ?? []).filter(
    (x) => x?.schema === "EOIdentityAlternative@1" && x.standing !== "distinct" && x.standing !== "refused",
  );
  for (const anchor of anchors) {
    if (anchor?.schema !== "EOAnchorEvidence@1") continue;
    const left = norm(anchor.descriptor);
    const right = norm(anchor.referentSurface);
    if (!left || !right || left === right) continue;
    supports.push({ left, right, witness: anchor.witness, giver: anchor.provenance?.giver ?? "text/anchoring", reason: "descriptor_activation_anchor" });
    for (const alt of live) {
      const pairsDescriptor = alt.left === left || alt.right === left;
      if (!pairsDescriptor) continue;
      const other = alt.left === left ? alt.right : alt.left;
      if (other === right) continue; // same binding — that IS the support above
      attacks.push({ left: alt.left, right: alt.right, witness: anchor.witness, giver: anchor.provenance?.giver ?? "text/anchoring", reason: "descriptor_bound_to_different_referent" });
    }
  }
  return { supports, attacks };
}

/**
 * Project anchor evidence into the occurrence-binding shape the relation-
 * composition ledger reads (`EODefiniteBinding@1` — relation-composition.js's
 * own OCCURRENCE_BINDING_SCHEMAS).
 *
 * This is a projection, not a re-derivation: an anchor already IS a definite
 * binding by construction — a definite/possessive descriptor occurrence
 * resolved to one admitted referent, above declared floors, with its own
 * witness. The two schemas exist because two sessions built the same fact
 * from different directions (recall-based anchoring here; the discourse
 * index there); naming that equivalence explicitly is cheaper and more
 * honest than either side silently re-deriving the other's evidence.
 *
 * Composition chains bridge on RESOLVED referents, so without this bridge an
 * anchoring reader's edges have no bridges at all and the Hyperlexicon comes
 * back empty — measured, not hypothesized (native/eval/results/
 * experienced-new-book.json's own first run: 932 relation edges, 0 bindings,
 * 20 chain sites, 0 candidates).
 */
export function anchorAsDefiniteBinding(anchor) {
  const occurrence = anchor?.participantOccurrence ?? anchor?.occurrenceRef;
  if (anchor?.schema !== "EOAnchorEvidence@1" || !occurrence || !anchor.referent) return null;
  return Object.freeze({
    schema: "EODefiniteBinding@1",
    id: `definite-binding:${anchor.id}`,
    occurrence,
    referent: anchor.referent,
    surface: anchor.descriptor,
    witness: anchor.witness,
    provenance: Object.freeze({
      giver: "text/anchoring::anchorAsDefiniteBinding",
      basis: "projection of a witnessed EOAnchorEvidence@1 — an anchored descriptor occurrence IS a definite binding",
      activation: anchor.activation,
      margin: anchor.margin,
    }),
  });
}
