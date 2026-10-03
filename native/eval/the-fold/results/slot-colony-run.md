# slot-colony-measure — species from eoreader7 #148 @ e2ce972, colony from this branch

## H1 faithful: colony(declared) vs cheapFill, slot by slot
- set A (fitted — sanity only): cheapFill 23/23, colony 23/23; identical slot by slot, same species
- set B (edited while fixing): cheapFill 21/23, colony 21/23; identical slot by slot, same species
- set C (untouched for the first six species): cheapFill 14/20, colony 14/20; identical slot by slot, same species
- set D (written after the app species): cheapFill 13/14, colony 13/14; identical slot by slot, same species
**H1: HOLDS**

## arms by order (one run each; trails taught on A for `learned`)
### set A — fitted — sanity only
- declared  23/23 filled · 88 attempts · 25 real checks · 2 wasted · 131 ms
- derived   23/23 filled · 135 attempts · 24 real checks · 1 wasted · 62 ms
- reversed  23/23 filled · 158 attempts · 24 real checks · 1 wasted · 235 ms
- learned   23/23 filled · 31 attempts · 23 real checks · 0 wasted · 75 ms
### set B — edited while fixing
- declared  21/23 filled · 118 attempts · 23 real checks · 2 wasted · 258 ms
- derived   21/23 filled · 159 attempts · 22 real checks · 1 wasted · 222 ms
- reversed  21/23 filled · 198 attempts · 25 real checks · 4 wasted · 256 ms
- learned   21/23 filled · 80 attempts · 21 real checks · 0 wasted · 232 ms
### set C — untouched for the first six species
- declared  14/20 filled · 174 attempts · 14 real checks · 0 wasted · 23 ms
- derived   14/20 filled · 202 attempts · 14 real checks · 0 wasted · 15 ms
- reversed  14/20 filled · 255 attempts · 17 real checks · 3 wasted · 33 ms
- learned   14/20 filled · 163 attempts · 14 real checks · 0 wasted · 13 ms
### set D — written after the app species
- declared  13/14 filled · 78 attempts · 13 real checks · 0 wasted · 221 ms
- derived   13/14 filled · 80 attempts · 13 real checks · 0 wasted · 139 ms
- reversed  13/14 filled · 129 attempts · 13 real checks · 0 wasted · 355 ms
- learned   13/14 filled · 88 attempts · 13 real checks · 0 wasted · 252 ms

### pooled over the held sets B + C + D
- declared  48/57 filled · 370 attempts · 50 real checks · 2 wasted · 502 ms
- derived   48/57 filled · 441 attempts · 49 real checks · 1 wasted · 376 ms
- reversed  48/57 filled · 582 attempts · 55 real checks · 7 wasted · 644 ms
- learned   48/57 filled · 331 attempts · 48 real checks · 0 wasted · 498 ms
- scrambled (20 seeds) wasted: mean 2.50, min 0, max 8; per seed 2 1 2 1 7 2 1 1 1 0 1 2 1 8 1 0 1 8 8 2
- seeds where the shuffled ledger wasted no more than the learned one: 2 of 20; no more than declared: 16 of 20

**H2 derived order: HOLDS** — same fills as declared: true; wasted 1 vs declared 2; species that changed hands: busTimes.stop: copy→optional, busTimes.route: copy→optional, bedReport.name: copy→optional, playerCard.nick: copy→optional, tempReport.city: copy→optional, slotLabels.date: copy→optional, longestPost.blog: copy→optional, invoice.number: copy→optional, bookFine.title: copy→optional, scaleRecipe.name: copy→optional, shipQuote.id: copy→optional, gradeRow.student: copy→optional, parkingBill.plate: copy→optional, contactCard.email: copy→optional, luggageTag.id: copy→optional, thermostatRow.room: copy→optional, addressLabel.city: copy→optional, ticketCode.desk: copy→optional
**H3 learned order: HOLDS** — learned wasted 0 vs declared 2; scrambled mean 2.50; same fills as declared: true
**H4 the metric can see order: HOLDS** — reversed wasted 7 vs declared 2; species that changed hands under reversal: tripCost.label: joinPresent→template, initials.full: joinPresent→template, contactCard.display: joinPresent→template

