# THE-ENZYME-PIPELINE — the n-dimensional spec

*Written 2026-09-29, answering a direct question asked while battering the
channel: "most AI coding is in essence 2D — can it be done in n dimensions?
LLM output collapses onto one answer; the fold can hold the infinite."
Standing: **specification** — every claim below is checkable against the
code it names, and where the mechanism does not exist yet, the spec says
so and the migration phase names the file to change. Where a control would
falsify a claim, it is written beside the claim. The code wins any
disagreement; the falsifying control wins any argument about the code.*

## 0. The thesis — one paragraph

**The model is a 1D projector: it maps an n-dimensional possibility space
onto a token stream. The pipeline is the n-dimensional machinery around the
projector. The fold is the record that keeps what the collapse discards.
An n-dimensional pipeline does not make the model n-dimensional — it
distributes the collapse (one small collapse per grain, per revision,
per thread, never one total collapse), and holds every fiber: everything
the collapse could have been but wasn't, recorded or explicitly released,
never silently destroyed. A system with a fold is unitary: nothing it
considered is lost. 2D coding is non-unitary: the answer destroys the
possibility space.**

The void is the fiber defined before collapse. The envelope is the fiber
carried after collapse. This spec makes both structural.

---

## 1. The material — the artifact tensor

The artifact (the answer, the document, the code) is not a text. It is a
set of cells on an addressable tensor:

```
address = (grain, position, revision)
grain   = sentence | paragraph | section | whole     (the holonLevels, validated: B7)
cell    = { point, fiber }
point   = the collapsed content at that address — one text
fiber   = the record around the point — see §6
```

This extends the existing cube address (`op·grain`, `native/kernel/cube.js`)
with two axes the cube never carried: **position** and **revision**. The
cube names WHAT kind of cell; the tensor names WHERE and WHEN.

Invariants:

- **I-address.** Every cell has one address; an address has one cell.
- **I-one-writer.** Each address has exactly one writer (its owning level).
  An annotation from another level is a NEW cell (same grain, next
  revision or side-channel), never an in-place edit. A lock is the
  evidence that this invariant was violated.
- **I-append.** The artifact only grows. Nothing is deleted in place;
  release is a recorded act (a typed gap), never an erasure.

## 2. The enzymes — stages with binding sites

Each pipeline stage is an enzyme: it binds a feature of the material, and
is unchanged by the binding (deformation allowed, recovery structural — the
induced-fit rule). The feature is an (operator, dimension) pair from the
nine operators (NUL SIG INS SEG CON SYN DEF EVA REC) × the dimensions
(sequence, grain, framing, provenance, time, negative).

| Enzyme | Level | Binds (feature) | Product | ATP | Regulation |
|---|---|---|---|---|---|
| DEF | L0 | task → void's 27 cells | the plan (once) | none | **commitment point** |
| Swarm | L0 | hard meaning, framings | surviving reading + anti-matter | none | pre-gate, zero tokens |
| Compose (Wolfe) | L1 | a section's cell | draft section | model | family cap |
| Verify (Ranke) | L2 | paragraph vs ground | Kelsen verdict; rewrite only ≥ 0.9 | model | family cap |
| Cite | L2/L3 | claim → source | verbatim SOURCES | model | family cap |
| Fact gate | L3 | sentence vs source | `[S#]` tag or mouth-prose | **none** | none — free concurrency |
| Race | any | settled mechanism | computed answer, `superseded` | **none** | none |
| Edit (Murch) | L1 | finished sections | edit pass | model | family cap |
| Meno | L0 | artifact vs void | satisfaction verdict | none | final gate |
| Envelope | L0 | all cells | the fiber bundle | none | final gate |

Two enzymes may touch the same material; they must never bind the same
feature at the same address-prefix.

- **I-orthogonal.** No two enzymes share an (operator, dimension) at the
  same grain. If two must, they are ONE enzyme with a conflict — merge
  them or re-feature one.
