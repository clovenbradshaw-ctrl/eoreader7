// adapters/text/name-spans.js — NAME-LEVEL SEGMENTATION (2026-09-28): a name
// is a small tree of parts, the way clause-spans.js makes a sentence a small
// tree of clauses. User direction, verbatim: "figure out nesting, we've done
// subordination with clauses."
//
// WHY. kernel/merge-standing.js (v6 amendment) asks whether two occupants of
// one locus are ONE BEING UNDER TWO NAMES, and the first answer was token-set
// containment ("Monsieur Pierre" ⊇ "Pierre"). That is a bag of words, and
// surfaces.js's own history says where bags of words go wrong: "Katerina
// Ivanovna"/"Alyona Ivanovna" (T5, a shared patronymic), "John Adams"/"John
// Quincy Adams" (P251, a scattered subset), "Bezúkhov" alone nesting into
// both Pierre and Cyril. Containment cannot tell a SHORTENED REFERENCE from a
// DIFFERENT PERSON who shares the tokens, because it never asks which token
// is the head, which are given, and which are decoration.
//
// THE SHAPE, mirrored from clause-spans.js: a flat list of spans with
// `parentIndex` and `relation`, one root. The root is the HEAD — the family
// name, the individuating token (Western order: the last non-title token;
// disclosed as scoped to First-[Middle]-Last order, the same scoping
// namesCorefer already accepts). Every other part is subordinate to it:
//   "title"    — HONORIFIC_TITLES (priors.js, lang/en): decoration, never
//                identity; "Count Bezúkhov" and "Bezúkhov" name the same head
//   "particle" — a received nobiliary/linking particle (de, von, van, ...)
//   "given"    — a token before the head that is neither: a given name or
//                middle name
//   "patronymic" — (2026-09-28) a name token a declared PATRONYMIC class
//                recognises: derived from the father's given name, worn by
//                every child of one father, individuating nobody by itself
//                (T5's own lesson). Injected per language — `patronymic:
//                PATRONYMIC_RU` — never on by default: English family names
//                end in -ich too ("Aldrich"), and a class the caller did not
//                declare must not read them. A patronymic is never the head:
//                "Katerina Ivanovna" is headed by Katerina.
// A one-token name is a bare head with no givens — it may be a family name
// OR a given name ("Pierre"), and the tree does not pretend to know.
//
// NESTING, five levels, never a boolean:
//   "full"    — after dropping titles/particles, one name's parts are
//               exactly the other's (same head, same given sequence) —
//               "Monsieur Pierre" / "Pierre"; "Count Bezúkhov" / "Bezúkhov"
//   "prefix"  — same head, the shorter's givens a PREFIX of the longer's —
//               "John Adams" / "John Quincy Adams": a dropped middle name,
//               OR a different person (P251). Not decidable from the names
//   "head"    — the shorter is the bare head of the longer — "Bezúkhov" /
//               "Pierre Bezúkhov": a family reference, worn by every member
//   "given"   — the shorter is bare and equals a given of the longer —
//               "Pierre" / "Pierre Bezúkhov": a first-name reference, unique
//               only if the cast holds one Pierre
//   "none"    — heads differ, or a given conflicts ("Pierre Bezúkhov" /
//               "Count Cyril Vladímirovich Bezúkhov": same head, givens
//               disagree — siblings under one family, two beings)
// Only "full" is a nesting the names themselves establish. Every partial
// level is AMBIGUOUS from the names alone — exactly S17's own rule for the
// cast ("an ambiguous bare form is a typed gap with candidates, never a
// third being") — and a consumer that wants to resolve it needs a witness
// the names do not carry (uniqueness in the cast, apposition, copula).
//
// PURE. Received classes injected or defaulted from priors.js; `fold` is a
// per-token normaliser (diacritics, case) the caller may replace.

import { HONORIFIC_TITLES, DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS } from "./priors.js";

