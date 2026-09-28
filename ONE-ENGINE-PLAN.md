# One engine — the-fold becomes a pure surface on eoreader7

Decision 2026-09-16, restated and expanded 2026-09-28 by direct user
direction: **the-fold's own reasoning is to be fully ripped out.** The-fold
stops being an app that reasons and becomes an app that renders whatever
`reading` eoreader7's proxy (`proxy-runner.mjs::runProxyTurn`, served at
`/v1/chat/completions` and the other doorways in `proxy.mjs`) hands it. This
file is the live map of that migration: what has already shipped (verified
by reading the code, not assumed from the 2026-09-16 draft, which had gone
stale — several items it listed as "not started" are done), what is still
the-fold's own local reasoning, and the order the rest ships in.

**Companion document:** `native/docs/ORGAN-CONSOLIDATION-2026-09.md` carries
the detailed, evidence-based findings this plan is built on — which pairs of
modules across the two repos are true duplicates, which are deliberate
vendored copies, which only share a name, and the phasepost (cube) cell each
occupies. Read it before porting any one door: several of them (`/declare`,
`/derive`, `/concede`) may not need a new port at all — an existing, more
general eoreader7 organ may already do the job.

## What's actually shipped (verified 2026-09-28, not merely claimed)

Read directly from `the-fold/app.js::er7Turn` (line ~10213) and
`the-fold/er7-client.js`, cross-checked against `proxy-runner.mjs`:

