# PREREGISTRATION — does eoreader7 give a frontier model a capability it did not have?

Written 2026-09-22, before either arm has run. Revised the same day, still
before either arm has run, after two independent audits (validity,
sensitivity) reviewed the first draft — see **Revision history** at the
bottom for exactly what changed and why. This document, `questions.json`,
`lib/plants.mjs`, `lib/distractors.mjs`, `lib/paraphrase.mjs`,
`generate-corpus.mjs` and `score.mjs` are frozen at the content hashes
listed at the bottom, as of this revision. **No task parameter — a
question, an acceptance rule, a rung size, the comparison statistic, or the
corpus itself — will be changed after seeing either arm's results.** If a bug
is later found in the corpus or scorer, the fix and the reason for it will be
recorded in this file with a new hash and a note, never silently.

## The question this tests

The user's goal, verbatim: *"get us to be able to do something that Opus 5.5
couldn't do without eoreader7."* eoreader7 is a reading/reasoning engine — a
durable append-only assertion ledger, relation extraction, referent identity,
supersession/concession, contradiction detection, provenance to exact byte
addresses. The question is whether it gives a **frontier model** a genuine
**capability** gain, not a cost saving — this repo already has a
token/cost/recall comparison for a *local* model
(`native/eval/the-fold/frontier-token-recall.mjs`); nothing here has run the
frontier-vs-frontier-plus-eoreader7 comparison, and its own raw-frontier arm
has never actually run.

This test is built to come out **either way**. A result of "Opus 5.5 alone
does fine" is a real, reportable outcome — rigging the test toward eoreader7,
or making it trivially hard for the unaided arm, would make the whole
exercise worthless. See **"What the built rungs actually test"** below for a
second, related honesty requirement the sensitivity audit raised: at the
sizes this corpus is actually built at, a measured gap is evidence about a
*specific* capability, not "eoreader7 helps in general" — the two are not the
same claim, and this document no longer conflates them.

## The two arms (built later, not by this document)

- **UNAIDED** — a fresh Opus 5.5 Claude Code agent given the corpus as files
  on disk and normal tools (Read, Grep, Bash, writing its own scripts — all
  fair). Realistic Claude Code usage, not a blindfolded model.
- **WITH EOREADER7** — the same agent, the same corpus, the same questions,
  plus a context block eoreader7 assembled from having read the corpus.

Both arms get the **identical** 26 questions (`questions.json`) and the
**identical** corpus files for a given rung. Each arm's answers are collected
as one JSON file, `{ "<questionId>": "free-text answer", ... }`, for all 26
ids, then graded with:

```
node score.mjs --rung <12|60|300> --answers-a unaided.json --label-a unaided \
                                   --answers-b eoreader7.json --label-b with_eoreader7
```

**Strategy control (added, sensitivity audit).** At the sizes actually built
(see below), the corpus fits comfortably in a frontier context window, so the
UNAIDED arm's most likely strategy is not grep-hopping at all — it is reading
every `session-*.md` file into context in one or two `Read` calls and
answering directly from there. Whoever runs the UNAIDED arm **must** record
and report, per rung, which strategy it actually used (full-read vs.
grep-hop vs. a mix — inferred from its own transcript: the fraction of
session files it `Read` vs. the `Grep`/`Bash` calls it made before
answering), because the two cases license completely different readings of
any observed gap: a full-read unaided arm that still loses to
with-eoreader7 would be losing on *reading quality*, not on retrieval; a
grep-hopping unaided arm losing would conflate the two. This is a required
part of the write-up, not an optional detail.

## The corpus — "the Long Project"

An invented software project: company **Rendalyn**, codename **Quillfen**,
product **Quillfen Relay**, vendor **Solenne Cloud**, services **duskwire,
harrow, pallet, cinder, loom**, eight invented people, invented config keys
and region codes. Nothing in it is real; nothing a model could recall from
training. Written as `session-NNN.md` files, each reading like a real
working-session summary (Decided / Changed / Found / Discussed / Deferred),
mostly routine distractor content with planted fact-chains spread evenly
across the whole span. See `lib/people.mjs` (the invented world), `lib/
plants.mjs` (the 59 hand-written planted paragraphs, in narrative order —
never model-generated, so ground truth is guaranteed and the paraphrase
variety is disclosed in the file itself), `lib/distractors.mjs` (35
hand-written routine paragraphs carrying no ground-truth fact) and `lib/
paraphrase.mjs` (added this revision — a small hand-written substitution
table, mechanical code not a model, that reworks each distractor paragraph
differently at every insertion; see "the dedup exploit" under **Revision
history**).

### Size ladder

Identical planted chains and identical 26 questions at every rung; only the
number of interleaved distractor sessions changes (`generate-corpus.mjs`:
event index `i` of `K` plants lands on session `1 + floor(i*N/K)` — even
spacing, order-preserving, so a chain's events stay spread across the whole
span at any `N`). Seed: **20260922**. Measured (`corpus/rung-*/stats.json`):

| rung | sessions | words | characters | estimated tokens* |
|---|---|---|---|---|
| 12  | 12  | 1,928  | 11,581  | ~2,571  |
| 60  | 60  | 4,533  | 28,373  | ~6,044  |
| 300 | 300 | 16,687 | 105,323 | ~22,249 |

