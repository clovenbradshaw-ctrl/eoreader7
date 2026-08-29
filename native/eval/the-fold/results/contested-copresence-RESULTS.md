# Contested co-presence — the fix, and its refutation

Run 2026-08-29. Driver: `eval/contested-copresence.mjs`. Organ under test:
`eoreader7/native/kernel/contest.js`, wired into
`eoreader7/native/adapters/text/pronouns.js`.

## What was built

`resolvePronouns` refused, categorically, any frame carrying a named
surface. That veto is text-shaped twice: it names "a named surface," and it
treats co-presence as disqualifying rather than as a difference to weigh.
Measured cost on encyclopedic prose (Battle of Borodino, 305 frames): **75
frames carry a third-person singular pronoun, 69 of them also carry a name,
so 6 frames were adjudicated and 69 were never read.** The organ reported
`bindings: 0, gaps: 6` — six gaps standing in for seventy-five chances.

The fix moves the decision into a medium-general kernel organ,
`kernel/contest.js::adjudicate`, and changes co-presence from a veto to a
**standing**: a frame carrying competitors must clear a stricter declared
bar (`contestedMargin`), because the frame supplies a pull the recall cannot
see. Co-presence raises the BAR and never raises a SCORE — an unactivated
co-present candidate still loses, so nearest-name binding is not smuggled
back in. The two hard filters the adapter already owned (gender,
`nonPersonal`) are passed to the kernel as filters, never tiebreaks.

Medium-generality is asserted mechanically, not claimed: `contest.test.js`
reads the kernel's own executable body and fails if the words *sentence*,
*pronoun*, *surface*, *token*, *word* or *text* appear in it. The same
adjudicator is exercised unchanged on an unlabelled gaze across two faces in
a film shot and an unattributed motif across two instruments in a bar.

## Tests

- `eoreader7/native/tests/contest.test.js` — **11/11 pass.** Bars declared
  never defaulted; `contestedMargin < minMargin` refused as a mis-declaration;
  co-presence raises the bar without scoring; a filtered-out competitor does
  not raise the bar; floor precedes margin; the two omnimodal cases; the
  no-medium-words assertion.
- `eoreader7/native/tests/pronouns.test.js` — **9/9 pass, unchanged.** The
  refused regime is preserved exactly when `contestedMargin` is absent, so
  every prior measurement in this repo keeps its denominator.

One test failure during development was load-bearing and is recorded:
filing a `pronoun_refused_co_present` gap for frames the refused regime never
adjudicated broke `gaps.length === 0`. That was the design being wrong, not
the assertion. **A gap is a refusal the organ REACHED.** The denominator
moved to a `regime` block on the return value, where it is a count of frames
and cannot be mistaken for a verdict.

## The measurement — REFUTED

Every arm runs against a null: the same material with frames shuffled,
which destroys thematic coherence and preserves sentences, names and
co-presence rate.

| material | arm | adjudicated frames | bindings | per frame |
|---|---|---|---|---|
| Borodino | refused (shipped) | 6 / 75 | 0 | 0.000 |
| Borodino | **adjudicated** | **75 / 75** | 1 | 0.013 |
| Borodino | null, adjudicated | 75 / 75 | 4 | **0.053** |
| W&P article | refused (shipped) | 29 / 137 | 7 | 0.241 |
| W&P article | **adjudicated** | **137 / 137** | 9 | 0.066 |
| W&P article | null, adjudicated | 137 / 137 | 11 | **0.080** |

**Lift is 0.25x on Borodino and 0.82x on the W&P article. Below 1 at every
setting of `contestedMargin` from 0.2 to 0.9, on both texts.** The regime
binds LESS on coherent material than on shuffled material. It is not
reading. The fix is refuted and must not be adopted at any bar.

The two contested bindings it did make are visibly wrong, which agrees:

- `"he" → ref:auto:borodino` in *"Kutuzov did not have enough strength to
  win, but he was able…"* — bound to the battlefield over `mikhail_kutuzov`,
  which was co-present and lost.
- `"his" → ref:auto:anna_karenina` in *"Tolstoy used a great deal of his own
  experience in the Crimean War…"* — bound to a different novel over
  `tolstoy`, co-present and lost.

## The finding underneath — the margin is not null-safe

Diagnosed by measuring the margins themselves rather than the bindings:

| material | arm | adjudications | **mean margin** |
|---|---|---|---|
| Borodino | real | 95 | 0.028 |
| Borodino | shuffled | 101 | **0.053** |
| W&P article | real | 198 | 0.047 |
| W&P article | shuffled | 188 | **0.073** |

