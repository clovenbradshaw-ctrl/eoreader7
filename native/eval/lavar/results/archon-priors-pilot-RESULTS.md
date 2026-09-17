# Archon priors pilot — Nietzsche (2026-09-17)

**Driver:** `../archon-priors-pilot.mjs nietzsche` — fetches its two texts
from Project Gutenberg and caches them under `../fixtures/archon-priors/`
(gitignored, the same fetched-third-party-text pattern
`.github/workflows/frankenstein-native.yml` already uses for its own
`curl ... --output /tmp/frankenstein.txt`; re-run reads the cache instead
of re-fetching). The fixture text is NOT committed — the edition, URL and
PD-basis are declared in `lib/archon-priors.mjs::ARCHON_ROSTER`, so a fetch
reproduces byte-identical public-domain text and nothing is lost by not
committing 15,000 lines of book text into git history.

**What this tests.** The user's own plan (2026-09-17, verbatim): ground a
swarm ant by priming it with a public-domain archon's own composition
*chemistry* — which relation-label pairs compose, never the archon's own
sentences or referents (`lib/archon-priors.mjs::stripArchonReferents`
enforces this: only `standing: "given"` rows survive, and `witnesses` are
always dropped before the file is ever written). The pipeline is the real
one: `lib/read-recipe.mjs::readMaterialText` — the SAME recipe
`chapter-swarm.mjs` and `cli/eoreader7.mjs` already run — over real fetched
Gutenberg text (Project Gutenberg #4363, *Beyond Good and Evil*, tr. Helen
Zimmern, 1907; #52263, *Twilight of the Idols* / *The Antichrist*, tr.
Anthony M. Ludovici, 1911 — both confirmed public domain by publication
date, not merely assumed from the author's era).

## Method

A single flat read over one whole book (389,072 chars) did not complete in
a multi-minute budget — measured live, killed after ~5 minutes with no
result. `chapter-swarm.mjs` already solves exactly this by reading per
CHAPTER and accumulating corroboration across chapters
(`nominationByPair`); `buildArchonPrior` generalizes that pattern one level
up, chunking each work into ~20,000-char paragraph-boundary chunks and
accumulating nominations **across every chunk of every work in an archon's
declared roster** (`ARCHON_ROSTER.nietzsche.works`, two entries). A pair
nominated by `minChunks` (default 2) or more **distinct chunks** — from the
same work or different works — is promoted to `given`; a promoted pair, and
only a promoted pair, survives `stripArchonReferents`'s wall into the
persisted prior.

## Result

| run | chars | works | chunks | encounters | relation edges | distinct nominated pairs | promoted (minChunks:2) |
|---|---|---|---|---|---|---|---|
| single work (BGE only) | 389,072 | 1 | 22 | 1,986 | 2,506 | 99 | **0** |
| both works pooled | 816,592 | 2 | 45 | 5,075 | 5,891 | 251 | **0** |

**Zero pairs corroborate at exact label-pair granularity, even pooled
across two full, independently-translated works totaling over 800K
characters and 5,891 extracted relation edges.**

## This is a real, disclosed finding, not a bug

It was checked, not assumed: the accumulator's own chunk-identity
(`w${w}c${i}`, unique per work and per chunk) was verified correct before
trusting the zero; a display-counter bug in the progress callback (fixed
the same pass) never touched the accumulation logic itself, only what was
printed.

The honest reading is that **exact relation-label-pair recurrence is rare
on real natural-language prose**, which is not a new finding for this
project — it is the SAME wall this codebase has measured and recorded
repeatedly elsewhere (the-fold's own P83: "not a weak witness but the
material"; this repo's `hyperlexicon-door-probe`/`admission-gate` results).
It is also the concrete, empirical justification for a mechanism that
already exists one level up: `kernel/hyperlexicon.js::compositionAffordance`
has a **structural fallback** keyed on GRAIN rather than the literal
label — "VERB/AUX are English lenses; the grain is not" — precisely because
exact-label chemistry this thin could never carry real composition
licensing on its own. An archon's prior, as built here, is real and
correctly wall-enforced; whether it is USEFUL to a grounded ant likely
depends on adding the same grain-level generalization this project's own
kernel already uses elsewhere, rather than tightening exact-label matching
further — named as the natural next measurement, not built here.

## What is verified and shipped

- `lib/archon-priors.mjs` — `buildArchonPrior`, `stripArchonReferents`,
  `compositionAffordanceWithArchon`, `chunkArchonText`; 7 conformance tests
  (`lib/archon-priors.test.mjs`), all against real kernel organs
  (`createHyperlexicon`/`giveHyperlexiconAffordance`/
  `admitHyperlexiconCandidates` from `kernel/hyperlexicon.js`).
- Two real, PD-confirmed Gutenberg texts committed as fixtures.
- `wilson.mjs`'s `recordBirth`/`preserveBreakthrough` gained an optional,
  additive `archon` parameter (defaults `null`/`"wilson"`) — ready to
  credit an archon as giver the moment an ant is actually primed by one,
  per the plan's own point 4. Verified: neither function is exported or
  imported elsewhere, so this is a fully isolated, backward-compatible
  change (confirmed by grep, not assumed).

## What is NOT done, disclosed rather than implied

**Wiring an archon's prior into an ant's own read (plan point 3)** — the
actual "priming" — requires editing `eot-jsonl.mjs` (1,631 lines, not read
in full this pass) to accept an archon parameter and thread it to wherever
that pipeline consults `compositionAffordance`. The real consumer of a
caller-supplied hyperlexicon already exists and has precedent:
`kernel/relation-composition.js::evaluateRelationCompositions(entries,
hyperlexicon)`, used today by `eval/experienced-new-book.mjs:177` — but
`eot-jsonl.mjs` does not call it today (confirmed by grep), so wiring
requires reading that file first, not guessing at it. Not attempted this
pass, given the real risk of an unverified change to a file with same-day
live commits already on `main`.

**Point 5 (cross-archon CON breeding, a CONTESTED dispute ledger via
`reasoning-lint.js::findClaimCycle`)** depends on point 3 existing first —
two archons cannot disagree about how to read a passage until an ant can
actually be grounded by one. Not attempted.

**A second, more repetitive archon or genre** (e.g. Homer's formulaic
epithets, which recur by design in a way philosophical aphorism does not)
is the more promising next test of whether `minChunks:2` is reachable at
all with exact-label matching, before concluding the grain-level fallback
is strictly required. Not attempted this pass.

## Archon priors pilot — Homer, read in the original Ancient Greek (2026-09-17, second pilot)

**Driver:** `buildGreekArchonPrior("homer", [iliadText, odysseyText],
{posPriorPath, casePriorPath})` — the Greek-language analogue of
`buildArchonPrior`, over Project Gutenberg #6130 (*The Iliad*, tr. Alexander
Pope, 1715–1720) and #1727 (*The Odyssey*, tr. Samuel Butler, 1900) **read
in their original Ancient Greek** (the Perseus Digital Library's
`canonical-greekLit` TEI edition of the Monro/Allen Greek text — the
translator/PD-basis fields on the roster name the PUBLIC-DOMAIN ENGLISH
Gutenberg works, since the Greek text itself long predates any copyright
term; the translations are listed because they are what "gutenbergId" on
the roster actually resolves to and were the pilot's first, since-corrected
approach — see below). User direction, verbatim, mid-pass: *"We're doing
this in Greek, right?"* — closing a first cut that had (wrongly) read the
ENGLISH translations through the same case-marked Greek reader.

**Why Greek needed its own reading, not English's.** `greek.mjs`'s own
header (2026-09-17): the positional reader's clause gate (`eot-jsonl.mjs`'s
S90) refuses 254/259 real sentences of Epictetus' Enchiridion, because
Ancient Greek grammaticalizes its subject IN the verb and orders words
freely — the English `readMaterialText` path used for Nietzsche above would
extract almost nothing from real Greek. `greekEntries` (this file) is the
Greek-specific analogue: `greekClauses`'s case-marked reader (nominative
subject / accusative-or-genitive object, by ENDING not position) supplies
the clauses; `greekBeings` supplies the referent identity a clause's
`subjectRef`/`objectRef` bind to, without which `kernel/
relation-composition.js`'s bridge requirement (one edge's object referent
equals the next edge's subject referent) can never be met and nothing can
compose.