export const NAME_PARTICLES = Object.freeze(new Set(["de", "da", "di", "del", "della", "du", "des", "la", "le", "von", "van", "der", "den", "ter", "of", "y", "e", "bin", "ibn", "al"]));
export const NAME_PARTICLES_META = Object.freeze({ giver: "lang/mul — nobiliary and linking particles inside personal names (Western/Arabic conventions), a closed class declared here" });
export const NEST_LEVELS = Object.freeze(["full", "prefix", "head", "given", "none"]);
/**
 * THE PARTS OF A NAME ARE A READING PRIOR (2026-09-28, user direction: "those
 * sound like too specialty-fit organs that should be more reading priors").
 * live_priors/derived-priors/name-priors/ carries NamePartsPrior@1 per
 * language — titles, particles, patronymic suffixes with their own length
 * floor — and a reader COMPOSES the languages it reads: an English
 * translation of a Russian novel is en + mul + ru. This organ knows the shape
 * of a name and no language's own classes; `namePartsFrom(...priors)` builds
 * the opts every function here takes. The code-side defaults below are the
 * same lists (so the organ loads with no file on disk) and the prior is the
 * authoritative copy.
 */
export function namePartsFrom(...priors) {
  const foldPart = (t) => String(t ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[.’']+$/u, ""); // foldToken's own rule, stated here because PATRONYMIC_RU below is built at module load, before the const
  const titles = new Set(), particles = new Set(), suffixes = [], givers = [];
  let minLength = Infinity;
  for (const p of priors) {
    if (!p || p.schema !== "NamePartsPrior@1") throw new TypeError("namePartsFrom: a NamePartsPrior@1 with its language and giver");
    givers.push(`${p.language}: ${p.provenance?.giver ?? "giver undeclared"}`);
    for (const t of p.titles ?? []) titles.add(foldPart(t));
    for (const t of p.particles ?? []) particles.add(foldPart(t));
    if (p.patronymic?.suffixes?.length) { suffixes.push(...p.patronymic.suffixes.map((x) => foldPart(x))); minLength = Math.min(minLength, Number(p.patronymic.minLength) || 0); }
  }
  const patronymic = suffixes.length ? Object.freeze((key) => { const k = String(key ?? ""); return k.length >= minLength && suffixes.some((suf) => k.endsWith(suf) && k.length > suf.length); }) : null;
  return Object.freeze({ titles: Object.freeze(titles), particles: Object.freeze(particles), patronymic, languages: priors.map((p) => p.language), givers: Object.freeze(givers) });
}
/** The Russian patronymic class as a code-side default — the SAME suffixes and floor name-parts-ru.json carries (the prior is authoritative; this is what loads with no file on disk). */
// (the bare -ich is deliberately absent: it collides with English family names — Aldrich, Goodrich — at any floor; Kuzmich is the disclosed loss, Ilyich is kept by -yich)
export const PATRONYMIC_RU = namePartsFrom({ schema: "NamePartsPrior@1", language: "ru", provenance: { giver: "lang/ru (code-side default of live_priors name-parts-ru.json)" }, patronymic: { suffixes: ["ovich", "evich", "yich", "ovna", "evna", "ichna", "inichna"], minLength: 6 } }).patronymic;
export const PATRONYMIC_RU_META = Object.freeze({ giver: "lang/ru — patronymic formation from the father's given name (-ович/-евич/-ич, -овна/-евна/-ична), transliterated; the received copy is live_priors/derived-priors/name-priors/name-parts-ru.json" });

const WORD = /[\p{L}\p{N}][\p{L}\p{N}’'.-]*/gu;
export const foldToken = (t) => String(t ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[.’']+$/u, "");

/**
 * nameSpans(surface, opts) → [{ start, end, text, parentIndex, relation }]
 * relation: "head" (root) | "title" | "particle" | "given". Determiners are
 * dropped. Empty for a surface with no name token ("the Count" is a description).
 */
export function nameSpans(surface, { titles = HONORIFIC_TITLES, particles = NAME_PARTICLES, determiners = null, fold = foldToken, patronymic = null } = {}) {
  const det = determiners ?? new Set([...DEFINITE_DETERMINERS, ...INDEFINITE_DETERMINERS]);
  const s = String(surface ?? "");
  const toks = [...s.matchAll(WORD)].map((m) => ({ start: m.index, end: m.index + m[0].length, text: m[0], key: fold(m[0]) }));
  // a determiner is not part of a name at all ("the Count" is a description): dropped, never a head
  const parts = toks.filter((t) => !det.has(t.key)).map((t) => ({ ...t, relation: titles.has(t.key) ? "title" : particles.has(t.key) ? "particle" : patronymic && patronymic(t.key) ? "patronymic" : "name" }));
  const names = parts.filter((p) => p.relation === "name");
  // a patronymic is never the head; a surface of patronymics alone ("Ivanovna") is headed by its last one, disclosed as such
  const head = names.length ? names[names.length - 1] : parts.filter((p) => p.relation === "patronymic").pop();
  if (!head) return [];
  const out = [{ start: head.start, end: head.end, text: head.text, key: head.key, parentIndex: null, relation: "head" }];
  for (const p of parts) if (p !== head) out.push({ start: p.start, end: p.end, text: p.text, key: p.key, parentIndex: 0, relation: p.relation === "name" ? "given" : p.relation });
  return out.sort((a, b) => a.start - b.start).map((x, i, arr) => ({ ...x, parentIndex: x.relation === "head" ? null : arr.findIndex((y) => y.relation === "head") }));
}

// the givens compared for nesting include the patronymic in its place: "Cyril Vladímirovich Bezúkhov" / "Cyril Bezúkhov" is a dropped middle part (prefix), and two patronymics that disagree are two fathers
const shapeOf = (spans) => ({ head: spans.find((x) => x.relation === "head")?.key ?? null, givens: spans.filter((x) => x.relation === "given" || x.relation === "patronymic").map((x) => x.key), patronymic: spans.find((x) => x.relation === "patronymic")?.key ?? null });

/**
 * nameNesting(a, b, opts) → { level, because, shorter, longer }
 *   level: "full" | "prefix" | "head" | "given" | "none"
 */
export function nameNesting(a, b, opts = {}) {
  const sa = nameSpans(a, opts), sb = nameSpans(b, opts);
  if (!sa.length || !sb.length) return { level: "none", because: "a surface with no name token is a description, not a name" };
  const A = shapeOf(sa), B = shapeOf(sb);
  const [short, long, shortIs] = A.givens.length <= B.givens.length ? [A, B, "a"] : [B, A, "b"];
  const eq = (x, y) => x === y;
  if (eq(A.head, B.head)) {
    if (A.givens.length === B.givens.length && A.givens.every((g, i) => eq(g, B.givens[i]))) return { level: "full", because: `same head "${A.head}", same givens [${A.givens.join(" ")}] (titles and particles dropped)`, shorter: shortIs, longer: shortIs === "a" ? "b" : "a" };
    if (short.givens.length === 0) return { level: "head", because: `"${short.head}" is the bare head of "${long.givens.join(" ")} ${long.head}" — a family reference, worn by every member`, shorter: shortIs, longer: shortIs === "a" ? "b" : "a" };
    if (short.givens.every((g, i) => eq(g, long.givens[i]))) return { level: "prefix", because: `same head, givens [${short.givens.join(" ")}] a prefix of [${long.givens.join(" ")}] — a dropped middle name or a different person (P251)`, shorter: shortIs, longer: shortIs === "a" ? "b" : "a" };
    return { level: "none", because: `same head "${A.head}", givens disagree ([${A.givens.join(" ")}] vs [${B.givens.join(" ")}]) — two beings under one family` };
  }
  // a bare one-token name may be the other's given name
  const bare = A.givens.length === 0 && B.givens.length === 0 ? null : A.givens.length === 0 ? [A, B, "a"] : B.givens.length === 0 ? [B, A, "b"] : null;
  if (bare && bare[1].givens.some((g) => eq(g, bare[0].head))) return { level: "given", because: `"${bare[0].head}" is a given name of "${bare[1].givens.join(" ")} ${bare[1].head}" — a first-name reference, unique only if the cast holds one`, shorter: bare[2], longer: bare[2] === "a" ? "b" : "a" };
  // given + patronymic against given + patronymic + family ("Cyril Vladímirovich" / "Cyril Vladímirovich Bezúkhov"): the shorter's
  // head is a given of the longer AND the patronymics agree — still a first-name reference, but one the patronymic narrows to one father
  const withPat = A.patronymic && B.patronymic && eq(A.patronymic, B.patronymic) ? (A.givens.length < B.givens.length ? [A, B, "a"] : B.givens.length < A.givens.length ? [B, A, "b"] : null) : null;
  if (withPat && withPat[1].givens.some((g) => eq(g, withPat[0].head))) return { level: "given", patronymicAgrees: true, because: `"${withPat[0].head} ${withPat[0].patronymic}" is the given name and patronymic of "${withPat[1].givens.join(" ")} ${withPat[1].head}" — a first-name reference narrowed to one father`, shorter: withPat[2], longer: withPat[2] === "a" ? "b" : "a" };
  return { level: "none", because: `heads differ ("${A.head}" vs "${B.head}")` };
}
