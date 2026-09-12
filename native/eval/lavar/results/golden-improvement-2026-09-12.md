# Golden improvement — received-verb widening (2026-09-12)

Two scoring instruments, both APPENDED into the sidecars they measure as
`EOTScore@1` lines (dated, metric recipe named, golden named) so a sidecar
carries its own quality history and a re-read/re-score after a fix lands a
new line the old one can be diffed against. Same append-only discipline as
every other observation.

| metric | what it measures | POS relevance |
|---|---|---|
| `golden-tool.mjs score` | recall = golden label+end2 match; precision = end1/label/end2 match (end1 = shared content token with a golden end1) | POS matters (labels are verbs) |
| `golden-tool.mjs gfp` | **GFP clause coverage** — a golden clause is COVERED iff some arrangement shares a figure token with its end1 AND a ground token with its predicate side (label+end2), any grain (Link/Field/Distinction/grain_gap) | **POS never matters** — the minimum bar (user, verbatim: "at a minimum we want every clause broken into GFP. parts of speech are nice to have but not necessary") |

Each score line also records mechanically-classified THEMES: false-positive
themes on `score` (the junk the reader emits), miss-themes on `gfp` (the
clause shapes it leaves unbroken). That is the "common themes" record: the
sidecar shows which classes dominate, and whether a fix moved them.

## Baseline (before the fix)

| ch | recall | precision | GFP coverage | top FP theme | top miss theme |
|---|---|---|---|---|---|
| 1 | 22.3% | 12.2% | 69.6% | label-unsettled=60 | participial-reduced=17 |
| 2 | 19.7% | 10.1% | 58.8% | label-unsettled=61 | participial-reduced=25 |
| 3 | 8.2% | 10.0% | 40.5% | label-unsettled=42 | participial-reduced=40 |
| 4 | 12.9% | 7.4% | 55.7% | label-unsettled=58 | participial-reduced=43 |
| **Σ** | — | — | **56.3%** | — | — |

## The fix (one, measured)

**Received verb widening** (`eot-jsonl.mjs`, 2026-09-12). The earned
vocabulary is starved: `discoverRelationVocab` nominates a verb only when it
follows a capitalised surface (S86), so real narrative verbs
(said/went/thought), present participles (trotting/looking/sitting) and
copulas (was/were/is) never enter it — exactly the two dominant miss-themes.
Fix: every form the received POS prior (UD_English-EWT, named giver) attests
as (VERB+AUX)-dominant at the project's own `GRAMMAR_MIN_SHARE` joins the
vocabulary as an ADDITION. Never removes an earned form; Field connectors
(into/down/with) stay out (ADP-dominant); AUX settles as verb via
`THRAX_MAP` so copulas emit Links, not refusals. A received prior at a
declared share floor — never a number tuned against a golden.

## After the fix

| ch | recall | precision | GFP coverage | top FP theme | top miss theme |
|---|---|---|---|---|---|
| 1 | 35.9% (+13.6) | 18.4% (+6.2) | 76.6% (+7.0) | label-unsettled=97 | participial-reduced=15 |
| 2 | 31.0% (+11.3) | 20.1% (+10.0) | 65.0% (+6.2) | label-unsettled=81 | participial-reduced=23 |
| 3 | 19.5% (+11.3) | 14.8% (+4.8) | 44.4% (+3.9) | label-unsettled=74 | participial-reduced=35 |
| 4 | 18.3% (+5.4) | 12.8% (+5.4) | 60.3% (+4.6) | label-unsettled=83 | participial-reduced=39 |
| **Σ** | — | — | **61.7% (+5.4)** | — | — |

Every axis up on every chapter. Emitted counts also fell on ch2/ch4 while
recall rose — fewer emissions, better ones.

## Goals (the bar, in order)

