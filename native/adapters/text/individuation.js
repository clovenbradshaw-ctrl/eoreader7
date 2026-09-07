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

// ── THE HYPOTHESIS LIST, MAINTAINED (2026-09-07) ─────────────────────────
// P157 memoised each group's hypothesis on its group ARRAY and said "an
// untouched group is the same array, so it hits". On the chain path the
// group is grown IN PLACE by `push`, so the memo was stale there — harmless
// only because revision.js admits new ids and ignores known ones. And
// `descriptorHypothesesWith` copied the whole surface map and walked every
// group per sentence: profiled at 240 KB it was 12% of the read and grew
// 7x for 1.79x the sentences.
//
// The state now carries the OUTPUT: `out`, the hypotheses in surface
// first-occurrence order, with each surface's position. A delta touches a
// few groups; only those are recomputed, and a hypothesis, once earned, is
// never lost (occurrences are add-only), so `out` only ever replaces in
// place or inserts. The per-group memo is versioned by the group's LENGTH,
// which is the only thing that can change on an append-only group. The
// output order is the original's: fold-known surfaces in first-occurrence
// order, new-only surfaces appended in arrival order — and the fresh-array
// compute path and the incremental path are pinned equal.
const HYPOTHESIS = new WeakMap(); // group array -> { surface, length, value }
function hypothesisForGroup(surface, group) {
  const hit = HYPOTHESIS.get(group);
  if (hit !== undefined && hit.surface === surface && hit.length === group.length) return hit.value;
  const one = hypothesesFrom(new Map([[surface, group]]));
  const value = one.length ? one[0] : null;
  HYPOTHESIS.set(group, { surface, length: group.length, value });
  return value;
}

const emptyState = () => ({ groups: new Map(), order: new Map(), out: [], outOrder: [], frozen: null });

/** Where `out` holds (or would hold) the hypothesis for a surface: binary search on the kept first-occurrence orders. */
function slot(st, surface) {
  const o = st.order.get(surface);
  let lo = 0, hi = st.outOrder.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (st.outOrder[mid] < o) lo = mid + 1; else hi = mid; }
  return { at: lo, found: lo < st.outOrder.length && st.outOrder[lo] === o };
}

/** Put the hypothesis for `surface` into `out` at its first-occurrence position, or replace it there. Returns whether `out` changed. */
function place(st, surface, value) {
  const { at, found } = slot(st, surface);
  if (found) {
    if (value == null) throw new Error("individuation: a hypothesis once earned cannot be lost on an append-only group");
    if (st.out[at] === value) return false;
    st.out[at] = value; return true;
  }
  if (value == null) return false;
  st.out.splice(at, 0, value); st.outOrder.splice(at, 0, st.order.get(surface));
  return true;
}

function foldGroups(st, entries) {
  const touched = new Set();
  for (const x of entries) {
    if (x?.schema !== "EOReferentOccurrence@1") continue;
    const key = x.canonicalSurface;
    if (!st.groups.has(key)) { st.groups.set(key, []); st.order.set(key, st.order.size); }
    st.groups.get(key).push(x);
    touched.add(key);
  }
  let changed = false;
  for (const key of [...touched].sort((a, b) => st.order.get(a) - st.order.get(b))) changed = place(st, key, hypothesisForGroup(key, st.groups.get(key))) || changed;
  if (changed || !st.frozen) st.frozen = Object.freeze([...st.out]);
  return st;
}

const surfaceState = chainView(
  (graphEntries) => foldGroups(emptyState(), graphEntries),
  (st, d) => {
    if (d.updated.some((x) => x?.schema === "EOReferentOccurrence@1")) return null;
    return foldGroups(st, d.appended);
  },
);

/**
 * Recurrence earns an identity hypothesis, never timeless sameness.
 */
export function descriptorHypotheses(graphEntries = []) {
  return surfaceState(graphEntries).frozen;
}

/**
 * The same hypotheses over the FOLD's occurrences plus a handful of
 * not-yet-folded ones — the per-encounter shape reviseTextFold needs. The
 * fold side rides the chain view; the extras touch a few groups, which are
 * read copy-on-read so the shared state is never written with entries the
 * fold does not yet hold. Output order is the original combined-array
 * semantics: fold-known surfaces in first-occurrence order, new-only
 * surfaces appended in arrival order.
 */
export function descriptorHypothesesWith(foldEntries = [], extraOccurrences = []) {
  const st = surfaceState(foldEntries);
  if (!extraOccurrences.length) return st.frozen;
  const extra = new Map(); // surface -> the group as it would be with the extras (a copy), in extras' arrival order
  for (const x of extraOccurrences) {
    if (x?.schema !== "EOReferentOccurrence@1") continue;
    const key = x.canonicalSurface;
    if (!extra.has(key)) extra.set(key, [...(st.groups.get(key) ?? [])]);
    extra.get(key).push(x);
  }
  if (!extra.size) return st.frozen;
  const known = [...extra.keys()].filter((k) => st.order.has(k)).sort((a, b) => st.order.get(a) - st.order.get(b));
  const fresh = [...extra.keys()].filter((k) => !st.order.has(k));
  // Fold-known surfaces: walk `out` in order, replacing or inserting the touched ones at their first-occurrence positions.
  const out = [];
  let k = 0;
  const pushKnown = (limitOrder) => { while (k < known.length && st.order.get(known[k]) < limitOrder) { const h = hypothesisForGroup(known[k], extra.get(known[k])); if (h) out.push(h); k += 1; } };
  for (let i = 0; i < st.out.length; i += 1) {
    const o = st.outOrder[i];
    pushKnown(o);
    if (k < known.length && st.order.get(known[k]) === o) { const h = hypothesisForGroup(known[k], extra.get(known[k])); if (h) out.push(h); k += 1; }
    else out.push(st.out[i]);
  }
  pushKnown(Infinity);
  for (const key of fresh) { const h = hypothesisForGroup(key, extra.get(key)); if (h) out.push(h); }
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
