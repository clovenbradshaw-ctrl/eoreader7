# The act was the wall the extraction left behind (2026-09-04)

`node native/eval/the-fold/note-match-null.mjs`, and `ACTHEAD=1` on
`note-match-zero.mjs`. **Zero model calls, both.**

`reading-wall-RESULTS.md`'s last section left the note-to-note matcher at
1 of 12 and predicted the fix: *"an extraction-grain change in
`adapters/text/relations.js` and the reader, with its own control ... not a
matcher."* S61 made that extraction change — the auxiliary chain now rides
inside the act. This pass reads what the change actually left, and the
prediction is **half wrong in a way worth recording: the extraction moved,
and the comparator did not follow it.**

## Zero-call attribution first — all 12, one cause each

For each labeled note, the face edges cut from its own labeled stating
sentence, and which of the matcher's three conditions fails:

| cause | count |
|---|---|
| **ACT** | **9** |
| no edge cut from the stating sentence | 1 |
| SUBJ | 1 |
| match | 1 |

Not the object grain. Nine of twelve never get as far as the object,
because the acts do not meet. Decomposed one level further, the ACT bucket
is four different things:

| sub-cause | notes | specimen |
|---|---|---|
| the verb is absent from BOTH givers | 113, 61 | `winched`, `steaming` — in neither UniMorph nor the UD POS prior, so the chain cannot fire and the act stays bare |
| a bare auxiliary survives on one side | 38, 54 | `BIGs —were→ worn until…` against the face's `the astronauts —removed→ their BIGs` |
| **multi-word act vs one-word act** | **150, 42, 91** | `had been used` vs `used`; `would fly` vs `flew` |
| genuine lexical paraphrase | 12, 149 | `collected` vs `placed`; and 149's content sits inside a reported-speech object (`Mr Bezos —said→ the five engines were found…`) |

The third row is the one S61 created. Putting the chain in the act fixed
the object and made the act a multi-word string; the comparator still asks
for an exact match or a single-form lemma, and `had been used` cannot
reach `used` by either.

## The fix, and why it is not a hand list

The act is reduced to its **head** before comparison: the rightmost token
that is not AUX-dominant in the **received** POS prior, at the floor
already declared for the verb-dominant measure (0.5). Nothing is typed by
hand — the same giver that decides what counts as a verb decides what
counts as an auxiliary. `had been used` → `used`; `would fly` → `fly`,
which the lemmatizer already relates to `flew`; a bare `was` heads itself
and behaves exactly as before.

## Measured at scale, against a null drawn twenty times

524 of 549 notes with a readable cited face, over 106 distinct faces. The
null permutes end2 across notes by seeded derangement — every end2 kept,
every note kept, only which end2 belongs to which note destroyed.

| arm | real | null median | null range | draws ≥ real | separation |
|---|---|---|---|---|---|
| A — act compared whole | 12 | 5 | 2–7 | **0/20** | 7 |
| B — act compared by head | **17** | 6 | 3–9 | **0/20** | **11** |

Real rises 12 → 17 while the null rises 5 → 6: the arm is not merely making
more matchable noise, and both arms sit outside every draw. On the 12
labeled notes the same change reads 1 → 2, control 0 → 0, both landings on
a labeled sentence.

## Said against it

- **17 of 524 is 3.2%.** This moves a floor, it does not lift one. The
  matcher was at 2.3%.
- **One article and its own cited sources.** One material, one walk.
- **106 faces carry 524 notes**, so notes are not independent of one
  another; the null respects the pairing but not that.
- The remaining eight of the twelve are unmoved, and three of them are the
  vocabulary gap (`winched`, `steaming`, `donned` — absent from both
  givers), which is the part `P85` says a lexicon or a model could earn and
  mechanism cannot.
- One boundary worth naming and **not** tuning: `worn` sits at exactly 0.50
  verb share in the UD prior on a single VERB and a single ADJ
  attestation, and the declared floor is strictly greater. At n = 2 the
  prior cannot separate that form at all; moving the floor to admit it
  would be fitting the constant to this specimen, which II.23 forbids.

## One thing this corpus has that the fixtures do not

`source-independence-RESULTS.md` (main, 2026-09-03) found the three-page
Wikipedia fixture was never three independent sources — 22 corroborated
notes went to **0** under the door and independence together — and closed
by naming what is missing: *"a genuinely independent corpus — different
publishers, not different pages of one."*

The Ranke-backwards corpus is that: an article matched against **the
sources it cites**, over **34 distinct hosts** (nasa.gov, airandspace.si.edu,
presidency.ucsb.edu, arxiv.org, archives.gov …). Disclosed the other way:
259 of the 674 rows come through `web.archive.org`, whose underlying
publisher varies but whose wrapper the host field cannot see, so host count
both understates the diversity and cannot by itself prove two archive
copies are two documents. `sharedTextGroups` has never been run over it.
**That is the measurement this corpus is now sitting on and has not had.**

## Files
`note-match-null.mjs` (new), `note-match-zero.mjs` (`ACTHEAD=1`),
`results/note-match-zero-fine-both-attested-acthead.json`.
