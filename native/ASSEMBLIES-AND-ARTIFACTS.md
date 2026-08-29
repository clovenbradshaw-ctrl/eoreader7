# Assemblies and artifacts — a process for stable subassemblies in eoreader7

Status: proposal v0.1, 2026-08-29, received as a spec document; landed in this
repo the same day with migration steps 1–5 executed (see **Status of the
migration** at the end — steps 6–9 are deliberately not attempted, each with
its reason). Nothing below changes reading behavior by itself; every
behavioral change lands under V7-CUT's compatibility law (native replaces
legacy only under conformance) and every rule states what would refute it.
Written against eoreader7@18b4280 with the frozen `legacy-eoreader6.1`
submodule at e20e441.

Givers, named up front. The subassembly criterion is Herbert Simon's ("The
Architecture of Complexity", 1962 — Hora and Tempus; near-decomposability as
a claim about interaction rates). The assembly discipline (contract →
assemble → set down → verify → compose) is the `writing-code-in-eo` skill's
own two laws, imported from the application layer into the engine's process.
The composition law is READING-SPEC S9 (Koestler), applied at assembly scale.
Everything else is promotion of rules the repo already holds, cited at point
of use.

## §0 — The problem, measured, not asserted

Four independent observations, all from the current tree, all one failure
shape — the organism is the only unit that exists:

1. **One CI gate certifies everything.** `native-frankenstein.yml` runs the
   whole pipeline; a Lens-layer regression blocks an Entity-layer ship, and a
   green run says nothing about which layers carried the result.
2. **The scoreboard read as dead when one assembly was absent.**
   `understanding-scoreboard-RESULTS.md` v1: tension/release measured zero
   across a whole novel because obligations (one input stream) had no
   producer — and the honest sentence available was "the dynamics vocabulary
   is functionally starved," not "the obligation assembly is absent and
   everything else ran." Typed absence existed for gaps inside organs and
   not for whole subsystems.
3. **Assemblies exist only as eval drivers.** S1's own remedy — "an assembly
   with a name and a stagesNotRun list" — is currently a prose convention.
   `constitutional-read.mjs`, `causal-extraction.mjs`,
   `understanding-scoreboard.mjs` each hand-wire a different organ set, and
   which stages ran is recoverable only by reading the driver.
4. 4 of 198 native tests fail for environmental reasons (imports through an
   uninitialized submodule, missing priors) and nothing distinguishes those
   failures from real ones at the suite level. A subassembly that cannot say
   what it depends on cannot say what its failure means.

The revision in one sentence: make the assembly a first-class, contracted,
checkpointable object, and make its products first-class,
provenance-carrying projections — so that any prefix of the terrain lattice
is a complete working system, absence is typed rather than zero, and a
refuted subassembly concedes wholesale instead of leaving orphans.

## §1 — Law A1: an assembly boundary is a persistence boundary

The stability criterion is already in the codebase; this law only names it.
P1 ("activation decays, identity does not, recall is retrieval") and S10
(three classes of math, one per tier) partition all state by timescale.
Simon's near-decomposability is exactly a timescale claim — fast dynamics
bind within a subassembly, slow dynamics bind between them — so the
partition IS the assembly map:

| tier (S10) | persistence | assembly role | may cross a boundary? |
|---|---|---|---|
| arithmetic (counts, logs, identity) | monotone, never retreats | artifact-able — sealable, portable | yes, as an Artifact (§3) |
| geometric (activation, presence, margins) | decays | runtime-only — the glue of one live read | never serialized |
| transcendental (nulls, TE, standing) | granted per material | re-granted — verdict records travel, standing does not | verdict record only |

Three sub-rules, each with its refutation named:

**A1.1 — Decay is never serialized.** No Artifact carries activation,
presence, or any `γ^(now−t)` quantity. "The reach of the present" cannot be
checkpointed because by resume-time it isn't the present.
Refuted by: a measured case where resuming a read without re-warming
presence produces a materially worse reading than a serialized-presence arm
— run both, predictions frozen first, before ever relaxing this.

**A1.2 — Standing is re-granted, never transferred.** A network-standing or
null verdict travels as a record (draws, seed, alpha, material hash) and
conditions nothing on new material until re-run against that material's own
null. This is `network-standing.js`'s existing rule promoted to the
boundary.

**A1.3 — Only the arithmetic tier ships.** Identity ledgers, relation
vocabularies, declaration registers, sequence declarations, experience and
rhythm priors, and the log itself are the complete list of what an Artifact
may contain. Anything else in an Artifact is a spec violation found by grep
(§7).

