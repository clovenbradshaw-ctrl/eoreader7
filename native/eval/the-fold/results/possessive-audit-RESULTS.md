# The enclitic route: what folding "Anna's" to "Anna" joins, measured

Driver: `eval/the-fold/possessive-audit.mjs` · organ: `organs/identity-routes.js` · seam: `organs/cast.js` (`surfaceFold`, `surfaceFoldMode`) ·
raw record: `possessive-audit.raw.json` · labels: `possessive-audit-labels.json` · reader: `tests/possessive-audit-results.test.js`.
Law: the-fold POLICIES.md P263, READING-SPEC.md S137.

## What was asked

The user's direction (2026-09-30): "figure out the possessives and alias stuff, signal Chomsky and Sullivan." The gap, reproduced on a four-line text
before any corpus was read: `cast.js::resolve` compared a name to an established surface as written, so

- a question's **"Anna's"** reached nothing when the material said "Anna" (the query side), and
- a person the material names **only with the mark** — "Anna's dog barked at the postman." opens a sentence, and extraction strips the mark from
  every *other* mention but keeps it on a sentence-opener — was unreachable by "Anna" (the established side).

The first fix, in the E6 harness, folded the apostrophe clitic off **every token of both sides** through `nameFold`. This document asks what that
JOINS, and what the route that ships joins instead — because a merge route is judged on its marginal joins, never on its hits (live_priors LP11).

## The four indexes

| | what it is | status |
|---|---|---|
| **A** | the index as it stood (no route) | baseline |
| **R** | the last-token enclitic fold as **recovery**: consulted only when the name asked as written resolved to nothing | **ships** |
| **T** | the same fold applied **always**, to both sides | measured, not shipped |
| **E** | the clitic stripped off **every** token through `nameFold` (the E6 harness) | the control, built to fail |

Why last-token and why recovery are findings, not starting choices. `nameFold` reaches the engine's sameness test one token at a time
(`surfaces.js::tokensOf`), so it cannot see where in a name a token stands; a mark whose scope is the end of a phrase needs a whole-name fold, which is
why cast.js gained `surfaceFold`. And the always-on fold joins two referents the index kept apart.

## Method

