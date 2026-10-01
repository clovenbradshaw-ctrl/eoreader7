# TEACH IT TO FISH

**Owner: Lovelace** — *the science of operations*; archon-holocracy `role:lovelace`, Coding Capability Circle
("in charge of all our ability to do coding, especially the stuff that happens outside the model: the cards, the
harness, the loop" — `native/archons/carriers/lovelace.js`).

> *"The Analytical Engine has no pretensions whatever to originate anything. It can do whatever we know how to
> order it to perform."* — Ada Lovelace, Note G, 1843
>
> **That sentence is the thing under test.** Every card we write out by hand so that the engine can do what we
> asked is a place where it cannot yet originate. This repo's job is to close those places until the prompt alone
> is the order. She also saw the other half — *"the engine might compose elaborate and scientific pieces of music of
> any degree of complexity or extent"* (Note A): an engine for **arbitrary content**, not for numbers. That is the
> weather app, the fuel-price app, and whatever the next prompt names.

> **THE RULE.** *You have to drive it all with only the prompt of the system. And if you're having to do
> extra steering, that is an indication of functionality we needed to learn. We're doing this to teach it
> to fish.* — the operator, 2026-09-30

This is a standing directive for every session in this repo. It outranks cleverness. A session that
hand-builds the thing the system should learn to build has shipped a fish, not a fisherman.

---

## 0. Why Lovelace holds this

1. **Her objection is our acceptance test.** The engine "can do whatever we know how to order it to perform"
   describes exactly a system steered step by step. We are done when a prompt with no steering originates the
   cards (contracts, checks, bindings, decompositions) it needs.
2. **Her teaching is the generality gate.** *The operations and the things operated on are separate concerns; a card
   made out once covers an infinite number of particular cases.* A hand-built app proves nothing; a layer that
   makes the next app free is the point — which is why the referent layer (§4) is owned here.
3. **Her scope is the loop outside the model.** The cards, the harness, the loop. The model may only be asked for
   the idea; everything that makes the idea repeatable, checkable and general is hers.

## 1. The rules

| # | rule | what it means in practice |
|---|---|---|
| **R1** | **Prompt only.** | The test of any capability is one natural-language prompt to the system's own doorway (`POST /v1/ask`, `/v1/build`, `/v1/code`, `/v1/chat/completions`). Nothing else is handed in. No contracts, no oracles, no binding tables, no data-source picks, no seeds, no hand-written reference code. |
| **R2** | **Every steer is a finding.** | If you had to add anything beyond the prompt to make it work, that addition goes on the **steering ledger** (§3) as a capability the system must learn. The ledger is the work list. A steer that is not on the ledger is hiding a gap. |
| **R3** | **The idea, not the spelling.** | The small model *"no longer needs to be precise, it just needs to have the right idea"* (operator). Precision is the system's job: a resolution layer binds the idea to the real referent (§4). We do not make the model more precise; we make the system resolve what it meant. |
| **R4** | **Small local models only.** | *"i dont wan you to pull a larger coder"* / *"we havent found that helps."* A bigger model is never the fix. If a 1.5B–4B model cannot do it, the decomposition, the resolution layer, or the routing is what is missing. (2026-09-30: a 7B coder was pulled without asking, drew two leaves, and was removed. Do not repeat.) |
| **R5** | **A test decides, never the prose.** | Generated code is accepted only when something independent of the model passes it. The system must learn to *derive* that check (§3, row 5) rather than have a person write it per task. |
| **R6** | **Record everything.** | Every search, page, image, draw, resolution and verdict lands on an append-only ledger. The record is what lets a later session (or the system) see what it had to be steered through. |
| **R7** | **Imagine the LLM does not exist.** | The operator, 2026-10-01: *"imagine that the LLM doesn't exist — that just makes us all try to put the intelligence outside of it — and really only think about the LLM when we're absolutely needed."* Before a step is given to the model, ask what the system would do with no model: it holds the real keys (the data), the person's words, the examples, the library of verified operations. A spelling slip is not a failure to be upset about — it is the system's to resolve. What is left after that is the model's real job, and §4e lists it. |

## 2. How to run the test (R1)

```bash
# the system's own doorway; the proxy listens on 11436
curl -s http://127.0.0.1:11436/v1/ask -H 'content-type: application/json' \
  -d '{"task":"Generate an app that shows the weather and gas prices anywhere. Use your vision ability to look at comps and generate from what you see, quickly and efficiently, using only local models."}'
```

Then read what came back (`answer`, `mechanical`, `document`, `disclosed`, `void`) and **write down every place the
system stopped, asked, guessed, or produced something you would have to fix or feed.** Each one is a ledger row.
Answering a clarifying question the way a user would is conversation, not steering; supplying a file, a contract, a
source list or a fix is steering.

## 3. The steering ledger

Seeded from the first weather + fuel-price run (2026-09-30, PR #148). Status: **S**teered-by-hand, **B**uilt
as an organ but not yet reachable from the prompt, **L**earned (the prompt alone does it).

| # | what a human/agent had to supply | what the system must learn to do from the prompt | status |
|---|---|---|---|
| 1 | **Answers to "who is it for? / how many?"** The bare prompt returned `build-clarify` (EOBuildClarify@1) asking `anchor` and `cardinality`; after a plain answer the system took the answer *as the task*, titled a static page *"For anyone who travels…"* and shipped no weather, no fuel, `disclosed.unchecked: true`, 0 sources, 0 comps. | Recognise a fully-specified app request (subject named, scope "anywhere"); ask only what is genuinely open; never replace the task with the clarification; never ship a page of invented content as an app. | **S** — the bug is fixed (2026-09-30: `restoreTask`, a reply answers the ask-back and is never the task); still open: "how many?" asked of an app with a named subject is noise, and with the task restored the pipeline will still write a model-invented page, not a data-backed app |
| 2 | **Finding comps** — the seed pages, the search strategy, the robots/politeness rules (`comp-research.mjs`). | Search and explore sites itself, reason over them, obey robots, keep the append-only seen-ledger, and judge license standing. | **B** |
| 3 | **Reading a comp** — the measurement and the structural reader (`comp-detect.py`, `comp-read.js`). | Read a screenshot by structure (size ratios, `Label: value`, tab rows, repeated groups) **and** by vision, and reconcile them. Label structure that is stacked or a column header is still unread. | **B** |
| 4 | **Choosing the data sources** — Open-Meteo, wttr.in, MET Norway, Overpass/Nominatim, EIA were picked by an agent and their real responses recorded. | Discover candidate sources for "weather anywhere" / "fuel prices anywhere", fetch real samples politely, record them, and say what has no open source (there is no open per-station price feed). | **S** |
| 5 | **Hand-written oracles** (`app-weather-fuel.mjs`) that read the recorded bytes independently of the model. | *Derive* the check: a parser's every output value must be located in the received data (provenance), across several recorded samples and mutated copies, so a hard-coded example fails. | **S** — the biggest row |
| 6 | **Hand-written contracts and binding tables** (`app-leaves.mjs`, `app-bindings.mjs`): which output field is which input field; which comp field is which data field. | Bind by *referent*: comp label ↔ data key ↔ output name, with evidence, typed ambiguity, typed gaps (§4). | **B** (the layer exists for keys; not yet for comp fields) |
| 7 | **Decomposition** — splitting a whole-response parser into per-row leaves plus a computed walk (`app-compose.mjs`). | Decompose a parser into row leaves and hand-checkable traversals on its own. Whole-response parsers failed on 1.5B/2B/4B. | **S** |
| 8 | **Field-name precision** — `tz` vs `timezone`, `region` vs `admin1`, `windSpeed` vs `windspeedKmph`. A 1.5B coder wrote `result.tz`, was told where `timezone` lives, and handed back the same code twice. | Resolve the idea to the real key (§4). | **B → in the path** — `organs/key-referents.js` runs inside the unit wall; `testUnit`, generation and the generated server all run behind it (2026-09-30). With it the 1.5B's naming slips pass; what remains is real logic (a missing region printed as "undefined", label parts in the wrong order) |
| 9 | **A larger model** was pulled to get past row 8 and row 5. | Never. R4. | removed |
| 10 | **Repair loops that repeat themselves** — a mouth returning byte-identical code after being shown the failure. | Notice, stop spending rounds on it, and route by trails (stigmergy) — never by size. | **B** (`makeUnit` skips identical redraws) |
| 11 | **Provider failure** — Overpass was unreachable through the egress relay mid-run. | Rank providers by learned trails at run time and fall back (a second station source, Nominatim, was added by hand). | **B** in the generated app; **S** for choosing the fallback |
| 12 | **Vision ceiling on CPU** — one 720×1280 read takes 265–375 s against a 120 s timeout. | Measure the box and size the budget; say what it cost. | **S** (`ER7_VISION_TIMEOUT_MS`) |
| 13 | **Arithmetic and formatting the small model re-implements wrongly** — measured on the first six leaves from 1.5B/2B coders with only the referent layer on (gen3, 2026-09-30): 0 of 6 verified. The failures were operations, not ideas: a temperature unit chosen wrongly, a compass bearing turned into index `8` for `"S"`, a clock time printed `0000:00`, "undefined" inside a joined label, `deg2rad is not defined`, a `const` reassigned. | Hold the operations as **cards** made out once and verified against independent values; the model is asked only to CALL the right one, and a near name resolves to the one card it means (§4b). Lovelace's own formulation: *the operations and the things operated on are separate*. | **B → in the path** — `organs/cards.js` (12 cards, pinned by `cards.test.mjs`), declared into the unit wall before a unit's code, listed in the unit prompt, copied into the generated app. Open: the card list is hand-made — the wall records every call that matched no card (`unresolved`), and that record is the work list for the next card |
| 14 | **The one-offs.** The key resolver, the cards, the repair hints and the field split were all built in the unit generator, beside the reading pipeline instead of through it. The operator, 2026-09-30: *"LaVar, get in here with our reading pipeline, none of this one off"* / *"the model is giving ideas, the system is making them coherent."* The pipeline already existed: `adapters/build/code-anchor-log.js` (typed acts on named anchors, an append-only log, the fold is the linted whole, REC re-zeroes, `settledContent` at any cursor). What it lacked was the step in the middle: it stored the writer's output raw. | The model's draw is a **suggestion**. The reading stage (`organs/code-canonical.js`) makes it coherent — a const read as the `let` it meant, a near-named call bound to the one card it names, a slipped key bound to the real key — and what lands on the log is the **canonical** form: the raw suggestion as SIG evidence, each transformation a CON entry with its basis, the canonical content as INS/SYN. The fold comes from canonical entries only. | **B → in the path** — `proposeCanonical` (anchor log), `canonicalize` (organ), `makeUnit` lands every draw through them and returns the log. Measured offline on 42 saved suggestions: safe (0 worse) but small on its own (55 of 350 runs against 47 as written); the rest of the failures are **meaning** (what a parameter selects, the value computed), which is the next reading to build. Still one-offs in app-units: the behavioural hints (ignored parameter, copied answer) and the field split (= SEG, named-not-built in the anchor log) |
| 15 | **What to OFFER, and what to do with a draw when nothing can run it.** Showing all twelve cards doubled a prompt and flipped a correct draw to a wrong one (`bedReport`); offering `roundTo` for "rounded to the nearest whole percent" did the same on one task (keys alone passed, keys+cards failed — the only difference was the card); a unit shown both directions of a conversion composed both (`fahrenheitToCelsius(celsiusToFahrenheit(x))`); and the build door (`/v1/build`, the plain doorway) shipped every draw as said — it cut every JavaScript unit at its first inner `const`, shipped a half-written function when the server hit its token cap, and could not see a call nested in another (`roundTo(cToF(x))`). | An offer is a **cost** that must be earned: a card is shown only when the unit's own clause names what it is FOR (declared `tags`, not the doc prose), a conversion only the way the clause says (`converts`), `roundTo` only for decimal places; every name another library gives an operation is a **declared alias with its giver** (`radians`/`deg2rad` are Python's and numpy's). A draw is read through the same canonical stage whether or not an oracle exists, and **what no reading can settle is a named finding, never a pass**. | **B → in the path** — `cardsFor`/`directionsIn`, `aliases`, `taskLanguage`/`clauseOf`/`unitPrompt`/`describeBuild` in `organs/code-build.js`, and the build as **a door of `runProxyTurn`** (`door: "auto" | "build" | "chat"`) so there is one engine and a few handles (§4c). Open: held-out tasks for the cards that were shaped on the dev set; a value check for a unit nothing can run |
| 16 | **Who designs the void.** A void is the hole the model is asked to fill — its signature, the shape it returns, the worked examples, the check. The model is the least reliable part, so the part that shapes the hole decides whether the one thing it says is the exact thing (CODING-LESSONS 32: the wall was the atom, not the mouth). Counted 2026-10-01 (`the-fold/void-designers.mjs`): on the app path a person designs every one (rows 5, 6, 7); on the build door the prompt *states* the signature (`tally(numbers)`) and `planUnits` keeps only the name, then the unit prompt says *"Assume each function takes a string argument"* — right for 2 of 12 task signatures — shows no worked example, and has no check unless the caller supplies one. | The system reads the hole's shape off the prompt: the signature the person wrote (basis *asked*), the worked example the person quoted, and — where the data is in hand — a copy field's example read off the sample rather than written by hand; what it cannot read is a *named* gap, never an assumed sentence. A draw that fails the examples it was SHOWN is detectably wrong with no oracle at all (7 of 12 first draws did, 2026-10-01), so the examples are the first check, not only the prompt. | **S** — the census and its test exist; the build door's signature is the first designer being replaced; the paired measurement is recorded below when it lands. |

Add a row for every steer. Move a row to **L** only when a fresh prompt-only run proves it.

## 4. The referent layer (row 8) — *tz ≡ timezone*

> *"tz vs timezone should refer to the same referent, so we should have a layer where all that gets resolved."*

`native/organs/key-referents.js`, run inside `native/the-fold/unit-wall.mjs`.

A model writing code against received data reaches for the key it has in mind. The layer resolves that idea to a
key the object **really has** and records that it did:

- **Closed set.** It binds only to keys the object actually carries — it can never mint one.
- **One, or nothing.** Exactly one real key at the strongest evidence tier resolves. A tie is a typed
  **ambiguity** with its candidates (`wind` → `windspeedKmph` | `windspeedMiles`): the model *points*, the layer never
  flips a coin. A name nothing qualifies for is **unresolved** and the read stays `undefined`, so a real absence is
  still a real failure (`aliases.js`'s law: "the same referent" is never decided from the shape of a string alone).
- **Evidence tiers:** exact → **declared** (the contract's own worked example binds `tz` to the key that holds
  that value) → fold (`windSpeed`/`wind_speed`) → prefix/token (`lat`/`latitude`) → abbreviation (≥ 3 letters,
  ≤ half the key: `lng`/`longitude`). Two letters name nothing from shape (`at` would bind `admitted_at`), so `tz`
  resolves on the *declared* evidence, not on its spelling.
- **Disclosed.** Every resolution (`asked → real`, basis) is recorded; the same resolver runs in the test and in
  production, so verified behaviour is served behaviour.
- **Controls built to fail** (II.23): a resolver that always picked the nearest key passes the slip test and is
  caught by the absence test; `county` is not `country`; `elevation2` is not `elevation`; replayed unchanged on an
  unrelated schema (hospital beds).

**Next (none of it built yet):** a *received* abbreviation prior with a named giver, measured from real schemas in
`live_priors` (so `tz`/`lng`/`pres` resolve on evidence that is not the contract's example); the same layer for
comp label ↔ source key ↔ output name (row 6); **pointing** for ambiguities — the small model picks one candidate
by index, it never writes the key; and a learned-alias trail (stigmergy) so a resolution that passed its test is
remembered for the next schema.

## 4b. The cards (row 13) — *the operation is not the thing operated on*

`native/organs/cards.js`, bound in `native/the-fold/unit-wall.mjs` (`cardPrelude`).

> *"A card made out once covers an infinite number of particular cases."* — the Analytical Engine's own division of
> labour: the operations are separate from the variables they are applied to.

What a 1.5B–2B coder gets wrong is almost never the idea. It is the arithmetic and the formatting it was asked to
re-implement from nothing every time. So those operations are written **once**, verified against values written down
independently of the code (`cards.test.mjs`: 0 °C = 32 °F, 172.8° = `S`, `"300"` = `03:00`, London–Paris ≈ 344 km), and
declared into the unit's empty-context vm *before* the unit's code. The model is asked to call, not to compute.

- **Resolved, not guessed.** A called name goes through the same wall as a read key (`resolveCard`): exact, same
  letters, truncation, abbreviation, then the words of the card's name in order (`toFahrenheit` and `cToF` are
  `celsiusToFahrenheit`; `round` is `roundTo`). Exactly one card or nothing. `mph` starts three conversions and names
  none — a typed ambiguity, the read stays a `ReferenceError` the model is shown.
- **Recorded both ways.** Every binding is written with its basis; every call that matched **no** card is written as
  `unresolved`. That second list is how the system finds out which card to make out next — the work list is the
  record, not a person's guess (still a person writes the card; closing *that* is row 13's open half).
- **The unit's own code wins.** A unit that declares its own `compass16` (function or `const`) keeps it; nothing is
  redeclared.
- **Not a hole in the wall.** The cards are plain function declarations in the same empty context: no `process`, no
  `require`, no `fetch`.
- **A control arm.** `loadUnit(code, name, { cards: false })` and `contract.cards === false` exist so the effect can be
  measured with and without, per leaf, on the same mouths.

## 4c. What the falsification said (rows 13–15, 2026-09-30/10-01) — one draw per cell, temperature 0

`diverse-falsify.mjs`: each task's contract has an **independent oracle** (runs the function on inputs the prompt did not show); an arm is `base` (nothing but the unit wall) or `all` (key resolver + gated cards + hints + canonical stage + semantic reading). The two mouths are the local 1.5B coder and a 2B instruct model; the answer for a task is the first that passes. *One draw per cell is a coin flip, so every claim below is about which side a controlled change moved, never a rate.*

| task | what it needs | `base` | `all` |
|---|---|---|---|
| busTimes | `padTime` | fail | **pass** |
| flightLeg | `haversineKm`, `kmToMiles`, `roundTo` | fail (`deg2rad is not defined`) | **pass**, one call |
| bedReport | a slipped key; **no card** | pass | pass |
| topAuthors | **no card** (control) | pass | pass |
| orderTotal, dueSoon, wordStats | money strings, calendar days, tokenising (**no card yet**) | fail | fail (same failure) |
| wttrNow | units must change the result | fail (2 of 4 runs) | fail (2 of 4) |

What it taught, in the order it was found:

1. **Ungated cards hurt, gated cards do not.** All twelve in every prompt broke `bedReport`. `cardsFor` offers a card when the unit's clause names its tags (1 / the number of cards sharing a tag, floor 1). The controls offer none.
2. **A library has gaps, and the failing draw names them.** With the gate on, both mouths composed `haversineKm`, `joinPresent`, `roundTo` correctly and wrote miles as `km * 1.609344` (8915.8 for a 3442.4-mile leg). The library converted speeds, not distances: `kmToMiles`/`milesToKm`. Then `toRadians` and `deg2rad` from two different models: `degreesToRadians`/`radiansToDegrees`.
3. **An offer can cost a draw even when it is correct.** `roundTo` for a whole-percent round flipped `bedReport`; it is now for decimal places only.
4. **The scan that finds the work list was blind to nesting.** `freeCalls` consumed the `(` before each name, so in `roundTo(cToF(x), 1)` the inner call was never seen by the wall, the resolver, or the canonical stage — every earlier measurement that involved a nested call undercounted. A lookbehind; pinned.
5. **Direction.** `celsiusToFahrenheit` and its inverse share every tag. When the clause says "A to B" within three words of the connector (not across a comma), only that card is offered.
6. **The door.** The build door had never been run on JavaScript with a local variable. Fixed: units end at their own closing brace; a draw cut at the token cap is asked again once with twice the room and named if cut twice; each unit sees its own clause's operations; a card is carried into the file once where a unit calls it; what nothing declares is reported, not shipped as verified.

Through the plain doorway (`POST /v1/ask`, no `door` field, gemma2:2b, a three-function JavaScript task): `toFahrenheit` right, `legMiles` right (`deg2rad` read as `degreesToRadians`), `windLabel` prints `22.369362920544 mph` where the task's example shows `22 mph` — **6 of 8** on the oracle, against 4 of 8 for the same model before the reading stage and 0 of 8 before the extractor fix. A parse is all the door can claim when no test is given, and it says so.

**Correction, same day (§4d): a row is not a cell.** The sentence above, "one draw per cell is a coin flip", understated it. A fixed prompt at temperature 0 gives a *spread* on this server: `groupTags` on qwen, same bytes, six draws → two different programs, two passes, back to back and with another request in between. So the `base`/`all` flips in the table, the bedReport `roundTo` flip, and the `toFahrenheit` regression are each one sample from a distribution and are **not evidence** until replicated. What survives without replication is only what does not depend on a draw: the defects found by reading code (the nested-call blind spot, the extractor cut at an inner `const`, the truncated draw, `deg2rad` not resolving) — each pinned by a test on constructed input.

**What this does not show.** Single draws on one model pair. The dev tasks are the tasks the cards were shaped on, so the distance and angle cards are an *earned* fix, not a *generalising* one until held-out tasks pass them. Three controls fail in both arms for want of a verified operation (money parsing, calendar-day difference, tokenising) — the next cards the record asks for, to be made out and then tested on tasks that were not used to design them.

## 4d. The noise floor, and what replaces the single row (2026-10-01)

`native/the-fold/sample-falsify.mjs` draws **n programs per task** (first draw only — no repair, no second mouth) and judges the *same draw* three ways: `base` (the bare prompt's draw, bare wall), `offered` (the draw from the prompt with the cards the clause names, judged raw with the cards declared and the key resolver on), and `read` (that same draw after the canonical reading). `sample-summary.mjs` reports pass rate and mean fraction of runs failed per task, and across tasks the **paired** differences with a bootstrap interval that resamples *tasks* — draws inside a task are not independent evidence about a mechanism. The reading's effect is a paired difference on one draw, so it is free of draw noise; the prompt's effect (cards offered) is not, and needs the rate.

The held-out set (written after the cards) said, as single rows: none of the three card tasks flipped to a pass; qwen used `parseMoney`/`roundTo` correctly on `cartTotal` and failed only the "priciest" logic, gemma ignored the cards; `overdueReport` exposed an argument-order convention (fixed by following the order date-fns, moment and Python use — and both mouths were measured to assume); `readingTime` exposed a return-type confusion (a string method on the array `splitWords` returns — the doc now shows the return). Those are real observations about *why* a draw failed. Whether the mechanisms raise the pass rate is what the sampled run measures.

### The sampled result (qwen2.5-coder:1.5b, first draw, n = 6 per task, 12 tasks — `native/the-fold/results/sample-qwen-2026-10-01.*`)

| | effect | 95% interval (tasks resampled) |
|---|---|---|
| cards offered (prompt + wall) vs bare, **pass rate** | +0.03 | −0.04 … +0.13 |
| cards offered vs bare: **reduction in the fraction of runs failed** | +0.06 | −0.03 … +0.16 |
| **canonical reading vs the same draws raw** (paired): **reduction in the fraction of runs failed** | +0.04 | 0.00 … +0.12 |
| everything vs bare, pass rate | +0.08 | −0.03 … +0.26 |

Read plainly: **no mechanism has a detectable effect on this model's first draw at this sample size**, except that the canonical reading never made a draw worse (its interval's lower edge is 0.00) and was decisive where it applied — `orderTotal` went 0% → 50% passing with the cards offered and → **100%** once the reading replaced the model's own `parseMoney` with the verified one (6 of 6 draws rewritten). The prompt-level offers are mixed per task (helped `orderTotal` and `dueSoon`'s partial credit, nothing for `busTimes`, `flightLeg` or the three held-out card tasks, and made `wordStats` worse: failed fraction 0.80 → 1.00). The no-card control `topAuthors` is 6 of 6 in every arm: no cost there.

Why so flat: in most cells the pass rate is 0 in *every* arm. qwen's first draw is wrong in the **idea** (what to compute: the bound it dropped, the sort direction, the count it returned as an array), not only in the form the reading can fix. The honest bound on a form-level reading is the fraction of failing draws that are one rewrite away from a passing program; the next measurement is to classify the failing draws by cause (idea / form) from their saved code, which the sampler now keeps.

**Revises the answer given earlier today** to "how close are we to gauging intent": reference-level intent is read *safely*, but at this model size its **payoff is small**, because the error mass is idea-level.

## 4e. The two bets, measured (2026-10-01) — what the system knows, what only the model can say

*"The frontier bet is to give it all of the context, have it do the little bit at a time, and use all of that power to follow constructions and to do post-processing. We have a different bet entirely."* — the operator. Everything below is `qwen2.5-coder:1.5b`, one draw at temperature 0 per cell, the 12 tasks of §4c, unless said otherwise. Drivers: `native/the-fold/{fold-experiment,context-dose,register-forms,key-need,prefill,synth-fields,helper-necessity}.mjs`; the census of who designs each void is `void-designers.mjs` (row 16).

**A frontier control, run as a control and not as part of the system (R4 stands).** Twelve fresh sub-agents of this session's own model, each given one task as the person's words only (no data, no examples, one tool call each: a Write), scored by the same oracles: **11/12**. The one miss, `bedReport`, is a key problem (`ward_name`, `total_beds`, `occupied_beds` are nowhere in the prompt): it answered with spelling hedges (`["name","stop","stopName",…]`), missed, and returned `{free:0, percentFull:0, status:"full"}` for a ward that is 88% busy, with nothing marking it unverified. Given the well-defined void (three examples and the types they show) the same model got **5/5 in 414 characters**. Frontier code with no data was 2.9× the length of the reference (9.5k vs 3.3k characters): the model does the key resolution inside its answer. One sample per task; it says nothing about cost or about harder tasks.

**The small model, and one draw.** The simple example-first file prompt, with the helpers in scope, matched the pile of rewrite rules it was compared against with no rewrite rule in it (3/12 and 4/12 on two runs — one task flips between server sessions — vs 3.25/12 for the pipeline on its saved draws; 5/12 once the types the examples show are said once); the sampled-ideas arm was dropped by the operator ("we ideally want the model to say the exact thing"). With Nagarjuna's four corners read off each draw against the examples it was shown (`void-state.mjs`, hl.js's own strings): **false-bound 0** across every arm — a draw that reproduced the examples it was shown was right on the rest, every time (0/5, 0/3, 0/3). The 7 draws that did not were *seen* to be wrong with no oracle.

