# Discovering what individuates a quantity: both candidate rules refused, and the residual is agency bias (2026-09-04)

`node native/eval/the-fold/quantity-kinds.mjs`. **Zero model calls.**

User: *"remember our thing where we use the LLM to discover rules?"* — said
after I named a defect and then proposed to fix it with a **hand-written table
of magnitude scales**. A received table is a hand-written rule in a better
coat. The standing pattern is the company kinds': a kind is DISCOVERED from
the material's own signature, NAMED by that signature, and carries a shuffle
control that dissolves it if it is not real.

## The material

The **ISC Bulletin** entry for the 2026 Sanriku earthquake: **one event, 22
magnitude measurements, 13 agencies, 13 scale tokens, range 6.5 – 7.8.** An
apparent disagreement of 1.3 magnitude units about a single earthquake,
objectively measured and subjectively reported, with every measurement
carrying its own scale token in the bytes. Nothing in the driver knows what
`Mww` or `mb` mean.

## A first attempt, refused by its own control

Over the USGS record alone the signature was `product:network:scale`, giving
**24 kinds over 26 measurements — 23 of them holding a single measurement**,
so "one value per kind" was vacuous and **7 of 40 redeals individuated as
well.** Refused. One authority cannot teach what individuates a quantity;
that is what sent this pass to the ISC.

## The question, and both answers refused

What individuates the quantity — the **scale** measured on, or the **agency**
that reported? A signature carves at the joint when measurements sharing it
agree, so the statistic is within-group spread, and the null redeals the
labels among the measurements (every label kept, every value kept, only which
value carries which label destroyed).

| signature | groups | covered | within-group spread | redealt median (range) | p |
|---|---|---|---|---|---|
| ungrouped | 1 | 22 | 0.2897 | — | — |
| **scale** | 8 | 17 | 0.1588 | 0.1922 (0.1000–0.2804) | **0.269** |
| **agency** | 2 | 11 | 0.1715 | 0.2709 (0.0879–0.3939) | **0.070** |

**Neither is licensed.** Both cut the spread against ungrouped, and a random
relabelling cuts it comparably often. At 22 measurements in groups of two and
three, the material cannot license a carving, and the null says so rather than
letting a plausible number through. The hand-written table would have asserted
what this refuses.

## The residual, which is the useful part

Same-scale disagreements survive the refusal as data:

```
mb     GFZ 6.7   VAO 6.5          MS     IDC 7.5   MOS 7.8
mB     GFZ 7.4   SFS 6.9          MW     NIED 7.4  GCMT 7.5
MwmB   GFZ 7.5   SFS 6.9          Mw     CSEM 7.4  IPGP 7.5
MwMwp  GFZ 7.4   SFS 7.1
Mwp    GFZ 7.3   PTWC 7.4  SFS 6.9
```

Each agency's deviation from its own scale's consensus:

| agency | n | deviations | mean |
|---|---|---|---|
| **GFZ** | 5 | +0.10, +0.25, +0.30, +0.15, +0.10 | **+0.180** |
| **SFS** | 4 | −0.25, −0.30, −0.15, −0.30 | **−0.250** |

**GFZ is high on all five of its measurements and SFS low on all four, across
four different magnitude scales.** Nine measurements, every one on its
agency's own side. Under a null of random sign that is p = 0.031 for GFZ and
0.063 for SFS.

So the structure in this material is **not** the scale question I set out to
answer with a table. It is **agency bias**, and it is the direct, measurable
form of *how to weight different sources* — one reader reads systematically
high, another systematically low, on the same physical event.

## Why this is falsifiable rather than a story

The claim makes a prediction that costs nothing to test and can fail: **on a
different earthquake, GFZ should again sit above its scale's consensus and SFS
below.** One event licenses nothing; the ISC publishes every event the same
way, so the sign test extends by fetching more. That is the next pass, and it
is the first thing in this whole line of work whose answer a future
measurement can take away.

## Said against it

- **One event, 22 measurements, two agencies with more than one reading.**
  Everything above rests on 9 signed deviations.
- Consensus is a mean that **includes the agency being scored**, which pulls
  every deviation toward zero. The effect is understated, not inflated — the
  conservative direction, but it should be leave-one-out on the next pass.
- Scale groups of two are the weakest possible evidence for a scale effect;
  the p of 0.269 is what that looks like honestly.
- The magnitudes are parsed from the ISC row's own triples. Its prime
  hypocentre carries nine fields before the magnitudes begin; an off-by-one
  there silently yields zero measurements rather than wrong ones, which is how
  it was caught.

## Files
`quantity-kinds.mjs`, `fixtures/sanriku/isc.csv` (ISC Bulletin, 13 agencies),
`fixtures/sanriku/emsc.json` (EMSC, a second authority: Mw 7.4, depth 10.9 km,
origin 07:52:58.29Z against USGS's 07:52:58.908Z).
