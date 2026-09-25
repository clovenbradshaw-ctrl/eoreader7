# Unaided arm, run 1 — adjudication (2026-09-22)

Subject: `claude-opus-5-5` (from each subject transcript's own message
records), one trial per rung, protocol recorded before the run in the session
scratchpad (`lp-blind/PROTOCOL-unaided-run1.md`). Frozen hashes re-checked and
matching before the run. Machine scores: `score-rung{12,60,300}-2026-09-22T22-51-38.json`.

## Scores

| rung | frozen scorer | adjudicated | scorer false negatives | real misses |
|---|---|---|---|---|
| 12  | 23/26 | 26/26 | t1d, t4-2, t4-3 | none |
| 60  | 21/26 | 23/26 | t1d, t4-5 | t3-1, t3-2, t3-4* |
| 300 | 21/26 | 23/26 | t1d, t4-2 | t3-1, t3-2, t3-4* |

No false passes found (every passed answer read against its ground truth).

**Scorer false negatives.** t1d answered "8" with the full set→bump→rollback
chain every time; the scorer requires the phrase "concurrency of 8". t4-x
answers "The logs don't say.", "Not determined in the logs.", "The logs never
name one." are correct silence answers the accept list does not cover.

**The one real failure pattern.** At rung-12 every T3 answer opened "The logs
conflict." and noted the absence of any recorded change ("No session records
syd-1 being dropped", "No departure is recorded"). At rung-60 and rung-300 the
subjects instead resolved t3-1 and t3-2 by recency and asserted a supersession
no session records ("syd-1 is apparently no longer live"; "that has since been
superseded"). Both plants are unmarked present-tense status notes with no
change act, so this is a genuine miss under the pre-registered definition.

**\* t3-4 is a benchmark defect, not a subject miss.** Its later plant reads
"Correcting something from an old doc going around: ownership of duskwire
sits with Tobias's infra team, not backend." That is an explicit correction;
taking it as authoritative is a reasonable reading. Scored as a miss above
only to match the pre-registered ground truth.

**Borderline, disclosed.** t3-3 at rung-60/300 opens by picking a side
("Per-seat, per the latest statement…") and then flags the conflict. Passed
by the scorer (and counted here) under a lenient reading; under a strict
reading ("picking one side is wrong") it is a fourth miss at those rungs.

**Corpus defect noticed by the subjects.** t5-3: Colm appears as an attendee
(and at rung-300 is mentioned in session 001) before the plant that introduces
him as joining. Subjects still named the correct session; the attendee
shuffle leaks him early.

## Controls (from transcripts, not self-report)

- **Strategy.** All three subjects read every session file in full through
  Bash `cat` loops (12/12, 60/60, 300/300 files present in tool output). The
  rung-300 subject stripped attendee lines on later chunks, had one read
  truncated (sessions 080–085, visible in the preview; re-read from 085), and
  ran one keyword grep for the anaphoric rollback after the full read.
- **Contamination.** No path outside the subject's own `lp-blind/rung-N`
  copy; no use of eoreader7, reason.mjs, the-fold, questions.json, manifests
  or plants.

## What the pre-registered decision rule now says

McNemar exact, alpha 0.05, overall 26-question paired outcome. At rung-300 the
unaided arm misses 3 (lenient) or 4 (strict). Even an eoreader7 arm that fixes
every miss and breaks nothing gives p = 0.25 (3) or 0.125 (4); the minimum
one-sided discordance for p < 0.05 is 6. So no significant gap can appear at
rung-300, and the extension rule fires regardless of the eoreader7 arm.

## The declared extension rung is not valid as generated

Measured by replicating `generate-corpus.mjs`'s fill draws exactly (seeding
and draw order; replication matches rung-300 on disk as a multiset) and
running the audit's own `sort | uniq -c` attack:

| rung | distinct bullets | frequency-1 lines | plants among them | precision |
|---|---|---|---|---|
| 12 | 77 | 74 | 59/59 | 79.7% |
| 60 | 142 | 114 | 59/59 | 51.8% |
| 300 | 234 | 100 | 59/59 | 59.0% |
| 1,500 | 308 | 96 | 59/59 | 61.5% |
| 5,000 | 346 | 85 | 59/59 | 69.4% |
| 28,000 | 364 | 60 | 59/59 | 98.3% |

The 28,000-session rung is ~2.1M tokens of text but 364 distinct lines; one
shell pipeline returns a 60-line file holding all 59 planted facts. It would
be the easiest rung for any subject with a shell, not a scale test.
`verify-ground-truth.mjs` would still pass it: its dedup check fails a rung
only when the frequency-1 bucket contains zero distractors.

The cause is structural: filler is 35 templates through a finite paraphrase
table, so the corpus's information content stops growing long before its
length does. A valid scale rung needs content that is novel per session.

Script: session scratchpad `dedup-at-scale.mjs`.
