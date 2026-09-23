// native/eval/the-fold/claim-null-scoring.mjs — the shared currency for
// scoring ANY reading pipeline (any route, any language) against gold and
// a structural null, extracted from gfp-vs-svo-first.mjs so it has one
// owner instead of being re-derived per script.
//
// Every piece here is generic:
//   rootTripleFrom  — UD deprel/upos labels are universal, so this reads
//                      off ANY language's gold or predicted CoNLL-U-shaped
//                      rows, not just English's.
//   sameAct         — a surface form may match a gold LEMMA via the house
//                      stemsOf suffix rule (morphology.js). MATCHING ONLY:
//                      never used to construct a prediction from gold.
//   claimsMatch     — two kernel/gfp-claim.js claims agree if rel/ARG0/ARG1
//                      all sameAct.
//   scoreClaims     — coverage (gold found) + precision (emitted, correct)
//                      over a { predictions, gold } pairing, per item.
//   scrambleTokens  — seeded per-item Fisher-Yates, the Born/structural
//                      null: a route reading real structure should collapse
//                      under it; one reading co-occurrence shouldn't.
//   fisherGreater   — one-sided Fisher exact (natural > null), log-factorial,
//                      no external dependency.

import { stemsOf } from "../../adapters/text/morphology.js";
import { seeded } from "../../adapters/text/english-parser.js";

/** Read a {arg0, rel, arg1} triple off any UD-shaped token array (any
 *  language: upos/deprel/head/id/lemma/form are UD's own universal labels).
 *  Declared restriction: matrix-clause predicates only (deprel === "root"),
 *  and only when both an nsubj* and an obj/iobj dependent exist -- keeps
 *  the rule deterministic and simple, not tuned per language or per case.
 *
 *  `by` picks which column the triple is built from. "lemma" (default) is
 *  right where the reader's own output carries a lemma (english-parser.js
 *  does). "form" is surface-to-surface -- the right choice when scoring a
 *  reader that only ever returns surface tokens (relations-gfp.js,
 *  relations-positional.js, relations-case-marked.js): it sidesteps a
 *  language's lemma normalization entirely rather than requiring it first.
 *  Measured directly (2026-09-23): for Arabic, gold LEMMA is fully
 *  vocalized while surface text never is, so no surface string can ever
 *  lemma-match; FORM avoids that by construction. lens-direction.mjs's own
 *  triplesOf() already does this and gets non-zero cross-lingual matches. */
export function rootTripleFrom(tokens, { by = "lemma" } = {}) {
  const byHead = new Map();
  for (const t of tokens) {
    if (t.head == null) continue;
    if (!byHead.has(t.head)) byHead.set(t.head, []);
    byHead.get(t.head).push(t);
  }
  const root = tokens.find((t) => t.upos === "VERB" && t.deprel === "root");
  if (!root) return null;
  const kids = byHead.get(root.id) ?? [];
  const subj = kids.find((t) => /^nsubj/.test(t.deprel));
  const obj = kids.find((t) => t.deprel === "obj") ?? kids.find((t) => t.deprel === "iobj");
  if (!subj || !obj) return null;
  const col = by === "form" ? "form" : "lemma";
  return { arg0: subj[col], rel: root[col], arg1: obj[col] };
}

/** MATCHING-only surface/lemma equivalence via the house stemsOf suffix
 *  rule, both directions. Never called during prediction construction. */
export function sameAct(surface, lemma) {
  const s = String(surface).toLowerCase();
  const l = String(lemma).toLowerCase();
  if (s === l) return true;
  if (stemsOf(s).has(l)) return true;
  if (stemsOf(l).has(s)) return true;
  return false;
}

/** Do two kernel/gfp-claim.js claims (from claimFromTriple) agree? */
export function claimsMatch(a, b) {
  if (!a || !b) return false;
  if (!sameAct(a.rel, b.rel)) return false;
  if (!sameAct(a.roles.ARG0 ?? "", b.roles.ARG0 ?? "")) return false;
  if (!sameAct(a.roles.ARG1 ?? "", b.roles.ARG1 ?? "")) return false;
  return true;
}

/** Score a route's per-item claim lists against per-item gold claims.
 *  `gold` and `bySentenceClaims` are parallel arrays, one entry per item
 *  (sentence), each entry either a single claim/null (gold) or an array
 *  of emitted claims (predictions) -- the same shape gfp-vs-svo-first.mjs
 *  already produces for both its routes. */
export function scoreClaims(bySentenceClaims, gold) {
  const goldCount = gold.filter(Boolean).length;
  let coveredGold = 0, emitted = 0, emittedCorrect = 0;
  for (let i = 0; i < gold.length; i += 1) {
    const g = gold[i];
    const preds = bySentenceClaims[i] ?? [];
    emitted += preds.length;
    let hit = false;
    for (const p of preds) if (claimsMatch(p, g)) { hit = true; emittedCorrect += 1; }
    if (g && hit) coveredGold += 1;
  }
  return {
    coverage: goldCount ? coveredGold / goldCount : 0,
    coveredGold, goldCount,
    precision: emitted ? emittedCorrect / emitted : 0,
    emittedCorrect, emitted,
  };
}

/** Seeded per-item scramble (Fisher-Yates), the structural/lexical null.
 *  `tokens` is any array with a `.form` (or pass an array of strings). */
export function scrambleTokens(tokens, seedKey) {
  const rand = seeded(seedKey);
  const forms = tokens.map((t) => (typeof t === "string" ? t : t.form));
  for (let i = forms.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [forms[i], forms[j]] = [forms[j], forms[i]];
  }
  return forms;
}

// ── one-sided Fisher exact test, via log-factorial (no dependency) ────────
function lfact(n) { let s = 0; for (let i = 2; i <= n; i += 1) s += Math.log(i); return s; }
function lchoose(n, k) { if (k < 0 || k > n) return -Infinity; return lfact(n) - lfact(k) - lfact(n - k); }
/** P(X >= a) under the hypergeometric null for 2x2 table [[a,b],[c,d]] --
 *  "is row 1's hit rate greater than row 2's," one-sided. */
export function fisherGreater(a, b, c, d) {
  const n = a + b + c + d;
  const row1 = a + b, col1 = a + c;
  let p = 0;
  const hi = Math.min(row1, col1);
  for (let x = a; x <= hi; x += 1) {
    p += Math.exp(lchoose(row1, x) + lchoose(n - row1, col1 - x) - lchoose(n, col1));
  }
  return Math.min(1, Math.max(0, p));
}
