# How often is "X (Y)" an alias? The alias route, measured out of sample

Driver: `eval/the-fold/alias-precision.mjs` · organ: `organs/aliases.js` (`declaredAliases`, `licenseAliases`) · raw record: `alias-precision.raw.json` ·
labels: `alias-precision-labels.json` · reader: `tests/alias-precision-results.test.js`. Law: the-fold POLICIES.md P263, READING-SPEC.md S137.

## What was asked

The user's direction (2026-09-30): "figure out the possessives and alias stuff, signal Chomsky and Sullivan." The alias route the E6 harness used reads
what the material itself declares — "the Regional Transit Authority (RTA)" — against `AliasDeclarationPrior@1` (a corpus measured which declaration
shapes English prose uses), applies the floors its caller declares (a shape must have fired ≥ 100 times with a confirm rate ≥ 0.3; the gloss must be
used ≥ 2 times), and folds the two forms into one referent class. Nothing had asked how often the parenthetical IS an alias. Sullivan's discipline is the
question: the connection between a written sign and the thing is earned per language and re-measured per corpus, never assumed.

## Design, fixed before the walls' decisions were read

Fresh files only (a different seed than the exploration that designed the walls, excluding every file that exploration read); a stratified draw of what
the **unwalled** organ admits, written without any wall decision; the pair (full, alias) is the unit; T = the two forms name the same thing so folding
them into one class would be right wherever either appears, F = anything else (a disambiguator, qualifier, affiliation, equation or code artifact, list
annotation, pronoun pair), U = cannot tell. One judge, the author of the walls, not independent. The labels were fixed, then the decisions opened.

The distinctness walls (`licenseAliases`) are vetoes derived from the material's own behaviour — never an admission and never a string-shape rule
(aliases.js's header refuses an initials rule: "a rule that derives a name is a rule that can invent one"): **shared-label** (one gloss declared against
two distinct fulls is a label), **co-present** (the full and the gloss stand together in another sentence), **not-name-behaved** (a gloss written
lowercase is a description; a capitalised one used lowercase elsewhere is a common word).

<!-- alias:begin -->
corpus /home/user/live_priors/ · 7 categories · fresh files only (seed 99, none that the exploration seed 7 read) · first 400000 chars · floors {"minConfirmRate":0.3,"minFires":100,"minUses":2} · stratified draw seed 2026

| corpus | sample | true | false | unwalled precision | walled admits | walled true | walled false | walled precision | recall of true |
|---|---|---|---|---|---|---|---|---|---|
| 02-encyclopedic | 50 | 4 | 45 | 8.2% | 3 | 0 | 3 | 0.0% | 0.0% |
| 05-academic-papers | 30 | 9 | 21 | 30.0% | 8 | 5 | 3 | 62.5% | 55.6% |
| 06-government-legal | 30 | 7 | 23 | 23.3% | 8 | 4 | 4 | 50.0% | 57.1% |
| 01-literature-books | 16 | 3 | 13 | 18.8% | 3 | 0 | 3 | 0.0% | 0.0% |
| 14-holy-texts | 8 | 1 | 7 | 12.5% | 1 | 1 | 0 | 100.0% | 100.0% |
| **all** | 134 | 24 | 109 | 18.0% | 23 | 10 | 13 | 43.5% | 41.7% |

What the walls refused, by the wall that fired (labelled pairs only):

| wall | refused a true alias | refused a false one |
|---|---|---|
| not-name-behaved | 7 | 38 |
| shared-label | 4 | 53 |
| co-present | 3 | 5 |

population the sample was drawn from (distinct admitted / licensed, per corpus): {"admitted":{"01-literature-books":16,"02-encyclopedic":258,"05-academic-papers":729,"06-government-legal":608,"14-holy-texts":143},"licensed":{"01-literature-books":3,"02-encyclopedic":41,"05-academic-papers":200,"06-government-legal":145,"14-holy-texts":9}}

true aliases the walls refused (14):
  2. "Jahannam" / "hell" — not-name-behaved
  7. "Mystery" / "Dongxuan" — co-present
  12. "Hajj" / "pilgrimage" — not-name-behaved
  25. "Nonaction" / "wu wei" — not-name-behaved
  52. "NASA Space Technology Graduate Research Opportunities" / "NSTGRO" — shared-label
  61. "LO2-augmented NTR" / "or LANTR" — not-name-behaved
  66. "The FLame and Advanced Rocket Experimentation" / "FLARE" — shared-label
  72. "SOLID MODELLING AEROSPACE RESEARCH TOOLS" / "SMART" — shared-label
  100. "Botswana Congress Party" / "BCP" — co-present
  101. "Parti Democratique Gabonais" / "PDG" — shared-label
  108. "Konvansyon Inite Demokratik" / "KID" — co-present
  114. "Grad" / "gradient" — not-name-behaved
  123. "Div" / "divergence" — not-name-behaved
  125. "Rot" / "Rotation" — not-name-behaved