Why this prevents the two known failure shapes: serialized belief-state was
the two-incompatible-cube-ports drift (eoreader5, per CUBE.md) — two copies
of derived truth diverging; serialized presence is stale attention wearing
memory's name. A1 makes both structurally impossible rather than reviewable.

## §2 — Assembly@1: the named thing measurements attach to

An assembly is a registry object, not a directory. Same contract shape at
every scale (the skill's Law 1 — one shape, learned once):

```
Assembly@1 {
  id,                    // "assembly:entity", "assembly:link", ...
  version,               // bumped on any organ or regime change
  contract: {
    ops,                 // which of the nine this assembly may emit
    terrains,            // where its events may land
    stances,             // how its events may resolve
  },
  organs,                // module list, by path — the implementation
  regimes,               // every declared dial: floors, windows, budgets,
                         //   each with { value, giver, basis } (S16: every
                         //   dial is a prior awaiting the material's own
                         //   measurement — the giver field is mandatory)
  consumes,              // Artifact kinds accepted, each tagged prior|witness
                         //   (witness is only lawful from the same read — §4)
  produces,              // Artifact kinds this assembly can seal
  stagesNotRun,          // S1's list, now a field, not prose
  dynamics,              // which of surprise/tension/release it feeds (§6)
}
```

Rules:

**A2.1 — Every measurement names its assembly.** S1 already requires this
for claims; the change is mechanical: eval drivers construct an `Assembly@1`
and stamp its id+version on every result JSON. A result without an assembly
stamp is quotable as nothing.

**A2.2 — The registry is append-only.** New versions supersede; nothing is
edited in place (change arrives as a new assembly, never as an edit inside
an old one — the skill's C.3 evolution pattern, and task-log.js's own
discipline).

**A2.3 — Contracts are narrow by default and widened only by logged REC.**
An assembly emitting outside its declared ops/terrains is refused at
`applyDelta` — cheap to check, since every `EOOperation@1` already carries
its cell.

**A2.4 — The kernel is not an assembly.** `fold.js`, `cube.js`, `reading.js`
are the substrate assemblies run on. The dependency law
(spec ← kernel ← priors/adapters ← host ← applications) is untouched;
assemblies live at the adapter/host layer and below nothing.

The first registry, derived from the terrain lattice (domain × grain), with
its current honest state:

| assembly | terrains | organs (existing) | state today |
|---|---|---|---|
| entity | Entity, (Void for its refusals) | surfaces/discoverReferents, identity.js, anchoring, pronouns, contest | strongest: goldens, precision measured, floors declared |
| link | Link, Field | relations.js, hypergraph, relation-composition | measured, causal arm honest (S2/S3) |
| network | Network | network-standing, terrain-math | organ exists; "P6's substantive product, never run natively" |
| kind | Kind | kind-induction, entity-kind-induction | organ exists, thin evidence |
| lens | Lens | perspective.js | organ exists, unmeasured on real material |
| atmosphere | Atmosphere, Paradigm | experience-priors, rhythm-priors, emergent-terrain | rhythm transfer measured (0.469/0.512) |
| sequence | (cross-cutting: Link at position grain) | sequence.js, refutation.js, reaction.js, hyperlexicon | admitted by measurement 2026-08-28 |
| dynamics | (derived) | dynamics.js + per-assembly feeds | §6 |

The table is the starting registry, not a claim that these cuts are right —
each boundary is refutable by A4.2's own test.

> **Landing note (2026-08-29).** The registry lives in `native/assemblies.js`
> (content) over `native/kernel/assembly.js` (mechanics). One finding,
> recorded there rather than silently edited: the entity row's organs emit
> cells whose CUBE-derived terrains include Link (CON/SEG·Figure) and Lens
> (DEF/REC·Figure), wider than this table's "Entity, (Void)" column —
> terrain derives from an operator's domain, not from an assembly's subject.
> The declared contract carries the measured union; whether identity's
> CON/SEG/DEF/REC belong to entity or link is exactly a step-6 severance
> question.

## §3 — Artifact@1: a sealed projection of the log

An artifact is what an assembly sets down. It is Hora's bench, not a
database: always re-derivable from the log, never authoritative over it.

```
Artifact@1 {
  kind,                  // "CastLedger@1", "RelationLedger@1",
                         // "DeclarationRegister@1", "SequenceRegister@1",
                         // "StandingRecord@1", "ExperiencePrior@1" (exists),
                         // "RhythmPrior@1" (exists), ...
  producer,              // { assembly, version }        — who sealed it
  material,              // { source, hash, extent }     — what it was read from
  regime,                // the producer's regimes, verbatim — S7: priors
                         //   injected are stated; their absence is stated too
  dropped,               // S12: what the source carried that this artifact
                         //   does not — declared at seal time, because that
                         //   is where consumers' collapses come from
  body,                  // arithmetic-tier content only (A1.3)
  sealedAtSequence,      // fold position at seal
}
```

**A3.1 — Sealing is a checkpoint.** An artifact is sealed only after its
assembly's own conformance passes on the material it was derived from (the
skill's `!EVA` set-down, engine-side). An unsealed projection is scratch and
may not cross a boundary.

**A3.2 — Artifacts are cheap and disposable.** Any artifact regenerates
from the log + producer version. A consumer finding a version mismatch
regenerates rather than adapts; adapters over stale artifacts are how a
second source of truth is born.

**A3.3 — Existing objects are grandfathered, not duplicated.**
`EOExperiencePrior@1` and `EORhythmPrior@1` already satisfy this shape minus
the `dropped` field; they gain the field and the seal, they are not rebuilt.
`experience-priors.js`'s contract line — "nothing from the target enters the
prior; memory is never witness" — is A4.1 already stated, and is cited as
this spec's precedent, not replaced.

## §4 — Composition: S9 at assembly scale, and the prefix property

**A4.1 — An artifact from any other read enters a new read as a prior: it
nominates and never admits.** This is the whole interface. Upward (S9): the
material's own tokens set what is possible; no sealed cast, however good,
admits a referent the new material does not attest. Downward: an artifact
conditions expectation — which possible is heard — exactly as
`received_prior` nominations already flow through perceive → witness today.
The moment a sealed cast admits a being without fresh witness, the
descriptor-being admission (levers-RESULTS) has recurred one level up.

Within one read, an assembly's product is witness for the next stage — that
is just the pipeline; A4.1 governs the boundary between reads and between
independently-run assemblies.

**A4.2 — Any prefix of the lattice is a complete system.** `entity` alone
is a shippable cast extractor; `entity+link` a triple extractor with no
Network present; and so on up. This is the literal sense of "it doesn't
have to ALL work": absence of an upper assembly is typed
(`assemblyAbsent: ["network", ...]` on every result), never rendered as a
zero in that assembly's metrics. The scoreboard failure in §0.2 becomes
unrepresentable.

Refutation test for a boundary: if severing an assembly from everything
above it changes its own conformance results, the boundary is drawn through
fast dynamics and must move. Run per boundary, once, predictions frozen; a
failed severance is a finding about the cut, appended here.

**A4.3 — The glue between live assemblies in one read is the decaying tier,
and only there.** Presence (terrain-activation) is the shared medium;
assemblies communicate through what the read has lit, not through each
other's internals. This is the stigmergy rule the project already holds
(trace-not-message), stated as the inter-assembly channel.

## §5 — Concession and cascade: containment is what makes partial safe

Partial function is only safe if partial failure is contained.

**A5.1 — Every fold contribution carries its producer.** Observations
already carry `provenance.perceiver`; operations gain `provenance.assembly`
(id+version). One field, stamped where deltas are built.

**A5.2 — A refuted assembly concedes wholesale.** Generalize
`derivedUnder({giver})` and the pruning-with-cascade work (7d41140) from
per-affordance to per-assembly: `derivedUnder({assembly})` surfaces every
standing contribution, and one REC concedes the set — named trigger, no
silent overwrite, evidence never deleted (the declarations.js discipline,
pointed at a bigger object). A concession that cannot enumerate what it
re-zeroes is a version bump wearing an operator's name — reaction.js's own
sentence, now enforceable at the scale it was written for.

**A5.3 — Downstream consumers of a conceded artifact are notified, not
rewritten.** Their results gain `derivedUnderConceded: [...]` — the S19
pattern (a veto stops future derivation and cannot un-derive the past),
applied to assemblies.

## §6 — Dynamics per assembly

`deriveSurprise/deriveTension/deriveRelease` become per-assembly, with the
global read a merge over present assemblies plus typed absence for the rest.
The identity assembly already has a complete local cycle
(alternatives → attacks → REC; 11 vs 2/1 at floor 2) — under this section
that result is reported as `dynamics.identity`, not as "the reader's"
dynamics, and the obligation assembly's absence stops zeroing everyone
else's release. The deferred deriveTension quadratic (~4B comparisons at
~1,600 obligations) becomes tractable the same way: tension networks are
computed within an assembly's obligation set first; cross-assembly tension
is its own, later, measured question.

