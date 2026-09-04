# The referent bridge: measured, and the probe's own honest limit (2026-09-03)

**Driver:** `eval/the-fold/bridge-audit.mjs`. **Gate:** Pass 12 step 1
(the-fold's `NEXT-PASSES.md`) — before building bridges as recorded
objects, measure on real material how many existing unions already rest
on an unestablished one, and whether any wrong ones are findable.

## What changed in `kernel/notes.js`

`hear()` used to union two sources' witnesses on one note whenever their
`(end1, label, end2)` triple matched exactly. That single string
comparison did two jobs: asserting the two PROPOSITIONS are the same, and
asserting the two documents' REFERENTS are the same. The second is a
bridge between two readings, each of which established its own universe
of referents, and it was never made explicit, never recorded, and could
not be conceded.

The two jobs are now separated. Proposition identity still decides the
note's id (unchanged). A hearing from a source no witness of that note has
named ALSO makes a referent claim, and that claim is now recorded on the
entry as a `join` — `{ source, from, assumed, basis, standing: "assumed" }`
— carrying what it rested on. An optional, injectable `bridge(crossing)`
organ may REFUSE a crossing; a refusal never drops evidence, it splits the
sighting onto its own source-scoped note (`<id>@<source>`) with a typed
`unbridged` reason, so a later-established bridge still has two real notes
to join. With no organ, every crossing is still allowed — byte-identical
behaviour to before this pass — but it is no longer invisible:
`standingOf` now reports `crossings` and `assumedBridges`, so
"corroborated" reads back as "corroborated across N bridges nobody
checked" rather than a bare count.

Pinned in `notes.test.js` (12 → 17), including the control built to fail:
two real documents independently state "Smith chaired the commission"
about two DIFFERENT Smiths and different commissions — nothing in the
triples can tell them apart. Without a bridge organ this silently
corroborates (assumedBridges: 1, countable rather than hidden). With a
scripted organ that knows the two universes disagree, the crossing is
refused, the sighting lands on its own note, and each note reads
`single-witness` rather than a false `corroborated`.

## The gate measurement

Three real Wikipedia pages (Austerlitz, War of the Third Coalition,
Borodino), the production relation reader, 934 notes. **22 of 22 notes
standing on ≥2 sources rest on an assumed bridge (100%; 23 crossings
total).** Bridges are not rare — the plan's own stated fallback
("disclosure only, if rare and harmless") does not apply, and building
bridges as first-class objects (step 2) is warranted.

**The probe.** Each source's own `discoverReferents` already knows what a
surface names IN THAT DOCUMENT — the group's maximal form. For a joined
note's two ends, ask both universes what each end's face names, at zero
model calls. Disagreement between the two universes' answers is
`suspect`; agreement is `clean`; either universe naming nothing at all is
`unexaminable` — a fact about the probe's reach, never counted as a pass.

**First cut, bare string equality between the two universes' answers:**
8 suspect, 7 clean, 8 unexaminable of 23. Looked decisive, and was not —
the "suspect" list was mostly noise: "Allied Army" vs "Allied", the exact
name-variant relationship `namesCorefer` already exists to resolve, was
being counted as disagreement because the probe used a STRICTER,
novel identity rule the rest of this codebase does not use anywhere else.
Fixed by using `namesCorefer` (P38's own organ) for agreement instead of
inventing a second "same name" criterion for this probe alone.

**Corrected: 1 suspect, 9 clean, 13 unexaminable of 23.** The one
remaining suspect ("his own heavy Guard cavalry forward" reading
"Russian Imperial Guard" in one universe and "War" in the other) is very
likely `namesIn`'s own substring-containment fallback matching debris,
not a genuine referent disagreement — not chased further here.

**THE CONTROL (II.23), both ends redealt, seeded, 30 draws, over the same
pair of sources each crossing actually used:** suspect rate range
4.3–8.7%, median 4.3%. **Real suspect rate: 4.3% — identical to the
redealt median.** The probe does not separate real bridges from random
ones at this sample size, either before or after the `namesCorefer` fix.

## What is established, and what is not

- **Established:** bridges are common (100% of corroborations here rest
  on one), so the mechanism this pass builds — recording the join,
  allowing it to be refused, reporting the assumption — is warranted
  independent of whether any given bridge is wrong.
- **Established:** a naive same-name probe manufactures false
  disagreements by using a stricter identity rule than the rest of the
  system licenses; fixed at the source rather than tuned around.
- **NOT established, and not claimed:** whether the 22 real bridges are
  actually safe. The control refutes THIS PROBE's power at n=23 (10
  examinable cases), not the underlying question. A probe that cannot
  separate real from redealt has decided nothing either way — this is a
  power problem, not a clean bill of health, and reporting it as
  "bridges are fine" would be exactly the overreach P44's own
  content-independence correction and P60's fifth amendment (a judge must
  be shuffled before its precision is trusted) both warn against.
- **Disclosed, not chased:** 13 of 23 crossings (57%) are unexaminable by
  this method — one or both joined ends is a definite description or
  clause ("the option to strike at one of the wings") that
  `discoverReferents` never captures as a named referent at all, only
  proper names. A probe built on named-referent agreement structurally
  cannot reach the majority of real crossings. This is the same class of
  limit P41 already names for the extractor's own subject coverage, one
  level up: the probe inherits the reach of the organ it is built on.

## Next, not attempted here

A probe with real power needs either far more material (more crossings,
so the control has something to compare against) or a different
instrument that can examine a non-named end — the same referent-index
widening this codebase's own subject-wall passes (S44) already did for
extraction, aimed at bridging instead. Neither is built. Step 2 of Pass
12 (bridges as recorded objects with their own witness/provenance/
concession lifecycle) can proceed on the "bridges are common" finding
alone; it should not claim to be validated by this probe.

## Suite

`notes.test.js`: 12 → 17, all passing. Full native organ + conformance +
kernel test suite: 780 tests, 755 passing, 16 failing — identical failure
set to HEAD before this change (confirmed by `git stash` diff), zero
regressions.
