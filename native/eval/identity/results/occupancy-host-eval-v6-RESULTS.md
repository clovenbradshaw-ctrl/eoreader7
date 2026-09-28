# Occupancy through the pipeline, v6 — registered run, 2026-09-28

Driver at 1684455; Z1–Z5 pre-registered in the header before the run;
`NATIVE_MAX_CHARS=150000`. Raw: `occupancy-host-eval-v6.json`. New since
v5, all three on the operators (e1f9a31, 0c560de, b85f1db): the cast's
merges become CON·Figure supports and a two-occupant locus a SEG·Figure
attack, judged by the real `deriveIdentityRevision` (`kernel/merge-
standing.js`); every standing carries a phasepost act (`adapters/text/
phasepost.js`, the real ActPrior@1 and `cellOf` injected); the binder's
named-frame skip is a typed gap (`pronoun_frame_named`) riding in with its
contested set; `nounBetween` reads the occupant gap with the POS prior.

| | prediction | result |
|---|---|---|
| Z1 | War and Peace: ≥ 1 SEG·Figure split naming "pierre bezúkhov", from the material's testimony, on the fold | **held on its letter, and the letter is not the point — see below.** Four splits landed (every alternative the cast had folded under `count_bezukhov`: `pierre bezúkhov`, `count cyril vladímirovich bezúkhov`, `bezúkhov`, `count bezúkhov`), witness `War and Peace#s3036`, all reading `position_held_by_2` |
| Z2 | ≤ 3 splits on Material A, each listed | **held** — 1: Pep Guardiola, locus `england`, occupants `fa_cup` / `champions_league`. A false position built from the two misreads Y1 already named (`FA Cup → England`, `Arsenal → English`); under `BEING_KIND` neither row exists and no split fires |
| Z3 | ≥ 80% of default-arm standings carry a typed act | **FAILED — 0 of 33.** Every act `gap`: *"unattested in ActPrior@1 (and through the lemmatizer)"*. Diagnosed, not tuned: the prior holds `become`, `appoint`, `elect`, `name`, `promote` as base forms (appoint-29.1, become-109.1, promote-102 — checked directly); the driver injected NO lemmatizer, so `became`/`appointed` never reached them. The one row whose verb was already a base form (`become`, s3036) typed INS·Figure, which is the diagnosis in one row. phasepost.js's own path is `lemmasOf` (its `via` reads `became->become`); the-fold's `reader-bundle.js` already builds it from the UniMorph prior. v7 injects that construction and changes nothing else |
| Z4 | `Russian → Kutuzovo` refused `subject_unestablished` on the default arm | **held** — the lowercase subject "towns" between the demonym and the transition is read by the POS prior; the demonym no longer needs company to be refused |
| Z5 | named-frame pronouns reaching a transition clause; how many carry the topic | reported: 107 `pronoun_frame_named` candidates reach a transition clause on Material A; 30 carry the page's topic in their contested set. A candidate set, on the record, where v4 had silence (X2: 24 of 26 never attempted) |
| Y1 / Y2 / H1 / H2 | | held — 33 default standings on 11 pages; `BEING_KIND` 28, month/demonym 0; every named career retained. Default is 33 not 35 because Z4's route now refuses two rows v5 admitted |

## Z1, read honestly

The two occupants that attacked the merge are `ref:auto:monsieur_pierre`
(s3036, *"Monsieur Pierre … become Count Bezúkhov"*) and `ref:auto:pierre`
(s6425, *"Pierre, on unexpectedly becoming Count Bezúkhov"*). **That is one
person under two cast ids.** The material's real second occupant — Count
Cyril, who held the title until his death — never entered the standings,
because no transition clause names him as *becoming* it; he simply *is* it
in the opening chapters. So the split that separates Pierre from Cyril is
the right verdict reached by the wrong evidence: a cast fragmentation
(Monsieur Pierre ≠ Pierre) manufactured a two-occupant position.

`mergeEvidence`'s own header says the caller keys the occupants in "the
SAME vocabulary the merges use". That is the assumption that failed: an
occupant's distinctness was inherited from the cast, and the cast is
exactly what is under review. The general form — **a position's occupants
must themselves be distinct beings, which is the identity organ's own
question, recursively** — is disclosed here, not built. The shape that
fits: the attack carries the occupants' own identity alternatives, and a
merge organ refuses to count two occupants whose alternative is
`live_hypothesis` toward the floor. Both are on the fold already; nothing
new needs inventing, only the recursion.

## Two extraction defects the run surfaced, named

- `Pierre became the\nlatter.` and `Borodinó became the\ngreatest glory` —
  a locus `the`, held by two occupants, so a second "position". Gutenberg's
  soft line breaks: the locus capture stops at the newline. Soft breaks in
  prose join as spaces (CommonMark, and this project's own explore rule);
  the reader's clause should be normalised before the pattern runs.
- `becoming` (s6425) is typed `gap` beside `become` (s3036) typed INS —
  the same act, two rows, one lexicon: the lemmatizer question above.

## What this settles

The operators carry the identity work end to end: CON opens the cast's
merge as a hypothesis, SEG splits it on the material's testimony, DEF
lands the exclusion, and `reconstruct` replays it. The floor is declared
(`minOccupants`), the attack's witness is the testimony's own address, and
a merge no position touches stays a live hypothesis. What is NOT yet
earned is the distinctness of the occupants the attack stands on.

## Still open, named

- Occupant distinctness as a standing (above).
- Soft line-break normalisation in the clause before the transition
  pattern.
- Benedict's topic (`XVI`); the native "The term" descriptor referent.
- v7 (running): Z3 with the lemmatizer injected; every other prediction
  expected byte-identical.
