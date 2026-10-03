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

## Fully adaptable, order-respecting, auto-poetic (`void-adapt.mjs`)

The three refinements the session earned, in one organ, measured on
`formal_initials`:

- **ADAPTABLE** — the next sub-void is DERIVED from the failing test, not
  scripted: the diff between the origin (`'A.L.'`) and the body's output selects
  the transform that reduces it. Each step's output is shown (`'Dr. Ada Lovelace
  PhD'` → `['Dr.','Ada','Lovelace','PhD']` → `['Ada','Lovelace']` → `['A','L']`
  → `'A.L.'`), and the diff picks the next transform. Any task with a test.
- **ORDER-RESPECTING** — every transform serves a void OPERATOR, and the
  operators carry the cube's dependency order (NUL SIG INS SEG CON SYN DEF EVA
  REC = Existence → Structure → Interpretation). The pipeline is built in that
  order (each operator wraps the prior expression): SIG `split` → INS `drop_set`
  (what kind may stand) → SEG `first_letter` (cover the extent) → SYN `join_dot`.
  A move that skips ahead is an **ILLEGAL MOVE, refused and named** — the probe
  confirms: declaring SYN with only {SIG, INS} declared is REFUSED (missing
  SEG), and the refinement declares the prerequisite first.
- **AUTO-POETIC** — each step is rendered in the system's own voice: a GFP claim
  (Ground·Figure·Pattern) through the engine's own `render()` lens — "split
  admits Existence", "first_letter admits Structure" — so the process states
  itself rather than being described.

**Converged: TASK GREEN**, operators declared in order SIG → INS → SEG → SYN,
body `''.join(w + '.' for w in [w[0].upper() for w in [w for w in name.split()
if w.strip('.').lower() not in {…}]])`.

The honest remaining gap: the transform repertoire is still authored (four
transforms); the ADAPTATION is automatic, but a task needing a transform not in
the repertoire stops at "the irreducible leaf is the mouth's" — which is the
correct, disclosed behaviour.
