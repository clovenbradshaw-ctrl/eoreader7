# Terrain mathematics in EOReader 7

EO terrain is not nine labels applied to one generic feature space. Each terrain is a different kind of mathematical object. The kernel should share witness, provenance, Fold, and DMD mechanics across terrains, but it should not force the same mathematics onto them.

This document is the current mathematical contract for the nine terrains.

## General rule

EO provides the common grammar:

- domain: Existence / Structure / Interpretation
- grain: Ground / Figure / Pattern
- stance/mode remains orthogonal
- raw witness is append-only
- priors orient but do not witness
- recurrence may nominate but cannot establish materiality
- a present-tense projection may change without rewriting historical witness

The mathematical representation underneath a terrain must be native to what that terrain means.

---

## Existence face

### Void — bounded relative complement

**Object:** a complement relative to a carrier or scope.

A Void is not universal nothingness and is not NUL. It is a region in which some figure is absent relative to the boundary that makes the absence coherent.

Minimal form:

`Void = carrier \ expected/presupposed figure`

For text such as “there was no answer,” the carrier is the bounded encounter/scope and the excluded figure is `answer`.

Current implementation:

- `EOExistentialGround@1`
- `complement.model = bounded_relative_complement`
- `carrierRef` is explicit
- `absoluteVoid = false`

Correct mathematics:

- relative complement / set difference when the carrier is extensional
- support/complement in a measure space for continuous modalities
- occupied/unoccupied region in spatial or temporal fields
- constraint exclusion when the carrier is a possibility space

Do **not** use:

- universal NULL
- lexical negation as Void
- NUL as Void
- a missing parser value as Void

Remaining gap: richer modalities should supply real carrier geometry rather than only a scope identifier.

### Entity — quotient / identity partition

**Object:** a distinguishable figure under an evolving equivalence/identity relation.

Occurrences are not Entities merely because their strings resemble each other. Entity reasoning is fundamentally about which witnessed occurrences belong to the same identity class under currently warranted bindings.

Correct mathematics:

- partition / quotient space over occurrences
- union-find or equivalent incremental component representation for *admitted* identity links
- contradiction constraints that prevent illegal merges
- possible-identity graph kept distinct from the admitted quotient
- recanonicalization when the quotient changes

Current implementation gets the epistemic direction right but the representation is incomplete:

- occurrence-level witness survives
- provisional bindings are separate from raw witness
- explicit attacks can split/refuse identity readings
- relations are recanonicalized without rewriting witness

Current mismatch:

- some identity alternatives are still represented pairwise over normalized surface strings
- there is no explicit first-class quotient object exposing current identity classes and their boundary constraints
- transitivity and global partition consistency are therefore implicit rather than mathematically central

**Do not “fix” this with embeddings or lexical similarity.** The next Entity step should be an explicit occurrence-to-referent quotient maintained from warranted identity/binding operations.

### Kind — metastable dynamical basin

**Object:** a population-level invariant that changes lawful expectations.

Kinds are not feature clusters. Entities occupy an interaction field; stable basins in that field nominate possible Kinds. A basin becomes a Kind only if prospective/counterfactual experience shows that treating it as a population invariant changes prediction/reconstruction of later consequences.

Current implementation:

`Entities -> interaction observables -> weighted affinity -> basin -> null test -> prospective consequence -> DMD -> INS(Kind)`

Math in use:

- weighted relational affinity
- rarity/information weighting of interaction channels
- mutual-neighbor basin formation
- internal vs boundary binding energy
- random-subset null
- prospective consequence differential
- hypergeometric significance gate

Status: this is currently the strongest terrain-native mathematics in v7.

Remaining gaps:

- basin stability over multiple temporal windows / hysteresis
- conditional affinity rather than only global structural affinity
- better transformation-response observables
- richer cross-modal interaction laws

---

## Structure face

### Field — local incidence/potential field

**Object:** distributed structural condition over a carrier, not merely a bag of co-present Links.

Old implementation:

`two or more Links in one scope => Field`

That is cardinality, not field structure.

Current v7 direction:

- occupied participant sites define local support
- Links contribute incidence at sites
- shared incidence creates coupling potential
- relation-type entropy measures heterogeneity

Current projection exposes:

- incidence count
- incidence energy
- coupled edge pairs
- coupling density
- relation entropy

Correct mathematics depends on modality:

- discrete incidence field / factor graph for symbolic structure
- vector/tensor/scalar fields for spatial/physical modalities
- intensity measures for event streams
- kernels over a carrier when influence decays continuously

The universal kernel should retain the abstract field contract while adapters may provide richer geometry.

### Link — typed hyperedge / morphism

**Object:** a witnessed relation with roles and participants.

This is already close to the right mathematics.

Current representation:

- `EOHyperedge@1`
- arbitrary arity
- typed relation
- participant roles
- immutable raw endpoints
- later identity bindings may change present canonical topology without changing the hyperedge witness

Correct mathematics:

- typed hypergraph relation
- morphism when source/target typing is licensed
- relation algebra / category composition only when composability is independently warranted

Important restraint:

Do not force every Link into a binary graph edge. Do not compose relations merely because their surfaces repeat or endpoints happen to align.

Remaining gap: relation types themselves can eventually acquire algebraic properties from witnessed behavior (symmetry, transitivity, invertibility, composability), but those must be learned/received, not assumed.

### Network — connected hypergraph topology

**Object:** Pattern-grain topology made from multiple Links and earned shared referents.

