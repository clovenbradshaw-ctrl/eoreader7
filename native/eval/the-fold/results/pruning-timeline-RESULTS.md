# The refutation horizon, measured on real data (2026-08-28)

Driver: `eval/pruning-timeline.mjs` (re-runnable; writes
`eval/results/pruning-timeline.json`). Material: the three committed
Wikidata succession fixtures, streamed one fact at a time. No model call
anywhere.

**The question.** Step 0's falsification probe established that a
refutation scan can refuse but never license. That leaves the honest
follow-up: **how much is an "unrefuted" licence actually worth?** It is a
function of how much has been read — a licence granted at four facts may be
contradicted at forty — and that is only honest if it is measured, and if
the instrument takes the licence back when it happens.

## The horizon

| office | survived | refuted at | reasons | counterexample |
|---|---|---|---|---|
| Q4416090 (US senator) | **10 facts** | **fact 11** | uniqueness + cycle | Hannibal Hamlin began the office more than once |

Six of seven licences survived the whole 26-fact stream — reported as
**"unrefuted by THIS material — not a licence earned, and not a claim of
soundness."** That phrasing is the finding, not decoration: the probe
already proved these are indistinguishable from unsound ones.

## The full loop, on real data

Chemistry is a real `composes` declaration on a real `declarations.js`
register — candidate → promoted by a named giver → projected into
affordances by `affordancesFromDeclarations`. Nothing is assembled in a
local variable, which is the point: **an affordance that came from a
declaration can be conceded; one built in a caller's variable cannot.**

At fact 11 the audit refuted the Senate licence and the loop closed:

- **REC recorded** — `concede(declLog, …)` with the counterexample verbatim
  as its trigger. The register ends at 6 given, **1 conceded and kept** on
  the append-only log.
- **A product withdrawn** — `Q474290 —after:Q4416090→ Q1636152`, a fact
  derived under that licence at an earlier arrival, taken back with the
  same trigger.
- **History intact** — 26 derived across the run, **25 live**. Withdrawal
  marks; it never deletes.
- **The veto holds** — the refuted pair cannot fire again, and a withdrawn
  edge may never serve as a premise.

This required one substrate that GROWS (`admit`), not one rebuilt per
arrival. The first cut rebuilt each time, which put the audit and the veto
in the same pass — so nothing was ever derived under a licence before it
was refused, and `withdrew` was structurally always 0. Named because it
looked like a working result.

## Disclosed

- The cascade is exercised in the kernel's own suite, not here: on this
  material the withdrawn fact had no dependents. Withdrawing by `{giver}`
  matches every product directly — cascade only does work when the seed set
  is narrower than the dependency closure (withdrawing one affordance row).
- Six licences surviving 26 facts says nothing about their soundness. The
  horizon for those is beyond this corpus, which is a statement about the
  corpus.
- Arrival order is file order, declared. A different order moves the
  horizon; the counterexample it lands on would not change.