## §7 — Conformance: how each law is pinned

Mechanical where possible, in the repo's existing style (the contest.test.js
grep precedent — generality asserted by reading the executable body):

1. `assembly-registry.test.mjs` — every eval result JSON carries a
   registered assembly id+version (A2.1); registry is append-only (A2.2).
2. `artifact-tier.test.mjs` — greps sealed artifact bodies for forbidden
   quantities (activation, gamma-decayed values, presence snapshots) and
   fails on any hit (A1.1/A1.3); every artifact carries `dropped` (S12) and
   `regime` (S7).
3. `artifact-prior-boundary.test.mjs` — a consumer given a sealed cast over
   material that does not attest a referent must not admit it (A4.1); the
   test is a fixture where the artifact "knows" a being the text lacks.
4. `prefix-severance.test.mjs` — per registered boundary, assembly
   conformance is byte-identical with everything above it absent (A4.2).
5. `concession-cascade.test.mjs` — conceding an assembly enumerates and
   re-zeroes exactly its `derivedUnder` set, evidence retained (A5.2).
6. CI splits by assembly. The Frankenstein gate remains as the
   organism-level integration check; beside it, one job per assembly, each
   red only for its own failures — and the four environmental failures in
   §0.4 become one missing-dependency line in the affected assemblies'
   `stagesNotRun`, visibly not a regression.

