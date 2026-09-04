# RETRACTED — this measured an open door, not the material

**Retracted 2026-09-04, the same day it was written.** Every conclusion
below about Tolstoy, about prose, and about whether Rashomon-shaped
material can host a contest is **withdrawn**. The numbers are real
arithmetic on a real run. They are facts about the harness this driver
configured, not about the material it read.

## What was wrong

`rashomon-probe.mjs` built its ledger through `lib/borodino-ledger.mjs`,
which calls:

```js
hl.admit(log, edges, { witness: p.ref ?? s.ref })
```

**No gate.** `hyperlexicon.js`'s `admit` builds its connector gate only
`if (classifyConnector)`, so with none injected the door is open and every
extraction artifact enters with the standing of a real assertion. P57
documents this exact failure mode verbatim, from a live prompt dump:

> `and —in→ that time had to get along with many politicians`
> `complete list —is→ given above`
> `the Victorian —era's→ hallmark industrialization`

and states the rule this run broke — **admission is a door, not a
funnel.** P82 then put received walls on that door precisely because *"a
note whose end is debris is a note nothing will ever corroborate,"* with
the measured effect: debris subjects 96 → 30 while referent subjects held
83 → 78.

This run had no gate and no walls. It then reported
`and | was | mortally wounded while leading this counter-attack` as
evidence about Tolstoy.

## Every claim below, and its status

| claim | status |
|---|---|
| 111 relations, 14 shared across sources | **withdrawn** — a census of ungated debris |
| "no shared relation is functional" | **withdrawn** — the connector slot was never gated to verbs |
| "prose extraction yields only non-functional relations" | **withdrawn** — unmeasured; the reader was not in production configuration |
| cross-source candidates 5 vs null 6–23 | **withdrawn as a finding about the material.** The arithmetic holds and the null is correctly size-matched; what it shows is that an ungated extractor's collisions cluster inside documents. That is a fact about the extractor. |
| "the wall sits upstream of the witness" | **withdrawn** — asserted from this run |
| 10 shared ends of 899 | **withdrawn** — and the comparison was made with `end.toLowerCase()`, which P11 forbids by name: identity goes through the cast organs (`extractSurfaces` / `discoverReferents` / `namesCorefer`), never a local notion of "the same name." The policy records the identical failure (Bezúkhov flagged invented over a diacritic); this run reproduced it with Kutúzov and misdiagnosed it as coreference pool scope. |

## The method errors, named so they are not repeated

1. **The instrument's configuration was read as a property of the world.**
   No claim about material is valid until the reader is shown to be in the
   configuration whose results are on the record. This run used a legacy
   corroboration-driver ledger with three opt-in levers off and no
   admission gate, and drew conclusions about a novel.
2. **An exact-structural-match test measured its own strictness.** The
   contradiction detector required identical verb and object strings. P29
   is written about this defect: nine vocabulary configurations chased it
   before the finding landed that *"the exact-structural-match verdict was
   measuring its own strictness more than the graph's quality"* — the same
   graph scored 80% under an entailment rubric.
3. **A detector was hand-rolled that already existed, better.**
   `hypergraph.js`'s `unbound` verdict carries `competing` — the material
   binding this exact verb+object to one and only one OTHER subject —
   gated on the object resolving to a referent and on there being exactly
   one rival, *"a slot the material shows filled by two+ different subjects
   proves nothing."* The hand-rolled version had neither guard.
4. **The policy already contained the finding.** P76 records that
   `relations.js` slot-finding is positional, and closes the wrong next
   step this run then proposed anyway: *"building a SECOND, case-marking
   strategy that still recovers 'subject' and 'object' by a different
   signal is the same borrowed category surviving through a different
   mechanism, not removed."*

## What survives

* **`fixtures/tolstoy-borodino.txt`** — 233 KB of Tolstoy's Borodino
  narrative, Project Gutenberg, public domain. Real material, unaffected.
* **`lib/borodino-ledger.mjs`'s `pages` parameter** — backwards-compatible;
  the default pair verified byte-identical.
* **The source-label null construction** — size-matched by design (same
  notes, same groups, only labels shuffled). Sound, and reusable. But P29's
  `asserted.js::orderArm` is strictly better for this question: it shuffles
  sentences in place while holding vocabulary and referent identity fixed,
  which isolates structure from vocabulary. Use that instead.
* **The question.** Whether Rashomon-shaped material hosts real contests is
  still open and still worth asking. It has not been answered here.

## What the run should have been

The production path: the door with its connector gate, P82's received
walls, the cast organs for identity, `hypergraph.js`'s five typed verdicts
(bound / contradicted / unbound+competing / beyond-reach / unheard), and
`capacity-runner.js::mergeTestimony` for the cross-source comparison —
which already returns a typed `DISAGREE` naming `holds` and `refused`, per
claim, on a claim-id spine that never compares surface strings.

That comparison is the one this driver reimplemented badly. The open
question it leaves is not about Tolstoy: it is that `mergeTestimony` is
called from one eval driver and one registry string, and **nothing lands
its `DISAGREE` on the ledger** — the same unwired shape as the concession
cascade before P86.
