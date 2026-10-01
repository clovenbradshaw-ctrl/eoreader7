# Does the learned route do what the typed one did, on the page's own index and real books? The enclitic fold, measured again

Driver: `eval/the-fold/possessive-audit.mjs --learned eng` · organ: `organs/identity-routes.js` (`learnedNameFold`) · prior: `priors/name-forms-eng.json` ·
raw record: `possessive-audit-learned.raw.json` · labels: `possessive-audit-labels.json` (the S137 labels — no pair this run reached needed a new one) ·
reader: `tests/possessive-audit-learned-results.test.js`. Law: READING-SPEC.md S139. The typed route's own audit: `possessive-audit-RESULTS.md` (S137).

## What was asked

The user's direction (2026-10-01): "LaVar, get in here with our reading pipeline, none of this one off this thing." The type-level audit
(`eval/lavar/results/sullivan-names-RESULTS.md`) says the learned English prior matches the typed route on a treebank's gold: one type of 1,186 apart, and
none apart on an independent treebank. A treebank is not the page. This asks the same question where it matters: on the index the page builds
(`cast.js::makeReferentIndex`, with the fold as its `surfaceFold`, in recovery mode), over real books, on the queries S137 measured — does the learned
route answer what the typed route answered, and where it does not, which is right?

## Method

The S137 audit unchanged — seven corpora of `live_priors`, eight files each by a seeded shuffle (seed 31), the first 120,000 characters of each, 55
documents, 21,886 queries in three families (F1 a surface asked as written; F2 the bare form of a surface that wears the mark; F3 a question's possessive
of an established bare surface) — with one more index built over each document: **L**, the index with the learned route as recovery, beside **R**, the
typed route that ships today. The queries are generated exactly as for S137 (the bare form of an F2 query comes from the typed fold), so both routes answer
the same queries, and every query the two answer differently is kept in the record (`diffs`). Run with no flag the driver's output is the S137 record:
re-run today against the same corpus and engine, `possessive-audit.raw.json` reproduces byte for byte (`cmp`), so the comparison is on the same ground.

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

THE LEARNED ROUTE (L) — prior priors/name-forms-eng.json, learned from UD_English-EWT · operating point share 0.95, count 10, k 2, stem floor the consumer's · giver: UD_English-EWT

| corpus | queries | answered differently from R | exact answers L changed | spelling guesses L pre-empted | F3 gained (L) | F2 recovered (L) | L joins |
|---|---|---|---|---|---|---|---|
| 01-literature-books | 3875 | 1 | 0 | 24 | 1103 | 12 | 16 |
| 02-encyclopedic | 8758 | 1 | 0 | 24 | 1136 | 3 | 5 |
| 05-academic-papers | 2713 | 0 | 0 | 9 | 711 | 4 | 3 |
| 06-government-legal | 772 | 4 | 0 | 4 | 368 | 0 | 0 |
| 14-holy-texts | 1069 | 0 | 0 | 1 | 522 | 0 | 0 |
| 15-western-canon | 4379 | 0 | 0 | 29 | 1167 | 27 | 26 |
| 18-childrens-books | 320 | 0 | 0 | 0 | 158 | 0 | 0 |
| **all** | 21886 | 6 | 0 | 91 | 5165 | 46 | 50 |

distinct pairs reached by the learned route: 41; by the typed route: 42; by both: 41; by L only: 0; by R only: 1
L all: 41 · same-being 37 · different 1 · cannot tell 3 · unlabelled 0 · false-join rate 2.6% of 38 decided
R only: 1 · same-being 0 · different 0 · cannot tell 1 · unlabelled 0

queries the two routes answered differently: 6 of 21886
  [01-li] F2 "Sub Julio"  baseline []  typed ["Sub Julio’"]  learned []
  [02-en] F2 "New Comedy"  baseline []  typed ["New Comedy'"]  learned []
  [06-go] F2 "Asamblea General Jmo Jnia"  baseline []  typed ["Asamblea General Jmo Jnia'"]  learned []
  [06-go] F2 "Eli"  baseline []  typed ["Eli'"]  learned []
  [06-go] F2 "Juú"  baseline []  typed ["Juú'"]  learned []
  [06-go] F3 "General Jmo Jnia's"  baseline []  typed ["Asamblea General Jmo Jnia'","General Jmo Jnia"]  learned ["General Jmo Jnia"]
