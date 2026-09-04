# Rashomon: the material disagrees, and the engine cannot see it

Ran 2026-09-04. `rashomon-probe.mjs`, **zero model calls**, 200 null draws.
Pair: English Wikipedia's *Battle of Borodino* against Tolstoy's Borodino
chapters, extracted from Project Gutenberg's *War and Peace* (public
domain). Same battle, both English, and the second written expressly
against the first — Tolstoy's argument is that nobody commanded anything
and Napoleon's dispositions were irrelevant.

## Why this pair

`contest-ladder.mjs` found the ledger's new contest machinery had **no
cases**: every apparent contradiction in the Wikidata succession corpus was
intra-source, one file recording two disjoint terms of office. One source
agreeing with itself is not two sources disagreeing.

The remedy proposed at the time — go and fetch multi-agency measurements,
seismic bulletins — was **wrong**, and its wrongness was already on this
project's record. An earthquake's 25 km hypocentre, 35 km centroid and
10 km tsunami-working-depth do not disagree; they answer three different
questions, each labelled with the method that produced it. That is
individuation, decidable at n=1, and no quantity of it makes a contest.

Rashomon-shaped material is the opposite: contested by construction, where
no labelling dissolves the conflict.

## What ran

| | |
|---|---|
| hearings into notes | 456 |
| sources | Wikipedia 328 · Tolstoy 128 |
| distinct relations extracted | 111 |
| relations appearing in **both** sources | 14 |

The fourteen shared relations, in full:

> was, were, had, be, left, would, began, sent, could, continued, remained,
> knew, did, arrived

## The finding

**A contradiction requires a functional relation** — one where two
different answers cannot both be true. Wikidata's `replaces` is 1:1 by the
property's own semantics, which is the only reason the succession corpus
could host contests at all. `kernel/refutation.js` is explicit that this
must never be guessed: *"the caller declares the claim … an undeclared
relation gets the cycle check alone."*

Of the fourteen relations shared across both accounts, **five are refuted
as functional by the material itself** — one subject takes several
different objects inside a single source, so that source would be
contradicting itself on every occurrence (`was`, `were`, `had`, `be`,
`left`).

The remaining nine are unrefuted only because they are rare — `arrived`
appears three times. P41 applies exactly here: **the absence of a refusal
is not a check.** And none of the nine is a relation anyone would declare
one-valued. That last sentence is a judgement, not a measurement, and is
marked as such.

So: **there is no relation shared across the two accounts on which two
different answers would contradict.**

## The null, and which direction it points

| | real | null median | null range | verdict |
|---|---|---|---|---|
| cross-source contradiction candidates | **5** | 15 | 6–23 | RETRACTED |

Null: the same notes, the same candidate groups, only the **source labels**
shuffled, each source keeping its exact note count. Size-matched by
construction — which is the property the fragility measurement could not
manage.

All 200 draws match or beat the real number. The real count does not merely
fail to exceed the null; it sits **below the entire range**. The detector's
hits cluster *inside* documents rather than across them, because a document
repeats its own phrasings. They are extraction artifacts.

The five that did cross are visibly not disagreements:

```
the Emperor | had | stated many times   vs   the Emperor | had | left Moscow
the French  | would | outflank his right vs  the French  | would | enter Moscow
```

Two facts sharing an auxiliary verb. Nothing is in dispute.

## What this changes

The wall is **not** a shortage of contested material. Tolstoy and the
historians disagree profoundly, on purpose, in the material that was read.

The wall is that **prose extraction yields only non-functional relations,
and a contradiction is undefined on a non-functional relation.** The
connector slot fills with copulas and auxiliaries — and with outright
non-verbs (`cavalry`, `redoubt`, `von` appear as relations) — which are
precisely the relations on which no two answers can conflict.

**This sits upstream of the witness.** The corroboration witness measured
at a likelihood ratio of 1.0 and cannot separate a true claim from an
invented one. Repairing it would not open this door, because the contest
detector here never asks it: the detector is mechanical, it runs for free,
and it fails before any model is consulted. Two walls that looked like one
are two.

## What would open it

1. **Declared functional relations.** `interpretation/declarations.js`'s
   GIVEN tier already holds licences that carry a giver and can be conceded
   — the same machinery derivation uses for composition. A declaration that
   `killed`, `commanded at`, `won` are one-valued is the same kind of
   object, with someone's name on it. Contests would then be detected only
   on relations somebody vouched for, which is the correct posture.
2. **An extractor that reaches those verbs at all.** None of `killed`,
   `commanded`, `won`, `ordered` survives into the shared vocabulary here.
   Until it does, there is nothing for a declaration to apply to.

Both are named as scoped work, neither attempted in this pass.

## Also produced

`fixtures/tolstoy-borodino.txt` — 233 KB of Tolstoy's Borodino narrative
(Project Gutenberg *War and Peace*, public domain), 65 mentions of the
battle. `lib/borodino-ledger.mjs` gained a `pages` parameter; its default
pair is unchanged and every existing caller reads a byte-identical ledger,
verified by re-running the probe on the old pair (80 hearings, 80 notes,
6 candidates, 0 cross-source — identical before and after).