- **Material intake.** Done. `attachments: [{name, text}]` rides the POST
  body of `/v1/chat/completions`; the engine admits it into the session
  corpus. No disk path (`x-er7-workspace`) is needed for the browser path
  any more — that header remains for the TUI/CLI callers only. (The
  2026-09-16 draft listed this as the #1 blocker; it is closed.)
- **The grounding ladder, for the plain-chat path.** `er7Turn` reads
  `out.reading.reading.sentences` — each carrying `tier`, `cell`,
  `addresses`, `phrase`, `detail`, `reached`, `fedSources`, `fedRefs`,
  `supplied` — and builds `state.lastGround` directly from it, replacing
  what used to be a client-side `groundOf` re-derivation. A real bug in
  that re-derivation (every engine-cited sentence self-matching its own
  "passage" and silently promoting to the verbatim rung) was found and
  fixed 2026-09-22 by using the engine's own verdict instead of
  re-computing one client-side — which is the whole point of this
  migration, demonstrated in miniature. **Not yet independently verified
  for FULL parity** with the-fold's own `ground-ladder.js` (594 lines) —
  `eoreader7/native/the-fold/ground-ladder.js` (362 lines) is shorter, and
  the difference has not been reconciled function-by-function. See the
  companion document's finding on this pair before trusting the engine's
  ladder as a full replacement.
- **The answer record.** `rd.answerRecord` rides the same response and is
  what `renderFold` draws in the thinking panel.
- **Loop cards / void narration / metacognition disclosure.** Partial —
  `renderFold`'s `engineTrace` carries `factGate`, `sentences`, and the
  streamed `moves` (the engine's own progress notes, re-phrased through
  `enginePhaseFor` so apparatus vocabulary never reaches the status line,
  per P55). Full loop-card/void-narration parity is not yet confirmed.
- **Model serving / mouth reporting.** `out.reading.served.mouths` names
  which model actually answered (own machine vs. a stand-in), which
  `noteMouth` renders — this replaces the-fold's own `huginn.js` hop
  ladder for the plain-chat path specifically.
- **Streaming.** Live (2026-09-22 direction: "make sure it streams results
  in real time"), both the draft text and the engine's own reasoning notes.
- **The known bugs the 2026-09-16 draft flagged** (`shadow` returned twice,
  overwritten) — not reverified this pass; check `proxy-runner.mjs` before
  assuming fixed.

## What is still 100% the-fold's own local reasoning

`the-fold/app.js::send()` checks every one of the following BEFORE it ever
reaches the plain-chat `er7Turn` fallthrough. None of them route through the
engine today. This is the actual remaining migration surface, and it is
much larger than the 2026-09-16 draft's five items:

| door / detector | handler | what it does | move to engine? |
|---|---|---|---|
| `/task` | `holonicTurn` | plans a task into parts, runs each against material — the-fold's OWN task decomposer, running the exact kind of orchestration `runProxyTurn` already does for the proxy | **yes** — this is the highest-overlap item in the whole list |
| `/bound` | `boundTurn` | free-audited vs. grammar-constrained answer, compared | yes |
| `/essay` | `essayTurn` | long-form piece generation | **yes, and likely a near-duplicate of eoreader7's own 9-stage generation pipeline** (`native/the-fold/arrange.js` … `finish.js`) — see companion doc |
| `/ranke` | `rankeTurn` | citation-chasing witness walk | yes — `native/organs/ranke.js` already exists; confirm the-fold door is calling it and not a parallel copy |
| `/facts` | `factsTurn` | Ranke-mandated fact-checked composition | yes |
| `/corroborate` | `corroborateTurn` | witness-spending ledger walk | yes |
| `/reflect` | `reflectTurn` | self-plane model turn | yes, once the self plane (`reflex.js`/`aperture.js`) has an engine home — see `MIGRATION-TO-NATIVE.md`'s open `tiers.js` decision |
| `/declare` `/derive` `/concede` | `declareTurn`/`deriveTurn`/`concedeTurn` | functional/transitive declarations over the session's ledger, licensed composition, concession with cascade withdrawal | **check `/v1/reason` first** (`cli/reason.mjs`'s `declare: {functional, symmetric, acyclic}` + its licensed-inference/order machinery) before porting the-fold's own `notes.js`/`declarations.js`/`hl-acquire.js` path — these may already be the SAME capability, more rigorously tested (falsification by construction on every `force:"strict"` claim) |
| `/void` | `voidTurn` | the DEF→EVA→REC loop over a declared void | yes — named in the 2026-09-16 draft as "cheapest/most-isolated" |
| `/must` | `mustTurn` | obligation ledger (enumerated clauses, standings) | yes — same "pure ledger act" class as `/void` |
| `/priors` | `priorsTurn` | live_priors corpus check | yes — eoreader7 already has this corpus and its own priors machinery |
| `/act` | `actTurn` | terminal composition-law act, may run a capacity | yes, once `capacity-runner.js`'s full registry is reachable from the API |
| widget/complaint routing | (inline in `send()`) | routes "I don't like the colors" etc. to the right build | yes, if code-build stays a the-fold feature at all post-migration — decide with the user whether builds are in scope |
| long-form / code-piece detection | `longFormTurn`/`codePieceTurn` | detects a length- or shape-declared generation request | yes, overlaps `/essay` |
| `/reopen` | `reopenTurn` | restores the last open source/fold/door from THIS conversation's own record | **probably stays** — it replays the browser's own local record, not a reasoning act |
| `/self` (bare, `/self acts` etc.) | `mechanicalTurn` | computed from local state, zero model calls | **stays** — deterministic, no LLM |
| `/measure` | `measureTurn` | statistics door, mechanical | **stays**, unless the user wants eoreader7's own `measure` capacity to be the sole implementation (it already exists there too — check for drift) |
| arithmetic / enumeration / logic-puzzle / table / chart detection | various | pure computed answers, zero model calls, exist specifically to AVOID a model call (L5) | **stays** — moving these to a server round-trip is a regression, not a consolidation |
| `/help`, `/dev`, `/model` | various | tutorial data, local toggles, model pin | **stays** — UI state, not reasoning |
| `/matrix` `/preserve` `/share` `/join` `/serve` `/pool` | `matrixTurn` etc. | end-to-end encrypted room (P119/P120) | **cannot move** — keys live in the browser by design |
| `/run` | `runTurn` | sandboxed code execution | **cannot move** — P18's whole point is that nothing typed here reaches a server |
| `/transcribe` | `transcribeTurn` | in-browser Whisper ASR | **cannot move** without abandoning the "nothing leaves this machine" property |
| `/visual` `/look` | `visualTurn`/`lookTurn` | image/page structure reading | partially server already (egress via explore-server); decide per the companion doc's finding on any eoreader7 equivalent |
| `/opencode` | `opencodeTurn` | reads a LOCAL machine's opencode database | **cannot move** — it is reading a sibling app on the same machine |
| `/ingest`, `/source` | `ingestTurn`/`sourceTurn` | GitHub-repo-to-folds, naming a pasted source | mixed — the fetch already crosses through `explore-server.mjs`; the "land as a fold" half is the-fold's own build system, decide with the user whether builds stay the-fold's |
| `/routes`, `/gateways` (bare) | `routesTurn`/`gatewaysTurn` | page reachability, learned gateway table | **stays** — inherently about THIS page's own network view |
| ant/swarm/ants | `antTurn`/`swarmTurn`/`antsTurn` | sub-agent orchestration inside chat | needs its own look — not covered by this pass |

**This table is a first-pass triage, not a certified plan.** Several "yes"
rows need the companion document's pairwise findings before porting (don't
port `/essay` by hand-translating the-fold's `essayTurn` if
`native/the-fold`'s own 9-stage pipeline already does the same job better —
confirm which is more capable first). The "stays" rows are a judgment call
about what counts as "reasoning" versus "deterministic utility" or
"architecturally local" — flagged for the user to correct, not asserted as
final.

