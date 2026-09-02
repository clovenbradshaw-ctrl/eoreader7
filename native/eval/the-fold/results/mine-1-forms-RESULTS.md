# MINE-1 after recurring-form subject resolution — results

Run 2026-08-18, same day as the original `mine-1-RESULTS.md` run and the
`mine-1-priors-RESULTS.md` negative result. `node eval/mine-1.mjs`
reproduces every number below (the script itself is unchanged; what
changed is `hypergraph.js`, which the script imports).

## The lever, in one sentence

The dominant failure in the original run was `beyond-reach` (57.2% of the
537 facts that extracted a claim at all): a subject like "Butterflies" or
"Caterpillars" never resolves to a referent, because `cast.js`'s referent
index requires a proper name or a resolved pronoun, and MINE-1's essays are
encyclopedic — their real subjects are plain, recurring nouns, not named
entities. `host/terrains.js`'s Network-graph organ had already solved the
identical starvation for a different surface (measured there on
SEED-SPEAKER.md: a cast of four sentence-initial capitals at one arrival
each, vs. 21 form nodes once recurring content words are counted) —
"concept documents starve the cast ladder." `hypergraph.js` now grants a
SUBJECT the same identity: a content word recurring at least
`FORM_MIN_ARRIVALS` (2) sentences in the material, namespaced `form:<word>`
so it can never be mistaken for a real referent, and every claim built on
one is marked `formBased: true` so a reader can tell a form-anchored
"bound" from a name-anchored one. Nothing hardcoded for this benchmark:
the floor, the function-word exclusion, and the identity mechanism are all
reused whole from organs this project already had and had already
justified, independent of any score.

## The numbers, before and after

|  | before (name-only) | after (name + form) |
|---|---:|---:|
| bound | 92 (5.8% / 17.1%) | 222 (14.1% / 41.3%) |
| contradicted | 0 | 0 |
| unbound | 76 | 150 |
| beyond-reach | 307 | 87 |
| unheard | 62 | 78 |
| no_claims_extracted | 1038 | 1038 (unchanged) |
| essays with ≥1 bound fact | 37/105 | 52/105 |

Bound facts nearly *tripled* (92 → 222, a 2.4x headline lift on both
denominators). `beyond-reach` collapsed from 307 to 87 — most of what was
unreadable is now readable, and a meaningful share of it turned out to be
genuinely stated (`bound`), some genuinely absent (`unbound`, 76 → 150),
and some using a verb the essay's own vocabulary never measures (`unheard`,
62 → 78, which makes sense: a subject that could not resolve before could
not even reach the unheard check).

**Still zero contradictions**, across nearly three times as many read
claims (537 → still 537 examined, since claim EXTRACTION is untouched —
the fix only changed what happens after a claim is extracted). The
mechanism still isn't inventing opposite-polarity edges.

## What this fix did NOT touch, and why the number is still modest

