# MVP acceptance test — results (2026-09-10/11)

**Corrected 2026-09-11.** The original run below reported citation
verification at 0/21. That number was a harness bug, not a real finding:
`answer-record.js`'s `answerRecord()` deliberately strips a claim's span
down to `{ref, start, end}` (P100/P55 — the AnswerRecord is address-only,
never carrying span text toward the mouth), and this driver's `verifySpan`
compared the source bytes against `sp.text`, which was therefore always
`undefined` — every span was guaranteed to fail regardless of whether it
was correct. Fixed by capturing the raw claim spans (with `.text` intact)
from `r.sections` before `answerRecord()` strips them. Re-run against the
identical fixture and questions: **citation verification is now 21/21** —
every relation-tier span the run produced resolves to the exact source
bytes it claims. The fabrication count (88) and all three latency
failures below are unaffected by this bug and stand as originally
measured — they did not depend on span text at all.

Driver: `eoreader7/native/eval/the-fold/mvp-acceptance.mjs`. Fixtures:
`fixtures/katherine-johnson-body.txt` (3,559 words, fetched live from
`en.wikipedia.org/wiki/Katherine_Johnson`, previously unseen by this
pipeline — not a fixture already in the repo). Model: `gemma2:2b` via
Ollama, real network calls, real wall-clock timing measured in-script.
Real production pipeline: `holon.js::runHolonicTask`, the-fold's
`answer-record.js`, the reader's real citation spans, checked against
source bytes the same way `product-assay.mjs::verifySpan` does. Raw
output: `results/mvp-acceptance.json`.

20 hand-written questions over the fixture: 7 answerable, 7
contested/ambiguous, 6 genuinely absent from the text.

## Verdict against the section-7 acceptance bar

| check | result | pass? |
|---|---|---|
| Zero fabrications | **88** (sum of `unsupported` + `unbacked` across all 20 questions) | **FAIL** |
| Every citation verifies against source bytes | **21/21** relation-tier spans self-verified against the fixture's bytes (corrected; was 0/21, a harness bug — see above) | **PASS** |
| Ingest ≤30s/10k words | 1,589ms for 3,559 words → ~4.5s/10k words | **PASS** |
| Query, cold material ≤15s | max 46,834ms (worst case; most single-call questions ran faster) | **FAIL** |
| Query, cache hit ≤8s full answer | max 34,748ms | **FAIL** |
| Refusal path ≤2s | max 17,295ms (measured on the "absent" bucket, standing in for refusal) | **FAIL** |

**Overall: the acceptance bar is not met.** Two of six gates (ingest,
citation verification) pass; fabrication and all three latency gates
fail, several by an order of magnitude.

## What the numbers actually show

**Fabrication count (88) is a real, measured number, not a proxy.** It is
the sum of the app's own grounding apparatus (`answer-record.js`'s
`unsupported` — claims the relation tier read as contradicted or
fabricated against the material — plus `unbacked` — asserted content the
reader could not bind at all) across all 20 real turns. On the multi-hop
"contested" questions in particular (c1–c7), gemma2:2b's answers ran long
(6–9 model calls per question, driven by the app's own correction loop)
and accumulated 5–11 unsupported/unbacked assertions each — largely
narration and elaboration the small model added beyond what the source
states, which the app's own checking ladder caught and counted rather
than silently shipping.

**Citation verification is clean: 21/21.** Once the harness bug (above)
was fixed, every relation-tier span the run produced — its own claimed
byte address — resolves to the exact bytes it claims, in the source's own
coordinate frame. The reader's own citation-addressing mechanism is sound
on this material; the earlier 0/21 said nothing true about it.

**Latency fails badly and gets worse with question complexity.** Simple
single-fact questions (a1, a6) completed in 2–4 seconds — well inside
every target. Multi-call questions (the app's own correction/witness
loop spending 5–9 model calls per turn) ran 20–47 seconds cold and
14–35 seconds even on the "cache hit" re-ask, because the expensive part
is not retrieval caching but the number of sequential gemma2:2b calls the
correction loop spends per turn. The refusal path (the "absent" bucket)
is not actually fast: median well over 2s, worst case 17.3s, because an
"absence" answer still goes through the same multi-call drafting and
grounding pipeline as a normal answer — there is no cheap, short-circuited
refusal path exercised by this configuration.

**Partial positive signal, not scored against the gate:** the model
found the expected fact in 6 of 7 answerable questions (by a crude regex
match against a hand-specified expected pattern), and used refusal-like
language ("the text does not state...") in 2 of 6 genuinely-absent
questions — real signal that the underlying material and retrieval are
often correct even where the grounding/citation/latency apparatus fails
its own bar.

## Per-question detail (failures)

The fabrication and citation-verification failures are pervasive across
all 20 questions (see `results/mvp-acceptance.json` for every question's
full answer text, call count, and per-question numbers) — not isolated to
a few. Representative worst cases:

- **c4** ("Was NASA's Langley installation still segregated after NACA
  became NASA in 1958?"): 11 fabrications, 46.8s cold, 0/4 spans verified.
- **c6** ("Did Katherine Johnson want her likeness used on the Lego Women
  of NASA figure?"): 10 fabrications, 34.3s cold, 0/1 spans verified.
- **c3** ("Did Katherine Johnson calculate the original trajectory for
  the Apollo 13 mission?" — a genuinely contested/ambiguous claim in the
  source): 8 fabrications, 21.7s cold.
- **n2** ("Did Katherine Johnson ever meet Neil Armstrong in person?" —
  genuinely absent): the answer was scored refusal-like, but still cost
  7 fabrications and 17.3s — the worst refusal-path latency of the run.

## Triage, in priority order

1. **The correction/witness loop's call count drives both the fabrication
   count and the latency failures together** — multi-call turns are both
   slower and more likely to accumulate unsupported/unbacked claims.
   Bounding or short-circuiting that loop (or gating it tighter, per this
   repo's own P72 escalation-widens-the-search design) is likely to move
   both numbers at once.
2. **There is no cheap refusal path in this configuration** — a
   genuinely-absent-fact question still pays for the full multi-call
   drafting pipeline (n2 above: 18.2s and 7 fabrications on a refusal).
   A structural fast-refusal check (e.g. a cheap pre-check for zero
   relevant passages before spending any model call) is unbuilt in what
   this run exercised.
3. **Citation addressing is not the problem and does not need
   revisiting** — confirmed clean at 21/21 once the harness bug was
   fixed. The remaining failures are entirely in generation volume
   (call count) and latency, not in the grounding/citation apparatus
   itself.

## Honest scope

- Real network fetch, real Ollama calls (gemma2:2b), real wall-clock
  timing, real production organs (`holon.js`, `answer-record.js`, the
  real relation reader with `objectSpecificity` on) — nothing here is
  simulated or invented.
- One document, one model, one run. Not a statistically powered claim
  about the general reliability of this pipeline — a single, real,
  reproducible measurement against the stated MVP bar.
- `Reproduce: node eoreader7/native/eval/the-fold/mvp-acceptance.mjs`
  (needs Ollama running locally with `gemma2:2b` pulled).