Old implementation:

`two Links sharing referent X => one Network centered on X`

That is a local star, not a Network.

Current implementation:

- build the bipartite incidence graph between witnessed Links and earned referents
- project connected components containing at least two Links
- expose degree structure and topology
- compute first Betti number / cycle rank

Current metrics:

- edge count
- referent count
- incidence count
- degree by referent
- branching referents
- cycle rank
- acyclic/cyclic topology
- relation entropy

This makes a star, a chain, a tree, and a cyclic network mathematically distinguishable.

Remaining gaps:

- temporal persistence of components
- weighted/directed topology when relation semantics license it
- community structure only if it makes a predictive difference
- higher-order homology for genuinely higher-dimensional relational structure, if warranted

---

## Interpretation face

### Atmosphere — coupled unresolved-potential field

**Object:** the present ground of unresolved consequential interpretation.

Old implementation:

`one or more material obligations => one Atmosphere`

That only states existence.

Current implementation treats unresolved obligations as a potential field:

- local potential increases with persistence and consequence reach
- alternatives increase unresolved possibility load
- obligations sharing grounds/alternatives are coupled
- coupling energy captures mutually reinforcing unresolved structure
- consequence entropy captures heterogeneity of the unresolved interpretive ground

Current metrics:

- local potential
- coupling energy
- total energy
- consequence entropy
- per-obligation potential
- pairwise coupling

This should become the mathematical source for tension rather than leaving tension as a separate mostly-counting profile.

Remaining gap: `deriveTension` should be refactored to consume the same Atmosphere potential instead of independently reconstructing an overlap network.

### Lens — interpretive operator / possibility-space transform

**Object:** a Figure-grain interpretation that changes how a bounded region of Fold is read.

The current terrain wiring is epistemically safe but mathematically under-specified. A DEF/EVA/REC Figure can produce Lens terrain, but the engine does not yet expose a first-class operator with a domain, codomain, alternatives, and information effect.

Correct mathematics depends on what is actually represented:

- with unweighted alternatives: possibility sets and Hartley information `log2 |A|`
- with calibrated probabilities: Bayesian update / KL information gain
- with constraints: projection in a constraint lattice
- with frames: transformation/operator on the relevant Fold subgraph

Current rule: **do not invent probabilities.** Until alternative weights are witnessed/received from a named giver, Bayesian/KL math would be false precision.

Next representation needed:

`EOLensProjection` should expose at minimum:

- input Fold refs
- alternative set
- distinction / operator
- affected consequence refs
- output/reframed refs
- whether alternatives are weighted and by whom

Only then should Lens information gain become a native metric.

### Paradigm — explanatory model / compression regime

**Object:** a Pattern-grain interpretive regime that explains multiple independent Lenses more compactly than treating each separately.

Old implementation:

- group obligations by `identity`, `composition`, or consequence-kind string
- two independently grounded repetitions => Paradigm

That is recurrence, not paradigm structure.

Current implementation uses a minimum-description-length gate:

1. derive structural interpretive signatures from consequence kinds, distinction shape, and materiality-reason shape
2. require independent grounds
3. compare separate encoding cost with one shared model + instance pointers
4. project Paradigm only when shared representation actually compresses

Current metrics:

- signature complexity
- separate cost
- model cost
- compression gain
- compression ratio

This is intentionally simple MDL, but it has the right semantics: a Paradigm must explain/reduce description, not merely recur.

Remaining gaps:

- signature induction should itself become emergent rather than field-name based
- predictive likelihood can supplement MDL when a paradigm changes future interpretation
- competing paradigms should be compared as models, not collapsed into one category

---

## Cross-terrain mathematical errors to avoid

### 1. Counting is not structure

`n >= 2` can be an admission prerequisite but should rarely be the mathematical definition of Pattern grain.

### 2. Similarity is not identity

Entity uses warranted equivalence/partition. Kind uses dynamical affinity and consequence. Neither should be driven by lexical or embedding resemblance.

### 3. Recurrence is not a Paradigm

Recurrence nominates. Explanatory compression/prediction earns.

### 4. Co-presence is not a Field

A Field needs distributed support/influence over a carrier.

### 5. Shared node is not a Network

Network is topology over Links and referents.

### 6. Uncertainty is not probability

If alternatives are not weighted, use set/possibility mathematics. Do not manufacture Bayesian confidence.

### 7. One universal mathematical family is not omnimodality

Omnimodality means the same EO grammar can receive modality-specific observables and still produce the same terrain *types*. It does not mean every terrain or modality must be reduced to embeddings, vectors, clustering, or graphs.

---

## Implementation priorities

1. **Atmosphere -> tension unification**
   - make `deriveTension` consume the coupled unresolved-potential field.

2. **Entity quotient**
   - introduce an explicit present-tense quotient/partition over occurrence bindings and referents.
   - keep unresolved identity hypotheses outside the quotient until admitted.

3. **Lens representation**
   - add first-class input/alternative/consequence/output geometry.
   - use Hartley information until calibrated weights exist.

4. **Kind temporal stability**
   - add window persistence/hysteresis around basin formation and boundary revision.

5. **Field carrier adapters**
   - allow text/data/audio/video adapters to provide native carrier geometry while preserving the universal field interface.

6. **Paradigm competition**
   - compare alternative explanatory models by compression and prospective predictive gain.

The criterion throughout remains EO-native:

> a mathematical distinction is useful only when it changes the lawful reconstruction, expectation, or transformation of the Fold.
