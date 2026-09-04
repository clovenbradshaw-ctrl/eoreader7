# Typing contradictions in prose: refuted by its own null — and the falsifiable version has no corpus yet (2026-09-04)

`contradiction-kinds-prose.mjs`, `quantity-overlap.mjs`. **Zero model calls.
Both results are negative and both are kept so they are not retried.**

## 1. The prose typer defaults to `contest`, which is the failure it existed to prevent

34 apparent contradictions in the 674-note cited-source corpus (same subject
features, same act head, disjoint objects). Typed:

| kind | count |
|---|---|
| **contest** | **22** |
| non-functional | 6 |
| individuation | 4 |
| polarity | 2 |

The top `contest` specimen gives it away:

```
Aldrin —was→ afraid it might topple in front of TV viewers
Aldrin —was→ an elder at the Webster Presbyterian Church
```

Both are true. The copula was never functional. Typing that as a contest
routes it to the third-source seeker, which is exactly the waste the kinds
were meant to prevent.

## 2. Why: the arity null is mis-specified

Functionality was measured per act as the share of subjects whose objects
diverge, with the floor read off a null that reassigns acts among notes.
Measured:

| act | subjects | split | real rate | null median (max) | fires? |
|---|---|---|---|---|---|
| **was** | 51 | 5 | **0.098** | 0.113 (**0.171**) | no |
| were | 18 | 2 | 0.111 | 0.053 (0.133) | no |
| landed | 4 | 1 | 0.250 | 0.000 (0.250) | no |
| told | 3 | 1 | 0.333 | 0.000 (0.250) | yes (n=3, meaningless) |

**The copula's real split-rate is BELOW its own null.** The shuffle destroys
which act a note carries, but the quantity being measured — do one subject's
objects diverge — depends on the subject and the objects, which the shuffle
keeps. So the null reproduces the real rate and the test can never fire on the
one act where it matters most.

Arity is a property of the act that a within-corpus label shuffle cannot
isolate. **The verdict is unearned and the driver says so.** A working test
needs either a received giver for relation arity (Wikidata's own
single-value constraint is one, with a name) or a null that perturbs the
subject–object pairing rather than the label.

## 3. The falsifiable frame is right, and this corpus cannot carry it

Direction taken (user): *this needs to not be about good journalism ethics but
needs to be falsifiable against things that can be objectively measured (but
are subjectively reported).*

That is the correct constraint, and it dissolves the taxonomy problem: a
quantity with one true value, reported variously, needs no discourse theory to
adjudicate. Probed:

| | |
|---|---|
| notes carrying a measured quantity | 17 |
| notes carrying a clock time | 10 |
| quantity mentions | 35 |
| distinct hosts carrying one | 10 |
| **distinct values reported by 2+ distinct sources** | **0** |

The corpus has the right **shape** — objectively measured quantities (sample
mass, EVA times, altitudes, UTC clock times), subjectively reported, across
real publishers — and none of the **density**. It is the citation list of ONE
article, so each quantity is cited once and no two sources ever report the
same one.

**0 of 35 is the number that decides the next corpus**: the falsifiable
programme needs many independent reports OF THE SAME EVENT, not one article's
citations. Same event, many publishers, with an authoritative measured record
as the oracle.

## What is not refuted

`contradiction-kinds-RESULTS.md`'s finding stands: on the succession fixtures,
2 of 2 apparent contradictions are individuation, decidable at n=1, needing no
third source. That used the material's own tenure dates rather than a
distributional measure, which is why it did not hit this wall.

## Files
`contradiction-kinds-prose.mjs` (refuted — kept, with the failure in its own
output), `quantity-overlap.mjs`.
