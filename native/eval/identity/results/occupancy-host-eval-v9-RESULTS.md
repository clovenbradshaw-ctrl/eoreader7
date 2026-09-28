# Occupancy through the pipeline, v9 — registered run, 2026-09-28

Driver at 4fc590e; Z9–Z12 pre-registered before the run;
`NATIVE_MAX_CHARS=150000`. Raw: `occupancy-host-eval-v9.json`. ONE change
from v8: the state family (2e67c14) — *all states are transitions, and NUL
is the transition of non-transition* — the copula holds a locus as a
NUL·Ground standing.

| | prediction | result |
|---|---|---|
| Z9 | state standings > 0 and ≤ 23 (the raw copula grep); entry standings unchanged at 33 | **failed on the bound by one**: 24 state, 33 entry. The grep required a capitalised subject right before the copula; *"joining the Republican Party was the only way…"* has none. The count is honest; the bound was under-read. The rows themselves are the finding — see below |
| Z10 | no state standing puts a non-nesting second occupant on `count_bezukhov`; the slot stays `one_being` | **failed, for a reason the prediction did not name**: the Bezúkhov slot DID stay `one_being`, but a SECOND slot appeared — `moscow`, occupants `Iogel` and `Borodinó`, from *"Iogel's were the most enjoyable balls in Moscow"* and *"the battle of Borodinó was Napoleon's senseless flight from Moscow"* — and it split. Z6 fails with it (splits 1) |
| Z11 | under `BEING_KIND`, month/demonym state occupants = 0 | **held** — 13 state standings survive the being-kind arm, none a month or demonym |
| Z12 | every state standing NUL·Ground with the phasepost overlay | **held** — 24/24 NUL·Ground; overlays SIG·Figure·copula 20, SIG·Figure·lexical 1, SYN·Figure·copula-participle 1, contested 2 |

## What the failures are

Both failures have one cause, and it is not the law. `resolveLocus` is
asked about the WHOLE complement span, and returns the first established
cast referent it finds inside it — for a title complement ("Count
Bezúkhov") that is the head, but a copula predicate is any phrase at all,
and *"the most enjoyable balls in Moscow"* holds an established place name
in an adjunct. So `Moscow` became a locus held by whoever the sentence was
about, and two such sentences made a position. The entry families rarely
exposed this because their complements are titles; `Murat → Berg`
(locusVia `cast`, "Grand Duke **of Berg**") was the same defect, unnoticed
since v2.

The fix is the one this session already made for names: the complement is
a phrase with a HEAD and subordinate parts, and only the head is asked
against the cast. Built next (v10).

## The state rows, read

24 rows on the pages, 60 standings on War and Peace where v8 had 4. They
are NUL standings — what the material says a thing *is* — and most are
not positions: *"Ferguson was the deciding vote"*, *"Ratzinger had been
the man in charge"*, *"Freemasonry is the best expression…"*. Under the
law they belong on the record as held states; `positionsByPattern` keeps
them as descriptions (`held_once`) unless a locus recurs across occupants,
which is the honest test of position-hood and was always the design for a
copula complement. Real careers the copula alone carries: Merkel *"was
Leader of the Opposition from 2002 to 2005"*, Ferguson *"is the
Vice-President of the National Football Museum"*, Hamlin's grandson
*"was Maine Attorney General from 1905 to 1908"* (the cast's Hamlin
referent — a nesting the cast has not settled).

Cyril is still absent, as predicted: *"the count"*, *"old Count
Bezúkhov"* — he is named, never predicated. The reading that would carry
him is a NAMING act, not a state clause.

## Cost

War and Peace 237 s (v8: 270 s). The copula family adds no measurable
time; the per-clause pattern loop is not where the reader spends it.