**The context ladder** (`context-dose.mjs`, one rung at a time): D0 doc only 0/12 · D1 +returns and notes 1/12 · D2 +1 example 1/12 · D3 +3 examples 1/12 · D4 +types 2/12 · **D5 +the helpers the unit's words name 5/12** · D6 +every other unit's signature 2/12 · D7 +all twelve helpers 3/12 · R1 one repair shown its own miss 5/12 (no gain). D4→D5 +4 tasks −1; **nothing added beyond D5 gained a task (0 gains, 5 losses across D6/D7)** — the frontier bet in miniature costs this model. Intervals at 12 tasks touch zero; the direction is consistent, not conclusive. An escalation controller walking D3→D4→D5 gets 6/12 for 2.75 draws per task; D5 alone is 5/12 for 1.
**Helpers are needed here, not a patch for the prompt.** Holding the typed prompt fixed, `busTimes` and `flightLeg` pass 2/2 with their helpers in scope and 0/2 without; with the old instruction prompt, offering them moved raw pass 0/32→1/32 (the reading did the rest). The prompt moved more than the helpers did, and the helpers still matter.

**Keys** (`key-need.mjs`, `prefill.mjs`). The wall already logs every read of a key the data does not carry; with exactly one real key sharing a word (`total`→`total_beds`) it now binds that key *only when the draw missed its examples*, and the examples still decide (`testUnit`, `ghostBind`, ablate with `ghostBind:false`). Frontier bare answers 11/12 → **12/12, 0 false binds** on the 11 that already passed. The small model's bare-prompt draws: 1/12 either way — only 2 of 12 read a ghost key and neither is fixed; its failures are the computation, not the spelling. How much do we need the model to get keys? Barely: it must say which key plays which role, not how it is spelled.

