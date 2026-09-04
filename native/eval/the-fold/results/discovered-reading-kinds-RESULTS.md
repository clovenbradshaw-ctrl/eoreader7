# The reading rule, discovered rather than developed

`node native/eval/the-fold/discovered-reading-kinds.mjs` — three real
Wikipedia pages, **zero model calls**.

**Generality: universal.** The organ is unmodified; only the stream changed.
Replayed on three pages, with a null at discovery and a second at scoring.

## The correction this is built on

The design before this had a model propose a reading rule and a gate verify
it. User direction: *"the system isn't developing a rule. it's discovering
it."* That is a different act. Proposing makes the model the author and the
material only the judge. Discovery is the other way round — the regularity is
already **in** the material, and the organ's job is to find which regularities
are real.

## And the organ already existed

`kind-standing.js::discoverCompanyKinds` groups words by the dominant
`before=` feature of their own company, names each kind **by its own
signature** (`kind:before=the`), and carries an II.23 null arm that dissolves
any kind whose share is reachable when company is destroyed. Nothing is taught
to it and nothing is proposed to it.

Its own header names the seam that lets a different stream through: *"a
non-text caller declares its own cleaner"* — the default strips non-letter
edges, which is a text prior found live when a music stream's `d5` cleaned to
`d`.

**So the stream changed and the organ did not.** A document becomes one
sequence whose tokens are its **lines**, each written as its own shape
(characters collapsed to classes — no letter, digit or mark keeps its
identity, so the stream is blind to language and format alike). "Company" is
then what kind of line precedes this kind of line, and a discovered kind is a
**regularity of arrangement the document has**.

## The cap, chosen on the organ's own stated failure condition

`discoverCompanyKinds`' header records the turbulence run that refuted the
bare share floor: *"a share floor is trivially cleared when one symbol is
already half of all tokens."* So the criterion, declared before any score was
seen: the smallest shape cap whose **maximum marginal share falls below 0.5 on
every page**.

| cap | Borodino | Austerlitz | Third Coalition |
|---|---|---|---|
| 1 | 0.49 | 0.51 | 0.56 |
| 2 | 0.48 | 0.51 | 0.56 |
| 3 | 0.46 | 0.48 | 0.54 |
| **4** | **0.28** | **0.28** | **0.28** |

Cap 4 is the smallest that clears on all three. Caps 1–3 leave at least one
page in exactly the degenerate regime the organ warns about.

## What was discovered

| kind | Borodino | Austerlitz | Third Coalition |
|---|---|---|---|
| `kind:before=s._a` | 315 lines, **0%** prose | 288 lines, **6%** | 290 lines, **0%** |
| `kind:before=m._._` | 70 lines, **0%** | 109 lines, **0%** | — |
| `kind:before=la_a_` | 71 lines, **99%** | — | — |

Base rates: 26.9% / 24.5% / 23.1%. **6 of 6 kinds cleared both nulls.**

And the signatures are legible without being named by anyone:

- `kind:before=s._a` — lines whose dominant predecessor is a short
  bullet-then-letters line. Members `S._a`, `S._0a`, `S._a.`; samples
  `- France`, `- Italy`, `- v`, `- t`, `- e`. **The navbox and list
  regularity, found independently on all three pages.**
- `kind:before=m._._` — samples `- ↑ Chief of staff…`,
  `- • approx. 109,500 engaged [ 2 ] [ 3 ]`. **The citation list.**
- `kind:before=la_a_` — a line whose dominant predecessor is a long
  letters-first line, 99% prose. **The prose run** — the same regularity that
  was hand-designed as "fills the measure in a run" earlier the same day, here
  found by the material rather than by a designer.

## The two nulls, and why one is not enough

A kind clears **only** if both hold:

1. Its own discovery null arm admitted it — members' company shares beat the
   (1−α) quantile of what shuffling the document's line order produces.
2. Its prose share differs from the base rate by more than the same shuffle
   produces against a **shuffled labelling** (7.1 / 7.7 / 3.8 points on the
   three pages).

Clearing the first says the kind is **real**. It says nothing about whether it
is **useful**, which is what the second asks. Separations measured: 71.7,
26.9, 24.5, 23.1, 18.5 points — all far outside their ceilings.

## Born standing, and REC

Discovered kinds land as ordinary addressed notes through `kindNotes` and the
same door every fact goes through, so a kind is **addressable** and a future
organ consults the note rather than re-deriving the measurement. Witnesses
carry the recipe (P68), so two pages read by one instrument corroborate as two
sources and not as two instruments.

