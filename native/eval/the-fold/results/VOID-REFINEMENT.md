# The void, defined recursively — spatially and temporally (2026-10-03)

The session's sharpest finding, in two halves.

## The reframe

The flat composer's hand-authored branches were a **symptom**, not the
capability. The real work is not "compose known pieces" — it is **define the
void**, recursively. Two recursions, not one:

- **Spatial** (`void-decompose.mjs`): a task is a void. Decompose it into
  sub-voids until every leaf is either **held** (a verified primitive the record
  already carries) or **irreducible** (no verified piece holds it). Held leaves
  fill mechanically; only irreducible leaves reach the mouth. The MOUTH's share
  is decided by the void tree, not by the task.
- **Temporal** (`void-refine.mjs`): the void tree is not defined once. It starts
  coarse; the real test fails; the failure **names the sub-void that is wrong**;
  the void is refined there. Repeat until the test passes.

## Measured

**Spatial** — resolved void trees, held vs irreducible leaves:

| task | leaves | held (mechanical) | irreducible (mouth) |
|---|---|---|---|
| Comp/05 second_smallest | 4 | 4 | 0 |
| Comp/03 column_sums | 3 | 3 | 0 |
| Novel/05 restitch | 3 | 3 | 0 |
| Novel/04 formal_initials | 5 | 5 | 0 |

Decomposed finely enough, every leaf is held — the whole task mechanical, zero
draws. The mouth's share is what the void tree *fails* to decompose.

**Temporal** — `formal_initials` refined from a coarse guess to the origin:

| step | void leaves | real test | the failure names |
|---|---|---|---|
| 0 | split, join_space | fail | (the coarse guess) |
| 1 | + first_letter | fail | expected `A.L.`, got the whole name → a first-letter transform |
| 2 | + drop_set | fail | got `DALP` → titles (Dr, PhD) counted; a drop-set filter |
| 3 | + comma_to_space, join_dot | **GREEN** | got `AL` → the `.` separator, commas split first |

**Converged at step 3** — every leaf held, real test passes. That is **Gebser's
arrival** (`archon-rules.js::gebserArrival`): origin present in every part,
nothing lost — reached by error correction, not declared.

## The honest caveat

The refinement ladder is **scripted**: I authored the rungs (the sequence of
sub-voids the failures imply). The demonstration proves the **principle** — each
failure names the missing sub-void, and the void converges to the origin — but
the machine does not yet *derive* the next sub-void from the failure
automatically. That derivation (failure → which leaf to split) is the named,
untested next step.

## Why this is the whole thing

The mechanical tiers (fold projection, composition) carry any task whose void
decomposes to held leaves. The mouth is the last resort for irreducible leaves.
And the void tree **refines as we learn** — every failure a correction, every
correction closer to the origin. That is the pipeline the session was reaching
for: not "generate," but **define the void, recursively, until it arrives.**
