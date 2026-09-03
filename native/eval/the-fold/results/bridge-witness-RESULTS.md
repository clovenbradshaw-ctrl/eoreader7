# Pass 12 step 4 — witnessing a referent bridge: it discriminates, and it cannot reach the wall it was hoped to reach

`node native/eval/the-fold/bridge-witness-measurement.mjs`
Real material (the three Wikipedia fixtures S49 used), real pipeline, live
`gemma2:2b` on CPU. Run twice at `temperature: 0`; identical both times.

## What was asked

S49 built bridges as recorded objects and named its own gap: a bridge
reaches `corroborated` only when a SECOND, independently-derived content
note happens to assume the identical correspondence. 40 of 43 bridges on
this material stand `single-witness`, and nothing in the mechanism could
ever move them. Step 4 asks a witness directly.

## The measurement

| | |
|---|---|
| content ledger | 934 notes from 3 pages, 22 carrying a join |
| bridge ledger | 43 distinct objects — 3 corroborated, 40 single-witness |
| candidates with context on both sides | 46 (all armable — a decoy existed for every one) |
| examined | 12 (declared budget N, P9) · 4 model calls each · 60 calls · 161s |

Every candidate was asked TWICE at the eval level, each ask itself an armed
`witnessBridge` call (real + decoy):

| arm | landed "same" |
|---|---|
| real correspondence | **8 of 12** |
| MISPAIRED control (built to fail — every one wrong by construction) | **2 of 12** |

**Fisher exact, one-sided, α = 0.05 declared before the run: p = 0.0180.**
The control is separated. That is the entire positive finding: the picker
answers differently when the pairing is wrong. It is not a precision claim,
and nothing here says a landed bridge is TRUE.

The production walk (`witnessBridgesFor`, `maxAsks: 6`) then asked 6, landed
6, suggested 0 concessions, refused 0. Six bridges now carry a
`bridge-witness` witness beside their `bridge-inferred` one.

## The finding that matters more, and it is deflating

**12 of 12 examined candidates have two faces that are the IDENTICAL
string** — `Prince ↔ Prince`, `Austria ↔ Austria`, `Schwarzenberg ↔
Schwarzenberg`, `attacks out of Telnitz ↔ attacks out of Telnitz`.

This is not a sampling accident. A bridge exists only where `hear()`'s
exact-triple match ALREADY fired. A paraphrased restatement never matches
the triple, so it never produces a join, so it never becomes a bridge
candidate, so no witness is ever asked about it.

**Therefore: witnessing bridges cannot touch the ~2% corroboration wall.**
That wall is caused by propositions never matching in the first place
(P74/P83's own measurement; `sameLemma("withdraws","retreated") = false`),
and this organ operates strictly downstream of the match that never
happened. What step 4 buys is real but narrower than the ask that motivated
Pass 12: an assumed bridge becomes EXAMINABLE, and a wrong one becomes
refusable, where before both were silent.

The honest one-line statement of the whole pass: **step 4 makes bridges
accountable; it does not make more of them.**

## What a landed witness does and does not change

A `bridge-witness` witness does NOT raise a bridge's `standing` — every
witnessed bridge above still reads `single-witness`. This is deliberate and
is the kernel's own rule, not an oversight: `standingOf` counts distinct
SOURCES, and a model reading two passages is not a second independent
source asserting the correspondence. The witness appears in `kinds`
(`{"bridge-inferred":1,"bridge-witness":1}`) — counted apart, never summed,
the same discipline P84 established for `primary:` against account
witnesses. A consumer that wants "was this bridge ever actually checked"
reads the kind; a consumer that wants "how many independent crossings
assumed it" reads the standing. They are different questions and stay so.

## Disclosed limits

- **The control may be easy.** A mispaired passage is usually from an
  unrelated topic, so "different" is cheap to detect. This run does NOT
  show the organ can catch a SUBTLE mis-pairing — two different Princes in
  two documents is exactly the hazard `notes.js` names, and it is not what
  the control tested. A harder control (mispair only within a shared topic)
  is named, unbuilt.
- **n = 12**, one material, one model. The p-value is exact for this table;
  it is not a claim about other material.
- **4 of 12 real correspondences read "different"** — including two
  `Austria ↔ Austria` cases. Whether those are the model being wrong or the
  two documents genuinely meaning different things at those spans was not
  adjudicated; no oracle was consulted, and none is claimed.
- **The organ is unmeasured on non-identical faces**, because this material
  produces none. The case bridges were designed for is the case this
  material cannot exercise.
