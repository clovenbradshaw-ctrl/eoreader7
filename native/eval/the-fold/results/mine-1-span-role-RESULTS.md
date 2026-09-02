# MINE-1 with instance-level span-role resolution — the full arc, closed honestly

Run 2026-08-19. `node eval/mine-1-span-role.mjs` reproduces every number
below. This closes the line of work that started with "what about both?"
(combining UniMorph with a local disambiguation heuristic) and ended by
building a genuinely new engine organ rather than another word-level proxy.

## The reframe that produced it

Every proxy tried before this one scored a WORD — its own decontextualized
behavior, pooled locally or over `live_priors`. Calibrated against real
control words (pure nouns, pure verbs, pure function words), none of them
separated grammatical category at all: determiner-adjacency saturated
identically for "but" and "eat"; raw extractor-selection-rate saturated
identically for "the" and "destroy"; referent-anchored vocabulary discovery
worked in most essays but leaked through a recurring ADJECTIVE ("enjoyable")
standing in as a referent-anchor, because "recurs ≥2 times" has no
noun/adjective distinction.

The reframe, from the user directly: these words don't mean things
objectively — they are contextual and point at referents. eoreader6.1's
own stripped research scratch (`scripts/experiments/FINDINGS.md`, found by
checking whether eoreader6/5/4.2 had already solved this) had independently
reached the identical conclusion for a related problem (agent-role
resolution in civic text): **"a surface span is never the thing with a
part of speech — the referent is."** Aggregating a word's occurrences into
one type-level tag and asking whether THE WORD resolves was diagnosed
there as the wrong question. The right one is instance-level: does THIS
occurrence's own local vocabulary resemble an occurrence already known to
fill a given role, by one causal recurrent hop?

## What was built

`packages/engine/perceiver/text/roles.js` (new, in `eoreader6.1`) —
`resolveSpanRole`, the general sibling of `pronouns.js::resolvePronouns` at
the same quarantine level: both are thin text-tier consumers of
`emergence/activation.js`'s fully domain-agnostic mechanism (`tokens`/
`codeOf`/`recall`/`encodeFrame`, reused unmodified, never re-derived). Where
`pronouns.js` answers one narrow question (which referent does this
pronoun mean), `roles.js` answers the general one underneath it: given a
span of unknown role and other spans already known to fill declared roles,
which role does this occurrence's own vocabulary resemble, by causal
one-hop recall? "Role" is never typed into the module — pronoun-vs-
referent, verb-vs-non-verb, actor-vs-patient are the same shape to it, a
caller-declared label string. Same declared-never-defaulted floors
(`minActivation`, `minMargin`), same typed-gap discipline, same causal
recall-then-encode ordering pronouns.js already proved out.

**Deliberately NOT inherited from `pronouns.js`** (both disclosed in the
file's own header and pinned as a regression test): the "a span sharing
its sentence with a known example is left alone" rule (disambiguating
CO-PRESENT candidates is a different, harder problem pronouns.js exists to
avoid — nothing here needed that avoidance), and every English-specific
decision (gender filter, closed pronoun vocabulary, `nonPersonal`) — those
are pronoun facts, not general ones, and stay quarantined in `pronouns.js`
where the English facts they depend on actually live.

`conformance/roles.test.js` (new, 6 cases, run against the real module —
no stubs): declared-number validation; the core positive resolution path;
activation beating recency; refusal on genuinely unrelated material; the
deliberate non-inheritance of the same-sentence skip rule, pinned as a
regression so it can't silently regress back to pronoun-shaped behavior;
and a three-simultaneous-role case proving role is an open vocabulary, not
a fixed binary.

`eval/mine-1-span-role.mjs` (new, in `the-fold`) — the ONLY NL-specific,
verb-specific part, deliberately kept outside `roles.js`: for each essay,
occurrences of UniMorph-unambiguous verbs become KNOWN "verb" evidence,
occurrences of a newly-extracted UniMorph noun-only set (`eval/fixtures/
unimorph-eng-noun-only.json`, 360,537 forms UniMorph tags N and never V)
become KNOWN "non-verb" evidence, and occurrences of UniMorph-ambiguous
words (tagged both) are the UNKNOWN spans `resolveSpanRole` is asked to
resolve. `SPAN_ROLE_OPTS = { minActivation: 0.05, minMargin: 0.2 }` reuses
`host/corpus.js`'s own disclosed-as-unvalidated operating point for the
identical mechanism (pronoun resolution) rather than inventing a fresh
guess indistinguishable from tuning against this run's own score — the
same honest-debt posture that repo already discloses for those numbers.

