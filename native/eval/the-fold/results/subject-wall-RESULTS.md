# Subject walls — floor 2 for floor 5 (2026-09-02)

**Driver:** `eval/the-fold/subject-wall.mjs` (~30s, no model, no network;
raw numbers in `results/subject-wall.json`). **Organ:** `adapters/text/
relations.js::expandSubjectNP`, the DR4 subject walk, with five walls added
(`subjectWalls: true`, the default when `nounPhraseSubjects` is on;
`subjectWalls: false` reproduces the earlier walk byte for byte). **Reader:**
the production configuration (`organs/hypergraph.js` now hands the walk the
POS prior's verb-dominant and adposition-dominant forms). **Control:** every
received class replaced by the same number of tokens drawn at random from
the material's own words, seed 7 — object-boundary.mjs's own precedent: if
cutting shorter is what helps, the random arm helps as much.

## Why this is floor-5 work

A note whose end is debris can never be corroborated: nothing else will
ever say "night I" or "the window Lucy" or "I ran downstairs and". P74
named subject-span debris as the lever nobody had pulled. Read off real
Dracula prose with each debris subject's own source sentence beside it, the
debris had five shapes, and every one is a closed-class fact the walk was
not consulting:

| shape | specimen (legacy → walls) | the wall |
|---|---|---|
| relativizer at the anchor's edge | "One of the men **who** came" → "One of the men" | CLAUSE_OPENERS as a trailing trim |
| negation in the anchor | "I **never** saw" → "I" | NEGATION_WORDS as a trailing trim |
| pronoun glued to its matrix clause | "I think **it** will", "I hope **I** did", "of **what** might" → "it", "I", "what" | SUBJECT_PRONOUNS (new, giver lang/en): a pronoun is a whole subject |
| determiner-initial anchor widened into the previous clause | "I came in view again **the cloud** had" → "the cloud" | a determiner is the NP's own left edge (chains continue across "of" and, now, a received adposition: "every joint in my body") |
| coordinated predicate glued on | "the poor thing became quiet and **fell**", "I ran downstairs and **looked**" → "the poor thing", "I" | the POS prior's verb forms as a wall through a coordinator (`verbWall`): the verb before the coordinator shares our subject |

Plus the corrections the first cut needed, found by diffing every rewritten
subject against the old one rather than by trusting the tally: a pronoun
after an NP coordinator is a sibling, not a whole subject ("Lucy **and I**"
stays "Lucy and I"); a verb form right after a determiner is a noun ("the
**ruins** of the abbey"); a predeterminer joins its NP ("the knowledge of
**such a** thing"); a verb at the anchor's edge is a swallowed predicate ("I
**wished** to get" → "I"; "it **might have**" → "it").

## Result

| material | arm | bound | subject = referent | debris (any class) | led by function word | >8 tokens |
|---|---|---|---|---|---|---|
| Dracula, 120KB of narrative | legacy | 371 | 83 (22%) | 96 (26%) | 76 | 4 |
| | **walls** | 278 | **78 (28%)** | **30 (11%)** | 15 | 2 |
| | random control | 246 | 26 (11%) | 37 (15%) | 26 | 0 |
| Battle of Borodino, encyclopedic | legacy | 344 | 253 (74%) | 66 (19%) | 23 | 2 |
| | **walls** | 332 | 250 (75%) | 62 (19%) | 19 | 2 |
| | random control | 186 | 121 (65%) | 22 (12%) | 12 | 0 |

**The control separates the classes from the cutting.** Random walls cut
harder (Dracula 371 → 246, Borodino 344 → 186) and destroy referent
subjects (83 → 26; 253 → 121). The received walls cut less and keep the
referents (83 → 78; 253 → 250) while removing two thirds of the debris on
narrative prose. So the gain is from WHICH tokens wall, not from walling.

**The cost, priced.** Dracula loses 93 bound claims. 44 are matches with no
subject left under the walls (a bare "and", "but", "who" — refused, typed,
counted on the result as `refusedSubjects`, never emitted). The rest are
claims whose subject used to bind through debris — "night I" bound on the
recurring form "night"; the honest subject is "I", which resolves to
nothing in a first-person diary and so does not bind. Those were bound
edges about nothing; losing them is the point.

**Encyclopedic prose barely moves** (Borodino 344 → 332, debris 66 → 62): the
debris there is a different animal — prepositional-phrase subjects ("on 18
August", "with Kutuzov") and the classifier's own false positives ("the
Battle of Moscow" reads to it as a common noun glued to a name). The walls
were built for the narrative shapes and do not pretend to touch these.

**Named, not fixed:** "the window Lucy" and "found Lucy" survive — a proper
name with a common noun glued to its left has no closed-class wall; it
needs the prior's noun-dominant forms (a NOUN before a name is a wall) and
that is the next lever, disclosed here rather than layered on now. "puckered
look" loses its noun because "look" is also a verb form and no determiner
protects it. Every extractor test passes (48, up from 40), including a pin
that the walls-off path is byte-identical to the old walk; the full native
suite 468/10 + 335/12, the same environment failures, zero new by name.
