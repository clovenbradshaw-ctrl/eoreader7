// capacities.js — the seed of the capacity library named in
// SEED-CREATION-LANGUAGE.md ("the prior set, taken seriously") and specced
// in full in the Terminal Language document (§7): a small, typed, human-
// legible registry of shapes the terminal already knows how to reach for,
// so `synthesize`'s parts and `distinguish`'s targets can be checked against
// something real instead of trusted on the model's word.
//
// THIS IS A DATA TABLE, NOT A RUNTIME. Per the SEED doc's own build order
// ("The schema is a weekend. The library seed is a week"), this pass does the
// weekend piece (grid.js) and starts — deliberately does not finish — the
// library seed: every entry below NAMES an organ this repo already has
// (module, exported function, the terrain/operator cell it occupies) so a
// capacity reference can be resolved and typed. ONE entry (`cast`) is
// actually executed from the terminal — capacity-runner.js, kept in its
// own file so this one stays a plain table — spinning up the real
// engine organ against real loaded material from an `act` line; the other
// nine remain reference-only, and asking to run one returns a typed
// `not_yet_executable` gap rather than a silent no-op or a fabricated
// result. Wiring the rest is named future work in CLAUDE.md, not implied
// here.
//
// Every entry has to name its giver — the module it actually lives in — so
// a capacity reference resolves to a real place in this codebase, never a
// promise. `terrain` and `op` are taken from this repo's own operators.js
// cells (packages/engine/operators.js, ../eoreader6.1), the same source
// grid.js reuses, so a capacity's typing can never drift from the algebra's.
//
// A domain is fixed by the OPERATOR LETTER alone (never by grain or by
// choice — operators.js's OP_DOMAIN), so `terrain` here is not a free
// label: it is `TERRAIN_BY_DOMAIN[domainOf(op)][grain]`, checked against
// the real module by hand for every row below. Two entries were caught
// wrong by that check while this table was being written and are worth
// naming rather than quietly fixing: `skill` first read op:"SYN", which is
// Structure-domain and can only ever land on Field/Link/Network — never
// Kind, no matter what grain is chosen — CLAUDE.md's own looser prose
// ("skills.js as Kind/Paradigm") is a description of where skills.js
// SITS, not a licence to pick any operator that gets there; INS (Existence
// domain) at Pattern grain is what actually lands on Kind, and it fits the
// act better besides (instantiating a known procedure onto new material).
// `build` first read terrain:"Field" with op:"INS" — also domain-illegal
// (INS is Existence-domain, Field is Structure-domain) — and build-log.js's
// own header already states the correct cell in so many words: "PROPOSE →
// INS · Figure · produced — BIRTH", i.e. Entity, not Field.