## §8 — Migration order, Hora-style

Each step is itself a set-down: it must hold alone, under conformance,
before the next begins. Change arrives as a new assembly, never as an edit
inside an old one.

1. Registry + stamping (A2). No behavior change; eval drivers construct
   `Assembly@1` and stamp results. Set-down: test 1 green; every existing
   RESULTS file's assembly reconstructed and recorded.
2. Seal the two artifacts that already exist (A3.3): ExperiencePrior,
   RhythmPrior gain `dropped`/`regime`/seal. Set-down: test 2 green on
   both; rhythm-transfer eval reproduces byte-identical through the sealed
   path.
3. CastLedger@1 from the entity assembly — the strongest candidate first
   (goldens exist, precision measured). Set-down: tests 2+3 green;
   constitutional read reproduces its own referent output from
   log → artifact → regenerate round-trip.
4. Typed absence in the scoreboard (A4.2's reporting half).
   Set-down: scoreboard on entity-only prefix reports
   `assemblyAbsent: [...]` and non-zero identity dynamics.
5. Provenance stamping + cascade (A5). Set-down: test 5 green on a
   synthetic concession.
6. Severance tests per boundary (A4.2), predictions frozen first; failed
   severances appended here as findings and boundaries redrawn.
7. Per-assembly dynamics (§6). Set-down: the floor-2 REC result re-reported
   as `dynamics.identity`, numbers unchanged.
8. RelationLedger@1, DeclarationRegister@1, SequenceRegister@1 — in that
   order, each its own set-down.
9. Only now, new capability: the continuation-generation assembly,
   re-earned natively against a Void/Field + declared-artifacts prefix —
   consuming CastLedger and RelationLedger as priors, needing nothing above
   them to exist. The legacy `packages/engine/generation/` is its attempt
   log (S8): read before attempting, cite what is built on or departed
   from.

Steps 1–5 are pure promotion — no reading behavior changes, so V7-CUT's
compatibility law is satisfied trivially. Step 6 is where a boundary can be
refuted; step 9 is the first thing this spec makes newly possible.

## §9 — Pre-registered predictions

Recorded before any migration step runs, so hits and misses are both
reportable:

**P-a.** Severance (test 4) passes for `entity` and `link` unchanged, and
fails for `dynamics` as currently drawn — dynamics is not an assembly but a
projection, and the failure will force §6's per-assembly split rather than
a dynamics boundary.

**P-b.** The CastLedger round-trip (step 3) is byte-identical; if it is
not, the difference will be in `ambiguous_surface` gaps (the S17-type
residual) — the known place where type-level output depends on
occurrence-level state.

**P-c.** Re-running anchoring-precision with the cast supplied as a sealed
artifact-prior (A4.1) rather than in-read state changes nothing — if it
improves results, priors are admitting (a violation found, not a win).

## §10 — Non-goals and disclosed risks

**Not a rewrite.** V7-CUT: strip only under conformance. Every section
above is promotion of an existing rule to a bigger object; the two new
schemas are the entire new surface.

**Artifact drift is the failure this courts.** The mitigation is A3.2
(regenerate, never adapt) plus version-stamping; the two-cube-ports drift
is the named precedent and test 2's version check is its wall.

**Assembly scores invite Goodhart.** Per-assembly CI must gate on
conformance (behavior pinned), never on eval metrics — the nikanti rule,
applied to assemblies: a score is instrumentation, not a target.

**The S14 fossil gets a seam, not a fix.** Per-assembly task logs make
`OPERATOR_ORDER`'s eventual correction smaller (one assembly's conformance
pass at a time), but this spec does not change the constant.

