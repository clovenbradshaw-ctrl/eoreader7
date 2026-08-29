# Writer-decay across genre — and why "decay rate" was the wrong quantity

Run 2026-08-29. Organ: `eoreader7/native/eval/writer-decay.mjs`, unmodified,
run through the host session (P0). Assembly: `eval/writer-decay-genre.mjs`,
which runs nothing and only compares four of the organ's outputs.

## The question

Whether activation decays differently in encyclopedic prose than in
narrative, and whether a corpus prior should therefore impart a decay rate.

## What the policy settled before the run

**P3.** Exactly one of the four runs is coref-primed. `pronounShare` is
0.000 in all three unprimed runs — including Pride and Prejudice, a novel,
whose own results doc already names this "an artifact of priming, not a fact
about Austen." My two encyclopedic runs returned `writerWindow: null` and
`pronounShare: 0.000`, identically.

**So the activation layer is unmeasurable without the prior in EVERY genre.**
Had this been run without reading P3 first, the null would have looked like
"encyclopedic prose has no pronoun layer" and would have been wrong. The
pronoun column is not read below.

**P1.2.** A gap of 64 frames is 1.9% of Frankenstein and 21% of the Borodino
article. Comparing raw dyadic bins across 305- and 3,392-frame materials is
the carry-a-constant-across-extents error the policy names, so every gap is
expressed as a fraction of that material's own extent.

## What survives the artifact

Name-vs-descriptor share needs no pronoun arm. Slope is descriptor share per
doubling of gap-as-fraction-of-extent, support-weighted.

| material | genre | coref prior | slope | desc @near | desc @far |
|---|---|---|---|---|---|
| Frankenstein | narrative | **yes** | +0.0334 | 0.232 | 0.245 |
| Pride and Prejudice | narrative | no | +0.0308 | 0.010 | 0.259 |
| War and Peace (article) | encyclopedic | no | +0.0261 | 0.044 | 0.211 |
| **Battle of Borodino (article)** | encyclopedic | no | **+0.0011** | 0.006 | 0.011 |

Stable across the whole `MIN_SUPPORT` sweep (n≥5 through n≥50); Borodino
never exceeds +0.006.

Three materials re-ground with descriptors as distance grows — the
identity-layer behaviour P1 predicts a writer will show. **Borodino does
not.** Its name share sits at 0.95–1.00 at every distance, including gaps
spanning a third of the article. That writer re-names unconditionally and
never models reader activation at all.

## The finding, and its limit

**A writer who never re-grounds has no decay curve to impart.** On Borodino
there is no distance-dependence to encode, at any rate, so a prior supplying
a decay rate would be supplying a parameter for a behaviour the material does
not exhibit. That is the direct answer to the original proposal, and it is
negative.

**The genre split does not hold.** The two encyclopedic articles land on
opposite sides: the War and Peace article slopes at +0.0261, near the novels.
So *encyclopedic vs narrative* is not the variable. What separates Borodino
is that its cast — units, places, commanders — admits almost no definite
description, while the War and Peace article's cast (an author, characters,
a novel) does. That is a property of the **population**, which P2.7 already
makes a required stage (`classifyIndividuation`), not a property of the
genre.

Stated as a limit, not smuggled as a result: n=2 per genre and the two
encyclopedic materials disagree with each other. One text per cell cannot
establish a population effect either. What this run establishes is the
narrower claim — that at least one real material has a flat re-grounding
curve — which is enough to refute "decay rate varies by genre, so priors
should impart it," and not enough to install what replaces it.

## Consequence for the priors dial list

Do not add an activation decay rate to the pocket dial list. If a
population-level dial is wanted later, the quantity to test is
**re-grounding strategy** (does this cast take descriptors at all), measured
by the slope above, and it belongs to P2.7's population stage rather than to
activation. Per P1.1, a flat curve is in no case a reason to widen the
window: "if beings are not coming back, the defect is in retrieval or in
coreference."

## The prior-shaped gap this actually exposed

Every unprimed run in this repo — three of four here — cannot measure the
activation layer at all. The pocket that would most improve this reading is
not one that supplies decay rates. It is one that supplies **coref priors**
(P3.2), the model-tier judgement `surfaces.js` declares the engine must not
derive. That is the dial with measured evidence behind it: primed
Frankenstein resolves a pronoun layer; unprimed Austen, unprimed Tolstoy-
article and unprimed Borodino resolve none.

## Reproduction note (added on landing, 2026-08-29)

This assembly runs nothing, so it reproduces exactly or not at all. It
reproduces: every slope above (+0.0334 / +0.0308 / +0.0261 / +0.0011) and the
whole `MIN_SUPPORT` sweep, Borodino never exceeding +0.006.

Two of the four runs it reads — the encyclopedic ones — were produced by this
session and were living in a `/tmp` that does not survive it. They are now
committed beside the two that were already there, as
`eoreader7/native/eval/results/writer-decay-{wparticle,borodino}.json`, under
the same names and the same schema the organ writes for Frankenstein and
Pride. The driver reads all four from that one directory, so the comparison
reproduces from the repos alone.
