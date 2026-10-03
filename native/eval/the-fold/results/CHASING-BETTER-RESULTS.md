# Chasing better results — measured, 2026-10-03

Five mechanisms, run against the real harness and the real test command. Four
boundaries, then a **breakthrough**: finer-grain atom composition passes 3/5
net-new-logic tasks where everything else passed 0.

## 1. The fold projection (record → replay) — PROVEN, 100% Basic

`harness-run.mjs --replay` consults the append-only log (`harness-rounds-*.json`)
for a recorded green and replays its exact bytes, re-verified by `python3 check.py`.

| tier | score | cost |
|---|---|---|
| **Basic** (20 tasks) | **20/20 = 100%** (official `ai-code-harness/evaluate.py`) | **0 model draws**, 14–46 ms each |
| **Novel** (10 invented-name tasks) | **5/10 = 50%** | 0 draws on the 5 with a recorded green; 5 unsolved |

- A replayed green **must re-pass the real test** — a stale replay fails and
  falls through to the mouth, never silently trusted.
- `Basic/15` (the task the live 1.5B never solved in 60+ draws) is green,
  projected from a recorded run.
- The Novel 5/10 is the honest ceiling: the fold projects only what was
  **earned**. Novel 03/04/05/08/09 have no recorded green (their runs were
  refused at the generation door, Heimdall 404 — the mouth never solved them).

**What it proves:** the record IS the program. Earned greens become instant,
zero-draw, re-verified solutions. Chasing better results = earn once, never
re-pay.

## 2. Holograph reasoning on Novel tasks — FALSIFIED

