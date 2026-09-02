# Lemma-aware verb matching — a real, small, safe win (and a dead end it replaced)

Run 2026-08-19, in direct response to "wire this in to be how we work so
our graph works better." The first attempt at this (a sixth verdict,
`inferred`, widening `bound` via a graph neighborhood) was built, found
to fabricate on two adversarial cases, fixed to be safe, and then proven
— mathematically and empirically (0/1,575 fires) — to be dead code once
made safe: `bound`'s own object matching (`tokensShare`) already accepts
any single shared token with one edge, which strictly subsumes any safe
multi-edge union check built from the same primitive. Full account:
`hypergraph.js`'s own 2026-08-19 amendment header.

This is the second attempt, and it works, because it widens a DIFFERENT
matching primitive than the one `bound` already saturates: not "how much
text can this edge share," but "is this verb THE SAME ACT as that one,"
using a received, already-tested organ this session found by searching
first (`perceiver/text/morphology.js::createLemmatizer`, UniMorph-backed,
irregular-inflection-aware) rather than inventing anything new.

## The gap it closes

`hypergraph.js` compared verbs by exact string equality everywhere:
building edges, matching a claim against `sameSubjVerb`, and deciding
whether an answer's verb was `unheard`. A claim phrased "underwent
metamorphosis" against material stating "undergoes metamorphosis" — the
identical predicate, different tense — read as two different verbs and
lost the claim entirely, either to `unheard` (verb outside the material's
vocabulary) or, worse, silently: `extractRelations` only matches verbs
literally present in the vocabulary Set handed to it, so a tense-shifted
claim never even became a `t` to judge.

## What changed

`makeRelationReader` takes two new optional organs, `createLemmatizer`
and `morphologyIndex` (the cast.js pattern — omitted, `sameAct` degrades
to exact-string equality and every existing caller is byte-identical,
confirmed: 705 tests / 700 passing / 5 pre-existing environment failures,
same count before and after). Provided, three things widen from exact
match to `sameAct`: `sameSubjVerb` (does an edge state this claim's
verb), `sameVerbObj` (the `nearest`-edge disclosure on `unbound`), and —
the load-bearing one, since the first two never run if the claim was
never extracted — the per-sentence vocabulary the answer itself is read
with: a candidate verb the answer uses that isn't in the material's
vocabulary VERBATIM but IS the same act as one that is gets folded in
before extraction, so the claim is read at all instead of vanishing.
`unheard` narrows to genuinely unrelated verbs only.

## Measured, not assumed

