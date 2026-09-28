# Fast reasoning in eoreader7 — next-agent orientation (2026-09-28)

Read this before starting any "fast reasoning" work. No file anywhere in
this repo uses that exact phrase — this doc exists because the work
itself is real and shipped, but scattered across three commits and a
proposal doc that never reference each other. It ties them together so
the next agent doesn't re-discover what's already built, or re-propose
what's already been superseded.

## What "fast reasoning" already means here

Three pieces, all landed in one window (2026-09-21 to 2026-09-22), plus
the mechanical-reasoning substrate they stand on.

1. **The mechanical race — `native/organs/precision-race.js`.** Wired
   into the last remaining doors by `eed2d3d7` ("The last door gated, the
   race law kept", 2026-09-21): `/v1/ask`, `/api/chat`,
   `/v1/chat/completions`, `/v1/messages` all race `runMechanical` /
   `precisionWinner` beside the model's draft. The file's own header,
   verbatim: "the mechanical pipeline runs beside the mouth; a conclusion
   wins on precision (Friston), a gap never does." Underlying user
   direction, dated 2026-09-16 in the same header: "lets have response go
   as normal, and this is a pipeline that runs on its own, and if it
   comes to a conclusion it can win. friston." A conclusion only wins by
   reaching `BOUND`, `CONTRADICTED`, or `CONTESTED` — the Belnap–Dunn FDE
   states `native/interpretation/hl.js` already names, reused rather than
   reinvented. `BEYOND_REACH` (the mechanism's own gap) never wins; the
   model's draft stands and the gap rides along as disclosure. A win
   keeps the loser too — the draft rides the result as `superseded`,
   never erased. Commit reports 53/53 tests green across everything it
   touched. Stable since.

2. **heimdall's fastest-mouth routing — `heimdall.mjs` (`mouthFor`).**
   Commit `180e5eb3` ("heimdall: the fastest on-device mouth answers, and
   says which", 2026-09-22T21:23:53Z). User direction, verbatim: "use
   whatever model and system is fastest for the person, with little
   model control on the surface, except anything that leaves the device,
   which stays opt-in." The asked model answers when it's already
   resident inside the promise; otherwise a warm on-device mouth answers
   when it's inside the promise and faster than waiting — sticky per
   turn, disclosed as `served` on every engine route. Never substitutes
   for `x-er7-tier: exact`, a spoken switch, a logit bias, embeddings,
   images, or anything off-device. 130 tests pass against the committed
   tree.

3. **reason-bench — `native/eval/the-fold/reason-bench/RESULTS.md`.**
   Commit `5105c145`, minutes after #2, same session
   (2026-09-22T21:27:33Z). Question: does routing a model's claims
   through `cli/reason.mjs` — model states, engine judges, never the
   reverse — close the gap between a small model and a large one? Gold
   answers come from independent generator code that imports nothing
   from eoreader7. On the v3 hard set (45 adversarial items spanning
   order/imports/types/time/facts, built specifically to break small
   models):

   | arm | score |
   |---|---|
   | Opus 5.5 alone | 45/45 |
   | Sonnet 5 alone | 40/45 |
   | **Sonnet 5 + eoreader7** | **45/45** (ties Opus) |
   | Haiku alone | 26/45 |
   | **Haiku + eoreader7** | **36/45** (+10) |

   The load-bearing finding, verbatim from the results doc: eoreader7's
   effect "depends entirely on whether the model's write-up of a problem
   is complete, not on the model's own reasoning." Verified both
   directions: rerunning the engine on each model's own specs reproduces
   that same model's score, and an oracle-encoded control (specs parsed
   straight from the generator's own phrasing, no model at all) scores
   45/45 — isolating the engine's own correctness from either model's
   ability to write a problem down completely. **Not shown**: that
   eoreader7 makes a small model reason as well as a large one in
   general — only that it makes the model's encoding of a problem the
   whole game, and encoding remains the open skill gap. This is a
   completed one-shot eval, not a shipped feature: no commit has touched
   `reason-bench/` since, and the result has never been replicated.

## The substrate under all three

`native/eval/the-fold/results/mechanical-reasoning-scope-RESULTS.md`
(2026-09-10). User's correction to an earlier routing draft, verbatim:
"why aren't we doing most of that mechanically? ... we want all possible
reasoning to be mechanical." Proof of concept in
`mechanical-transitive-reasoning.mjs`: premises as `EOHyperedge@1` edges,
a relation declared `transitive` exactly once — never inferred from the
corpus, `declarations.js`'s own law — and the kernel's real
`reaction.js` composition machinery derives the answer, zero model calls
for the reasoning step itself (a model's job narrows to structured
extraction of the premises, never the comparison).

The wall this hits is principled, not accidental: composition is
licensed only by a named giver declaring a relation `transitive` or
`composes`; a relation nobody has declared anything about correctly
refuses (`withheld`) rather than guessing — and *that* is the one place
a model is legitimately still needed, to read whether a question matches
a declared shape or to declare a new one, never to compute the composed
answer itself. This is what precision-race's mechanical arm and
reason-bench's judging engine both ultimately stand on.

## Open thread: `model-routing-design-PROPOSAL.md` (2026-09-10)

`native/eval/the-fold/results/model-routing-design-PROPOSAL.md` is
self-labeled "Not built. This is a scoped proposal," written against the
user's ask: "the system should start learning what it knows and doesn't
know and needs to check, developed towards speed and grounded accuracy."
Four pieces. Two are settled by the work above; two are still open.

- **Piece 1** (route mechanical asks away from any model, always) —
  closed for the four HTTP doors `eed2d3d7` names. Not verified: whether
  the race also reaches `holon.js`'s part-drafting loop and the S1/S2
  two-pass path — `eed2d3d7`'s own commit message names only the
  flat-chat doors, not those. Confirm before assuming full coverage.
- **Piece 2** (escalate to a bigger model for reasoning-depth questions)
  — superseded same day by `mechanical-reasoning-scope-RESULTS.md`
  above. A bigger model doesn't make relational arithmetic trustworthy
  any more than it makes numeric arithmetic trustworthy; the fix was
  mechanical composition, not escalation. Dead end — don't revive it.
- **Piece 3** (replace the refuted confabulation witness with a real
  containment check, reusing the SELECT / "point, don't judge" protocol
  against `fedSources`/`fedRefs` from `P187`) — no commit found
  implementing this as of 2026-09-28. The proposal names this the right
  first slice: most self-contained, and the most already measured.
- **Piece 4** (a per-question-shape learning ledger, extending
  `kind-standing.js` / `metacognition.js` so a shape that reliably needed
  escalation gets routed up by default next time, not re-guessed) — no
  commit found implementing this as of 2026-09-28. The proposal itself
  says the shape-pattern set and the ledger's keying are worth deciding
  before code.

## Before building on any of this

1. Re-search for Piece 3 / Piece 4 work before assuming either is
   untouched — this doc's search (2026-09-28) was commit and code
   search, not exhaustive.
2. reason-bench's v3 result is a single run, never replicated. If Piece
   4's learning ledger gets built, re-running reason-bench continuously
   is the natural way to make this measurement stop being one-off.
3. Start with Piece 3 alone if picking this up — the proposal's own
   recommendation, since it's the most self-contained and most already
   measured; Pieces 2 and 4 needed design choices confirmed first, and
   Piece 2 already turned out to be the wrong fix.

## Sources

- `native/organs/precision-race.js`, `native/organs/precision-race.test.mjs`
- `heimdall.mjs` (`mouthFor`)
- `native/eval/the-fold/reason-bench/RESULTS.md`
- `native/eval/the-fold/results/mechanical-reasoning-scope-RESULTS.md`
- `native/eval/the-fold/results/model-routing-design-PROPOSAL.md`
- Commits: `eed2d3d7`, `180e5eb3`, `5105c145`
