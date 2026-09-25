# Does furniture blanking change the GRAPH? No.

Ran 2026-09-04. **0 model calls, offline, 5 size-matched null draws per page.**
Driver: `cast-furniture-hypergraph.mjs`.

This **corrects** `cast-furniture-RESULTS.md` and retracts two claims made from
it.

## What was wrong with the earlier measurement

`cast-furniture.mjs` measured `idx.referents` and `idx.represent()` — the
referent index, one tier *below* the hypergraph. The question it was answering
was about the hypergraph: *"pressure test our assertions about what is chrome
by seeing if not ignoring it provides meaningful change to our hypergraph."*
A referent set is not a graph.

Worse: the `{ blanked }` option it exercised **reached nothing in a real
reading.** `hypergraph.js` called `indexFor(list)` with no options, so no edge,
claim or slot was ever affected. An export nothing calls — the exact shape
`unwired-organs.mjs` was built to find, committed in the same pass as that
audit.

`organs.castReadsBlanked` now threads it through (default false; 584 pass /
0 fail / 1 todo unchanged).

## The result

| page | edges | lost | **corrupt removed** | **real lost** | enrichment | null | verdict |
|---|---|---|---|---|---|---|---|
| battle-of-borodino | 327 → 318 | 15 | **0** | 15 | 0 | 0–0 | inside |
| war-and-peace | 277 → 272 | 6 | **0** | 6 | 0 | 0–0.17 | inside |
| apollo-11 | 569 → 590 | 3 | **0** | 3 | 0 | 0–0 | inside |

**Totals: 0 corrupt edges removed, 24 real edges lost.** Unanimous across
three pages, including the two that beat their null at cast tier.

Axis is the same one `cast-furniture.mjs` pre-registered — corrupt edges
removed per real edge lost, high is good — moved one tier up. An edge is
*corrupt* when its subject no longer occurs in the surviving text, i.e. the
subject was furniture-born.

## Why zero, and it was predicted in the driver's own header

The reader **already** blanks furniture for extraction
(`passageBlanked` / `blankedSentence`, page-scoped, 13–63× more than the
per-sentence version). Navbox *edges* were gone before this flag acts. The
furniture-born referents exist in the cast, they look alarming, and **they
never captured a real sentence's subject in a bound edge.** They were inert.

## What is retracted

* **"Upstream of every identity claim in the repo"** — withdrawn. It is
  upstream of `represent()`, and `represent()` is not on the reader's edge
  path.
* **"The next thing to fix, highest leverage per line changed"** — withdrawn.
  At the graph tier it buys nothing and costs 24 real edges across three
  pages.

## What still stands

* The navbox referents are real, and **verified in the raw fixture bytes**:
  `Light While There` ← *Walk in the Light While There is Light* (1888);
  `Dialogue Among Clever People` ← the 1892 story; `One Appointment` ←
  *Story of One Appointment*; all Works-by-Tolstoy navbox links.
* The cast-tier measurement stands as a cast-tier measurement: 2 of 6 pages
  beat their null, 716 furniture-only referents removed against 136 real names
  lost.
* The wire stands, default off, now with a measurement saying **do not turn it
  on** for graph work. Append-only: the finding goes on the record rather than
  the flag being deleted.

## The decomposition that was collapsed

The corrupted surfaces reported earlier have **three different causes**, and
they were reported as one. Only the first is furniture:

| surface | actual cause |
|---|---|
| `Light While There`, `Dialogue Among Clever People`, `One Appointment`, `Mesoten` | genuine navbox link titles |
| `August Prince Andrew` | Tolstoy: *"On that bright evening of **August 25, Prince Andrew** lay leaning on his…"* — a month name abutting a personal name across a comma and a numeral. **Ordinary prose, zero furniture.** |
| `Tolly Pyotr Bagration DOW` | casualty-table row debris (`DOW` = died of wounds) |

A seam hypothesis was tested and **refuted**: 234 of 1190 pooled chunks
(19.7%) end without terminal punctuation, and `makeReferentIndex` joins
passages with `"\n\n"` — but `splitSentences` splits on that correctly, and
a two-chunk join where the first has no terminator yields the surfaces
`["August", "Andrew"]`, separate. The join is not gluing anything.

## The real lead

`represent(id)` is *the longest established surface* for a referent
(`cast.js`: `if (!prev || e.surface.length > prev.length)`). The harm appears
wherever something **canonicalizes through it** — `rashomon-contrast`'s
cross-source docket, where `canon()` collapsed 1537 slots to 251 and returned
`Dialogue Among Clever People` as a referent — and nowhere on the reader's own
edge path, which never calls `represent()`.

So the target is the representative rule and the capitalized-run extraction
behind it, not furniture blanking. That is a different organ, a different
cell, and a claim this run does not make.