Seven corpora of `live_priors` (literature, encyclopedic, academic, legal/government, holy texts, western canon, children's), eight files each drawn
by a seeded shuffle (seed 31 — not a file the alias exploration or its test sample read), the first 120,000 characters of each, indexed the way
app.js indexes (leading surfaces, optical fold, near-miss spelling, furniture blanking). Three query families, each against its own baseline so that what
the bare name already reached is never counted as a join the route made: **F1** every established surface asked as written; **F2** the bare form of a
surface that ends in the mark; **F3** a question's possessive of an established bare surface ("Anna's" for "Anna"). A **join** is a referent a variant
made reachable that the baseline did not; the unit of judgement is the **pair** (the referent the name was asked as, the referent it now also reaches),
labelled same being / different / cannot tell.

<!-- audit:begin -->
corpus /home/user/live_priors/ · categories 01-literature-books, 02-encyclopedic, 05-academic-papers, 06-government-legal, 14-holy-texts, 15-western-canon, 18-childrens-books · 8 files each (seed 31) · first 120000 chars · language eng

| corpus | docs | referents | surfaces | end in the mark | F3 asked | F3 gained (R) | F3 answered before | …of which ≠ the bare name's | F2 recovered (R) | exact answers R changed | spelling guesses R pre-empted | R joins | T joins | E joins |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 01-literature-books | 8 | 2133 | 2694 | 39 | 1144 | 1103 | 39 | 38 | 13/37 | 0 | 24 | 16 | 63 | 80 |
| 02-encyclopedic | 8 | 5250 | 7559 | 29 | 1170 | 1136 | 26 | 25 | 4/29 | 0 | 24 | 5 | 44 | 68 |
| 05-academic-papers | 8 | 1453 | 1959 | 6 | 748 | 711 | 13 | 12 | 4/6 | 0 | 9 | 3 | 10 | 10 |
| 06-government-legal | 8 | 284 | 392 | 5 | 375 | 368 | 4 | 4 | 3/5 | 0 | 4 | 1 | 2 | 2 |
| 14-holy-texts | 8 | 417 | 544 | 0 | 525 | 522 | 1 | 1 | 0/0 | 0 | 1 | 0 | 0 | 0 |
| 15-western-canon | 8 | 2341 | 3120 | 63 | 1200 | 1167 | 29 | 28 | 27/59 | 0 | 29 | 26 | 126 | 139 |
| 18-childrens-books | 7 | 119 | 161 | 0 | 159 | 158 | 0 | 0 | 0/0 | 0 | 0 | 0 | 0 | 0 |
| **all** | 55 | 11997 | 16429 | 142 | 5321 | 5165 | 112 | 108 | 51/136 | 0 | 91 | 51 | 245 | 299 |

(joins are query-level counts: a query that made the variant reach a referent the baseline did not. R's are answers where the index had none.)

R: 42 distinct pairs reached by the shipped route (R) — 24 same-name (a fragment wearing the mark joined to its bare fragment), 18 partial (the engine's own sub-form rule reaching the marked form)
T-only: 314 distinct pairs reached by the always-on fold and NOT by the route (T-only) — 83 same-name (a fragment wearing the mark joined to its bare fragment), 231 partial (the engine's own sub-form rule reaching the marked form)
E-only: 45 distinct pairs reached by the every-token control and NOT by the always-on fold (E-only) — 3 same-name (a fragment wearing the mark joined to its bare fragment), 42 partial (the engine's own sub-form rule reaching the marked form)
  R / same-name: 24 · same-being 21 · different 1 · cannot tell 2 · unlabelled 0 · false-join rate 4.5% of 22 decided
  R / partial: 18 · same-being 16 · different 0 · cannot tell 2 · unlabelled 0 · false-join rate 0.0% of 16 decided
  T-only / same-name: 83 · same-being 72 · different 5 · cannot tell 6 · unlabelled 0 · false-join rate 6.5% of 77 decided
  T-only / partial: 231 · same-being 51 · different 6 · cannot tell 18 · unlabelled 156 · false-join rate 10.5% of 57 decided
  E-only / same-name: 3 · same-being 2 · different 0 · cannot tell 1 · unlabelled 0 · false-join rate 0.0% of 2 decided
  E-only / partial: 42 · same-being 8 · different 31 · cannot tell 3 · unlabelled 0 · false-join rate 79.5% of 39 decided
R all: 42 · same-being 37 · different 1 · cannot tell 4 · unlabelled 0 · false-join rate 2.6% of 38 decided
T-only all: 314 · same-being 123 · different 11 · cannot tell 24 · unlabelled 156 · false-join rate 8.2% of 134 decided
E-only all: 45 · same-being 10 · different 31 · cannot tell 4 · unlabelled 0 · false-join rate 75.6% of 41 decided

answers R changed although the index had answered: 91 — 0 where the index had answered by an exact match (the fold promises none), 91 where it had answered only by the one-edit spelling guess
first 12 of the pre-empted spelling guesses:
  guess [01-li] "German's"  was ["The Germans"]  now ["German Protestants"]
  guess [01-li] "Christian's"  was ["Christians"]  now ["The Christian"]
  guess [01-li] "Spinoza's"  was ["Spinozas"]  now ["Spinoza"]
  guess [01-li] "NUANCE's"  was ["NUANCES"]  now ["NUANCE"]
  guess [01-li] "Indian's"  was ["Indians"]  now ["Indian"]
  guess [01-li] "Stoic's"  was ["Stoics"]  now ["Stoic"]
  guess [01-li] "SUFFICE's"  was ["SUFFICES"]  now ["SUFFICE"]
  guess [01-li] "Paduan's"  was ["Paduans"]  now ["A Paduan"]
  guess [01-li] "Pope's"  was ["Popes"]  now ["Pope Nicholas III","Pope Boniface","Pope Adrian V","Pope Anastasius","Pope Celestine V","Pope Martin IV","Pope"]
  guess [01-li] "Cardinal's"  was ["Cardinals"]  now ["Cardinal"]
  guess [01-li] "A Paduan's"  was ["Paduans"]  now ["A Paduan"]
  guess [01-li] "Heaven's"  was ["In Heaven’s"]  now ["Heaven","In Heaven’s"]
<!-- audit:end -->

## What the numbers say

**The route does what it is for.** 5165 of 5321 possessive-form queries (97.1%) resolved to nothing before and to the bare
name's referents after; none that resolved before resolves to nothing now. 51 of 136 referents that wear the mark are now reachable
by the bare name where the index had answered nothing (the rest were already reached by a bare fragment, and stay separate — see the next point).

**It changes no answer the index gave by an exact match: 0 of them, across 55 documents.** That is not asserted; the driver builds the
index a second time without the one-edit spelling fallback and counts every query the fold answered differently from the index while that index had
answered it exactly. The 91 answers that did change were answered before only by the spelling fallback — and the fold is consulted
before it, because an exact match outranks a guessed spelling. Read through, they are the fallback's own errors: "Spinoza's" answered "Spinozas" (the
plural), "Pope's" answered "Popes", "John's" answered "Johns Hopkins University Press", "Plato's" answered "Plato's Republic" (the book). None was found
where the old guess was right and the fold's answer wrong; two are neutral swaps between fragments of one being ("Shakyamuni"/"Sakyamuni", "Bethy"/"Beth").
That is one reader's read-through, not a measurement.

**The shipped route joins 42 pairs in 55 documents: 37 the same being, 1 a different being, 4 cannot tell — 2.6% of the
38 decided.** The one different pair is a surname whose honorific extraction dropped: "Edward Ferrars" and "Ferrars's" (Edward's mother, "Mrs.
Ferrars's resolution"), which the bare surname already could not tell apart.

**Folding always would join 314 more pairs, 8.2% of the 134 decided different beings** (156 partial pairs left unlabelled: a seeded sample of 60 of 231
was read). The wrong ones are the shape the recovery fold avoids by construction: two referents the index had kept apart, joined because they share a
surname or because discovery had already mixed a cluster ("Enter Othello's Herald" holds a surface "Othello's"; "Ambedkar's Navayana Buddhism" holds
"Ambedkar's").

**The every-token control is wrong 76% of the time on the joins the always-on fold does not make.** It joins a person to every title that contains their
possessive: "Dante" to eleven "Dante's …" headings, "Plato" to "Plato's Republic", "Peter" to "Peter's Basilica", "Aesop" to "Aesop's Fables". Folding the mark
off a token that is not the last one is folding part of a name.

## One more finding, from reading the first batch of joins

"Seven P's" folded to "Seven P", whose only token the index counts is "Seven", and "Seven" reached "The Seven Virtues" and "Righteous Kings". A one-letter
stem is the plural-of-a-letter idiom or a numeral, never a name: the fold leaves such a token as written, unless the caller licenses numerals
("Charles I's" still reaches "Charles I"). Two-letter stems stay ("Li's", "Wu's" are names). Declining can only fall back to what the index did before.

## Where the mark comes from (not fixed here)

Extraction strips the mark from every mid-sentence mention and keeps it on a sentence-opener, because `extractLeadingSurfaces` does not apply the
normalisation `extractSurfaces` does. That is why a referent can exist that wears only the marked form, and why the same person is sometimes two
referents (the T/E joins above are largely this fragmentation being joined back). The root fix is in discovery, not at resolve time, and changes every
cast; it is named here, not done.

## Disclosed limits

- **One judge.** The labels are mine (the route's author), made by reading each pair and, where a shared surname left it open, the sentences around it.
  Not blind to the variant, not independent, not a human panel — a proxy, labelled as one. 156 of the always-on fold's pairs were not read.
- **Synthetic F3 queries.** F3 appends "'s" to a seeded sample of established surfaces; it is the shape of a question's possessive, not a harvest of
  real questions, and it includes surfaces that are not names (headings, manuscript sigla), which inflates the gained count. The real-question checks are
  the unit tests and the E6/E7 harness.
- **English only.** The registry holds one language (`eng`); seven English genres are not a second language. Another language is a new entry with its own
  giver and its own run of this driver, or a typed gap.
- **A business named with the mark** ("Macy's") folds to the bare name under the always-on fold and does not under recovery (pinned in
  `organs/identity-routes.test.mjs`); recovery still folds it when nothing else answered.
- **Not wired:** the relation reader's own index (it carries no `nameFold` either, and a new key would change the reader's recipe identity, P90) and the
  holograph's replica of `resolve` in app.js (which predates `nameFold`; moving it onto `makeReferentIndex` would give it the optical fold, the spelling
  rescue and this route together).

## Reproduce

```
node eval/the-fold/possessive-audit.mjs --raw out.json --n 8 --seed 31      # ~3.5 minutes; needs ../live_priors beside this checkout (or --root)
node eval/the-fold/possessive-audit.mjs --summarize out.json --labels eval/the-fold/results/possessive-audit-labels.json
node --test tests/possessive-audit-results.test.js organs/identity-routes.test.mjs
```
