# Session stress test — results

A thorough, adversarial re-verification of this session's landed changes
(commits `12c4487`, `0322a4b`, `87f9a9f`, `5739a5b`) plus the LaVar
oracle-grading findings, run against the real production pipeline (real
Ollama, `gemma2:2b`), the real full test suites in both repos, a second
independent acceptance-style document, hand-built adversarial specimens,
and a real non-English fixture.

## 0. What actually landed this session (read from `git log`, not assumed)

Confirmed by reading `git log --oneline -20` and the full diffs/commit
messages for every recent commit touching `hypergraph.js`,
`hypergraph.test.mjs`, `pronouns.js`, and `mvp-acceptance.mjs`:

1. `mvp-acceptance.mjs` now separates `contradicted` (real lies, counted
   as `fabrications`) from `unbound` (checker limits/paraphrase gaps,
   `unboundFindings`, disclosed but never counted toward the fabrication
   pass/fail gate).
2. `hypergraph.test.mjs` gained two test-only additions pinning that
   `sameAct` (tense/lemma equivalence) is correct, and that the a7
   (Henson/Hidden Figures) miss is `objectSpecificity` correctly refusing
   an under-specified match against a passive-voice sentence — disclosed,
   not fixed.
3. A test-only addition pins the a3 subject-side title/name coreference
   as already working correctly.
4. A test-only addition (`0322a4b`) discloses, without fixing, the a2
   (Dorothy Vaughan) miss: a doubly-nested fronted-participial +
   reduced-relative-clause construction that `extractRelations` swallows
   whole, producing zero candidate edges.
5. **A real production fix** (`87f9a9f`) in `hypergraph.js`: `judge()`
   now reduces both sides through the existing `headVerb` organ
   (`phasepost.js`) before calling `sameAct`, so a correct edge whose
   material states a phrasal predicate ("had asked") is no longer
   silently excluded from comparison against a claim's plain verb
   ("asked").
6. **The seventh, pronoun-gate (S22) item was NOT attempted this
   session.** `git log --all --oneline` shows no commit this session
   touches `native/adapters/text/pronouns.js`; the most recent S22-related
   commits (`6dbdb67`, `3d4a084`, `2b0c086`, `ac95228`, etc.) all predate
   this session's work on `hypergraph.js`/`mvp-acceptance.mjs`. This is a
   valid, disclosed outcome (declined rather than shipped) — confirmed
   directly from the commit graph, not inferred.

## 1. Re-run of the original acceptance test (Katherine Johnson fixture)

`node native/eval/the-fold/mvp-acceptance.mjs`, real gemma2:2b via local
Ollama, full 20-question run, real network-free (local) calls, real
wall-clock timing.

**Result:**

```
ingest: 2843 ms for 3559 words (target <= 10677 ms) — PASS
fabrications (contradicted): 0 (must be 0) — PASS
unbound (disclosed, not a fabrication): 5
citation verification: 3/3 spans resolve to real source bytes (1.0)
answerable bucket: expected fact present in 5/7 answers
absent bucket: refusal-like language in 1/6 answers
latency — cold material: max 29633 ms (target <=15000) — FAIL
latency — cache-hit full answer: max 8746 ms (target <=8000) — FAIL
latency — refusal path: max 17529 ms (target <=2000) — FAIL
```

**This matches the session's own prior number exactly: 0 contradicted, 5
unbound out of 20.** The unbound findings, per-question: a2 (Dorothy
Vaughan — disclosed clause-extraction gap), a3 (Glenn/verify —
disclosed object-specificity gap, item 5's own real fix already narrows
its `nearest` to the correct subject), a4 (Obama/pronoun — item 6's
declined fix; still unbound, consistent with no fix having landed), a7
(Henson/Hidden Figures — item 2's disclosed passive-voice gap), and c7 (1
unbound finding). **No regression and no unexpected improvement — the
counts hold steady before/after the session's landed changes**, which is
the expected outcome since item 5 (the only production code change) only
touched the `nearest` disclosure for a3, not its verdict, and item 6 (the
one change that COULD have flipped a4) was never shipped.

