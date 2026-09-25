# the Emberlink Project — a held-out long-project benchmark

## What this is

A fresh, invented software-project corpus with planted facts and a fixed
26-question test, built as a HELD-OUT benchmark for the same kind of
long-context retrieval evaluation `native/eval/the-fold/long-project/` runs,
but over a project, cast, and set of numbers that share nothing with it.
"Held-out" here means: whatever review or tuning happened against
long-project's own corpus and questions could not have touched this one,
because this one did not exist yet and was built without reading the file
that records long-project's own design decisions.

The invented project: **Emberlink** (product name **Emberlink Pulse**),
built by fictitious company **Thornquist Labs**, hosted on **Brindlemere
Cloud**, formerly called **payments-v3** before it was renamed. Six invented
services (wickham, bastion, coffer, kiln, beacon, trellis), four invented
Brindlemere region codes (ord-4, dub-1, nrt-2, gru-5), one invented legacy
datastore (Thornquist-DB0), and eleven invented people. None of these names,
services, or planted numeric values repeats anything from long-project's own
cast (Rendalyn / Quillfen / Quillfen Relay / Solenne Cloud / duskwire,
harrow, pallet, cinder, loom / Rendalyn-DB1 / iad-3, fra-2, syd-1 / Priya
Oyelaran, Tobias Wrenfield, Marguerite Sohl, Deng Achterberg, Esti
Vandermolen, Baz Okonkwo-Reyes, Colm Fassbinder, Nkiru Delacroix-Hume) or its
planted numbers (4000/1500ms, 30/60min, 2/4/3 decimals, 8/16 concurrency,
300/60s, 10,000 events, weekly/Monday, Sunday, 4 hours, 3/2 regions, 4/3 QA
headcount).

Three size rungs — 12, 60, and 300 sessions — rendered from the same 59
hand-written planted-fact paragraphs and a 35-item distractor pool, seeded
and reproducible (same seed → byte-identical corpus). 26 questions across
six planted-fact types (T1 revised value, T2 three-hop multi-hop, T3
unresolved contradiction, T4 silence, T5 first-establishing session, T6
paraphrased restatement), scored mechanically by `score.mjs` — copied
verbatim from long-project so the acceptance-rule schema and shared marker
vocabulary are identical, never a model judge.

## How it was built

The machinery (the generator's placement algorithm, the manifest/stats
format, the scorer, the session-file format) was copied or adapted from
long-project's own scripts — `lib/prng.mjs` and `score.mjs` are byte-identical
copies (verified below); `generate-corpus.mjs` and `verify-ground-truth.mjs`
are adapted (same mechanism, this project's own content, plus one addition
each — see below); `lib/people.mjs`, `lib/paraphrase.mjs`,
`lib/distractors.mjs`, `lib/plants.mjs`, `questions.json`, and both
`qa-gold/*.json` files are entirely new content, written for this project
and checkable against nothing but this corpus.

Two deliberate additions beyond the copied machinery, both because this is a
held-out benchmark and needed its own fresh instances of two structural
properties long-project's own design relies on but doesn't mechanically
verify:

