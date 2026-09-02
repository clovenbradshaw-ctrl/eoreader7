# The diet boundary, refuted as a door; and the first cross-source number (2026-09-02)

**Driver:** `eval/the-fold/diet-boundary.mjs` (~90s, no model, no network;
raw numbers in `results/diet-boundary.json`). **Kernel:**
`kernel/notes.js::dietBoundaries` / `concedeDiet`, `kernel/continuation.js::
sedimentPrior` / `scorePrequential`, both unmodified by this run. **Declared
before the run:** diet by `end1`, order 3, alpha 0.05, 40 shuffles, seed 1
(the order is `surprise-segments.mjs`'s own); continuation orders 1..3, 20
shuffled-prior draws, seed 5. Every ledger born with its frame; every
witness carrying `~fixed-recipe`.

## What was being asked, and the correction it starts from

notes-segments-RESULTS.md had said the most surprising hearings of every page
were its furniture. That was a floor artifact (its own correction section
says how). The real question is whether a source's TAIL is a run of
hearings above the null's cut that is longer than the same hearings, order
destroyed, ever produce at their tail — II.23's control built in, the same
hearings shuffled. Materials: the three committed Wikipedia pages (wrappers
real: category links, templates, bibliography); each page cut back before
its first back-matter heading as the prose-tail control; the last 120KB of
the real Gutenberg *Dracula* with its 18KB licence, and the same slice cut
at the END marker as its control.

## Result: the door fails its control in both directions

| material | hearings | tail run | null (95th) | boundary |
|---|---|---|---|---|
| Battle of Borodino (full, wrapper at the tail) | 341 | 2 | 10 | no |
| … cut before "See also" (prose tail) | 292 | 1 | 9 | no |
| War and Peace (full, wrapper at the tail) | 310 | 4 | 12 | no |
| … cut before "See also" (prose tail) | 254 | **12** | 9 | **yes** — a list of stage and screen adaptations |
| Бородинское сражение (full) | 677 | 6 | 17 | no |
| … cut before "Примечания" | 531 | **23** | 22 | **yes** — a list of streets and boulevards named after the battle |
| Dracula, last 120KB WITH the licence | 410 | 11 | 20 | no |
| Dracula, same slice cut at the END marker | 381 | 2 | 14 | no |
| every shuffled control (8 of 8) | | | | no |

The wrappers do not form a run and neither does the licence: their ends
RECUR ("Project Gutenberg", "the Foundation", "Статьи"), so the ground is
not wrong about them for long. The two arms that fire are prose the page's
own editors wrote — closing sections that are lists (adaptations; streets),
where every end is new. What `dietBoundaries` measures is **a tail of ends
that never recur**, which is the shape of a list, not of furniture. The
shuffle controls behave (8 of 8 silent), so the statistic is real; it is
the CLAIM that was wrong.

**Consequence.** `concedeDiet` is not licensed on real material and is
wired to nothing. `dietBoundaries` stays as what it is — a diagnostic that
reports a non-recurring tail with its null — and the refutation is written
into the kernel's own header so the door is not rebuilt under another name.
The honest reading of yesterday's lead: what distinguishes furniture from
the article is not its surprise; it is that it is ABOUT something else,
and "about" is the referent tier's question (P38, P79), not the
segmenter's.

## Cross-source continuation: the first number for "reading gets richer from what it has read"

A prior sedimented from page A's hearings (kernel/continuation.js — no
theory, no smoothing), scored prequentially on page B; the null is the
median of 20 priors sedimented from A with its order destroyed (same
alphabet, same counts — only ORDER can carry).

| A → B | stream | gain (bits/hearing), orders 1/2/3 | shuffled draws beaten |
|---|---|---|---|
| Borodino → War and Peace | label | 0.30 / 0.32 / 0.32 | 20/20 each |
| War and Peace → Borodino | label | 0.19 / 0.25 / 0.22 | 20/20 each |
| Borodino → Бородино | label | 0.23 / 0.22 / 0.22 | 20/20 each |
| War and Peace → Бородино | label | 0.08 / 0.08 / 0.08 | 20/20 each |
| Бородино → Borodino | label | 0.02 / −0.01 / −0.01 | 17 / 5 / 5 |
| Бородино → War and Peace | label | 0.00 / 0.00 / 0.00 | 0/20 |
| every pair | end1 | 0.00–0.02 | 0/20 (five pairs), 20/20 at ≤0.02 (two) |

**Between the two English pages the ORDER of labels transfers**: 0.2–0.3
bits per hearing, beating all twenty shuffles at every order — how one
predicate follows another on one page says something about the next page.
On `end1` nothing transfers (the casts barely overlap, so the prior and its
shuffle predict the same nothing). English → Russian carries a small,
consistent gain through the labels the two alphabets share (numerals,
Latin-script names, the copula); Russian → English carries nothing. This is
one number on three pages, reported at the grain it was measured; it is
the first time this project has shown a reading predicting a later reading
better than its own shuffle, and it is the label stream, not the ends,
that carries it.

## Not done, said plainly

No live path consumes either measurement. The frame and recipe wiring
landed in the same pass (the-fold P81) is independent of these results
and stands on its own tests.
