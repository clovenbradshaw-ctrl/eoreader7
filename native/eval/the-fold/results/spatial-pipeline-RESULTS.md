# A spatial medium through signal.js — the fifth medium, 2026-09-01

*Driver: `eval/spatial-pipeline.mjs`. Chosen to be structurally unlike the
first four: text, music, video and turbulence are all ORDERED 1-D STREAMS,
where the mechanism's `before=` company is native. A 2-D lattice has no
before and no after — every cell has four neighbours and no canonical
order — so this is the first medium where the instrument must IMPOSE the
order the mechanism reads. It also runs entirely through `signal.js`
rather than hand-rolling the five steps, testing the general organ on
material it was not built against.*

## Declared grammar and predictions, both fixed before the run

A MARKER cell always sits immediately WEST of a TARGET cell on a 48×48
lattice; everything else is noise from a declared 6-symbol alphabet. Five
instruments, five predictions written before running:

| # | prediction | result |
|---|---|---|
| 1 | row-major (west→east) finds target-after-marker | **YES** |
| 1b | a same-scope, different-rule instrument corroborates it | **YES** |
| 2 | the mirrored instrument (east→west) finds the MIRROR, not the grammar | **YES** |
| 3 | column-major (north→south) is BLIND to a west-east grammar | **blind** |
| 4 | the scatter instrument finds nothing | **nothing** |

Control passed (kinds dissolve on scrambled company). Zero gaps. Findings:
`target → kind:before=marker`, share 1.000 against a search-aware ceiling
of 0.375, **corroborated** across 2 sources × 2 same-scope instruments;
`marker → kind:before=target` from the mirrored instrument alone, correctly
NOT corroborated.

## The scorecard entry

**This medium found no defect in the mechanism.** `signal.js` and
`kind-standing.js` ran unmodified; no organ changed. That is the second
such medium (video was the first), which is the evidence generality
actually requires — and it is worth more here than it was for video,
because a lattice is not a stream and the organ was never built for one.

| medium | what it exposed |
|---|---|
| text | (the baseline) |
| music | a text prior hiding in the organ; the shared-instrument limit |
| video | nothing new |
| turbulence | the share floor is unlicensed on a small alphabet → the null arm |
| **spatial (2-D)** | **nothing new — one usage law sharpened, no organ change** |

## The usage law it sharpened: SCOPE IS NOT RULE

The first run reported the true grammar as "one instrument only" — and it
was right to. The other instruments were not weaker checks; they were
**differently scoped**: column-major is structurally blind to a west-east
grammar, and the mirrored reading finds the mirror. Instrument
independence needs instruments that CAN SEE THE SAME THING.

So a directional finding stays honestly one-instrument until a
**same-scope, different-rule** instrument exists. Adding one (west→east,
segmenting in 2-row bands rather than single rows) corroborated the true
grammar immediately while leaving the mirrored finding correctly alone.
Turbulence's hole-vs-peak pair was same-scope by luck; this run makes it
a choice. The law now lives in `signal.js`'s own header, where a caller
choosing instruments will read it.
