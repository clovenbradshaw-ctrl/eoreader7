import { DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS, COPULA_PARADIGM, SUBJECT_PRONOUNS, NEVER_A_NAME, SENTENCE_TERMINATORS } from "./priors.js";

const WORD = /\p{L}[\p{L}\p{M}'’]*/gu;
const TITLE = /^\p{Lu}/u;
const LOWER = /^\p{Ll}/u;
const DETERMINERS = new Set([...DEFINITE_DETERMINERS, ...INDEFINITE_DETERMINERS]);
const APPOSITIONAL_DELIMITER = /^\s*[,;:—–-]\s*$/u;
const APPOSITIONAL_CLOSE = /^\s*[,;:—–-]/u;
const norm = (x) => String(x ?? "").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const rows = (text) => [...String(text ?? "").matchAll(WORD)].map((m, at) => ({
  token: m[0],
  key: norm(m[0]),
  at,
  charStart: m.index,
  charEnd: m.index + m[0].length,
}));

const supportEvidence = (text, witness, giver) => {
  const rs = rows(text);
  const supports = [];
  for (let i = 0; i < rs.length; i += 1) {
    if (!DETERMINERS.has(rs[i].key)) continue;
    // Conservative English shape: determiner + 1..2 lowercase descriptor
    // tokens + appositional delimiter + one Title-case naming token + close.
    for (let nameAt = i + 2; nameAt <= Math.min(i + 3, rs.length - 1); nameAt += 1) {
      if (!TITLE.test(rs[nameAt].token)) continue;
      const descriptorRows = rs.slice(i + 1, nameAt);
      if (!descriptorRows.length || !descriptorRows.every((x) => LOWER.test(x.token))) continue;
      const delimiter = text.slice(descriptorRows.at(-1).charEnd, rs[nameAt].charStart);
      if (!APPOSITIONAL_DELIMITER.test(delimiter)) continue;
      const afterName = text.slice(rs[nameAt].charEnd, rs[nameAt + 1]?.charStart ?? text.length);
      if (!APPOSITIONAL_CLOSE.test(afterName)) continue;
      supports.push(Object.freeze({
        left: [rs[i].key, ...descriptorRows.map((x) => x.key)].join(" "),
        right: rs[nameAt].key,
        witness,
        giver,
        reason: "text_appositional_identity",
      }));
    }
  }
  return supports;
};

/**
 * COPULAR IDENTITY: `<Name> <copula> <determiner> <descriptor>`.
 *
 * Built because the two shapes above found ZERO evidence in a whole chapter
 * of real narrative prose (Alice, ch1) — measured, not assumed. That chapter
 * states its one explicit identity with a copula ("Dinah was the cat"), and
 * neither apposition nor separated co-presence reads it. An identity organ
 * that cannot read the commonest English way of stating an identity is an
 * organ with no input, and it will pass its own tests forever.
 *
 * THE COPULA IS RECEIVED, NEVER TYPED HERE: `COPULA_PARADIGM` (priors.js,
 * giver lang/en). Its own header's scope warning is inherited and matters —
 * that table folds `is` with `was` and carries NO tense, so this reads "the
 * same ACT of identification", never "the same claim at the same time". A
 * consumer that needs "when" must get it elsewhere; this shape does not
 * supply it.
 *
 * A NOMINAL COMPLEMENT IS REQUIRED, and that requirement is what keeps this
 * conservative. A copula alone is not identity — "Alice was tired" and "it
 * was too dark" are predications about a state, not claims that two forms
 * name one being. Demanding a DETERMINER before the descriptor is what
 * separates "Dinah was THE CAT" (identity) from "Alice was tired" (not), and
 * it uses the determiner classes this file already receives rather than a
 * new part-of-speech test.
 *
 * This is EVIDENCE, never a verdict: it opens a `live_hypothesis` that
 * separated co-presence can still attack, exactly as apposition does.
 */
const copularEvidence = (text, witness, giver) => {
  const rs = rows(text);
  const supports = [];
  for (let i = 0; i < rs.length; i += 1) {
    if (!TITLE.test(rs[i].token)) continue;                 // a naming token
    // "That was a narrow escape" must not open `a narrow escape <-> that`.
    // The first cut of this fix added a sentence-initial position rule for
    // that — wrong twice over: it breaks a legitimate name at position 0
    // (this organ is called per sentence, so "Dinah was the cat" has Dinah
    // first), and it was unnecessary, because "that" is ALREADY in both
    // DEFINITE_DETERMINERS and SUBJECT_PRONOUNS. The received closed classes
    // covered it; a new positional rule did not need inventing.
    if (SUBJECT_PRONOUNS.has(rs[i].key) || NEVER_A_NAME.has(rs[i].key) || DETERMINERS.has(rs[i].key)) continue;
    const cop = rs[i + 1];
    if (!cop || !COPULA_PARADIGM[cop.key]) continue;        // received copula
    const det = rs[i + 2];
    if (!det || !DETERMINERS.has(det.key)) continue;        // nominal, not adjectival
    // ONE SITE, ONE HYPOTHESIS, AND THE MINIMAL NOMINAL. The first cut
    // emitted a hypothesis per descriptor length, so one piece of evidence
    // opened two overlapping live alternatives (`london <-> the capital` AND
    // `london <-> the capital of`) that could never both be corroborated.
    // Widening to the longest run was worse: "London was the capital of
    // Paris" ran the descriptor into the preposition. Determiner + exactly
    // one descriptor is what this file can defend without a preposition
    // prior it does not receive — "the cat", "the capital". A multi-word
    // nominal is real and unread here, named rather than guessed at.
    const descriptorRows = rs.slice(i + 3, i + 4);
    if (!descriptorRows.length || !descriptorRows.every((x) => LOWER.test(x.token))) continue;
    supports.push(Object.freeze({
      left: rs[i].key,
      right: [det.key, ...descriptorRows.map((x) => x.key)].join(" "),
      witness,
      giver,
      reason: "text_copular_identity",
    }));
  }
  return supports;
};

const phraseStarts = (rs, phrase) => {
  const target = norm(phrase).split(/\s+/).filter(Boolean);
  const starts = [];
  if (!target.length) return starts;
  for (let i = 0; i <= rs.length - target.length; i += 1) {
    let match = true;
    for (let j = 0; j < target.length; j += 1) {
      if (rs[i + j].key !== target[j]) { match = false; break; }
    }
    if (match) starts.push({ start: i, end: i + target.length - 1 });
  }
  return starts;
};

// ── THE LIVE ALTERNATIVES, INDEXED BY FIRST TOKEN, ONCE PER ARRAY (2026-09-07)
// attackEvidence ran phraseStarts over the whole sentence twice per live
// alternative, every sentence; the alternatives grow with the read.
// Profiled at 480 KB of War and Peace: 5% of the read, growing 12x for 2x
// the sentences. `fold.unresolvedAlternatives` is one array until an
// alternative changes (copy-on-write in the kernel), so the index is built
// once per array; per sentence, only alternatives whose left or right
// phrase BEGINS with a token of the sentence are candidates, and they are
// visited in the array's own order. An alternative both of whose sides
// begin with a token absent from the sentence had no hits before either.
const ALT_INDEX = new WeakMap();
const alternativesIndex = (alternatives) => {
  let idx = ALT_INDEX.get(alternatives);
  if (idx) return idx;
  const byFirst = new Map();
  const rows_ = [];
  (alternatives ?? []).forEach((identity, i) => {
    if (identity?.schema !== "EOIdentityAlternative@1" || identity.standing === "distinct" || identity.standing === "refused") return;
    const leftT = norm(identity.left).split(/\s+/).filter(Boolean);
    const rightT = norm(identity.right).split(/\s+/).filter(Boolean);
    const row = { identity, i, leftT, rightT, leftWidth: norm(identity.left).split(/\s+/).length, key: `${norm(identity.left)}\u0000${norm(identity.right)}`, rkey: `${norm(identity.right)}\u0000${norm(identity.left)}` };
    rows_.push(row);
    for (const t of new Set([leftT[0], rightT[0]].filter(Boolean))) { if (!byFirst.has(t)) byFirst.set(t, []); byFirst.get(t).push(row); }
  });
  idx = { byFirst, rows: rows_ };
  ALT_INDEX.set(alternatives, idx);
  return idx;
};

/** phraseStarts, given the sentence's positions by first token — the same starts, in the same ascending order. */
const phraseStartsAt = (rs, target, first) => {
  const starts = [];
  if (!target.length) return starts;
  for (const i of first.get(target[0]) ?? []) {
    if (i > rs.length - target.length) continue;
    let match = true;
    for (let j = 1; j < target.length; j += 1) if (rs[i + j].key !== target[j]) { match = false; break; }
    if (match) starts.push({ start: i, end: i + target.length - 1 });
  }
  return starts;
};

const attackEvidence = (text, alternatives, supports, witness, giver) => {
  const rs = rows(text);
  const supportKeys = new Set(supports.map((x) => `${norm(x.left)}\u0000${norm(x.right)}`));
  const attacks = [];
  const first = new Map();
  rs.forEach((r, i) => { if (!first.has(r.key)) first.set(r.key, []); first.get(r.key).push(i); });
  const { byFirst } = alternativesIndex(alternatives);
  const candidates = new Map(); // original index -> row
  for (const t of first.keys()) for (const row of byFirst.get(t) ?? []) candidates.set(row.i, row);
  for (const row of [...candidates.values()].sort((a, b) => a.i - b.i)) {
    const { identity } = row;
    const leftHits = phraseStartsAt(rs, row.leftT, first);
    const rightHits = phraseStartsAt(rs, row.rightT, first);
    if (!leftHits.length || !rightHits.length) continue;
    if (supportKeys.has(row.key) || supportKeys.has(row.rkey)) continue;

    const leftWidth = row.leftWidth;
    const separated = leftHits.some((left) => rightHits.some((right) => {
      const leftCenter = (left.start + left.end) / 2;
      const rightCenter = (right.start + right.end) / 2;
      return Math.abs(rightCenter - leftCenter) > leftWidth + 3;
    }));
    if (!separated) continue;
    attacks.push(Object.freeze({
      left: identity.left,
      right: identity.right,
      witness,
      giver,
      reason: "text_separated_copresentation",
    }));
  }
  return attacks;
};

/**
 * English identity evidence from already-witnessed text.
 *
 * Apposition is support, not proof. Separated co-presentation of both sides of
 * a live alternative is incompatible multiplicity and attacks it. No synonymy,
 * similarity, or world knowledge is introduced here.
 */
export function textIdentityEvidence(text, { alternatives = [], witness = null, giver = "lang/en:text-identity@1" } = {}) {
  const source = String(text ?? "");
  const supports = [...supportEvidence(source, witness, giver), ...copularEvidence(source, witness, giver)];
  const attacks = attackEvidence(source, alternatives, supports, witness, giver);
  return Object.freeze({
    schema: "EOTextIdentityEvidence@1",
    supports: Object.freeze(supports),
    attacks: Object.freeze(attacks),
  });
}
