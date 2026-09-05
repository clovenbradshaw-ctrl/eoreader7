# Contrasting three accounts of one battle: what actually stops it

**Audit 2026-09-05 (the-fold P95 / S65): drifted.** A/B now read 1,445 / 1,441 / **0** and 1,619 / 1,614 / **0** (was 1,471 / 1,466 / 1 and 1,669 / 1,663 / 1): the referent pool moved and the single shared claim is gone — the cast's furniture wall (P93 / S63, this doc's own "next 1") and S64's surface rules are the candidates, not isolated here; the driver falls back to the full list and both arms still read 0.0%, so the negative result stands and nothing about Borodino follows. `results/rashomon-contrast.json` is gitignored, so `git diff` measures nothing here, and the slot-level table below is not computed by the driver at all — a report by construction, enforced by nothing. Named as such in `audit-results.sh`.

Ran 2026-09-04. **0 model calls, fully offline.** Supersedes the retracted
`rashomon-probe-RESULTS.md`.

Driver: `rashomon-contrast.mjs`. Material: three English accounts of Borodino
— English Wikipedia (encyclopedic), Tolstoy's own narrative (Project
Gutenberg, public domain), the *War and Peace* article (literary-critical) —
plus **Austerlitz, a different battle, as a material-shaped control**.

## The reader's configuration, first, because nothing below is readable without it

```
posPrior            POSPrior@1, Universal Dependencies UD_English-EWT
determiners         priors.js DEFINITE + INDEFINITE (received, giver lang/en)
negationWords       priors.js NEGATION_WORDS (received)
blankFurniture      blankLabelRows minRun 4 maxCell 60
resolvePronouns     on
nounPhraseSubjects  on
```

Lifted unchanged from `bridge-object-measurement.mjs`. The retracted run had
an **ungated door and these levers off**, which is why it measured its own
harness (P90).

## The cell, which is the whole reason this run exists

```
the question asked   EVA/Pattern  ->  Paradigm  Tracing   Relate/Interpretation
the retracted run    CON/Figure   ->  Link      Binding   Relate/Structure
```

Different domain **and** different grain. "Do these accounts disagree" is a
Paradigm-grain tracing move over whole readings; "are these two edges the
same edge" is a Link-grain binding move over two strings. At Figure grain the
object of comparison IS a string — which is exactly why `end.toLowerCase()`
felt available in the retracted run, and why P11 forbids it. The organ for
the Paradigm cell is registered: `standing`,
`capacity-runner.js::mergeTestimony`. See P92.

## A/B: does pooling the accounts into one document help?

The user's instruction, taken literally: *treat it as the same document, but
retain the provenance*. Arm A gives each account its own reader and its own
referent pool. Arm B pools every passage into ONE document and runs ONE
reader, with `chunkSource(a.id, ...)` keeping the account stamped into every
passage ref.

| arm | bound edges | distinct claims | asserted by >1 account |
|---|---|---|---|
| A siloed — one reader per account | 1471 | 1466 | **1** (0.07%) |
| B one document, pooled, provenance kept | 1669 | 1663 | **1** (0.06%) |

Pooling adds 198 edges — 13% more material read — and the shared count does
not move. **Identity at read time was not the wall.** That is a real negative
result, and it is worth as much as a positive one: it removes the obvious
explanation before anything is built on top of it.

## What the wall actually is: the object slot holds the whole predicate tail

1669 edges collapse to 1663 distinct claims. Even *within one account* a
claim essentially never repeats. Reading the edges says why:

```
[the Battle of Moscow] --took--> [place on the outskirts of Moscow near the village of Borodino on 7 September 1812]
[Alexander I]          --had-->  [appointed to replace Barclay de Tolly on 29 August after Smolensk was razed and captured...]
[The Grande Armée]     --fought--> [against the Imperial Russian Army]
```

Subjects are fine and recurring — Kutuzov 14, Napoleon 8, the Russians 6, the
French 6. The **object** is a unique clause remainder, so a claim keyed on the
full triple can never match another. Keying on the triple also destroys the
thing the object carries: the author's own ordering, which is where the
meaning is.

**So the comparison belongs at the SLOT** — same subject, same verb, object
open — which is `hypergraph.js`'s own `cardinality: {fillers}` and its
`unbound` verdict's `competing`. P90 already recorded this organ being
hand-rolled badly once.

| keying | slots | filled by >1 account | with competing fillers |
|---|---|---|---|
| (subject, verb) raw surface | 1537 | 15 | **14** |
| (subject, verb) cast-resolved | 251 | 7 | **7** |
| subject only, cast-resolved | 117 | 15 | **15** |

Slot-level keying moves the docket from **1** to **14–15**. That is the right
grain. It is still a small docket, and no claim about Borodino is made here.

## The defect this found, verified in the bytes

The cast-resolved arm is WORSE than the raw surface, and reading its output
says why. `cast.represent(id)` returned these as referents:

```
August Prince Andrew          Mesoten Napoleonic Wars Battle
Tolly Pyotr Bagration DOW     Light While There
One Appointment               Dialogue Among Clever People
```

These are not people. Grepped in the raw fixture bytes:

* `Light While There` ← *Walk in the Light While There is Light* (1888)
* `Dialogue Among Clever People` ← *A Dialogue Among Clever People* (1892)
* `One Appointment` ← *Story of One Appointment* (2018 film)

All three are link titles inside the **Works by Leo Tolstoy navbox** at the
foot of the article. `Mesoten` is a battle in the Napoleonic Wars navbox on
the Borodino page.

**`extractReadable` passes Wikipedia navboxes through; the cast admits their
link text as referents; and the "longest established surface" rule then MERGES
them with real people.** That is how `Prince Andrew` became
`August Prince Andrew` and how Barclay de Tolly and Pyotr Bagration ended up
in one referent with the abbreviation `DOW`.

P82 put received walls on the ADMISSION door. The cast's own universe has no
such wall, and a corrupted cast corrupts identity for everything downstream
of it — which is every claim in this repo, since P11 routes all identity
through exactly this organ.

## Status of every number here

| claim | status |
|---|---|
| the A/B counts (1471/1466/1, 1669/1663/1) | **stands** — arithmetic on a run with the production configuration disclosed |
| "pooling does not increase shared claims" | **stands** — the measured negative result |
| "the object slot holds the predicate tail" | **stands** — read off the edges, quoted above |
| the slot-level counts (1537/15/14, 251/7/7, 117/15/15) | **stands** as a measurement of the docket's SIZE at each grain. No null has been run on them, so nothing about disagreement RATE follows |
| navbox link text enters the cast and merges with people | **stands** — verified in the raw fixture bytes, quoted above |
| anything at all about Borodino, Tolstoy, or whether the accounts disagree | **NOT CLAIMED.** Both arms read 0.0% and the driver says so in its own output |

## What is next, in order

1. **A furniture wall on the cast**, not only on admission. The navbox defect
   is upstream of every identity claim this repo makes.
2. **The contrast at slot grain**, through `cardinality.fillers` /
   `unbound.competing` and `contest.js::adjudicate` — whose co-presence rule
   (a frame carrying rivals must clear a STRICTER bar) is exactly the shape of
   "two accounts fill one slot differently", and whose `nullAdjudicate`
   carries its own declared draws, seed and alpha.
3. **A null for the slot docket.** The 14 competing slots are a count, not a
   rate, until the wrong battle is measured at the same grain.

The question — whether Rashomon-shaped material hosts real contests — is
still open. This run removed two wrong explanations and found one real
defect; it did not answer it.
