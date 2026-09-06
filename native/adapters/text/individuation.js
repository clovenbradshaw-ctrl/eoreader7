import {
  ANAPHORIC_PRONOUNS,
  DEFINITE_DETERMINERS,
  INDEFINITE_DETERMINERS,
  THIRD_PERSON_SINGULAR,
} from "./priors.js";

const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
const norm = (x) => (String(x ?? "").toLowerCase().match(WORD) ?? []).join(" ");
const words = (x) => String(x ?? "").toLowerCase().match(WORD) ?? [];
const slug = (x) => norm(x).replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");

// Closed English pronominal/determiner classes belong in the text adapter,
// never in the modality-neutral kernel. Possessives are kept separate from
// personal pronouns because "my father" is referential while bare "my" is not.
const PERSONAL_PRONOUNS = new Set([
  "i", "me", "mine", "myself", "we", "us", "ours", "ourselves",
  "you", "yours", "yourself", "yourselves", "they", "them", "theirs", "themselves",
  "who", "whom", "whose", "which", "what",
]);
const POSSESSIVE_DETERMINERS = new Set(["my", "your", "his", "her", "our", "their"]);
const CLAUSE_LEADERS = new Set(["when", "where", "if", "while", "because", "although", "though", "since", "before", "after", "until"]);

const pronounToken = (w) => PERSONAL_PRONOUNS.has(w) || ANAPHORIC_PRONOUNS.has(w) || Object.hasOwn(THIRD_PERSON_SINGULAR, w);
const containsPronoun = (ws) => ws.some(pronounToken);
const determinationOf = (first) => DEFINITE_DETERMINERS.has(first)
  ? "definite"
  : INDEFINITE_DETERMINERS.has(first)
    ? "indefinite"
    : POSSESSIVE_DETERMINERS.has(first)
      ? "possessive"
      : "bare";

const occurrence = ({ id, surface, determination, encounterRef, role = null, edge = null, relation = null, giver, basis }) => {
  const ws = words(surface);
  if (!ws.length) return null;
  return Object.freeze({
    schema: "EOReferentOccurrence@1",
    id,
    surface,
    canonicalSurface: ws.join(" "),
    head: ws[ws.length - 1],
    determination,
    role,
    encounterRef,
    edge,
    relation,
    standing: "unresolved_identity",
    provenance: Object.freeze({ giver, basis }),
  });
};

/**
 * Classify an unresolved relation participant without deciding its identity.
 * Relation extraction can expose clause fragments as participants. Therefore
 * this channel accepts only determiner/possessive-marked descriptions.
 */
export function descriptorOccurrence(participant, { encounterRef = null, edge = null } = {}) {
  if (participant?.standing !== "unresolved_surface") return null;
  const surface = String(participant.surface ?? "").trim();
  const ws = words(surface);
  if (!surface || ws.length < 2 || containsPronoun(ws) || CLAUSE_LEADERS.has(ws[0])) return null;

  const determination = determinationOf(ws[0]);
  if (determination === "bare") return null;

  return occurrence({
    id: `ref-occ:${encounterRef ?? "unknown"}:${participant.occurrence ?? slug(surface)}`,
    surface,
    determination,
    role: participant.role ?? null,
    encounterRef,
    edge: edge?.id ?? null,
    relation: edge?.relation ?? null,
    giver: "text/individuation::descriptorOccurrence",
    basis: "determiner-marked unresolved relation participant",
  });
}

/**
 * Direct descriptor perception from witnessed encounter text.
 * A received closed determiner class plus one following lexical token is an
 * intentionally narrow text-organ observation, not a general noun parser.
 */
