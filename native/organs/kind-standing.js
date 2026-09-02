// kind-standing.js — what KIND of thing is this referent? Measured from the
// material's own company, never taught, and gated by a null that is licensed
// for the question actually being asked.
//
// WHY THIS EXISTS. Three cast defects found reading Dracula live all reduce
// to one absence: the reader could not tell what kind of thing a referent
// was, so `Castle Dracula` folded into `Count Dracula` on a shared final
// token. A fold gate needs a STANDING to consult, and nothing produced one.
//
// FEATURES: NOTHING NAMED, NOTHING TAUGHT. The only evidence is the token
// immediately before and immediately after each mention — Firth's company,
// which P31 already cites. No part of speech, no semantic label, no word
// list. Sentence start is its own token, so position is evidence too.
//
// COUNTS, NOT SETS. A presence/absence profile destroys the signal: "Van
// Helsing" genuinely has `before=to` (14x), swamped by `^`(78) and `dr`(63).
// Membership cannot express "mostly prepositions" vs "mostly subject
// position"; a count vector can. Measured: a PMI gate over presence sets was
// tried at three thresholds and did not separate anything.
//
// ── THE NULL, AND TWO THAT WERE REFUTED BEFORE THIS ONE ──────────────────
//
// A10: before spending a null, check the pair is licensed — a statistic
// insensitive to its perturbation fails invisibly. Three were measured here,
// and only the third answers the membership question:
//
//  (1) RANDOM SUBSETS OF THE SAME POPULATION (the engine's own basin null,
//      entity-kind-induction.js). Degenerate when the basin approaches the
//      population: a random 149-subset of 174 entities is nearly the observed
//      set, so it passed a "kind" containing 85% of everything. It concealed
//      a real kind, not merely a false one.
//
//  (2) REDEALING WHICH ENTITY EACH MENTION BELONGS TO. Sound for asking
//      whether STRUCTURE EXISTS at all — observed binding energy 0.2657
//      against a 200-draw maximum of 0.2009, censored above. But insensitive
//      to MEMBERSHIP: adding one outsider to a cohesive ten-member set barely
//      moves binding energy, so every candidate "passed", including Mina and
//      Van Helsing against a set of places. Right question, wrong grain.
//      It also runs BACKWARDS for raw similarity — redealing gives every
//      entity the corpus-average profile, so redealt entities are MORE alike
//      than real ones (null median 0.400, max 0.950). Real entities are
//      specialised, therefore less similar. Agglomerating on "observed
//      similarity beats the null" stalls at all-singletons for that reason.
//
//  (3) THE POPULATION ITSELF (what ships). Nothing is redealt. The question
//      "is X a member of kind K" is answered by asking whether X sits closer
//      to K's members than the rest of the material does. The comparison is
//      every other entity, measured, not simulated.
//
// VALIDATED BY ITS OWN CONTROLS, not asserted: 9 of 10 declared members of a
// place-kind recover as members; the tenth (Purfleet, p≈0.10) is genuinely
// marginal and is reported as such rather than rounded in. `Castle Dracula`
// reads MEMBER (rank 3/100); `Count Dracula` reads not-a-member (43/100);
// Van Helsing, Mina, Lucy and Renfield all correctly not-places.
//
// DISCLOSED, NOT SILENTLY ABSENT. A referent with few mentions has a thin
// profile and lands not-a-member for lack of evidence rather than for
// evidence of difference — `East Cliff` (61/100) is exactly that case, which
// is why the East/West Cliff conflation is NOT closed by this. A verdict of
// `unknown` below is that state, and a gate must treat it as "no standing",
// never as "different kind".
//
// PURE. Sentences and surfaces arrive as arguments; this module reads no
// engine of its own (the cast.js posture).