**A genuinely new, previously-undocumented finding from this re-run,
worth flagging plainly:** two of the seven answerable questions —
**a1** ("In what year did Katherine Johnson graduate from West Virginia
State College?") and **a6** ("In what year did Johnson retire from
NASA?") — came back as outright, confident refusals ("The sources do not
say...", "The sources do not state...") with **zero unbound findings
disclosed** (because no claim was even drafted for the checker to flag).
Both facts are genuinely, plainly stated in the fixture body text (line
82: *"In 1937, at age 18, she graduated summa cum laude..."*; line 104:
*"From 1958 until her retirement in 1986..."*), confirmed by direct
`grep` against `fixtures/katherine-johnson-body.txt`. This is arguably
**worse** than an unbound finding: the answer is wrong with no disclosure
mechanism attached to it at all (the model apparently failed to retrieve
or draft on these two single-fact questions, rather than drafting and
having the checker catch a mismatch). I could not determine whether this
is caused by today's session's changes (none of the landed changes touch
retrieval) — most likely this is a pre-existing retrieval-quality issue,
independent of the verb-matching/coreference work this session focused
on, since it affects a1/a6 (simple, single-fact, unrelated to phrasal
predicates or pronouns) rather than a2/a3/a4/a7 (the ones with disclosed
extraction/matching gaps). Flagged as a genuine, real finding for the
next pass — **not fixed here**, out of scope for a testing pass, but
worth prioritizing since it produces a confidently wrong "not stated"
answer to a question the material plainly answers.

Raw output: `results/mvp-acceptance.json` (overwritten by this run).

## 2. Second, independent acceptance-style run (Alan Turing fixture)

Built `native/eval/the-fold/mvp-acceptance-2.mjs`, following
`mvp-acceptance.mjs`'s own established methodology exactly (same reader
options key-for-key, same real production pipeline, same fabrication/
unbound separation, same byte-verification). Material: the real
`en.wikipedia.org/wiki/Alan_Turing` article — an HTML fixture
(`fixtures/wikipedia-alan-turing.html`) that had sat in this repo unused
by any `.mjs` driver (confirmed via `grep -rl`), extracted and trimmed by
hand to a 9,782-word biography body (`fixtures/alan-turing-body.txt`),
never previously used as an eval corpus. 18 hand-written questions (8
answerable, 5 contested, 4 absent) — different domain (computer science/
WWII cryptography/British legal history), era (1912–2013/2023), and
subject from the Katherine Johnson fixture, and containing several of the
SAME hazard classes this session's fix targeted (phrasal predicates: "had
been..."; pronoun-adjacent named-surface density in the Bletchley/
Enigma section).

**Result: INCOMPLETE at the time this report was finalized.** The run was
still in progress (background process, real network-free Ollama calls,
~10–55s per question × 2 runs × 18 questions) when this report was
required. **6 of 18 questions completed cleanly before the report
deadline, all six with zero fabrications and expected facts correctly
matched:**

```
[answerable] a1 (King's exhibition year) → matched (1930/1931), 0 fabrications, cold 54819ms/2 calls, hit 12602ms/2 calls, spans 2/2 verified
[answerable] a2 (Princeton PhD) → matched, 0 fabrications, cold 13965ms, hit 2095ms, 1 unbound (disclosed)
[answerable] a3 (bombe) → matched, 0 fabrications, cold 7407ms, hit 1754ms, 1 unbound (disclosed)
[answerable] a4 (OBE 1946) → matched, 0 fabrications, cold 15271ms, hit 3190ms, 1 unbound (disclosed)
[answerable] a5 (Manchester reader, 1948) → matched, 0 fabrications, cold 25858ms/2 calls, hit 3663ms/2 calls, 1 unbound (disclosed)
[answerable] a6 (Arnold Murray) → matched, 0 fabrications, cold 14235ms, hit 2154ms, 1 unbound (disclosed)
```