export function directDescriptorOccurrences(text, { encounterRef = "unknown" } = {}) {
  const source = String(text ?? "");
  const out = [];
  const determinerAlternation = [...DEFINITE_DETERMINERS, ...INDEFINITE_DETERMINERS, ...POSSESSIVE_DETERMINERS]
    .sort((a, b) => b.length - a.length)
    .join("|");
  const re = new RegExp(`\\b(${determinerAlternation})\\s+([\\p{L}\\p{N}]+(?:['’][\\p{L}\\p{N}]+)*)`, "giu");
  let m;
  let ordinal = 0;
  while ((m = re.exec(source))) {
    const surface = `${m[1]} ${m[2]}`;
    const ws = words(surface);
    if (containsPronoun([ws[1]])) continue;
    out.push(occurrence({
      id: `ref-occ:${encounterRef}:direct:${ordinal}:${m.index}`,
      surface,
      determination: determinationOf(ws[0]),
      encounterRef,
      giver: "text/individuation::directDescriptorOccurrences",
      basis: "closed-class determiner plus witnessed lexical form",
    }));
    ordinal += 1;
  }
  return Object.freeze(out.filter(Boolean));
}

import { chainView } from "../../kernel/fold.js";

// Incremental over the fold's delta chain: occurrences are add-only, so the
// per-surface groups persist and each delta folds in O(delta); an UPDATE
// touching the schema demands the from-scratch path (exactness first).
// Insertion order of the Map — first occurrence of each surface — is the
// original's own output order; a full Frankenstein read diffed
// byte-identical before this landed.
const surfaceGroups = chainView(
  (graphEntries) => {
    const bySurface = new Map();
    for (const x of graphEntries) {
      if (x?.schema !== "EOReferentOccurrence@1") continue;
      const key = x.canonicalSurface;
      if (!bySurface.has(key)) bySurface.set(key, []);
      bySurface.get(key).push(x);
    }
    return bySurface;
  },
  (bySurface, d) => {
    if (d.updated.some((x) => x?.schema === "EOReferentOccurrence@1")) return null;
    for (const x of d.appended) {
      if (x?.schema !== "EOReferentOccurrence@1") continue;
      const key = x.canonicalSurface;
      if (!bySurface.has(key)) bySurface.set(key, []);
      bySurface.get(key).push(x);
    }
    return bySurface;
  },
);

/**
 * Recurrence earns an identity hypothesis, never timeless sameness.
 */
export function descriptorHypotheses(graphEntries = []) {
  return hypothesesFor(surfaceGroups(graphEntries));
}


/**
 * The same hypotheses over the FOLD's occurrences plus a handful of
 * not-yet-folded ones — the per-encounter shape reviseTextFold needs. The
 * fold side rides the chain view (O(delta)); the extras overlay affected
 * groups copy-on-read, so the shared cached groups are never mutated with
 * entries the fold does not yet hold. Output order is the original
 * combined-array semantics: fold-known surfaces in first-occurrence order,
 * new-only surfaces appended in arrival order — proven byte-identical on a
 * full Frankenstein read.
 */
export function descriptorHypothesesWith(foldEntries = [], extraOccurrences = []) {
  const cached = surfaceGroups(foldEntries);
  if (!extraOccurrences.length) return hypothesesFor(cached);
  const overlay = new Map(cached);
  for (const x of extraOccurrences) {
    if (x?.schema !== "EOReferentOccurrence@1") continue;
    const key = x.canonicalSurface;
    const base = overlay.get(key);
    overlay.set(key, base ? (overlay.get(key) === cached.get(key) ? [...base, x] : (base.push(x), base)) : [x]);
  }
  return hypothesesFor(overlay);
}

/**
 * THE PER-SURFACE MEMO (P157) — the same defect the discourse projection had.
 *
 * `surfaceGroups` rides the chain view and hits (measured: 1 compute in 3,392
 * sentences). But `hypothesesFrom` then walked EVERY surface group on EVERY
 * encounter, so the incremental view bought nothing downstream of itself —
 * one O(surfaces) pass per sentence, which is the quadratic term.
 *
 * A hypothesis is a pure function of ONE group, so it is cached per group
 * array. An encounter touching three surfaces recomputes three, not all.
 *
 * ORDER IS PRESERVED EXACTLY, and that is the part that could have broken:
 * the walk is still over the map in its own insertion order, so fold-known
 * surfaces stay in first-occurrence order and new-only surfaces stay appended
 * in arrival order. Only the VALUE for an untouched key is reused, never its
 * position.
 */
const HYPOTHESIS = new WeakMap();