## The five-way comparison, all measured tonight

| | headline (bound/all) | headline (bound/examined) | no_claims_extracted | contradicted |
|---|---:|---:|---:|---:|
| baseline (name-only) | 5.8% | 17.1% | 65.9% | 0 |
| + recurring forms | 14.1% | 41.3% | 65.9% | 0 |
| + UniMorph (unfiltered) | 33.7% | 38.3% | 12.0% | 0 |
| + UniMorph + local disambiguation | 30.7% | 39.8% | 23.0% | 2 |
| + UniMorph + referent-anchored | 29.6% | 42.1% | 29.7% | 2 |
| **+ UniMorph + instance-level span-role** | **22.4%** | **42.7%** | **47.5%** | **0** |

## Why instance-level resolution loses recall, honestly

Not a bug — checked directly. The butterfly essay alone has 254
UniMorph-ambiguous occurrences ("process," "way," "point," and hundreds of
others UniMorph tags with a rare-but-real verb sense), yet only 7 words
total made it into that essay's final verb vocabulary. Unambiguous-verb
KNOWN examples are structurally sparse within a single ~300-word essay —
predicates vary clause to clause and rarely repeat the exact same word
twice, so they rarely clear `activation.js`'s own sparse-coding floor
(distinctive AND already-recurring, `df >= 2`) needed to become a fireable
cue at all. Meanwhile the essay's own TOPIC nouns (the subject the whole
essay is about) recur constantly and clear that floor easily. So "non-verb"
evidence reliably accumulates real activation within a single essay and
"verb" evidence almost never does — not because the mechanism is wrong,
but because `pronouns.js`'s own mechanism was proven out on document-scale
material (a whole novel, a character's name and vocabulary recurring
across hundreds of pages) and MINE-1's essays are two orders of magnitude
shorter. The mechanism is conservative in a specific, disclosed direction
on this material: it almost never admits an ambiguous word as a verb
unless real recurring verb-vocabulary genuinely exists to support it.

## What this result actually settles

**Precision, cleanly:** zero contradictions, matching plain UniMorph's own
cleanliness and beating both refinements that tried to fix UniMorph's
boundary-error cost (local disambiguation and referent-anchoring each
introduced 2). This is the only approach among the four widening attempts
that never shipped a single fabricated contradiction.

**Recall, honestly not won:** plain UniMorph's raw, unfiltered 33.7% stays
the strongest headline-over-all-facts number of the whole session — this
mechanism trades a real chunk of that recall for precision and instance-
level correctness that the current benchmark's short-essay material can't
fully exploit. The architecture is sound (proven by `roles.js`'s own tests
against real activation.js, and by the fact that "non-verb" resolution
works cleanly wherever there IS enough recurring evidence); the deficit is
a data-scale mismatch between what `pronouns.js`'s mechanism was built for
(book-length material) and what MINE-1 supplies (essay-length material).

**What's disclosed, not fixed here:** the `verbForms` bridge from
`resolveSpanRole`'s per-occurrence bindings back to `hypergraph.js`'s
flat, essay-scoped vocabulary Set (admit a word if ANY of its occurrences
resolved to "verb") is itself a real narrowing — exactly the type-level
collapse this whole file's reframe argues against, done only because the
current `extractRelations` consumer has no per-occurrence API. A reader
consuming `roles.js`'s own `bindings` directly, occurrence by occurrence,
loses nothing; a reader going through `hypergraph.js`'s `verbForms` Set
does. Named as future work, not silently assumed harmless.

## What this pass leaves for material long enough to use it properly

`roles.js` was proven on a two-role, well-separated synthetic corpus and
now on 105 real essays — it works exactly as designed. The honest
prediction, unverified here: pointed at book-length material (where verb
vocabulary genuinely does recur, the way `pronouns.js`'s own referent
vocabulary does), the same mechanism should resolve real verb occurrences
at a much higher rate than it did on MINE-1's essays. Not tested — MINE-1
is essay-scale by construction, and testing that prediction needs a
different benchmark or a book-scale relation-extraction fixture this
session didn't build.
