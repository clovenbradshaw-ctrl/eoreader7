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
 *
 * Relation extraction can expose clause fragments as participants. Therefore
 * this channel now accepts only determiner/possessive-marked descriptions.
 * Bare spans require an independent role/POS witness and stay unresolved here.
 */
export function descriptorOccurrence(participant, { encounterRef = null, edge = null } = {}) {
  if (participant?.standing !== "unresolved_surface") return null;
  const surface = String(participant.surface ?? "").trim();
  const ws = words(surface);
  if (!surface || ws.length < 2 || containsPronoun(ws) || CLAUSE_LEADERS.has(ws[0])) return null;

  const determination = determinationOf(ws[0]);
  if (determination === "bare") return null;
  if (ws.length === 1) return null;

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
 *
 * This is intentionally narrower than noun-phrase parsing: a received closed
 * determiner class plus ONE following lexical token. It catches stable forms
 * such as "the creature", "the fiend", "my father", "this place" without
 * pretending we possess a general parser. Longer descriptions remain available
 * to other organs; this channel never invents a head by guessing part of speech.
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
 * Project recurring descriptor occurrences into identity hypotheses.
 * Recurrence earns a hypothesis, never sameness.
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
    if (group.length < 2) continue;
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