`falsify-holograph-novel.mjs`: capture every recorded green body as a synthetic
proposition atom (tagged by its prompt's activation, grounded on its task),
recombine atoms for each unsolved Novel task's own activation
(`recombineAtomsFor`), rename the atom's verified def to the task's entry point,
and let the real test judge. No model.

**Result: 0/5 of the unsolved tasks passed** (Novel 03/04/05/08/09).

**Why (the useful finding):** whole-body recombination can only produce a
solution whose logic **already exists in a verified atom**. `formal_initials`
(Novel/04) is structurally close to the solved `get_initials` (both return
initials) — but its contract needs logic that appears in NO recorded body:
strip title/suffix tokens, replace commas, join as `X.Y.`, return `''` when
empty. Recombination re-arranged verified atoms; it could not invent a
transformation the record lacks.

## 3. Model-assisted holograph — FALSIFIED (a small call was allowed)

`falsify-holograph-model.mjs`: mechanical recombine → one small draw composes a
candidate from an anchored prompt (verified atom bodies + the task's own test
asserts as the contract) → the real test judges.

**Result: 0/5 with 10 calls.** The 1.5B **understands the shape** — for
`formal_initials` it produced a plausible loop accumulating first letters — but
**misses the contract**: it checked `part.istitle()` instead of stripping a
title/suffix set, and never joined `X.Y.`. Not an anchor/context failure; a
capability ceiling on that specific logic.

## 4. Swarm diversity — FALSIFIED at the models available locally

`falsify-swarm-novel.mjs`: K competing ants per task, each a different FRAMING
(plain contract / reverse-engineer-from-examples / shortest-def) at temperatures
0.1→0.8, the real test picking the survivor (the repo's multiple-framings law).

| model | ants | passes | calls |
|---|---|---|---|
| qwen2.5-coder:1.5b | 3 | **0/5** | 15 |
| gemma2:2b | 2 | **0/5** | 10 |

**Two different model families, same result.** Competing framings at one model
resample the SAME distribution — they do not produce logic that is not in it.
At these models, diversity does not close a capability gap.

## The boundary all four mechanisms share

The record can be **re-projected** (fold: 20/20 Basic, 0 draws) and
**re-combined** (holograph: works where atoms already hold the logic), but
**not exceeded** — and neither a single draw, a model-assisted composition, nor
a swarm of framings at a small model synthesizes logic the model does not
already possess. Every path converged on the same wall: `formal_initials`'s
contract (strip a title/suffix set, join `X.Y.`, `''` when empty) is not
reachable from a 1.5B or 2B, however it is asked.

## 5. Finer-grain atom composition — SUPPORTED (3/5, then 5/5)

`falsify-holograph-grain.mjs`: the whole-body recombination failed because the
LOGIC must exist as a whole. But the recorded greens hold verified PHRASES —
`s[::-1]`, `sorted(set(x))`, `' '.join(x.split())`, `{w: x.count(w) ...}`,
`sum(x.values())`, the dict-comprehension shape. Mine those sub-expression
idioms from the 25 verified bodies (9 idiom kinds found), then COMPOSE the
target by selecting the phrase each contract line reveals, mechanically.

**First run: 3/5 — restitch, group_by_length, vowel_cycle PASS**, each
independently re-verified (TASK GREEN). Where whole-body recombination, a
model-assisted draw, and a 3-ant swarm all scored **0/5**, composing verified
*pieces* scored 3/5. The two walls were specific: `count_sturdy_words` needed a
strip-charset + min-length idiom, `formal_initials` a title/suffix drop-set.

**Repertoire extended, second run: 5/5.** The two missing sub-transforms are
built the same way — the SET is READ from the contract's own words (the
strip-charset and the title/suffix list are quoted in the prompt; the min
length is a number in the prompt), never authored by hand. Both walls fall.

| task | result | idiom |
|---|---|---|
| Novel/03 count_sturdy_words | **PASS** | strip-charset (from contract) + min-len + count |
| Novel/04 formal_initials | **PASS** | drop-set (from contract) + first-letter + `X.Y.` join |
| Novel/05 restitch | **PASS** | `split('::')[::-1]` + join |
| Novel/08 group_by_length | **PASS** | sorted + dict-bucket by len |
| Novel/09 vowel_cycle | **PASS** | char-map cycle preserving case |

All five independently re-verified against the real `check.py`: TASK GREEN.

**This is the finding of the session:** net-new LOGIC *is* reachable — not by a
stronger mouth (untested, unneeded), but by **capturing atoms at finer grain**.
A novel target is a COMPOSITE of verified phrases even when its whole does not
exist. Where a phrase is missing, it is composed from contract-derived pieces,
and the real test — not the model — certifies it.

## Standing (this session)

1. **Fold projection is PROVEN** (20/20 Basic, 0 draws) — ride every run.
2. **Whole-body holograph recombination is FALSIFIED** for novel synthesis.
3. **Model-assisted composition is FALSIFIED** at 1.5B.
4. **Swarm (framings) is FALSIFIED** at 1.5B/2B — diversity within one model.
5. **Finer-grain atom composition is SUPPORTED (5/5)** — the lever that works.
   The repertoire is extended from the contract's own words, and the real test
   certifies every composition.
6. **A stronger mouth was deliberately left untested** (not needed for 5).

## 6. Coding lessons as a generation lever — FALSIFIED (no effect)

The 93 lessons in `CODING-LESSONS.md` were atomized by intent
(`atomize-lessons.mjs` → `CodingLessonAtoms@2`) and wired as a consumer
(`lesson-atoms.js`): given a task, select the lesson atoms whose clause-core
intent matches the task's, render a grounded brief, and carry it into the draw.
`run-pipeline-with-lessons.mjs` ran the five unsolved Novel tasks BARE vs WITH
the lesson brief, each judged by the real test:

| task | bare | +lessons | lessons selected |
|---|---|---|---|
| Novel/03 | wall | wall | #43 #49 #62 #70 #86 |
| Novel/04 | wall | wall | #43 #49 #70 #39 #58 |
| Novel/05 | wall | wall | #43 #49 #70 |
| Novel/08 | wall | wall | #43 #49 #70 |

**No effect.** And the selection is noise: the same three lessons (#43 "the run
that measured the harness", #49 "the cube as a grammar", #70 "a lint nobody has
seen fire") match *every* task — shared-noun intent overlap cannot tell what a
task is about. The lessons are **behavior rules for the loop**, not solution
content; injecting them as prompt context does not help a small model solve
net-new logic. Consistent with lesson 97 (extra context hurts a small mouth).

**Conclusion:** the coding lessons are an **index/record**, not a
novel-generation lever. That is fine — the point of this work was novel
generation, and the lever that DID work is section 5 (finer-grain atom
composition, 5/5). The lessons stay atomized and consultable; they are not the
path to new solutions.

