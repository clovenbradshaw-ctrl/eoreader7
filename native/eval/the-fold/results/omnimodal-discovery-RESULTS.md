# One organ, four media — it transfers to music, and correctly refuses two bad instruments

`node native/eval/the-fold/omnimodal-discovery.mjs` — real bytes on disk,
**zero model calls**, `MAX_EVENTS=4000`.

**Generality: universal for the organ, specimen-scoped for two instruments.**
The organ call is byte-identical across all five streams. Two of the five
instruments are shown inadequate, and that is this document's main negative.

## What was tested

`discovered-reading-kinds.mjs` found reading rules in Wikipedia pages by
pointing `discoverCompanyKinds` at a stream of line-shapes. If that was a fact
about **discovery**, the identical organ finds each medium's grammar when
handed that medium's events. If it was a fact about **text**, it will not.

The organ, its declared floors and its II.23 null arm are the same call in
every row. Only the instrument differs — and it must: a MIDI is not a GIF.

## Results

| stream | events | distinct | max marginal | kinds cleared |
|---|---|---|---|---|
| text — real Wikipedia HTML | 990 | 50 | 0.28 | **3** |
| pdf — real 12-page report | 4000 of 12,907 | 22 | **0.82** | 0 |
| music — Bach, Goldberg Aria | 417 | 52 | 0.13 | **2** |
| music — Bach, WTC I Prelude 1 | 548 | 19 | 0.31 | **2** |
| video — real animated GIF | 44 | 3 | **0.66** | 0 |

## It transferred to music, on two independent real files

Neither Bach file was used to build anything. A token is the interval from
the previous note plus a duration class — never absolute pitch, because a
pitch is a fact about key and an interval is a fact about the music's own
motion.

```
Goldberg Aria
  kind:before=u5t1   25 notes   members u1t1 d2t1
  kind:before=d5t2   51 notes   members u5t4 u4t3 u5t1

WTC I Prelude 1
  kind:before=d5t4   64 notes   members u2t4 u1t4 u3t4 u4t4
  kind:before=u3t1  118 notes   members d4t1 d5t4
```

Read the signatures: *after a large leap comes motion in the other direction*.
`before=d5t4` (a big downward leap) collects `u1t4 u2t4 u3t4 u4t4` — small and
medium **upward** steps. `before=u5t1` (a big upward leap) collects `u1t1
d2t1`. Both files, independently.

That is **gap-fill** — a leap is followed by stepwise motion filling it in,
one of the oldest described principles of melodic writing. **Nominated, not
proven:** this document read the members and recognised the shape. Nothing
here tested a musicological claim, and the organ was told nothing about music.

## It did not transfer to two instruments — and the refusal is the evidence

Both failures carry the same tell, and it is the organ's own stated failure
condition: **one symbol already dominates**.

**PDF, max marginal 0.82.** The instrument is wrong, not the organ. A PDF's
text-showing operators emit *fragments* — words, sometimes kerning-split
pieces — and this instrument applied the LINE shape to them, so nearly every
token is short and shapes identically. 12,907 events collapsed to 22 distinct
kinds. The right instrument reassembles fragments into lines using the page's
own positioning operators (`Td`/`TD`/`T*`/`Tm`), which is real unbuilt work.

**Video, max marginal 0.66, and only 44 frames over 3 distinct kinds.** The
GIF is a rotating earth: every frame is the same size, at the same position,
with the same delay and a similar compressed length. Its frame grammar is
genuinely **uniform**, so there is nothing in its descriptors to discover. A
GIF with cuts or scene changes would give the instrument something to see;
this one does not. Also disclosed: no pixels are decoded — there is no ffmpeg
in this container — so this reads only what the container declares.

**The important part: the organ refused rather than inventing.** At a marginal
share of 0.82 a bare share floor is trivially cleared — that is exactly the
regime the organ's own header records the turbulence run refuting, and the
reason the null arm exists. It could have manufactured kinds on both of these
streams. It produced none.

## What this establishes, and what it does not

**Establishes:** the mechanism is not a fact about text. The same call, told
nothing about the medium, found real structure in two independent Bach files
by a different instrument entirely. And its null arm holds on streams where
the instrument is bad, which is the property that makes the positive results
worth anything.

**Does not establish:** that this reads PDFs or video. Two of five instruments
are inadequate and are named as such. A working PDF instrument is a known,
scoped piece of work; a video instrument that sees past the container needs a
decoder this container does not have.

## Disclosed

- Only text has an independent oracle, so only there can a kind be scored for
  **usefulness** against a second null. Music, PDF and video get the discovery
  null only, and the sample is the evidence.
- `MAX_EVENTS` 4000 is a declared budget and it bites on the PDF (4000 of
  12,907). The cap does not explain that failure: 22 distinct kinds at 0.82
  marginal is a property of the fragments, not of how many were read.
- **A real bug, found by running it:** the first PDF extractor matched
  parenthesised strings with a nested-quantifier regex and backtracked
  catastrophically — extraction alone did not finish in 110 seconds on a
  12-page paper, and it was the *extraction*, not the null arm, that was slow.
  Replaced with a linear scanner over balanced parens with backslash escapes,
  which reads a PDF string exactly, in one pass, and cannot blow up.
- Five streams, four media, one language, one publishing system per medium.
