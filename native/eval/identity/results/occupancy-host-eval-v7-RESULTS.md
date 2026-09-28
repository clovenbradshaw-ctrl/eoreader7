# Occupancy through the pipeline, v7 — registered run, 2026-09-28

Driver at 4d5d508; Z3' pre-registered in the header after reading v6;
`NATIVE_MAX_CHARS=150000`. Raw: `occupancy-host-eval-v7.json`. ONE change
from v6: the phasepost is handed a lemmatizer (`lemmasOf`, built from the
UniMorph MorphologyPrior@1 exactly as the-fold's `reader-bundle.js` builds
it). Every other prediction was expected byte-identical to v6.

| | prediction | result |
|---|---|---|
| Z3' | ≥ 80% of default-arm standings typed; by lexicon `became`/`becoming` → INS·Figure, `appointed`/`elected`/`named` → DEF·Figure, `promoted` → SYN·Figure | **held — 33 of 33 typed.** `became` INS·Figure 14, `becoming` INS·Figure 5, `appointed` DEF·Figure 7 + DEF·**Ground** 1, `elected` DEF·Figure 1, `named` DEF·Figure 4, `promoted` SYN·Figure 1. The ops are the lexicon's (become-109.1, appoint-29.1, promote-102), reached through `via: became->become` |
| Z1, Z2, Z4, Z5, Y1, Y2, H1 | byte-identical to v6 | **identical** (H1 differs only in `seconds`) |

## The one Ground

*Summers … appointed Under Secretary of the Treasury* (s5): the locus
begins with "Under", which is in phasepost's received locative class, so
the grain rule reads a place. The op is right (DEF), the grain is the
rule's own disclosed roughness ("honestly rough: locative-led object →
Ground") meeting a title that starts with a preposition. Reported, not
patched: the grain is scored apart from the op for exactly this reason.

## What v6 + v7 settle together

The act overlay is live on every standing the reader lands, from the real
lexicon, through the real morphology prior, on the real cube. What Z3's
failure in v6 taught is procedural and worth keeping: an organ that
discloses its own path (`lemmasOf`, `via`) failed at 0/33 because the
CALLER had not walked that path — the fix was an injection, and the record
says so before the number moved.

## Next (v8, pre-registered in the driver)

The v6 amendment to `merge-standing.js` (81e910b) declared to the driver:
the Bezúkhov locus should collapse `one_being` and split nothing; the
Guardiola locus should stay a position.