<!-- audit:end -->

## What the result says

**1. The two routes answer 21,880 of 21,886 queries identically.** The learned route gains the same 5,165 of 5,321 possessive-form queries, changes no
answer the index had given by an exact match (0), pre-empts the same 91 one-edit spelling guesses, and reaches 41 of the 42 distinct pairs the typed route
reaches and none the typed route does not. Its 41 pairs are all already labelled: 37 the same being, 1 different, 3 cannot tell — a false-join rate of 2.6%
of 38 decided, the typed route's own. The one pair only the typed route reaches is a cannot-tell.

**2. The six queries that differ are all one thing: the typed route strips an apostrophe the learned prior has no rule for.** In each the typed route
also reaches a referent that wears a trailing apostrophe after a letter that is not s, and the learned route does not:

| query | the typed route also reaches | what the apostrophe is |
|---|---|---|
| `Sub Julio` (F2) | `Sub Julio’` | a closing quotation mark in Dante, `‘Sub Julio’ was I born` — the same phrase, so the identity is right and the reason is an accident |
| `New Comedy` (F2) | `New Comedy'` | markup left in a Wikipedia extract, `New Comedy'', 1st century BC` — the same |
| `Eli` (F2), `Juú` (F2), `Asamblea General Jmo Jnia` (F2), `General Jmo Jnia's` (F3) | `Eli'`, `Juú'`, `Asamblea General Jmo Jnia'` | the glottal-stop letter of a Chatino text, `udhr-chj.txt` (the UDHR in Chatino): part of the word, not a mark on it |

The last four are the typed route applying an English rule to a document that is not English. That is the declaration problem the learned route was built
around, and the audit has it too: it declares `--language eng` once for every document of a corpus, including the multilingual UDHR translations. A page
that declared the language of its material would not have folded a Chatino name by an English possessive rule, typed or learned. The learned prior does not
fold them for the right reason — nothing in what an English treebank's names come with says a bare apostrophe after a vowel is a mark — and that same
silence is why it misses the two English cases, where the typed route's recovery is right by accident.

**3. It is the type-level result, seen from the page.** The audit's paired treebank table has one type the typed route gets and the learned prior does
not, `Cox'`, an apostrophe after a letter that is not s; this finds the same shape at the page level, six times in 21,886 queries, in two English
extraction artifacts and four times in a language the route was never licensed for.

## What this does not show

- **Equivalent, not better.** On English the learned route does what the typed one did and no more; what licenses replacing it is that it is the same
  procedure that learned French elision, and every other language's marks are a treebank away. The French prior has not been audited on a page: no French
  corpus is in this sample, and its type-level result (38 of 38 TEST types) is the evidence it stands on.
- **The two English differences are real recoveries lost.** `Sub Julio` and `New Comedy` were reached by the typed route; the learned route does not reach
  them. The cause is upstream — the extractor kept a closing quote and a run of markup on a surface — and is not repaired by a rule that calls a quotation
  mark a possessive.
- **One corpus family, English, one judge.** The sample is `live_priors`, as for S137; the labels are the route's author's, not a second reader's, and no
  pair needed a new one. The six differing queries were read in context, not labelled as joins.
- **Not carried:** the relation reader's own index and the holograph's replica of `resolve`, as S137 says.

## Reproducing

```
cd native
node eval/the-fold/possessive-audit.mjs --raw eval/the-fold/results/possessive-audit-learned.raw.json --learned eng \
  --labels eval/the-fold/results/possessive-audit-labels.json --update-doc eval/the-fold/results/possessive-audit-learned-RESULTS.md
node --test tests/possessive-audit-learned-results.test.js
```

About four minutes (the S137 audit is three and a half). The raw record is a superset of `possessive-audit.raw.json`, and the reader test checks that its
typed arms ARE that record.
