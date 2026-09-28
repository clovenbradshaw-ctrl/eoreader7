# Occupancy through the pipeline, v4 — registered run, 2026-09-28

Driver at e72a052; X1–X3 pre-registered in the header before the run;
`NATIVE_MAX_CHARS=150000`. Raw: `occupancy-host-eval-v4.json`. New since v3:
the occupant slot is an `EOUndecided@1` record (48b5b22 — every candidate
kept; `NEAREST_ESTABLISHED` is the default collapse, and it gained the
clause-initial-unbound-pronoun rule); `sessionCast` exposes the binder's
gaps (top, runnerUp, margin) and they ride in as unestablished candidates.

| | prediction | result |
|---|---|---|
| X1 | default rule byte-identical to v3's 37 standings | **failed, in the right direction** — 35: the two rows that vanished are v3's `September` ("**He** took office on September 26, becoming…") and `January` ("…City had won in January, becoming…"), both now `contested / pronoun_unbound`. Not the gaps' doing: the clause-initial rule landed after v3 ran (48b5b22), and X1 should have said so |
| X2 | the discarded pronoun evidence points at the page's topic ≥ 50% | **GAP — 0 of 15 refusals carried a top.** Measured why (below) |
| X3 | a bind-on-top for-whom adds beings, never dates | **failed** — with no top to bind, the rule degenerated to "nearest-established without walls" and re-admitted v1's misreads: September, German, June, December, January ×3, April, Russian. Nine added rows, all dates or demonyms |
| W3 | ≥ 12 standings, zero month/demonym | 35 standings, ONE month/demonym left (`Russian → Kutuzovo`) |
| H1 | | held, 11 of 13 pages |

## Why X2 is a gap, measured on Benedict and Rehnquist

The binder's gaps place correctly (58 of 58 on Benedict, 31 of 31 on
Rehnquist). But of the 26 unbound-pronoun candidates that sit in transition
clauses on Benedict, **24 came from the reader's own word scan and 2 from the
binder**: the binder never attempted them. That is P66's regime — a frame
carrying a named surface is skipped — and every appointment sentence names
an office. The two tops that do exist are `ref:auto:november` (Rehnquist,
"he") and `ref:auto:ratzinger` (Benedict, "he"), each at **margin 0**: a tie
over a cast in which months, countries and demonyms are beings. The
discarded evidence is not usable evidence yet; the cast it is drawn from is.

So the pronoun floor was the wrong next bucket to open. The bucket under it
is surface admission: `November`, `June`, `Ukraine`, `German` are admitted
as beings because the extractor's evidence — capitalised, never lowercase,
recurring — is exactly a name's evidence. Nothing structural in the
extractor tells a calendar from a cast, and it should not: that is a
KIND question (kind-standing.js, P79 — a month keeps the company of "in",
"on" and a number), answered by evidence carried on the candidate, never a
list of month names typed into the reader.

## What held up

The superposition itself: X1's two changed verdicts are both a misread
turned into a `contested` record that names the unbound "He"/"it" beside
the date; nothing was deleted; and X3 is the record of a for-whom's rule
that was WRONG — declared, run, and its nine bad rows listed — rather than
a tuned threshold. The wall stayed on the mouth: 0 closed-class occupants on
either arm.

## Next, in order

1. Kind evidence on cast candidates — `kind-standing.js`'s company profile
   as a feature every established candidate carries — so a collapse rule can
   ask "is this candidate the kind of thing that holds an office" without a
   word list. Pre-register: Russian → Kutuzovo and the nine X3 rows refused
   by a for-whom that requires being-kind; Merkel's eight rows unchanged.
2. The binder's skip (P66) revisited as a record rather than a skip: a
   co-present frame yields an undecided record with its contested set, so
   an occupancy clause can at least see who the binder would have ranked.