- **I-atp.** Model-call concurrency is bounded by `familyCap` (currently
  2, live-measured). Mechanical enzymes (fact gate, race, swarm, DEF,
  Meno, envelope) have no ATP cost and no cap: they are the free
  concurrency of the pipeline.
- **I-single-grain.** No model call receives material from more than one
  grain. Enforced at `streamOllamaChat` (`proxy-runner.mjs:2715–3113`),
  the single choke point: a prompt audit rejects a multi-grain payload
  with a typed gap. This is what makes the collapse distribution
  enforceable — the model only ever collapses one grain at a time.

## 3. The dataflow — substrate channeling

Stages are connected by bounded queues of shaped intermediates, never a
shared buffer. The intermediates: void cells (L0→L1), finished sections
(L1→L2), verified paragraphs (L2→L3), tagged sentences (L3→envelope).
The session (`x-er7-session`, one accumulating fold) is the channeling
tube: the material is handed from turn to turn without re-entering the
pool.

- **I-channel.** Every handoff is a shaped molecule with an address. No
  two stages exchange raw text.
- **I-backpressure.** Every queue is bounded; a full queue blocks only
  its upstream stage. The memory gate's law applies to queues: hope is
  not headroom — a queue sized by hope hangs the pipeline.
- **I-dag.** Stage dependencies form a DAG. If L2's verdict depended on
  L3's tags, they would be one enzyme, not two — merge or re-grain.

## 4. The threads — concurrency by orthogonal binding

One thread per level, running on the same material:

```
T0  L0  DEF the void once → watch Meno at the end
T1  L1  Compose ×N (one thread per section — each section is a distinct molecule)
T2  L2  Verify + Cite, as sections arrive
T3  L3  Fact gate, as verified paragraphs arrive — fully parallel, no ATP
T4  any Race, beside every model draw — the loser rides the envelope
```

Threads communicate only through the queues of §3. No thread reads
another thread's mutable state. The queue is per person (one place per
person, `heimdall.mjs:267–269`); the cap is per family; the host picker
is kinetic (resident first, shortest wait — an enzyme's Km/Vmax, not a
scheduler).

- **I-lockfree.** No mutex, no shared mutable buffer between levels. If a
  lock appears during implementation, the design is wrong, not the code.

## 5. The collapse distribution

Collapse is the model's act — sampling a distribution onto one token
stream. The pipeline does not forbid collapse; it distributes it:

| Grain | Collapse | Point | Fiber kept |
|---|---|---|---|
| sentence | fact gate | sentence + `[S#]` tag | candidate sources not used |
| paragraph | Kelsen | paragraph + verdict | ground edges below 0.9 |
| section | Compose draw | section + revision | rejected continuations, terrains not touched |
| whole | Meno | artifact + satisfaction | unsatisfied void cells (typed gaps) |

The invariant: **a collapse is local and its fiber is recorded before the
next collapse.** No total collapse: the artifact is never passed whole to
the model in one call (I-single-grain). The old sequential pipeline
(composition plan → Wolfe → Ranke → Murch → citations → fact gate →
Meno, `proxy-runner.mjs:5063–6461`) is the total-collapse form: every
draw sees the whole accumulated artifact. The enzyme form collapses per
grain and stacks the grains in the fold.

## 6. The fold — the fiber schema

The fold is the set of all cells ever collapsed, with their fibers.
"Can the fold hold the infinite?" — not infinite storage (the ledger
folds hourly then daily then releases, `heimdall.mjs:412–651`); but
**infinite-dimensional capacity in finite storage**: the fold holds
structure, not points.

Every cell's fiber carries, by slot:

```
fiber = {
  framings:   [reads taken and rejected],        // the swarm's anti-matter
  negative:   [terrains NOT touched, holes named], // "terrains NOT touched: X Y"
  gaps:       [typed gaps declared],               // never a default
  sources:    [candidate sources not bound],       // the reading surface's edge set
  superseded: [products that lost a competition],  // race.superseded
  releases:   [records of what was folded away],   // the ledger's snapshots
}
```

