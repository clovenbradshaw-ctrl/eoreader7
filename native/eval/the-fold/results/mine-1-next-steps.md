# Closing the rest of the MINE-1 gap — what was tried, what's proposed next

The recurring-form fix (`mine-1-forms-RESULTS.md`) closed most of the
`beyond-reach` bucket by giving SUBJECTS an identity beyond proper names.
It left the larger bucket untouched: `no_claims_extracted`, 1,038 of 1,575
facts (65.9%) — `extractRelations` never finds an SVO shape in the fact
sentence at all. This note is the diagnostic behind why, two tried-and-
rejected extensions of the same forms idea, and what's proposed instead.
Nothing below is built yet — this is the proposal, run through the same
"try it, measure it, disclose what happened" discipline before anything
lands in `hypergraph.js`.

## The diagnosis: it's not clause shape, it's vocabulary starvation

Sampled `no_claims_extracted` facts directly (30 essays, ad hoc script, not
committed): every one came from either (a) an essay with ZERO established
named surfaces at all (29/105 essays — literally nothing for
`discoverRelationVocab` to anchor a verb candidate on, so `verbs` stays
empty and NOTHING in that essay can ever extract, regardless of clause
shape), or (b) an essay WITH a named surface, where the fact's own verb
("captivate", "attaches", "undergoes") simply never happened to sit next to
that one or two named surfaces anywhere in the essay, so it never entered
the measured vocabulary. Both trace to the same root: `relations.js`'s
verb-discovery anchors on capitalized surfaces, and encyclopedic essays
have very few of them.

## Tried and rejected, on the merits, with evidence — not by argument

**Attempt 1: widen `discoverRelationVocab`'s `surfaces` to include the
same recurring FORMS `hypergraph.js` now uses for subject identity.** On
"The Life Cycle of a Butterfly" (zero named surfaces, so zero baseline
vocabulary), passing `forms` as `surfaces` did discover 121 "verbs" and
extract 84 "triples" — but reading them shows why this is wrong:

```
{ subject: "Life", verb: "cycle", object: "of" }
{ subject: "a", verb: "butterfly", object: "Butterflies are fascinating creatures that undergo" }
{ subject: "butterfly's", verb: "life", object: "cycle and" }
```

Garbage. `discoverRelationVocab`'s candidate-verb nomination just takes
whatever word follows a matched anchor — it relies on anchors being SPARSE
and semantically load-bearing (a proper name marks a real clause boundary
reliably) to keep that noise down. Recurring content words are dense
(every sentence has several), so nearly every word in the essay ends up
adjacent to one and gets nominated as a "verb," determiners and
prepositions included.

**Attempt 2: anchor on definite/indefinite noun phrases instead** ("the
caterpillar", "a butterfly" — `DEFINITE_DETERMINERS`/
`INDEFINITE_DETERMINERS`, the closed grammatical class already in
`perceiver/text/priors.js`, reused rather than a new list). Same failure,
same reason: determiner phrases are even MORE dense than recurring content
words in ordinary prose (nearly every noun phrase has one), so the noise
is if anything worse:

```
{ subject: "of a", verb: "butterfly", object: "..." }
{ subject: "After", verb: "a", object: "few days or weeks" }
{ subject: "known as", verb: "a", object: "caterpillar" }
```

**Conclusion, stated plainly:** the "reuse forms" move that worked cleanly
for subject IDENTITY (a narrow, low-risk widening of one `if` check) does
NOT transfer to vocabulary DISCOVERY. Discovery's own algorithm assumes
anchor sparsity that only proper names reliably provide; anything denser
breaks its implicit noise filter. This is the same shape of finding
`widget.js`'s own header already recorded for a different reason
(`extractRelations`/`discoverRelationVocab` refused "on the merits" for
the widget router, because it anchors on capitalized surfaces and
ordinary chat has none) — found again here, independently, by actually
running it rather than assuming either way.

## What's proposed next, not yet built

**A morphological verb-shape filter on candidate nominations**, applied
ONLY when the anchor is a form (proper-noun-anchored discovery stays
exactly as it is — already reliable, untouched). Before a form-anchored
candidate is admitted to the vocabulary, require it to plausibly BE a verb:
ends in one of `INFLECTIONAL_SUFFIXES`'s own `-ed`/`-ing`/`-s` (the closed
morphology class already in `priors.js`, not a new one), OR is a member of
a small closed copula/modal set (`is`/`are`/`was`/`were`/`has`/`have`/
`had`/`will`/`can`/`could`/`would`/`should`/`must` — English's own closed
auxiliary class, the same kind of received grammatical set
`NEGATION_WORDS`/`FIRST_PERSON` already are in that file, not an open
vocabulary list). This should reject "of", "a", "life", "cycle" (no verb
morphology, not an auxiliary) while keeping "undergoes", "emerges",
"captivate"-if-inflected, "is", "are".

**This is a proposal, not a result.** It has NOT been run against the
fixture yet. The honest next step, before touching `hypergraph.js` again:
build the filter as a small pure function, run it against the SAME two
attempts above (recurring forms AND determiner phrases) with the filter
applied, and look at the actual triples it produces — the same "read the
output, don't trust the theory" check that caught the garbage in both
rejected attempts. If it still lets through too much noise, that is a
result worth reporting exactly as honestly as the two rejections above,
not a reason to lower the bar until something passes.