```
STANDING  kind:before=s._a     3 sources   members S._0a S._a S._a.
STANDING  kind:before=m._._    2 sources   members M._._ S._._ M._0_
single    kind:before=la_a_    1 source    members La_a_ La._a
```

**Review** re-runs the same gate against the grown reading — `reviewEntities`'
own discipline, one register over. At the discovery standard all three hold
and nothing is conceded. Under a **declared tightening** (`minShare` 0.4 →
0.75) all three lapse and 8 membership notes are conceded by REC, past kept,
each trigger saying in words that *the standard changed and the material did
not refute it* — because those are different acts and a record must not
conflate them.

**Absence is never refutation.** A kind whose shapes simply do not occur in a
new source is untouched: failing to appear is a fact about that source.

## Three walls that refused this driver, all correctly

Landing the notes took three wrong guesses at a shape, each caught by a gate
doing its job rather than by a test:

1. `admit` refused every note as **`unaddressed` — "no addressed span backs
   it"**. P5.2 at the door. `kindNotes` attaches no spans because a kind is a
   measurement over many lines; a **membership**, though, is witnessed where
   that shape occurs, and those are addresses. The caller supplies them.
2. A span needs `at`, or `{ref, start, end}`. The first cut invented
   `{b0, b1, source}` and was refused again.
3. The text face additionally drops any span carrying no `text` — a span that
   cannot show its bytes cannot be self-verified. Refused a third time.

Each was read out of the code rather than guessed at on the next try, and the
walls are recorded here because a gate that refuses three malformed attempts
in a row is the reason the ledger's addresses can be trusted.

## Disclosed

- Three pages, one site, one language. The prose kind appears on **one** page;
  the furniture kinds replay on two and three. So discovery finds furniture
  reliably and prose only sometimes — an asymmetry, though a negative rule
  ("these are not prose") is what an admission door actually needs.
- `minMentions` 4, `minShare` 0.4, `minMembers` 2, `draws` 40, `alpha` 0.05,
  `SPANS_PER_NOTE` 3 are all declared and none is derived. The **cap** is the
  one parameter chosen by a stated criterion rather than by hand.
- The oracle appears only in scoring, never in discovery. It cannot have
  helped find a kind, and it did not choose among them.
- No claim is made that any admitted line is TRUE, or that these kinds
  generalise past pages built by this one publishing system.

---

## Amendment, same day: the oracle changed underneath this, and nothing here moved

`region-oracle.mjs` was corrected (see `door-by-kind-RESULTS.md`'s amendment):
prose was its **residual** class, so 43% of what it called prose on Borodino
was the site's chrome and the campaign map's pin labels. Three strips were
added, declared by container, costing zero lines of 60 characters or more.

This driver reads the oracle for `truth` when it scores a discovered kind's
prose share, so every number below the discovery step is affected. **Not one
conclusion is.**

| | before | after |
|---|---|---|
| Borodino base rate | 26.9% | 22.3% |
| `kind:before=la_a_` | 71 lines, 99% prose | **71 lines, 99% prose** |
| `kind:before=s._a` | 315 lines, 0% | **315 lines, 0%** |
| `kind:before=m._._` | 70 lines, 0% | **70 lines, 0%** |
| standings | s._a 3 sources, m._._ 2, la_a_ 1 | **identical** |
| conceded by REC | 0 | **0** |

Every kind still clears its own null arm, the separations move only because
the base rate moved, and the three standings are unchanged. That is what
should happen: **the oracle appears only in scoring and never in discovery**,
so a correction to it can move a kind's reported prose share and cannot move
which kinds a document has.

## A second finding, from re-running: the driver's cap default had drifted

This document derives cap **4** by a stated criterion — the smallest shape cap
whose maximum marginal share falls below 0.5 on every page — and reports
cap-4 kinds throughout. The driver's own default was **2**, so a plain
`node discovered-reading-kinds.mjs` produced kinds this document does not
describe (`kind:before=la_` with members `La_ La.`, and only one kind clearing
on one page instead of three across three).

Nothing about the numbers here was wrong; the driver had simply stopped
reproducing them. The default is now 4, matching the criterion. The marginal
table that chooses the cap is a fact about shapes and is untouched by the
oracle correction.

**A driver whose defaults do not reproduce its own results document is a
result nobody can check** — which is the same standing this project already
gives an unwritten arm and an unread gap.
