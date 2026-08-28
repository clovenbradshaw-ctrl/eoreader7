# Step 0 — the falsification probe, run before the build (2026-08-28)

Driver: `eval/falsification-probe.mjs` (re-runnable; writes
`eval/results/falsification-probe.json`). Fixtures:
`eval/fixtures/falsification/*.tsv` — six corpora, ground truth **declared
before the run** and never adjusted by it.

**The question.** The proposed self-individuation change rests on one
assumption: that a refutation search over the material can actually REFUSE a
composition that should not happen. If it can, "a real regularity exists
here" is earnable from evidence and a refutation-cleared candidate could
license bounded derivation without a named giver. This probe tests that
assumption directly, on real organs (the-fold's admission door, the real
kernel `acquireCompositionCandidates`), before the mechanism was written.

**Result: the assumption is false. 5/6 correct, and the one failure is the
whole point.**

| corpus | composes soundly? | nominated | scan refuses | outcome |
|---|---|---|---|---|
| `succession-clean` | yes | ✓ support 4 | no | correctly cleared |
| `defeated-acyclic` | **no** | ✓ support 4 | **no** | **WRONGLY CLEARED** |
| `defeated-cyclic` | no | ✓ support 3 | yes (cycle) | correctly refused |
| `tenure-violation` | no | ✓ support 2 | yes (uniqueness) | correctly refused |
| `parent-nontransitive` | no | ✓ support 3 | yes (uniqueness) | correctly refused |
| `lineage-chain` | yes | ✓ support 3 | no | correctly cleared |

## The twin test — the decisive result

`succession-clean` and `defeated-acyclic` are **structurally identical by
construction**: five adjacency facts, a 1:1 chain, all referents distinct,
no cycle, both nominated by the real kernel at identical support (4), both
clearing uniqueness. The probe confirms the identity mechanically
(`structurallyIdentical: true`).

Their ground truth is opposite. If C replaced B and B replaced A, C
genuinely holds the office after A. If Alvarez beat Brennan and Brennan beat
Castellan, **nothing whatever follows** about Alvarez against Castellan —
non-transitivity of dominance is the textbook case.

**The scan cannot tell them apart.** Structure alone does not license
composition.

## Why — and the boundary of the finding

Refutation of a transitivity claim requires a POSITIVE counterexample.
Positive-only material supplies one in exactly two shapes, and the probe
confirms the scan catches both:

- a **cycle** (a beat b, b beat c, c beat a) — directly contradicts a
  transitive ordering. Caught: `defeated-cyclic` correctly refused.
- a **uniqueness violation** — a bridge referent conflating two distinct
  things. Caught: `tenure-violation` correctly refused (the real bug the
  live succession run surfaced).

Where neither is present, **absence is not refutation**: nothing in
positive-only material states "Alvarez did not beat Castellan," and under
open-world semantics that silence refutes nothing. The scan is not broken —
it refused 3 of 6, every refusal for a real, positively-observable reason.
Its competence is precisely bounded, and the bound is where licensing would
have to live.

**Honest limit of this finding.** It refutes these two specific checks, and
gives a principled argument (open-world absence) for why any positive-only
scan faces the same wall. A scan with access to STATED negatives, or to a
closed-world declaration over a bounded domain, is a different case and is
not tested here. The twin test is an existence proof, not a rate — no claim
is made about how often this happens in real material.

## The right-answer-wrong-reason trap, demonstrated

`parent-nontransitive` was refused — correctly, by outcome. But it was
refused on **uniqueness** (a child has two parents; a parent has several
children), never on transitivity. The real reason parent-of must not compose
to parent-of is that its composition is *grandparent*-of; the scan never
tested that and cannot.

This is A10's trap exactly ("a statistic insensitive to its perturbation
fails invisibly and globally"), and it is recorded here so a future pass
does not read that refusal as evidence the scan understands composition. It
does not.

## The second, separate question `lineage-chain` isolates

`son_of` is a 1:1 chain that composes **soundly** — but to *descendant of*,
never to *son of*. Structure said "compose"; it cannot say what is yielded.
Naming the product is a DEF act, and no amount of structural evidence
performs it.

Combined with the twin test, this closes the middle ground the plan
proposed. "An anonymous composition exists here" is not a safe weaker claim,
because a composition site is *always* structurally present — two edges
sharing a bridge is a fact about the graph, not about the world. What varies
is whether the composed relation is a meaningful new fact or vacuous, and
that is exactly the semantic judgment structure cannot make.

## What this changes in the plan

- **Steps 3–5 as designed (speculative derivation from refutation-cleared
  candidates) are refuted before being built.** The probe cost one driver and
  six small fixtures; the mechanism would have cost five modules and shipped
  plausible falsehoods with impeccable provenance.
- **Steps 1–2 survive, reframed.** The refutation scan is real and valuable —
  but as a **veto organ, not a licensing organ**. It caught 3/3 of the
  genuinely unsound corpora that carried positive counterexamples, including
  the real tenure bug. It should be generalized out of the hand-written
  driver check and automated.
- **A path neither the plan nor the original ask proposed, which the probe
  suggests:** run the veto CONTINUOUSLY against already-given chemistry. A
  giver licenses a closure; as the corpus grows, the scan keeps hunting for
  cycles and uniqueness violations and CONCEDES the declaration when one
  appears (`declarations.js::concede` already exists for exactly this). That
  is self-correction without self-licensing — and against the neuron
  analogy, it is closer to synaptic *pruning* than to Hebbian strengthening.

The grain theorem the codebase already held — a corpus can refute a
Pattern-grain claim but never earn one — is here **demonstrated empirically
on real organs**, rather than argued. That is the finding.
