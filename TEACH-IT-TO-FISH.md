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

## 5. Where this stands

- Branch `ccr-a3663d65-cv04ak`, draft PR #148. The comp research, structural reader, leaf generation, stigmergic
  provider ranking and the generated weather/fuel app are all **steered** builds — they are the proof the target
  is reachable and the list of what the system has to learn, not the goal.
- The prompt-only run (§2) stopped at `build-clarify` and then fabricated a page. **That is ledger row 1 and it is
  the first thing to fix.**
- Do not close this out by adding more hand-built apps. Close rows.