1. **Attendee gating** (`generate-corpus.mjs`). Declan Osei-Praveen (T5-3)
   joins the project mid-stream. Plain seeded attendee sampling (shuffle the
   full roster, slice 2-4) could by chance draw him into an EARLIER session's
   attendee line than his own establishing plant, silently breaking the T5-3
   "first-establishing session" ground truth. `buildRung()` now computes
   every plant's session placement first, then samples each session's
   attendees only from people already "introduced" as of that session
   (`lib/people.mjs`'s `gatedBy` field marks which plant introduces whom).

2. **Two new verify-ground-truth.mjs checks**:
   - **T5-subject-before-establishment**: reads every session file
     SEPARATELY (not the whole-rung concatenation the other checks use) and
     confirms neither T5-3's subject ("Declan") nor T5-4's subject
     ("trellis") appears in any session numbered before its own establishing
     plant's session, at every rung, per that rung's own manifest.json.
   - **T3-later-plant-not-a-correction**: confirms each T3 chain's LATER
     plant (array order) contains none of
     correct/actually/not/no longer/instead/updated/changed — it must read
     as a plain, present-tense restatement that merely disagrees with the
     earlier one, never as a fix to it, or the "unresolved contradiction"
     would secretly read as a resolved one.

Both checks pass at every rung (see verifier output below).

## Independence rules followed

Per the task's strict independence rules, while building this benchmark the
following were never opened, read, or touched:

- `long-project/PREREGISTRATION.md` — not opened at all, at any point.
- `eoreader7-context-doorway/` (the whole directory) — not read.
- `eoreader7/proxy-runner.mjs`, `eoreader7/proxy.mjs` — not read.
- `legacy-eoreader6.1/` — not read.
- `long-project/results/`, `long-project/frozen-v1/` — not read.
- `/private/tmp/` — not read as a source of information (only used, as
  instructed, as this session's own scratchpad for temporary working files
  the session itself created, e.g. a reasoning-gate spec file).

Only the explicitly permitted long-project files were read, for FORMAT ONLY:
`generate-corpus.mjs`, `score.mjs`, `verify-ground-truth.mjs`,
`questions.json`, `lib/*.mjs`, `qa-gold/*.json`, and one sample session file
(`corpus/rung-12/session-001.md`). Every piece of CONTENT in this benchmark
— the company, product, vendor, services, config keys, people, planted
facts, distractor pool, and all 26 questions — was newly written for this
project; nothing was copied from long-project's own content, only its
machinery (and, per the task's explicit allowance, `lib/prng.mjs` and
`score.mjs` verbatim).

Disclosed aside, not a violation: this session runs as a workflow subagent
that shares its `CLAUDE_CODE_SESSION_ID` with a longer-running sibling
session doing unrelated `eoreader7-context-doorway` work on the same
machine (a documented limitation of this repo's own session-scoping, per
`cli/reason.mjs`'s own header). That sibling's activity is independent of
this task, was not initiated by it, and this session never itself invoked
`Read`, `cat`, or any other access on `PREREGISTRATION.md` or the other
forbidden paths — confirmed by reviewing this session's own tool-call
history before writing this file.

## Verification

`node verify-ground-truth.mjs --rungs 12,60,300` — **ALL RUNGS PASS**, every
check: T1/T2/T5/T6 plant presence, T3 exactly-two-sided, T4 silence (no
leaked surface form), the dedup-frequency attack (fails to cleanly separate
planted from filler at every rung), and both new checks (T5-gating,
T3-no-correction-language).

`node score.mjs --rung 300 --answers qa-gold/natural-phrasing-answers.json`
→ **26/26 (100.0%)** — a fresh, independently and naturally phrased correct
answer set, never copied from score.mjs's own marker vocabulary, is accepted
in full.

`node score.mjs --rung 300 --answers qa-gold/wrong-answers.json` →
**0/26 (0.0%)** — a set of plausible but deliberately wrong answers (stale
values with a present-tense cue, one-sided conflict picks, a hedge-wrapped
fabricated customer name, a fabricated incident cause, wrong T5 session
numbers, wrong or reversed T6 values) is rejected in full.

## File hashes (sha256)

The hand-authored / adapted files that define this benchmark:

```
e5268cfdf933e760bbf9c5584485be7c9a0271e49016af22c1dcac18ee935222  lib/prng.mjs
f9a699673b9abc1737248f094fa16a84b1afd172b1c4f22bcb46f63adcc83ec9  lib/people.mjs
00b6e4811a28631c07a82cbd7eab050a8fc571b553aa7853e611bc5fe0dde5de  lib/paraphrase.mjs
8eafbc2807452bc1e2583abbc6abf81a683d54135d7dc4a2911c62871f61b33f  lib/distractors.mjs
9f14b9275c7e674f765de3fb1d848a5b281a30a21dcc222ca05318808af0bb4f  lib/plants.mjs
440f86fd1e33aff09081667a443e0af139dc1df445ff0987c9088a5e9cb275bf  generate-corpus.mjs
f6de20cb68a5f0f0e5a2dec0f9c59ff7f7befb9c7135a69d6ae75c02cd417b20  score.mjs
3736fe54981c3db279194964270d762701b4dc9525dc00ae536471afea285f41  verify-ground-truth.mjs
1bc54d064c023841a2d71acae022f42621ec31849db503acd20f8b1cd107357a  questions.json
e064e7c1d0e6d252debae49651a40b580e6d13162ee8be76e89037c17b357a1e  qa-gold/natural-phrasing-answers.json
3e631e233c88099507a64ea9e59e5deb86094b8329aa271502ebc0aedb9d1c89  qa-gold/wrong-answers.json
```

`lib/prng.mjs` and `score.mjs` are byte-identical to long-project's own
files of the same name (diffed and confirmed during the build).

Every generated session file's own sha256 is recorded in that rung's own
`corpus/rung-N/manifest.json` (`files: [{path, sha256}, ...]`) — not
repeated here, to avoid a several-hundred-line hash dump for content that is
itself fully reproducible from `lib/plants.mjs` + `lib/distractors.mjs` +
the stated seed.

## Rung corpus IDs

Each rung's `corpusId` is the sha256 of its own sorted `path:sha256` file
list (computed by `generate-corpus.mjs`, recorded in that rung's
`manifest.json`):

```
rung-12:  2fb6965453702e47d8e3138e8d27941292c5885008d2a74f9a67851419e6c8e1
rung-60:  978dd43a17eac02012a9ab05895a771354c71459a1ff3e37d0aa3e872265a725
rung-300: 13856cae2b5231030a2d5d384598ada66907293602ba71a41a6c0210e88bc344
```

Generator configuration: seed `4471903`, rungs `12,60,300`.
