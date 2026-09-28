# Occupancy testimony — registered run, 2026-09-27

Driver `occupancy-eval.mjs`, committed before it ran (78b555c). Raw:
`occupancy-eval.json`; Wikidata key cached in `fixtures/wikidata-occupancy-key.json`.

| | prediction | result |
|---|---|---|
| O1 | encyclopedic: >= 50% of keyed standings confirmed, control at most half | **failed** — 2 of 6 (33%), control 17%; and the key is itself unsound (below) |
| O2 | War and Peace: "Count Bezukhov" found with Pierre as occupant | **failed** — no Bezukhov standing |
| O3 | the statute yields none (weak) | held |
| O4 | every standing feeds kernel/sequence.js | held — 24 standings, 23 loci, 0 edges; refuteLocus cannot testify on undated standings, as it says |

Refused, by reason — encyclopedic: state 25, kind 12, occupant is a
description 8, irrealis 4; novel: state 65, kind 10, description 11,
irrealis 11. The structural typing refuses far more than it admits, and the
irrealis wall fired on "Pierre will not be Pierre but will become Count
Bezukhov" — correctly: that sentence is a prediction, not testimony.

## What failed, in the reader

**Occupants were found by capitalisation.** "He", "Several", "Claims",
"Loping", "Italian", "CM", "You" were taken as names — the-fold's L2
("capitalisation is a differentiator, never the primary signal"), broken by
rebuilding a name finder instead of using the engine's referent organs, which
already refuse a sentence-initial capital. And the real Bezukhov testimony has
no name beside the verb ("he is now Count Bezukhov"; "Pierre, on unexpectedly
becoming Count Bezukhov") — it needs pronoun and participle resolution this
reader does not have.

**A definite description was taken for a position.** "the first human to
walk", "the preferred method", "the latter". EO already names the missing
test: a position is a PATTERN — it recurs across occupants. A definite
description held once is a Figure. Admission needs pattern evidence: two
distinct occupants of one locus, or a succession pointer.

## What failed, in the key

**The key resolved people by string, the same error.** "Johnson" (Katherine
Johnson) resolved to Boris Johnson, and her standing was "confirmed" only
because "State" appears in both "West Virginia State College" and "Secretary
of State". "Joseph" resolved to Joseph Dalton Hooker. Murat's "King of Naples"
is not in his P39 at all. O1 is uninterpretable, not merely failed.

The medium already carried the answer, and the HTML stripping deleted it: on
Wikipedia every name is a hyperlink to that person's article — the author's
own pointer to the referent, resolvable to a Wikidata item through its
sitelink. Reader and key should both stand on that pointer, and positions
should be matched by item, never by shared words.
