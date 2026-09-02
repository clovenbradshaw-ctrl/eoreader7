# The core mechanism — what all the structure-finders are instances of

*Written 2026-09-01, answering a direct question asked while `signal.js`
was being built: "what is our CORE mechanism if these are our different
fundamental ways of discovering structure? what are they emergent from?"
Standing: **nomination** — checkable against the code, which wins any
disagreement. Where a claim here is measured, it says so; where it is a
reading, it says that too.*

## The one-sentence answer

**Every structure-finder in this project is the same act: rebuild the
ground with exactly one relation destroyed, and read the difference.**
What varies between them is only *which relation* gets destroyed, and
*what an event is* — and the second of those is the instrument's job, not
the mechanism's.

`SEED.md` states it as law before any of this was built ("perceive only
by difference from a ground you rebuild"), and `nul/index.js` implements
it as `PERTURBATIONS × STATISTICS` with a `LICENSED` table. Everything
below is that, wearing different clothes.

## The census — what each finder destroys

| finder | the relation it destroys | what survives |
|---|---|---|
| `discoverCompanyKinds` | ADJACENCY (shuffle within phrase) | marginals |
| `binding.js` co-arrival | POSITION (displacement) | which things exist |
| `emergence` reseed null | PHASE (reseed) | spectrum |
| `kind-standing` membership | nothing — the null IS the population | (no simulation) |
| `testimony`'s sibling swap | the FILLER's identity | the sentence, the source |
| `corroboration` independence | shared SOURCE / shared INSTRUMENT | the claim |
| `ground-ledger` prequential | the FUTURE (predict before seeing) | order |
| `metacognition` S1/S2 | the checking APPARATUS | the question |

Read down the middle column and the mechanism is visible: each row names
one relation whose reality is in question, and each null is a world
identical to ours except that relation is gone. **A finding is what
cannot survive that deletion.**

The fourth row is the important exception and it is not a violation: when
the material itself supplies a comparison set (every other referent), you
do not simulate a ground — you *measure* one. P79 records that this is
stronger, not weaker, and why two simulated nulls were refuted before it.

## What they are emergent from — three families, not one

Honest correction to the one-sentence answer above: perturbation is the
dominant family but not the only one. Reading the code rather than the
slogan, there are **three**, and they are distinguished by *what the
observed is compared against*:

1. **PERTURBATION — compare to a rebuilt ground.** The census above.
   Answers *is this relation real?* This is EVA at **Figure** grain: a
   difference from a ground.

2. **PREDICTION — compare to what actually came next.** ACT-R
   base-level decay, need-odds, the surprise meters (`aperture.js`,
   `reflex.js`), `ground-ledger`'s prequential firewall. Answers *does
   holding this belief change what happens?* No perturbation is spent;
   the future is the null, and it arrives on its own. This is EVA at
   **Pattern** grain — Bateson's difference that makes a difference.

3. **DEDUCTION — compare to a declared license.** `hl.js`'s R1–R6, the
   grid algebra, `reaction.js`'s chemistry. Answers *what follows,
   given?* Nothing is measured at all; a giver's declaration does the
   work, and the honesty lives entirely in refusing to compose without
   one. This is CON/SYN, not EVA.

The three are not interchangeable and the project's worst errors came
from using one where another was needed:

- The **falsification probe** tried to make a corpus *license* a
  composition — deduction's question asked of perturbation's machinery.
  Six corpora, and the scan could not separate the twins. The correct
  conclusion was structural: licensing was never a world-question.
- The **kinds basin null** tried to answer membership (a measured
  question) by simulation, and the simulation was degenerate.
- **`bound`'s plateau** in MINE-1 was read for a long time as a
  perturbation problem (widen the vocabulary) when it was a *criterion*
  problem — the verdict wanted entailment, which is family 3.

## Why it transfers across media at all

Nothing above mentions words, notes, shots or velocity fluctuations. The
mechanism operates on **individuated events in an order**. The medium's
only job is to supply an instrument that constitutes those events — and
the four media runs measured exactly that boundary:

- **music** found the one text prior that had leaked into the mechanism
  (a token cleaner that ate `d5`), and the shared-instrument limit;
- **video** found nothing new, which is the first weak evidence of
  generality;
- **turbulence** found that the mechanism's *floor* was unlicensed on a
  small alphabet, because the medium has no pre-existing events at all —
  the discretizer constitutes them, so the alphabet is the instrument's
  choice and can be tiny.

**A medium that finds nothing new is the evidence; four media in, we have
one such medium.**

## The emergence, stated as a ladder

Each floor is the same three families applied to the products of the
floor below. That is the whole of what "emergent" means here — no new
mechanism appears at any floor, only new operands:

| floor | operands | perturbation asks |
|---|---|---|
| F0 | units | is this token's company real? |
| F1 | referents | is this the same being? |
| F2 | arrangements | is this edge real? |
| F3 | claims | does the material state this? |
| F5 | notes | do independent readings agree? |

The reason a floor can starve (P58's grain gap) is that the floor below
did not individuate enough events for the same mechanism to bite. The
reason a fix at one floor often does nothing at another is that each
floor spends its own null.

## The one wall none of the three families crosses

All three establish **coherence**: internal consistency, productivity
under a declared license, survival against a constructed nothing. None
of them establishes **correspondence**. A reader can be coherent,
productive, and systematically misreading, and this apparatus cannot
detect it — only an oracle can, and only on facts. `signal.js` is the
mechanism made general, which makes this wall more load-bearing, not
less: a general finder is also a general *finder of coincidences*, which
is why its null is search-aware by construction and why nothing in it
phrases a verdict.

## Where the mechanism lives, as code

- `nul/index.js` — perturbations, statistics, the `LICENSED` pairing table
- `measure.js` — the fold's gate onto them (`admit`, declarations)
- `kind-standing.js` — company kinds, population null, the declared
  `nullArm`
- `signal.js` — **the mechanism itself, medium-blind and reusable**:
  instruments in, findings out, search-aware null, control built to fail,
  sources and instruments counted apart
- `corroboration.js` — the F5 family (independence, witness, settling)
- `hl.js` / `grid.js` / `reaction.js` — family 3
- `aperture.js` / `reflex.js` / `ground-ledger.js` — family 2
