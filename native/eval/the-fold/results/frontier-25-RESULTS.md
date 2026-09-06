# Frontier-25 — twenty-five "frontier" tasks, claimed or witnessed by organs already here

*Dated transcription of `node eval/the-fold/frontier-25.mjs` on 2026-09-05, branch `frontier-25` in both repos (the-fold P115 / eoreader7 S76). The zero-call arm is enforcement (`tests/frontier-25.test.js` reads it on every suite run, `tests/measure-media.test.js` the media door); the mouth arm is one run, dated, and says so.*

## The rule the fixture makes operational

A task the instrument takes on is an organ's before it is the mouth's. Either an organ CLAIMS it — computes, reads, or declares its answer with no model — or an organ WITNESSES it: the mouth writes, the machine judges, and the witness has been shown able to fail (a control: the reference answer passes it, a deliberately wrong one fails it). Nothing here is a new organ. The first cut of this work wrote five; on the user's redirect ("we've done a lot of work already on these capacities so it shouldn't be net new") they were deleted and the tasks were mapped onto what stood: arithmetic.js (extended in place), shape.js (extended in place), skill-runner's admission check, the recorded `/api/run`, term.js's CSV walk with the sql worker's own sql.js, the product assay's reader, P105's void, the measuring door (its media path extended in place).

## Zero-call arm — 13/13 claimed outright, 11/11 witnesses proven able to fail

