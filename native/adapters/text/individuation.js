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

/**
 * Recurrence earns an identity hypothesis, never timeless sameness. Exposed
 * separately from `descriptorHypotheses` so a caller that already maintains
 * its own surface->occurrences grouping (an incremental index across many
 * turns, rather than re-deriving one from the whole graph every call) can
 * recompute a hypothesis for ONE surface without re-grouping every other one.
 */
export function hypothesisFromOccurrences(surface, group = []) {
  if (group.length < 2) return null;
  const encounterRefs = [...new Set(group.map((x) => x.encounterRef).filter(Boolean))];
  if (encounterRefs.length < 2) return null;
  const determinations = [...new Set(group.map((x) => x.determination).filter(Boolean))];
  return Object.freeze({
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
  });
}

/**
 * Recurrence earns an identity hypothesis, never timeless sameness.
 */
export function descriptorHypotheses(graphEntries = []) {
  const occurrences = graphEntries.filter((x) => x?.schema === "EOReferentOccurrence@1");
  const bySurface = new Map();
  for (const occ of occurrences) {
    const key = occ.canonicalSurface;
    if (!bySurface.has(key)) bySurface.set(key, []);
    bySurface.get(key).push(occ);
  }

  const hypotheses = [];
  for (const [surface, group] of bySurface) {
    const hypothesis = hypothesisFromOccurrences(surface, group);
    if (hypothesis) hypotheses.push(hypothesis);
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
