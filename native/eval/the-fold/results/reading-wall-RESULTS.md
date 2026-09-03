# The reading wall (2026-09-02, after the population was made real)

**The question.** `slicer-coverage-RESULTS.md` left one measured number
standing: with a labeled stating sentence among the eight, gemma2:2b
pointed at it 4 times in 11 and refused 7 (`no-testimony` 5,
`indiscriminate` 2), never pointing at the wrong thing. Where to look was
shown not to be the wall. This pass asks what the wall is, and reads the
seven refusals before it spends anything.

## Zero-call pass first (`reading-wall-zero.mjs`, `results/reading-wall-zero.json`)

For every labeled-stated note: the claim string the select protocol is
actually shown (`R.claimOfNote` — the extraction's own `end1 label end2`
fragment), the article sentence the note was cut from (`row.article`, on
every walk row already), the containment eight with the labeled sentence's
position, and the arm claim `competingFiller` builds. **0 calls.**

What it shows:

1. **Three of the seven refusals are the reader being right, or not being
   shown the sentence.** Note 91 (`of mission launch date July 16`) — the
   labeled sentence is not in the eight; this was the 1 in "11/12". Note
   38 (`BIGs were worn until they reached isolation facilities`) — the
   sentence that states it ("Once inside the MQF, the astronauts removed
   their BIGs") is NOT in the eight; the eight carries only the weaker
   labeled sentence (they *donned* them). Note 136 is graded
   `stated-partial` by the label itself: the source says the Soviets took
   the lead, never "April 12". Note 3 is `stated-prospective`: "we will
   have … opening in July 2019". A reader asked "does any sentence state
   the claim is true" and answering no on 136 and 3 is reading correctly.
   So the checkpoint tallies resolve as: file 2's three `no-testimony` are
   38, 150, 91; file 1's five refusals fall on 42, 45, 54, 3, 136.
2. **The claim shown is a fragment.** `Collins recovered he joined
   Armstrong's crew as CMP`, `they would fly to Hornet in Marine One …`,
   `They found on the Atlantic seabed …`, `of mission launch date July
   16`. Four of twelve open with a pronoun or a dangling preposition; the
   article's own sentence, which the walk already carries on every row,
   reads `After a night on board, they would fly to Hornet…`. The model
   is asked to match a paraphrase against a string that is not a sentence.
3. **The arm is nonsense on this class.** `competingFiller` swaps the WHOLE
   of end2 — here a predicate phrase, not a name — for one capitalised
   run: `Camera had Armstrong`, `Five sites were North`, `Hornet launched
   Apollo`, `they would Apollo`. Eleven of eleven arms are ungrammatical.
   An arm nobody could say yes to is a rubber stamp, not an arm; the two
   `indiscriminate` refusals are a picker that pointed at the same
   sentence for `Five sites were North` as for the real claim — that is
   a picker keying on shared words, and the refusal is right, but the
   arm is not doing the job P32 gave it on phrase-valued ends.
4. **Position is not it.** The labeled sentence sits at position 1 or 2 in
   nine of the eleven covered notes; the landings (149, 12, 113, 61) sit at
   1, 1, 2, 4.

**P84's ledger side, restated here so it is not lost:** a refusal costs the
ledger nothing. Under P84(1) a note the witness did not land is still
disclosed, "stated once so far, nowhere else yet"; only the
`primary:<host>#a-b` standing is withheld. The wall is a recall number on
that standing, not a withholding.

## Declared budget — written before the first call

**Hypothesis to spend on:** the fragment is the wall the mechanism built,
not the reader's. Show the witness the article's own sentence as the claim
(`row.article`, mechanical, already on every row — nothing rewritten by
hand or by a model), same eight, same witness, same arm, same rotated
control. The control claim is the article sentence with end2 replaced by
the rotated end2 verbatim; where end2 is not verbatim in the article
sentence the control is `control-unbuildable`, typed, no call.

**Not spent on:** prompt wording (tuning the ask toward "yes" on twelve
labeled notes would be fitting the label set); a bigger model (the local
model stays small — the wall is to be moved by feeding, not by size); a
grammatical arm for phrase-valued ends (the fix is clear from the dump and
needs no model to be designed; measured later if the article arm lands).

**Arms:** `fragment` (the current claim string — re-run so that per-note
verdicts are RECORDED, which the earlier checkpoints did not do; also a
determinism check on 60 calls already spent) and `article`. **Notes:** the
12 labeled-stated ids (`LABELED=stated`), containment only. **Sides:** real
+ rotated control. **Calls:** 2 claim forms × 2 sides × 12 notes × ≤2 =
**≤96**, about four minutes on this box. Checkpoints
`results/reading-wall-fragment.json`, `results/reading-wall-article.json`.

**What moves the standing:** `article` lands more of {42, 45, 54, 150} than
`fragment` with control landings still 0 → the fragment was the wall, and
`claimOfNote` should carry the article sentence for the witness. `article`
lands the same or fewer → the wall is the reader, and it stays at 4/11 with
the honest note that three of the seven refusals are correct reading.

## The measurement, taken: 70 calls (36 fragment, 34 article)

Checkpoints `reading-wall-fragment.json`, `reading-wall-article.json`,
each with per-note verdicts (`perNote`) — the earlier checkpoints kept only
tallies, which is why the seven had to be resolved by subtraction above.

| note | label | fragment real | fragment control | article real | article control |
|---|---|---|---|---|---|
| 3 | prospective | indiscriminate | indiscriminate | unarmed | unbuildable |
| 12 | stated | **states** | no | **states** | no |
| 38 | stated | **states** (caption, see below) | indiscriminate | **states** (same) | indiscriminate |
| 42 | stated | indiscriminate | indiscriminate | indiscriminate | indiscriminate |
| 45 | stated | indiscriminate | no | indiscriminate | no |
| 54 | stated | no | no | indiscriminate | **states** (control) |
| 61 | partial | **states** | no | indiscriminate | no |
| 91 | stated, not in the eight | no | **states** (control) | no | no |
| 113 | stated | **states** | no | **states** | no |
| 136 | partial | no | no | no | no |
| 149 | stated | **states** | no | indiscriminate | no |
| 150 | stated | no | no | no | no |
| **total** | | **5/12, 1 control** | | **3/12, 1 control** | |

**The fragment was not the wall.** Shown the article's own sentence the
witness landed fewer (3 against 5) and refused `indiscriminate` five times
instead of three: a longer claim shares more words with more candidates,
and the picker that keys on shared words points at the same sentence for
the nonsense arm more often. The hypothesis is refused by its own
measurement; `claimOfNote` stays as it is.

**Two things the earlier report said that are no longer true.**

1. *"Never points at the wrong thing."* The fragment control landed once:
   `of mission launch on the back side of the Moon` (note 91's fragment
   with the rotated end2) drew *"On July 19, after Apollo 11 had flown
   behind the moon out of contact with Earth, came the first lunar orbit
   insertion…"*. A claim of three content words — `mission launch` and
   whatever end2 brings — is not a claim; the walk's extraction produced
   it from an infobox row (`Start of mission Launch date July 16…`), and
   there is nothing for the arm to hold. The article-form control landed
   once too (54, a rotated site list pointing at *Site Five*). One false
   landing in 23 control asks per form; both on claims the extraction
   made ill-formed.
2. *"Every landing is a labeled sentence."* Note 38 landed on a photo
   caption — *"Apollo 11 astronauts await the recovery helicopter … all
   wearing BIGs"* — which states that BIGs were worn, not that they were
   worn *until* the isolation facility. That is the same partial-landing
   shape as 61 (`stated-partial`), on a sentence the label did not list.
   The byte address is what lets a reader see it.

**Why 5 here and 4 yesterday on the same notes.** The eight changed: the
population repair (S48) re-cut every face with its chrome stripped, so the
containment candidates are not yesterday's. This is not temperature-0
drift; the two checkpoints were not the same prompt.

## Where the wall is, then

Of the seven refusals with the answer present, after this pass:

- **Three are the reader being right or under-fed** — 91 (not in the
  eight), 136 (the label itself says "April 12" is not stated), 3 (the
  source states a plan; and the walk's `article` span for this note is a
  different sentence entirely — an extraction fault, recorded).
- **Two are the arm** — 42 and 45 answered `indiscriminate` under both
  forms: the picker pointed at the same sentence for `Camera had
  Armstrong` and `Collins recovered Apollo` as for the real claim. The
  arm on a phrase-valued end2 swaps the whole predicate for one name and
  produces a string nobody could mean; a picker that answers it by
  shared words is refused, correctly, but the arm has not tested what
  P32 built it to test. The fix is mechanical and designed, not yet
  built: on a phrase-valued end, swap a NAME INSIDE the phrase for the
  competing filler, or when the phrase carries no name, fall back to the
  rotated control as the arm. Not built here because it changes the arm
  for every caller and belongs to its own measured pass.
- **Two are the reader** — 54 (a list: "Site One … in the Sea of
  Tranquility" for "Sites 1 and 2 were in the Sea of Tranquility") and 150
  ("helicoptering to Hornet early on splashdown day" for "they would fly
  to Hornet in Marine One", where the source's *they* is Nixon's party).
  gemma2:2b, fed the right eight, does not cross these; the local model
  stays small, so these stay refused and disclosed under P84(1) as "stated
  once so far".

Recall on the standing, honest form: **5 of 12 labeled-stated notes carry
`primary:` after this pass, with 1 control landing in 23** — down from "0
false" because the control was asked more questions, not because the
witness changed.

## Budget, reconciled

| | calls |
|---|---|
| zero-call dump (`reading-wall-zero.mjs`) | 0 |
| fragment form, 12 notes, both sides | 36 |
| article form, 12 notes, both sides (1 control unbuildable) | 34 |
| **this pass** | **70 of ≤96 declared** |
| session total including `slicer-coverage-RESULTS.md` | 145 |

## Files
`reading-wall-zero.mjs`, `results/reading-wall-zero.json`,
`results/reading-wall-{fragment,article}.{json,log}`. `ranke-slicers.mjs`
gained `CLAIM=fragment|article`, `LABELED=<status prefix>`, and per-note
verdicts (`perNote`) on every checkpoint.

---

# Notes against notes (2026-09-02, later): the grain is the wall

User: *"it never says it literally, but can't we compare hypergraphical
notes?"* — `note-match-zero.mjs`, `results/note-match-zero.json`. **0 calls.**

The cited face is folded with the SAME relation reader that folded the
article (`makeRelationReader`, same organs, same priors), and the article
note is matched against the face's own edges: subject by shared features
through `sameAct`, act by lemma, object by feature overlap; a pronoun
subject is typed unresolved rather than matched loosely. The rotated end2
is the control. Then, as a second arm, the reader's own `read(article
sentence)` against the face — the binding by referent identity the
hypergraph already does for every answer.

| | matched | on a labeled sentence | control matched |
|---|---|---|---|
| structural match, 12 labeled notes | 1 | 1 (note 136, graded partial) | 0 |
| `read()` binding, 12 labeled notes | 0 bound (9 unbound/unheard/beyond-reach, 3 no claims) | — | — |

**Why: the notes are sentence-shaped.** Both sides' edges are `subject —
first verb → the rest of the sentence`. On the face, the sentence that
states note 12 folds to *"the two containers —were→ placed aboard a C-141
cargo aircraft and flown directly to Ellington Air Force Base (AFB) near
MSC in Houston"*; note 61's to *"Hornet —was→ still steaming toward the
splashdown point but it had launched recovery helicopters already
approaching their operational stations"*. Across the 127 object-missing
partials the act is an auxiliary on 40 (`was` 25, `were` 8, `had` 7). A
passive ("were found") carries its verb inside the object; a coordination
("placed … and flown …") is one edge; the object is the whole predicate.
Comparing these structurally is comparing sentence strings with the
subject removed — which is what containment already did, and it is
exactly the grain gap the hyperlexicon work named: **a grain gap floors
where a vocabulary gap degrades.** Six of the twelve stating sentences
yield no edge at all (lists, captions, quotations, "one by one retrieved").

**So the answer is yes, and not yet.** Note-to-note comparison is the
right organ and it exists (`read()` is it). It cannot cross paraphrase
until the extraction cuts finer: the verb chain resolved to its head act
(`were placed` → `placed`; passive turned so the patient is the subject),
coordination split into edges, the object reduced to its head phrase. That
is an extraction-grain change in `adapters/text/relations.js` and the
reader, with its own control (the same 12 labels, the same rotation), not
a matcher. The reader model stays where it is until then; the vocabulary
gap (`film footage` / `capture images`) is the only part of this wall a
model or lexicon could earn under P85, and it is the smaller part.