## Addendum 2026-08-19 — tried kind-induction over `live_priors` for real

The question on the table: instead of a small hand-typed closed auxiliary/
suffix list, could "is this a verb" be INDUCED — the same way this engine
induces every other kind (`emergence/kinds.js`'s `induceKinds`, null-tested
Born gates, never a typed taxonomy) — from the real text already sitting
in `live_priors`, rather than received from an external table like
UniMorph? Worth answering by running it, not by arguing either way.

**`induceKinds` is fully generic — nothing about it is entity-specific.**
Its `records` shape is `{id, attributes: [{field_id}, ...]}` — a plain
population-with-attribute-profiles, exactly the shape a set of candidate
WORDS with distributional features already has. Nothing stops pointing it
at words instead of relation-terms or documents. Confirmed by actually
doing it, not by reading the header.

**What was run.** ~147KB of real `live_priors` text (`02-encyclopedic/
wikipedia/{Cell_biology,Evolution,DNA}.txt` — already on disk, no fetch,
no network). 184 candidate word-types (count ≥ 15 in this sample). Each
word's attribute profile built ENTIRELY from closed classes already
received into this engine (`priors.js`'s `DEFINITE_DETERMINERS`/
`INDEFINITE_DETERMINERS`/`NEGATION_WORDS`/`FIRST_PERSON`/
`INFLECTIONAL_SUFFIXES`) — adjacency to a determiner, a modal/auxiliary, a
pronoun, a negation, plus the word's own suffix shape. `induceKinds(...,
{minPrevalence: 0.03, minKindSize: 5, permutations: 30, quantile: 0.95,
seed: 0, reseeds: 3})` — an engineering starting point on every number,
disclosed as exactly that, not walked against this fixture's own MINE-1
score (the eoreader6.1 house rule this session has followed all night).

**Result: the mechanism is real and it DOES find structure — just not
yet the structure asked for.** `con()`'s clustering step found four
genuinely cohesive groups (not noise — each clears `eva()`'s single-subset
existence gate on its own, `pValue: 0`, `passed: true` for all four). But
reading their membership: cluster 1 is mostly plural nouns ("genetics",
"acids", "sequences", "nucleotides"); cluster 3 mixes real verbs
("produce", "change", "produced") with nouns ("proteins", "genes",
"enzymes"); none of the four is a clean verb kind. The features chosen
(determiner/modal adjacency) are shared across too many parts of speech to
make VERB the discriminating axis — a modal or a determiner sits next to
nouns and adjectives too, not only verbs.

**The full `induceKinds` pipeline refused all four anyway (`kinds
induced: 0`) — and that's the engine doing its job, not a failure to
diagnose away.** `induceKinds` requires more than `eva()`'s single-subset
null: a cluster was CHOSEN by best-first search, and the reseed-based
search null (`reseeds: 3`) checks whether that same search finds
comparably cohesive groups in reshuffled data too. None of these four
survived that stronger check. This is the exact discipline this file's own
header names ("a cluster was not drawn at random... `eva`'s single-random-
subset null cannot see that selection effect") working as designed — it is
refusing to certify structure that only looks real under the weaker test.

**Honest verdict.** Kind-induction over `live_priors` is architecturally
sound for this and was NOT ruled out — it just isn't a quick win. The
distributional features tried are too coarse to isolate verb-hood; a real
attempt would need better ones (does the word take a following noun
phrase without a determiner between it and its object; does it appear
after a bare "to"; weight suffix evidence more heavily; possibly seed the
similarity search with the small closed modal/auxiliary set itself as an
anchor rather than a feature). That is real, unproven, further work — not
attempted tonight, named here so it is not re-derived from scratch.

**Where this leaves the two paths, compared honestly:**
- **UniMorph** — a RECEIVED resource (like `live_priors` itself: built by
  linguists, citable, has a giver), immediately reliable for "is this
  surface form a known inflected verb," but external (needs fetching and
  vendoring, its own licence/trust question) and static — it answers, it
  never discovers anything new about THIS corpus.
- **Kind-induction over priors** — the more philosophically consistent
  path for a project whose whole stance is discovery over lookup (L2:
  capitalisation differentiates, never decides; nothing is a label
  computed and trusted alone) — but, as measured tonight, not yet a
  working answer. The closed-class list already proposed above
  (`INFLECTIONAL_SUFFIXES` + a small closed auxiliary set) is itself
  already of the SAME received-grammatical-class kind this codebase uses
  everywhere (`NEGATION_WORDS`, the determiner sets) — not an invented
  heuristic, and a legitimate, smaller, already-proven-pattern fix in its
  own right, independent of whether kind-induction ever gets there.

## The honest ceiling, restated

Even a working filter only recovers essays/facts where SOME form
plausibly anchors a real verb nearby. It cannot help the disclosed floor
this mouth has always had: `goldens/agency-civic`'s own measured recall
(13.3% against a human/LLM-panel majority, on civic prose) is the same
class of limit, and CaRB — the field's standard zero-shot Open IE
benchmark — has published systems sitting in the 40s-50s F1, which is this
project's own stated fair comparison (`goldens/EXTERNAL-BENCHMARKS.md`
Section B): open-schema relation extraction from raw text is hard for
everyone, not uniquely broken here. The goal of the next pass is closing
some of the gap to that field baseline, not reaching 100%.