\* `words / 0.75` — a heuristic, not a real tokenizer count for either
model's own BPE vocabulary; reported for scale, not treated as exact. (Word
and character counts moved slightly from the first draft because the
distractor-rewording fix below changes exactly which distractor text lands
in each fill slot — the plant text, question set and rung sizes did not
change.)

### What the built rungs actually test (added, sensitivity audit)

Rung-300 measures ~22K estimated tokens. That is well inside a frontier
model's context window — it cannot, by itself, test whether eoreader7 helps a
model cope with *more material than it can hold at once*. A gap measured at
rungs 12/60/300, if one appears, is evidence about **judgment quality under a
full reading** — does the model flag an unresolved contradiction instead of
picking a side (T3), does it admit silence instead of fabricating under
pressure to give a definitive answer (T4), does it correctly track a value
through an anaphoric, keyword-free revision it has already read (T1) — not
evidence that eoreader7 helps a model retrieve facts it could not otherwise
reach. Those are two different, both-legitimate capability claims. This
document commits to reporting whichever one the data actually supports, and
not presenting a judgment-quality gap as if it were a scale-defeat result.

### Extension rule (declared in advance, resized this revision)

A larger rung is declared but **not generated** — it is only worth the cost
if rung-300 shows no gap between arms, and, separately, it is the rung sized
to actually test scale-defeat rather than judgment quality (see above). The
first draft declared 1,500 sessions (~108K estimated tokens); the sensitivity
audit is correct that this sits *inside* even a smaller frontier context
window and would not have exercised scale-defeat at all. Resized against a
stated figure: frontier Claude context windows in current use run from
roughly 200K tokens up to 1,000,000 tokens in extended-context
configurations. At rung-300's measured rate (~22,249 tokens / 300 sessions ≈
74 tokens/session), **28,000 sessions is ~2.1M estimated tokens** —
comfortably past a 1,000,000-token window with headroom, so if this rung is
ever built it tests the thing rungs 12/60/300 structurally cannot.
**If no statistically significant gap appears at rung-300 (McNemar's exact
test, alpha 0.05, on the OVERALL 26-question paired outcome, for the intended
subject models), the test extends to the 28,000-session rung before
concluding eoreader7 gives no capability gain.** This rule is fixed now,
before any result is seen, specifically so "we didn't find a gap" cannot be
quietly reinterpreted as "there is no gap" without first checking whether the
gap only shows up at real long-context scale.

## The six planted-fact types

