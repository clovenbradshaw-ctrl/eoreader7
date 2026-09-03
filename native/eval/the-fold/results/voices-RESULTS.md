# Unclaimed reproduction, and how many VOICES the ledger is counting

Driver: `eval/the-fold/voices-measurement.mjs` (re-runnable; `PAGES`, `MIN_RUN`).
Organs: `kernel/reproduction.js`, `organs/voices.js`. Spec entry: S50.

`standingOf` counts DISTINCT REFS and calls two of them "corroborated". A ref
is a page. Nothing anywhere asks how that page came to say what it says. This
measures the gap between the two counts on real material.

`MIN_RUN = 40` normalized characters, DECLARED (P4/P9) — about seven words of
English, above `quotes.js`'s own `MIN_QUOTE_WORDS` floor of five, which that
file calls "the smallest run that is a clause rather than a collocation."
Not tuned against either arm's outcome.

---

## Arm 1 — the discovery material (three Civil War pages)

`PAGES=wikipedia-battle-of-gettysburg.html,wikipedia-american-civil-war.html,wikipedia-abraham-lincoln.html`

```
reproductions: 277 runs, 38,718 units, across 3 pages in 1.7s
  [7806] american-civil-war -> abraham-lincoln: " - v - t - e American Civil War Origins - Origins - Timeline leading to the War - Bleeding"
  [7806] abraham-lincoln -> american-civil-war: (the same run, reported from the other side)
  [7794] battle-of-gettysburg -> american-civil-war: (the same template, 12 units shorter)

ledger: 1,757 notes

notes standing on >=2 SOURCES (the count today):        10
of those, standing on >=2 independent VOICES:            0
collapsed to one voice by a reproduction nobody claimed: 10
```

Every one of the ten:

```
"Baltimore"      --riot-->      "of 1861"   3 sources -> 1 voice
"Confederate"    --revolving--> "cannon"    3 sources -> 1 voice
"New Orleans"    --riot-->      "of 1866"   3 sources -> 1 voice
"New York City"  --riots-->     "of 1863"   3 sources -> 1 voice
"South Carolina" --riots-->     "of 1876"   3 sources -> 1 voice
"Memphis"        --riots-->     "of 1866"   2 sources -> 1 voice
"Meridian"       --riot-->      "of 1871"   2 sources -> 1 voice
"Old"            --soldiers'--> "homes"     2 sources -> 1 voice
```

**10 of 10.** Not a sample — every note this ledger called corroborated on
these three pages was carried by ONE transcluded navigation template, and the
addresses read back to prove it. The old count is not slightly optimistic
here; on this material it is measuring nothing but transclusion.

Two things this arm does NOT claim. It does not say those claims are false —
the navbox's contents are ordinary Wikipedia link text, and a template
carrying a true claim carries a true claim. And it does not say the pages are
dishonest. It says the ledger had one witness and reported three.

---

## Arm 2 — net-new material, unrelated domain (P71 cross-domain replay)

`PAGES=wikipedia-alan-turing.html,wikipedia-bletchley-park.html` — two pages
in a different century, a different subject, and a different article family
from the discovery set. Nothing in either organ was touched between arms.

```
reproductions: 135 runs, 6,702 units, across 2 pages in 0.5s
  [98] alan-turing -> bletchley-park: " Make sure they have all they want on extreme priority and report to me that this has been"
  [98] bletchley-park -> alan-turing: (the same run; note the leading-case difference — found under the fold, not raw)
  [85] alan-turing -> bletchley-park: " - Agar, Jon (2003). The government machine: a revolutionary history of the computer "

ledger: 647 notes

notes standing on >=2 SOURCES (the count today):        0
of those, standing on >=2 independent VOICES:            0
collapsed to one voice by a reproduction nobody claimed: 0
```

**The finder transfers; the correction has nothing to correct here, and that
is the honest result rather than a disappointing one.** Two separate facts:

1. `kernel/reproduction.js` runs unmodified on material it never saw and
   finds real unclaimed reproductions — a shared bibliography row, and
   Churchill's "Action This Day" memo carried on both pages. Neither page
   marks the other in any way.
2. `organs/voices.js` collapses nothing, because this pair corroborates
   nothing: zero notes reach two sources at all. The correction is bounded by
   the thing it corrects, and this repo already measures that thing at ~2%
   (the corroboration wall, P83 / `reading-recall-finding.md`).

So arm 2 replays the mechanism, not the finding — which is what a
cross-domain leg is for. A second arm that reproduced arm 1's 10-of-10 would
have meant the two materials were less independent than claimed.

---

## What the shared units do NOT distinguish, stated because it bit

Arm 2's three findings are three DIFFERENT situations wearing one shape:

| situation | arm 2 example | is one voice? |
|---|---|---|
| transclusion | (arm 1's navbox) | yes — one template |
| shared bibliography row | `Agar, Jon (2003)…` | yes for that row's own content |
| both quoting one origin | Churchill's memo | yes for the memo; **no** for each page's commentary on it |

`kernel/reproduction.js` reports shared units and refuses to guess which of
these it is looking at — the units do not carry the answer. What keeps the
third row from destroying real corroboration is `voices.js`'s per-claim gate:
a witness is demoted for a note only when THAT NOTE'S OWN SPAN falls inside
the shared run, so two pages quoting one memo are one voice for the memo's
own content and stay two voices for everything they each say about it. That
is the control built to fail in `voices.test.mjs`, and arm 2's Churchill case
is the real-material instance of it.

## What no arm establishes

`contextChecked: false` on every finding and every collapse. A verified
reproduction says the units are shared. Whether a repeater's surrounding
material uses them faithfully needs the origin read in its own context, and
nothing in either organ does that. Pointing Ranke's citation-chase at a
*found* reproduction is the named next rung, not something measured here.

Neither arm establishes that any collapsed claim is false, that any surviving
claim is true, or which body came first — reproduction is symmetric and both
directions are reported, deliberately.

## Reproduction

```
cd native/eval/the-fold
node voices-measurement.mjs                                   # arm 1 (the defaults)
PAGES=wikipedia-alan-turing.html,wikipedia-bletchley-park.html \
  node voices-measurement.mjs                                 # arm 2
```

Arm 1 takes ~2 minutes, nearly all of it the ledger read (122s of 124s); the
reproduction pass itself is 1.7s on 3 pages after the seed index (it was
quadratic and unusable before — see `kernel/reproduction.js`'s own note).
