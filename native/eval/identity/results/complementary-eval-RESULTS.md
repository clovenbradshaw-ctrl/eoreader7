# Complementary distribution — registered run, 2026-09-27

Driver `complementary-eval.mjs` (pre-registered in 9b327e3). English: Maude
translation (live_priors). Russian: the first version (lib.ru, the spec's
source). Sentence frames, 20-sentence scenes, 200 draws, alpha 0.05.
Raw rows: `complementary-eval.json`.

## As registered

| | P1: SAME mostly complementary, none together | P2: no DIFFERENT pair complementary |
|---|---|---|
| English | **fails** — 1 complementary, 1 together (Pierre/Bezukhov), 1 unsettled, 1 gap | **holds** — 0 of 12 |
| Russian | **half** — none together, but only 4 of 13 complementary (9 unsettled) | **holds** — 0 of 13 |

Median observed/expected co-presence ratio within shared scenes:

| | same | different |
|---|---|---|
| Russian | 0.57 (0.29–1.11) | 1.44 (0.90–5.41) |
| English | 1.17 (n = 3) | 1.68 (1.21–3.48) |

The direction is right in both languages; in Russian most same-referent
pairs are too weak to clear the null (power), none reads together.

## What failed, and why it is the lesson

**Pierre/Bezukhov read "together" because the gold was a string assumption.**
The 16 sentences holding both are mostly about Pierre's FATHER, old Count
Bezukhov ("his illegitimate son Pierre"; "Pierre's father, Count Bezukhov"),
and some are the title passing from one to the other ("Pierre will ... become
Count Bezukhov"). The name was declared "same" because Bezukhov is Pierre's
surname; a name has no referent, only its uses do. The measure read two
referents named together, which is what most of those uses are.

**Николай/Николая, the one Russian SAME pair above 1 (1.11), is two people**:
Nikolai Rostov and old Prince Nikolai Andreevich Bolkonsky ("Николай
Андреевич" 19 times, "Николая Андреевича" 4). Like Nicholas/Rostov in English,
it should have been declared impure.

A hypothesis tested and refuted along the way: that full names ("Pierre
Bezukhov" as one expression) caused the co-presence. They occur twice.

The registered verdicts stand as above; the two gold corrections are
post-hoc and rescue nothing. What they show: **gold declared at the level of
name types is itself a string-level claim**. A referent-level benchmark needs
gold on OCCURRENCES — which being each use picks out — or it rewards readers
for sharing its mistake.