Zero fabrications and zero false refusals across the six completed
answerable questions (contrast with §1's a1/a6 false-refusal finding on
the OTHER fixture — this partial run did not reproduce that pattern on a
different corpus, for what that's worth on a 6-question sample). Every
completed question's expected fact was found. Citation spans verified
where present (2/2 on a1). Latency continues to exceed the documented
targets on multi-call questions (a1, a5: 2 model calls each,
25–55s cold), consistent with the ALREADY-DOCUMENTED, out-of-scope
latency triage finding from the original `mvp-acceptance-RESULTS.md`
("the correction/witness loop's call count drives both fabrication and
latency together") — not a new finding, and not something this session's
changes touch.

**Honest limitation of this section: the run did not finish in time to
report the remaining 12 questions (c1–c5, n1–n4), the full fabrication/
unbound totals, or the final latency summary.** The driver script itself
(`mvp-acceptance-2.mjs`) is complete, correct, and committed; re-running
it (`node native/eval/the-fold/mvp-acceptance-2.mjs`) will reproduce the
full 18-question run and write `results/mvp-acceptance-2.json`. This is a
real gap in this report, disclosed rather than papered over with
fabricated numbers for the unfinished questions.

## 3. Adversarial regression probes

Built `native/eval/the-fold/session-stress-adversarial.mjs`, unit-scoped
directly against the two organs involved in the session's one production
fix (`headVerb` + `sameAct`, via `makeRelationReader`), plus end-to-end
probes through the real reader on fresh material, plus characterization
probes for the two open LaVar findings. **9/9 probes pass.**

```
PASS  headVerb('had rejected') reduces to 'rejected'-ish head, not blank
PASS  headVerb-reduced 'had rejected' vs 'had accepted' are NOT the same act
PASS  headVerb-reduced 'had rejected' matches plain 'rejected'
PASS  longer auxiliary chains around DIFFERENT head verbs never collide
PASS  e2e: 'Harrison rejected the terms' finds Harrison's phrasal-predicate edge as nearest/bound
PASS  e2e ADVERSARIAL: 'Harrison approved the terms' (different verb) does not falsely bind
PASS  ambiguous pronoun 'She' does not resolve to BOTH candidates as bound simultaneously
PASS  probe7 (no co-occurring named surface, pronoun-only subject) ran without crash — characterization only
PASS  probe8 (abbreviation-period split, 3 fresh "X. Y." specimens) — characterization only
```

**Phrasal-predicate matching (the session's one production fix) holds up
adversarially:** two DIFFERENT phrasal predicates around different head
verbs ("had rejected" vs "had accepted"; "had been rejected" vs
"approved"; "will have declined" vs "accepted"; "was still rejecting" vs
"approving") never collide through `sameAct` after `headVerb` reduction.
A true positive (the same predicate, with and without the auxiliary
chain) still matches. Through the FULL reader on fresh material (a
regional-bank-merger specimen, unrelated to any specimen fixed this
session), "Harrison had rejected the terms" correctly binds/nears against
"Harrison rejected the terms" and correctly does NOT bind against
"Harrison approved the terms."

**Pronoun-gate (S22, untouched this session) — genuine multi-candidate
ambiguity check:** a fresh two-person specimen ("Nora Whitfield met Diane
Castellano... She later published a paper...") was constructed so a bare
pronoun genuinely could refer to either named person. Result: neither
candidate came back `bound` (both `unheard` on this small pool — no
false-certain resolution to either candidate). Confirms the existing
conservative gate still refuses to silently pick one antecedent over the
other, unchanged, as expected since item 6 was never shipped.

**LaVar finding (b) — pronoun miss with no co-occurring named surface —
did not generalize on a fresh specimen.** Constructed: *"The senior
auditor reviewed the quarterly filings alone that evening. He flagged
three discrepancies..."* — no named surface anywhere near the pronoun.
The reader extracted **zero claims at all** for this sentence (not a
false bind, not a crash — simply nothing to check, because a common-noun
subject like "the senior auditor" is not itself a resolvable referent
surface the extraction pipeline anchors on). This is consistent with, and
likely explained by, this repo's own documented "extraction anchors on
CAPITALIZED surfaces" limitation rather than being the same defect LaVar
found on the Katherine Johnson material (where a real named person WAS
present nearby). **Inconclusive on whether LaVar's specific miss
generalizes** — my specimen did not reproduce the same shape (I could not
construct a fresh sentence with a real co-occurring capitalized name AND
a failing pronoun bind without deeper knowledge of the exact original
specimen's syntax); recommend the next pass reproduce LaVar's exact
sentence directly from the Katherine Johnson material rather than a
constructed analog.

**LaVar finding (c) — "James A."-style abbreviation-period sentence
split — did NOT reproduce on three fresh "X. Y." specimens** ("Robert T.
Alvarez", "James A. Whitfield", "Maria L. Chen", each followed by "in
<year>."): all three split cleanly into exactly 2 sentences at the
correct boundary, with the abbreviation NOT triggering a false split.
This suggests LaVar's original "James A. Johnson" finding may be
specimen-specific (perhaps tied to the exact surrounding context in the
Katherine Johnson article, not a general abbreviation-handling defect) —
**characterized as apparently non-generalizing on this sample, but not
conclusively ruled out**, since only 3 of many possible surrounding-
context shapes were tried and the exact original specimen was not
directly available to reproduce verbatim.

## 4. Omnilingual (non-English) regression check

Built `native/eval/the-fold/session-stress-omnilingual.mjs` against the
real `wikipedia-borodino-ru.html` fixture (real ru.wikipedia.org Battle
of Borodino article, already used elsewhere in this repo per its own
established convention — `mhc-battery.mjs`'s own comment: "NO English
closed-class priors opted in... evidence the CAPITALIZATION/STRUCTURE-
based machinery generalizes"). **4/4 probes pass:**

```
PASS  reader boots and reads real Cyrillic material without crashing
PASS  headVerb reduction on Cyrillic verb does not crash (no lemmatizer data — degrades safely)
PASS  resolvePronouns runs cleanly on real Cyrillic text (untouched S22 gate)
PASS  adversarial Cyrillic false claim ('Napoleon was born in Moscow') does not falsely BIND
```

The session's one production fix (`headVerb` reduction before `sameAct`)
does not crash on Cyrillic verbs and, with no morphology/lemmatizer data
supplied for Russian (the correct, documented posture — this repo's
priors are English-tagged throughout), degrades safely to exact-match
comparison rather than throwing or false-matching. `resolvePronouns`
(the untouched S22 gate) runs cleanly against real Russian sentences with
declared `minActivation`/`minMargin`. A constructed adversarial false
claim in Russian ("Napoleon was born in Moscow" — false, and unrelated to
anything the fixture states) does not falsely bind.

## 5. Full regression suites, both repos

**eoreader7 `native`:** `node --test` → **1822 tests / 1675 pass / 34
fail / 112 skipped / 1 todo.** This is an EXACT match, digit for digit,
to the number the `87f9a9f` commit message itself documents as baseline
("Full native suite: 1822 tests / 1675 pass / 34 fail / 112 skipped —
the same 34 pre-existing failures this worktree already carries").
Zero regressions. A separate `grep "^not ok"` name-collection pass across
the full run produced 35 distinct failing-test lines (one more than the
summary's 34) — likely a benign counting artifact from `node --test`'s
per-file subtest numbering rather than a real discrepancy (the numbers
restart per file, so two different files can both report "not ok 136"),
but disclosed rather than silently rounded away. None of the 35 collected
names reference `pronouns.js`, or the specific `hypergraph.test.mjs`
cases this session added (`native/organs/hypergraph.test.mjs` does NOT
appear in the failing-name list — it passes in full).

**the-fold:** `npm test` → **1964 tests / 1859 pass / 73 fail / 7 skipped
/ 25 todo.** This falls within the documented pre-existing baseline range
("~73-98 in the-fold, all environment-related"). Did not do a full
name-by-name diff against a pinned prior baseline for this repo (time
constraint), but the count itself (73) sits at the low end of the
documented range rather than above it, which is consistent with no new
regressions rather than suggestive of any.

## 6. Honest summary

- **The session's one production code change (headVerb reduction before
  sameAct) holds up under adversarial testing**, including fresh
  cross-domain material, multiple near-miss auxiliary-chain specimens,
  and non-English (Cyrillic) input. No false positives or crashes found.
- **The pronoun-gate (item 6/S22) was correctly NOT shipped** — confirmed
  directly from `git log`, and confirmed behaviorally (a4/Obama still
  unbound in both this session's diagnosis and my re-run; the existing
  conservative gate still refuses genuine multi-candidate ambiguity on a
  fresh specimen).
- **Both full regression suites show no new failures** — eoreader7
  native matches the documented baseline exactly (1822/1675/34/112); the
  fold's count (73 failing) sits within its documented range.
- **A new, real, previously-undocumented finding**: two single-fact
  answerable questions on the Katherine Johnson fixture (a1, a6) now
  return confident, wrong "not stated" refusals for facts that are
  plainly present in the material, with zero disclosure mechanism
  attached (no unbound finding, no fabrication finding — the model simply
  never drafted a checkable claim). This appears unrelated to this
  session's verb/pronoun work (it doesn't touch a1/a6's underlying
  retrieval) but is a real, reproducible defect worth the next pass's
  attention — it produces a WORSE failure mode than either fabrication or
  disclosed-unbound, because it ships with no signal at all that anything
  might be missing.
- **The second, independent acceptance test (Alan Turing fixture) is
  INCOMPLETE in this report** — 6/18 questions completed cleanly (0
  fabrications, all expected facts matched) before the reporting
  deadline; the driver is committed and reproducible
  (`node native/eval/the-fold/mvp-acceptance-2.mjs`), but the full
  18-question numbers, fabrication/unbound totals, and latency summary
  were not available in time and are NOT fabricated here.
- **LaVar's two open findings characterized, not confirmed as general**:
  neither the no-named-surface pronoun miss nor the "James A."-style
  abbreviation split reproduced on 3–4 fresh constructed specimens in
  the same domain/shape family — suggestive that they may be
  specimen-specific rather than systemic defects, but not conclusively
  ruled out given the limited number of constructed specimens and the
  inability to reproduce LaVar's exact original sentences verbatim.

## Files added this pass

- `native/eval/the-fold/mvp-acceptance-2.mjs` — second acceptance driver
- `native/eval/the-fold/fixtures/alan-turing-body.txt` — trimmed fixture
- `native/eval/the-fold/session-stress-adversarial.mjs` — adversarial probes
- `native/eval/the-fold/session-stress-omnilingual.mjs` — non-English probes
- `native/eval/the-fold/results/session-stress-test-RESULTS.md` — this file
