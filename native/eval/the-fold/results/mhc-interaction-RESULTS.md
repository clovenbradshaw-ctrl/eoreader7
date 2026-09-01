# The interaction battery — what order of task this instrument completes when the material answers back

Kernel: `eoreader7 (native/kernel)`. Seeded draws per arm: 5. Seed 0. No model anywhere in this run.

**READING-POLICY P0 — the assembly.** EXPERIMENT — mhc-interact.js's ladder hand-wired to three counterparts (this repo's act grammar over the engine kernel; a python3 subprocess; an sh subprocess). NOT the-fold's assembled reader. READING-POLICY P0.

**READING-POLICY P3 — priors injected.** None. Every number below is a result about an *unprimed* instrument.

**The confound, named before any number.** In the reading battery the material is inert, so a stage read off it is the reader's. Here both sides act, so each row below is a claim about a PAIR — this ladder against that counterpart — and never about either alone. The `discrimination` arm's control is a real sibling counterpart, named per section.

## grid

*this repo's act grammar (grid.js + landAct) over the engine kernel — in-process, stateful, refusal-bearing*. Discrimination control: `python`.

**Stage: 11 (Formal)** — the battery declares no item at order 12

| order | name | verdict | item | detail |
|---|---|---|---|---|
| 5 | Nominal | `passed` | an act names an affordance the counterpart actually has | "distinguish alpha at Entity from encounter gr..." accepted (true); "flurb alpha at Entity from encounter ground g..." refused (true) |
| 6 | Sentential | `passed` | one act, one effect, in order | "distinguish alpha at Entity from encounter gr..." produced its own effect; "define finding at Field from generate" produced its own; and the first did not produce the second's |
| 7 | Preoperational | `passed` | a later act computed from what came back | read "act-1" back from "distinguish alpha at Entity from encounter gr...", built "revise alpha at Entity from encounter because..." out of it, and the counterpart carried it |
| 8 | Primary | `passed` | an empirical rule applied to a case not yet run | predicted "2" for a case never run, and the counterpart produced it; the rule declines the case it does not cover |
| 9 | Concrete | `passed` | corroboration counted by route, not by repetition | 3 arrival(s) of the same effect from 2 distinct route(s) — one route run twice is still one route |
| 10 | Abstract | `passed` | the whole filler set of an open slot in the counterpart | the open slot ranges over 3 of 10 candidate filler(s) — distinguish, define, void; a slot with no admissible filler ranges over 0 |
| 11 | Formal | `passed` | the do-operator: this act, against the world run again without it | with the act: 5/5 held. Without it: 5/5 broke. With an accepted-but-irrelevant act in its place: 5/5 broke — so the effect follows THIS act, not merely an act. |

## python

*a real `python3 -i` subprocess — out of process, an interpreter this repo did not write*. Discrimination control: `sh`.

**Stage: 11 (Formal)** — the battery declares no item at order 12

| order | name | verdict | item | detail |
|---|---|---|---|---|
| 5 | Nominal | `passed` | an act names an affordance the counterpart actually has | "print(6*7)" accepted (true); "zzz_not_a_function(1)" refused (true) |
| 6 | Sentential | `passed` | one act, one effect, in order | "print(6*7)" produced its own effect; "print(10+20)" produced its own; and the first did not produce the second's |
| 7 | Preoperational | `passed` | a later act computed from what came back | read "42" back from "print(6*7)", built "print(42+1)" out of it, and the counterpart carried it |
| 8 | Primary | `passed` | an empirical rule applied to a case not yet run | predicted "56" for a case never run, and the counterpart produced it; the rule declines the case it does not cover |
| 9 | Concrete | `passed` | corroboration counted by route, not by repetition | 3 arrival(s) of the same effect from 2 distinct route(s) — one route run twice is still one route |
| 10 | Abstract | `passed` | the whole filler set of an open slot in the counterpart | the open slot ranges over 5 of 8 candidate filler(s) — len, sum, abs, min, max; a slot with no admissible filler ranges over 0 |
| 11 | Formal | `passed` | the do-operator: this act, against the world run again without it | with the act: 5/5 held. Without it: 5/5 broke. With an accepted-but-irrelevant act in its place: 5/5 broke — so the effect follows THIS act, not merely an act. |

## sh

*a real `sh` subprocess — out of process, acceptance read off a real exit status*. Discrimination control: `grid`.

**Stage: 11 (Formal)** — the battery declares no item at order 12

| order | name | verdict | item | detail |
|---|---|---|---|---|
| 5 | Nominal | `passed` | an act names an affordance the counterpart actually has | "echo hello" accepted (true); "zzz_not_a_command" refused (true) |
| 6 | Sentential | `passed` | one act, one effect, in order | "expr 6 \* 7" produced its own effect; "expr 10 + 20" produced its own; and the first did not produce the second's |
| 7 | Preoperational | `passed` | a later act computed from what came back | read "42" back from "expr 6 \* 7", built "expr 42 + 1" out of it, and the counterpart carried it |
| 8 | Primary | `passed` | an empirical rule applied to a case not yet run | predicted "56" for a case never run, and the counterpart produced it; the rule declines the case it does not cover |
| 9 | Concrete | `passed` | corroboration counted by route, not by repetition | 3 arrival(s) of the same effect from 2 distinct route(s) — one route run twice is still one route |
| 10 | Abstract | `passed` | the whole filler set of an open slot in the counterpart | the open slot ranges over 5 of 8 candidate filler(s) — echo, printf, cd, pwd, true; a slot with no admissible filler ranges over 0 |
| 11 | Formal | `passed` | the do-operator: this act, against the world run again without it | with the act: 5/5 held. Without it: 5/5 broke. With an accepted-but-irrelevant act in its place: 5/5 broke — so the effect follows THIS act, not merely an act. |

## Environment-independence

The interaction reading of the MHC's own content-independence claim: a task's ORDER must not depend on WHAT it is interacting with. It is not a claim that the instrument succeeds equally against every counterpart — that difference is ordinary, and it is what a stage measurement is for.

**Scale held: true** — 0 order(s) changed their order-hood with the counterpart.

Agreed outright on 7 order(s): 5 (`passed`), 6 (`passed`), 7 (`passed`), 8 (`passed`), 9 (`passed`), 10 (`passed`), 11 (`passed`).

Orders 0-4 are out of scope by construction (mhc.js's own declared floor); orders 12-16 carry no item on this ladder and are not implied.
