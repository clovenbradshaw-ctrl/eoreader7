# Floor 5, live: the witness walk over a real book, on CPU (2026-09-02)

**Driver:** `eval/the-fold/dracula-witness-walk.mjs` (~4 minutes: 4s to read
the ledger, the rest the model). **Model:** gemma2:2b under Ollama 0.33.2 on
4 CPU cores, 15GB, no GPU — 2.6–3.5s per read after warm-up. **Material:**
240KB of the real Gutenberg *Dracula* from offset 100,000 (past the front
matter), cut at its own chapter headings into six sources so "a second
source" exists to ask; read in document order by the production reader
with the subject walls on (S44). **Declared:** 60 asks; the select protocol
(the model points at a gathered sentence by index; the verdict is derived,
never written); four planted fabrications as the precision guard — a real
subject and verb given another note's object.

## What the first run found, and why it was wrong

| run | attested | gate (≥2 sources) | clean votes / ask | guard |
|---|---|---|---|---|
| first (source = witness string) | 8 | 2 → 10 | 0.133 | 0 lies |
| corrected (source = ref without address) | **1** | 1 → 2 | **0.017** | 0 lies |

The first run's eight attestations were every one from the part the note
had been heard in: "At one corner of the room was a heavy door" attested
by part 1, where it was read. `distinctSources` compared witness strings
with the passage address still on (`part-1.txt#178-275`) against a
testimony witness that has none (`testimony:part-1.txt`), so a part
re-witnessing its own note counted as a second source. That is a bug in
the organ every ≥2-source number in this project has been computed by —
two chunks of one file were two sources, and the ~2% corroboration figure
on a whole book was chunk-distinct, not source-distinct. Fixed
(`sourceOfWitness`; `independentReadings` keys (source, recipe) the same
way), pinned, and `reading-recall-finding.md` carries the correction.

## What the corrected run says

One note in sixty asks was stated by a different part of the book: "The
case of Renfield grows even more interesting", heard in part 2, attested by
part 3's "The case of Renfield grows more interesting the more I get to
understand the man." Fifty-three asks came back `no-testimony` — the model
read the other part's best slice and said it does not state the note. Three
were `uncontained` (the pointed sentence was not in the slice), one
`decider_unrelated`. 1,501 note–source pairs were never asked because no
end-word of the note appears in the source at all.

**This is not a weak witness. It is the fiction wall, measured.** A novel
does not restate its propositions in other chapters; it re-mentions its
referents. Renfield's case "growing more interesting" is the kind of thing
a diary says twice, and the walk found it. Everything else a chapter
asserts, it asserts once. Cross-source corroboration is the wrong question
to ask of a single book, and the walk answers it honestly rather than
manufacturing a yes — the guard held at zero on both runs.

## What this decides

NEXT-PASSES gated the memory floor on clean votes per ask: "if Tier 1
cannot raise it, the memory floor's DESIGN is what gets re-examined." The
number is 0.017 on a novel with the mechanism working as built (the
two-page encyclopedic ledger, same walk, is the comparison below). The
design question it forces is not how to get more votes; it is why a
single-source note needs a second source before it may reach the model at
all. The ≥2 gate was chosen when the door admitted junk (P73: 18 of 29
notes carried a closed-class label). The door is cleaner now — the POS gate
lit (P74), the subject walls (S44) — so the gate that keeps a novel's
entire reading out of the ledger block is guarding against a diet that no
longer arrives. A note with a verified address, real ends and a real label
is evidence at one witness; what it lacks is corroboration, which should
be DISCLOSED on the note rather than used to withhold it. Named here,
not built.

## The encyclopedic comparison

See the two-page section below: the same walk, the same budget, over the
Borodino / War and Peace ledger built with the walls on — the material
where restatement actually happens.

`corroboration-select-vs-generate.mjs`, `NP_SUBJECTS=1 BUDGET=30`, the same
model, the corrected source count. The ledger is 82 notes from the two
pages (78 heard, 4 planted), 0 at two sources before the walk.

| arm | asks | model calls | attested | gate after | clean votes / ask | guard |
|---|---|---|---|---|---|---|
| generate (write a because, sibling-swap arm) | 30 | 38 | 1 | 1 | 0.033 | 0 lies |
| select (point at a sentence, same-index arm) | 30 | 33 | 1 | 1 | 0.033 | 0 lies |

Each arm found one real cross-page restatement — generate: "The Grande
Armée fought against the Imperial Russian Army", stated by the War and
Peace page; select: "the Battle of Moscow took place on the outskirts of
Moscow near the village of Borodino on 7 September 1812", likewise. The
other 29 asks each came back `no-testimony`: the other page does not state
that note, in the witness's reading.

**This corrects the earlier select-vs-generate result** (7 vs 6 attested at
the same budget, `corroboration-select-vs-generate-RESULTS.md`). That run
counted with the old source function, so a page re-witnessing its own
note was a second source; it also read a ledger without the subject walls
(166 notes, many with debris ends that could not be asked of anything).
The corrected, walled number on the same material is 1 per arm. The
select protocol's per-call advantage stands (33 calls vs 38 for the same
outcome); its recall advantage does not survive the correction.

## Where floor 5 actually stands, measured live

| material | notes | asks | cross-source attestations | clean votes / ask |
|---|---|---|---|---|
| a novel, six chapter-parts | 474 | 60 | 1 | 0.017 |
| two encyclopedia pages about one battle | 82 | 30 | 1 | 0.033 |

Zero lies on 8 planted fabrications across three runs. The witness is
conservative and correct; what it is asked for mostly does not exist. On
a novel, restatement is structurally rare. On two encyclopedic pages,
the two pages state the same battle in different words, and the witness
finds one restatement per thirty asks. The design question named above
follows from both numbers together.
