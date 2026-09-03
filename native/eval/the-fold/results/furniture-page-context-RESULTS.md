# Furniture decided with the page in view, not inside one chunk

Driver: `eval/the-fold/furniture-page-context.mjs` (re-runnable; `PAGES`, `BOOK`).
Organs: `organs/source.js::withPageBlanking`, `organs/hypergraph.js::readSentenceText`.
Spec entry: S51. Both arms run in ONE process against the same fixtures, so the
only difference is where the furniture decision was taken.

## The defect

`blankLabelRows` calls something furniture only when it sees `minRun`
CONSECUTIVE cells. Its one consumer applied it to ONE SENTENCE of ONE
already-chunked passage — and the median chunk of a real Wikipedia page is
31–72 characters. A navbox therefore arrives already atomised into one-bullet
passages, and the run of four can never form. The evidence for a run lives
ACROSS chunks; the decision was being taken where that evidence is not.

Measured on three pages before any change (characters blanked):

| page | as shipped | whole page | |
|---|---|---|---|
| battle-of-gettysburg | 286 | 16,176 | **57×** |
| american-civil-war | 1,157 | 14,963 | 13× |
| abraham-lincoln | 742 | 47,098 | **63×** |

**The sentence boundary is not the constraint; the passage boundary is.**
Per-sentence and per-passage blanking agree at ratio 1.000 / 1.000 / 0.852 —
so scoping to a chunk, not to a sentence, is what costs the mechanism its
evidence. (An earlier reading of this same defect blamed the per-sentence
scoping. That was wrong, and measuring it is what showed so.)

## What shipped

`chunkSource` gains an optional injected `blankFurniture` organ — the
precedent is its existing `atmosphere` organ, and absent means byte-identical
to today. When given, it blanks the WHOLE page once and attaches each chunk's
own span as `chunk.blanked`. `chunk.text` is never touched, so every existing
address still reads back; this only ever ADDS a parallel copy.

**The readback gate, which is not decoration.** `chunk.text` is `body.trim()`
while `start`/`end` span the UNTRIMMED body, so a chunk's text is not always
`text.slice(start, end)`: 6 of 747 Frankenstein chunks differ by a leading
space, and `chunkRows` reconstructs delimited rows rather than slicing them.
A chunk receives a blanked copy only when that copy is verifiably ITS OWN
text with nothing but spaces substituted — same length, every position either
identical or blanked. Anything else keeps no `blanked` field and falls back
to the per-sentence path unchanged. On the six measured pages the gate
accepted **2,920 of 2,920** chunks.

`readSentenceText` prefers the copy, read at the sentence's own offset, and
applies pronoun substitution AFTER — the reverse of the fallback's order,
because the copy is aligned to the original and pronoun substitution is
length-changing ("He" → "Johnson").

## Result — six real pages

```
page                                   blanked      bound      notes  FURNITURE
                                  shipped→page  ship→page  ship→page  ship→page
battle-of-borodino                    501→3766    332→326    331→325        3→0
war-and-peace                         349→4736    292→276    292→276       16→1
apollo-11                             784→7682    579→562    575→558       15→0
battle-of-austerlitz                  207→4467    284→274    283→273       15→0
war-of-the-third-coalition            406→4444    343→334    343→334       10→0
borodino-ru                            66→3512    659→623    650→615       39→0

TOTALS   blanked 2,313→28,607 · bound 2,489→2,395 · notes 2,474→2,381
         FURNITURE-derived notes 98→1     (3.96% → 0.04%)
```

**FURNITURE-derived is measured exactly, with no hand list.** A claim's span
carries its chunk's ref plus start/end relative to that chunk's text — which
is precisely what `chunk.blanked` is aligned to. So the blanked reading of a
span is `chunk.blanked.slice(span.start, span.end)`, and a span the blanker
erased is one whose characters are now spaces where the material had content.
That is the blanker's own verdict, read at the note's own address: not a
second opinion about what furniture is. The floor is declared — a span counts
as furniture-derived when at least half of it was erased, so a note that
merely brushes a blanked edge is not convicted.

What the ledger stops holding, in its own words: `"Short description —is→
different from Wikidata"`, `"Commons category link —is→ on Wikidata"`,
`"Wikisource —templates→ with missing id"`, `"All articles —containing→
potentially dated statements"`, `"Russian —adapted→ into films / operas /
plays / radio programs / television shows"`.

## The cost, and where it actually goes

118 bindings stop being `bound`. **They do not all go to the same place, and
summing them would hide the finding:**

```
  47  ->  NOT EXTRACTED   the claim is gone entirely
  40  ->  unbound         extracted, no matching edge
  19  ->  beyond-reach    withheld: the subject no longer resolves
  12  ->  unheard
```

