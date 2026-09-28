# Occupancy testimony through the real pipeline — registered run, 2026-09-28

Driver `occupancy-host-eval.mjs`, pre-registered and amended before the run
(e9b96b2 — the Wikidata half withdrawn, the pipeline's mentions only). Raw:
`occupancy-host-eval.json`. Zero model calls; nothing from outside the
material. 4m07s for 13 Wikipedia pages and 8 live_priors texts; War and Peace
alone 117s (34,229 sentences, 884 referents, 2,866 pronoun bindings).

| | prediction | result |
|---|---|---|
| H1 | the mentions arm admits ≥ 1 standing on ≥ 7 of 13 pages | **held** — 8 of 13, 26 standings |
| H2 | the wall: no closed-class or determiner-led occupant; the ablation arm admits one | **held** — 0 vs 10 ("He", "After", "She", "Since", "Before", "Upon") |
| H3 | a position with two distinct occupant referents | **held by the letter, hollow in fact** (below) |
| H4 | War and Peace: Pierre → a locus containing "Bezukhov" | **failed by the predicate, present in the material** (below) |
| H5a | Kant digest: Kant → "Full Professor …" | **failed** — refused `occupant_not_a_referent`: "Kant" is not a surface of any host referent in that digest |
| H5b | Middlemarch: "Tyke became chaplain to the Infirmary" REFUSED as state | **held** — the predicted limit is real |
| H5c | The Federalist: zero standings | **failed** — one: "Congress … may, by cession … become the seat"; the modal sits nine words back, past the irrealis reach |
| H5d | three novels: zero positions by pattern | **held** |
| H5e | Cold War digest: Gorbachev → a glued locus | **held** — twice, once with the digest's "List of leaders of the Soviet Unionleader" in the clause |

Resolution tiers, Material A: `cast` 25, `pronoun` 1. Locus: link 11, cast 8,
surface 7. Refusals across the thirteen pages: `occupant_not_a_referent` 208,
`state_not_position` 27, `kind_membership` 16, `irrealis` 7.

## H4 — the standing is there, and it says what the host got wrong

My predicate was `/bezukhov/i`; the text spells it **Bezúkhov**. The reader
found it twice, cited:

- `Pierre (cast) → Count Cyril Vladímirovich Bezúkhov` — "since this young
  man, whom we all used to know as plain Monsieur Pierre, has become Count
  Bezúkhov"
- `Pierre (cast) → Count Cyril Vladímirovich Bezúkhov` — "Pierre, on
  unexpectedly becoming Count Bezúkhov and a rich man"

The locus resolved through the host's own cast to a referent whose surfaces
are `Count Bezúkhov | Bezúkhov | Count Cyril Vladímirovich Bezúkhov | Pierre
Bezúkhov`: the host's name-variant coreference had folded the son into the
father under the title. That is the position/participant conflation this
work started from, and the material's own testimony is exactly the evidence
that splits it — *Pierre* (a separate referent, 1 of 8 Pierre-ish beings the
host admitted) **became** the thing the host calls one being. `Count
Bezúkhov` is a locus with two occupants, Cyril then Pierre; the host should
hold it as a position and the merge should be conceded. Not done here: the
pipeline's merge is upstream of this reader, and the reader's job was to
produce the evidence, which it did.

## H3 — held on two misreads

`archbishop of munich and freising` with occupants **German** and Ratzinger;
`england` with occupants **FA Cup** and **Champions League**. The first is
"After a long career as a professor of theology at several German
universities, **he** was appointed Archbishop" — the host did not bind that
"he" (8 pronoun bindings on a 165-referent page), so the reader took the last
mention before the transition, which was a demonym the host admits as a
referent. The second is "City beat Watford 6–0 in the final of the FA Cup,
becoming the first ever men's team in England to …" — a clause about a team
read as a standing because the club is not a host referent while its
trophies are.

Nineteen of the 26 Material A standings are of this shape. Two structural
walls follow from the rows, neither a word list, both built and tested after
the run (`pronoun_unbound`; a comma between the mention and the transition
closes the mention's phrase): "In December 2015, Merkel was named" is not
testimony about **December**. They are NOT in this run's numbers; they are
v2's pre-registration.

## The finding that matters: where the pipeline's mentions come from

The constitutional host (`legacy-ported/packages/host/corpus.js`) still reads
surfaces through the FROZEN legacy extractor
(`legacy-ported/packages/engine/perceiver/text/surfaces.js`), which strips a
token's non-letters and drops letterless tokens, so a capitalised run crosses
"2015," unbroken. Measured on the Merkel page: the host's referents naming the
topic are `October Merkel`, `April Merkel`, `September Merkel`, `June Merkel`,
`March Merkel`, `Angela Merkel` — and NO bare `Merkel`, though the page has 233
bare occurrences. Every "Merkel was appointed …" is therefore
`occupant_not_a_referent`. The same on Kant (398 bare "Kant"; surfaces `Here
Kant`, `Judgment Kant`, `Kant CPuR`), on Murat (49 bare; only `Joachim|Joachim
Murat`), on Benedict. Months are admitted as referents on every page (12 on
Merkel). This is the pipeline's ceiling, exactly as the direction asked to
measure it, and it is a legacy defect: the native extractor
(`adapters/text/surfaces.js`) already breaks a run at a letterless token and
at a trailing comma (the "&" and P50 bracket fixes). Probed, not run: the
native reader (`createRecursiveReader` + `createCausalTextPerceiver`, the
assembly the-fold's page and evals use) on the same Merkel page admits bare
`merkel` as a referent (and `merkel's` as a second one, and still the twelve
months); on Murat it admits `Joachim Murat|joachim|Joachim` and `murat's`, no
bare `Murat`. So v2 reads mentions from BOTH readers and reports them apart.

## Refused, so it is not retried

- A capitalised-run occupant finder (the ablation): 10 closed-class
  occupants on 13 pages. The wall holds; the arm stays as the control.
- Patching the reader for the host's surname gap (a surname rule, a title
  list). The gap is upstream and named; the reader reports it.

## Next, pre-registered as v2 (not run here)

1. The two walls above, both structural, both tested (`pronoun_unbound`,
   comma-closed phrase).
2. Mentions from the native reader as a second arm, reported beside the
   host's.
3. The H4 predicate folded for diacritics; the irrealis reach measured
   against the Federalist row rather than widened by hand.
4. On War and Peace: the `Count Bezúkhov` locus offered to the host as a
   position with two occupants — the concession, if the host's merge is
   wrong, lands as REC, not as a reader-side override.
