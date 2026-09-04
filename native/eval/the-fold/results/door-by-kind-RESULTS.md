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

| page | by line | by kind | lines differing |
|---|---|---|---|
| battle-of-borodino | 0.64059 | 0.65534 | 7 of 990 (kind right 6, line right 1) |
| battle-of-austerlitz | 0.67010 | 0.67013 | 3 of 1,002 (kind right 2, line right 1) |
| war-of-the-third-coalition | 0.64789 | 0.64789 | **0 of 990** |

**10 lines of 2,982 differ — 0.34%.** On one page the two arms are byte-identical.

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

Both arms sit at recall ~0.50 and precision ~0.92. The door is not admitting
junk — it is **refusing half the prose**, on all three pages, in both arms.
Whatever fixes that is not at this grain; changing the unit from line to kind
moves 0.34% of lines. The two furniture kinds discovery found that the hand
rule does not encode are real, and they are also not where the loss is.

**Generality:** universal — the arms replay across three pages never seen
during either rule's construction, and the conclusion (they are one rule) is
what replays.
