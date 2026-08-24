# Terrain mathematics in EOReader 7

EO terrain is not nine labels over one feature space. Each terrain is a different kind of mathematical object. The universal kernel shares witness, provenance, Fold, DMD, and recursive revision across terrains; it must not force one mathematical family onto all of them.

The canonical recursive cycle remains:

`F_t -> O_t -> E_t -> P_t -> W_t -> Q_t -> DeltaF_t -> F_t+1`

Raw witness is append-only. Priors orient but do not witness. Recurrence may nominate but cannot establish materiality. A present-tense projection can change without rewriting historical witness.

## The 3 x 3 mathematical reading

The three grains are not merely labels:

- **Ground**: an ambient region, field, or constraint landscape in which distinctions can occur.
- **Figure**: a localized object, relation, or operator inside that ground.
- **Pattern**: a lawful coarse-graining or invariant that survives across figures because preserving it changes reconstruction, expectation, or transformation.

That yields the following working map:

| | Ground | Figure | Pattern |
|---|---|---|---|
| **Existence** | Void: bounded exclusion / region logic | Entity: proof-relevant identity | Kind: stable behavioral equivalence |
| **Structure** | Field: local state over a carrier | Link: typed relation/process | Network: global invariants of composed Links |
| **Interpretation** | Atmosphere: unresolved constraint system | Lens: information channel / interpretive operator | Paradigm: predictive explanatory regime |

The Pattern column has a common criterion:

> A Pattern is a lawful coarse-graining that preserves something consequential.

- Kind preserves lawful future behavior.
- Network preserves lawful global structural behavior/invariants.
- Paradigm preserves lawful predictive interpretation.

---

# Existence

## Void — bounded exclusion in a carrier

**Mathematical object:** a relative exclusion/negative region whose coherence depends on a witnessed carrier or boundary.

Current implementation:

- `EOExistentialGround@1`
- `complement.model = bounded_relative_complement`
- explicit `carrierRef`
- `absoluteVoid = false`

The present text adapter uses a bounded relative-complement representation. The deeper universal target is point-free region logic: locale/frame/contact or mereotopological structure where appropriate. A spatial, temporal, or continuous modality should be able to provide genuine carrier geometry.

Important epistemic rule:

`not witnessed in C` does **not** imply `absent from C`.

Void requires evidence for exclusion relative to the carrier.

Do not use:

- universal NULL
- parser missingness
- ordinary lexical negation
- NUL

as Void.

## Entity — proof-relevant identity groupoid

**Mathematical object:** an evolving groupoid of warranted identity paths between occurrence-level figures.

Identity is not lexical similarity and is not fundamentally a partition. EO must retain *how* two occurrences came to be treated as the same Entity, because one identity path may later be defeated while another remains warranted.

Current implementation now has two levels:

1. `EOIdentityGroupoid@1`
   - objects: occurrences and current referents
   - generators: warranted referent support, pronoun/definite bindings, and supported discourse identity links
   - every identity generator is traversable in both directions
   - `identityProofPath(...)` returns a present-tense composed proof path with exact generator provenance
   - unresolved identity alternatives never become generators

2. `EOIdentityQuotient@1`
   - retained for efficient existing callers
   - now explicitly derived as `pi_0`, the connected-component projection of the identity groupoid
   - collisions remain visible when multiple referent ids occupy one component

Thus the quotient is a useful current canonicalization, not the ontology of identity itself.

Next mathematical step:

- make attacks/retractions operate explicitly on identity generators and proof paths
- distinguish multiple surviving proof paths when a generator is removed
- let SEG/REC consequences inspect path-level dependence rather than only component change

Do **not** repair Entity with embeddings, lexical overlap, or associative activation.

## Kind — metastable behavioral equivalence

**Mathematical object:** a stable population-level equivalence in lawful future behavior.

A Kind is not a feature cluster. Interaction structure may reveal a candidate basin, but the basin does not become Kind merely because its members resemble one another.

Current canonical flow:

`Entities -> interaction observables -> affinity basin -> metastability -> prospective behavioral equivalence -> DMD -> INS(Kind)`

### Candidate discovery

Current candidate discovery uses:

- modality-blind structural interaction channels
- rarity/information weighting
- weighted relational affinity
- mutual-neighbor basin formation
- internal vs boundary binding energy
- random-subset stability checks

These nominate possible macrostates. They do not themselves mint ontology.

### Metastability

The admission ledger requires:

- repeated stable sightings
- minimum membership retention
- causal-horizon reset when the basin dissolves/reforms

This prevents one static clustering snapshot from becoming Kind.

### Behavioral admission

The actual admission gate is now future-law based.

