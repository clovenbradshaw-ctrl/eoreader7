# The MHC battery — what order of task this instrument's organs actually complete

Engine: `eoreader7 (native/adapters/text)`. Seeded grounds per arbitrary arm: 20 for arms that re-deal an already-built structure, 5 for arms that must re-read the material (declared apart — 0-of-20 and 0-of-5 are different amounts of evidence). Seed 0.

Material: a declared slice of 40 passages of 1200 chars each (of 61 available). Nothing here is a whole-document measurement.

**READING-POLICY P0 — the assembly.** EXPERIMENT — engine text adapters hand-chained through the-fold's cast.js / hypergraph.js / verification.js / capacity-runner.js. NOT packages/host's assembled reader (absent from this checkout). READING-POLICY P0.

**READING-POLICY P3 — priors injected.** None. Every number below is a result about an *unprimed* reader: no language prior, no per-text coreference prior, no kind vocabulary.

## war-and-peace

**Stage: none readable** — order 5 (Nominal) was measured and the system did not complete it — a real ceiling
Passes above the cap, carried as observations and NOT folded into the stage: 6 (Sentential), 7 (Preoperational), 8 (Primary), 9 (Concrete), 11 (Formal), 12 (Systematic), 13 (Metasystematic)

| order | name | verdict | item | detail |
|---|---|---|---|---|
| 5 | Nominal | `failed` | a name denotes a being the material establishes | "Tolstoy" resolves (6); "Zzyrflax Quenbourne" does not (0); gathered 23/24 pairs its own individuation rule calls one being (stranded: "Saint" \| "Saint Petersburg"); kept apart 4/4 it withholds on |
| 6 | Sentential | `passed` | a directed relation inside one sentence: who did what to whom, in order | "Nikolai —meets→ Dolokhov" is stated (1); its reverse is not (0) |
| 7 | Preoperational | `passed` | a sequence coordinated across sentences: a pronoun bound to what was read before it | 9 pronoun(s) bound, 38 refused (pronoun_no_candidate, pronoun_no_margin), 0 bound to an unadmitted referent |
| 8 | Primary | `passed` | an empirical rule applied: a claim checked against the material's own edges | stated claim -> bound; reversed claim -> unbound |
| 9 | Concrete | `passed` | multiple concrete instances coordinated: corroboration counted by perspective, not by mention | passages=2, sources=1 — counted apart |
| 10 | Abstract | `unmeasured` (organ_unreachable) | a variable quantified over a category: the whole filler set of an open slot | lowerOrder arm could not run: this material offers no subject+verb slot with two or more distinct fillers |
| 11 | Formal | `passed` | one hypothesis tested against a constructed null: is this edge's connector asserted, or an artefact | 512/512 edges carry a standing — 8 corroborated, 504 single-witness |
| 12 | Systematic | `passed` | many formal relations coordinated into one system, ordered by presupposition | 9 cells (4 of 9 cells hold, 0 fail, 0 told both ways, 0 gap, 5 not yet built); with a non-existent subject, downstream cells are not_yet_executable |
| 13 | Metasystematic | `passed` | several whole systems compared: a standing no single system carries | 10 source-systems. "French invasion of Russia" bound by 3 -> AGREE/corroborated; "Russian author Leo" bound by 1 -> SINGLE/single. Below the merge both read identically (a system saying "holds"), and no reading carries a standing of its own. |

## borodino

**Stage: none readable** — order 5 (Nominal) was measured and the system did not complete it — a real ceiling
Passes above the cap, carried as observations and NOT folded into the stage: 6 (Sentential), 8 (Primary), 9 (Concrete), 10 (Abstract), 11 (Formal), 12 (Systematic), 13 (Metasystematic)