| id | category | organ | result |
|---|---|---|---|
| m1 | math | arithmetic.js pure door | 17 * 24 = 408 — computed, not generated |
| m2 | math | arithmetic.js pure door | ((240)*(15)/100) = 36 |
| m3 | math | arithmetic.js shaped (units) | 5 mile to km = 8.04672 km |
| m4 | math | arithmetic.js shaped (solve) | 3x + 5 = 20 → x = 5 (the engine's own polynomial coefficients) |
| m5 | math | arithmetic.js shaped (combinations) | combinations(10, 3) = 120 |
| m6 | math | arithmetic.js shaped (statistic) | median(3, 9, 1, 7, 5) = 5 |
| m7 | math | arithmetic.js shaped (derivative) | d/dx (x^3 + 2x) at x = 2 = 3x² + 2 → 14 |
| m8 | math | arithmetic.js calendar | days(2026-01-01 → 2026-09-05) = 247 |
| m9 | math | arithmetic.js calendar | weekday(1776-07-04) = Thursday |
| n1 | math | witness: claimedValue vs mathjs | the mouth's last number against 1000·1.05³ to the cent (1157.63) — control passes/fails as pinned in the test |
| c1 | coding | witness: skill-runner admitSkill | reference isPalindrome admitted · wrong refused: "its own check failed: panama" |
| c2 | coding | witness: skill-runner admitSkill | reference sumRange admitted · the off-by-one refused: "its own check failed: 1..5" |
| c3 | coding | witness: skill-runner admitSkill | reference groupBy admitted · the overwriting one refused with the grouped bytes |
| c4 | coding | witness: skill-runner admitSkill | reference isIsoDate admitted · the loose regex refused: "month 13" |
| p1 | coding | witness: serve.mjs /api/run (recorded) | reference FizzBuzz stdout exact · wrong refused (its stdout shown) |
| p2 | coding | witness: serve.mjs /api/run (recorded) | reference csv totals exact · the wrong order refused |
| s1 | data | witness: csvTable + sql.js | reference query → [["Austin",30]] · the wrong query → [["Austin",20]] refused |
| a1 | reading | product assay record | Amelia Hartley —founded→ the Northgate Observatory in 1887 · 1 byte-addressed span |
| a2 | reading | product assay record (derivation) | Rowan Vale —preceded→ Owen Blythe derived at depth 1 on 2 premises, never stated |
| a3 | reading | product assay record (contest) | The Northgate Observatory —opened→ in 1889 · 2 spans · 1 contest on the record — the answer carries its date and its dispute |
| a4 | reading | the void (P105) | 0 notes with verb "catalogued" among 5; void declared with scope {sources: [1, 2]} |
| f1 | creative | witness: shape.js declaredForm/checkForm | reference acrostic holds · wrong refused: first letters spell "TOLD", not "FOLD" |
| f2 | creative | witness: shape.js | reference lipogram holds · wrong refused: the letter "e" appears in: The, evening, the, set… |
| f3 | creative | witness: shape.js | reference holds · wrong refused: mustExclude: present: the |
| f4 | creative | witness: shape.js | reference holds · wrong refused: 3 constraints (maxWords 9 > 8; mustInclude; endsWith) |

Eight rows landed on the throwaway build record for the two python controls (build-run / build-run-result, P16): the runner is the sanctioned one, and it recorded.

## The measuring door over decoded media — 5/5

The perceivers beyond text now sit in eoreader7 `native/adapters/{audio,image,video}` (crossed from the frozen provider under `conformance/media-perceiver-parity.test.mjs`, 4/4), and `organs/measure.js` takes decoded media beside bytes. "Chat with the content by its own structure" here is a DECLARATION answered with a PLACEMENT and an ADDRESS — the door's own shape, unchanged:

| id | medium | declaration | what the structure said |
|---|---|---|---|
| v1 | image | `/measure gradient.png` (probe) | "a decoded image, 64×64 as read — frames are scanlines · channels: luminance" and the declaration to paste back |
| v2 | image | luminance, frame 1, burstiness/shuffle, draws 200, window 8 | observed 137.9 sits above every one of the 200 broken copies — the ground was present |
| v3 | video | motion, frame 1, burstiness/shuffle, draws 200, window 5 | refused (`degenerate_ground`): every broken copy produced the same figure — a fact about the pairing, not the material. The perceiver's own series addresses the largest transition at frames 19→20, 2.0 s: the fixture's cut |
| v4 | pcm | rms, frame 400 over 60 s of a real recording, decoded from wav | observed 5816 sits above every one of the 200 broken copies; 1,200 values |
| v5 | wav | rms, frame 400 over the built tone | placed; the exactly-zero frames are 40–59, located to 2.0–3.0 s — the fixture's silence. (The fixture first said 41; the door read 40. The fixture was wrong.) |

What is NOT built and not claimed: a line of reading out of a frame (extents, fillers, eliminations over the perceiver's units — EOT-BEYOND-TEXT.md's third step); the page-side decoders, so `/measure` on a dropped png in the browser still frames bytes and the probe says where the decoder lives.

## Suites at this commit

the-fold: 1,608 pass / 0 fail / 6 skipped (the `webllm-rung.test.mjs` mirror walks skip typed where a mirror is absent, fail where one drifted — P116); arithmetic 23/23, shape 17/17, measure 51/51 unchanged, generality-gate + constitution 16/16. eoreader7 native: 655 pass / 0 fail / 1 TODO (pre-existing); media-perceiver-parity 4/4, measure-media 5/5, frontier-25 4/4.

## Mouth arm — two small mouths through the real turn, the witness judging, one retry with the result fed back

*Run 2026-09-05, retries 1. The mouth arm measures the MOUTH: the organ's answer stands for every task an organ claims (the arithmetic rows below are what the mouth says when asked alone, judged at the organ's own precision), and for a witnessed task the witness is what ships a wrong draft back. One run, dated.*

| model | passed the witness | on the first draft | after the result was fed back | model calls |
|---|---|---|---|---|
| gemma2:2b | 14/25 | 11 | 3 | 230 |
| qwen2.5-coder:1.5b | 16/25 | 14 | 2 | 243 |