export const CAPACITIES = Object.freeze([
  Object.freeze({
    id: "cast",
    terrain: "Entity",
    op: "SIG+INS",
    module: "cast.js",
    fn: "makeReferentIndex",
    what: "referent identity over a passage set — names resolve to who, not to byte strings (P11). One of two capacities that actually execute from the terminal (capacity-runner.js) — `relations` is the other; the remaining eight are reference-only.",
  }),
  Object.freeze({
    id: "relations",
    terrain: "Link",
    op: "CON",
    module: "hypergraph.js",
    fn: "makeRelationReader",
    what: "the material's own subject-verb-object edges, read against a vocabulary measured from the text. Executes from the terminal as of 2026-08-19 (capacity-runner.js) — `query subject:X verb:Y` (leave exactly one of subject/object open) answers directly from the graph, referent-aware, not a surface-string guess.",
  }),
  Object.freeze({
    id: "graph",
    terrain: "Network",
    op: "SYN",
    module: "relations-chain.js",
    fn: "chainRelations",
    what: "relations linked to document-order neighbours and referent-siblings — relations only make sense linked",
  }),
  Object.freeze({
    id: "atmosphere",
    terrain: "Atmosphere",
    op: "EVA",
    module: "aperture.js",
    fn: "meterSnapshot",
    what: "the reader's own accumulated ground — a second tier-stack meter, Ground+Figure for S1, run at hop = window",
  }),
  Object.freeze({
    id: "measure",
    terrain: "Void",
    op: "NUL",
    module: "measure.js",
    fn: "runMeasurement",
    what: "a declared statistic tested against a Born-constructed null — the measuring door's own licensing gate (P19); the engine behind a `ground … broken:<perturbation>` act",
  }),
  Object.freeze({
    id: "priors",
    terrain: "Lens",
    op: "DEF",
    module: "priors.js",
    fn: "checkPrior",
    what: "one claim checked against live_priors, provenance-carrying, zero-egress — DEF at Figure grain (a specific claim's status), the same cell emergence/shabda occupies for who-is-speaking",
  }),
  Object.freeze({
    id: "web",
    terrain: "Lens",
    op: "EVA",
    module: "web.js",
    fn: "extractReadable",
    what: "one sanctioned egress (P13): a claim's own words searched, a page read, judged by the same containment fold",
  }),
  Object.freeze({
    id: "skill",
    terrain: "Kind",
    op: "INS",
    module: "skills.js",
    fn: "runSkilledTask",
    what: "a procedure kept as code, instantiated onto new material — zero model calls when a skill claims the task, one grammar-held call to slot-fill",
  }),
  Object.freeze({
    id: "build",
    terrain: "Entity",
    op: "INS",
    module: "build-log.js",
    fn: "makeBuildLog",
    what: "an artifact's birth as an append-only log — PROPOSE/SUPERSEDE/RESULT, folded to a projection at any cursor",
  }),
  Object.freeze({
    id: "witness",
    terrain: "Lens",
    op: "EVA",
    module: "witness.js",
    fn: "witnessCode",
    what: "does one landing actually compile — the structural half of the parliament build-log.js gates every patch through",
  }),

  // ── the connection pass (2026-08-29, P64) ─────────────────────────────
  //
  // eval/capability-coverage.mjs measured this registry at 9/27 cells and
  // found the gap was largely REGISTRY DEBT, not incapacity: real, tested,
  // running organs whose cells were documented in their own code or headers
  // and never registered. The rows below pay that debt. Discipline per row:
  // the module and fn are verified exports; the cell is DOCUMENTED where a
  // source states it (cited in `what`) and REASONED like this table's own
  // original rows where not (the hand-check the header above describes),
  // mechanically domain-legal either way (operatorOf(op).domain →
  // TERRAIN_BY_DOMAIN[domain][grain] — the same arithmetic that caught
  // `skill` and `build` mistyped when this table was first written).

  Object.freeze({
    id: "network",
    terrain: "Network",
    op: "CON",
    module: "network.js",
    fn: "makeNetworkBinder",
    what: "a recurring arrangement found and bound — the CON·Pattern cell P58 built this organ to occupy after its emptiness was CONFIRMED (the zero-edges list page, predicted before moves.js was written); registering it closes the loop that finding opened",
  }),
  Object.freeze({
    id: "patch",
    terrain: "Link",
    op: "SEG",
    module: "build-log.js",
    fn: "applyOps",
    what: "the delta carriage's cut primitive — {op:'SEG', find} snips one span out of one artifact (its own header's 'SEG · snip' row); the same cell identity.js:182 (eoreader7) emits verbatim on a real revision",
  }),
  Object.freeze({
    id: "extent",
    terrain: "Field",
    op: "SEG",
    module: "void-shape.js",
    fn: "spaceFrom",
    what: "the extent a question's space must cover, and its units, made operative — the module's own ['SEG','Ground','extent',...] row; the wall placeFiller refuses out-of-extent spans against (P53)",
  }),
  Object.freeze({
    id: "rezero",
    terrain: "Lens",
    op: "REC",
    module: "build-log.js",
    fn: "makeBuildLog",
    what: "rezeroBuild — a judged projection's ground conceded, the next born (its own header: EVIDENCE · REC · Figure · produced); grid.js::concedeEvaluation is the same act for checked claims (P36 mirrors it exactly)",
  }),
  Object.freeze({
    id: "reshape",
    terrain: "Paradigm",
    op: "REC",
    module: "void-loop.js",
    fn: "reshape",
    what: "a finding contradicting the declared space re-zeros the space itself — P53's own read-off cell (REC = Generate·Pattern at Paradigm); the kernel's declarations.js::concede and reaction.js::withdraw are its engine-side siblings (both grain: Pattern in their own code)",
  }),
  Object.freeze({
    id: "hear",
    terrain: "Link",
    op: "SYN",
    module: "hyperlexicon.js",
    fn: "makeHyperlexicon",
    what: "a re-sighting folds into the same note with witnesses and spans unioned — hear()'s own code types it SUPERSEDE · SYN · Figure (P57); store.js::updateRow carries the identical typing for the database fold",
  }),
  Object.freeze({
    id: "declare",
    terrain: "Paradigm",
    op: "DEF",
    module: "hl-acquire.js",
    fn: "acquireCandidates",
    what: "candidate functional/transitive declarations acquired from real material, REFUTED/CANDIDATE tiers, never GIVEN — the entries it feeds carry operator DEF, grain Pattern in declarations.js's own code (P37)",
  }),
  Object.freeze({
    id: "standing",
    terrain: "Paradigm",
    op: "EVA",
    module: "capacity-runner.js",
    fn: "mergeTestimony",
    what: "a claim's standing across witnesses — corroborated, single, disagree — a property of the SET no member carries (P39); the organ P44's order-13 metasystematic item runs, which is what evaluating at Paradigm is",
  }),
  Object.freeze({
    id: "compile",
    terrain: "Field",
    op: "SYN",
    module: "predigest.js",
    fn: "compilePriors",
    what: "sedimented readings merged into one carried experiential ground (P60) — composing the standing field later reading stands on; typing reasoned per this table's own hand-check discipline, not quoted from a source",
  }),
  Object.freeze({
    id: "regime",
    terrain: "Atmosphere",
    op: "REC",
    module: "source.js",
    fn: "atmosphereBoundaries",
    what: "the ambient reading regime's tolerance-triggered re-zero — operators.js's own REC line ('rezero — a new ambient ground begins'), the one place REC fires as a literal numeric event (loops/atmosphere.js, consumed here); the terrain is the organ's own name",
  }),
]);

const byId = new Map(CAPACITIES.map((c) => [c.id, c]));

/** Exact-id lookup — the whole resolution rule for this pass. Fuzzy/partial
 * matching (a model's paraphrase of a capacity's name) is named future work
 * in CLAUDE.md, not attempted here: a silent nearest-match is exactly the
 * kind of guess this registry exists to refuse instead of make. */
export function findCapacity(id) {
  return byId.get(String(id ?? "").trim().toLowerCase()) ?? null;
}

/** The refusal shape SEED-CREATION-LANGUAGE.md itself specifies verbatim
 * ("unresolved capacity: your event references `X`, which the library does
 * not contain..."), typed rather than a bare string so a caller can render
 * or test it without re-parsing prose. */
export function unresolvedCapacity(name) {
  return Object.freeze({
    gap: "unresolved_capacity",
    name,
    detail: `unresolved capacity: this event references "${name}", which the library does not contain. Options: reference an established capacity (\`capacities\` lists them), propose one as a trial, or elaborate the shape you mean.`,
  });
}

export function listCapacities() {
  return CAPACITIES;
}
