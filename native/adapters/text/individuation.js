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

const occurrence = ({ id, surface, determination, encounterRef, role = null, edge = null, relation = null, contextTokens = [], giver, basis }) => {
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
    contextTokens: Object.freeze([...new Set(contextTokens)]),
    standing: "unresolved_identity",
    provenance: Object.freeze({ giver, basis }),
  });
};

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

const contextualTokens = (source, descriptorWords) => {
  const excluded = new Set([
    ...descriptorWords,
    ...DEFINITE_DETERMINERS,
    ...INDEFINITE_DETERMINERS,
    ...POSSESSIVE_DETERMINERS,
  ]);
  // No semantic vocabulary is supplied here. This is only a sparse lexical
  // trace of the witnessed encounter. Short forms are withheld because this
  // channel is for cross-surface consequence evidence, not language parsing.
  return words(source).filter((w) => w.length >= 4 && !excluded.has(w) && !pronounToken(w));
};

/** Direct, narrow descriptor perception from witnessed encounter text. */
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
      contextTokens: contextualTokens(source, ws),
      giver: "text/individuation::directDescriptorOccurrences",
      basis: "closed-class determiner plus witnessed lexical form",
    }));
    ordinal += 1;
  }
  return Object.freeze(out.filter(Boolean));
}

/** Recurrence earns an identity hypothesis, never timeless sameness. */
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
    const determinations = [...new Set(group.map((x) => x.determination).filter(Boolean))];
    hypotheses.push(Object.freeze({
      schema: "EOIdentityHypothesis@1",
      id: `identity:descriptor:${slug(surface)}`,
      surface,
      determinations: Object.freeze(determinations),
      occurrenceRefs: Object.freeze(group.map((x) => x.id)),
      encounterRefs: Object.freeze(encounterRefs),
      contextTokens: Object.freeze([...new Set(group.flatMap((x) => x.contextTokens ?? []))]),
      relationContexts: Object.freeze(group.map((x) => ({ edge: x.edge, relation: x.relation, role: x.role }))),
      standing: "live_hypothesis",
      provenance: Object.freeze({ giver: "text/individuation::descriptorHypotheses", basis: "same descriptor recurred across distinct encounters; identity remains defeasible" }),
    }));
  }
  return Object.freeze(hypotheses);
}

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
    provenance: Object.freeze({ giver: "text/individuation::referentFromDescriptorHypothesis", basis: "recurrent definite/possessive discourse reference; defeasible until challenged" }),
  });
}

const jaccard = (a, b) => {
  const A = new Set(a ?? []), B = new Set(b ?? []);
  if (!A.size || !B.size) return 0;
  let intersection = 0;
  for (const x of A) if (B.has(x)) intersection += 1;
  return intersection / (A.size + B.size - intersection);
};
const quantile = (sorted, q) => {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};

/**
 * Discover cross-surface identity ALTERNATIVES from context, not synonyms.
 *
 * Every definite/possessive descriptor pair is scored by overlap in the
 * witnessed lexical contexts accumulated around its occurrences. The decision
 * boundary is the material's own Tukey upper fence over positive pair scores,
 * not a fixed similarity threshold. Clearing it opens an alternative only; it
 * never SYNs referents. This is deliberately diagnostic until adversarial
 * collision/recanonicalisation tests earn commitment.
 */
export function descriptorAliasAlternatives(hypotheses = []) {
  const eligible = hypotheses.filter((h) => {
    const d = new Set(h?.determinations ?? []);
    return h?.schema === "EOIdentityHypothesis@1" && (d.has("definite") || d.has("possessive"));
  });
  const pairs = [];
  for (let i = 0; i < eligible.length; i += 1) {
    for (let j = i + 1; j < eligible.length; j += 1) {
      const left = eligible[i], right = eligible[j];
      const score = jaccard(left.contextTokens, right.contextTokens);
      if (score <= 0) continue;
      const shared = [...new Set(left.contextTokens)].filter((x) => new Set(right.contextTokens).has(x));
      pairs.push({ left, right, score, shared });
    }
  }
  const scores = pairs.map((p) => p.score).sort((a, b) => a - b);
  const q1 = quantile(scores, 0.25), q3 = quantile(scores, 0.75);
  const fence = q3 + (q3 - q1);
  const alternatives = pairs
    .filter((p) => p.score > fence)
    .sort((a, b) => b.score - a.score)
    .map((p, index) => Object.freeze({
      schema: "EOIdentityAlternative@1",
      id: `identity-alt:${slug(p.left.surface)}:${slug(p.right.surface)}:${index}`,
      left: p.left.id,
      right: p.right.id,
      leftSurface: p.left.surface,
      rightSurface: p.right.surface,
      score: p.score,
      nullFence: fence,
      sharedContext: Object.freeze(p.shared),
      standing: "unresolved",
      provenance: Object.freeze({ giver: "text/individuation::descriptorAliasAlternatives", basis: "context overlap exceeds this material's own pairwise null fence; not yet SYN" }),
    }));
  return Object.freeze({ schema: "EODescriptorAliasFrontier@1", fence, pairCount: pairs.length, alternatives: Object.freeze(alternatives) });
}
