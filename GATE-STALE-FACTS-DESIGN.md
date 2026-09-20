# Gate: stale/wrong parametric facts shipped with false confidence

Bug: gemma2:2b answers a time-sensitive factual question ("who is president?") from
parametric memory, states it with full confidence, and it ships as the final chat
answer with zero mechanical veto. Two bypass points, both confirmed by reading
`proxy-runner.mjs`.

## Bypass 1: the small-talk fast path (~3301-3342)

The fast path's regex gate (`isSmallTalk`, ~3308-3312) only classifies the query
shape — greeting/ack/name-exchange patterns. It says nothing about the *answer*.
The bug is that a query can be short-and-conversational-shaped ("who's president
these days?") while still landing on this path and asserting a checkable claim in
`fullText`. Today `fullText` streams straight to `earlyResult` (line 3341) with
no verdict machinery at all — not even the cosmetic postprocess touches facts.

**Fix shape: don't try to pre-classify the query. Gate the OUTPUT of the fast
path exactly like the main path gates its output, then decide fast-vs-slow by
what came back.**

The fast path is an optimization for genuinely contentless turns (greetings,
acks). The existing regex is a reasonable pre-filter for latency (skip the full
KB/surf pipeline for `hi`/`thanks`), but it must not double as a promise that the
*answer* is safe. So: keep the regex as the entry gate (unchanged, ~3308-3312),
but before `earlyResult` returns, run the SAME sentence-verdict pass the main
path runs at ~5404-5461, using the organs already imported there
(`readAnswerClaims`, `claimKindsOf`, `sentenceSurface`, `answerRecord` from
`native/organs/hypergraph.js` / `native/organs/witness-sentences.js` /
`native/organs/grounding.js`). Concretely, factor the block at ~5404-5461 into a
shared helper and call it from both sites:

```js
// new: factor out of the 5404-5461 block, keep exact same body
async function readingSurfaceFor(text, { surfacedSegments, rawEntries, session, task, model, charter, onNote, isCode }) { ... }
```

Call it from the fast path:

```js
let text = fullText;
if (fullText.trim()) { ...postprocessAnswer... }
const rs = await readingSurfaceFor(text, { surfacedSegments: [], rawEntries: [], session, task, model, charter, onNote, isCode: false });
const verdictOut = applyVerdictGate(text, rs);   // see Bypass 2 below — SAME function, reused
if (onNote) onNote({ move: "fast_path", shape: "chat", chars: fullText.length, gated: verdictOut.gated });
return earlyResult(verdictOut.text, { answerShape: "chat", truncated: fastTruncated, void: verdictOut.void });
```

Because `surfacedSegments` is empty on the fast path (no workspace/web surf ran),
`passages.length` is 0, so `readAnswerClaims` returns `[]` and every claim in the
answer is UNGROUNDED BY DEFINITION — there is nothing to check it against. This
is the crux of the honesty-check below: on the fast path specifically, the gate
cannot produce `contradicted` (there's no corpus to contradict against) — it can
only ever detect "checkable claim, zero passages backing it," which is its own
distinct verdict, not one of the four ladder rungs. That has to be added (see
"New verdict" below) rather than reusing `unbound`/`beyond-reach`, which
currently mean "contradicted a specific competing claim" / "no reading order
reached it" — different failure modes than "no material exists to check against
at all."

## New mechanical signal: "checkable-but-unsourced"

Don't write a new classifier. `claimKindsOf` (`native/organs/output-claims.js`,
wired at ~5424-5432) already derives claim *forms* (hypothetical/sequence
register) mechanically from sentence structure — no keyword list, no "president"
regex. Extend its existing form vocabulary with one more form: an
**assertoric-current-state claim** — a declarative sentence whose head verb is
present-tense stative/identity ("is", "serves as", "holds the office of") bound
to a proper-noun or role-noun subject, with no attached temporal qualifier
(no date, no "as of", no "was"). This is the same class of test `sentenceSurface`
already runs to find claims at all — it's asking for one more mechanical
predicate on the sentences that pass, not a semantic classifier. Reuse
`extractAtoms`/`splitSentences` from `native/organs/grounding.js` (already
imported at the reading-surface site) — the tense/qualifier check is a POS-shape
test on the atom, not a lookup table, so it stays general (any officeholder,
price, "currently the largest," "the latest version of X," etc., not just
president).

Then the rule is: for every claim `sentenceSurface` marks with this form AND zero
supporting passages (`claims.filter(c => c.forms includes "assertoric-current" && c.restsOn.length === 0)`), tag verdict `"unsourced-current"` (new, distinct from the
four ladder verdicts — those describe corpus relationships, this describes the
absence of any corpus at all).

## Bypass 2: main path never vetoes (~5960-5993)

`readingSurface.record` and `.claims` are computed at ~5404-5461 but the return
object at ~5940-5993 never reads them — `text` reaching the client is whatever
`postprocessCode`/`postprocessAnswer` produced, cosmetic only.

**Fix: add one gate function, called from both paths (fast + main), applied
right after `readingSurface` is computed and before `text` is finalized:**

```js
// native/organs/fact-gate.js (new, small; composes existing organs, invents no new judgment)
export function applyVerdictGate(text, readingSurface, { now = new Date() } = {}) {
  if (!readingSurface) return { text, gated: false, void: null };
  const { claims } = readingSurface;
  const bad = claims.filter(c =>
    c.verdict === "contradicted" ||
    c.verdict === "unsourced-current"   // the new form from above
  );
  if (!bad.length) return { text, gated: false, void: null };
  // MECHANICAL rewrite, not model-generated: strike the flagged sentence(s),
  // splice in a computed fallback line. The model is not asked to rephrase,
  // apologize, or hedge — this function does the sentence surgery.
  let out = text;
  for (const c of bad) {
    const fallback = c.verdict === "contradicted"
      ? `[checked against the surfaced material and found to conflict — withheld]`
      : `I don't have a grounded source for this as of ${now.toISOString().slice(0,10)}; my training data may be stale on this point.`;
    out = out.replace(c.sentence, fallback);
  }
  return { text: out, gated: true, void: { reason: "unsourced-current-or-contradicted", count: bad.length } };
}
```

Wire it in at ~5461 (right after `readingSurface` is built) and thread
`verdictOut.text` into the `text` used for `post`/final return, and surface
`verdictOut.void` in the existing `void:` block at ~5988-5992 (it already has a
`satisfied` field — add `gated`/`reason` alongside it, don't invent a parallel
channel).

**Why replace-not-refuse:** refusing the whole turn is not proportionate — most
answers have one flagged sentence among several fine ones (the small-talk
identity-exchange case, a one-line factual answer, etc.). Sentence-level strike
+ computed fallback matches the ladder's own granularity (verdicts are already
per-sentence) and matches this project's established pattern in `firewall.js`
(`strikeAddresses` — strike-and-replace at the text level, never a full block).
**Why the fallback text is hard-coded and date-stamped, not model-phrased:**
direct application of "model is just the mouth" — the model doesn't get asked to
write a disclaimer (that reopens the door to it asserting something else wrong,
or refusing to hedge); the fallback string is assembled by `applyVerdictGate`
from the verdict and `now`, full stop.

## No hand-set thresholds

There's no numeric cutoff needed here — the gate is binary per sentence
(claim carries a bad verdict, or it doesn't), so there's nothing to derive from a
null. The one place a threshold could sneak in — how many flagged sentences
before the WHOLE turn is withheld instead of patched — should also stay
threshold-free: patch every flagged sentence individually, always; never count
them against a cutoff.

## Honesty check: does the existing witness machinery even have a corpus to check "president" against?

**No, and this must be said plainly.** `readAnswerClaims`/`hypergraph.js`'s
verdict machinery (`contradicted`, `unbound`, `beyond-reach`, `unheard`) all
operate over `passages` — material the session actually surfed (workspace files,
web results, ingested corpus). For a bare chat turn with no workspace/web surf
(which is exactly the fast-path and many main-path chat turns), `passages` is
empty or unrelated, so there is *nothing to contradict*. The ladder as it
exists today can only catch a claim that conflicts with material the session
itself pulled in this turn — it was built for "does the answer match what we
just read," not "is this current-affairs fact still true."

Closing this gate for the "who is president" case specifically requires one of:
(a) a live/current knowledge source wired in as a witness (e.g. a small
periodically-refreshed facts table — officeholders, dated — checked the same
way `passages` are checked now), or (b) accepting that without such a source,
the mechanical ceiling is exactly the "unsourced-current" verdict proposed
above: the system can honestly say "this claim about present-tense state has no
grounding, treat with suspicion" but cannot itself supply the correct current
answer. Option (b) is the honest floor with zero new infrastructure and is
what's designed above; option (a) is a real follow-on (a `native/organs/
current-facts.js` witness with a refresh job) but is out of scope for "close the
mechanical-veto gap" and should be a separate, explicitly-scoped addition per
the project's no-hack-for-one-fact rule — it would need to be a general
current-facts witness, not a Wikipedia-scrape-for-presidents special case.

## Amendment (2026-09-19): the emergent kind+link mechanism, as built

The floor above (unsourced-current verdict + append) shipped first; then the
mechanism grew past it. What is now live, in the engine:

- **Kinds and links, not rows.** `kernel/hyperlexicon-routes.js` holds the
  route layer: role words become KINDS (`kind:role:president`, addressable
  as `noteId(label, "keeps-company", kindId)`), and each kind's current
  state is a dated LINK (`kindId --holds-office--> holder`, with
  since/until). "President" is not special-cased; any role a door can find
  earns the same structure.
- **Kinds of things that have terms.** The moment a door dates a link
  (Wikidata's P580/P582 via `organs/current-holder.js`, or a "since …
  term ending …" ground), the kind gains the `has-term` parameter and
  membership in the meta-kind `kind:has-term` — the structural fact that
  the role is held for intervals, which is what makes "current" a
  date-check and not a guess.
- **Stigmergic routes (Wilson).** `kernel/stigmergy.js` is the pheromone
  layer: every resolution attempt deposits `{head, route, ok, ms, at}` in
  the SHARED environment file (`state/current-facts.json`); deposits
  evaporate exponentially (7-day half-life); per kind, routes are tried in
  learned order — strongest recent success first, ties by mean latency
  (speed compared), never-tried routes trailed after, with a scout epsilon
  for exploration. Five hop types: exact-kind, alias (learned, never
  invented), jurisdiction, ordinal (specificity-preempts, so "the 46th
  president" resolves the past link), holder (reverse).
- **The surgical gate.** `fact-gate.js::applyVerdictGate` strikes a
  sentence that commits to a value the link contradicts, and splices the
  mechanical replacement assembled FROM THE KIND AND THE LINK (frame from
  the kind's label, value from the link's holder, date from the link's
  term) — never from the draft's words. Verdicts: grounded / contradicted /
  unsourced-current / untouched. Wired at both gate sites (fast path and
  main path), with the dated-record door and the web door ADOPTING their
  findings into the environment (the colony keeps what its scouts found),
  and a background refresh job re-checking stale links every 6h.
- **Honesty ceiling unchanged.** No door, no link: the draft's open-now
  claim is replaced by "I don't have a grounded source for this as of
  <date>; my training data may be stale on this point." The system cannot
  invent the right answer; it can refuse to ship a guess.

## Amendment (2026-09-19, second): the lens tier — GFP is the grammar, omnilingually

Tested omnilingually per directive ("GFP is our grammar", "no call up LaVar"):
the gate's closed-class grammar is ENGLISH — the English lens. The kernel
(fact-gate + routes + stigmergy) is language-blind; a LENS is one language's
own grammar, in the same discipline as askshape-lens.multilingual.js:

- **`adapters/text/fact-lenses.js`** — minimal attested lenses for eng, spa,
  fra, deu, ita, por, rus, arb, jpn, hin, swa: the wh-openers, the present
  copula, the definite articles, the of-prepositions, the ordinal shape, the
  orthography flag (`capsAreAnchor: false` for German — every noun
  capitalized, so capitalisation is not an anchor there), and the MOUTH's
  templates (the surgical replacement and the soft appends are assembled in
  the ask's own language). `lensForAsk` detects the lens from the ask's own
  wh-opener — the language is the one the question opens in; an opener no
  lens holds reads as no grammar at all.
- **fact-gate.js** reads every closed class through the lens (default = the
  English lens, byte-identical behavior for all existing callers).
- **The same kernel, the same verdicts**: "¿Quién es el presidente?" types
  open-now over "presidente" exactly as the English ask does; a wrong draft
  is contradicted and replaced IN THE ASK'S LANGUAGE
  ("En date du 2017-05-14, le président est Emmanuel Macron."); a right
  draft is grounded untouched.
- **Safe failure is the standing control**: a language whose role grammar a
  lens cannot yet fully type (Russian's case-marked role words, Arabic's
  proclitic article, Swahili's final wh-word) is never struck and never
  receives an English sentence. The omnilingual suite's UNTYPED arm pins
  this for rus arb jpn hin swa ell kor tha cym.
- **Falsified live, three real bugs found**: (1) extractHolder's cap class
  was ASCII `[A-Z]` — Cyrillic holders never matched; now `\p{Lu}`. (2)
  `\b` is ASCII-anchored even with `/u` — the LAVAR S103 lesson, recurring —
  bounded lookaheads replace it. (3) wh-words were read as holder names in
  Cyrillic asks; the wh-opener is grammar, never a person.
- **The ceiling, asserted**: no cross-language resolution ("president" does
  not resolve "président"), and extractHolder reads English ground patterns
  only — if those tests ever pass, the mechanism has silently learned to
  translate, which would be a guess. The other languages are the standing
  check on whether the mechanism is too English-shaped (READING-SPEC S103).

## Amendment (2026-09-19, third): the 75-question falsification battery

`native/organs/falsify-omnilingual.test.mjs` — seventy-five questions in
seventeen languages, each row carrying its intent and asserting what honesty
requires (A: same verdicts per lens; B: English controls; C: ordinals never
fall through; D: holder asks; E: scoped asks never answered by unscoped
kinds; F: no-article languages never struck; G: unlensed languages fail
safe; H: orthography traps; I: mixed grammar never partially types; J:
full-sentence strikes in the ask's language; K: definitions are not claims;
L: chit-chat; M: honest unsourced; N: verbless ellipses; P: aliases never
invented; Q: a strike never demotes the link). No model — no LaVar; every
row is mechanical and a failing row is a falsified assumption.

Falsified live by the battery, fixed:
- **German genitive complements**: "der Präsident der Vereinigten Staaten"
  — the second article (the complement's own "der") was not an anchor, so
  the head walk swallowed the whole complement and reported head
  "Vereinigten". Fixed: an article always begins a new noun phrase — the
  walk stops at articles and an article-bearing tail is anchored.
- **Definite complements read as values** (K rows): "Le président est le
  chef de l'État." was struck (l'État read as a committed value). Fixed by
  the complement-article rule: a role mention with the role BEFORE the
  copula is a holder claim only when the post-copula complement is a NAME
  (no article) — a definite complement is a definition, never a claim.

## Amendment (2026-09-19, fifth): the swarm, and resolution by referent

**The swarm** (`native/kernel/swarm-collective-learning.test.mjs`): six
falsifiable collective-learning claims run against the REAL machinery with
many seeded agents and one shared environment. Measured: effort per
resolution falls (1.45 -> 1.00 mean probes over 8 epochs); one scout's
finding serves every other agent (transfer); ten successes sum to
near-ten trail strength and a forty-day silence evaporates it below a
fresh competitor (amplification + evaporation); a WRONG first deposit is
amplified by every wrong resolution — the gate ships the wrong value with
full mechanical confidence — until one alarm (veto) collapses the wrong
certainty (collective mislearning, measured, and its correction); and the
scouts never stop probing (exploration epsilon). The swarm falsified one
real inefficiency: the holder hop preempted unconditionally, so an alias
head like "POTUS" (also a holder-candidate by its caps run) paid a wasted
probe on EVERY resolution forever — the preemption now holds only until
the colony has learned (trails exist under the head); after that the
learned order governs.

**Resolution by referent** (user direction: "that should resolve by
referent using the hyperlexicon"). The alias is no longer a string field on
a kind — it is an ADMISSION in the hyperlexicon's own ledger shape:
(POTUS, is-alias-of, kind:role:president), deduped by the hyperlexicon's
own identity (assertionId), carrying witness and because, persisted in the
environment file, projected in notes(). The route resolves the SURFACE
through the LEDGER to the REFERENT id, and only then reads the referent's
current link; the byAlias index is a projection of the ledger, never a
parallel store. The swarm's alias asks now resolve by referent: "who is
POTUS?" binds POTUS -> kind:role:president -> the current link.

## Amendment (2026-09-19, sixth): the referent resolution, falsified

`native/kernel/falsify-referents.test.mjs` — the referent mechanism under
fire. One real bug found and fixed, three disciplines enforced:

- **The contest gap (falsified live)**: two admissions binding one surface
  to DIFFERENT referents produced silent last-writer-wins in the route and
  first-writer-wins in `kindFor` — two readers, two referents, zero
  disclosure. Fixed: `hearAlias` REFUSES a conflicting admission as a typed
  disagreement (`contested-surface`, naming the existing binding); the
  route's own guard excludes a contested surface from `byAlias` (it
  resolves to NOTHING — the honest ambiguity) and discloses the contest on
  the index; `resolve` reports `contested` and `kindFor` returns the typed
  absence. The notes are never deleted — the disagreement is on file, typed.
- **Every admission names its giver** (constitution II.2): a witness-less
  alias binding is refused (`no-witness`); `upsertKind` batch admissions
  disclose their refusals instead of dropping silently.
- **Idempotence**: the same admission heard twice is one act.
- **The per-surface trail is CORRECT** — probed, and the per-referent
  alternative REFUTED: the alias hop is surface-specific, so the learning
  must be per surface; a referent-shared order would make the head surface
  pay the alias hop first forever.
- **The disclosed ceiling**: a surface that names a role resolves the role;
  a human named Premier is not guessed.
