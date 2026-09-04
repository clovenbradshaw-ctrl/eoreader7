# The discovered kind and the hand-written door are the same rule

`node door-by-kind.mjs` — three real Wikipedia pages, 2,982 lines, oracle is
each page's own HTML classes (a channel no reader sees; discovery never reads it).

## What was asked

The admission door ships `blankBelowMeasure`, a rule written by hand: keep a
line that fills the document's own measure, in a run. The discovery pass then
found the same regularity by itself (`kind:before=la_a_`, 99% prose) plus two
furniture kinds nobody wrote down. So: does judging at the **discovered grain**
beat judging line by line?

The decision stays the same either way — does this fill the measure. Only the
UNIT changes: ask it of each discovered kind, keep every line whose kind is
kept. A short prose line inside a prose kind survives; a long furniture line
inside a furniture kind does not. A shape belonging to no discovered kind falls
back to the line rule, because an undiscovered shape is a fact about the
discovery, never evidence against the line.

## What happened

Two numbers are given for every arm, because **the oracle was corrected after
this measurement was first taken** — see the amendment at the end, which
explains what was wrong with it and why the correction cannot have been fitted
to these arms. The right-hand pair is the one to read.

| page | by line | by kind | lines differing |
|---|---|---|---|
| battle-of-borodino | 0.64059 -> **0.71978** | 0.65534 -> **0.73569** | 7 of 990 (kind right 6, line right 1) |
| battle-of-austerlitz | 0.67010 -> **0.71823** | 0.67013 -> **0.71866** | 3 of 1,002 (kind right 2, line right 1) |
| war-of-the-third-coalition | 0.64789 -> **0.73016** | 0.64789 -> **0.73016** | **0 of 990** |

**10 lines of 2,982 differ - 0.34%.** On one page the two arms are byte-identical.
The disagreement counts and the kind-right/line-right splits are **identical
before and after the oracle correction** - which arm keeps which line does not
depend on the oracle, only the scoring does.

## The verdict, and a correction to how it was being read

The driver's first verdict rule read "wins on some pages" as *fitted* and
refused to ship on that basis. That diagnosis is wrong on its own terms, and
the correction is recorded rather than quietly applied: **a fitted arm LOSES
off its development page.** That is the region arm's shape — 0.730 where it was
built, 0.489 and 0.208 where it was not. This arm loses on none. It also was
never developed against any of these pages: `discoverCompanyKinds` runs fresh
per page with its own null arm, so there is no development page to be fitted
to. Three outcomes needed separating, not two.

**It still does not ship**, for the honest reason rather than the wrong one:
ten disagreements decide nothing. Eight of ten going the kind's way is n=10 —
a coin lands 8 of 10 heads about one run in twenty. No control was spent
because there is nothing here a control could rescue.

## The finding

The hand-written rule and the discovered kind **are the same rule, found two
ways.** They agree on 99.66% of lines across three pages, and on one page
completely. That is not a null result — it is corroboration in this project's
own sense: one regularity, two instruments, and the instruments were built
independently (one by hand from reading pages, one by a null-gated discovery
pass that never saw the hand-written rule).

What it buys, stated plainly and not more: confidence that the door encodes
something in the material rather than something in its author. What it does not
buy: a better door.

## Where the door's real loss is

Both arms sit at recall ~0.59-0.61 and precision ~0.91-0.92 against the
corrected oracle. (Against the uncorrected one this read ~0.50 and was written
up here as "refusing half the prose" - that claim was wrong, and 43% of its
denominator was the page's own chrome. The corrected figure still means the
door refuses about **two prose lines in five**.) The door is not admitting
junk - it is refusing prose, on all three pages, in both arms.
Whatever fixes that is not at this grain; changing the unit from line to kind
moves 0.34% of lines. The two furniture kinds discovery found that the hand
rule does not encode are real, and they are also not where the loss is.

The refused prose splits into two populations that have nothing to do with
each other, and only one of them is the door's fault:

- **82 / 81 / 62 lines per page fall below the measure** - median length 9-17
  characters. These are section headings and `[ edit ]` links, which the
  corrected oracle still calls prose because prose is still its residual class.
- **8 / 8 / 12 lines per page FILL the measure and are refused anyway**, by the
  "in a run" clause alone - including a 632-character paragraph on Borodino, a
  1,309-character one on Austerlitz and a 1,358-character one on Third
  Coalition, every one of them plainly body prose. They stand alone because
  their neighbours are headings.

That second population is the door's real remaining loss and it has an obvious
candidate fix - a heading between two prose lines should not break a run.
**It is named here and deliberately not built**, because it was found *after*
these scores were seen, and this project's own rule is that a fix discovered
by looking at a score is pre-registered and replayed across pages before it is
believed, not implemented in the same pass that noticed it.

**Generality:** universal — the arms replay across three pages never seen
during either rule's construction, and the conclusion (they are one rule) is
what replays.


---

## Amendment, same day: the oracle was convicting by absence

Reading the refused lines to find out *why* recall was ~0.50 found that the
question was wrong. On Borodino, **114 of 266 lines the oracle called prose
(43%) were not prose**: `"Jump to content"`, `"From Wikipedia, the free
encyclopedia"`, and the campaign map's own pin labels - `"Pultusk"`,
`"Gorodeczno"`, `"330km"`, `"15"`.

**The cause is structural, and it is this project's own refused shape found in
its own ground truth.** `region-oracle.mjs` assigns `kindOf.get(text) ??
"prose"` - prose is the **residual**. There is no positive test for prose
anywhere in it, so any rendered content outside the six listed kinds is
convicted of being prose by default. Absence of a claim, read as presence of
the thing.

**Checked, not assumed:** the map labels are genuinely rendered `<div>`s, not
Parsoid payload leaking out of a `data-mw` attribute. Stripping all 416
`data-mw` attributes from the page leaves the text face byte-identical (80,299
chars either way), so `web.js`'s own attribute fix - which CLAUDE.md records
being made for exactly this class of bug - holds. The extractor is fine.

**Three strips were added, declared by container with a reason each:**
`div.thumb` (a figure is not body prose - its caption, its map labels, its
scale bar; the same standing `infobox` and `table` already have), `.noprint`
(the print-CSS convention for "not part of the document" - the page's own
declaration, not a guess), and `a.mw-jump-link` (accessibility skip-links).

**Two guards, because adjusting an oracle until the instrument under test
scores better is not an oracle:**

1. The strips were written and committed to **before** their effect on either
   arm was looked at.
2. **They cost zero real prose.** Across all three pages, 102 lines were
   reclassified and **not one of them is 60 characters or longer.**

And the check that matters most: **the correction did not move this document's
conclusion at all.** The two arms still disagree on exactly 7 / 3 / 0 lines,
still 6-vs-1 and 2-vs-1 on those, and by-kind still does not ship. An oracle
fix that changed the verdict would be the thing to distrust.

**Where it stops, and why.** After the three strips, the remaining short
"prose" is section headings and `[ edit ]` links. A fourth strip is defensible
- but the door's corrected score has now been seen, so a fourth strip would no
longer be blind. It is named and not taken.

**This invalidates the recall denominator of every prior measurement taken
against this oracle**, including the region-arm work. Precision is unaffected
(the chrome was being refused by every arm, so it never entered a numerator);
recall figures were understated by roughly a fifth.