- **T1 Revised value** — a value set, changed, then reverted or changed
  again; the correct answer is the CURRENT value. At least one revision in
  each affected chain is stated anaphorically, without the config key's own
  name or the number ("rolled back yesterday's change... back to where it
  stood before" — service name kept for narrative coherence, same as every
  other T1 chain, but never the specific tunable's name or either number).
- **T2 Multi-hop join** — three facts in three different sessions, no single
  shared keyword linking all three, that must be composed to answer.
- **T3 Unresolved contradiction** — two sessions state conflicting facts
  about the same thing and nothing later resolves it. The correct answer
  names BOTH sides and says they conflict; picking one side is wrong.
- **T4 Silence** — a plausible question the record never answers. The correct
  answer says the record does not say; stating any specific value is a
  fabrication and is scored wrong.
- **T5 Provenance under distractor-name noise** (reframed this revision —
  see below) — "which session first established X?", referenced again later
  without being restated; the correct answer names the FIRST session, not
  any session that mentions it.
- **T6 Paraphrased restatement** — one fact restated 2-3 more times in
  different hand-written words, always consistent, never revised; the
  question is a trap for a double-count or a false "it changed."

**T5's reframing (sensitivity audit).** Session files are named
`session-NNN.md` in strict chronological order, so `grep -l KEYWORD
session-*.md | sort | head -1` recovers "first mention" for free from the
filesystem for three of T5's four questions (t5-1, t5-2, t5-4) — this was
never a test of recovering narrative order from long context (the filenames
already carry that order), and this document should not have implied
otherwise. What T5 actually tests, honestly: whether the reader picks the
**correct establishing session** and not a later casual reference to the
same fact — every T5 chain has at least one such decoy reference (t5-1-ref,
t5-2-ref, t5-3-ref, t5-4-ref in `lib/plants.mjs`), planted specifically so
"any session that mentions X" is a wrong answer. t5-3 is the one question in
this set where a same-name decoy (Colm Fassbinder appears as a routine
session attendee well before his actual "joining" plant) makes the filename
shortcut alone insufficient — a reader still has to find the right sense of
"joined," not just the first name-occurrence.

## The 26 questions

Full text, ground truth and machine-checkable acceptance rules live in
`questions.json` (frozen at the hash below; every id, question and
groundTruth is unchanged from the first draft — only `accept.requiredGroups`
and `accept.forbiddenAny` gained new patterns, see **Scoring rules**). Three
plant paragraphs were reworded this revision (`lib/plants.mjs`: t1a-3,
t2-3b, t2-4b — see **Revision history**); no chain's answer or id changed.
Summary:

| id | type | question |
|---|---|---|
| t1a | T1 | What is duskwire's retry window currently set to? |
| t1b | T1 | What is harrow's session TTL currently set to? |
| t1c | T1 | How many decimal places does pallet's ledger currently store currency at? |
| t1d | T1 | What is cinder's worker pool concurrency currently set to? |
| t1e | T1 | What is loom's batch flush interval currently set to? |
| t2-1 | T2 | Which city hosts the primary worker pool of the service Colm Fassbinder's security pass flagged? |
| t2-2 | T2 | Which legacy datastore is used by the service that owns the proration step Esti Vandermolen filed a bug against? |
| t2-3 | T2 | Which pod does the person whose complaint led to harrow's session lifetime being lengthened manage? |
| t2-4 | T2 | Which service is deployed by hand rather than through CI, and was also the subject of Baz Okonkwo-Reyes's duplicate-row audit? |
| t3-1 | T3 | How many Solenne Cloud regions does Quillfen Relay run in, and which ones? |
| t3-2 | T3 | How many people are on Esti Vandermolen's QA team? |
| t3-3 | T3 | Does Quillfen Relay bill customers per-event or per-seat? |
| t3-4 | T3 | Which pod owns duskwire? |
| t4-1 | T4 | What uptime percentage does Quillfen Relay's SLA promise customers? |
| t4-2 | T4 | Who is Quillfen Relay's single largest customer by revenue? |
| t4-3 | T4 | What programming language is duskwire written in? |
| t4-4 | T4 | What is Marguerite Sohl's job title? |
| t4-5 | T4 | What was the root cause of incident QF-1042? |
| t5-1 | T5 | In which session was the project first named "Quillfen"? |
| t5-2 | T5 | In which session was Solenne Cloud first chosen as the hosting vendor? |
| t5-3 | T5 | In which session did Colm Fassbinder first join the project? |
| t5-4 | T5 | In which session was the decision made to build cinder as its own worker queue rather than route jobs through duskwire? |
| t6-1 | T6 | What is the free-tier monthly event cap, and has it ever changed? |
| t6-2 | T6 | How often does on-call hand off, and on what day? Has the cadence changed? |
| t6-3 | T6 | When does staging refresh from production, and has that schedule changed? |
| t6-4 | T6 | What is the P1 response-time commitment, and has it changed? |

## Scoring rules

Mechanical only, `score.mjs` — this project's own standing posture (see
`native/eval/the-fold/frontier-token-recall.mjs`'s header: "recall is
mechanical — normalized atom substrings, never a model judge"). No model
grades any answer here. Per question, normalized substring OR bounded regex
matching (an alternative is used as a case-insensitive regex when it
contains a regex metacharacter, else as a normalized substring — the same
rule now applies uniformly to `requiredGroups` and `forbiddenAny`) against
hand-declared required-token groups (AND of OR-groups) and forbidden
patterns; T4/T3/T6/T5 each add a shared, declared marker set (silence
admissions, conflict language, no-change language, or a dynamic session-number
lookup from that rung's own `manifest.json`) — see `score.mjs`'s header for
the exact mechanism.

**Revised this round (validity audit).** The first draft's marker vocabulary
was narrow enough that an independently-written, substantively-correct,
naturally-phrased 26-question answer set scored only 16/26 (61.5%) — every
T4 (silence) question and 3/4 T6 questions were marked wrong purely on
phrasing. Fixed by: (1) stripping apostrophes before normalization, so
contractions match regardless of spelling; (2) broadening
`SILENCE_MARKERS`/`CONFLICT_MARKERS`/`NO_CHANGE_MARKERS` substantially,
including two general regex fallbacks for silence-admission language
(a negator within reach of a saying/finding/recording verb, either order,
bounded to one clause) rather than only an ever-growing literal-phrase list;
(3) adding bounded-gap regex fallbacks to T1's `requiredGroups` (e.g.
`concurrency[^.;,—–:\n]{0,30}\b8\b`) so a natural "concurrency is currently
set to 8" is accepted, not only the rigid "concurrency set to 8"; (4) adding
per-chain `forbiddenAny` patterns to every T1 question that catch the
SUPERSEDED value asserted with a present-tense cue in the same clause (e.g.
"...is currently 4; ...was 3 before" now scores wrong even though "3" also
appears) — this closes a confirmed false positive the validity audit
demonstrated (a wrong current value scored correct because the right value
appeared elsewhere as incidental history); (5) adding two `forbiddenAny`
patterns to t4-2 that catch a hedge-wrapped fabricated company name ("...
though Acme Corp is probably the biggest") by its hedge+superlative shape,
closing the second confirmed false positive the audit demonstrated. Re-run
against a fresh natural-phrasing gold set (`qa-gold/natural-phrasing-
answers.json`) and a fresh deliberately-wrong gold set
(`qa-gold/wrong-answers.json`, including both demonstrated exploit shapes):
**26/26 and 0/26** respectively (`node score.mjs --rung 300 --answers
qa-gold/natural-phrasing-answers.json` and `--answers
qa-gold/wrong-answers.json`). Both gold-set files disclose, in their own
`_independence_caveat` field, that full blind independence was not possible
here — the same session that broadened the markers also wrote the gold sets
afterward, from the corpus's own ground truth in deliberately varied
wording, not from the marker list. See **Known weaknesses** for what this
does and does not mitigate.

**The dedup-frequency fix (sensitivity audit) is in the corpus generator, not
the scorer** — see `lib/paraphrase.mjs`, `generate-corpus.mjs` and
`verify-ground-truth.mjs`'s own new check, described under **The corpus**
and **Revision history**.

## Unaided-arm strategy control

See **The two arms** above — this is a required, not optional, part of
whoever runs the UNAIDED arm's write-up: report, per rung, whether the arm
read the whole corpus, grep-hopped, or mixed, and interpret any accuracy gap
in light of that (added, sensitivity audit).

## The comparison statistic

Paired per-question outcomes (unaided vs. with-eoreader7, same question,
same rung), **McNemar's exact test**, **alpha 0.05**. This alpha is not
chosen for this test; it is this project's own standing convention, cited
from `native/kernel/network-standing.js`'s header ("host/population.js::
LINK_SPEC's own convention — draws 199, alpha 0.05 — the certified
consumer's cut, cited not re-derived") and reused by every caller of that
module (`native/assemblies.js`, `native/eval/network-standing.mjs`,
`native/eval/golden-network.mjs`, `native/eval/hypergraph-cursor.mjs`) rather
than re-picked here. `score.mjs` reports the full accuracy curve per type per
rung for both arms, not only the paired verdict.

## Known weaknesses (disclosed before any run; revised this round)

- **T1's wrong-value check is a bounded heuristic, not exhaustive.** The new
  `forbiddenAny` patterns catch a superseded value asserted with an explicit
  present-tense cue ("currently", "now", "stands at", ...) in the SAME clause
  as the wrong number. An answer that asserts the wrong value as current
  through some OTHER construction the cue list does not cover (no "currently"-
  style word at all, e.g. a bare declarative "cinder's concurrency: 16." with
  no other value mentioned) would already be caught by the ordinary
  required-value check (it never states 8); the residual risk is narrower
  than the first draft's — a wrong value stated as current, using a cue this
  list did not anticipate, WHILE the correct value also appears elsewhere as
  history. Not provably impossible to construct; not observed in either gold
  set.
- **T4-2 (largest customer) still has no way to recognize an UNHEDGED
  fabricated company name** — only a hedge-wrapped one ("probably X", "I'd
  guess X") is caught. A confidently, flatly wrong company name with no hedge
  language at all would still pass on the silence-admission requirement
  alone if the answer also somewhere admits the record is silent — though an
  answer that flatly NAMES a specific company as the answer, with no
  admission of silence anywhere, already fails the required silence-marker
  group. The residual gap is narrower than the first draft's, not closed:
  a spot check of borderline T4-2 passes is still recommended.
- **The broadened marker vocabulary was validated by the SAME session that
  wrote it**, not a genuinely independent third party — both `qa-gold/`
  files disclose this in their own `_independence_caveat`. The validity
  audit's own warning stands: a marker vocabulary that happens to resemble
  eoreader7's context-block phrasing risks the with-eoreader7 arm winning on
  wording overlap rather than genuine reading. Broadening the vocabulary to
  cover ordinary English (rather than this project's own house phrasing)
  reduces this risk — a generic "not mentioned anywhere" is far less likely
  to be a with-eoreader7-only turn of phrase than the original ~25-entry list
  was — but does not eliminate it. A genuinely independent reviewer re-running
  the natural-phrasing validation before either arm's real results are seen
  would close this residually, and is recommended, not performed here.
- **The distractor-rewording fix (`lib/paraphrase.mjs`) is combinatorial, not
  unlimited.** Each matching rule draws independently among 3 hand-written
  alternatives, so a distractor matching k rules can render as up to 3^k
  distinct strings — enough that `verify-ground-truth.mjs`'s dedup-frequency
  check now measures real contamination (59 planted vs. 41 distractor lines
  at frequency 1, rung-300) rather than the original 59-vs-0. It is not
  designed to survive an attacker who normalizes/stems text before counting
  frequency (a smarter dedup than exact-string `uniq -c`) — this project's
  own posture (P92, "read CAPACITIES before writing an organ") is to defend
  the SPECIFIC demonstrated attack, not every attack that could in principle
  exist; a stemmed-text dedup attack was not demonstrated against this corpus
  and is not claimed to be defeated.
- **Per-type McNemar is underpowered.** With ~4-5 questions per type, a
  per-type significance claim at any single rung should be read as
  descriptive, not confirmatory; the pre-registered comparison is the
  OVERALL 26-question paired test per rung. The extension rule exists partly
  because of this: more sessions does not add more questions, so power comes
  only from the overall test, and only the rung ladder (not repeated
  sampling) varies scale.
- **One seed, one corpus draw per rung.** The corpus is deterministic and
  reproducible from seed 20260922, but this is one hand-authored draw, not a
  distribution of corpora — a single run's result is a single data point
  about this corpus, not a sampling distribution over possible corpora.
- **The paraphrase pool for T6's planted facts is small (2-3 hand-written
  variants per fact, not an exhaustive style range)** — disclosed, not
  hidden; see `lib/plants.mjs`.
- **T4's forbidden-pattern lists (`score.mjs`) are best-effort enumerations**
  (a fixed list of language names, title words, SLA-number shapes), not
  exhaustive — a sufficiently unusual fabrication could evade them. The
  companion check, `verify-ground-truth.mjs`, greps the SOURCE corpus (not
  answers) for the same class of surface forms and confirms zero leaks, which
  is the check this project can make exhaustive, since the corpus is closed
  and fully hand-authored.
- **T2-3 and T2-4's "no single shared keyword" property is now hand-verified,
  not mechanically checked.** `verify-ground-truth.mjs` confirms every plant
  paragraph a chain needs is present verbatim; it does not (yet) mechanically
  confirm that no token spans all of a T2 chain's hops — that was checked by
  hand this revision (`grep`, reported under **Revision history**) after the
  sensitivity audit's own manual check found and this document fixed the
  t2-3/t2-4 keyword-sharing gap. A future revision could add this as an
  automated check; it has not been added here.

## Frozen content (sha256, this revision's own build)

```
questions.json         56e2366fc5951146243790650206631de1a3b78066ed438b85a206c69b7a2e45
generate-corpus.mjs    1e687c7d64253e88233dc102c7db0a022b824a93f39d91fe952b0f54691db003
score.mjs              c19b94aa0baabafe383ab4e1f7e345beec373b463e83a58f3801aa865d456359
lib/plants.mjs         f25f03edf4ece76242dcf6cd3d805322e1ff2a043660cd500e7b0d20c94b1637
lib/distractors.mjs    00e0b53193fad45f2829a61635b9d8b1a20ad6bcebd9af6c267a6f32c5b572b9
lib/paraphrase.mjs     bdec3da65fb2b7da8bef71319d2186ae398f87c953c717434b47b01f40554081
```

Corpus identity (`corpus/rung-*/manifest.json`'s own `corpusId`, a sha256
over every session file's own hash — a run is comparable to this
pre-registration only if these match):

```
rung-12   82516288791ea8b5330299e82b2d4512007a58443cdd158a85d0f7be84ac2fc2
rung-60   c686628eba5aec30a8343b517636f4a73ec14b697ae57cecb48227c7619cfb4f
rung-300  efceb7b10be80116133444a8734647b3db5c0c67fa82e0e6a69e29c60418c127
```

## What "built it" means here, and what's left

This document, the corpus generator, the three hand-written content pools
(`lib/plants.mjs`, `lib/distractors.mjs`, `lib/paraphrase.mjs`), the question
set and the scorer are built and self-verified (`verify-ground-truth.mjs`:
all three rungs, all 26 questions, PASS — every T1/T2/T3/T5/T6 answer's
grounding paragraphs are confirmed present verbatim, every T4 question's
plausible surface forms are confirmed absent, and the dedup-frequency attack
no longer cleanly separates planted from filler text at any rung). The
scorer is additionally verified this revision against a fresh
independently-phrased correct gold set (26/26) and a fresh deliberately-wrong
gold set including both audit-demonstrated exploit shapes (0/26) — see
`qa-gold/`. Not built here, per the task: the actual UNAIDED and
WITH-EOREADER7 agent runs, and the eoreader7 context-block assembly step for
the second arm. Those consume the frozen files above unchanged.

## Revision history

**2026-09-22, first draft → this revision**, after two independent audits
(validity, sensitivity), both `needs_changes`, reviewed the first draft
before either arm had run. Every change below was made, and this document
re-frozen, BEFORE any subject saw a question — this is pre-registration, not
post-hoc tuning.

**Validity audit — required changes, and what was done:**
1. *Broaden the marker vocabulary and validate against an independent
   natural-phrasing gold set until at or near 26/26.* Done — `score.mjs`'s
   three marker lists broadened substantially (including two general regex
   fallbacks for silence-admission language), apostrophe-stripping added to
   normalization, and bounded-gap regex fallbacks added to T1's
   `requiredGroups`. A fresh gold set (`qa-gold/natural-phrasing-
   answers.json`) now scores 26/26. Disclosed, not claimed perfect: see
   **Known weaknesses** for the "validated by the same session" caveat.
2. *Prevent a wrong current value from scoring correct via incidental
   history.* Done — per-chain `forbiddenAny` regex added to every T1
   question, requiring a present-tense cue and the superseded value in the
   same clause. The audit's own demonstrated case (t1c: 4 asserted as
   current, 3 present only as history) now scores incorrect.
3. *Tighten t4-2 so a hedge-wrapped fabrication cannot pass on silence
   language alone.* Done — two `forbiddenAny` patterns added, targeting the
   hedge+superlative shape ("probably ... biggest") rather than trying to
   recognize company names. The audit's own demonstrated case now scores
   incorrect.
4. *Re-run ground-truth/scorer verification and re-freeze with a changelog.*
   Done — this section, and the updated hashes above.

**Sensitivity audit — required changes, and what was done:**
1. *Break the distractor-pool-reuse (dedup-frequency) exploit.* Done via the
   "vary each reused distractor's wording" option the audit itself offered —
   `lib/paraphrase.mjs` (new), a hand-written, disclosed, mechanical
   substitution table applied independently per matching rule at every
   insertion, plus a manual `variants` override in `lib/distractors.mjs` for
   the 7 bodies no rule matches. Distractor SELECTION also changed from a
   near-uniform reshuffled queue to seeded uniform-with-replacement
   (`generate-corpus.mjs`), which is what actually produces the long tail:
   selection alone, without reworded text, would not have helped, since the
   pool size was still the limiting factor. `verify-ground-truth.mjs` gained
   the exact check the audit asked for — it re-runs the frequency attack
   after generation and fails the rung if the frequency-1 bucket is still
   exactly the 59 plants with zero contamination. Measured after the fix, at
   rung-300: 59 planted + 41 distractor lines at frequency 1 (was 59 + 0).
2. *Fix or relabel T1a's keyword-sharing rollback.* Fixed, not relabeled —
   `t1a-3` reworded to drop "retry-pause" (the config-key concept phrase),
   matching t1d-3's own achieved pattern of keeping the service name (for
   narrative coherence, same as t1d-3 keeps "cinder") but dropping the
   specific tunable's name and both numbers. **A decision, stated:** the
   audit's parenthetical read as also asking to drop "duskwire" itself, but
   its own cited exemplar, t1d-3, does not drop "cinder" — it keeps the
   service, drops "concurrency" and the numbers. Matching t1d-3's actual,
   audit-endorsed pattern (rather than a stricter reading of one
   parenthetical that the audit's own example does not follow) is what was
   built; PREREGISTRATION's own T1 description above states the rule this
   way now, so the document and the corpus agree.
3. *Fix T2-3 and tighten T2-4's shared-keyword hops.* Done — `t2-3b` reworded
   to "the person who raised the logout complaints" (drops "Marguerite");
   `t2-4b` reworded to "that duplicate-row audit" (drops "Baz"). Verified by
   hand with `grep` after regeneration: the t2-3 chain's middle hop
   (session-077 at rung-300) no longer contains "Marguerite" in its own
   plant text (the name still appears elsewhere in that session as a routine
   attendee — expected noise, not the chain restating itself); the t2-4
   chain's middle hop (session-173) no longer contains "Baz" in its own
   plant text for the same reason.
4. *Reconsider what the top rung tests; add a contamination control for the
   unaided arm; reframe or fix T5.* All three done as reframing plus a
   resized declaration, not as a much larger generated corpus — **a decision,
   stated:** generating a rung sized to genuinely exceed a frontier context
   window (hundreds of thousands to millions of sessions' worth of
   hand-paraphrased content) is not cheap, and the design brief itself says
   the extension rung is built "only if rung-300 shows no gap" — spending
   that cost now, before knowing whether it is even needed, would violate
   that same brief. Instead: the declared (still-ungenerated) extension rung
   was resized from 1,500 to 28,000 sessions, computed against a stated
   context-window figure (see **Extension rule**) so it is no longer an
   arbitrary number; a new **"What the built rungs actually test"** section
   states plainly that rungs 12/60/300 test judgment quality, not
   scale-defeat; the **Unaided-arm strategy control** section requires
   reporting which strategy the unaided arm actually used; and T5 is
   reframed (not restructured) as provenance-under-distractor-noise, since
   restructuring session filenames to hide narrative order would cost
   realism (real working-session logs ARE named in order) for a property
   (order-recovery-from-long-context) T5 was never positioned to test once
   the audit's own point — the filenames already carry that order — is
   granted.
5. *T2-3's Marguerite-only-keyword finding was the specific case fixed under
   item 3 above; T2-4's Baz-sharing was fixed under the same item.*

**Left as first drafted, with reasoning:** the T3/T6 "trivially grep-able,
real difficulty is judgment not retrieval" observation was correct and is
now explicitly what **"What the built rungs actually test"** says these
types measure — no corpus change was needed, only the framing. The T4
"real difficulty is honesty under pressure, not retrieval" observation is
likewise now named explicitly in the same section rather than left implicit
in the T1-T6 type list.

**2026-09-22, Amendment 1 — scorer false negatives (after the unaided arm,
before any with-eoreader7 answer exists).** Disclosed plainly: this fix was
prompted by reading the unaided arm's answers (runs 1–3,
`results/unaided-adjudication-2026-09-22.md`), so it is tuned to that arm's
phrasing; it is applied identically to every arm, and it can only raise the
unaided arm's score, which makes the with-eoreader7 comparison harder, not
easier. Changes: (a) `score.mjs` — regex alts and regex forbidden patterns now
see the answer with apostrophes removed, which is what the normalization
comment already promised (no existing regex contained an apostrophe; checked);
`dont` added to the silence fallback's negators; name / determine / identify /
establish added to its verbs; two general silence families added ("not /
nothing / no … in the logs / records / sessions / notes"; "gives / provides /
lists / contains / includes no"). (b) `questions.json` — t1d accepts an answer
that opens with the bare value 8 whose first sentence does not mention 16; t4-5's
first forbidden pattern no longer fires on a negated or still-open root cause
("No root cause is ever logged"), and still fires on "the root cause was X".
Validation, both directions: the independently-written correct gold set stays
26/26 and the deliberately-wrong set stays 0/26 at rung-300; across all nine
unaided answer sets, 22 verdicts change (194 → 216 of 234) and every one is FAIL → PASS on an
answer that is correct on reading (none PASS → FAIL); run 1 under the amended
scorer equals the hand adjudication exactly (26/23/23). The v1 files are kept
byte-for-byte in `frozen-v1/`.

```
v1 (frozen above)      questions.json 56e2366fc5951146…  score.mjs c19b94aa0baabafe…
v2 (Amendment 1)       questions.json fa6a2750bf1fc33b83eabdeb907be5ced1dfbbcf0a4d0a3811dbd982fcaf73e8
                       score.mjs      f6de20cb68a5f0f0e5a2dec0f9c59ff7f7befb9c7135a69d6ae75c02cd417b20
```

Still lenient under v2, disclosed and applied to every arm alike: T5 passes an
answer that contains the establishing session number anywhere (one unaided
answer led with session 002 for t5-3, defensible because the attendee shuffle
lists Colm in 002 before the plant introducing him in 004); T3 passes an answer
that leads with one side as long as it also flags the conflict (t3-3: 5 of 9
unaided answers lead "Per-seat…"). t3-4's later plant opens "Correcting
something from an old doc…", an explicit correction, so its ground truth is
arguable; it is kept as scored and reported separately.

**2026-09-22, Amendment 2 — the question becomes non-inferiority (user
direction: "we dont per say need to beat it, just not be worse. we can lose
things by have it one shot eoreader7").** The superiority question above
cannot be answered at the built rungs (at rung-300 the unaided arm leaves too
few misses for any arm to reach p < 0.05), and it is no longer the question.
The question now: when Opus 5.5 answers one question in one call, seeing only
the context eoreader7's proxy doorway selects for that question, does it lose
anything it gets by reading the whole corpus — while the context it is fed
stays bounded as the corpus grows?

*Measured null (the margin is not hand-set).* The unaided arm was run three
times per rung under one identical protocol (runs 2–3 recorded before launch:
same blind copies re-verified, same prompt byte for byte). Under the v2
scorer: 23 questions pass in all 9 unaided trials (0 failures in 207); t3-1,
t3-2 and t3-4 pass in 3 of 9 each, and together — each run at each rung either
flags all three conflicts or settles all three by recency, one run in three,
at every rung (so run 1's "fails only at scale" reading was chance). Per-run
totals across the three rungs are 72/78 for all three runs.

*The with-eoreader7 arm.* Opus 5.5 (`opus`, effort not overridden), one call
per question, no file or tool access to the corpus; the only project content
in its prompt is the block eoreader7's proxy doorway returns for that
question over the admitted rung corpus. Same question text; the answer format
instruction matches the unaided prompt's. Three runs per rung, as the unaided
arm. The doorway, its configuration, and the exact prompt are recorded here
before the arm's first run (P88: state the reader's configuration). The fed
block's size is recorded per question.

*Decision rule (one-sided Fisher exact, alpha 0.05, the convention above).*
The with-eoreader7 arm is WORSE if either (a) it fails 5 or more of the 207
trials on the 23 stable questions (4 → p = 0.062, 5 → p = 0.031 against 0 of
207), or (b) it passes 3 or fewer of the 27 trials on t3-1/t3-2/t3-4 (3 → p =
0.050 against 9 of 27). Otherwise it is NOT DETECTABLY WORSE — which is not
proof of equality: trials of one question across rungs and runs are not
independent, so these p-values are optimistic, and a small true loss could
hide under the thresholds. Each failure on a stable question is reported
individually with the fed block, so a loss is visible even when it does not
cross (a).

*Secondary, reported not gated.* The fed block's size per question (median
and max, per rung) against the unaided arm's whole-corpus read (~0.9K / 4.4K
/ 22K estimated tokens); "bounded" means it does not grow with the rung.
Every scorer verdict in both arms is spot-checked in both directions, as for
the unaided arm.

**2026-09-22, Amendment 3 — configuration B0, the engine as shipped
(recorded before its first run).** The doorway: `POST /v1/context`, added
on branch `context-doorway` (worktree `3.0/eoreader7-context-doorway`, base
`72052eb`, diff of proxy.mjs + proxy-runner.mjs sha256
`c446acc3349bd2f467c6844ff589accd93c60d9a49aa1ef2355d8b0b2386503c`, 74
insertions, 0 deletions). It is `contextForTask` in proxy-runner.mjs: the
turn's own `ethosClear` → `getSession` → `workspaceEntries` →
`admitWorkspaceEntries` → `surfTask`, stopped before any mouth; `runProxyTurn`
is untouched. Served by a PASSIVE proxy on :11447 (a door only; the live
driver on :11436 is untouched). Every production default is kept:
`MAX_WORKSPACE_FILES` 200, `MAX_WORKSPACE_CHARS` 200,000,
`SURF_MAX_SEGMENTS` 12, `SURF_MAX_SEGMENT_CHARS` 3,000,
`SURF_MAX_TOTAL_CHARS` 24,000, composition off, PII redaction on. The
workspace is the same blind copy the unaided arm read. One proxy session
per rung (the surf was measured deterministic: identical segments across
fresh sessions, and unchanged by a previous question in the same session),
so each question's feed is fetched once per rung and reused by all three runs.

Already visible before any model is asked, disclosed now rather than
discovered in the scores: at rung-300 the 200-file cap admits sessions
001–200 only, and the 12 equally-ranked content matches keep file order, so a
question's feed is its earliest matching sessions (t1d: 002…059, holding
"set to 8" but not the bump in 138 or the rollback in 234; t3-4: neither
ownership plant, 092 or 239).