`eval/mine-1-unimorph-lemma.mjs` — identical to the UniMorph-only run
(`mine-1-unimorph.mjs`, the session's prior pareto-best) with lemma
matching added on top:

| | UniMorph alone | + lemma matching |
|---|---:|---:|
| headline (bound/all) | 33.7% | **34.0%** |
| headline (bound/examined) | 38.3% | 38.7% |
| bound | 531 | **536** |
| unheard | 48 | **42** |
| contradicted | 0 | **0** |

Small, because MINE-1's own facts are LLM-generated close paraphrases of
their source essay (tense drift is a real but minor share of the gap on
THIS material) — but real, in the right direction on every axis, at zero
cost to the session's one hard invariant across every variant tried
tonight: contradictions stay at zero.

## Safety, checked adversarially before trusting it

The `inferred` postmortem is exactly why this was checked, not assumed
safe on the strength of a passing test suite: confirmed live that an
UNRELATED verb ("married," sharing no lemma with the material's
"underwent"/"traveled") stays `unheard`, never gets swept in — this is
narrow lemma equivalence from a curated table, not a general fuzzy
match. Pinned as three regression tests in `hypergraph.test.mjs`: the
positive tense-mismatch case, the backward-compatible omitted case, and
the unrelated-verb refusal.

## Amended same night — objects, Ancient Greek, and a bigger combined win

Two more things happened in direct succession, both worth recording here
rather than in a separate file since they complete the same amendment.

**"Do you think we need stemming or referents?"** — argued that entities
should resolve to referents, never stems, and verbs should resolve to
canonical identity (`sameAct`) rather than surface shape. **"Try it"** —
tested extending referent/form identity to OBJECTS too (`endpoint()`'s
`useForms` was subject-only, by explicit prior design, with a disclosed
regression risk never actually reproduced). Reproducing it live confirmed
the risk was real: "Pierre Bezukhov underwent transformations that
winter" read `unbound` against material stating "underwent a remarkable
transformation," because singular and plural each independently became
DISTINCT exact-token form ids once objects got forms, and `endpointsMatch`
took the stricter exact-referent branch instead of the old stem fallback.
The fix reuses the SAME `sameAct` organ this file's own verb amendment
already proved safe: `formIdOf` groups a token with every OTHER recurring
form that is the same act as it (not a new mechanism — the identical
lemma table, applied to nouns instead of verbs), and object identity is
now enabled ONLY when `createLemmatizer` is provided
(`Boolean(createLemmatizer)`, never unconditionally) — so without a
lemmatizer, behavior is untouched, and the original regression cannot
recur because the unsafe unconditional path no longer exists.

**"It needs to work for Ancient Greek, or we have high-level priors
steering for different grammars."** Checked, not assumed: `morphology.js`
already quarantines its DATA properly (`loadMorphology` requires a prior
to declare `language` and `giver`), but its regular-inflection RULE
(`stemsOf`, hardcoded ASCII English suffix-stripping) ran unconditionally
on every lookup regardless of what the loaded table itself declared — a
hypothetical Ancient Greek prior would still get silent English
suffix-guesses folded into its lemma sets underneath it. Fixed at the
source: `createLemmatizer` now takes `language`, and the rule only fires
when it is `"eng"` (default, matching every existing caller and this
module's own pinned tests — a hypothetical non-English prior must opt out
explicitly, since defaulting the other way would have silently broken
the existing suite). `organs.morphologyLanguage` threads the loaded
prior's own declared language through hypergraph.js automatically — the
natural path (`loadMorphology(path).language`), never a second value a
caller has to remember. Pinned end to end in both repos: `morphology.
test.js` (a synthetic non-English table, proving its own irregular pairs
still resolve while the English rule is refused) and `hypergraph.test.mjs`
(the identical assertion through the real reader, not just the unit).

## The combined, final numbers

| | UniMorph alone | + verb lemma matching | + object forms + language threading |
|---|---:|---:|---:|
| headline (bound/all) | 33.7% | 34.0% | **35.4%** |
| headline (bound/examined) | 38.3% | 38.7% | **40.2%** |
| bound | 531 | 536 | **557** |
| unheard | 48 | 42 | **44** |
| beyond-reach | 267 | 264 | **236** |
| contradicted | 0 | 0 | **0** |

A real, larger combined gain (+26 bound facts over UniMorph alone) —
`beyond-reach` dropping most (267→236) makes sense: an object recurring
in only its plural form, or a subject/object pair split across singular
and plural mentions, now resolves as the SAME identity instead of two
unrelated ones. Every number moved in the right direction, at zero
contradictions across all three configurations.

## What tonight settles, and what it doesn't

**Settles:** a real, safe, measured improvement exists and ships as an
opt-in organ, exactly like `verbForms` (UniMorph vocabulary widening)
already does.

**Doesn't settle:** whether the LIVE APP should load either prior by
default. `verbForms` itself was flagged in this repo's own CLAUDE.md as
"a real, undecided question" — not wired into `app.js`, only used in
eval scripts — specifically because a live chat answer's wording won't
always mirror its material as closely as a benchmark fact drawn from its
own source essay does, and because it introduces a real data-file
dependency (the morphology prior here is 142KB; the verb-forms Set is
1.36MB) that a browser-served app has to account for. This amendment
doesn't resolve that question either — it answers a different one (does
lemma matching help, safely) and leaves "should the live grounding ladder
load it" exactly as open as it already was for `verbForms`.

## Files

`hypergraph.js` (the `sameAct` amendment); `hypergraph.test.mjs` (3 new
cases); `eval/mine-1-unimorph-lemma.mjs` (new); `eval/fixtures/
unimorph-morphology-prior.json` (new, built via eoreader6.1's own
`scripts/build-morphology-prior.mjs` against the same UniMorph TSV
already vendored for the verb-forms/ambiguous-word fixtures — 5,531
irregular lemma/form pairs, the regular tail dropped by design per that
script's own header).