- **I-unitarity.** Every fiber slot is non-empty or explicitly declared
  void. Nothing considered is silently destroyed. The envelope's
  completeness check (already the habit: "a declared absence is a NUL,
  not a gap") becomes code: after assembly, assert every slot of every
  fiber is recorded or released.
- **I-schema-append.** New dimensions are new features — new (operator,
  dimension) pairs with their own fiber slots. Adding a dimension never
  rewrites existing cells (append-only schema, like the ledger).

## 7. Regulation — commitment points and the missing proteasome

Regulation stacks at the committed step: void DEF + admission. Everything
downstream is high-turnover and unregulated. The rule-author (the enzyme
factory) mints rules from the ledger, floor 3 recurrences, each with its
falsifying control, tried under a permutation null, lever reverted on
concede (`heimdall.mjs:4881–4962`).

**The missing half (a finding of 2026-09-29): there is no degradation
pathway for rules.** A rule can only die by its control firing or a
restart; the live ledger carries 30 rules, most never retired. An enzyme
factory with no proteasome fills with permanent law.

- **I-half-life.** Every derived rule carries `halfLifeMs`; past it, a
  rule is re-examined against its own control and conceded unless it has
  re-earned (new recurrences past the floor).
- **I-retire.** A retire route exists on the proxy (`POST
  /heimdall/rules/:key/concede` — does not exist yet; the phase that
  builds it names the file: `proxy.mjs`, mirroring
  `/heimdall/models/evict` at `proxy.mjs:600`).
- **I-specificity.** No rule is minted for a probe that is not a known
  model or namespace — `knownModelProbe` (heimdall.mjs, adopted
  2026-09-29). The active-site filter is part of the enzyme, not a
  wrapper.

## 8. The n-dimensional coding practice (the agent's workflow)

The same tensor applies to the coding agent (opencode, the fold):

1. **Hold the void before writing.** The test suite is the active site —
   the hole shaped to what the code must satisfy, before the code exists.
   TDD is enzyme engineering: red-green-refactor is induced fit, and
   refactoring is recoverable deformation. The prompt to the model
   carries the void (what the change must satisfy), never "write X".
2. **Distribute the collapse.** One model call per grain: the plan
   (L0), the file (L1), the function (L2), the expression (L3). Never
   one prompt over the whole task.
3. **Keep the fiber of every decision.** The rejected approach, with its
   falsifying control, written beside the chosen one — the anti-matter
   convention. Most coding deletes the fiber the moment the point is
   chosen; the fold keeps it.
4. **Threads on the same material.** The review thread (L3: per-line
   checks) runs beside the writing thread (L1) on the same code, by
   orthogonal binding — the review binds provenance (where does this
   claim come from), the writer binds sequence (what comes next).
5. **Degrade the law.** Every rule the agent's own sessions mint
   (conventions, lessons) carries its control and its half-life.

## 9. Migration phases — each with its falsifying control

**Phase 0 — instrument the baseline.** Wrap each draw
(`proxy-runner.mjs:5063–6461`) with per-stage latency, model-call count,
and envelope completeness. *Control: the sequential pipeline's
per-sentence latency from first token to `[S#]` tag is the number the
parallel form must beat; if the instrumented baseline already shows the
mechanical stages dominate wall time, the parallel form is not worth its
complication and the spec concedes.*

**Phase 1 — lift the mechanical enzymes.** The fact gate and the race
are already mechanical; run them as threads beside the turn (T3, T4) on
material as it lands. No behavior change: identical tags, identical
envelope. *Control: run the old and new pipelines on the same corpus; if
the tag sets differ on any sentence, the lift is wrong — revert.*

**Phase 2 — extract the model enzymes behind the cap.** Compose/Verify/
Cite become stages with bounded queues, model calls capped by
`familyCap`. *Control: with familyCap 1, the parallel pipeline must
produce the same envelope as the sequential one (determinism under
serialization); with cap 2 it must beat it on wall time; if cap 1
differs, the stages share a hidden dependency — the DAG invariant was
violated.*

**Phase 3 — the fiber schema.** Extend the envelope with the per-cell
fiber slots; assert I-unitarity on assembly. *Control: a fuzzed turn
that produces a fiber with a silent empty slot fails the envelope check —
the check is a test, not a hope.*

**Phase 4 — the proteasome.** BUILT 2026-09-29. Every derived rule
carries its own clock (`adoptedAt` / `lastEarnedAt` / `halfLifeMs`,
default 7 days, env `ER7_DERIVED_RULE_HALF_LIFE_MS`); the re-examine
pass (`reexamineDerivedRules`, run in the rule-author's sense loop over
the window's own tally) concedes an expired rule unless the pattern
re-earned it past the floor, and refreshes the earn of a standing rule
that recurs (at most once per window); the retire route is live (`POST
/heimdall/rules/:key/concede`, mirroring `/heimdall/models/evict`).
Concession is disclosed and re-derivable — the next recurrence adopts
again with a fresh clock. Pinned by 7 falsification tests in
`tests/proteasome-half-life.test.mjs`.
*Control (RUN — the test that advances the clock past the half-life with
no recurrences concedes the rule): adopt a rule, advance the clock past
its half-life with no new recurrences — the rule must concede itself. A
rule that outlives its evidence concedes the spec.*

## 10. The invariants, consolidated

| # | Law | Enforced at |
|---|---|---|
| I-address | one cell per address | artifact module (new) |
| I-one-writer | one writer per address; annotations are new cells | artifact module (new) |
| I-append | nothing deleted in place; release is a typed act | artifact module (new) |
| I-orthogonal | no two enzymes bind the same feature at the same grain | enzyme registry (new) |
| I-atp | model calls ≤ familyCap; mechanical unbounded | heimdall (exists) |
| I-single-grain | no model call sees more than one grain | `streamOllamaChat` audit (exists 2026-09-29: declarations only, MEASURE mode notes / `ER7_GRAIN_AUDIT=enforce` throws; enzyme draws declare section/whole; enforcement awaits Phase 2) |
| I-channel | handoffs are shaped molecules with addresses | queues (new) |
| I-backpressure | queues bounded; a full queue blocks only upstream | queues (new) |
| I-dag | stage dependencies are a DAG | enzyme registry (new) |
| I-lockfree | no mutex, no shared mutable buffer between levels | code review + instrument |
| I-unitarity | every fiber slot recorded or explicitly void | envelope check (new) |
| I-schema-append | new dimensions never rewrite existing cells | fold module (new) |
| I-half-life | rules retire unless re-earned | rule-author (exists 2026-09-29: `reexamineDerivedRules` in the sense loop) |
| I-retire | a concede route exists | proxy.mjs (exists 2026-09-29: `POST /heimdall/rules/:key/concede`) |
| I-specificity | no rule for an unknown probe | heimdall.mjs (exists, 2026-09-29) |

## 11. What this spec does not claim

- It does not make the model n-dimensional. The model is a sampler; the
  collapse is irreducible. The spec distributes and records the collapse;
  it cannot abolish it.
- It does not remove the normative gates (ethos, AntiStrauss, Mayeroff).
  Those are regulators — equilibrium-changing, responsibility-bearing —
  and stay sequential and rare. Catalysis language must never launder
  them into mechanism.
- *Control for the anti-laundering claim (added 2026-09-29 — the paragraph
  carried none, and by the house's own epistemology an unmeasured claim is
  never passed): the normative gates must appear in the turn's own record
  wherever their triggers fired. A turn whose material holds a normative
  conflict, a ranking by agreement, or a mouth-issued imperative, with no
  ethos / AntiStrauss / Mayeroff note on the envelope's mechanical section,
  concedes that the boundary leaked on that turn. Conversely, an enzyme
  table or registry that names ethos, AntiStrauss, or Mayeroff as a
  bindable (operator, dimension) feature concedes the whole spec —
  regulators are never enzymes.*
- It does not promise the fold is infinite storage. The fold is
  dimensionally infinite and finitely stored: it holds structure.

*Standing: spec. The code wins disagreements; the controls win arguments
about the code; the fold keeps both.*