**What the system fills with no model** (`synth-fields.mjs`, `prefill.mjs`). Of the 23 fields in the 7 tasks whose result is a flat object: **3 are copies** the system reads off the examples, and **13 of the 14 numeric fields** are *solved* by a small expression search over the input's own keys, the card operations the person's words name, and numbers and unit words from the person's words (`free = total_beds − occupied_beds`, `percentFull = round(occupied/total × 100)`, `subtotal = sumProd(items, price, qty)`, `km = roundTo(haversineKm(…), 1)`) — each also right on every run it was *not* shown, in about two seconds. Control built to fail: with the targets redealt across the examples, 0 of 26 were called solved (2 matched the shown examples and the held-out runs rejected them). **Left to the model: guards and conditionals (`avgLen` with `0 when there are no words`, `status`), string templates, lists mapped through a helper, an argmax, and the five tasks whose result is a list.** That list is the answer to "when are we absolutely needed". The honest limit: the search needs the three examples, and a bare prompt has none (row 5).

**Content in looks like content out** (`register-forms.mjs`, the information held fixed, only the register varied; one draw per cell). The instruction prompt this repo ships: **1/12, and 0/12 replies were bare code** (every one carried a fence or a sentence). The same information as a file, ending where the body begins: line comments **5/12, 12/12 bare**; JSDoc idiom **4/12, 12/12 bare** (held-out mean 0.58 vs 0.54 — no better than line comments at this size); JSDoc with two neighbouring working functions above it **4/12**, and it reproduced the shown examples less (1.08 vs 1.67 of 3). Gary's principle holds for code: the cue is a file, and neighbouring code is a distractor, not a help, for a 1.5B model.