**Two S17 entries exist in READING-SPEC.md.** Before this spec's rules are
appended there, the duplicate numbering is resolved (the spec as received
said: renumber the second S17 with a correction note; S16/S20
cross-references updated). *Resolved differently at landing, disclosed:* a
prior pass had already recorded the standing decision "Not renumbered —
that would break those citations" (the-fold POLICIES.md, the prior-art lint
amendment: both S17s are cited externally, with BOTH meanings). So neither
entry moves; the second S17 gains a correction note naming the collision
and giving each entry a citable alias (S17-recall / S17-type), and new
entries continue in sequence past S23 — the ambiguity is resolved without breaking a
single existing citation, which is the outcome the spec's own "cheap now,
expensive after more entries cite them" clause was after.

**The registry's cuts are hypotheses.** §2's table is refutable per
boundary by test 4; a redrawn boundary is a finding appended here, never a
silent edit.

---

## Status of the migration (landing pass, 2026-08-29)

Executed, each its own set-down, in order:

1. **Step 1 — landed.** `kernel/assembly.js` (mechanics),
   `assemblies.js` (the starting registry, §2's table plus the
   constitutional-host baseline), stamps in the three drivers §0.3 names,
   `eval/results/assembly-reconstruction.json` (every existing RESULTS
   file's assembly reconstructed from its driver's own imports — recorded,
   never stamped retroactively into files their drivers didn't stamp),
   `conformance/assembly-registry.test.mjs` green.
2. **Step 2 — landed.** `kernel/artifact.js` (the seal, the tier wall, the
   producer-mismatch check); ExperiencePrior/RhythmPrior seal wrappers with
   declared `dropped`; `conformance/artifact-tier.test.mjs` green,
   including the derive → seal → body byte-identity pin at fixture scale.
   The full rhythm-transfer eval needs the book texts, which this
   environment does not hold — the byte-identity property is pinned by
   test; the driver seals on its next real run.
3. **Step 3 — landed.** `kernel/cast-ledger.js` (derive + conformance +
   seal, deterministic), `adapters/text/cast-prior.js` (a sealed cast as a
   received prior: nominates only what the new material attests),
   `conformance/artifact-prior-boundary.test.mjs` green — the fixture
   where the artifact "knows" a being the text lacks admits nothing. The
   round-trip (log → artifact → regenerate) is pinned at fixture scale
   through the real recursive reader; the constitutional (legacy-host)
   round-trip needs the submodule, absent in this environment — named,
   not implied done.
4. **Step 4 — landed.** The scoreboard reports `assemblyAbsent` (typed,
   computed from the register over lattice rows only, never hand-listed)
   and `dynamics.identity` with typed absences for the feeds no present
   assembly produces (tension/release), instead of zeros. Pinned
   mechanically in `assembly-registry.test.mjs`; the live rerun on real
   material needs the POS prior and a book text, both behind this
   environment's uninitialized submodule — named, not implied done.
5. **Step 5 — landed.** `eoOperation` carries optional `provenance`;
   `reviseTextFold` stamps when its caller names the producing assembly
   (byte-identical when absent); `contributionsOf`/`concedeAssembly`/
   `concededAssemblies`/`derivedUnderConceded` in `kernel/assembly.js`;
   `conformance/concession-cascade.test.mjs` green on a synthetic
   concession.

Deliberately NOT attempted, named rather than implied:

6. **Step 6 (severance runs)** needs real materials and frozen predictions
   per boundary — a measurement pass, not a promotion pass. §9's P-a/P-b/P-c
   stay recorded and unrun.
7. **Step 7 (per-assembly dynamics)** is gated behind step 6's verdict on
   the dynamics row (P-a).
8. **Steps 8–9** (RelationLedger/DeclarationRegister/SequenceRegister;
   continuation generation) are their own set-downs, in the declared order.
9. **§7.6 (CI split by assembly)** touches workflow files owned by the
   repo's CI arrangement; the per-assembly conformance files this pass adds
   are the pieces such a split would run per-job.