false aliases the walls kept (13):
  13. [02-en] "Mahavira" / "Jainism"
  19. [02-en] "Zoroaster" / "Zoroastrianism"
  42. [02-en] "Jesus" / "Christianity"
  53. [05-ac] "Equation" / "4.4"
  67. [05-ac] "REACTOR HOMOGENEOUS FAST HETEROGENEOUS TYPE THERMAL" / "NO MODERATOR"
  77. [05-ac] "R" / "2.6"
  94. [06-go] "Banjul" / "Gambia"
  96. [06-go] "Yu Shan" / "Taiwan"
  98. [06-go] "Russia" / "Siberia"
  106. [06-go] "Amsterdam" / "Netherlands"
  119. [01-li] "EXTRACTS" / "Supplied by a Sub-Sub-Librarian"
  120. [01-li] "Theory of Electrons" / "English edition"
  121. [01-li] "And" / "I added"
<!-- alias:end -->

## What the numbers say

**The declaration shape alone is not evidence of identity: 18.0% precision** (24 of 133 decided admits). Most "X (Y)" in real prose is a
qualifier or an attribute — "Banjul (Gambia)", "Mahavira (Jainism)", "Jesus (Christianity)", "Equation (4.4)", "Real GDP (purchasing power parity)", a
list annotation, a code comment. Folding those into one referent class would merge a city with its country and a founder with his religion.

**The walls remove most of that and lose most of the true aliases: 43.5% precision on 23 admits, 41.7% recall.** They cut
the false admits from 109 to 13; the price is 14 of 24 true aliases. In the encyclopedic and literary corpora the walls admitted three each and none was an
alias. This is not a route to fold by.

**What the lost true aliases are** (the table above lists each with the wall that fired):

- **Glosses of common nouns** — "Jahannam (hell)", "Hajj (pilgrimage)", "Nonaction (wu wei)", "Grad (gradient)", "Div (divergence)", "Rot (Rotation)". The relation
  is real; folding the lowercase word into a referent class is not safe (`hell` is also Christian hell, `gradient` is every gradient), and the not-name-behaved
  wall refuses exactly that. My labelling rule said "folding … would be right wherever either appears", which these fail; I labelled the relation, not the rule,
  and noticed only after the decisions. They are reported as labelled, not moved.
- **Acronyms the walls over-veto** — four by shared-label (the same full declared twice with a plural/singular or spelling variant, "Opportunities"/"Opportunity",
  "Modelling"/"Modeling", or with leading words, "Development of the UT San Antonio FLame and …"; one is a real ambiguity, "PDG" glossed against a party and against a
  person), three by co-present (a list that sets the gloss beside the full, "Botswana Congress Party or BCP"). The shared-label wall counts string-different
  fulls as distinct; grouping them by the engine's own sameness test would recover some — not done, because it would be tuning a wall against the specimens that
  found the fault.

**What the walls keep wrong** (13): attributes of the form "Name (Class)" — founder/religion, city/country, a spec annotation, a list heading. A veto derived from
behaviour cannot tell "Gambia" (used again as the country) from "PDG" (used again in place of the party). That needs POSITIVE evidence of substitution.

## What this decides

**The alias route is not wired into the app.** No bar was declared in advance; stated now, and the answer does not depend on it: an automatic identity fold needs
≥ 90% precision on ≥ 30 decided admits, and the walled route reaches 43.5% on 23 (a bar of 50% fails as well). The unwalled route, which is what E6 ran, is 18.0%.

**What the doctrine and the numbers point to.** A declaration is a witness's statement ("the writer says Y names X"), not a verdict. This repo already treats a weak,
single-source claim that way — as a note with a witness and a standing, folded only when corroborated, with the refuting side as the veto (kernel/notes.js; `bridges.js`
does it for cross-document referents). The alias route should enter that ledger and an identity fold should be gated on standing, not on the shape. That is design work,
not done here. An initials rule, which would have rescued the acronyms, is exactly what aliases.js declines to build.

## Disclosed limits

- **One judge, not independent, 134 pairs, one run.** The walled route admitted 23: its rate has a wide interval. The unwalled rate rests on 133 decided.
- **Same corpus family as the prior's.** `AliasDeclarationPrior@1` was measured over 900 files of `live_priors`; the sample is fresh files from the same corpora, not an independent genre.
- **The labelling rule and the walls' rule differ** (above). Both numbers are reported; neither was moved.
- **English only**, by the prior's own scope.

## Reproduce

```
node eval/the-fold/alias-precision.mjs --raw out.json           # needs ../live_priors beside this checkout (or --root); 1.5 s
node eval/the-fold/alias-precision.mjs --show out.json --from 1 --to 40   # the sample alone, no decisions: label from this
node eval/the-fold/alias-precision.mjs --summarize out.json --labels eval/the-fold/results/alias-precision-labels.json
node --test tests/alias-precision-results.test.js organs/aliases.test.mjs
```