`prospectiveBehavioralEquivalence(...)` compares post-formation response distributions of basin members and nonmembers on independently observed channels. It currently uses:

- Jensen-Shannon divergence between future response laws
- total-variation effect size
- within-basin divergence as a coherence constraint
- deterministic entity-label permutation null
- strictly prospective evidence after basin formation

An admitted Kind records:

- mechanism: `behavioral_equivalence_of_metastable_basin`
- validation: `prospective_approximate_bisimulation_after_metastability`

This is a finite-data approximation to causal-state equivalence / probabilistic bisimulation:

`e_i ~_K e_j` when, at the resolution justified by current experience, they have sufficiently indistinguishable lawful futures under relevant conditions.

The affinity basin is therefore the **nomination mechanism**; behavioral equivalence is the **ontological gate**.

Remaining gaps:

- condition future-law comparison on explicit contexts/interventions rather than only response channels
- learn transformation-response kernels rather than static feature channels
- model repulsion/contradiction in candidate dynamics
- emit SEG/SYN/DEF/REC when an admitted Kind splits, merges, dissolves, or changes law

---

# Structure

## Field — local state over a carrier

**Mathematical object:** distributed local state with a rule for how local descriptions coexist or restrict over a carrier.

The deeper universal target is sheaf/bundle-like local-to-global structure:

- a carrier supplies sites/regions
- each site/region has a local state space
- restriction/compatibility maps say how neighboring local descriptions agree
- a coherent global section represents one compatible Field state

Different modalities may instantiate this differently:

- scalar/vector/tensor fields for physical/spatial modalities
- intensity measures for event streams
- cellular sheaves/factorized local state for symbolic/discrete carriers
- kernels when influence decays continuously

Current text implementation exposes `structuralFieldGeometry(...)`, a **diagnostic**, not the universal definition:

- incidence count
- incidence energy
- coupled edge pairs
- coupling density
- relation entropy

`n >= 2 Links` may be an admission prerequisite; it is never the mathematics of Field itself.

## Link — typed witnessed relation

**Mathematical object:** a typed n-ary relation with participants, roles, and witness provenance.

Current representation remains strong:

- `EOHyperedge@1`
- arbitrary arity
- typed relation
- role-bearing participants
- immutable raw endpoints
- later identity recanonicalization changes present topology without rewriting witness

Not every Link should automatically be called a morphism. A morphism/process interpretation is warranted only when direction, domain/codomain, interface, and composition laws are independently earned.

When those are warranted, spans/cospans/open-system composition are natural mathematical extensions.

Do not force every Link into a binary graph edge or compose merely because endpoints align.

## Network — global structure of composed Links

**Mathematical object:** the global invariants and dynamics generated when multiple Links compose.

Current implementation constructs the bipartite incidence complex of witnessed Links and earned referents and exposes **topological diagnostics**:

- connected components
- degree structure
- branching referents
- first Betti number / cycle rank
- acyclic vs cyclic topology
- relation entropy

This correctly distinguishes a star, chain, tree, and cycle, but connectedness is not the definition of Network.

Deeper target:

- chain complexes / homology for structural invariants
- Hodge-like decompositions when flows are meaningful
- stoichiometric/conservation structure for reaction-like systems
- weighted/directed/open-system dynamics when relation semantics license them
- temporal persistence and consequential multiscale/community structure

Higher-order mathematics must be earned by the actual carrier and Link semantics; it is not added merely because it is available.

---

# Interpretation

## Atmosphere — unresolved constraint factor graph

**Mathematical object:** the current system of consequential unresolved interpretive constraints.

The previous heuristic `potential = persistence x consequence reach x alternatives`, with overlap-derived coupling energy, is no longer canonical and has been removed from the mathematical surface. Shared references establish interaction topology; they do **not** prove contradiction.

Current canonical implementation:

`interpretiveAtmosphereFactorField(...)`

- each live DMD-material obligation is a factor
- referenced Fold objects are variable nodes
- shared variables create factor coupling topology
- persistence is tracked separately as temporal unresolved exposure
- exact energetic frustration is computed only when explicit constraint assignment costs are available

Three states are deliberately distinguished:

1. **No live material constraints**
   - tension is exactly `0`

2. **Live constraints but insufficient semantics to evaluate compatibility**
   - Atmosphere exists
   - coupling topology may exist
   - tension is `unknown`, not zero and not positive

3. **Explicit constraint costs are available**
   - local optimum cost is compared with the globally achievable minimum
   - frustration is the irreducible incompatibility:

`frustration = global_minimum - sum(local_minima)`

Compatible coupled constraints may therefore have zero frustration. Incompatible individually satisfiable constraints have positive frustration.