| id | claim | gemma2:2b | qwen2.5-coder:1.5b |
|---|---|---|---|
| m1 | arithmetic | passed · mouth claimed 408, expected 408 | passed after feedback · mouth claimed 408, expected 408 |
| m2 | arithmetic | passed · mouth claimed 36, expected 36 | passed after feedback · mouth claimed 36, expected 36 |
| m3 | arithmetic | failed · mouth claimed 8.05, expected 8.04672 | failed · mouth claimed 1.60934, expected 8.04672 |
| m4 | arithmetic | passed after feedback · mouth claimed 5, expected 5 | passed · mouth claimed 5, expected 5 |
| m5 | arithmetic | failed · mouth claimed 10, expected 120 | passed · mouth claimed 120, expected 120 |
| m6 | arithmetic | passed · mouth claimed 5, expected 5 | passed · mouth claimed 5, expected 5 |
| m7 | arithmetic | failed · mouth claimed 2, expected 14 | passed · mouth claimed 14, expected 14 |
| m8 | arithmetic | failed · mouth claimed null, expected 247 | failed · mouth claimed -5, expected 247 |
| m9 | arithmetic | passed after feedback · mouth claimed "## Date of the Event\n\nIt was a Thursday!\n\n## Year o | passed · mouth claimed "## date\n\nJuly 4, 1776 was a Thursday.\n\n## day_of_we |
| n1 | numeric | passed after feedback · mouth claimed 1157.63, engine computes 1000 * 1.05^3 = 1157.63 | passed · mouth claimed 1157.63, engine computes 1000 * 1.05^3 = 1157.63 |
| c1 | skill | passed · admitted c338e33de1dc | passed · admitted eb02d0fd7232 |
| c2 | skill | passed · admitted 58b9e1a5dc3f | passed · admitted 307669e6a748 |
| c3 | skill | passed · admitted 66056538a946 | passed · admitted dddd2a61871a |
| c4 | skill | failed · its own check failed: month 13 | failed · its own check failed: month 13 |
| p1 | run | passed · stdout "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\ | passed · stdout "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\ |
| p2 | run | did_not_run · exit 1: ValueError: invalid literal for int() with base 10: 'amount' | did_not_run · exit 1: ValueError: invalid literal for int() with base 10: 'amount' |
| s1 | sql | passed · rows [["Austin",30]], expected [["Austin",30]] | passed · rows [["Austin",30]], expected [["Austin",30]] |
| a1 | assay | passed · answer names Amelia Hartley; the record for "Who founded the Northgate | passed · answer names Amelia Hartley; the record for "Who founded the Northgate |
| a2 | assay | passed · answer names Rowan Vale; the record for "Did Rowan Vale precede Owen B | passed · answer names Rowan Vale; the record for "Did Rowan Vale precede Owen B |
| a3 | assay | passed · answer names in 1889; the record for "When did the Northgate Observato | passed · answer names in 1889; the record for "When did the Northgate Observato |
| a4 | void | failed · neither names nor refuses | failed · neither names nor refuses |
| f1 | form | failed · form: 2 constraint(s) failed — lines: expected 4 lines, got 20; acrost | failed · form: 2 constraint(s) failed — lines: expected 4 lines, got 25; acrost |
| f2 | form | failed · form: 2 constraint(s) failed — noLetter: the letter "e" appears in: Su | failed · form: 2 constraint(s) failed — noLetter: the letter "e" appears in: se |
| f3 | form | failed · form: 1 constraint(s) failed — lines: expected 3 lines, got 12 | failed · form: 2 constraint(s) failed — lines: expected 3 lines, got 16; mustEx |
| f4 | form | failed · form: 1 constraint(s) failed — maxWords: expected at most 8 words, got | failed · form: 2 constraint(s) failed — maxWords: expected at most 8 words, got |

**What the two arms say together.** Every task an organ claims is answered by the organ regardless of the mouth: a 2b mouth alone says 10 choose 3 is 10 and the derivative at 2 is 2, and the instrument answers 120 and 14 because arithmetic.js does. Where the mouth writes and an organ witnesses (skills, python, sql, the form), the witness turned wrong drafts back and one feedback line fixed some of them; the rest are recorded as failed with the witness's own reason, never shipped as answers. The void task is the honest edge: both small mouths named someone or hedged rather than declaring the absence the ledger holds (P105) — the mouth arm's number to beat next.