/** A referent's company, as a raw count vector over `before=`/`after=` tokens. */
export function contextVectors(sentences, surfaces, { clean } = {}) {
  const toks = clean ?? ((t) => t.replace(/^[^\p{L}]+|[^\p{L}'’]+$/gu, ""));
  const vecs = new Map(surfaces.map((s) => [s, new Map()]));
  for (const sent of sentences) {
    const words = String(sent.text ?? sent).split(/\s+/).map(toks);
    for (const s of surfaces) {
      const pw = s.split(" ");
      for (let i = 0; i + pw.length <= words.length; i++) {
        if (!pw.every((w, k) => words[i + k] === w)) continue;
        const v = vecs.get(s);
        const before = i > 0 ? words[i - 1].toLowerCase() : "^";
        const after = i + pw.length < words.length ? words[i + pw.length].toLowerCase() : "$";
        v.set(`before=${before}`, (v.get(`before=${before}`) ?? 0) + 1);
        v.set(`after=${after}`, (v.get(`after=${after}`) ?? 0) + 1);
      }
    }
  }
  for (const [k, v] of [...vecs]) if (!v.size) vecs.delete(k);
  return vecs;
}

const dot = (a, b) => { let s = 0; for (const [k, v] of a) s += v * (b.get(k) ?? 0); return s; };
export const cosine = (a, b) => { const d = Math.sqrt(dot(a, a)) * Math.sqrt(dot(b, b)); return d ? dot(a, b) / d : 0; };

/** Mean similarity of `x` to a kind's members, always leaving `x` itself out. */
export function kindFit(x, members, vecs) {
  const vx = vecs.get(x);
  if (!vx) return null;
  const ms = members.filter((k) => k !== x && vecs.has(k));
  if (!ms.length) return null;
  return ms.reduce((a, k) => a + cosine(vx, vecs.get(k)), 0) / ms.length;
}

/**
 * Is `x` a member of the kind `members` name? The null is the POPULATION —
 * every entity that is not a declared member — and `alpha` is the caller's,
 * never defaulted here (P4: numbers are declared).
 *
 * Returns a typed verdict, never a bare boolean: `unknown` when `x` has no
 * profile at all, which a gate must not read as "a different kind".
 */
export function kindMembership(x, members, vecs, { alpha }) {
  if (!Number.isFinite(alpha)) throw new Error("kindMembership: alpha must be declared");
  const fit = kindFit(x, members, vecs);
  if (fit === null) return { verdict: "unknown", reason: "no_profile", fit: null, p: null };
  const population = [...vecs.keys()].filter((y) => !members.includes(y));
  const nulls = population.map((y) => kindFit(y, members, vecs)).filter((v) => v !== null);
  if (nulls.length < 2) return { verdict: "unknown", reason: "no_population", fit, p: null };
  const above = nulls.filter((v) => v >= fit).length;
  const p = above / nulls.length;
  return { verdict: p < alpha ? "member" : "not_member", fit, p, populationSize: nulls.length };
}

/**
 * May these two referents be folded into one? A fold is REFUSED only on
 * positive evidence that the two carry DIFFERENT standings — never on
 * absence. `unknown` on either side yields `allow`, because a thin profile
 * is a fact about the reader, not about the referents.
 */
export function foldPermitted(a, b, members, vecs, { alpha }) {
  const ma = kindMembership(a, members, vecs, { alpha });
  const mb = kindMembership(b, members, vecs, { alpha });
  if (ma.verdict === "unknown" || mb.verdict === "unknown") return { permitted: true, reason: "no_standing", a: ma, b: mb };
  if (ma.verdict !== mb.verdict) return { permitted: false, reason: "different_kind", a: ma, b: mb };
  return { permitted: true, reason: "same_kind", a: ma, b: mb };
}

// ── discovered company-kinds: the kind names itself by its own signature ──
//
// User direction (2026-09-01, near-verbatim): "that there are words that
// sometimes have 'a' in front of it shouldn't be a hard written rule, it
// should be a discovered kind, and that kind can be addressable, and we can
// have a name for it in the hyperlexicon." This is the same question the
// module already answers for referents, one grain down: what kind of thing
// is this WORD, from the company it keeps — taught nothing, named by the
// material's own evidence.
//
// Measured on the real War and Peace HEARD stream (case- and diacritic-
// folded — the ear has no case) before this was built: general/count/
// emperor/colonel/captain all announce `before=the` as their dominant
// company (17–46% of it); kutuzov/napoleon/pierre/rostov/denisov all
// announce `before=^` with determiners absent; kutuzov~napoleon cosine
// 0.949 vs general~kutuzov 0.214. The kinds are real and the signature IS
// the name: `kind:before=the`, `kind:before=^`. One candidate signal was
// measured and REFUSED the same hour: cross-kind precedence ("titles front
// many different names") reads 0.6% at any practical sample of the name
// kind, because a title fronts hundreds of names — do not retry it as a
// gate.
//
// The structural distinction a consumer may lean on WITHOUT a word list: a
// kind signed by a WORD (members share an actual preceding word) is a
// frame-kind; a kind signed by POSITION alone (`^` — the absence of a
// preceding word) is not. `^` is not a word of any language, so this is
// structure, not English.

/**
 * discoverCompanyKinds(sentences, vocabulary, {minMentions, minShare,
 * minMembers}) — group words by the dominant `before=` feature of their own
 * company, at a declared share floor, keeping only kinds with a declared
 * minimum of members. All three numbers are the caller's (P4). Returns
 * [{name, signature, share: Map(word -> dominant share), members}], kinds
 * named mechanically by their own signature. The II.23 control lives with
 * the tests: shuffling words within sentences (marginals kept, company
 * destroyed) must dissolve every kind at the same declared floors.
 */
export function discoverCompanyKinds(sentences, vocabulary, { minMentions, minShare, minMembers } = {}) {
  for (const [k, v] of Object.entries({ minMentions, minShare, minMembers }))
    if (!Number.isFinite(v)) throw new Error(`discoverCompanyKinds: ${k} must be declared`);
  const vecs = contextVectors(sentences, vocabulary);
  const bySignature = new Map();
  for (const [word, v] of vecs) {
    let total = 0, best = null, bestN = 0;
    for (const [f, n] of v) {
      if (!f.startsWith("before=")) continue;
      total += n;
      if (n > bestN) { bestN = n; best = f; }
    }
    if (!best || total < minMentions) continue;
    const share = bestN / total;
    if (share < minShare) continue;
    if (!bySignature.has(best)) bySignature.set(best, []);
    bySignature.get(best).push({ word, share });
  }
  const kinds = [];
  for (const [signature, members] of bySignature) {
    if (members.length < minMembers) continue;
    kinds.push({
      name: `kind:${signature}`,
      signature,
      members: members.map((m) => m.word),
      share: new Map(members.map((m) => [m.word, m.share])),
    });
  }
  return kinds;
}

/**
 * kindNotes(kinds, {witness}) — project discovered kinds into the shape the
 * hyperlexicon's `hear` admits, one assertion per membership: subject the
 * word, verb "keeps-company", object the kind's own name, `because` the
 * measured share. The kind becomes ADDRESSABLE — assertionId("general",
 * "keeps-company", "kind:before=the") — so a future organ consults the note
 * instead of re-deriving the measurement.
 */
export function kindNotes(kinds, { witness } = {}) {
  if (!witness) throw new Error("kindNotes: witness (the source these kinds were discovered in) must be named");
  const notes = [];
  for (const kind of kinds)
    for (const word of kind.members)
      notes.push({
        subject: word,
        verb: "keeps-company",
        object: kind.name,
        witness,
        because: `${kind.signature} carries ${(kind.share.get(word) * 100).toFixed(0)}% of its before-company in ${witness}`,
      });
  return notes;
}

/**
 * frameWords(kinds) — the structural consumption, stated once: members of
 * every kind whose signature is a WORD-frame (not `^`/`$`, which are
 * positions, not words). A consumer treating these as non-referent-picking
 * is consuming a discovered kind by its address, not re-writing a rule.
 */
export function frameWords(kinds) {
  const out = new Set();
  for (const kind of kinds) {
    const tok = kind.signature.slice("before=".length);
    if (tok === "^" || tok === "$") continue;
    for (const w of kind.members) out.add(w);
  }
  return out;
}