| order | name | verdict | item | detail |
|---|---|---|---|---|
| 5 | Nominal | `failed` | a name denotes a being the material establishes | "General" resolves (16); "Zzyrflax Quenbourne" does not (0); gathered 10/12 pairs its own individuation rule calls one being (stranded: "Alexander" \| "Emperor Alexander"; "Mikhail" \| "Mikhail Kutuzov"); kept apart 3/3 it withholds on |
| 6 | Sentential | `passed` | a directed relation inside one sentence: who did what to whom, in order | "Kutuzov —ordered→ Yermolov" is stated (1); its reverse is not (0) |
| 7 | Preoperational | `failed` | a sequence coordinated across sentences: a pronoun bound to what was read before it | 0 pronoun(s) bound, 6 refused (pronoun_no_margin), 0 bound to an unadmitted referent |
| 8 | Primary | `passed` | an empirical rule applied: a claim checked against the material's own edges | stated claim -> bound; reversed claim -> unbound |
| 9 | Concrete | `passed` | multiple concrete instances coordinated: corroboration counted by perspective, not by mention | passages=2, sources=1 — counted apart |
| 10 | Abstract | `passed` | a variable quantified over a category: the whole filler set of an open slot | "Kutuzov ordered __" ranges over 2 filler(s); an absent subject ranges over 0 |
| 11 | Formal | `passed` | one hypothesis tested against a constructed null: is this edge's connector asserted, or an artefact | 641/641 edges carry a standing — 11 corroborated, 630 single-witness |
| 12 | Systematic | `passed` | many formal relations coordinated into one system, ordered by presupposition | 9 cells (4 of 9 cells hold, 0 fail, 0 told both ways, 0 gap, 5 not yet built); with a non-existent subject, downstream cells are not_yet_executable |
| 13 | Metasystematic | `passed` | several whole systems compared: a standing no single system carries | 10 source-systems. "French invasion of Russia" bound by 2 -> AGREE/corroborated; "29 August after Smolensk" bound by 1 -> SINGLE/single. Below the merge both read identically (a system saying "holds"), and no reading carries a standing of its own. |

## Coreference: the fold against its own individuation rule

`discoverReferents` strips GENERIC tokens (those appearing with many partners — titles, family names, demonyms) from both surfaces and requires the REMAINDERS to corefer. Both columns below apply that same rule.

| material | rule says one being | gathered | rule says different | kept apart | abstained |
|---|---|---|---|---|---|
| war-and-peace | 24 | **23** | 4 | **4** | 27 |
| borodino | 12 | **10** | 3 | **3** | 14 |

*Abstained* = pairs where one surface is bare/generic, decided by `discoverReferents`'s singleton-partner rescue. That branch is not computable from the engine's exported organs, so this driver does not score it rather than reimplementing the engine's partner floor.

**war-and-peace — stranded** (the rule says one being; the fold kept them apart): `Saint` | `Saint Petersburg`
**borodino — stranded** (the rule says one being; the fold kept them apart): `Alexander` | `Emperor Alexander`; `Mikhail` | `Mikhail Kutuzov`

**What the strandings have in common, and the defect they name.** All three are one shape: a bare single token left alone while the longer surface containing it merged with a DIFFERENT partner. `Mikhail Kutuzov` sits with `Kutuzov`, and `Mikhail` stands by itself; `Emperor Alexander` sits with `Emperor`, and `Alexander` stands by itself; `Saint Petersburg` sits with `Petersburg`, and `Saint` stands by itself.

`discoverReferents` assigns each surface by scanning already-assigned surfaces and taking the FIRST that coreferes (`for (const [existing, id] of assigned) { if (corefersIndividuated(...)) { referentId = id; break; } }`) — greedy, insertion-ordered, with no second pass. So the grouping it computes is a greedy closure over a relation that is not transitive: `Mikhail` ~ `Mikhail Kutuzov` and `Mikhail Kutuzov` ~ `Kutuzov` both hold under the rule, while `Mikhail` and `Kutuzov` end in different referents. "Is the same being as" is necessarily transitive; what the fold computes is not.

**Not prescribed here: the obvious fix is unsafe.** A union-find over the corefer relation would close all three — and would also merge `Alexander` into `Emperor`, since `Emperor Alexander` corefers with both. `Emperor` survives as an individuating token only because `genericTokens` did not see enough partners for it in this slice; on a larger read it would be stripped and the case would not arise. So the root cause is a chain — generic detection under-firing on a bounded slice, then a title surviving as individuating, then greedy assignment binding a person to it — and which link to fix is a real design question, not a one-line change.

Precision is the other half and it is clean: **4/4 and 3/3** pairs the rule calls different beings were kept apart. The fold under-merges; it was never observed to over-merge.

## Content-independence

The MHC's claim is about the SCALE: a task's ORDER does not depend on what it is about. It is NOT a claim that a performer succeeds equally across domains — separating task from performance is precisely what makes a per-domain difference ordinary rather than a defect. The three outcomes are kept apart.

**Scale held: true** — 0 order(s) changed their order-hood with the content. Materials: war-and-peace, borodino.

**Performance varied** — a well-formed task at that order in both materials; the system completed it in one and not the other. Ordinary, and what a stage measurement is for:

- order 7: war-and-peace=`passed`, borodino=`failed`

**No probe** — the material offers no specimen for that item. A fact about the material, not about the item or the system:

- order 10: war-and-peace=`unmeasured`, borodino=`passed`

Agreed outright on 7 order(s): 5 (`failed`), 6 (`passed`), 8 (`passed`), 9 (`passed`), 11 (`passed`), 12 (`passed`), 13 (`passed`).