### Three real defects found building this, each fixed and pinned as a regression

**1. `greekBeings`'s article-gate finds ZERO beings on real Homeric text.**
The tier as originally built (this pass, before the fix below) requires a
recurring ARTICLE + NOMINAL-HEAD phrase — the shape Koine/Attic prose
(Epictetus, the organ's own calibration material) reliably supplies.
Measured directly: across the WHOLE real Iliad+Odyssey corpus (1,230,726
chars), `greekBeings(text, prior, {minOccurrences:2})` returns **0**
beings — Homeric epic's own proper names are overwhelmingly BARE (never
preceded by an article) and are largely unattested in a Koine/Attic-trained
POS prior at all (checked: 0 of 6 tested Iliad character names attested in
`pos-grc.json`'s 29,986-form vocabulary). Fixed with a genuinely new tier,
`bareBeingCandidates`/`greekBeings`'s `includeBare` option: a RECURRING
CAPITALISED token is admitted as a candidate when the prior is silent on it
(the same tolerance discipline the file already states for `prodropClauses`'s
object run, generalized here) or when the prior confidently confirms it
nominal; a token the prior confidently types non-nominal is still refused.
Licensed by measurement, not assumed: sentence-initial capitalisation in
this real Perseus edition (8.9%, 84/941 tokens sampled) is statistically
indistinguishable from the OVERALL word capitalisation rate (9.4%,
3,049/32,281) — unlike English's near-100%-at-sentence-start confound
(the reason `surfaces.js`'s own `CAP_TOKEN` callers exclude sentence-initial
position), this edition's orthography reserves the mark for proper names
specifically, so no sentence-initial exclusion is needed or carried over.
Result: 0 → 581 beings across the same corpus, with real, recognisable
Homeric names and places at the top (Ἀχαιῶν/Achaeans 320 occ., Ἕκτορος/Hector
251, Ἀχιλλεύς/Achilles 231, Τρώων/Trojans 196, Ἀτρεΐδης/son-of-Atreus
(Agamemnon) 168, Ἀθήνη/Athena 105, …). Pinned in `greek.test.mjs` (4 new
cases: refused by default, found under `includeBare`, a bare and an
article-headed occurrence of the same stem merging into ONE being rather
than double-counting, and two negative controls — a lowercase common noun
and a prior-confirmed non-nominal capitalised token — both correctly
refused).

**2. `greekClauses`'s predicate-nominative fallback re-selected its own
subject.** With real Homeric beings finally in hand, `greekEntries` began
producing edges — including self-referential ones: `Ἀπόλλωνος —ἔχων→
Ἀπόλλωνος` ("Apollo has Apollo"). Traced directly (byte-level tracing
against the real prior, not guessed): when a clause has exactly ONE
nominative-cased nominal (Homer's own bare, often verb-initial clauses
supply this constantly) and no accusative/genitive alternative, the old
fallback (`nominals.filter(n => n.at[0] > v.end).find(n => n.case ===
"Nom")`) searched the SAME `nominals` array the subject was already drawn
from and re-found the identical token. The pre-existing copula-thesis test
("ὁ θάνατος ἐστίν φόβος") never exercised this path because its fixture
always supplies two DISTINCT nominative tokens. Fixed with a one-line
identity exclusion (`n !== subject`) — the predicate complement must be a
second, distinct nominal, never the subject re-selected. Pinned as a
regression (`greek.test.mjs`, verb-first single-nominative fixture); the
existing copula-thesis test still passes unchanged.

**3. `greekClauses`'s own nominal-collection loop required POS-prior
attestation SEPARATELY from `caseOf`'s own case-ending reading, discarding
every genuinely case-determinable but POS-unattested token before `caseOf`
was ever consulted.** `caseOf` needs no POS attestation — it reads case from
the word's own ending against a DIFFERENT resource (the case-prior) with
its own confidence floor. Requiring BOTH resources to agree on the same
form was a narrower gate than either alone. Fixed: a token the POS prior
confidently classifies non-nominal is still refused outright (the prior's
veto holds); an UNATTESTED token is now admitted when `caseOf` can settle
its case. One hazard this immediately surfaced and closed in the same
edit: the Greek ARTICLE itself (τόν, τῆς, …) declines to agree with its
noun's case, so an unattested article's own ending can read as a real case
exactly like a real noun's — `ARTICLES` (already this file's own closed,
received, prior-independent list, used by `greekBeings` above) is now
checked first, unconditionally, before either signal, so no prior's
coverage gap can ever let an article itself win a subject/object slot.
Pinned as two regressions (an unattested-but-case-determinable common noun
now correctly admitted; an unattested article never admitted despite a
real ending match) alongside the pre-existing case-reading test, which
still passes unchanged.

