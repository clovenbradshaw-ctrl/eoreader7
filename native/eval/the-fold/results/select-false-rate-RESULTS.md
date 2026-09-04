# The vote carries no information: p(states|true) = p(states|fabricated) = 0.080 (2026-09-04)

`node native/eval/the-fold/select-false-rate.mjs`. gemma2:2b, **64 model
calls, 235s.** N and protocol declared before the first call.

## Why

The face-selected walk attested **2 of 4** planted fabrications — the first
failed precision guard in this repo — and the reason was dilution: every prior
walk carried 4 planted notes in a ledger of ~919 with a budget of 60, so the
guard was almost never reached. "0 lies" measured that it was never asked.
4 items is also far too small an interval to report a rate from.

So: the **calibration shape** rather than the walk shape. Ask the witness
directly, once per item, against the source where its ends best co-occur — the
construction the 0/36 generate batches used — with enough items to have power.

## The result

| arm | asked | states | rate | 95% CI |
|---|---|---|---|---|
| **real** | 25 | 2 | **0.080** | 2–25% |
| **fabricated** | 25 | 2 | **0.080** | 2–25% |

**Identical.** The likelihood ratio of a single armed `states` on this corpus,
under the select protocol at ask time, is **1.0**. The vote does not
discriminate a real claim from a fabricated one, so it carries no evidence.

Both arms refused 22 of 25 as `no-testimony`. The witness is not
mis-calibrated so much as almost silent, and what it does say is a coin
weighted the same way on both sides.

## Against the declared operating point

`WITNESS_OPERATING_POINT` declares, for gemma2:2b:

| | declared | measured here |
|---|---|---|
| p(states \| stated) | **0.333** | **0.080** |
| p(states \| fabricated) | 0 observed, **≤ 0.083** by rule of three on 36 asks | **0.080** |

The false bound was not wrong — 0.080 sits just inside the declared 0.083
ceiling, and 0/36 was an honest upper bound rather than a claim of zero. What
collapsed is the **true** rate: 0.333 → 0.080. The separation the operating
point rests on is between 0.333 and ~0, and at 0.080 versus 0.080 there is
none.

**This voids a justification carried in the code.** `corroboration.js` argues
`settleFloor = 2` from *"a single armed `states` carries LR ≥ ~4, so two
independent-source votes carry ≥ ~16, which is exactly what `settleFloor=2`
already demanded."* At LR = 1.0, two votes carry 1.0. The floor is not wrong,
but its stated warrant is gone.

## The two fabrications that landed

```
✗ "Apollo 10 was served on the backup crew for Apollo 8 the previous December…"
      decider: «Apollo 11 Journal»
✗ "from Apollo 10 onwards was the tremendous accomplishment of the Moon landing…"
      decider: «Apollo 10 was another step like that, although it took the
                lunar module out of earth orbit…»
```

The first decider is a **page title**, not a sentence. The select protocol
points at an index in a mechanically assembled candidate list, and a title got
into the list.

## What this settles about the whole line of work

Every corroboration count in this project is a count of these votes. At LR
1.0 the counts are counts of noise, and that is upstream of every question
asked today — it does not matter whether the corpus is independent (it is),
whether the selector separates (the referent one does, p ≈ 0.048), or whether
the ledger's gate is a gate or a level. **A vote that cannot tell true from
fabricated cannot corroborate anything.**

The mechanism's silence is doing the work that made this look survivable:
refusing 88% of asks kept the absolute number of false attestations low, which
read as "0 lies" for months.

## Said against it

- **25 per arm.** The CIs are 2–25% and overlap entirely. This does not prove
  the two rates are *equal*; it shows there is **no measured separation**, and
  the burden is on the vote to demonstrate information.
- One corpus, one model, one protocol (select), one temperature.
- The fabrications are the hard kind by construction (a real subject+verb with
  another note's object from the same corpus, so both ends genuinely
  co-occur). An easier fabrication set would separate better and would also be
  the wrong test.
- `p(states|stated)` here is measured on notes this reader cut, not on
  stated-by-construction claims as the declared 0.333 was. Some of the drop is
  that difference and not the protocol.

## Files
`select-false-rate.mjs`, `results/select-false-rate.json`.
