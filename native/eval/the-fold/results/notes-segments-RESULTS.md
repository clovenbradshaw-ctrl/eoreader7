# Ground / figure / pattern over what was heard — the ledger cut by surprise (2026-09-02)

**Kernel:** `kernel/notes.js` (the assertion ledger, medium-blind — ends
`end1/label/end2`, gate injected, frame declared at birth) reading its own
hearings as a stream and handing them to `kernel/surprise-segments.js`
unchanged. **Driver:** `eval/the-fold/notes-segments.mjs`. **Material:**
three real committed Wikipedia pages (Battle of Borodino, War and Peace,
Бородинское сражение), each read in DOCUMENT ORDER by the app's production
reader (native organs, POSPrior@1 vocabulary gate, received determiners and
negation, pronouns resolved; lemmatizer, verb-forms and noteIdentity omitted
— all of it declared on each ledger's own first entry). **Declared:** order 3,
alpha 0.05, 20 shuffles for the cut, minLength 3, depth 3 —
`surprise-segments.mjs`'s own numbers reused unchanged; 200 alignment draws.

**The question**, verbatim from surprise-segments-RESULTS.md: "the statement's
own units are the ARRANGEMENTS (floor 2) and the NOTES of the ledger (floor
5), streams where recurrence is dense and the ground can be right. Segmenting
THOSE by surprise is the next measurement." **The oracle**, held aside: the
page's own section headings (h2/h3 in the fetched HTML, located in the
readable face by offset) — does the ledger's surprise find where the source
turns, the way the Prelude's surprise found its bar?

## Result: no. At every grain, on every page, the cuts land on section turns at chance.

| page | notes (≥2 witnesses) | stream | distinct / hearings | boundaries | turns found | random median (95th) | random at/above |
|---|---|---|---|---|---|---|---|
| Borodino (en) | 340 (1) | id | 340 / 341 | 113 | 18% | 18% (23%) | 107 / 200 |
| | | end1 | 250 / 341 | 106 | 18% | 18% (23%) | 100 / 200 |
| | | label | 106 / 341 | 98 | 14% | 17% (23%) | 172 / 200 |
| War and Peace | 310 (0) | id | 310 / 310 | 103 | 19% | 19% (24%) | 108 / 200 |
| | | end1 | 201 / 310 | 94 | 20% | 19% (24%) | 84 / 200 |
| | | label | 105 / 310 | 87 | 20% | 20% (25%) | 108 / 200 |
| Бородино (ru) | 667 (9) | id | 667 / 677 | 224 | 11% | 11% (13%) | 110 / 200 |
| | | end1 | 552 / 677 | 217 | 10% | 11% (14%) | 138 / 200 |
| | | label | 125 / 677 | 179 | 12% | 11% (14%) | 58 / 200 |

(end2 rows omitted: byte-identical in shape to id — 339/341 distinct.)

The best arm anywhere is `label` on the Russian page, 12% against a null
median of 11%, with 58 of 200 random placements at or above it. Nothing here
is a figure at a section turn. Recursion condenses (113 → 1, 217 → 22 → 6)
exactly as it did on the Prelude — pattern forms out of figures — but the
figures are not where the source's own script says the topic changed.

## What it establishes, and what it does not

- **The ledger IS a stream the same segmenter reads.** No organ was changed
  to make this run; `notes.js::segment` hands `surprise-segments.js` the
  hearings and carries every boundary back to the entry it falls before.
  The mechanism transferred whole. The transfer earned nothing on this oracle.
- **The `id` and `end2` streams are the Aria's regime** (340 of 341 hearings a
  first occurrence): a ground that is never right has no figures, only
  novelty. `end1` (250 distinct) and `label` (106 distinct) are the dense
  streams the prediction named — and they did not find the turns either.
  So the honest reading is not "cut a denser stream"; it is that a page's
  SECTION is a convention of its script, like the sentence was, and not a
  peak of surprise in what the page asserts. Music's bar is a figure because
  the music is MADE of its recurrences; an encyclopedia's sections are made
  of its editors' decisions.
- **The one thing surprise found, consistently, on all three pages:** the
  most surprising hearings are the last ones, and they are all page
  furniture — `Short description —is→ different from Wikidata`, `category
  link —is→ on Wikidata`, `Wikisource —templates→ with missing id`,
  `Статьи —со→ спам-ссылками`. That is the point where the reading left the
  article and started hearing the wrapper. The surprise meter locates the
  DIET BOUNDARY of a reading without being told there is one — a real lead
  for the admission door (a high-surprise tail clustered at the end of a
  source is the shape of furniture, not of assertion), stated as a lead and
  not built here.
- **Two known walls, reconfirmed by the way:** the ≥2-witness starvation
  (1, 0 and 9 corroborated notes of 340, 310 and 667 — the same ~2% every
  earlier measurement found), and the English POS gate's silence on a
  non-English page (`turned away {}` on the Russian page while `—и→`, `—по→`,
  `—с→` sit in the label slot: an out-of-vocabulary label admits by P56's
  asymmetric rule, and every Cyrillic label is out of an English prior's
  vocabulary — a gate with no giver for this language is honestly no gate).
- **Every ledger here was born with its frame.** `frameOf(log)` on each
  returns the organs, the loaded priors, the omitted ones and the segmenter's
  declared numbers — the first entry of the log, DEF·Ground·declared. Three
  readings of three pages, each saying whose reading it is.

## What the run itself fixed

`notes.js::segment`'s flat cut first ran WITHOUT `alphabetSize`, while the
recursion passes each level's own alphabet — and the flat cut produced 1–17
boundaries where level 0 of the recursion produced 87–224 on the same
stream. The music driver passes `new Set(tokens).size` on every flat call;
the kernel now does the same, one rule. Found by the numbers disagreeing
with each other, not by review.

## Reproduce

```
cd eoreader7/native/eval/the-fold && node notes-segments.mjs
```
~60s; raw numbers in `results/notes-segments.json`. No model, no network.