### Result

| corpus | chars | works | chunks | clause edges | distinct nominated pairs | promoted (minChunks:2) |
|---|---|---|---|---|---|---|
| Iliad + Odyssey, real Greek | 1,230,726 | 2 | 63 | **43** (0 before fix #1) | 3 | **0** |

**The referent-identity gap is closed — real Homeric clauses now bridge,
with correct referents (Agamemnon↔Atreides, Hector↔Patroclus, Athena↔Pallas,
Telemachus↔Antinous, Nestor, Odysseus, …) and zero self-loops after fix #2.
But exact VERB-LABEL-PAIR corroboration across 2+ independent chunks is
STILL zero** — the same wall the Nietzsche pilot above already measured,
now cleanly separated from the referent-identity confound that made the
ORIGINAL "Homer finds nothing" diagnosis ambiguous between two different
causes. Of the 3 distinct composition-candidate pairs the whole corpus
nominates, each appears in exactly ONE chunk; none repeat.

**This generalizes, not narrows, the earlier finding.** Homer was chosen
specifically as "the more repetitive archon or genre" most likely to defeat
the Nietzsche result (per this document's own prior section) — famous for
formulaic, deliberately-repeated epithets. Even so, once the referent gap
no longer confounds the measurement, exact relation-LABEL-pair
corroboration (as opposed to referent recurrence, which `greekBeings`
demonstrates is genuinely abundant — 581 beings) remains rare across
independent passages of real natural-language text, formulaic epic verse
included. The natural next measurement remains exactly what the Nietzsche
section above already named and did not attempt: `kernel/
hyperlexicon.js::compositionAffordance`'s existing structural GRAIN-level
fallback, rather than a further-tightened or further-relaxed exact-label
match. Not attempted this pass either — this pilot's own scope was closing
the referent-identity gap that made the prior Homer measurement
uninterpretable, which is now done and cleanly disclosed.

### What is verified and shipped (this pilot)

- `greek.mjs` — `bareBeingCandidates` (new), `greekBeings`'s `includeBare`
  option (additive, default `false`, every pre-existing caller and all 22
  pre-existing tests byte-identical), the predicate-nominative and
  prior-silence fixes to `greekClauses` (both additive-safe, confirmed by
  the pre-existing copula-thesis and case-reading tests still passing
  unchanged). `greek.test.mjs`: 22 pre-existing + 7 new = 29/29 passing.
- `lib/archon-priors.mjs`'s `greekEntries` wired to `includeBare: true`
  unconditionally (its own header now states why, with the measured
  numbers).
- `lib/archon-priors.test.mjs`'s own prior "THE MEASURED HOMER FINDING"
  test (which had pinned the NOW-SUPERSEDED, narrower diagnosis — "Homer's
  sparser article usage means greekBeings finds nothing at all") rewritten
  to state honestly what it still demonstrates at fixture scale (recurrence
  is required by either tier; a name mentioned once bridges to nothing
  regardless), plus a new companion test proving the real fix (an
  unattested, never-articled invented name recurring bare now bridges via
  `greekEntries`). `lib/archon-priors.test.mjs`: 13 pre-existing + 1 new
  (net) = 14/14 passing.
- `greek.test.mjs` + `archon-priors.test.mjs` combined: 43/43 passing.
- Full native suite (`node --test native/conformance/*.test.mjs
  native/conformance/**/*.test.mjs native/organs/*.test.mjs
  native/kernel/*.test.*`, 911 tests): failure set diffed by NAME against
  the pre-this-pass baseline via `git stash` — byte-identical (18 failures,
  same 18 by name), zero regressions.

### What is NOT done, disclosed rather than implied

**`archon-falsification.mjs` (Wilson + Aristotle + Pythia, grounding a
novel Alice in Wonderland reading with the archon's own chemistry) was NOT
run to completion.** Its own early-exit (`if (archonPrior.entryCount === 0)
{ ...REFUSING... }`) is the correct, honest behavior given this pilot's own
measured `entryCount: 0` — running it anyway would mean either fabricating
non-empty chemistry or silently lowering `minChunks` without disclosure,
neither of which this pass does. The falsification demonstration remains
built and ready (unchanged from its prior state) for the moment a
non-empty archon prior exists to test it against — which now depends on
the grain-level fallback named above, not on anything Greek-specific.
