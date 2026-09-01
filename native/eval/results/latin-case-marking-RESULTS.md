# Case-marking relation extraction, Latin — measured against real held-out UD data

`relations-case-marked.js`'s full pipeline (raw sentence in, `{end1, label,
end2}` out) run against 380 held-out UD_Latin-Perseus TEST sentences
(`native/eval/fixtures/ud-latin-perseus/la_perseus-ud-test.conllu`, never used
to build `live_priors/derived-priors/case-priors/case-marking-lat.json`
— moved there 2026-08-30, act-priors' own precedent), restricted to single-finite-
verb clauses (559 of 939 test sentences skipped — multi-clause sentences need
clause segmentation this organ does not attempt, named rather than silently
included and scored wrong). Reproduce with:

```
node native/eval/latin-case-marking-eval.mjs
```

## Why this exists

`relations.js`'s own header states its slot-finding is **positional**: "the
token immediately FOLLOWING a candidate referent surface... the slot SVO
order puts a verb in." That is a fact about analytic, fixed-word-order
languages, not about clauses in general. This is the demonstrated-necessity
case (S31's own gate): Latin has free constituent order and a real,
receivable case-ending system, so the claim can be measured rather than
argued.

## Headline numbers

| slot | vs. gold | precision | recall | tp | fp | fn |
|---|---|---|---|---|---|---|
| `end1` | `nsubj` | 0.258 | 0.077 | 17 | 49 | 205 |
| `end2` | `obj`   | 0.325 | 0.118 | 25 | 52 | 187 |

Modest by conventional NLP standards, and reported as exactly that — not
tuned past what the mechanism actually earned. `end1` and `end2` are **not
equally reliable** and a caller should not treat them as if they were (see
below for why, measured, not assumed).

## The clean proof: position carries no signal here

A real, held-out, gold-matched specimen: **"possedit cetera pontus"** — literally
"possessed the-rest the-sea" (the sea possessed the rest), verb-object-subject
order. This organ reports `end1=pontus` (nominative), `label=possedit`,
`end2=cetera` (accusative) — exactly matching gold `nsubj`/`obj` — using zero
information about word position. A positional extractor has no rule that gets
VOS order right by construction. Pinned as a regression in
`native/tests/relations-case-marked.test.js`.

## Why recall is what it is, isolated from verb-finding

Testing the case-classification step ALONE (given the gold token directly, no
verb-finding or sentence-level competition):

| | total gold | confident reading | correct when confident |
|---|---|---|---|
| `nsubj` (want Nom) | 937 | 767 (82%) | 279 (36%) |
| `obj` (want Acc) | 1021 | 899 (88%) | 772 (86%) |

**Nominative is genuinely the least systematically marked Latin case** — a
known fact in Latin morphology (3rd-declension nominatives are often
irregular, stem-final-consonant-driven, rather than suffix-patterned), not an
artifact of this organ. Accusative fares far better because `-um`/`-am`/`-em`
are comparatively unambiguous (measured: `-am` is 100% `Acc|Sing` in the
training data). This asymmetry is real and disclosed, not smoothed over.

## Real bugs found by measuring against gold, not by reasoning about it

1. **Punctuation stripping.** A whole-token-must-be-punctuation regex never
   trimmed `"manent."` to `"manent"`, so a huge share of verb tokens were
   invisible to every suffix check. Fixed with a leading/trailing `\p{L}`
   boundary trim (the same discipline `pronouns.js`'s own `surfaceMatcher`
   already holds).
2. **Mined vs. received personal endings.** The first cut mined 3-character
   verb-personal-endings from the same 1,334-sentence training set the case
   table uses, and it under-covered badly: only 75 of 224 distinct endings
   cleared a volume-5 floor, because personal-ending morphology fragments by
   conjugation-stem vowel (`-ent` vs `-unt` vs `-ant` are all "3rd person
   plural," landing in separate buckets). Replaced with a received closed
   class (Allen & Greenough's *New Latin Grammar*) — a structural-floor-vs-
   model-of-the-material distinction this codebase already draws elsewhere
   (`meta-parameters-INVENTORY.md`).
3. **Weak-ending collisions.** Bare single-character personal endings
   (`-o` 1sg, `-m` 1sg, `-t` 3sg, `-or` 1sg deponent) collide constantly with
   common noun-case endings — `-o` is also 2nd-declension ablative singular,
   `-m` is how every 1st/2nd-declension accusative singular ends, `-or` is
   also the common 3rd-declension nominative agent-noun suffix
   (`praedator`, `victor`). Unguarded, this forced a spurious second "verb
   candidate" on 163 of 222 real single-verb test sentences
   (`ambiguous_verb`). Fixed by withdrawing a `weak` personal-ending match
   when the SAME word also carries a confident nominal reading — the more
   specific signal wins, never dropped outright.
4. **Prepositions.** `"Super"` (over/above) reads its `-er` ending as a
   plausible nominative; unguarded, a preposition opening a sentence was
   reported as its own subject. Closed with a small, received Latin
   preposition list — the same closed-class-exclusion discipline
   `priors.js`'s `NEGATION_WORDS`/`FIRST_PERSON` already hold for English.

## Disclosed, not attempted

- **Multi-clause sentences** (clause segmentation) — 559 of 939 test
  sentences, named and skipped rather than silently scored.
- **Bare-stem imperatives** — Latin's 2nd-singular imperative often carries
  no personal ending at all (`mitte`, `carpe`), indistinguishable from a noun
  stem by ending alone.
- **Noun-phrase-internal agreement** — an attributive adjective or participle
  sharing its head noun's case (`deiectum leo`, "a fallen lion": both
  nominative, one phrase) reads as a second same-case candidate and correctly
  gaps as `ambiguous_nominative`/`ambiguous_accusative` rather than guessing
  which token is the actual clausal argument. A real ceiling on recall, not a
  bug — resolving it needs phrase-boundary detection this pass does not build.
- **`esse` (to be)** — present indicative only; imperfect/future/perfect forms
  are a disclosed, unattempted extension.
- **A second case-marking language** — the mechanism (declared case prior +
  received personal-ending closed class + weak-ending collision resolution)
  is not Latin-specific in its *shape*, but nothing here generalizes it
  without a second language's own measured prior; not attempted.

## Generality

**Generality:** specimen-scoped (disclosed; not claimed further) — measured
on one language (Latin), one treebank (UD_Latin-Perseus), one register
(classical prose/poetry). The mechanism's SHAPE (declared per-language case
prior, ambiguity preserved, a received closed class for verb morphology,
weak-signal withdrawal on collision) is a candidate pattern for other
case-marking languages, not a demonstrated one — a second language's own
measured prior and eval would be required before calling it universal.