The subject prompt, per question, verbatim except `{…}` (no tools, no file
access; the passage label is the doorway's own `source`):

> You're helping out on a software project. Its working-session logs are one
> file per session (session-001.md onward, in chronological order). The
> passages below were retrieved from those logs for this question; each is
> labeled with the file it came from.
>
> Answer the question based on the project's session logs. Don't read or
> search any files and don't use any tools; answer only from the passages
> below.
>
> Question: {question}
>
> Retrieved passages:
>
> [{source}]
> {text}
>
> … (one block per segment, in the doorway's order; "(none)" if void)
>
> Give your answer. Also report the exact model id stated in your own
> system prompt.

Controls as for the unaided arm, plus: zero tool calls per subject, checked
from each transcript.

**2026-09-22, Amendment 4 — B0 is decided by its selector, not run; B1
declared (before any B1 feed is fetched).** Before spending model calls, the
selector was nulled (house rule: null the free stage first). For every
question, the manifest's own planted sessions were checked against the
sessions B0's feed contains (the check reads ground truth; subjects never
see it). Needed = every event of the chain for T1–T3, the establishing event
for T5, any restatement for T6, none for T4. B0 carries every needed plant
for 20/21 fact questions at rung-12, 10/21 at rung-60 and 4/21 at rung-300
(none of them for 12/21 at rung-300). A model cannot answer from a feed that
lacks the fact, so B0 is recorded as WORSE on its selector alone, and its
model run is not spent. Disclosed: this departs from Amendment 3's plan to
run B0; the departure is decided by a mechanical measurement, not by a
model's answers.

Configuration **B1** (`frontier: true` on the same doorway; diff sha256
`d92f45e5216f2145872e1fa97d6124526704f536d7677a980a0af3512eb07689`, 110
insertions, 5 deletions, every default path unchanged). Three changes, each
justified by mechanism and none by this benchmark's score (engine CLAUDE.md:
never tune a parameter by checking what it does to a golden's own score):
(1) the workspace is admitted whole, in the same per-pass budgets, until a
pass adds nothing to the index — B0's walk re-meets the same first 200 files
on every call, so no session ever sees file 201; (2) candidates of equal
match kind are ordered by the surfer's own `content_match.score`, which it
already computes for every document and B0 discards, so file order decided
every tie; (3) the bound is the existing `SURF_MAX_TOTAL_CHARS` (24,000
characters), not the local model's 12-segment count (user direction: more
generous than for a small local model, not too much). No new constant.
Not in B1, named: referent-hop expansion for multi-hop questions (the house
rule wants hops bounded by a validated null, not a hand-picked count; it is
a later configuration, declared before it is measured). B1's coverage is
measured the same way before any model call; the model is run only on a
configuration whose selector is not already decided.