1. **GFP coverage → 100%** (minimum bar): every golden clause broken into
   SOME arrangement. Currently 61.7% weighted. Remaining miss-themes, in
   order: participial-reduced (still #1), copula-complement, negated,
   modal-headed, quotation-attribution. The participial shape persists even
   with the verbs in the vocabulary — the anchor/subject segmentation around
   a comma-introduced reduced clause is the next thing to read.
2. **Precision → up** (the "best possible sidecar" quality half): currently
   12.8–20.1%. Dominant false-positive theme is label-unsettled (a word the
   prior doesn't settle into a relation-heading class) — much of it is
   legitimate Field/Distinction output the golden (verb-clause-only) doesn't
   credit; the rest is verb-particle splitting and subject-swallowing, both
   real extractor defects.
3. **Recoverability gate** must run on every book it scores (branch
   divergence: the S110/S111 heading conventions live on `lavar-spiral-fixes`,
   not this branch — the gate cannot find Tom Sawyer/Sherlock chapters).

Re-run to re-measure after any reader change:
```
node golden-tool.mjs score <ch>   # appends EOTScore@1 (recall+precision+themes)
node golden-tool.mjs gfp <ch>     # appends EOTScore@1 (gfp coverage+miss-themes)
```
## The personas wired in (2026-09-12)

"Go through all the personas and see all the ways they can enhance reading
that they currently aren't" — then "wire them all in." What landed, each
with its enforcement:

- **Holmes — inline irreflexivity.** `eot-jsonl.mjs` now flags
  `selfReferent: true` on any proposition whose two ends resolve to ONE
  referent (LAVAR §9's check, previously only LaVar's, now the reader's own
  admission). Verified live: AIW ch2 caught "I'm sure I'm not Ada" — both
  ends fold into `ref:auto:i'm`. The reader catches its own folds.
- **Simon/Chekhov — the unwired organs, wired.** `structure-rec.mjs` gained
  `detectAndMatch()` (the programmatic door) and the `import.meta.url` guard
  its own header claimed it had (its CLI `process.exit(0)` was killing the
  reader when imported — a real regression, found live). `eot-jsonl.mjs`
  and `recoverability.mjs` now BOTH use the shared detector — S111's claim
  made true, and the recoverability gate can finally run on every book:
  AIW 100% (no regression), Tom Sawyer ch1-3 100% (was unrunnable), Sherlock
  ch1 100% (was unrunnable). A new convention auto-persists
  (heading-conventions.json) — Tom Sawyer's `CHAPTER <roman>` discovered
  mechanically and saved on first contact.
- **Pearl — same-instrument corroboration disclosed.** The reread's
  `EOTReadingPass` disclosure now says agreement between passes is the
  identical extractor on the identical bytes — a shared common cause, never
  independence.
- **Marshall — the law cited on the record.** Every inferred structural
  observation's `basis` now cites the S-rule that licensed it (S95, S101,
  S102, S107, S111), so a sidecar's inference is checkable against the
  canon, not just against bytes.
- **Diaconis — the reader's noise floor, measured.** `null-arm.mjs` (new):
  word-shuffles a chapter (or sentence-shuffles), runs the UNCHANGED
  reader, reports what survives. AIW ch1: the reader emits **184
  arrangements from pure word-noise vs 250 from real prose** — 74% of a
  real reading is at its own false-positive floor; sentence-scrambled noise
  produced **493** — MORE than the real chapter. The reader is a local
  clause extractor whose yield barely tracks real structure. This is the
  calibration every future recall/precision gain must be placed against.
- **Feynman — the scorer proves itself.** `score` now records
  `movedVsPrior` on every EOTScore line: a no-op reader change must read 0
  (verified: two identical runs, delta 0) — a number can never move without
  the ledger of why.
- **Ostrom — absence attributed with evidence.** `gfp` now records
  `ostromAttribution`: a missed clause is `vocabularyMiss` (the reader's
  vocabulary never contained the label — its starvation, not the material)
  vs `extractionMiss` (the word was in the vocabulary but the clause was
  still not broken — the reader's failure).

All additive: the golden scores after wiring are byte-identical to before
(recall 35.9/31.0/19.5/18.3, precision 18.4/20.1/14.8/12.8, GFP coverage
76.6/65.0/44.4/60.3).

## Second chase (same day) — reduced participial clauses, the golden's #1 miss-theme

The `participial-reduced` miss-theme dominated every chapter (15-43 uncovered).
Hand-read showed two shapes: comma-introduced reduced clauses ("the White
Rabbit, trotting slowly back again") sit OUTSIDE the matrix object span, so
no recursion ever reaches them; nested ones are blocked by NOUN-dominant
intermediates ("beginning": VERB 7 / NOUN 11). Wired a reduced-clause reader
into the sentence loop: the LAST comma + vocabulary-present-participle tail
of a sentence is emitted as its own arrangement, subject inherited from the
noun phrase before the comma, address = the participial phrase's own byte
span (P5.2 — reconstructing the phrase WITHOUT the comma fails byte-verification;
found live). Recovers AIW ch1-12 to 100% recoverability (the stale ch5-12
ledgers from the old boundaries were regenerated).

| | GFP coverage | recall |
|---|---|---|
| ch1 | 76.6 → 76.6 | 35.9 → 36.3 |
| ch2 | 65.0 → 65.7 | 31.0 → 31.8 |
| ch3 | 44.4 → **49.4** | 19.5 → 21.0 |
| ch4 | 60.3 → **63.4** | 18.3 → 19.8 |
| Σ weighted | 61.7% → **63.9%** | — |

Null floor stable (184 → 189 in word-shuffled noise; the pass adds ~5 in
noise, negligible). Precision roughly flat (tiny dip on ch1/ch2 from more
emissions, +0.9/+0.5 on ch3/ch4).
