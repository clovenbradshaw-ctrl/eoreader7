# The Latin being tier (2026-09-17)

**Driver:** `../latin-being-tier.mjs` — fetches Cicero's *In Catilinam*
(Perseus Digital Library's `canonical-latinLit`, A.C. Clark's critical
edition) and caches it under `../lavar/fixtures/archon-priors/` (gitignored,
the same fetched-third-party-text pattern used throughout this session for
Homer's Greek text and `frankenstein-native.yml`'s own Frankenstein fetch).
The case prior and a POS prior are BUILT fresh from this repo's own
committed `fixtures/ud-latin-perseus/la_perseus-ud-train.conllu` by
invoking the real `build-latin-case-prior.mjs`/`build-pos-prior.mjs`
scripts as subprocesses — no logic re-derived, no result asserted without
running the actual builders.

## What this tests

The follow-on to the same session's own Greek work: `greek.mjs`'s
being-identity mechanism (a recurring word head treated as one referent by
stem agreement — "identity by consequence, made morphological") was
extracted into a shared, language-agnostic primitive
(`adapters/text/stem-identity.js`) specifically so a SECOND case-marked
language could reuse it rather than re-deriving the same LCP comparison a
third time. Latin — `relations-case-marked.js`, already shipped, already
this repo's own second case-marked-language organ — is the natural first
consumer: it had a per-sentence relation extractor
(`extractCaseMarkedRelation`) but no referent-identity tier at all, so its
own output could never BRIDGE across sentences the way
`kernel/relation-composition.js` requires (one edge's object referent must
equal the next edge's subject referent).

## Two things that do NOT transfer from Greek, found by measuring rather than assuming

**1. Capitalisation's sentence-initial confound is the OPPOSITE finding.**
Greek's bare-name tier (`greek.mjs::bareBeingCandidates`) needs no
sentence-initial exclusion because that was measured, not assumed, on the
real Perseus Greek edition: sentence-initial capitalisation (8.9%,
84/941 tokens) is statistically indistinguishable from the overall word
capitalisation rate (9.4%, 3,049/32,281) — Greek editorial convention
reserves the mark for proper names, not sentence position. The identical
measurement on this real fetched Latin edition gives the opposite answer:

| | sentence-initial | overall |
|---|---|---|
| capitalised | 115/601 = **19.1%** | 604/12,734 = **4.7%** |

A real ~4x confound. Latin's own bare-capitalisation tier
(`latinBeingCandidates`) therefore keeps the SAME sentence-initial
exclusion English's `surfaces.js::CAP_TOKEN` already holds for exactly
this reason — never Greek's "no exclusion needed" design, which does not
transfer.

**2. The case-ending prior alone has no notion of part-of-speech, and Latin
has no equivalent of Greek's POS-attested `NOMINAL`/`STOP`-set veto out of
the box.** Wiring the tier against real Cicero text the moment it was
built produced 874 "beings," most of them common ADVERBS and PRONOUNS
declining into nominal-shaped endings — `classifyNominal` was built for
`extractCaseMarkedRelation`'s own already-narrowed, single-sentence,
verb-excluded word set, never as a passage-wide POS filter, and it has no
way to tell "etiam" (also/even, ADV, 41 attestations) from a real noun
ending the same way. Fixed by building a SECOND, independent resource — a
`POSPrior@1` from the SAME real UD_Latin-Perseus training data,
`build-pos-prior.mjs` (already language-general, already used for
English/Russian/Finnish/Greek, reused unmodified) — and applying the
identical "prior silence does not veto a case reading, but a confident
opposing classification does" discipline `greek.mjs::greekClauses` was
independently fixed to hold in the SAME session, generalized rather than
re-derived a second time.

| | beings found |
|---|---|
| without the POS-prior veto | 874 |
| with the POS-prior veto | **688** |

## Result: the mechanism is real, the corpus is a bad fit for the single-clause extractor

| | value |
|---|---|
| material | Cicero, *In Catilinam* (real fetched Perseus text), 86,541 chars |
| beings discovered (with POS veto) | 688 |
| `latinEntries` bridging edges, whole speech | **0** |

**Zero bridges on the real corpus, and this is a disclosed, understood
finding, not a silent failure.** `extractCaseMarkedRelation`'s own header
already states its declared scope precisely: "one sentence, single finite
verb" — and its own measured validation (this repo's `latin-case-marking-
eval.mjs`) already disclosed that 559 of 939 held-out gold sentences were
skipped for carrying more than one finite verb. Cicero's *In Catilinam* is
the extreme case of exactly that: Ciceronian oratory is famous for long,
elaborate PERIODIC sentences (many coordinate and subordinate clauses per
orthographic sentence). Measured directly: of the first 400 real sentences,
**266 (66.5%) fail with `ambiguous_verb`** — multiple finite verbs per
sentence, `extractCaseMarkedRelation`'s own already-disclosed out-of-scope
case, never a new defect in the being tier itself.

## The mechanism is proven correct, isolated from the corpus wall

A clean, deliberately single-clause fixture (mirroring how the Greek
positive-control test in `archon-priors.test.mjs` isolates mechanism
correctness from corpus-specific gaps), using real, case-prior-confirmed
Latin word forms — "populus" (people, `-us` → Nom, 264 training
attestations, share 0.44), "Ciceronem" (Cicero, accusative, `-em` → Acc,
355 attestations, share 0.997):

```
Populus Ciceronem videt. Consul Ciceronem laudat. Populus Ciceronem amat.
```

`latinBeings` discovers exactly two real referents (`populus`, occurring
twice; `ciceronem`, occurring three times — `consul` correctly does NOT
form a being, occurring only once). `latinEntries` correctly bridges the
two sentences whose subject AND object both recur:

```
ref:lat:auto:populus --videt--> ref:lat:auto:ciceronem
ref:lat:auto:populus --amat--> ref:lat:auto:ciceronem
```

The middle sentence ("Consul Ciceronem laudat") correctly produces NO
edge — `consul` never recurs, so its subject slot never binds to a
discovered referent, and nothing is fabricated. This is the identical wall
`greek.mjs::greekEntries` already holds (`if (!c.subjectRef ||
!c.objectRef) continue`).

## What is verified and shipped

- `adapters/text/stem-identity.js` (new, pure, zero dependencies) —
  `stripDiacritics`, `sameStem`, `groupByStem`, `refOf`: the shared,
  language-agnostic stem-identity primitive, extracted from `greek.mjs`
  (where the SAME longest-common-prefix comparison had already drifted
  into two separate places — `greekBeings`' own grouping loop and
  `beingRefOf`'s independent walk). 11 conformance tests, every word pair
  computationally verified before being pinned (Latin's short declension
  stems make LCP-by-eye unreliable).
- `greek.mjs` refactored to consume the shared primitive — `greekBeings`
  and `beingRefOf`'s public shapes and every one of their 29 pre-existing
  and new tests unchanged; verified byte-identical output against the real
  Iliad+Odyssey corpus before and after (581 beings, same top-20 list, same
  occurrence counts).
- `adapters/text/relations-case-marked.js` gained `latinBeings`,
  `latinRefOf`, `latinEntries` (all additive — `extractCaseMarkedRelation`'s
  own public shape untouched), plus `classifyNominal` exported (was
  private, now reused directly rather than reimplemented). 7 new
  conformance tests in `native/tests/relations-case-marked.test.js`,
  self-contained hand-typed fixtures (every value checked against the real
  case-prior distribution before being pinned, matching this session's own
  established discipline), running regardless of whether `live_priors` is
  checked out as a sibling.
- `native/eval/latin-being-tier.mjs` — the re-runnable driver behind every
  number in this document.
- Full native suite: failure set diffed by NAME (not raw numeric test IDs,
  which shift with file/test count) against a `git stash` baseline
  (`native/conformance/`, `native/organs/`, `native/kernel/`,
  `native/adapters/text/`, `native/tests/`, 31 pre-existing failures,
  mostly `native/tests/*.test.js` files that cannot load in this checkout
  for unrelated, pre-existing sibling-repo-absence reasons) — byte-
  identical by name, zero regressions.

## What is NOT done, disclosed rather than implied

**Clause segmentation for Latin** — the actual blocker to non-zero
bridging on real classical prose — is real, scoped, unbuilt work, already
disclosed by `relations-case-marked.js`'s own header before this pass
touched it ("Multi-finite-verb sentences (clause segmentation... this
organ does not attempt)"). A crude comma/semicolon/colon split was tried
as a quick workaround (26 bridging edges on the same first-400-sentence
slice, up from 0) and DELIBERATELY NOT shipped: several of its matches are
visibly wrong (a comma fragment binding an adverb as an object, e.g. one
observed case reading "scelus --scelere--> etiam" — "etiam" is not a noun),
because a real orthographic comma inside a Latin sentence very often sits
INSIDE a clause, not between two complete ones, and forcing that boundary
produces exactly the kind of unfounded structure this project's whole
falsification-first culture exists to refuse. A genuine clause segmenter
(subordinating-conjunction-aware, at minimum) is the natural next
measurement, not attempted here.

**A permanent, shipped `pos-lat.json`** (mirroring `pos-grc.json`/
`pos-eng.json`'s own status as a committed resource) was deliberately NOT
added — this pass builds one locally, on demand, from the already-committed
treebank, and whether Latin's POS prior should join that family as a
standing resource is a broader decision (touching `live_priors`'s own
convention, per this session's own "large files → live_priors" rule) left
for the next pass that actually needs it as a standing artifact rather than
a one-off measurement input.
