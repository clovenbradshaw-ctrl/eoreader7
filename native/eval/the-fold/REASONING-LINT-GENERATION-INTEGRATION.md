# Reasoning-lint × generation — integration instructions

Handoff for the agent working the generation pipeline. The task: wire
`organs/reasoning-lint.js` into the derive → compose chain so an incoherent
generation is **withheld before it ships**, not merely reported after. The
linter is pure (zero model calls, zero IO); the gate it provides must run
at the point where it can still change what ships (G1/L5), never only as a
post-hoc report.

## Current state — do not assume a blank slate

A post-compose lint **already exists** in `generate-passage.mjs:184-214`:
the composed `items` are mapped to arrangements, admitted into a fresh notes
ledger, and `lintLedger` runs at all three strictness levels. That seat is
kept (Seat 3 below), but it is the *weakest* seat, and today it cannot fire
the checks generation cares about most:

- it lints the **items** (which keep only `claim.depth`, losing the premise
  chain), so the `expired_premise`/`contested_premise` tier sees nothing;
- the derivation was done inside `reaction.js`, never declared as
  `inferences`, so the R1 tier never runs;
- the oracle's verdicts (`judge(f)`) go onto claims for the tally but are
  not consulted by any gate — **a derived fact the oracle calls `false` is
  still composed into the passage today**.

The linter's own acceptance case (its header, §7) is the target: an
expired or contested premise is refused **before** the product is built on
it, a contest is never resolved, and an unlicensed composition never
ships. That is what this handoff wires into generation.

## The three seats

### Seat 1 — at derive (the one that actually refuses)

Run after `substrate.settle(...)` in `generate-passage.mjs`, before any
`items` are built. Two additions:

**(a) Land the derived facts as real derived ledger entries**, so
`lintLedger`'s derived-product tier fires. The shape it needs (read
`lintLedger` at `reasoning-lint.js:272-291` and `derivation.js::derive` at
`derivation.js:389-425`):

