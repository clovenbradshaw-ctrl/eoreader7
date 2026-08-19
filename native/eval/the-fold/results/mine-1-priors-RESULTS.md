# MINE-1 against live_priors, fully activated — results

Run 2026-08-18. `node eval/mine-1-priors.mjs` reproduces every number below;
`mine-1-priors-run.json` is the machine-readable record. This is a direct
test of the hypothesis raised after `mine-1-RESULTS.md`'s own headline
(5.8%/17.1% bound): would letting the system consult `live_priors` — the
curated reference corpus `priors.js` already knows how to check a claim
against — recover more of MINE-1's facts than the essay's own material
alone?

## What "activated" means here

The running app gates `/api/priors/check`'s candidate list on a standing
toggle ledger that defaults every document OFF. This run does not touch
that ledger — it treats the **whole corpus as enabled**, because the
question on the table was "would this help at all if switched on," the
most generous reading of "activated" available, not "what does today's
specific toggle state happen to cover."

## The claim shape — stricter than this tool's usual use, on purpose

Every existing caller of `checkPrior` builds a claim from one extracted
atom (a name or a number — `extractAtoms` only pulls proper nouns and
figures). Most MINE-1 facts have neither, so that path would find nothing
to even attempt. This run instead required **every content word of the
whole fact sentence** to co-occur in one sentence of a candidate document —
the literal, maximally strict reading of "a document in the library states
this fact." That is a harder bar than the tool's normal one-atom claims,
declared before the run, unchanged after seeing the number.

## The result

```
2045 candidate documents in the corpus (scripts/src/manifests, dotfiles excluded)
105 essays, 1575 attached facts

  stated-by-library     (a document literally states the fact) : 0    (0.0%)
  unstated-by-consulted (candidates read, none states it)      : 1337 (84.9%)
  not-consulted         (candidates existed, none could be read): 0    (0.0%)
  no-candidates         (no document shares this fact's words) : 238  (15.1%)

headline: 0.0%
```

**Zero.** Not "close to zero" — zero facts, out of 1,575, landed
`stated-by-library`, even with the entire corpus available and no toggle
gate in the way.

## Reading this the right way round

**This is not a failure of the checking mechanism — it is a mismatch of
corpus to material, and the numbers say so on their own.** 84.9% of facts
DID find candidate documents (`unstated-by-consulted`): some document
shared enough of the fact's words to rank as a candidate, got its full text
read, and still didn't state the fact in one sentence. That is the
mechanism working exactly as designed — reading real candidates and
correctly reporting that none of them says this — not the mechanism
failing to find anything at all.

**`live_priors` is a curated philosophy/classics/law/foundational-science
canon, not a general trivia encyclopedia**, and a walk of its top category
confirms this by inspection: `02-encyclopedic/wikipedia/` holds
`Immanuel_Kant.txt`, `Buddhism.txt`, `Quantum_mechanics.txt`,
`General_relativity.txt`, `Cell_biology.txt`, `DNA.txt` — big ideas and
foundational topics — while `06-government-legal/` (1,221 of the corpus's
~2,045 documents) is world legislation. MINE-1's essays are short
informational pieces on ordinary, specific topics — *The Life Cycle of a
Butterfly*, *The Physics of Roller Coasters*, *The History of Board Games*,
*Urban Legends and Their Origins*, *A History of Magic Tricks*. There is no
plausible candidate shelf here for "roller coaster" or "board game" at all,
and the one adjacent shelf that exists (`Cell_biology.txt`, `DNA.txt`,
`Evolution.txt` for the biology-flavored essays) still needs the EXACT
sentence, not just the topic, to land `stated-by-library` under this run's
strict rule — and none did.

**This answers the hypothesis directly: no, "turn priors on" does not move
MINE-1's number, because MINE-1's own material was never going to be inside
this particular library.** The lever that actually explains the earlier
5.8%/17.1% (per `mine-1-RESULTS.md`) is structural, not a missing corpus:
`relations.js`'s referent resolution and clause-shape requirements, reading
the essay's OWN sentences. A prior-corpus tier answers a different
question ("is this fact independently attested somewhere else"), and on
this specific benchmark's specific topics, the answer to that question is
almost always "there's nothing here to even check against" — 15.1% of
facts didn't share a single content word with any of ~2,045 documents.

## What this does and doesn't rule out

**Ruled out:** priors, as currently curated, cannot be the fix for THIS
benchmark's low bound rate. Any future MINE-1 rerun that wants a prior
corpus to matter needs a corpus actually stocked with entries on
roller coasters, board games, and butterfly metamorphosis — a different
shelf, not a bigger version of this one.

**Not ruled out:** a prior corpus with matching topical coverage (a real
general encyclopedia, rather than a canon of foundational works) could
plausibly move a DIFFERENT benchmark's number, or MINE-1's if paired with
a genuinely broad reference set. This run tests the corpus this project
actually has, honestly, not corpora it does not have.
