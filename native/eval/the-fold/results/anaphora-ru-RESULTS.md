# The anaphora layer on Russian — investigated before the pronoun arm, per the redirect

Investigation record. User direction, twice: first the course-correction
*t"ravel up, what is before pronoun. anaphora? pronoun needs to be a special
case"*, then the explicit choice *"Investigate anaphora layer first"* when
asked how to treat the order-7 pronoun arm. So this pass runs the REAL native
organs (`extractSurfaces` -> `discoverReferents`) against the real fetched
Russian Borodino fixture and characterizes the coreference map the pronoun
resolver will consume — before touching any pronoun wiring.

Nothing here changes code. This is the measurement the funnel is meant to sit
on, recording the exact state, so the wiring decision downstream is made
against evidence rather than against the pronoun register's seductive
proximity to the symptom.

## Why the funnel is upstream of pronouns

In every order-7 call site (`eval/mhc-battery.mjs` 743, 970, 1000, 1034) the
reading ladder is:

1. `splitSentences`
2. `extractSurfaces`
3. **`discoverReferents` -> the `map`** (anaphora / coreference)
4. `resolvePronouns(sentences, map, ...)` — binds a pronoun to referents the
   coreference layer already admitted.

The pronoun resolver is NOT an independent organ that merely needs a language
lexicon (`pronoun-ru.json`). It is the downstream consumer of the coreference
`map`. A pronoun like `он` can only bind to a referent the anaphora layer
already established. That is the coupling the redirect names by "pronoun
needs to be a special case": order 7's health is coupled to order 5's, one
tier down.

## What the layer actually does on Russian — measured, not reasoned

`discoverReferents`'s mechanism is token-identity coreference (`surfaces.js`):
two surfaces corefer only via `namesCorefer` — containment of individuating
tokens, or a shared final (surname) token over `diaNorm` (diacritic/typography
fold only; no morphological stemming; the possessive strip handles only
English `'s`). Russian is a suffixally-inflecting language: the same person
appears under different grammatical CASE-FORMS whose orthographic stems differ.

Running the real fixture (`wikipedia-borodino-ru.html`, extracted live,
91,912 chars, 1,659 sentences, 674 surfaces, 163 events, 144 referents):

### The same entity, stranded across many referents

| entity (one being) | referents the layer split it into |
|---|---|
| **Кутузов** (article's central figure) | `Кутузов`, `Кутузову`, `Кутузовым` — 4 (and `Кутузова` is not even among them: it merged into a spurious `Кутузова Александру`) |
| **Наполеон** | `Наполеон`, `Наполеона`, `Наполеоном` — 3 |
| **Багратион** | 6 (`-а`, `-овых`, `-ова`, `-овы`, `-у`, bare) |
| **Москва** | `Москве`, `Москву`, `Москвы`, `Москвой` + adjectivals `Московского`, `Московской` — 6 |
| **Бородино** | 12 (adjectival `Бородинском/-ской/-ское/-ский/-ых` + case forms) |

The historical figures of the article — the exact antecedents a `он`/`она`
would bind to — are each a small forest of grammatically-distinct fragments.
Only 12 of 144 referents merged more than one surface; every multi-surface
referent merged only on exact-token or shared-final-token coincidence.

### The mechanism, probed directly

```
namesCorefer("Евгений", "Евгения")                      = false
namesCorefer("Кутузов", "Кутузова")                     = false
namesCorefer("Михаил Илларионович Кутузов",
             "Михаила Илларионовича Кутузова")          = false
namesCorefer("Наполеон", "Наполеона")                   = false
namesCorefer("Барклай де Толли", "Барклая де Толли")    = true   // accident
```

The last row is TRUE only because both forms share the final token `толли`
(the surname-final-token heuristic) — a rescue, not a rule: the nominal stem
`барклай`/`барклая` differs exactly like the rest.

## The consequence for the pronoun arm

Injecting `pronoun-ru.json` removes the *0-attempted* ceiling — the resolver
would now recognize `он` as a pronoun instead of English-only
`ANAPHORIC_PRONOUNS`. It cannot remove the real bound, because the `map` the
resolver consumes is this stranding: a `он` for Kutuzov has four fragment-
referents to compete over, and for the adjectival forms (`Бородинском`) no
pronoun antecedent exists at all.

So P70's third amendment described order 7 correctly ("0 pronouns even
ATTEMPTED... an English-only closed class") but that line named the SYMPTOM —
the register is what stops the attempt, the stranded map is what would stop
the binding regardless. The register was the visible ceiling; the anaphora
layer is the dependency underneath it.

## Why English does not hit this

English proper nouns do not inflect for case — `Robert` is textually identical
in every grammatical position — so token-identity coreference works, order 5
passes, and order 7's `map` is a clean surface->referent index on both English
materials. The P70 record's own two English materials (war-and-peace,
borodino) are unproblematic here for exactly that structural reason. The
difference is a property of the WRITING SYSTEM (inflection), not of this
reader.

## What a real fix would require — upstream, where the redirect points

The coreference seam, not pronouns:

1. `namesCorefer` (surfaces.js:47) needs a morphological stem-merge for
   inflecting scripts, folding `Кутузов/Кутузову/Кутузовым` onto one stem
   before token identity — the same class of move the existing
   `stripPossessive` (English `'s`) already makes, generalized past English.
2. The stem-merge boundary is real and must not over-merge: `Кутузов` and
   `Бородинский` are genuinely different words that must stay apart, even
   though they share the pattern that made `Кутузов`/`Кутузовым` merge. The
   gate is grammatical-number/tense/adjectival morphology, never bare
   prefix overlap.
3. `extractSurfaces`'s capitalised-RUN logic (surfaces.js:61) treats each
   inflected capitalised token as a new surface — an options clamp there is a
   second, independent lever.

None of this is built here. This record is the measurement the build decision
sits on.

## Honest scope

The strandings above are the layer's UNDER-merge. The P70 third-amendment
row already records the P66-era over-merge on Cyrillic too (`Евгений` merged
with `Италии Евгения` — the wrongly-merged row in the mhc-RESULTS.md
coreference table: `Италии Евгений Богарне` | `Италии Евгения`). Both
directions of the Cyrillic defect are live in this fixture and both live in
the coreference layer, one tier below the pronoun arm.