- a task entry with `derived: true`, `premises: [noteIds]`, and
  `restsOn: { sources, instruments, contested, grounds }`, typed
  `SYN · Pattern · derived` (`operator_basis: DERIVED`), with
  `witnesses: []` / `spans: []` — **stated nowhere, carried by its
  premises** (derivation.js's own wall).
- every premise note id must resolve in the same ledger (`byId`), and each
  premise's admission-time tag (Seat 1c) must be in the `tags` map passed
  to `lintLedger`.

Simplest route: reuse `derivation.js::derive` (which already produces this
exact shape over the notes ledger) rather than hand-mapping
`settled.derived` edges. If you keep the direct `reaction.js` path, map
each `settled.derived` edge's `meta.parents` → premise ids and build the
row yourself — but do not lose `premises`, `restsOn`, or the
`affordance.giver`.

**Do not rebuild the R1 unlicensed-composition check.** `reaction.js`
already enforces it structurally: an unlicensed pair is `withheldByPair`,
never derived, and a refuted pair is `vetoed` (`reaction.js:366-386`). The
linter's contribution at derive is the **premise-validity tier** and the
**oracle gate** below — not a second license table.

**(b) The oracle becomes the verify gate, not a post-hoc tally.** Today
`judge(f)` runs after composition and false facts still ship. Move the
oracle's verdict into `lintInferences`' `verify` slot:

```js
const verify = (inf) => {
  const v = judge({ relation: inf.yields, a: inf.end1, b: inf.end2 });
  return v === "true"   ? { verdict: "holds", detail: "term dates confirm" }
       : v === "false"  ? { verdict: "false", detail: "term dates refute — sa < eb" }
       :                  { verdict: "unchecked", detail: "term dates unavailable" };
};
```

Declare one inference per derived edge (`{ kind: "deduction", end1, label:
yields, end2, relation: affordance.left, yields, ref }`). A `false` verdict
is `claim_fails_oracle` at `standard` severity ERROR — the derived fact is
then **withheld from the items**, with the finding named. This is G2
(compute what can be computed) and the seed's "refutation is a veto"
applied at generation.

**(c) Admission-time tags from the material's own dates, where they
exist — never invented.** `lintLedger`'s expired tiers need a premise's tag
to carry `validity: { from, until, open }`. If the material has real term
dates (the succession fixture's P580/P582), tag each raw premise with
`regime.js::tagClaim` from those dates. Do **not** fabricate windows where
the material has none — an untagged premise lints with the declared
defaults and the finding says so (`workingTag` in the linter already
discloses a skipped tag). `restsOn.contested` (derivation.js computes it)
is what feeds `contested_premise`.

### Seat 2 — pre-compose pool check (G1/L5)

Before `compose(items, ...)`, admit the **candidate** claims into a fresh
ledger and run `lintLedger` at `"standard"`. Map findings to compose's
existing withhold mechanism instead of letting a flagged claim reach prose:

- add one refusal reason to `compose.js`'s `COMPOSE_REFUSALS` —
  `REASONING_LINT: "reasoning_lint"` — additive, no existing caller
  changes;
- at the **caller** (generate-passage), when a candidate claim is the
  subject of a `standing_contradiction`, `expired_in_conflict`,
  `expired_premise`, `contested_premise`, or `circular` finding, push it
  to `withheld` with that reason;
- compose's `coverageLine` then names what was withheld and why — the
  passage reports its own incompleteness, it does not silently omit
  (P87).

Do not put the finding→withhold mapping inside `compose.js`; compose is a
renderer (P87) and does not know what a linter is. The mapping is the
pipeline's job.

### Seat 3 — post-compose whole-passage check (keep, tighten)

Keep the existing seat (`generate-passage.mjs:184-214`) but run the
**strict** tier over the **composed subset** — what actually shipped — not
over all `items`. This is where a passage that closes in a circle (a
directed cycle spanning claims `compose` joined) or carries a standing
contradiction across adjacent composed sentences is refused, at `strict`.
The gate here is a ship gate: it may refuse the passage, it may not
silently edit it.

If a real reader is the concern, the stronger form is `lintContent` with a
`convert` that re-reads the **rendered text** through the reading
pipeline. For generated succession claims the claims already ARE the EOT,
so this is optional — but say which you did in the commit.

## Laws that bind

- **G1 / L5** (`the-fold/GENERATION-POLICIES.md`): a compliance-critical
  fact is never left to the generator; the gate runs where it can still
  withhold.
- **G2**: compute what can be computed. The linter is pure — run it early
  (Seat 1) and always; it is free.
- **P87** (`compose.js` header): compose withholds with typed reasons and
  reports coverage; never a silent omission.
- **P60 / the seed's R1**: only a named giver's declared affordance
  licenses composition; the veto runs before the licence
  (`reaction.js:353-386`). Do not re-derive either.
- **P102** (`/derive`): a derived product lands on the ledger with
  `premises`/`restsOn`; the ledger tells a reader it is derived, never
  settled.
- **The linter's own ladder**: `report` = disclosure, `standard` = the two
  falsifiable facts (expired/contested premise, standing contradiction),
  `strict` = the deepening (R1, circularity). Seats 1-2 carry
  `standard`; Seat 3 carries `strict`.

## Constraints

- **The linter stays pure.** No model call in any gate. The oracle
  (`judge`) is the one place outside facts are consulted, and it is read
  only by the gate, never by the derivation itself
  (`generate-passage.mjs:27-28` keeps this true).
- **Never tune a threshold or shape a finding away.** If the oracle
  refutes facts at the real parameters, that is the material — withhold
  them, do not loosen the verdict.
- **Never invent a premise tag or a license.** No fabricated validity
  window, no giver-less affordance. A skipped tag is disclosed, not
  guessed (`workingTag`).
- **Do not break what exists.** The post-compose demo output, the
  `reasoning-lint-demo.mjs` acceptance cases, and
  `native/tests/reasoning-lint.test.js` must keep passing. The generation
  integration is additive.

## Acceptance — what the agent must show

1. `node eval/the-fold/generate-passage.mjs` prints, **before** the
   passage:
   - at derive: the oracle-refuted derived facts as findings, and those
     facts **absent from the composed passage**;
   - the premise-tier findings where a derived product rests on an expired
     or contested premise;
   - at compose: `withheld` counts naming `reasoning_lint` reasons where a
     candidate failed the pool check.
2. `coverageLine` names what was withheld and why — no silent omission.
3. New tests pin the walls, built to fail one way and pass the other
   (the repo's standing test discipline, II.23):
   - a derived fact the oracle refutes is withheld from composition
     (a planted false succession fact);
   - a derived product on an expired premise is refused at `standard`
     (an ordinance-with-sunset-shaped premise in the fixture);
   - a standing contradiction between two candidate claims at one address
     is withheld before prose, never composed;
   - the existing post-compose seat still runs at all three strictness
     levels.
4. Full native suite green (`node --test` from `native/`), the same
   pre-existing failures only.