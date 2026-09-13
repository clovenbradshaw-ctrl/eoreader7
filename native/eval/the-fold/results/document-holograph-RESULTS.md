# Document holograph — a document summarized by its reading, no model, no conversation (2026-09-07)

Transcribed from `node eval/the-fold/document-holograph.mjs --source <body> --gold <summary>` over two
documents that come with a summary their own authors wrote, held out and read by the same reader:

- `attention-body-no-abstract.txt` (19,713 bytes; "Attention Is All You Need", body without its abstract) vs
  `attention-abstract-HOLDOUT.txt` (the abstract, 1,137 bytes).
- `tesla-body-no-lead.txt` (50,252 bytes; the Wikipedia biography of Nikola Tesla, body without its lead,
  `[citation needed]` stripped) vs `tesla-lead-HOLDOUT.txt` (the lead, 2,735 bytes).

The sources are not fixtures (the paper is Google's; the article is CC BY-SA) and live outside the repo; the
driver refuses (S65) without them. Reader: recipe `9c70723fe2b4d37f`, levers `nounPhraseSubjects`,
`phrasalPredicates`, `attestedVerbs`, `objectSpecificity` (the app's own, P88). Null: 200 seeded random draws
of k notes; every arm is where it falls in that distribution. k = the notes the reader extracts from the
gold (4 for the abstract, 14 for the lead) and, with no gold, the document's own grounds.

## Why this driver exists

The three-resolution blocks summarize a CONVERSATION: over this paper a 6-turn run (`read-run.mjs`,
2026-09-07T23-48-48 and 2026-09-08T00-16-33) surfaced 1 of the abstract's 5 claims — only what the reader
happened to ask — and the identity layer kept 3 beings of 29 candidates, so the Lens had almost nothing to
stand on and fell back to quoting the mouth's own answer. The question here is what the LEDGER alone hands
when nobody asks.

## The paper, k = 4 (the abstract's own notes)

```
  arm        dmd     ends  triples   words3   words1  numbers   vs null (percentile, z)
  both       24▲   13%    0%    5%   23%   40%    71th z -0.1 100th z  0.0  46th z -0.5  93th z  1.7 100th z  2.6
  beings     24▲   13%    0%    5%   23%   40%    71th z -0.1 100th z  0.0  46th z -0.5  93th z  1.7 100th z  2.6
  lead       24▲    0%    0%    1%    4%    0%    31th z -1.2 100th z  0.0   2th z -1.6   5th z -1.3  72th z -0.6
  degree     24▲   13%    0%   15%   19%    0%    71th z -0.1 100th z  0.0 100th z  2.5  88th z  1.1  72th z -0.6
  referent   24▲   13%    0%   16%   19%   20%    71th z -0.1 100th z  0.0 100th z  2.9  88th z  1.1  93th z  1.0
  witness    24▲   25%    0%   16%   29%   40%    95th z  1.0 100th z  0.0 100th z  2.9  98th z  2.7 100th z  2.6
  greedy     24▲   13%    0%   19%   20%    0%    71th z -0.1 100th z  0.0 100th z  3.6  89th z  1.3  72th z -0.6
  grounds    24▲   50%    0%    9%   13%    0%   100th z  3.3 100th z  0.0  80th z  0.6  70th z  0.1  72th z -0.6
  null μ±σ          13±11      0±0      7±3     12±6     7±13
```

`witness` (the note read in the most places) hands, in 4 lines / 531 bytes: the Transformer is the first
transduction model relying entirely on self-attention (#3423-3778); it allows significantly more
parallelization and reaches a new state of the art after twelve hours on eight P100 GPUs (#1622-2005); the
big model outperforms the best previously reported models including ensembles by more than two BLEU, 28.4
(#15216-15631); and one weak line about additive attention. That is 3 of the abstract's 5 claims
(architecture, training efficiency, EN-DE result); missed: the EN-FR score and constituency parsing. At
k = 17 (the document's grounds by recurring ends) `witness` covers 63% of the gold's ends and 47% of its
content words (97th percentile). `beings`/`both` score above the null on words and numerals here but their
LINES are the author list and the proper nouns of the parsing section — on a paper, "who is named" is the
wrong identity; the metric rewarded name-dense sentences, not the abstract.

## The biography, k = 14 (the lead's own notes)

```
  arm        dmd     ends  triples   words3   words1  numbers   vs null (percentile, z)
  both       24▲   10%    0%   11%   25%   38%    61th z -0.7 100th z  0.0  73th z  0.6 100th z  2.7 100th z  4.1
  beings     24▲   10%    0%    9%   24%   38%    61th z -0.7 100th z  0.0  52th z -0.2 100th z  2.6 100th z  4.1
  lead       24▲   10%    0%    7%    6%   19%    61th z -0.7 100th z  0.0  12th z -1.4   0th z -3.5  96th z  1.4
  degree     24▲   14%    0%    8%   11%   13%    88th z  0.6 100th z  0.0  21th z -0.9   6th z -1.7  84th z  0.5
  referent   24▲   14%    0%    6%    9%   19%    88th z  0.6 100th z  0.0   5th z -1.8   1th z -2.5  96th z  1.4
  witness    24▲   14%    0%    8%   11%   13%    88th z  0.6 100th z  0.0  21th z -0.9   6th z -1.7  84th z  0.5
  greedy     24▲   14%    0%   11%   17%   13%    88th z  0.6 100th z  0.0  73th z  0.6  53th z  0.0  84th z  0.5
  grounds    24▲   19%    0%    8%   16%    6%    99th z  2.0 100th z  0.0  21th z -0.9  46th z -0.1  56th z -0.4
  null μ±σ           12±4      0±0     10±2     17±3      9±7
```

Here the recurrence arms sit BELOW the null on the lead's words (6th, 1st percentile): with one protagonist,
end-degree selects the most generic sentence about him. `beings` (each pick names the most beings not yet
named) is the arm above the null — 24% of the lead's content words (100th, z 2.6), 38% of its numerals
(100th, z 4.1) — and reads as a roll-call: Westinghouse and Niagara, Morgan, the Supreme Court decision,
the FBI seizure, the Order of the White Lion, born 10 July 1856 in Smiljan. `lead` (position) is at chance
on the paper and at the 0th percentile here: the body's first section is childhood.

The ceiling no extractor crosses: the lead is a synthesis — "became well known as an inventor", "fell into
relative obscurity", "pursued his ideas for wireless lighting" — that no body sentence states; `triples`
is 0% for every arm on both documents.

## What this measures, and what it does not

- `dmd` is 24▲ everywhere: with reach = the ends shown, every note is its own difference and dmdCut hands
  the ladder's top — the tautology its own comment names. The document's grounds (17 / 13) are the size a
  summary takes when nobody names one; the cut needs a conclusion coarser than "the ends shown".
- A summary is per grain, not per selector: where the ledger carries beings (61 of 289 here) coverage over
  WHO is named reads the material; where it carries none (1 of 29 on the paper) recurrence over ENDS does.
  The ledger states which before any arm runs. `both` was tried as one composite and is above the null on
  both documents but visibly worse than the right single arm on each — a Ground block and a Pattern block,
  each cut and nulled, is the honest shape (the conversation holograph's own three blocks, with `active`
  drawn from the ledger instead of a question).
- Not measured: the novel. `pg2554.txt` (1.15 MB) through `relationsFor` with the whole book as pool did not
  finish in 15 minutes from scratch (killed); the driver needs the persisted-ledger path
  `holograph-compression.mjs` takes before it can read a novel.

## The reader defect this found, fixed

`adapters/text/relations.js`: `W` had no hyphen and `OBJECT_GROUP` joins W tokens by whitespace only, so on
the function-word-bound branch (the one every real pool takes) an object ended at the first hyphen, quote or
dotted abbreviation — "experiments in X-ray imaging" → "experiments in X", "his steam-powered … generator"
→ "his steam", "a two-phased system" → "a two", "high-voltage, high-frequency" → "high". The same five
sentences read whole under the `.+?` branch a 5-sentence pool falls to (no function words), which is how
the defect hid: every unit test reads a short passage. Fix: a hyphen-joined run is one W (the joiner class
named as U+002D/U+2010/U+2011, not `\p{Pd}` — en and em dashes stand between tokens, S50). Native suite
714 tests, 713 pass, 0 fail, 1 pre-existing TODO. Still cut, unchanged: a quoted object (`his "oscillating
transformer"` → `his`) and a dotted abbreviation (`patent U.S.` → `patent U`). The recipe id hashes the
frame, not the reader's source, so the three persisted ledgers under `results/ledgers/` were read by the
old `W` and carry the same recipe as a new read would — re-read before they are compared with anything
read after this change.

## Also found, not fixed

`read-run.mjs`'s "what was most asked about" lists byte-identical notes under distinct referents that were
active in the same turn ("Nikola Tesla Company" / "Tesla Ozone Company" / "Tesla Electric" / "Tesla
Electric Company" all carry the same five notes; "Rodya" and "Pyotr Petrovitch Luzhin" likewise on the
novel) while the identity layer's own merge count says they were not merged — the evidence is grouped by
co-activation, not by each referent's own identity.