**A swarm of fillers, cheapest first** (`fielded-swarm.mjs`): each slot is tried by *copy* (one input path), then *compose* (the expression search), then the *mouth*, each judged by the same examples and the runs it was not shown. Of the 23 slots in the 7 flat-object tasks, **16 are filled with no model and 7 are asked of it** — and `orderTotal` is whole with no model at all (pinned in `fielded-swarm.test.mjs`). The model is then weak exactly where the cheap species cannot reach: it got 2 of those 7 slots right. Composed units passing: **3/7** with the model completing one blank inside a pre-filled return (the file ends at `status: `), 2/7 with each field drawn alone in a stripped contract, against **4/7** for one whole-unit draw on the same tasks. So more species did not beat the model on pass rate; they removed it from the 70% it was not needed for and narrowed what is left to named slots (`status`, `avgLen`, `longest`, `priciest`, `route`, `times`) — each a conditional, a guard, an argmax, a template or a map, i.e. the next species to build, each checked by the same held-out gate and the same redealt-target control. Running this found a bug in the existing per-field check: the filter `^key(?![\w$]) ` dropped any failure that pointed INTO the field (`longest.length is 4`), so a wrong list passed its own field check; fixed and pinned (`app-fields.test.mjs`).

**Taking the model out, as far as it goes** (`species.mjs`, `synth-fields.mjs`, `fielded-swarm.mjs`; operator, 2026-10-01: *"experiment with taking the LLM out as much as possible — it gets pretty mechanical once we're down to it"*). The cheap species now cover: **copy** (one input path), **compose** (arithmetic over the input's keys, the cards the words name, the person's numbers and spelled-out numerals, a guard where an expression has no value and the example wants 0), **decide** (a decision list *read off the person's words* — each quoted answer and its own clause, `"gold" when accuracy is 90 or more, else "silver" when accuracy is 75 or more, else "bronze"` — the examples choosing the comparison; three examples alone fit several wrong lists), **template**, **map**, **argmax**, **topk**. A slot counts as filled only if the species also reproduces every run it was not shown.
| set | what it is | slots filled with no model | units whole with no model |
|---|---|---|---|
| A | the 12 tasks the species were built on | 23 of 23 | 7 of 7 flat-object tasks (the other 5 return lists) |
| B | 8 fresh tasks, first look, before any fix | 16 of 23 | 3 of 8 |
| B | the same, after the general fixes it showed (a junk term pool, every offered one-argument card, nearest-term-first decisions, `abs`) — **no longer a fair test** | 21 of 23 | 6 of 8 |
| C | 6 tasks written after the last edit and **never edited for** | **14 of 20 (70%)** | **4 of 6** |
Every whole unit passes the parent's complete oracle with no model call anywhere; the control built to fail (targets redealt across the shown examples) filled **0 of 40+** slots (`species.test.mjs`). Set A overstates (the species were fitted to it); 70% of slots and four of six units on tasks nobody had seen is the figure to quote. **What is left to the model, by name:** a conditional that answers with an input value (`scoreboard.winner`), a substring (`initials`), the best or mean of a list of numbers (`gradeRow`), a clamp (`bookFine.daysLate`), and every list-valued result (`topAuthors`, `dueSoon`, `overdueReport`, `groupTags`, `flattenTree`). Each is a small species; none is a search-power problem — they are gaps in the grammar. The honest limit stands: the species need the three worked examples, and a bare prompt has none. The person's words are very nearly the spec (`fine = daysLate times 0.25, rounded to 2 decimals`); compiling that sentence to an expression, with the examples as the check and not the source, is the next step and the model's real work shrinks again.

**The swarm against the model, unit for unit** (`head-to-head.mjs`; one whole-unit draw at temperature 0 with the best prompt, `qwen2.5-coder:1.5b`, the flat-object tasks): set A swarm **7/7**, model 4/7; set B swarm 6/8, model 5/8; set C (untouched) swarm 4/6, model 4/6. All 21: **swarm 17, model 13, cascade 19** (the swarm first, the model's whole-unit draw only for a unit the swarm could not finish). The two are complementary: the model passed `scoreboard` and `initials`, the two tasks written to be outside the species, and the swarm passed six the model failed (`bedReport`, `wordStats`, `readingTime`, `playerCard`, `tripCost`, `longestPost`). Neither passed `bookFine` or `gradeRow`. The honest caveat: on the one untouched set the two TIED, on the same four tasks — the six the swarm won were on sets it was fitted to or fixed against, so "the swarm succeeds where the model fails" is shown there and not yet confirmed on tasks nobody had seen. Before this point the model was nowhere in the void's design: every contract in these experiments (doc, returns, notes, examples, oracle) was written by a person, and `/v1/build` finds its units with a pattern; the only model upstream of a unit is the vision model that reads a comp image (`comp-vision.mjs`), and `talk-build.js` for content builds, where the engine decides what to ask and the model only answers one small question at a time.

**Where Python helps, and where it does not.** Python was already in the repo as the compute lane for numeric data (`organs/er7py`, `structure-swarm.js`: ants build pipelines of transforms, judged against two nulls built to fail, with a ceiling that rises with the width of the search — the same architecture as this fill). For *this* job it is not needed: every gap above is a missing operation, not a search that is too slow, and the expression search finishes in two seconds in JavaScript. What Python offers that matters: (1) its standard library as a large pre-verified component set (`datetime`, `decimal`, `statistics`, `collections`) in place of hand-written cards — useful for dates and money, but JavaScript's builtins cover the gaps found here; (2) an **independent implementation to check against** — a second reading of the same words in another language (property tests with `hypothesis`, `decimal` for money, `datetime` for days) that the oracle's JavaScript semantics cannot share an error with; (3) numerics and solvers (`numpy`, `sympy`, `z3`, `scipy`) for data series and for discovering constants when there is no spec — none is installed in this sandbox, and the words usually state the constants. What not to do: do not add a second runtime to fill slots the first fills in two seconds, and do not mix semantics (Python's `round(2.5)` is 2, JavaScript's `Math.round(2.5)` is 3; the oracle lives in JavaScript) without a reason stated.

**Not yet measured:** gemma2:2b, the species to close the named gaps, the words-to-expression compile, the stigmergy learning which species wins which slot, and parallel sampled draws of the model (set aside by the operator's steer).


### The spread (2026-10-01) — one small task per kind of code, one generic prompt, nothing tuned (`native/the-fold/code-spread.mjs`)

29 kinds (web, backend, C systems, embedded, games, data science/engineering, mobile, k8s, shell, spreadsheet, scientific, p5, live music, Solidity, CTF, compiler, Lean, Verilog, CUDA, quantum, PLC, Brainfuck, SQL recursion, n8n, prompt, Lua, Markdown, civic). One prompt builder for all (task + two examples + the opening line), a real oracle where a toolchain runs here (node, python, sqlite, gcc, bash, yq), and **9 kinds with no toolchain on this box (Swift, spreadsheet, Sonic Pi, Solidity, Lean, Verilog, CUDA, prompt, Lua) checked by structure only and reported `unverified`, never as passes**. Baseline, before the 27-cell ants are wired:

| model | pass of the 20 that run |
|---|---|
| qwen2.5-coder:1.5b | **8/20** — web frontend, backend/HMAC, C popcount, embedded timer, data-science stdev, p5 draw, quantum amplitudes, PLC latch |
| gemma2:2b | **5/20** — C, embedded, game, k8s, Markdown |

Misses are real model misses on small, plain tasks: a bounce on `<0` where the example says 0-or-below, a top-3 SQL that returns the wrong third row, a shell file that continues its own comment header, an n8n workflow with one node. Three early failures were MY oracle bugs (a `yq` flag, a game example inconsistent with its own stated order, an unclosed Markdown comment in the prompt builder) and were fixed without changing any task's difficulty. This is the baseline the cell-wired system must beat; no species is aimed at any of these kinds.


### The prompt-only run, repeated (2026-10-01): still fails at row 1

Only prompting, local model only (`granite3.2-vision:2b` via the proxy's `/v1/ask`, saved in `native/the-fold/results/prompt-only-r1.json` and `-r2.json`). Turn 1: the verbatim §2 prompt -> `build-clarify` ("who is it for? how many?"). Turn 2, a plain user answer ("for anyone who travels and wants to check a place; one app, one screen") -> a 6 KB static HTML page titled with a hallucinated fragment ("Booking.com…"), no weather, no fuel, no fetch/API call, `disclosed.unchecked: true`. So the prompt alone does NOT yet produce the app: it produces a model-invented page, as row 1 already says. The leaf-by-leaf build elsewhere in this ledger (species + small models, 3 of 9 leaves verified, 41 slots filled without a model) used hand-written contracts and oracles (rows 5–7), so it is steered and is not this result.


### The app door, first prompt-only run through it (2026-10-01)

Same bare §2 prompt, fresh session, local models only (`native/organs/app-door.js`, `the-fold/app-packs.mjs`, `buildApp`; result in `native/the-fold/results/prompt-only-app-door.json`). It no longer asks "who is it for?" and no longer writes an invented page: the task is planned from its own words (weather: "weather"; fuel: "gas prices"), routed to the build, and built leaf by leaf with the cheap species then the local models. Outcome: **4 of 9 leaves verified** (parsePlace, wttrNow, metnoNow by species alone; wttrHour by species + one model draw), **5 failed** (metnoHour: `at`/`condition`; parseStation; nominatimStation; newestWeek; priceAfter), so the build STOPPED at `generate` with a typed gap and shipped nothing. Reachable from the prompt now; not learned: the pack's contracts, oracles, sources and comps are still a person's hand (rows 2-7), and the five failing leaves are the work list (string formatting, optional-chained reads, the haversine + null guard, and the two HTML scrapes).

## 4f. The stances, built as domain-blind cores (2026-10-01) — what they close, and what is still my hand

The nine stances (mode × grain) were read against the pipeline and three had no organ: **Cultivating** (go get the ground), **Tracing** (follow a claim back to the bytes), **Unraveling** (cut where the structure already has a joint). Built as cores that know no subject, each with a control built to fail (`native/organs/tracing.js`, `cultivating.js`, `unraveling.js`, `stances.test.mjs`, 13 tests): Tracing refuses the invented sample *and* the redealt one (every value present, pairing destroyed); Cultivating returns `unsettled` — never "enough" — when nothing passes, keeps its losers as typed data, and `licensedCheck` refuses a check that admits a redeal; Unraveling returns `no_seam` on a cycle and does not mistake two parallel edges for a seam.

Used for the first time on the thing that failed at row 4 (the system showed an invented air-quality sample with nothing fetched). `find-samples.mjs`, from one need phrase: searched (DuckDuckGo lite), read six pages, collected 425 addresses, kept 42 that could be calls, ranked by the need's words, fetched four under a budget of eight, kept the two that were JSON with real numbers (`air-quality-api.open-meteo.com … hourly=pm10,pm2_5`, 370 leaves; `current=…`), refused the xlsx and csv faces by name. The sample shown to a reader traces to the kept bytes; its redeal is `unpaired`; the check is licensed. Ledger and bytes: `native/the-fold/results/find-samples-aq/`. Then `sample-contract.mjs`: for `pm2.5` and `pm10` the local 1.5B coder was asked only *which numbered path holds it* (it pointed at `hourly.pm2_5[0]`, `hourly.pm10[0]`), name evidence and Tracing checked it in four real variants of the call (places moved by declared offsets, each fetched), the bytes were the oracle, and the species `copy` rediscovered the same path from values alone — two independent finds agreeing (`results/sample-contract-aq/`).

**Rows touched:** 4 (discover candidate sources, fetch real samples, record them) — **B** for a need that has an open JSON source; 5 (derive the check by provenance) — **B** for sample fields; 6 (bind a field to its key with evidence) — **B** for data keys, still open for comp labels.

**Still my hand, said plainly:** the three cores; the need phrase and the field words are typed on the command line, not yet read from the prompt; `PLACE_OFFSETS`; the regexes that say what could be an API call; the pick prompt. Not done: the app assembler is still weather/fuel-shaped, so a net-new prompt still ends at the door's `no pack` refusal — the next row to close is a generic assembler that takes bound fields instead of a pack. Tracing proves a value is *found*, not that it *means* what its name says (name evidence is the only support for meaning, and coherence is not correspondence).

## 4g. The stances in the real pipelines, and the first net-new app from a prompt alone (2026-10-01)

**Where they are wired — one handle, every door.** `organs/sample-ground.js` (pure) is what each generation door asks: does this task read an outside service's data with no sample in it (`needsSample`); trace every JSON block an answer SHOWS to fetched bytes (`traceShown`); name a unit that hard-codes a value of the sample (`hardcodedFrom`); the real, trimmed view a prompt may show (`sampleBlock`).
- `runProxyTurn` is now a thin entry over the old turn (`runProxyTurnCore`): with the web open, a task that needs a sample and has none gets one **found and fetched first** (Cultivating, `find-samples.mjs`), admitted as an attachment so chat is grounded on it and handed to the build door; after the answer every JSON block it shows is **traced** and the verdict is *disclosed* on `mechanical.sampleGround` — the mouth's words are never edited (P186). No web / no need / a sample already attached: unchanged.
- `buildCodeTask` (the build door): the unit prompt shows the real sample; each JS unit is **run on it** in an empty context and the address its returned value sits at is recorded (`sample.ran`); a unit that writes a value of the sample into its code is named (`hardcoded_sample_value`); one that throws on it is named (`threw_on_sample`); the plan is cut at its seams (`unraveled`, Unraveling). `describeBuild` says so in plain words.
- The app door: a need no pack grounds, with the web open, goes to `app-generic.mjs` (below) instead of refusing; without the web it refuses as before.
- `capacities.js`: `trace` (EVA·Paradigm) and `cultivate` (INS·Void) registered beside the others; `capacity-map.test.js` passes.

**Live, the build door** (`results/build-door-sample-20261001T045419Z/`): asked for `pm10Of(json)`, `pm25Of(json)` against the Open-Meteo air quality API, with no sample given. It found one (`air-quality-api.open-meteo.com … current=pm10,pm2_5`, sha256 on file), the 1.5B coder wrote `json.current.pm10` and `json.current.pm2_5`, and both units were run on the real response: 14.8 found at `current.pm10`, 10.1 at `current.pm2_5`. Before, the same ask had nothing to run them on.

**Live, the net-new app, prompt only** (`results/net-new-generic4-20261001T045202Z/` — request, response, before/after hashes, proxy log, the seen-ledger of the build, the built app, two screenshots). The prompt is the one from the first net-new ask: *Generate an app that shows the air quality and the sunrise and sunset times anywhere. Use only local models.* The door cut it into three needs (Unraveling), found no pack, and built: an air-quality source (Open-Meteo), a sunrise/sunset source (found by the second need; the third need was already covered by its keys), and a geocoder (found because the data calls take coordinates). Six fields, each a path found by name evidence and traced in fetched variants; the generated server answers a place name; for Paris, Nairobi and Lima every value matched an independent re-fetch. Seen in a browser (`app-paris.png`, `app-nairobi.png`). The earlier attempts of the same afternoon are on file too and failed for named reasons: no geocoder found after a search burst (search backoff added), the 1.5B coder pointing at a units path (the model now chooses only among paths whose own keys carry the field's name; none is a typed gap).

**Rows now:** 4 and 5 **B** (sources found, checks derived by provenance, for a need with an open JSON source); 6 **B** for data keys. **Still hand-made, said plainly:** the cores; the search face and its backoff; the declared offsets and names; the page layout and the generated server template; the field choice falls back to the sample's own request when the prompt names none (`pm10`, `pm2_5` came from `current=pm10,pm2_5`, the address the source's own docs showed). Not done: the label for the app is the needs' words, so it reads "Air Quality · Sunrise"; the app has no comps (layout is one generic card grid, no vision step), so it is not "like" anything; a need with no open JSON source (an HTML-only site) is still a typed gap; a re-fetch minutes later can differ for a live value, and the drive would call that a mismatch.

**Search default, 2026-10-01 (user: "let's default to that").** DuckDuckGo's GET faces (html and lite) answered a burst with the bot-challenge page on every try that connected (7 of 7); a POST to lite returned ten results every try that connected. `organs/web.js::searchRequest` is now the one description of how to ask (lite by POST, the GETs as fall-through, `SEARCH_FACES`), and every search site uses it: `proxy-runner.mjs` (the preflight search and the void fallback), `surf.js`, `comp-research.mjs`, `find-samples.mjs`, and the-fold's `explore-server.mjs::searchWeb` (not booted here: its engine mount is missing in this checkout, so that one is syntax-checked only). Found by running it: the proxy's own search had a regex keyed to the html face's `result__a` class, so the POST face read as `web_no_results` — it now uses the organ's `parseSearchResults`, which knows both faces. Live: "Who wrote Middlemarch, and when was it completed?" searched, read two pages (90k chars) and answered from them.

## 5. Where this stands

- Branch `ccr-a3663d65-cv04ak`, draft PR #148. The comp research, structural reader, leaf generation, stigmergic
  provider ranking and the generated weather/fuel app are all **steered** builds — they are the proof the target
  is reachable and the list of what the system has to learn, not the goal.
- The prompt-only run (§2) stopped at `build-clarify` and then fabricated a page. **That is ledger row 1 and it is
  the first thing to fix.**
- Do not close this out by adding more hand-built apps. Close rows.
