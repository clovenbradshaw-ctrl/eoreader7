# The ledger block, disclosed: does it reach a real model and move the answer? (2026-09-03)

**Driver:** `eval/the-fold/gate-proof.mjs` — the REAL `holon.js` pipeline
(the-fold's `runHolonicTask`, the same call app.js makes), headless, a
real local model on CPU (gemma2:2b, temperature 0), every question a
MATERIALLESS turn (`chunks: []`): the turn that has nothing but the ledger
to stand on. **Two arms, one code path, one difference — what the door
projects:** *old* (only notes at >=2 distinct sources, the gate holon.js
held until 2026-09-03) vs *disclosed* (every note, standing said on the
line). **Two new materials:** the Austerlitz / Third Coalition ledger
(605 notes, Ranke's kept faces folded in offline — zero primaries landed,
see `ranke-walk-RESULTS.md`) and *Pride and Prejudice*, a book this
project had not read, six chapter-parts, 522 notes. **Questions:** eight
per material, drawn deterministically from the ledger's own notes ("What
did *subject* *verb*?"); a HIT is an answer carrying a content word of the
note's end2 the question did not itself carry. **A control question per
material** asks about something no note states; its block must be null.

Nothing here is a claim that a note is true. The measurement is whether a
claim the reader HEARD reaches the model and shapes what it says.

## Run 1 — the block as first shipped (corroborated tier unranked)

| material | arm | block shown | the asked note shown | hits | control block | avg prompt |
|---|---|---|---|---|---|---|
| pages | old gate | 8/8 | 1/8 | 1/8 | SHOWN (wrong) | 4,930 chars |
| pages | disclosed | 8/8 | 1/8 | 1/8 | SHOWN (wrong) | 4,602 chars |
| book | old gate | 0/8 | 0/8 | 0/8 | withheld | 1,687 chars |
| book | disclosed | 8/8 | **6/8** | **4/8** | SHOWN (wrong) | 4,918 chars |

**The book is the clean case.** Under the old gate a novel's ledger never
reaches the model at all — 0 of 8 questions saw a block, because a novel
corroborates almost nothing across chapters (P83's own finding) — and the
model answered from nowhere ("He was firm", "It was icy"). Disclosed, the
asked note reached the model on 6 of 8 questions and the answer carried
the note's words on 4 ("He was an attorney in Meryton", "She had a
restless night" — the ledger's own claims, said back). The old arm's 0/8
against the disclosed arm's 4/8 is the whole point of P84 on one book.

**The pages exposed a design flaw, the reason there is a run 2.** The
corroborated tier was NOT ranked by the question — it was the five
most-witnessed corroborated notes, whatever was asked — and the pages
ledger has 21 corroborated notes. So the five lines were full before the
single-witness tier ever ran: the asked note reached the model on 1 of 8
questions in BOTH arms (the one corroborated question), and the control
question about a committee the ledger never heard of still got five
unrelated corroborated notes. The fix (holon.js, same day): both tiers
ranked by shared vocabulary with the question, standing as the tiebreak;
a question the ledger has nothing on gets no block. The pinned test
(`holon.test.mjs`, P84) now asserts a corroborated note sharing nothing
with the question is excluded too.

A second, smaller correction to the driver itself: the control question
("What did the Committee on Lunar Tariffs decide?") shared one ordinary
word, *decide*, with a real note, so on the book it was not a control —
the block it drew was a legitimate shared-vocabulary match. Run 2 asks
about a committee whose every content word is absent from both ledgers.

Raw numbers for run 1: kept beside this file as `gate-proof-run1.json`.

## Run 2 — both tiers ranked by the question (gemma2:2b, temperature 0)

| material | arm | block shown | the asked note shown | hits | control block | avg prompt |
|---|---|---|---|---|---|---|
| pages | old gate | 7/8 | 3/8 | 2/8 | shown | 2,461 chars |
| pages | disclosed | 8/8 | **7/8** | **6/8** | shown | 5,263 chars |
| book | old gate | 0/8 | 0/8 | 0/8 | withheld | 1,686 chars |
| book | disclosed | 8/8 | **6/8** | **4/8** | shown | 4,918 chars |

**The pages moved.** With both tiers ranked by the question, the asked
note reached the model on 7 of 8 questions and the answer carried its
words on 6 (old gate: 3 shown, 2 hits — the two corroborated notes that
happen to be about the same subjects). Six of the eight hits are
single-witness notes the old gate could never have shown: *Buxhoeveden
led the Prussian army*, *Mack gathered intelligence*, *the Aulic Council
thought…* — the ledger's own single-source claims, said back with their
standing on the line. The book is unchanged from run 1: 4/8 vs 0/8.

**The control still drew a block, and the reason was one word.** The
question's own "what" is a feature of every question and of any note that
quotes one (`textFeatures` keeps it), so *What did the Xylophane committee
ratify?* — three content words no ledger holds — shared "what" with some
note and earned a block on both materials, in both arms. Fixed in
`holon.js` the same day: the question side is filtered through
`grounding.js`'s received `CLAIM_STOPWORDS` (which already carries the
interrogatives) before ranking; the note side is untouched.

## Run 3 — mechanical, after the interrogative fix (no model)

`MECHANICAL=1` answers every call with "ok" and measures only what the
block DOES over the same two real ledgers through the same pipeline —
seconds, not minutes; hits are meaningless here and reported as 0.

| material | arm | block shown | the asked note shown | control block |
|---|---|---|---|---|
| pages | old gate | 5/8 | 3/8 | **withheld** |
| pages | disclosed | 8/8 | **8/8** | **withheld** |
| book | old gate | 0/8 | 0/8 | withheld |
| book | disclosed | 8/8 | 6/8 | **withheld** |

The control is withheld everywhere; the asked note reaches the model on
every pages question and six of eight book questions (the other two are
notes whose content words the question-builder's own strip removed —
"As Elizabeth had", "Elizabeth happening" — debris subjects, a fact about
the ledger, not the block). The model-run hits (run 2) stand: the
interrogative fix changes only which notes are SHOWN, and on the 16 real
questions the shown set differs by at most the crowding-out a "what"
match caused, which the mechanical run measures as none on the pages
(8/8 now vs 7/8) and none on the book (6/8 both).

## What is established

- **The old gate hid a book's whole reading from the model** (0/8 shown,
  0/8 hits on a novel), and on encyclopedic material showed only the few
  corroborated notes, whatever was asked.
- **Disclosed, question-ranked, the ledger reaches the model and moves
  the answer:** the asked note shown 7/8 and 6/8, hits 6/8 and 4/8, at a
  prompt cost of ~3,000 chars per turn over the old gate's.
- **A question the ledger has nothing on gets no block** — established
  mechanically after two rounds of the control catching a leak (a real
  shared word, then the interrogative itself).
- **Not established:** that any answer is TRUE. The hits measure that the
  model said the ledger's words back; the ledger maps claims. gemma2:2b's
  answers on the old arm ("He was firm", "It was icy") are the same model
  inventing from nothing — the disclosure replaces invention with a
  claim that has an address and a standing.

Raw: `gate-proof.json` (run 2), `gate-proof-run1.json`,
`gate-proof-mechanical.json` (run 3).