## H5 the null arm — shown targets redealt across the examples, judged by the true held-out runs
- declared  158 redealt slots tried, the gate was evaluated on 26 of them (132 never saw a candidate), 0 false fills
- derived   158 redealt slots tried, the gate was evaluated on 26 of them (132 never saw a candidate), 0 false fills
- reversed  158 redealt slots tried, the gate was evaluated on 26 of them (132 never saw a candidate), 0 false fills
- redeals asked for 160: produced 158, dropped 2 (a constant field cannot be redealt), identity 0; 0 slots carry no redeal
**H5: HOLDS — the gate let nothing through, on the 26 slots where it was ever run (132 redealt slots drew no candidate from any species, so they say nothing about the gate)**

## H5b the arm counts a fill when one is made — a species that reads the TRUE held-out answers is added (an oracle leak; true by construction, NOT evidence the gate is strong — see E5)
- 158 redealt slots, 158 filled → **H5b: HOLDS — the null arm sees a cheat**

## the full-information table — 80 slots × 12 species (environment: the sibling fills of EARLIER keys, as a pass-1 colony holds them); held sets B+C+D = 57 slots
- slots with exactly one species clearing the gate: 50; two or more: 21; none: 9
- candidates the gate REFUSED (a species offered something and the held-out runs rejected it), all species × all slots: 10, of which by species: decide 10 (the first run's table, built with every sibling's fill present, counted 13 — the leak)

## H7 order against 100,000 random orders of the twelve species (table simulation, held sets B+C+D)
- random orders: wasted min 0, median 1, max 8; ms min 288, median 457, max 927
- declared  wasted 2: better than 33230 of 100000 random orders, equal to 8303, worse than 58467 → UNRESOLVED — the registered bar cannot be met: 36.9% of the random draws already sit at the metric's floor, so even a perfect order could beat at most 63.1% (the registered rule alone would print FALSIFIED)
            (descriptive) attempts 262: better than 99379/100000 random orders; ms 564: better than 32734/100000 (single measurement)
- derived   wasted 1: better than 41533 of 100000 random orders, equal to 21599, worse than 36868 → UNRESOLVED — the registered bar cannot be met: 36.9% of the random draws already sit at the metric's floor, so even a perfect order could beat at most 63.1% (the registered rule alone would print FALSIFIED)
            (descriptive) attempts 333: better than 73533/100000 random orders; ms 396: better than 76998/100000 (single measurement)
- learned   wasted 0: better than 63132 of 100000 random orders, equal to 36868, worse than 0 → UNRESOLVED — the registered bar cannot be met: 36.9% of the random draws already sit at the metric's floor, so even a perfect order could beat at most 63.1% (the registered rule alone would print FALSIFIED)
            (descriptive) attempts 223: better than 100000/100000 random orders; ms 556: better than 33998/100000 (single measurement)
- reversed  wasted 7: better than 14356 of 100000 random orders, equal to 10291, worse than 75353 → UNRESOLVED — the registered bar cannot be met: 36.9% of the random draws already sit at the metric's floor, so even a perfect order could beat at most 63.1% (the registered rule alone would print FALSIFIED)
            (descriptive) attempts 474: better than 3024/100000 random orders; ms 821: better than 9839/100000 (single measurement)
- simulation vs the real colony runs (wasted, held sets): declared 2/2, derived 1/1, reversed 7/7, learned 0/0 (sim/real; attempts differ because the real colony retries unfilled slots in a second pass)