Coherent reading produces **thinner** margins than shuffled reading, in both
texts. The mechanism: in real reading order, thematically adjacent frames
activate many referents at once, so the candidate field is dense and no one
candidate separates. Shuffling scatters activation, leaving a sparse and
arbitrary field in which one candidate stands alone and clears easily.

So `minMargin` measures **separation, not evidence**, and cannot tell a
well-supported winner from a lonely one. That is a defect in the operating
point itself, not in this fix — this fix only made it visible by finally
adjudicating enough frames for the null to have power. It also puts the
earlier "right index binds 2 → 7" result in doubt on the same grounds: the
mandated index admits fewer surfaces, producing a sparser field, which is
exactly the confound above.

## What should be kept, and what comes next

Keep `kernel/contest.js` and its tests. The organ is correct as specified,
medium-general as asserted, and the `regime` denominator it forces onto every
return is worth having regardless of which bar wins — the reporting failure
was real and is now structurally impossible.

Do not adopt the adjudicated regime. `contestedMargin` remains absent by
default and the shipped veto stands.

The next test is not another bar. It is a **field-density-corrected
criterion**: a candidate's lead has to be scored against what a lead of that
size is worth in a field of that size, which is the Born-null shape this
repo already uses elsewhere (`draws`/`reseeds`/`window`) rather than a
fraction-of-top-score cutoff. Until that exists, a rising binding count in
this organ is not evidence of a better reading, and this document is the
reason.

## Reproduction note (added on landing, 2026-08-29) — and a defect in this document's own statistic

The driver was rewired to the repos before it was committed: organs from
`../../eoreader7/native/adapters/text/`, material from the article fixtures
this repo already commits (`eval/fixtures/wikipedia-battle-of-borodino.html`,
`wikipedia-war-and-peace.html`) through `web.js::extractReadable`, the
extractor `mhc-battery.mjs` already reads them with.

**The material is not the same material.** Both runs above read plain-text
extracts from a session's `/tmp` that are gone. `extractReadable` over the raw
page carries its navigation, category and reference chrome alongside its body:
1,493 frames for Borodino against the run's 305, and 1,077 for the War and
Peace article against 314. So none of the counts above reproduce, and the
tables stand as the record of what was measured rather than as something this
repo can re-derive.

**What survives the substitution, and what does not.** Borodino still binds
nothing on real material at the shipped bar — zero bindings at every one of
twelve shuffle seeds — so its arm reads the same way for the same reason. The
War and Peace article does not: it now reports a lift of 3.00x where the table
above reports 0.82x.

That disagreement was chased rather than reported as a reversal, and it is not
one. **The lift this document leans on is computed against a single shuffle,
and at these counts a single shuffle decides it.** Measured on the committed
fixture, real bindings fixed at 12 while the shuffled count swings 4 → 13
across twelve seeds:

| seed | shuffled binds | lift |
|---|---|---|
| 20260829 (the reported seed) | 4 | 3.00x |
| 3 | 13 | 0.92x |
| 42 | 12 | 1.00x |
| 2, 12345 | 8 | 1.50x |
| 11, 31337 | 5 | 2.40x |
| … 12 seeds | 4–13 | **band 0.92x–3.00x** |

The numerator never moves. The entire spread is one draw of the null. So
`0.82x` and `3.00x` are two draws from the same noise on two materials, and
neither is evidence about the regime — which means the refutation above is
carried by Borodino and by the margin measurement, and **not** by the W&P
lift, whatever its value.

The driver was changed to say so rather than left printing a number measured
to be noise: the null arm is now drawn over a declared seed set
(`NULL_SEEDS`, the reported seed first so that row stays comparable) and
reported as a band, with a third verdict for a band that straddles 1. This is
the discipline `kernel/contest.js::nullAdjudicate` already puts on its own
verdict one layer down — draws declared, never one — applied to the ratio this
driver reports, and it is the same failure shape the `regime` block was added
for: a count that hides its denominator misleads, and so does a ratio that
hides its variance.

**The disposition is unchanged and better supported.** `contestedMargin`
stays absent, the shipped veto stands, and the document's own "next test is
not another bar, it is a field-density-corrected criterion" is exactly what
`nullAdjudicate` and `eval/null-criterion.mjs` went on to build the same day.

**One unresolved inconsistency, named rather than edited away.** The kernel's
own header (`contest.js`) motivates itself with Borodino at "113 frames carry
a third-person singular pronoun, 99 of them also carry a name"; the table
above reports 75 and 69 for the same article. Both describe measurements
taken during this work on differently-extracted copies of the text, and
neither is re-derivable from this repo now that both extracts are gone.
Neither number was changed, because a header comment recording a measurement
is not something to adjust to match a different one.
