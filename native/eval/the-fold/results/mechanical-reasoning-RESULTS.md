# Mechanical reasoning over the reaction substrate — measured (2026-08-28)

Driver: `eval/mechanical-reasoning.mjs` (re-runnable; writes
`eval/results/mechanical-reasoning.json`, committed). Engine mechanism:
`eoreader7/native/kernel/reaction.js` (new this pass — see the-fold
POLICIES.md P60 and eoreader7 `native/READING-SPEC.md` S18). Material: the
three committed Wikidata fixtures (`eval/fixtures/wikidata/` — Q273546
Hannibal Hamlin, Q8612 Andrew Johnson, Q11699 the VP office; real captured
EntityData, P56's own fixtures). Nothing hosted, no model call anywhere in
the run: every number below is mechanical.

## The circle, end to end

26 succession facts read off P39 `replaces`/`replaced_by` qualifiers, every
one addressed into the received file's own bytes and self-verified before
use (P5.2; 0 unaddressed). All 26 admitted through the-fold hyperlexicon's
own door (P57): **25 notes — the repeat folded, not duplicated**. The one
fact stated by BOTH person-fixtures (Andrew Johnson —replaces:Q11699→
Hannibal Hamlin) landed as ONE note with TWO witnesses and two byte
addresses (`wikidata/Q273546.json#28963-28975`,
`wikidata/Q8612.json#26322-26336`) — P57's corroboration mechanism, live on
real received data.

Projected into the engine's edge shape (`predigest.js::assertionEdges`,
endpoint identity disclosed as the assertion log's own), the notes became a
reaction substrate.

## Arm 1 — control: no given chemistry, nothing derives

Empty hyperlexicon: **0 derived, 41 withheld pair types**, quiescent. Every
chain site the material offers — including the cross-office ones — is
reported with its standing (`unknown`), never silently dropped. Nomination
is not reasoning permission; absence of a giver is absence of a licence.

## Arm 2 — chemistry: per-office closure, gated, with provenance

The declared chemistry: for each office qid, `closureAffordances({ base:
"replaces:<office>", yields: "after:<office>", giver })` — four rows per
office, one giver sentence naming the semantics. Office-scoping is a
soundness argument, not tidiness (cross-office composition through a shared
person is unsound; the driver's header carries the proof sketch), and the
relation string carrying the office means cross-office chains never bond by
construction.

**The tenure gate, found by running it (P5.5).** The first run derived BOTH
directions of one Senate pair — Hamlin held the seat for multiple terms, and
a person-level bridge conflates two different tenures. "The same person" is
not "the same tenure" — the referent-model lesson (P30/P38) at the term
level. The gate: an office's chemistry is licensed only where
`replaces:<office>` is **functional and inverse-functional over persons in
this material** (nobody begins or leaves the office twice) — HL's R2
vocabulary, checked by refutation search. Measured:

- **6 offices licensed** (VP, presidency, two governorships, military
  governor, minister to Spain), **1 refused: Q4416090 (United States
  senator)**, with the refuting evidence named — Hannibal Hamlin began that
  office against 3 distinct predecessors and left it toward 3 distinct
  successors in this material alone; Andrew Johnson 2 and 2.
- Per the grain theorem the licensed six are *unrefuted-at-this-stage*
  promoted by a **named process-giver** (the driver, `declarations.js`'s own
  promote() wording) — a declared risk with its check disclosed, never a
  fact a corpus proved.

**Result: 9 never-stated facts derived, quiescent in 3 steps** (19→7→0
before the gate; 8→1→0 after), each carrying its giver, its depth, its path
count, and a provenance walk that bottoms out at byte addresses in the
received files. The headline pair, labels verified against live wikidata.org
(2026-08-28) since the fixtures carry only their own entity's labels:

- **Q34836 (Ulysses S. Grant) held Q11696 (the presidency) after Q91
  (Abraham Lincoln)** — stated by no fixture; derived through the bridge
  Andrew Johnson from `wikidata/Q8612.json#22291-22304` +
  `wikidata/Q8612.json#22062-22072`.
- **Q310852 (Schuyler Colfax) held the VP office after Q273212 (John C.
  Breckinridge)** — depth 2, 2 independent derivation paths, through BOTH
  Johnson and Hamlin, witnesses spanning both person-fixtures.

44 pair types stay withheld with reasons (the refused Senate office and
every cross-office adjacency).

## Arm 3 — physics: the reaction front is visible

Fresh substrate, window 8 (declared), cue = Hamlin alone, floor 0.05.
Trace: **step 1 reacted 53 / derived 5, step 2 reacted 42 / derived 4,
step 3 reacted 1 / derived 0 — quiescent at the same 9 facts.** The front
propagated person-to-person: the cue lit Hamlin; step 1 derived only facts
whose chains touch him; those products lit Johnson; step 2 derived
Johnson's presidency/governorship facts. Reasoning reached the far facts
because the careers are genuinely connected — reach is earned one
bridge-hop per step, never a similarity flood (memory/activation.js's own
measured refusal, honored: multi-hop reach comes only through licensed
composition, each hop its own act).

## Arm 4 — the compiled priors gate, refusing honestly

`eval/results/compiled-priors.json` (111 works — see
`predigest-priors-RESULTS.md`) loaded; 9 composition candidates observed in
this material at the ≥2-independent-witness floor; **0 nominated** —
`nominateFromExperience` found no cross-work memory of `replaces:<qid>` in
the canon corpus. The gate refusing chemistry the reader's experience never
met is the measurement, not a failure: cross-work memory cannot vouch for
forms it has not seen.

## Disclosed limits

- **Address precision.** A fact's span points at the first place the file
  states that qid as a value (self-verified bytes), not the exact qualifier
  node of that statement — real bytes stating the fact's object, disclosed
  as such.
- **Endpoint identity** is the assertion log's own normalized string (here:
  qids, so identity is real by Wikidata's own giver); on prose material it
  is NOT cast.js referent identity — carried on every participant as
  `identity: "assertion-log"`.
- **The finer tenure gate** — refusing only chains whose *bridge* person is
  multi-tenure, keeping single-tenure bridges inside a refused office — is
  named future work; the reaction substrate consults affordances per
  relation pair and has no per-bridge veto hook today.
- **Labels** for entities without fixtures render as unresolved qids in the
  committed JSON; the names in this document were verified against live
  wikidata.org and are cited to it, never resolved silently by the driver.