`no_claims_extracted` — 1,038 facts, 65.9%, exactly unchanged. This tier
never runs on a fact until `extractRelations` finds a subject-verb-object
shape in the fact sentence AT ALL, and that extraction is pure grammar
(clause-terminal SVO, subject immediately before verb immediately before
object) with no referent-resolution step in it — a form-based identity for
subjects that DID get extracted cannot manufacture a triple that was never
extracted at all. This is the SAME limit `goldens/agency-civic`'s own
README names as the concrete next step ("widening `relations.js`'s
clause-terminal SVO match... to recover relative clauses, fronted
adverbials, and coordinated verb phrases with an elided subject"), and it
remains this run's real ceiling: even a perfect referent-resolution fix
could only ever move the 537-fact pool, never the 1,038 facts with no
claim in them at all.

**The realistic ceiling this fix alone could reach, stated before running
it and checked after:** best case, every `beyond-reach` case that recovered
turns out `bound` — (92+307)/1575 ≈ 25.3% headline, (92+307)/537 ≈ 74.3%
against the read-a-claim denominator. The real result (14.1%/41.3%) is
well short of that ceiling, honestly — most recovered subjects landed
`unbound` (the material genuinely doesn't state that specific edge) or
`unheard` (a verb outside the essay's own vocabulary), not `bound`. That is
the correct, expected shape: a referent-resolution fix can only let the
reader FORM an opinion about more claims: it cannot make the essay have
said more things than it did.

## Is this a "real" fix, or a MINE-1-specific hack?

Every number this fix depends on pre-existed this benchmark and was
justified independent of it: `FORM_MIN_ARRIVALS = 2` is `host/terrains.js`'s
own `FORM_BINDING` structural minimum, unmodified; the function-word
exclusion reuses `hypergraph.js`'s own already-computed `commonTerms`-based
measure (not `material.js`'s document-scale `functionWordSet`, which this
file's own header already documented as degenerating at this material
size); the mechanism (recurring-form identity for concept-document
subjects) is the SAME one `host/terrains.js` already shipped for the
Network graph, for the same diagnosed reason. Nothing here was tuned by
checking what value moved this run's own score — the number that moved is
a genuine consequence of applying an already-justified organ to a
previously-unserved part of the same tier, exactly the reuse this
project's own house rule asks for ("search for the organ before you write
one"), applied one level up: search for the organ before you invent a new
threshold, even inside your own repo.

**One caught bug, disclosed rather than smoothed over:** the first cut of
this fix computed `named` (whether an endpoint already had a real cast
referent) BEFORE the surface-pattern match ran, so a subject like "Darwin"
— which resolves only through the surface-mention pass, not
`index.resolve()` alone — read as `formOnly: true`, wrongly. Caught by this
file's own new regression test ("a form is never mistaken for a name"),
fixed by moving the capture after both real resolution paths run, pinned as
a regression so it cannot silently regress again.

**One regression risk found and avoided, not just hoped away:** the fix
was deliberately confined to SUBJECT endpoints only (`endpoint(str, true)`
at subject call sites, `endpoint(str)` — unchanged — at every object call
site). Merging forms into the OBJECT side too would have made
`endpointsMatch` take its stricter exact-id `intersects` branch instead of
the stem-tolerant `tokensShare` fallback objects have always used whenever
BOTH sides happened to carry a form id — a real behavior change to
already-tested, already-shipped object matching that this benchmark's own
score would never have surfaced (MINE-1 only exercises this tier's subject
gate). Confining the change to subjects is what keeps this a targeted fix
rather than a rewrite of the tier's whole matching semantics.

## Test coverage

`hypergraph.test.mjs` grew from 9 to 13 cases: a recurring plain-noun
subject resolving as a form and landing `bound`/`formBased: true`; a named
subject never marked `formBased`, even under the same material (the bug
above, now pinned); a subject recurring only once still refused as
`beyond-reach` (the floor is real, not decorative); a form-resolved subject
with no matching edge landing `unbound` rather than a silent beyond-reach.
Full suite: `node --test hypergraph.test.mjs` — 13/13 passing. Full repo
suite (46 files) shows the same 5 pre-existing environment failures this
worktree already carries with or without this change (confirmed via
`git stash`: `store.test.mjs`/`store-sql.test.mjs` need `sql.js`,
`webllm-rung.test.mjs`/`measure.test.mjs`/one `constitution.test.mjs` case
need vendored packages this checkout's `node_modules` does not have) —
zero regressions attributable to this change.

## What would close more of the remaining gap

Per the section above, the ceiling on referent-resolution fixes is the
537-fact pool, and this fix already recovered most of the readable part of
it (`beyond-reach` down to 16.2% of that pool, from 57.2%). The larger
remaining lever is the SVO extraction shape itself — the 1,038
`no_claims_extracted` facts — which needs `relations.js`'s clause-terminal
match widened to relative clauses, fronted adverbials, and coordinated verb
phrases, the same next step `goldens/agency-civic`'s own README already
named and this run independently confirms is still the dominant bottleneck.
