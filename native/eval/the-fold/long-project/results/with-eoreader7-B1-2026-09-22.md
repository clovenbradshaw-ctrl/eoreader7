# With-eoreader7 arm — configurations B0, B1, B2 (2026-09-22)

The question (Amendment 2): when Opus 5.5 answers one question in one call,
seeing only what eoreader7's doorway selects, does it lose anything it gets by
reading the whole corpus? Decision rule: WORSE if ≥5 of 207 stable-question
trials fail (unaided: 0/207) or ≤3 of 27 conflict-question trials pass
(unaided: 9/27). Scorer v2 (Amendment 1).

## The measured null (unaided, 3 runs × 3 rungs)

23 questions pass in all 9 trials. t3-1, t3-2, t3-4 pass together in exactly
one run per rung (12: run 1; 60: run 3; 300: run 2) — Opus settles an
unmarked conflict by recency about two times in three at every size, so run
1's "fails only at scale" was chance. Per-run totals 72/78, 72/78, 72/78.

## B0 — the engine as shipped: decided by its selector, not run

`POST /v1/context` (worktree `eoreader7-context-doorway`, branch
`context-doorway`, uncommitted): the turn's own ethos → admission → surf,
stopped before any mouth. Planted-sentence coverage (every needed planted
sentence present in the feed text; T4 excluded):

| rung | B0 | B1 | B2 |
|---|---|---|---|
| 12 | 16/21 | 16/21 | 16/21 |
| 60 | 10/21 | 21/21 | 21/21 |
| 300 | 4/21 | 16/21 | 17/21 |

B0's causes: the 200-file admission cap (sessions 201–300 never admitted),
the 12-segment count, and ties kept in file order (earliest first). At rung-12
the feed is not the whole corpus either: whole-file windows start mid-file
and cut a second fact in the same session (t3-2's "three-person team").

## B1 — whole-workspace admission, score tie-break, 24K-character budget

Feed median 8.4K / 21.1K / 23.8K characters (bounded; whole rung-300 corpus
~84K). 234 subjects, all `claude-opus-5-5`, each exactly one Read of its own
prompt file (checked from every transcript).

| rung | run 1 | run 2 | run 3 | unaided runs |
|---|---|---|---|---|
| 12 | 24 | 24 | 24 | 26, 23, 23 |
| 60 | 23 | 24 | 23 | 23, 23, 26 |
| 300 | 21 | 21 | 19 | 23, 26, 23 |

**Verdict: WORSE.** Stable-question failures 15/207 against 0/207 (one-sided
Fisher p < 0.0001). Conflict questions 11/27 against 9/27 (not worse).
Read one by one: t1e, t2-1, t5-3 at rung-300 fail all three runs, each
missing a planted fact from its feed; t1a rung-60 run 3 answered 1500 ms
because the rollback says "yesterday's change" and the subject could not see
that session 032 holds no duskwire change — a partial feed cannot show an
absence. Five are scorer false negatives on reading: t1d rung-60 run 1 ("It is
currently set to 8"), t4-1 rung-300 run 3 and t4-4 ×3 (correct refusals that
name a candidate — "99.9%", "Head of Growth" — only to reject it; a forbidden
pattern fires on the mention). Adjudicated: 10 real failures, still past 5.
t1a and t2-3 also lacked a planted fact at rung-300 and passed (t1a's
original value equals its post-rollback value; t2-3's remaining facts
suffice).

## B2 — rank by the surfer's own score (development evidence only)

`surfTask`'s rank-4 branch is unreachable (`content_match.ambiguous` is never
set false), so the live order ranks documents whose several lines tie above
documents with one clear match. B2 ranks by score: 17/21 at rung-300, trading
t1a/t1e/t2-1/t5-3 back in for t2-2/t2-4/t3-2 out — budget pressure, not a
fix. Not run on the model. Found on this benchmark, so it is development
evidence; a confirmatory claim needs a held-out corpus.

## What remains, named

1. Multi-hop: a second hop that shares no word with the question is never
   surfaced (t2-1's "fra-2 is Frankfurt"). House rule: hops bounded by a
   validated null, not a hand count.
2. Budget grain: at rung-300 each segment is a whole session file (~390
   chars incl. attendees) for one relevant line.
3. Absence: a partial feed cannot show that something is NOT in the record,
   which the unaided arm uses (t1a's "yesterday").
4. Heimdall's reaper SIGTERMs a passive worktree proxy every five minutes
   ("claims proxy.mjs:bare but holds no listening port") although it listens
   on 11447 — recorded in `state/heimdall-memory.json`.