/**
 * One group's hypothesis, cached on the group ARRAY.
 *
 * The surface is carried in the cached value and checked, because the surface
 * is not incidental — it appears in the hypothesis's own id
 * (`identity:descriptor:${slug(surface)}`) and as a field. Keying on the array
 * alone and assuming the surface would be right is how this memo would
 * silently rewrite every id; the check costs one comparison and makes that
 * unrepresentable.
 */
function hypothesisForGroup(surface, group) {
  const hit = HYPOTHESIS.get(group);
  if (hit !== undefined && hit.surface === surface) return hit.value;
  const one = hypothesesFrom(new Map([[surface, group]]));
  const value = one.length ? one[0] : null;
  HYPOTHESIS.set(group, { surface, value });
  return value;
}

/**
 * The same walk as before, in the same order, but each group's hypothesis is
 * looked up rather than rebuilt. An untouched group is the SAME ARRAY as the
 * cached one, so it hits; a touched group is a new array, so it misses and
 * recomputes. No bookkeeping about what changed is needed — array identity
 * already carries it.
 *
 * ORDER IS UNCHANGED, and that is the part that could have broken: the walk
 * is still over the map in its own insertion order, so fold-known surfaces
 * stay in first-occurrence order and new-only surfaces stay appended in
 * arrival order. Only a VALUE is reused, never a position.
 */
function hypothesesFor(bySurface) {
  const out = [];
  for (const [surface, group] of bySurface) {
    const h = hypothesisForGroup(surface, group);
    if (h) out.push(h);
  }
  return Object.freeze(out);
}

function hypothesesFrom(bySurface) {
  const hypotheses = [];
  for (const [surface, group] of bySurface) {
    if (group.length < 2) continue;
    const encounterRefs = [...new Set(group.map((x) => x.encounterRef).filter(Boolean))];
    if (encounterRefs.length < 2) continue;
    const determinations = [...new Set(group.map((x) => x.determination).filter(Boolean))];
    hypotheses.push(Object.freeze({
      schema: "EOIdentityHypothesis@1",
      id: `identity:descriptor:${slug(surface)}`,
      surface,
      determinations: Object.freeze(determinations),
      occurrenceRefs: Object.freeze(group.map((x) => x.id)),
      encounterRefs: Object.freeze(encounterRefs),
      relationContexts: Object.freeze(group.map((x) => ({ edge: x.edge, relation: x.relation, role: x.role }))),
      standing: "live_hypothesis",
      provenance: Object.freeze({
        giver: "text/individuation::descriptorHypotheses",
        basis: "same descriptor recurred across distinct encounters; identity remains defeasible",
      }),
    }));
  }
  return Object.freeze(hypotheses);
}


/**
 * Project the Fold's present best referential commitment from an identity
 * hypothesis. This is deliberately REVERSIBLE.
 *
 * Repeated indefinite descriptions ("a servant", "a boat") do not imply one
 * being and are never canonicalised by recurrence alone. Repeated definite or
 * possessive descriptions carry a weak received language prior that the
 * discourse treats their target as identifiable. We may therefore expose a
 * provisional current referent while retaining every occurrence and the live
 * identity hypothesis that justified it. Later witness can SEG or DEF this
 * projection without changing the historical observations.
 */
export function referentFromDescriptorHypothesis(hypothesis) {
  if (hypothesis?.schema !== "EOIdentityHypothesis@1") return null;
  const determinations = new Set(hypothesis.determinations ?? []);
  if (!determinations.has("definite") && !determinations.has("possessive")) return null;
  return Object.freeze({
    schema: "EOReferent@1",
    id: `ref:descriptor:${slug(hypothesis.surface)}`,
    display: hypothesis.surface,
    surfaces: Object.freeze([hypothesis.surface]),
    occurrenceRefs: Object.freeze([...(hypothesis.occurrenceRefs ?? [])]),
    identityHypothesis: hypothesis.id,
    standing: "provisional",
    revisable: true,
    provenance: Object.freeze({
      giver: "text/individuation::referentFromDescriptorHypothesis",
      basis: "recurrent definite/possessive discourse reference; defeasible until challenged",
    }),
  });
}
