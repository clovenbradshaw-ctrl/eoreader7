import {
  ANAPHORIC_PRONOUNS,
  DEFINITE_DETERMINERS,
  INDEFINITE_DETERMINERS,
  THIRD_PERSON_SINGULAR,
} from "./priors.js";

const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
const norm = (x) => String(x ?? "").toLowerCase().match(WORD)?.join?.(" ") ?? String(x ?? "").toLowerCase().trim();
const words = (x) => String(x ?? "").toLowerCase().match(WORD) ?? [];
const slug = (x) => norm(x).replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");

const OTHER_PRONOUNS = new Set([
  "i", "me", "my", "mine", "myself", "we", "us", "our", "ours", "ourselves",
  "you", "your", "yours", "yourself", "yourselves", "they", "them", "their", "theirs", "themselves",
  "who", "whom", "whose", "which", "what",
]);

const isPronoun = (surface) => {
  const ws = words(surface);
  if (ws.length !== 1) return false;
  const w = ws[0];
  return OTHER_PRONOUNS.has(w) || ANAPHORIC_PRONOUNS.has(w) || Object.hasOwn(THIRD_PERSON_SINGULAR, w);
};

/**
 * Classify an unresolved relation participant without deciding its identity.
 *
 * Determiners are received language priors. A definite description says the
 * discourse expects an identifiable referent; an indefinite description says
 * it introduces a candidate. Neither is itself evidence that two occurrences
 * are the same being.
 */
export function descriptorOccurrence(participant, { encounterRef = null, edge = null } = {}) {
  if (participant?.standing !== "unresolved_surface") return null;
  const surface = String(participant.surface ?? "").trim();
  const ws = words(surface);
  if (!surface || ws.length === 0 || isPronoun(surface)) return null;

  const first = ws[0];
  const determination = DEFINITE_DETERMINERS.has(first)
    ? "definite"
    : INDEFINITE_DETERMINERS.has(first)
      ? "indefinite"
      : "bare";

  // Bare single tokens are too ambiguous here (noun/verb/adjective/function
  // word). They remain witnessed unresolved participants until another text
  // organ supplies a role prior. Multiword spans and determiner-marked spans
  // carry enough grammatical shape to enter the identity frontier.
  if (determination === "bare" && ws.length < 2) return null;

  const canonicalSurface = ws.join(" ");
  return Object.freeze({
    schema: "EOReferentOccurrence@1",
    id: `ref-occ:${encounterRef ?? "unknown"}:${participant.occurrence ?? slug(canonicalSurface)}`,
    surface,
    canonicalSurface,
    head: ws[ws.length - 1],
    determination,
    role: participant.role ?? null,
    encounterRef,
    edge: edge?.id ?? null,
    relation: edge?.relation ?? null,
    standing: "unresolved_identity",
    provenance: Object.freeze({
      giver: "text/individuation::descriptorOccurrence",
      basis: "unresolved relation participant with referential grammatical shape",
    }),
  });
}

/**
 * Project recurring descriptor occurrences into identity hypotheses.
 *
 * Recurrence earns a hypothesis, never sameness. The hypothesis keeps every
 * occurrence and every relation context so challenge can later SYN, SEG or DEF
 * it before an EOReferent is admitted.
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
    if (group.length < 2) continue; // recurrence, not a one-off noun phrase
    const encounterRefs = [...new Set(group.map((x) => x.encounterRef).filter(Boolean))];
    if (encounterRefs.length < 2) continue;
    hypotheses.push(Object.freeze({
      schema: "EOIdentityHypothesis@1",
      id: `identity:descriptor:${slug(surface)}`,
      surface,
      occurrenceRefs: Object.freeze(group.map((x) => x.id)),
      encounterRefs: Object.freeze(encounterRefs),
      relationContexts: Object.freeze(group.map((x) => ({ edge: x.edge, relation: x.relation, role: x.role }))),
      standing: "live_hypothesis",
      provenance: Object.freeze({
        giver: "text/individuation::descriptorHypotheses",
        basis: "same descriptor recurred across distinct encounters; identity not yet proven",
      }),
    }));
  }
  return Object.freeze(hypotheses);
}
