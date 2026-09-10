# Minimum-model routing, learned over time — a design proposal (2026-09-10)

Not built. This is a scoped proposal, grounded in the three experiments in
this directory (`model-guardrail-experiment-RESULTS.md`,
`postguard-witness-experiment-RESULTS.md`, `model-capability-ladder-
RESULTS.md`) and in what `the-fold` already has built. The user's ask:
"hitting the minimum model needed per turn, the system should start
learning what it knows and doesn't know and needs to check, developed
towards speed and grounded accuracy."

## The one-line summary of what the experiments actually found

There is no single "confidence" or "difficulty" signal to route on.
Three different failure shapes need three different mechanisms, and this
codebase already owns two of the three:

| failure shape | example from the ladder experiment | fix that already exists | new work needed |
|---|---|---|---|
| the task is mechanical, no model should ever guess | arithmetic (non-monotonic across model size — proof no model can be trusted here) | `arithmetic.js` (P51/P52) — intercepted before any model call | none — confirm it's reached from every turn shape, not just flat chat |
| the task needs real reasoning depth | transitive/temporal multi-step questions (both small models wrong, both larger models right, consistently) | none, this is genuinely a model-size question | a real escalation trigger keyed on task SHAPE, not vibes |
| the model may not have the information at all | "what was my sister's name?" — gemma2:2b confabulated, everything else correctly declined | none — the existing witness attempt was refuted (100% FP, flat across sizes) | a witness that asks the right question |

## Piece 1: route arithmetic-shaped and other mechanical asks away from any model, always

Already built (`arithmetic.js`, `shape.js::declaredForm`, the frontier-25
organs in `THE-27-CELLS.md`'s Existence row). The only real gap: confirm
these mechanical doors run on every turn PATH the app has (flat chat,
S1/S2 two-pass, holon.js parts, `/act`, `/run`), not only the ones they
were originally wired into. A quick audit (grep every place a turn drafts
against a model, check the mechanical door runs first) would close this
without new design work.

## Piece 2: escalate on task SHAPE for reasoning-depth questions

This is the one place "minimum model needed" genuinely means "a bigger
model would actually help." The lever should NOT be "ask the small model
if it's confident" (LEVELS.md's own trust rule: never trust the model on
its own content, and confidence talk is content). It should be a cheap,
mechanical shape detector — the same posture `shape.js`/`arithmetic.js`
already use: a question containing a transitive/comparative chain
("X is older than Y, Y is older than Z"), a multi-clause temporal
computation, or (this repo already has the organ) a decomposed
multi-anchor task already routes to the user's chosen DEEP rung via
`ROUTE_KINDS.DEEP` in `model-routing.js` — the gap is that a PLAIN flat
question with this shape currently routes to the FASTEST rung regardless.
A small, real addition: a `needsReasoningDepth(question)` shape check
(closed-class markers: comparative chains, multi-step arithmetic-in-
prose, nested conditionals) that upgrades a flat turn's routing from
`ROUTE_KINDS.FLAT` to something between FLAT and DEEP — reusing the
picker's own rung order, never inventing a fifth tier.

## Piece 3: the confabulation witness, done right — reuse the SELECT protocol, not a freeform judge

The broken mechanism asked an open question ("does this look specific")
and got an answer with no relationship to truth. This codebase's own
P32/P83 witness protocol exists for exactly this reason: **never ask a
small model to freely judge; give it a real candidate and a decoy and
have it POINT.** Applied here: the honest question isn't "is this
answer specific," it's "does anything this conversation was actually
given support this claim" — which is a question the SELECT protocol can
answer mechanically:

1. Gather the conversation's own real candidates: attached/muted source
   names, prior turns, the hyperlexicon ledger, the self-plane record —
   whatever this turn's `readerFrame()` actually declared as available
   (P80).
2. If the model's claim shares NO vocabulary with anything in that set
   AND the question pattern-matches a "no attached grounds" shape
   (`unretrievedSuffix`'s own trigger condition is still a legitimate
   signal — the FIX is not the trigger, it's what happens after it
   fires), that's the actual confabulation-risk case the should-refuse
   tier measured.
3. Rather than asking a model "is this specific" (refuted), CHECK
   MECHANICALLY whether the claim's content overlaps with the
   conversation's own given material — the same containment check
   `checkGrounding`/`grounding.js` already runs for material-grounded
   claims, generalized to "was this ever given to the model at all,"
   which `P187`'s `fedSources`/`fedRefs` already computes and discloses.
   If nothing was fed and the claim doesn't look like general/common
   knowledge (a much narrower, harder-to-get-wrong check than "is this
   specific"), FLAG it in the disclosure — the way `P186` already
   insists: never overwrite the draft, only ever record the finding.

This turns the dead mechanism into a disclosure (matches `P186`'s own
now-standing law: a check finds, it never overwrites) rather than trying
to resurrect a swap-based fix.

## Piece 4: the learning part — track escalation need PER QUESTION KIND, not per turn

The user's ask was explicit: "the system should start learning what it
knows and doesn't know." A per-turn decision (however good) is not
learning; it re-derives the same judgment every time. This codebase
already has the right shape for learning kind-level standings:
`kind-standing.js` (P79) discovers a referent's KIND from company alone
and folds a standing (`established`/`unknown`/`contested`) over repeated
observation, with a real null (II.23) gating any claim that the standing
is meaningful rather than noise. `metacognition.js` (P72) already tracks
a `standingOf` ledger per declared cell, escalating a turn's retrieval
budget when a cell reads `contested`.

The natural, minimal extension: treat each of the three failure shapes
above (mechanical/reasoning-depth/confabulation-risk) as a declared
CELL on that same ledger, keyed by a cheap, declared question-shape
signature (not a learned embedding — a closed, inspectable set: "contains
a comparative chain," "contains an arithmetic expression," "asks about
a personal fact never stated this conversation"). Each time a turn of a
given shape is later confirmed right or wrong (by the mechanisms in
Pieces 1–3, or by an explicit correction — `/must`, `learned.js`'s own
`repeatsKnownFalse`), the ledger's standing for that shape updates. Over
time, a shape that has reliably been fine at the fast rung stays fast; a
shape that has repeatedly needed escalation gets routed up BY DEFAULT
next time, not re-guessed — genuine learning, on the record, auditable,
with the same "an empty/thin standing is a fact about the reader, not a
verdict" discipline P79 already established.

## What NOT to build

- No confidence score asked of the model directly (LEVELS.md's trust
  rule; this session's own postguard experiment is the concrete proof
  of why that fails).
- No new "is this hard" classifier trained on vibes — every trigger
  above is either a closed mechanical pattern (arithmetic, comparative
  chains) or a real containment check against what was actually given,
  never a freeform judgment call.
- No swap-the-draft mechanism anywhere — `P186` already settled that
  question app-wide; any new check only ever finds and discloses.

## Scope and next step

This is a real, multi-file change (model-routing.js, holon.js, a new
question-shape detector, an extension to metacognition.js's ledger) —
comparable in size to the kind-standing or metacognition passes already
in this codebase's own history, each of which shipped with its own
measured control before landing. Proposing it here rather than building
it blind. If you want to proceed, the right first slice is Piece 3 alone
(replacing the dead witness with a real containment check) since it's
the most self-contained and the most measured already — Pieces 2 and 4
depend on design choices (which shape patterns count, how the ledger
keys a "kind") worth confirming before code.
