# Predigesting the priors — measured (2026-08-28)

Driver: `eval/predigest-priors.mjs` (re-runnable; writes
`eval/results/compiled-priors.json`, committed — the standing artifact).
Mechanism: the engine's own sedimentation organs
(`eoreader7/native/kernel/experience-priors.js` / `rhythm-priors.js`),
composed through `predigest.js` (new, pure, organs injected). The point:
the engine could already sediment a completed reading into bounded portable
memory and merge without re-scanning — what it never had was the run KEPT.
This driver reads the shelf once and writes the compact result, so later
sessions load compiled memory instead of re-reading the corpus (P30's
efficiency law aimed at priors).

## Measured

- **Corpus**: everything actually beside this repo — `eoreaderhandbook`
  (44 documents) + `eo-wiki/articles/wiki` (67 documents; one skipped as
  non-material) = **111 works read to completion** (per-doc cap 400
  encounters, declared; most documents read whole). `../live_priors` is a
  **typed gap** in the manifest (`not-present`), explore-server.mjs's own
  posture for the same directory.
- **Runtime: 34.1s** for the whole shelf, one-time. The artifact is 174KB.
- **WHICH memory**: 96 relation forms, **28 recurrent across ≥2 works**
  (top: `on` ×14 works, `at` ×13, `has` ×8, `is` ×6…).
- **WHEN memory**: median inter-mention gap 6 over 2,007 pooled gaps.
- **Received inventory**, manifested with schema + giver + path, never
  copied: ConstructionPrior@1 (UD_English-EWT), MorphologyPrior@1
  (UniMorph) ×2 locations, and a **named gap** for POSPrior@1
  (`legacy-eoreader6.1` submodule uninitialized in this checkout — the
  reader ran without it, disclosed).

## The honest quality note

The top recurrent "relations" are mostly prepositions — exactly the
verb-hood cost this repo has already measured (the grammar-lens pass, P56):
with no POS prior in this checkout and concept prose starving the cast
ladder, the reader hears what it hears. The compiled memory records that
faithfully, junk included — which is precisely why **nomination is not
licensing**: `nominateFromExperience` may gate candidates by this memory,
and nothing in it can ever GIVE a composition affordance. Measured
downstream (`mechanical-reasoning-RESULTS.md`, arm 4): against the
succession material, this artifact nominated **0 of 9** observed candidates
— the gate refusing chemistry the canon never met.

## Disclosed

- Compiling never promotes: the artifact's halves keep the engine's own
  standing triple (`defeasible_experience_prior`, `witnessed: false`,
  `admissible: false`) — pinned by `predigest.test.mjs`.
- Terrain/stance/operator expectations come back empty under this driver's
  assembly (the fold carries graphEntries; no terrain-state projection is
  run) — the same shape the engine's own `experienced-new-book.mjs`
  produces, stated rather than implied as "the corpus has no terrains."
- A serialize→load→use round trip is pinned by test: a loaded artifact
  still gates nominations through the real engine organ, and the loader
  refuses (typed) wrong schema, missing giver, or a tampered half.
