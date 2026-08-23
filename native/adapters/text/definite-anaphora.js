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

const containsPhrase = (span, phrase) => {
  const haystack = ` ${diaNorm(span)} `;
  const needle = ` ${diaNorm(phrase)} `;
  return needle.trim().length > 0 && haystack.includes(needle);
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
 * - the current argument contains a `the ...` descriptor that is already an
 *   explicitly supported surface of a prior discourse referent;
 * - every supported definite descriptor found inside the argument points to
 *   the same single referent;
 * - the current occurrence remains occurrence-level in raw witness.
 *
 * This lets a wider witnessed relation argument such as "the monster whom I
 * pursued" inherit the already-earned antecedent "the monster" without
 * pretending the whole argument is an identity form. Two competing supported
 * antecedents in one span are ambiguous and refused.
 *
 * The binding is provisional and defeasible. It is interpretation conditioned
 * by the prior Fold plus a received grammatical convention, never new witness.
 */
export function bindDefiniteAnaphora({ surface, occurrence, orientation = {} } = {}) {
  if (!occurrence) return null;
  const normalized = diaNorm(surface);
  if (!normalized || !/(^|\s)the\s/.test(` ${normalized}`)) return null;

  const matches = [];
  for (const [candidateSurface, refs] of definiteAntecedentIndex(orientation)) {
    if (!containsPhrase(normalized, candidateSurface)) continue;
    for (const ref of refs) matches.push({ surface: candidateSurface, ref });
  }
  if (!matches.length) return null;
  const referentIds = [...new Set(matches.map((match) => match.ref.id))];
  if (referentIds.length !== 1) return null;
  const antecedent = matches.find((match) => match.ref.id === referentIds[0])?.ref;
  if (!antecedent) return null;
  const matchedSurfaces = [...new Set(matches.filter((match) => match.ref.id === antecedent.id).map((match) => match.surface))];

  return freeze({
    schema: "EODefiniteBinding@1",
    id: `definite-binding:${occurrence}`,
    occurrence,
    referent: antecedent.id,
    surface: matchedSurfaces[0],
    matchedSurfaces: freeze(matchedSurfaces),
    argumentSurface: normalized,
    standing: "provisional",
    supportRefs: freeze([...(antecedent.supportRefs ?? [])]),
    provenance: freeze({
      giver: "lang/en:definite-anaphora@1",
      receivedFrom: DEFINITE_DETERMINERS_META.giver,
      basis: "English definite argument contains only descriptors belonging to one explicitly supported discourse antecedent in the prior Fold",
    }),
  });
}
