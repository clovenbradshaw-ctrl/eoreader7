# Levels — the ladders named, so "level" stops meaning four things

*Written 2026-09-01, at the user's direction: "come up with a language and
some handles to talk more concretely about those levels for future
maintenance. we need a way for a new agent to understand what we're
talking about, and to be pointing at the referent of what it is trying to
become and not what it current is (or what we think it should be)."
Standing document: amendments append. Where this disagrees with the code
and its tests, the code and its tests win.*

The word "level" has been carrying at least two different axes in this
project's conversations, and the conflation is a maintenance hazard: an
instruction like "slide back down the levels" is ambiguous until the axis
is named. This document fixes the vocabulary.

## Ladder 1 — FLOORS: what grade of operand

Which kind of thing a mechanism operates ON. The handle is **floor N**
(F0–F5). This ladder already has its own documents and this one only
points: WHAT-IS-BEING-BORN.md (the anatomy), THE-FIFTH-TURN.md (floor 5
walked through all 27 phaseposts), NEXT-PASSES.md (the plan). Short form:
F0 units → F1 referents → F2 arrangements → F3 claims → F5 corroborated
notes (F4½ nesting is designed and deliberately unopened). A floor is a
promotion of operand grade — floor 5's operands are notes, assertions
that have become variables over their own restatements.

## Ladder 2 — STRATA: what channel of evidence

Which channel of the material a mechanism is licensed to DECIDE from.
The handle is **stratum**, S0–S3. This is the new axis, created by the
heard rule (below), and it is orthogonal to floors: a floor-5 organ can
lean on stratum-1 evidence, and that is exactly the situation the
vocabulary exists to name.

| stratum | handle | what lives there | who has it |
|---|---|---|---|
| S0 | **bytes** | offsets, spans, hashes, addresses | the file |
| S1 | **script** | case, punctuation, layout, spelling | only a READER |
| S2 | **heard** | the word stream in order; closed classes; recurrence; determiner precedence | a LISTENER |
| S3 | **meaning** | reference, predication, paraphrase | an UNDERSTANDER |

**The heard rule** (user, 2026-09-01, verbatim): *"the system must be
able to work equally well if it only heard the novel and didn't read
it."* Consequence: S1 evidence may accelerate, but an organ whose
DECISION rests on S1 alone is below the bar and must say so — it
declares its stratum where it decides, and carries a BECOMING (below)
pointing at its S2 form. Sliding down a stratum to ship is allowed;
doing it silently is not.

**The trust rule** (user, same session, verbatim): *"never trust the
model on content, but it's pretty good with meaning if you give it
proper activation context."* Content — everything at S0–S2 — is
mechanical: gathered, counted, addressed by code. S3 judgment may be the
model's ONLY when the activation it judges (the candidate set) was
assembled mechanically at S0–S2. The select protocol
(testimony.js::buildSelectMessages/foldSelect) is this rule as code: the
model points at a candidate by index and never writes a word of content.

**The address rule** (P5.2, restated per stratum): whatever stratum a
decision is made at, its ADDRESS is S0 — carried forward from the cut,
coordinate space declared, self-verified. "Can't we find it by knowing
what we prompted it with?" (user) is the S0 discipline in one sentence:
never search for what you already know the position of.

**The generating question for S2 designs** (user, verbatim): *"when in
doubt, think 'how would a baby learn this?'"* A baby is a heard-only
learner — asking how a baby learns a distinction is asking for its S2
signal. Measured example, kept because it refuted two designs first: how
does a listener know "general" is a title and "Kutuzov" is a name?
Not rarity (refuted: kutuzov 529 ≈ general 657 in War and Peace — a
protagonist is not rare). Not a hand-list (refused: a sample of English
standing in for the whole). The reader's signal is capitalization
(S1: general lives lowercase 424×, Kutuzov 0×) — shipped, works,
BELOW the heard bar. The listener's signal is determiner precedence
("the general" is said; "the Kutuzov" is not — a received closed class
with a giver). That S2 form is the shipped gate's becoming.

## The BECOMING convention — pointing at the referent, not the aspiration

A **becoming** is a runnable test, named `BECOMING <handle>: …`, marked
`{ todo: true }`. It runs on every suite run, reports its own failure,
and cannot fail the suite. Inhabiting it — the day the organ becomes
what it was pointing at — is removing the todo flag, nothing else.

Why a test and not prose: prose describes what we currently think the
organ should be, which drifts with whoever wrote it. A test IS the
referent — concrete input, concrete predicate, indifferent to opinion.
A new agent does not have to reconstruct intent from changelogs; it runs
the test and watches exactly where the organ falls short of what it is
trying to become.

The whole aspiration map is one grep:

```bash
grep -rn "BECOMING" --include="*.test.mjs" .
```

First entry: `BECOMING heard-clean` (corroboration.test.mjs) — the
generic-title gate must survive a case-stripped source. Currently todo:
the shipped gate decides at S1 and demonstrably breaks on heard-only
input (with case stripped, names flag as generic). The test is the
determiner-precedence design's acceptance criterion, written before that
design exists.

## Rules of the vocabulary

1. Say **floor** or **stratum**, never bare "level", in code comments,
   commit messages, and docs.
2. An organ deciding below the heard bar declares its stratum at the
   decision site and carries a BECOMING at its target.
3. A becoming names a capability (a predicate), never an implementation
   — "heard-clean", not "use determiners". The implementation that
   inhabits it is whatever passes.
4. A becoming that turns out unreachable is closed the way any refuted
   design is: the todo test is replaced by a test pinning the measured
   refutation, and the refused list gets a line. An aspiration is not
   exempt from II.23.

---

## Amendment (2026-09-01, same day): the first becoming inhabited — and not by its named design

`BECOMING heard-clean` was written naming determiner precedence (a
received closed class) as the expected S2 form. It was inhabited the
same session by something stronger, at the user's own direction: *"that
there are words that sometimes have 'a' in front of it shouldn't be a
hard written rule, it should be a discovered kind, and that kind can be
addressable, and we can have a name for it in the hyperlexicon."*

`kind-standing.js::discoverCompanyKinds` discovers the kinds from the
heard stream itself — words grouped by the dominant `before=` feature of
their own company, floors declared, nothing taught, the kind NAMED BY
ITS OWN SIGNATURE (`kind:before=the`), with an II.23 shuffle control
that dissolves every kind when company is destroyed (and which caught a
chance kind at exactly the share floor on its first run). `frameWords`
is the one structural consumption: a kind signed by a WORD is a frame; a
kind signed by POSITION (`^` — the absence of a preceding word, not a
word of any language) is not. Measured live on War and Peace's heard
stream: `kind:before=the` = general, count, emperor, colonel, captain;
`kind:before=^` = kutuzov, napoleon, pierre, rostov, denisov. The
third-source vote re-ran through the discovered gate end to end and
landed identically.

This confirms the convention's design bet in its first use: **a becoming
names a capability, never an implementation** (rule 3) — the todo test
did not have to be rewritten when a better design inhabited it, only
injected differently. And it adds the addressability rung: a discovered
kind lands in the hyperlexicon as an ordinary note
(`general|keeps-company|kind:before=the`), witnesses UNIONED across the
sources that independently discover it — so kind membership is itself a
corroboratable claim, riding the same door facts ride, and a future
organ consults the address instead of re-deriving the measurement.

One measured refusal from the same pass, kept so it is not retried:
cross-kind precedence ("titles front many different names") reads 0.6%
at any practical sample of the name kind, because a title fronts
hundreds of names — unusable as a gate.
