# The falsifiable corpus, found: one event, many reporters, an authority that names its own methods (2026-09-04)

`node native/eval/the-fold/sanriku-quantities.mjs`. **Zero model calls.**

User: *"this needs to not be about good journalism ethics but needs to be
falsifiable against things that can be objectively measured (but are
subjectively reported)"* — then: *"go find it."*

`contradiction-kinds-prose-RESULTS.md` ended on the number that decided the
next corpus: on the cited-source material, **distinct quantity values reported
by two or more distinct sources = 0 of 35.** One article's citation list cites
each quantity once. The programme needs many independent reports OF ONE EVENT
with an authoritative measured record as oracle.

## The corpus

**The 2026 Sanriku earthquake**, 20 April 2026, off Miyako, Japan. Oracle: the
USGS event record `us6000sri7`, fetched from the FDSN API as raw bytes and
committed. Reports: independent publishers.

Two things make it the right event rather than merely a convenient one.

**1. The authority disagrees with itself, and says why.** One USGS record
carries the same quantity measured several ways:

| depth | method | source |
|---|---|---|
| **25 km** | preferred origin (hypocentre) | us |
| **35 km** | moment tensor (centroid) | us |
| **35.5 / 36 km** | centroid, Mww / Mwb solutions | us |
| **10 km** | Pacific Tsunami Warning Center origin | pt |

None is wrong. A hypocentre is not a centroid, and a tsunami-warning origin
uses an assumed depth for speed. **This is the individuation kind, on
objectively measured data, with the authority itself naming which method
produced which number.** A system that sees "25 vs 35 vs 10, contest, seek a
third source" is wrong, and here it is *provably* wrong rather than
arguably so.

It also resolves a live discrepancy: Wikipedia states the USGS depth as 35 km;
the preferred origin says 25. Wikipedia took the centroid.

**2. The scales differ across reporters.** USGS 7.4 `Mww`; the BBC's live
coverage states 7.7 (the JMA `MJMA` figure) three times and 7.5 twice; GCMT
gives 7.5 `Mw`. Same number-slot, different scales.

## The number that was 0 of 35

| | cited-source corpus | Sanriku |
|---|---|---|
| quantities reported by 2+ distinct sources | **0 of 35** | **2 of 3** |
| claims extracted | 35 | 38 |
| distinct sources on `magnitude` | — | 4 |
| distinct sources on `depth` | — | 3 |

The density the programme needs is there.

## Two defects in this pass, neither papered over

**1. The typing rule is too permissive.** It reads "different scale or
different method ⇒ not a contest", and since nearly every claim here comes
from a different USGS product, it types **28 of 28** rival pairs apart and
leaves **0** contests. A rule that never returns a contest is not a rule. The
BBC's 7.7 against USGS's 7.4 came out "typed apart" for the wrong reason — its
`method` string differs, not because anything checked that MJMA and Mww are
different scales. A real version needs a received table of magnitude scales
and of origin methods, with a giver, not a string comparison.

**2. The prose extractor does not know which event a number belongs to.** The
BBC live page yields magnitudes 4.3, 7.5, 7.6, 7.7 and **9** — and 9 is the
2011 Tōhoku earthquake, referenced for context, while 4.3 is an aftershock.
Only some of those numbers are about this event.

**That second defect is the finding worth carrying.** On real reporting the
hard problem is not comparing numbers; it is knowing **which event a number is
about**. That is the individuation kind again, arriving at the quantity level,
and it will dominate any corpus of live coverage. Object identity has to be
settled before any two numbers can be called rivals.

## What this does not do

- No ledger was built, no note admitted, no witness asked. This finds and
  characterises the corpus.
- One event, one oracle, two publishers actually fetched (Reuters returned
  401; the AP hub page was not the article). The Japanese-language reporters
  the event's own references name — Asahi, Yomiuri, Hokkaidō Shimbun, Iwate
  Nippō, Mainichi, NHK — are not yet fetched, and they are where the
  cross-source overlap on tsunami heights lives (Kuji 80 cm is carried by two
  of them).
- `sharedTextGroups` should be run over the reports before any of them are
  counted as independent. The two USGS event IDs (`us6000sri7`, `pt26110000`)
  already proved the point by returning byte-identical records.

## Files
`sanriku-quantities.mjs`, `fixtures/sanriku/usgs-us6000sri7.json` (oracle,
raw API bytes), `fixtures/sanriku/bbc-live.html`.
