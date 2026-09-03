# The ends-only proposer: refuted, and the refutation names the real gap

`node native/eval/the-fold/ends-only-proposer.mjs` — zero model calls, two
materials, ~26 seconds and ~4 seconds respectively.

**Generality: universal** (P71). The finding is about what a referent-grain
key can and cannot say about propositional identity, measured on two genres
with a control built to fail. The morphology gap it uncovers is
language-specific and named as such.

## What was asked, and why it was not a re-run

P74 measured the same-proposition conjunction — ends correspond AND labels
denote the same act — and got **zero joins** on real pages. Its own diagnosis
blamed the label half: `sameLemma("withdraws","retreated")` is false. Which
means the **ends half has never been measured alone**.

This driver drops the label conjunct deliberately and asks the remaining
question: does ends-only correspondence propose any same-as candidates at
all? The answer decides whether the synonymy question — and the named giver
that would settle it — is worth taking at all.

Two strata, kept apart because they are different findings:

- **pure-label** — the ends are already identical raw strings, so only
  synonymy stands between the two notes and a fold. This is the
  withdraw/retreat shape exactly.
- **resolution-earned** — the ends differ as strings and only correspond
  once each is resolved in its own source's universe of referents.

## Results

| | Wikipedia (3 related pages) | Dracula (6 chapter-sized parts) |
|---|---|---|
| notes | 934 | 470 |
| candidates | 19 | 1 |
| — pure-label | **0** | **1** |
| — resolution-earned | 19 | 0 |
| control (deranged resolution) | **25** | 0 |
| already folded (2+ sources) | 22 | 1 |
| at least one end resolving to nothing | 497 (53%) | 463 (99%) |

**The resolution-earned stratum is refuted by its own control.** Nineteen
real against twenty-five when each source's notes are resolved against the
*wrong* source's universe. Resolution contributes nothing a wrong universe
would not.

And reading the landings rather than counting them says exactly why.

## Referent identity is the wrong grain for propositional identity

All nineteen candidates come from six keys, which absorbed 6, 5, 2, 2, 2 and
2 distinct raw end-pairs. The largest:

```
Kutuzov —arrived→ at the battlefield                    (austerlitz)
Kutuzov —retreated→ from the battlefield on 8 September (borodino)
                                     keyed as: kutuzov / the battle
```

```
General Kutuzov —remained→ in control of the battle throughout  (borodino)
Mikhail Kutuzov —commanded→ the battle at this column           (austerlitz)
                                     keyed as: kutuzov / the battle
```

These are not restatements. They are different propositions about the same
two referents — and between any two entities there are many.

**The general statement, and it corrects this project's own framing.** An
arrangement's ends are not referents. "the battlefield", "the battle", "the
general development of the battle" and "control of the battle" are four
different ends that resolve to one referent. Collapsing ends to referents
answers *are these about the same two things*, which is not the question.
Referent identity is necessary for propositional identity and nowhere near
sufficient, and using it alone over-generates by a factor this control
measures directly.

`WHERE-WE-ARE.md` said two of the three conjuncts were solved. The ends
conjunct is solved **as referent identity**, and that is a weaker fact than
it read as. Corrected there.

## The zero, with a denominator

A zero means nothing without one. Decomposing every cross-source pair whose
**raw** ends collide:

| | Wikipedia | Dracula |
|---|---|---|
| ends AND label collided — already folded by `hear()` | 22 | 1 |
| raw ends collide, same label, unfolded | 0 | 0 |
| raw ends collide, **different label** | **0** | **1** |

So raw end-pairs *do* collide across sources — twenty-two times on the
Wikipedia set. And on that material, **a raw end-pair never collides across
sources without the label colliding too.**

Across 1,404 notes on two genres, exactly **one** pair anywhere is blocked by
the label alone. The synonymy program has essentially nothing to work on: a
paraphrase does not get as far as having matching ends, so the label never
becomes the thing standing in the way.

This is a stronger and more useful result than a small positive would have
been. A Wiktionary synonymy prior, licensed on its marginal admits per LP11,
would have had one candidate to act on. Buying it would have bought nothing.

## The one candidate, and what it actually is

```
dracula-part-1.txt:  The door —is→  shut
dracula-part-5.txt:  The door —was→ shut
```

That is **tense, not synonymy**. And `sameAct` — the UniMorph-backed organ
already built, already tested, already opt-in, whose entire purpose is
folding a verb with its own inflections — does not fold it:

```
sameAct("is","was")   false      sameAct("is","are")  false
sameAct("was","were") false      sameAct("is","be")   false
sameAct("withdraws","withdrew")  true
```

The prior carries **zero of the eight** English copula forms. Its own
provenance explains why by design: 224,550 pairs read, 216,011 dropped as
rule-recoverable, **5,531 kept — the irregular tail only**, with regular
inflections recovered by a suffix rule at read time. A suffix rule cannot get
from *was* to *be*, so the copula should have been kept as irregular. It was
not, and the `irregular` field of the shipped artifact is empty.

## The reach of that gap, measured over this material's own labels

| | Wikipedia | Dracula |
|---|---|---|
| label heads the prior carries at all | 199 (21%) | 130 (28%) |
| label heads that are the English copula | **268 (29%)** | **237 (50%)** |
| copula forms present in the prior | 0 of 8 | 0 of 8 |

**Half of a novel's assertions are copular**, and the organ that decides
whether two labels denote the same act is blind to every one of them. Every
consumer of `sameAct` — verb equality in the relation reader, `formIdOf`'s
object identity, the decider-company wall — silently reads every copular
restatement as a different act.

This is a coverage gap in a **received prior with a named giver**, and its fix
is a better prior. Not a model, and not a statistic. Which is the same
conclusion the synonymy argument reached, arriving at a different prior than
the one that was expected.

**Disclosed, and it blocks the fix from being taken here:** the provenance
names `scripts/build-morphology-prior.mjs` and that script is **not in the
repository** — its `input` path points at a scratchpad directory from a
previous session. The prior cannot be rebuilt from this checkout. Committing
the builder is a prerequisite for closing the gap, and is itself the finding:
a received prior whose builder is not committed cannot be corrected, only
replaced.

## What this changes

1. **The synonymy program is not the next lever.** It has one candidate
   across two materials, and that candidate is morphology.
2. **Referent-grain end identity is refuted** as a proposer of propositional
   sameness, by its own control. What a finer key would need — referent
   identity for the head, something that preserves the distinction between
   "the battle" and "the battlefield" for the modifier — is the modifier-scope
   question the Link terrain's lens is for. Named, not built.
3. **The upstream bound is confirmed and quantified.** 53% of Wikipedia notes
   and 99% of Dracula notes have at least one end resolving to no referent in
   their own universe. An end that names nothing can never correspond to
   anything, so lever 3 — feeding the earned referent index into extraction —
   caps everything above it, exactly as `WHAT-IS-BEING-BORN.md` already said.
4. **A new, cheap, concrete lever appeared:** restore the copula (and the rest
   of the irregular tail) to the morphology prior, and commit its builder. Its
   reach is 29% to 50% of all labels, and nothing about it needs a model.

## Disclosed

- Two materials, both English, one reader configuration. The zero pure-label
  finding is measured, not proven general; a third genre would strengthen it.
- The control tests whether *resolution* contributes, not whether the
  candidates are true. No candidate here was adjudicated against an oracle,
  and none needed to be — the count settles the question that was asked.
- The copula reach numbers count label **heads** (the first token of a
  label), which undercounts multi-word labels whose head is not first.
