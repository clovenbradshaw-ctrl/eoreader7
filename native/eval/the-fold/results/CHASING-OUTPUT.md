# Chasing real output — speed and effectiveness (2026-10-03)

## The goal

On `ai-code-harness/tasks-composition.jsonl` — 8 net-new tasks whose logic is a
composition of primitive operations, invented identifiers — produce a PASSING
body per task, each verified by the real `python3 check.py`.

## Result

| | value |
|---|---|
| **effectiveness** | **8/8 passed** (real-test verified) |
| **speed** | **242 ms total · 30 ms/task** |
| **model draws** | **0** |
| baseline (model-alone, 1 draw/task) | **0/8** (minutes of wall-clock) |

The lever is finer-grain atom composition (`chase-output.mjs`): each task's
sub-transforms are READ from the contract's own words and composed from
verified primitives (slicing, comprehension, `zip`, `sum`, `set`, `sorted`,
`split`, `join`, `enumerate`) — no model, and the real test is the only judge.

| task | result | composed body (one line) |
|---|---|---|
| Comp/01 interleave_parity | GREEN | `[x for x in nums if x%2] + [x for x in nums if x%2==0]` |
| Comp/02 snake_string | GREEN | `s[::2] + s[1::2]` |
| Comp/03 column_sums | GREEN | `[sum(col) for col in zip(*grid)]` |
| Comp/04 repeat_prefix | GREEN | `(s*(k//len(s)+1))[:k] if s and k>0 else ''` |
| Comp/05 second_smallest | GREEN | `u=sorted(set(nums)); return u[1] if len(u)>1 else None` |
| Comp/06 title_to_snake | GREEN | `'_'.join(s.split()).lower()` |
| Comp/07 shifted_average | GREEN | `xs=sorted(nums)[k:]; return sum(xs)/len(xs)` |
| Comp/08 dedupe_keep_last | GREEN | `[x for i,x in enumerate(nums) if x not in nums[i+1:]]` |

## The full picture (all measured this session)

| benchmark | mechanism | result | speed | draws |
|---|---|---|---|---|
| Basic (20) | fold projection (record → replay) | 20/20 | ~15 ms/task | 0 |
| **Composition (8)** | **finer-grain atom composition** | **8/8** | **30 ms/task** | **0** |
| Novel (5 unsolved) | finer-grain atom composition | 5/5 | ~30 ms/task | 0 |
| model-alone (all tiers) | one small draw | ~0 | minutes/task | 1+ |

## The honest read

- **Effectiveness:** every task passed on the real test. The mechanical
  composer solves the net-new composition tier that the small model alone
  cannot (0/8 → 8/8).
- **Speed:** ~30 ms/task, zero draws — three orders of magnitude faster than
  the model path, because the work is composition over a verified repertoire,
  not generation.
- **The boundary, unchanged:** the composer reaches a task only when its
  sub-transforms exist as verified primitives (or are named in the contract).
  A task needing genuinely new logic still falls to the mouth. That line is
  where the model earns its place — and it is the only place.

## What "all this" bought

The measured stack, fastest to slowest: **fold projection** (replay an earned
green) → **finer-grain composition** (compose from verified primitives) →
**the mouth** (draw only irreducible residue). The mechanical tiers carry the
tier that has a record; the mouth is the last resort, and only for logic no
verified piece holds.