## H6 do the houses carry the order? (real house assignment vs random ones; table simulation, held sets B+C+D)
- real assignment wasted 1 (6 occupied houses: CON·Figure, SYN·Figure, DEF·Figure, NUL·Figure, SYN·Pattern, EVA·Figure)
- (a) all 720 permutations of which occupied house holds which species-group: wasted min 0 / max 8; real is better than 336, equal to 168, worse than 216 → UNRESOLVED — the registered bar cannot be met: 30.0% of the random draws already sit at the metric's floor, so even a perfect order could beat at most 70.0% (the registered rule alone would print FALSIFIED)
- (b) 5000 random assignments of each species to one of the 27 houses (one assignment per trial): wasted min 0 / max 8; real is better than 2100, equal to 1137, worse than 1763 → UNRESOLVED — the registered bar cannot be met: 35.3% of the random draws already sit at the metric's floor, so even a perfect order could beat at most 64.7% (the registered rule alone would print FALSIFIED)
- (b, as first registered — a fresh assignment per SLOT, a driver bug): real better than 4151, equal to 712, worse than 137
- (b, descriptive) on attempts the real assignment is better than 3581/5000 random assignments, on ms 3936/5000 (single measurement)
**H6: UNRESOLVED — the registered bar cannot be met on this metric (see (a) and (b)); the registered rule alone would have printed FALSIFIED**

## H8 replication — species refitted on other triples of shown examples (tasks with at least six runs)
- 3 tasks used (22 skipped: fewer than six runs, so no triple left three held-out); 12 baseline fills
- triple "last": 12/12 baseline fills refilled, 0 lost, 0 slots filled that the baseline did not
- triple "spread": 12/12 baseline fills refilled, 0 lost, 0 slots filled that the baseline did not
**H8: HOLDS**

## H9 underdetermination — slots where two or more species clear the gate, run on 60 crossover inputs
- 21 slots cleared by two or more species; 0 of them disagree off the data
**H9: HOLDS on the 21 slot(s) it could test** (slots with one clearing species cannot be tested this way: 50)

## H10 how many held-out runs stand behind each fill (descriptive, no verdict)
- fills by pass in the declared run: pass 1 → 71 — the retry-and-environment machinery is exercised only if a fill lands after pass 1
- held-out runs per fill: 1 → 6, 2 → 53, 3 → 4, 4 → 5, 6 → 3; 6 of 71 fills rest on at most ONE held-out run (kinds: string ×3, array<string> ×1, number ×2)

## the 27 houses — fills by house (declared order, pooled over A–D), residents, and leads
- NUL·Ground  Void       empty     fills   0  residents: —
- NUL·Figure  Entity     occupied  fills   4  residents: null, optional, coalesce
- NUL·Pattern Kind       empty     fills   0  residents: —
- SIG·Ground  Void       empty     fills   0  residents: —
- SIG·Figure  Entity     empty     fills   0  residents: —
- SIG·Pattern Kind       empty     fills   0  residents: —
- INS·Ground  Void       empty     fills   0  residents: —
- INS·Figure  Entity     empty     fills   0  residents: —
- INS·Pattern Kind       empty     fills   0  residents: —
- SEG·Ground  Field      empty     fills   0  residents: —
- SEG·Figure  Link       empty     fills   0  residents: —
- SEG·Pattern Network    empty     fills   0  residents: —
- CON·Ground  Field      empty     fills   0  residents: —
- CON·Figure  Link       occupied  fills  18  residents: copy
- CON·Pattern Network    empty     fills   0  residents: —
- SYN·Ground  Field      empty     fills   0  residents: —
- SYN·Figure  Link       occupied  fills  36  residents: compose, joinPresent, template
- SYN·Pattern Network    occupied  fills   2  residents: map
- DEF·Ground  Atmosphere empty     fills   0  residents: —
- DEF·Figure  Lens       occupied  fills   7  residents: branch, decide
- DEF·Pattern Paradigm   empty     fills   0  residents: —
- EVA·Ground  Atmosphere empty     fills   0  residents: —
- EVA·Figure  Lens       occupied  fills   4  residents: argmax, topk
- EVA·Pattern Paradigm   empty     fills   0  residents: —
- REC·Ground  Atmosphere empty     fills   0  residents: —
- REC·Figure  Lens       empty     fills   0  residents: —
- REC·Pattern Paradigm   empty     fills   0  residents: —