Persistence is not multiplied into instantaneous frustration. It is a separate temporal quantity: unresolved exposure over time.

`deriveTension(...)` and Atmosphere terrain projection now consume this same factor-graph object.

Remaining gaps:

- derive constraint variables and admissible assignments from richer witnessed interpretive structure
- support approximate inference when exact state enumeration is too large
- distinguish uncertainty/solution-space volume from frustration/contradiction
- derive release as witnessed reduction/reframing of the constraint landscape

## Lens — information channel / interpretive operator

**Mathematical object:** an operator/channel that determines which distinctions in a bounded Fold region can become visible or consequential.

Current implementation is deliberately conservative:

- unweighted alternatives -> possibility sets + Hartley information
- explicitly giver-weighted alternatives -> Shannon entropy
- no Bayesian/KL update unless both a warranted prior and posterior distribution actually exist

These are statistics of a Lens, not yet the full object.

Deeper target:

- deterministic Lens: partition/refinement of possible Fold states
- probabilistic Lens: calibrated information channel / Markov kernel
- compare Lenses by informativeness, including Blackwell/garbling order where channel structure is actually represented
- expose explicit domain, codomain, affected Fold refs, and before/after possibility structure

Do not manufacture probability weights merely to unlock Bayesian mathematics.

## Paradigm — predictive explanatory regime

**Mathematical object:** a model/regime that makes multiple independently grounded Lenses jointly simpler **and prospectively predicts interpretation better**.

Current implementation uses a retrospective MDL diagnostic:

- derive functional interpretive signatures
- require independent grounds
- compare separate encoding with one shared signature + instance pointers
- nominate only when compression gain is positive

The code now labels these results `retrospective_paradigm_candidate` because retrospective compression alone is not the final ontological criterion.

Deeper canonical target:

- competing explanatory models
- prequential/predictive MDL or equivalent out-of-sample predictive regret
- future interpretive consequences evaluated after model formation
- Bayesian model evidence only when calibrated probabilities exist
- DMD requires that maintaining the shared regime changes future reconstruction, expectation, or transformation

This gives a sharp distinction:

> Kind is an invariant in the behavior of encountered entities. Paradigm is an invariant in the successful modeling/interpretation of encountered structure.

---

# Cross-terrain rules

## 1. A metric is not the object

Incidence energy is not Field. Betti-1 is not Network. Hartley entropy is not Lens. Compression gain is not Paradigm. These are measurements of richer mathematical objects.

## 2. Similarity is not identity

Entity uses warranted proof paths. Kind uses stable lawful future behavior. Neither is licensed by lexical or embedding resemblance.

## 3. Recurrence is nomination, not Pattern

A recurrent surface, relation, signature, or motif may nominate a candidate. Pattern grain requires a consequential invariant.

## 4. Coupling is not contradiction

Two Atmosphere factors can share variables and be perfectly compatible. Positive tension/frustration requires incompatible constraints, not overlap.

## 5. Uncertainty is not probability

A finite alternative set permits possibility/Hartley mathematics. Probability requires calibrated weights from a warranted source or learned empirical law.

## 6. Omnimodality is not one universal metric

The same EO grammar can host modality-specific mathematical objects. Omnimodality does not mean reducing all terrains to vectors, embeddings, clustering, or graphs.

## 7. Present derivation is not witness

Identity proof composition, quotient classes, factor-graph frustration, behavioral-equivalence tests, topology, and model compression are present-tense derived structures. They can revise without rewriting the source witness from which they are supported.

---

# Current implementation status and next order

Implemented now:

1. **Entity groupoid + quotient as pi_0**
2. **Kind metastability + prospective behavioral-equivalence admission**
3. **Atmosphere factor graph + honest frustration semantics**
4. **Lens conservative possibility/information diagnostics**
5. **Field discrete incidence diagnostics**
6. **Network connected incidence topology + Betti-1 diagnostic**
7. **Paradigm retrospective MDL candidate diagnostic**
8. **Void bounded carrier-relative complement**
9. **Link typed witnessed hyperedge**

Next mathematical work, in priority order:

1. path-dependent identity attack/revision over the Entity groupoid
2. first-class Lens channel/domain/codomain representation
3. prospective/prequential Paradigm admission rather than retrospective compression
4. adapter-supplied sheaf/carrier structure for Field
5. richer Network chain/open-system invariants when semantics warrant them
6. conditional/interventional Kind response laws
7. terrain-native Fold-revision distance for Surprise

The criterion throughout remains EO-native:

> A mathematical distinction belongs in the kernel only when preserving it changes lawful reconstruction, expectation, or transformation of the Fold.