75 of the 118 were furniture-derived or mis-parsed — the point of the change.
43 were real relations in real prose.

**One of those 43, root-caused rather than assumed, reframes the category.**
`"A divisional system" —was→ "introduced in 1806"` is still extracted
identically after the change; its verdict moves to `beyond-reach`, reason:
*"A divisional system" doesn't resolve to anyone or anything this material
establishes*. That subject had been resolving as a RECURRING FORM, and part
of its recurrence was navbox rows. Blanking removed them and it fell below
the recurrence floor. That is a **correction**, not a loss: the binding had
been resting on furniture, and `beyond-reach` is explicitly withholding —
the tier's own reason line says "a limit of this check, not a mark against
the answer". How much of the 43 is this shape is not separately measured.

Several losses are also **paired with strictly better gains**, which a count
cannot show — the label moves off a noun onto the real verb:

```
  "The" —capsule→ "communicator (CAPCOM) was an astronaut ..."
    becomes  "The capsule communicator" —was→ "an astronaut stationed at ..."
  "A huge" —panorama→ "representing the battle was painted by Franz Roubaud ..."
    becomes  "the battle" —was→ "painted by Franz Roubaud for the 100th anniversary ..."
```

25 notes are gained in total, including real Russian relations on
`borodino-ru`, whose furniture was the most invisible to the English POS gate
(66→3,512 characters blanked, the largest relative move of the six).

## Controls (eo-constitution II.23 — built to fail)

**1. A page with no furniture must not move at all.** `ddg-results.html`:
blanked 0→0, bound 7→7, notes 7→7. **Unchanged**, as it must be.

**2. A real book must not lose real prose.** Gutenberg Frankenstein
(438,841 chars, 747 chunks): **227 characters newly blanked of 417,000 read
— 0.054%**. The largest newly-blanked fragments are the title block and the
table of contents (`"CONTENTS  Letter 1  Letter 2 …"`) — furniture, correctly
caught — with a real tail: `"affectionate"`, `"brother,"`, `"Saville,"` are
the epistolary sign-off blocks (`"Your affectionate brother, / R. Walton"`,
`"To Mrs. Saville, England."`), and `"admiration,"` sits where prose runs into
an indented Wordsworth quotation. Real text, blanked. Small, quantified, and
disclosed rather than smoothed over.

**3. A structured non-Wikipedia document.** `ukpga-2017-1.md`, a UK statute:
696→937 characters, and every blanked region is YAML frontmatter
(`stats_total_paragraphs:`, `document_main_type:`, the source URL). No
statute body.

**4. What the blanker calls furniture, in isolation.** The shape it convicts
is ≥4 short lines without terminal punctuation, and that is not only navboxes:

| shape | as shipped | page scope | |
|---|---|---|---|
| verse (Blake) | 95 | 95 | pre-existing |
| recipe steps | 54 | 54 | pre-existing |
| glossary | 107 | 107 | pre-existing |
| **screenplay dialogue** | **0** | **58** | ⚠️ **new** |
| **navbox** | **0** | **41** | ✅ the gain |
| prose | 0 | 0 | survives |

**The gain and the risk are the same mechanism.** Navbox rows and screenplay
dialogue are both short lines separated by blank lines, and only page scope
makes either visible. Verse, recipes and glossaries were already being blanked
before this change — the false positive there is inherited, not introduced.
Dialogue is the one shape this change newly exposes, and the Frankenstein
control is where it shows up for real, at 0.054%.

## A metric that measured nothing, recorded so it is not retried

A "mis-parsed label" column was added — a note whose LABEL settles as
something other than a verb under the repo's own grammar lens
(`makeGrammarLens`, `minShare: 0.5`, the same number every live caller
declares). It reads **0→0 on every page**. The reason is structural, not a
bug: the reader's own POS-prior vocabulary gate already ran during
extraction, so any label reaching a note has already passed the same prior at
the same threshold, and the lens cannot fire on it afterwards. The column is
redundant with the vocabulary gate by construction.

## Reproduction

```
cd native/eval/the-fold
node furniture-page-context.mjs                     # six pages + the null control
BOOK=/path/to/pg84.txt node furniture-page-context.mjs   # + the book control
```

Conformance: `organs/source-page-blanking.test.mjs`, 13 cases against the real
organs — the gate's alignment guarantee, its refusal of a length-changing or
character-substituting organ, the trimmed-chunk case, the delimited case, and
two end-to-end cases proving the relation reader CONSUMES the copy (a navbox
row stops becoming a material edge) and is inert on furniture-free prose.
Full suite: 22 failures, identical by name to `origin/main` — zero regressions.