leads (relevant houses nothing lives in): NUL·Ground, NUL·Pattern, SIG·Ground, SIG·Figure, SIG·Pattern, INS·Ground, INS·Figure, INS·Pattern, SEG·Ground, SEG·Figure, SEG·Pattern, CON·Ground, CON·Pattern, SYN·Ground, DEF·Ground, DEF·Pattern, EVA·Ground, EVA·Pattern, REC·Ground, REC·Figure, REC·Pattern

## what the colony could not fill, by structural kind
- set B: string ×2 (scoreboard.winner, initials.initials)
- set C: number ×4 (bookFine.daysLate, bookFine.fine, gradeRow.best, gradeRow.average); string ×2 (bookFine.status, gradeRow.passed)
- set D: string ×1 (ticketCode.code)

# POST-HOC EXPLORATION — written after the first run; no verdicts, no pre-registration

## E0 learned order when the teaching run reads the wall clock (15 independent teachings of set A, judged on B+C+D)
- wasted over 15 teachings: 0×8, 1×7; attempts: 331×9, 332×6; filled: 48×15 (declared wasted 2, derived 1, unit-clock learned 0)

## E1 all triples — every C(n,3) choice of three shown examples except the baseline's own (tasks with at least five runs), species refitted, the rest held out
- 23 tasks cover 65 of the 71 fills (the registered H8 covered 12); 316 refits; baseline fills refilled 909 of 972 (slot × other-triple) opportunities; slots lost under at least one triple: 17 (A/bedReport.status ×7, A/bedReport.percentFull ×4, A/wordStats.avgLen ×4, A/readingTime.minutes ×4, B/playerCard.accuracy ×5, B/playerCard.tier ×8, B/tempReport.feel ×7, B/invoice.discount ×4, B/invoice.total ×4, B/scoreboard.margin ×2, C/scaleRecipe.sugar ×4, C/shipQuote.tier ×5, C/parkingBill.hours ×1, C/parkingBill.charge ×1, D/luggageTag.who ×1, D/luggageTag.lane ×1, D/addressLabel.line1 ×1)
- by the species that filled the baseline slot: copy 253/253, compose 219/252, decide 9/36, argmax 27/27, topk 9/9, joinPresent 78/80, map 9/9, coalesce 52/53, branch 200/200, null 34/34, optional 19/19
- slots filled under some triple that the baseline did not fill: 0 (0 cases)

## E2 absent values — each parameter, and each key of each object parameter, set to null and then removed; slots cleared by two or more species
- 21 slots cleared by two or more species; 21 disagree on at least one absent-value input (the registered crossover found 0); 12 still disagree after treating undefined as null
- disagreeing pairs (input counts): copy vs optional ×285; optional vs coalesce ×200; copy vs coalesce ×117; joinPresent vs template ×90
- slots: A/busTimes.stop [copy/optional/coalesce]; A/busTimes.route [copy/optional/coalesce]; A/bedReport.name [copy/optional (null vs undefined only)]; B/playerCard.nick [copy/optional (null vs undefined only)]; B/tripCost.label [joinPresent/template]; B/tempReport.city [copy/optional (null vs undefined only)]; B/slotLabels.date [copy/optional (null vs undefined only)]; B/longestPost.blog [copy/optional (null vs undefined only)]; B/invoice.number [copy/optional/coalesce]; B/initials.full [joinPresent/template]; C/bookFine.title [copy/optional/coalesce]; C/scaleRecipe.name [copy/optional (null vs undefined only)]; C/shipQuote.id [copy/optional (null vs undefined only)]; C/gradeRow.student [copy/optional (null vs undefined only)]; C/parkingBill.plate [copy/optional (null vs undefined only)]; C/contactCard.display [joinPresent/template]; C/contactCard.email [copy/optional/coalesce]; D/luggageTag.id [copy/optional/coalesce]; D/thermostatRow.room [copy/optional/coalesce]; D/addressLabel.city [copy/optional/coalesce]; D/ticketCode.desk [copy/optional/coalesce]
- the species each order commits to on those slots: A/busTimes.stop: declared→copy, derived→optional; A/busTimes.route: declared→copy, derived→optional; A/bedReport.name: declared→copy, derived→optional; B/playerCard.nick: declared→copy, derived→optional; B/tripCost.label: declared→joinPresent, derived→joinPresent; B/tempReport.city: declared→copy, derived→optional; B/slotLabels.date: declared→copy, derived→optional; B/longestPost.blog: declared→copy, derived→optional; B/invoice.number: declared→copy, derived→optional; B/initials.full: declared→joinPresent, derived→joinPresent; C/bookFine.title: declared→copy, derived→optional; C/scaleRecipe.name: declared→copy, derived→optional; C/shipQuote.id: declared→copy, derived→optional; C/gradeRow.student: declared→copy, derived→optional; C/parkingBill.plate: declared→copy, derived→optional; C/contactCard.display: declared→joinPresent, derived→joinPresent; C/contactCard.email: declared→copy, derived→optional; D/luggageTag.id: declared→copy, derived→optional; D/thermostatRow.room: declared→copy, derived→optional; D/addressLabel.city: declared→copy, derived→optional; D/ticketCode.desk: declared→copy, derived→optional