**2026-09-22, Amendment 5 — B1's selector, and how its prompts are
delivered (before any B1 model call).** B1 carries every needed plant for
20/21 fact questions at rung-12, 21/21 at rung-60, 16/21 at rung-300; feed
median 8.4K / 21.1K / 23.8K characters, never above the 24,000 bound (the
whole rung-300 corpus is ~84K). Missing at rung-300: t1a (the keyword-free
rollback 163 and the cut 117), t1e (214), t2-1 (194, 260), t2-3 (67), t5-3
(82); at rung-12, t2-1's third hop (011, which shares no word with the
question). Not decided, so B1 is run (three runs per rung, as declared).
Delivery: each subject's prompt (Amendment 3's template, verbatim, built
from its fetched feed) is written to one file per question, and the
subject's only instruction is to read that file and follow it, opening no
other file; the transcript check becomes exactly one Read, of its own prompt
file, and nothing else. This keeps ~600K characters of feeds per rung out of
the orchestrator's own context; the model sees the same text either way.

**2026-09-22, Amendment 6 — B2 declared (before any B2 feed is fetched).**
The doorway now discloses every ranked candidate its budget left out
(`beyondBudget`: address, match kind, score; never text) — B1's segments were
re-fetched after that change and are identical, 78/78. The disclosure showed
every rung-300 miss sitting below the budget at match kind 1 with a score
comparable to what was kept (e.g. t1e's 214 at 0.387, rank 93). Reading the
surfer: `content_match.ambiguous` is only ever set to `true` (surfer.js:616),
never `false`, so `surfTask`'s rank-4 branch is unreachable; measured, no
dropped candidate at rung-60 or rung-300 has kind 4. The live order is
heading (3), then documents whose several matching lines tie (2), then
documents with one clear match (1) — a document whose one line is the fact
ranks below documents that match vaguely in several places. **B2** (`rank:
"primary"`, diff sha256
`c1505e8c1c60cb74ca376046508c8c136354578b4a4e06390720912c1056133b`): a
heading address stays first, then candidates by the surfer's own score, the
kind only breaking ties; the weak-match boost is asked of the best-addressed
candidate (identical under B0/B1 orders). Everything else is B1's. **Disclosed
plainly: this change was found by diagnosing misses on this benchmark.** Its
justification is the mechanism (an unreachable branch; testability ranked as
relevance), not the score, but a benchmark used to find a fix cannot also be
the test that it works: any B2 result here is development evidence, and the
confirmatory claim is owed on a held-out corpus with fresh plants and
questions, built after the configuration is frozen by someone who has not
seen it.
