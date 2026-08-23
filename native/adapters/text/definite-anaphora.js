import { DEFINITE_DETERMINERS_META } from "./priors.js";
import { diaNorm } from "./surfaces.js";

const freeze = (value) => Object.freeze(value);
const DISCOURSE_GIVER = "text/discourse-referents::projectDiscourseReferents";

const liveReferent = (ref) => ref?.schema === "EOReferent@1"
  && ref?.standing !== "refused"
  && ref?.standing !== "distinct"
  && Array.isArray(ref?.supportRefs)
  && ref.supportRefs.length > 0
  && ref?.provenance?.giver === DISCOURSE_GIVER;

const articleDefinite = (surface) => {
  const normalized = diaNorm(surface);
  return normalized === "the" || normalized.startsWith("the ") ? normalized : null;
};

/**
 * Index only already-earned discourse antecedents.
 *
 * This is deliberately NOT a same-string identity table. A surface enters this
 * index only after some earlier occurrence-level identity evidence has already
 * produced a supported discourse referent. Repetition alone can never seed it.
 * Multiple live referents claiming the same surface remain explicitly
 * ambiguous and therefore cannot license continuation.
 */
export function definiteAntecedentIndex(orientation = {}) {
  const refs = [
    ...(orientation?.terrainState?.Entity ?? []),
    ...(orientation?.activeReferents ?? []),
  ];
  const byId = new Map();
  for (const ref of refs) if (liveReferent(ref) && ref.id) byId.set(ref.id, ref);

  const bySurface = new Map();
  for (const ref of byId.values()) {
    for (const raw of ref.surfaces ?? []) {
      const surface = articleDefinite(raw);
      if (!surface) continue;
      if (!bySurface.has(surface)) bySurface.set(surface, []);
      const bucket = bySurface.get(surface);
      if (!bucket.some((item) => item.id === ref.id)) bucket.push(ref);
    }
  }
  return bySurface;
}

/**
 * Project an occurrence -> referent binding from English definite anaphora.
 *
 * Preconditions are intentionally narrow:
 * - current form is an exact `the ...` descriptor;
 * - the prior Fold contains exactly one explicitly supported discourse
 *   referent with that canonical descriptor;
 * - the current occurrence remains occurrence-level in raw witness.
 *
 * The binding is provisional and defeasible. It is interpretation conditioned
 * by the prior Fold plus a received grammatical convention, never new witness.
 */
export function bindDefiniteAnaphora({ surface, occurrence, orientation = {} } = {}) {
  if (!occurrence) return null;
  const canonicalSurface = articleDefinite(surface);
  if (!canonicalSurface) return null;
  const candidates = definiteAntecedentIndex(orientation).get(canonicalSurface) ?? [];
  if (candidates.length !== 1) return null;
  const antecedent = candidates[0];
  return freeze({
    schema: "EODefiniteBinding@1",
    id: `definite-binding:${occurrence}`,
    occurrence,
    referent: antecedent.id,
    surface: canonicalSurface,
    standing: "provisional",
    supportRefs: freeze([...(antecedent.supportRefs ?? [])]),
    provenance: freeze({
      giver: "lang/en:definite-anaphora@1",
      receivedFrom: DEFINITE_DETERMINERS_META.giver,
      basis: "exact English definite descriptor has one explicitly supported discourse antecedent in the prior Fold",
    }),
  });
}