## E3 leave one species out — slots (of all 80) the colony fails to fill without it, other eleven species in declared order
- copy −0; compose −33; branch −3 (luggageTag.weight, thermostatRow.temp, thermostatRow.setpoint); decide −4 (bedReport.status, playerCard.tier, tempReport.feel, shipQuote.tier); null −1 (luggageTag.note); optional −1 (addressLabel.postal); coalesce −2 (luggageTag.who, addressLabel.heading); joinPresent −2 (luggageTag.lane, addressLabel.line1); template −1 (flightLeg.route); map −2 (busTimes.times, slotLabels.labels); argmax −3 (wordStats.longest, cartTotal.priciest, longestPost.longest); topk −1 (readingTime.longest)
- slots where THIS species is the only one that clears the gate (the table, earlier-keys environment): copy 0, compose 30, branch 3, decide 4, null 1, optional 1, coalesce 2, joinPresent 2, template 1, map 2, argmax 3, topk 1 — copy −0 above is by construction: every copy slot is string-valued and optional covers it

## E4 who fills a slot under each order (identity, not just count) — slots whose filling species differs from the declared order's
- derived   18 slot(s) filled by a different species than declared: copy→optional ×18
- reversed  3 slot(s) filled by a different species than declared: joinPresent→template ×3
- learned   21 slot(s) filled by a different species than declared: copy→optional ×18, joinPresent→template ×3

## E5 cross-slot null — each slot given another slot's shown targets (same kind, different task), judged by its own true held-out runs
- 78 cross-slot slots; the gate was evaluated on 12 of them (66 drew no candidate); 0 false fills → gate_holds_partial
- candidates offered and judged, by species: decide 12

## E6 skipUnchanged — the same four orders with no re-gating of a pair whose environment did not change (held sets B+C+D, learned taught on A)
- declared  default: 48 filled, 370 attempts, 2 wasted → skipUnchanged: 48 filled, 298 attempts, 2 wasted
- derived   default: 48 filled, 441 attempts, 1 wasted → skipUnchanged: 48 filled, 369 attempts, 1 wasted
- reversed  default: 48 filled, 582 attempts, 7 wasted → skipUnchanged: 48 filled, 510 attempts, 7 wasted
- learned   default: 48 filled, 331 attempts, 0 wasted → skipUnchanged: 48 filled, 259 attempts, 0 wasted

## E7 cross-teaching — learned order taught on ONE set (unit clock), judged on the other three; derived and declared on the same sets
- taught on A, judged on B+C+D: learned wasted 0 (48 filled), derived 1, declared 2
- taught on B, judged on A+C+D: learned wasted 2 (50 filled), derived 1, declared 2
- taught on C, judged on A+B+D: learned wasted 3 (57 filled), derived 2, declared 4
- taught on D, judged on A+B+C: learned wasted 2 (58 filled), derived 2, declared 4

## E8 does a good order transfer — random orders judged on set A, then on B+C+D (table simulation, 100,000 orders)
- orders wasting 0 on A: 33238/100000; of those, wasting 0 on B+C+D: 29936/33238 (90.1%); orders wasting 0 on B+C+D, unconditionally: 36554/100000 (36.6%)