## What's already shared, not duplicated (reverified 2026-09-28)

Both sides already import from `native/`: the charter/ethos gate, PII
(Goffman), injection (Ulysses), interlocutor detection. The 2026-09-16 draft
also listed "moral shadow" here — reverified and removed: the-fold has zero
imports of `native/kernel/moral-shadow.js` and zero occurrences of its
vocabulary (`norm_compliant`/`norm_conflict`/`conflictWeight`/
`corroborationFloor`) anywhere in its tree, and `native/organs/index.js`
does not re-export moral-shadow.js either, so there is no indirect path.
Moral shadow is proxy-runner.mjs/mayeroff.js territory only; the-fold never
touches it. The 2026-09-16 draft's remaining claim also still needs
checking — that the-fold's own `constitution.js` isn't ALSO independently
enforcing an overlapping table — see the companion document's finding on
`antistrauss.mjs`/`canon-ground.mjs` vs. `constitution.js`.

## Known, accepted costs of switching (unchanged, still true)

- The-fold's chat needs the proxy running — no chat from a static/
  archive.org-hosted copy, no in-tab WebLLM fallback, once switched.
  **This is the real tension with `README.md`'s "Run it from a website"
  section**, which is a shipped, working, documented feature (in-tab WebGPU
  models, zero server). Full ripout and "runs from a static host" cannot
  both be true. Decide with the user which one wins, or whether the-fold
  keeps a SECOND, explicitly-labeled "standalone mode" that is understood
  to be feature-poorer than the engine-backed mode.
- `shadow` double-return bug — already fixed, reverified 2026-09-28:
  `proxy-runner.mjs` now returns `shadow: assessShadow(personId)` (line
  8636, the Bourdieu norm-standing rate, moral-shadow.js) and
  `shadowSites: session.shadow ?? []` (line 8773, the Mneme visited-URL
  cache) as two separately-named fields of the same `return {` object
  (opens line 8600, closes line 8893), each with an inline comment naming
  the fix — the shadowSites comment says outright: "Named apart from
  `shadow` above (the Bourdieu norm-standing RATE): the two are different
  objects and `shadow: session.shadow` used to OVERWRITE the rate —
  ONE-ENGINE-PLAN's named bug, fixed here by giving each its own name."
  The old overwrite can't recur.

## Decided this pass

**The-fold keeps zero turn logic once a door is ported** — per the user's
own "the fold should only be an interaction surface" (P80), restated and
now confirmed as the direction rather than one option among several. A
ported door's the-fold-side handler becomes a thin call to the matching
`/v1/*` route plus rendering of whatever it returns, exactly the shape
`er7Turn` already is.

## Port order (revised, evidence-based)

1. **Reconcile the grounding-ladder pair first** (`ground-ladder.js` in
   both repos) — this is the one place the 2026-09-16 draft's own warning
   ("get it wrong and marks lie") is still live and unverified. Nothing
   else should be trusted as a drop-in replacement until this one is.
2. **Check `/v1/reason` against `/declare`/`/derive`/`/concede`/`/void`/
   `/must`** before writing a single new port for any of them — these are
   the doors most likely to collapse into "point the existing door at an
   existing engine route" rather than "port the logic."
3. **`/task`, `/facts`, `/corroborate`, `/ranke`** — the-fold's own
   task/witness/citation doors, once (1) is settled, since all three
   consume grounding-ladder output.
4. **`/essay` and long-form/code-piece detection** — reconcile against
   `native/the-fold`'s own 9-stage generation pipeline first (companion
   doc); do not port the-fold's `essayTurn` logic verbatim if the engine's
   own pipeline already supersedes it.
5. **`/reflect`, `/priors`, `/act`** — lower urgency, no known live
   incident forcing them.
6. **Widget/complaint routing, `/ingest`+`/source`'s "lands as a build"
   half** — gated on a decision with the user about whether the-fold's
   code-build feature stays the-fold's at all post-migration.

## Not decided yet

- Whether the-fold keeps ANY standalone/offline mode (see "Known, accepted
  costs" above) — this directly contradicts a shipped, documented feature
  (`README.md`'s static-host WebGPU mode) if answered "no" without
  qualification.
- Whether code-building (`build-log.js`, `widget.js`, the Folds panel) is
  in scope for "the-fold's reasoning" at all, or is a the-fold-native
  feature distinct from chat reasoning.
- Whether ant/swarm sub-agent orchestration is in scope.
