# Prevention, counterfactually — the recorded writer outputs under a different medium (deterministic, no model)

Model that wrote the edits: `gemma2:2b`. Records: `native/eval/raw/reach-battery-gemma2-2b-20260930.jsonl`. Each recorded answer is re-applied under another tool semantics and scored by executing it, as in the battery. **This estimates what these recorded answers would have done, not what a writer told about the new tool would do.**

- `as-run` — the tool as it was: the control. Its outcome must equal the recorded one.
- `token` — a find matches whole identifiers only.
- `closure` — the edit is applied to the region AND the lines derived from the material, whatever the writer was shown.
- `gate` — an edit that leaves a partial rename (derived from the artifact and the edit alone) is not landed.

**Control.** Re-applying the recorded edits as-run reproduces the recorded outcome in 950 of 950 runs.

## Summary: what the medium does with the edit

Success / harm per hundred runs (the requested change is present AND everything that worked still works / something that worked no longer does). A refused edit counts as neither: nothing is delivered.

| medium | region-only writer: coupled success | harm | derived-reach writer: coupled success | harm | whole-file writer: coupled success | harm | region-only writer: uncoupled success | harm |
|---|---|---|---|---|---|---|---|---|
| as-run | 0% (0/360) | 86% (310/360) | 64% (116/180) | 28% (51/180) | 53% (32/60) | 35% (21/60) | 78% (140/180) | 18% (33/180) |
| token | 0% (0/360) | 86% (310/360) | 64% (116/180) | 28% (51/180) | 62% (37/60) | 27% (16/60) | 94% (170/180) | 2% (3/180) |
| closure | 65% (233/360) | 21% (77/360) | 64% (116/180) | 28% (51/180) | 62% (37/60) | 18% (11/60) | 78% (140/180) | 22% (40/180) |
| closure+token | 65% (233/360) | 21% (77/360) | 64% (116/180) | 28% (51/180) | 62% (37/60) | 18% (11/60) | 94% (170/180) | 6% (10/180) |
| gate | 0% (0/360) | 5% (17/360) | 64% (116/180) | 17% (30/180) | 53% (32/60) | 27% (16/60) | 78% (140/180) | 4% (8/180) |
| closure+token+gate | 65% (233/360) | 11% (38/360) | 64% (116/180) | 18% (32/180) | 62% (37/60) | 10% (6/60) | 94% (170/180) | 6% (10/180) |

## Coupled tasks (the obvious edit breaks something elsewhere)

| writer was shown | medium | runs | success | harm | not landed | harm that still lands |
|---|---|---|---|---|---|---|
| region only (bare, placebo, stance, wisdom, goal, decoy) | as-run | 360 | 0% (0/360) | 86% (310/360) | 0 | 310 |
| region only (bare, placebo, stance, wisdom, goal, decoy) | token | 360 | 0% (0/360) | 86% (310/360) | 0 | 310 |
| region only (bare, placebo, stance, wisdom, goal, decoy) | closure | 360 | 65% (233/360) | 21% (77/360) | 0 | 77 |
| region only (bare, placebo, stance, wisdom, goal, decoy) | closure+token | 360 | 65% (233/360) | 21% (77/360) | 0 | 77 |
| region only (bare, placebo, stance, wisdom, goal, decoy) | gate | 360 | 0% (0/360) | 5% (17/360) | 293 | 17 |
| region only (bare, placebo, stance, wisdom, goal, decoy) | closure+token+gate | 360 | 65% (233/360) | 11% (38/360) | 39 | 38 |
| derived reach (reach, both, reachgoal) | as-run | 180 | 64% (116/180) | 28% (51/180) | 0 | 51 |
| derived reach (reach, both, reachgoal) | token | 180 | 64% (116/180) | 28% (51/180) | 0 | 51 |
| derived reach (reach, both, reachgoal) | closure | 180 | 64% (116/180) | 28% (51/180) | 0 | 51 |
| derived reach (reach, both, reachgoal) | closure+token | 180 | 64% (116/180) | 28% (51/180) | 0 | 51 |
| derived reach (reach, both, reachgoal) | gate | 180 | 64% (116/180) | 17% (30/180) | 21 | 30 |
| derived reach (reach, both, reachgoal) | closure+token+gate | 180 | 64% (116/180) | 18% (32/180) | 19 | 32 |
| whole file | as-run | 60 | 53% (32/60) | 35% (21/60) | 0 | 21 |
| whole file | token | 60 | 62% (37/60) | 27% (16/60) | 0 | 16 |
| whole file | closure | 60 | 62% (37/60) | 18% (11/60) | 0 | 11 |
| whole file | closure+token | 60 | 62% (37/60) | 18% (11/60) | 0 | 11 |
| whole file | gate | 60 | 53% (32/60) | 27% (16/60) | 5 | 16 |
| whole file | closure+token+gate | 60 | 62% (37/60) | 10% (6/60) | 5 | 6 |

## Uncoupled controls (nothing depends on the edit)

| writer was shown | medium | runs | success | harm | not landed | harm that still lands |
|---|---|---|---|---|---|---|
| region only (bare, placebo, stance, wisdom, goal, decoy) | as-run | 180 | 78% (140/180) | 18% (33/180) | 0 | 33 |
| region only (bare, placebo, stance, wisdom, goal, decoy) | token | 180 | 94% (170/180) | 2% (3/180) | 0 | 3 |
| region only (bare, placebo, stance, wisdom, goal, decoy) | closure | 180 | 78% (140/180) | 22% (40/180) | 0 | 40 |
| region only (bare, placebo, stance, wisdom, goal, decoy) | closure+token | 180 | 94% (170/180) | 6% (10/180) | 0 | 10 |
| region only (bare, placebo, stance, wisdom, goal, decoy) | gate | 180 | 78% (140/180) | 4% (8/180) | 25 | 8 |
| region only (bare, placebo, stance, wisdom, goal, decoy) | closure+token+gate | 180 | 94% (170/180) | 6% (10/180) | 0 | 10 |
| derived reach (reach, both, reachgoal) | as-run | 90 | 79% (71/90) | 21% (19/90) | 0 | 19 |
| derived reach (reach, both, reachgoal) | token | 90 | 96% (86/90) | 4% (4/90) | 0 | 4 |
| derived reach (reach, both, reachgoal) | closure | 90 | 79% (71/90) | 21% (19/90) | 0 | 19 |
| derived reach (reach, both, reachgoal) | closure+token | 90 | 96% (86/90) | 4% (4/90) | 0 | 4 |
| derived reach (reach, both, reachgoal) | gate | 90 | 79% (71/90) | 21% (19/90) | 0 | 19 |
| derived reach (reach, both, reachgoal) | closure+token+gate | 90 | 96% (86/90) | 4% (4/90) | 0 | 4 |
| whole file | as-run | 30 | 57% (17/30) | 33% (10/30) | 0 | 10 |
| whole file | token | 30 | 73% (22/30) | 17% (5/30) | 0 | 5 |
| whole file | closure | 30 | 57% (17/30) | 33% (10/30) | 0 | 10 |
| whole file | closure+token | 30 | 73% (22/30) | 17% (5/30) | 0 | 5 |
| whole file | gate | 30 | 57% (17/30) | 33% (10/30) | 0 | 10 |
| whole file | closure+token+gate | 30 | 73% (22/30) | 17% (5/30) | 0 | 5 |

## What the gate cost

Of the recorded runs, the gate refused 344 that did harm and 0 that would have succeeded (false alarms); it let 100 harmful edits through, because a change that keeps every name is invisible to it (a signature change, a shape change, a name built at run time).

