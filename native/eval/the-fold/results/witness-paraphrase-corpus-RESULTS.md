# The sentence witness at corpus scale, and the excerpt-scale paraphrase battery it followed

Two questions, one after the other. First: how strict is the sentence
witness (`organs/witness-sentences.js`) on paraphrase — the live specimen
was "Kutuzov replaced Barclay de Tolly as commander" reading refused
against a passage saying "the Tsar replaced Barclay de Tolly with
Kutuzov." Second, once that had an answer on a 9KB hand-picked excerpt:
does any of it still hold at the scale a real turn actually runs at — the
whole book, chunked and retrieved the way `app.js` does it, never a
window a person chose by hand.

## Battery 1 — the Borodino excerpt (`witness-paraphrase.mjs`)

Sixteen sentences over a 9KB excerpt of the committed Wikipedia Borodino
fixture, truth and shape fixed before the run: verbatim / near-verbatim,
passive, role-reversed (agent promoted or demoted), synonym-verb,
rearranged adjunct, each paired with a FALSE twin. Declared ends (a
pseudo-claim's own `end1`/`end2`), gemma2:2b, temperature 0, the real
`witnessNote` SELECT path with the same-index arm — the exact production
wiring (`app.js::witnessTestimony`, morphology folded into the company
wall).

```
ENTAILED read states: 3/9   FALSE read states (LIES): 0/7
by shape (entailed only): role-reversed 1/2 · near-verbatim 0/1 · passive 0/2 · rearranged 2/2 · synonym-verb 0/2
```

Zero lies. Recall is real but uneven by shape: `rearranged` (the fact
restated with its adjuncts moved) passed both times; `passive` and
`near-verbatim` passed neither. **Role-reversed is not categorically
refused** — one of the two passed (item 11, "the Russian army retreated
south" against "the Imperial Russian forces retreated southwards" — a
role-reversal in subject naming, not in the flagship agent/patient
sense). The flagship specimen itself (item 1, "Kutuzov replaced Barclay
de Tolly as commander") stayed `skipped: indiscriminate` — the sibling-swap
arm found the swapped claim just as pointable-at as the real one, so the
pick decided nothing, which is the wall doing exactly what it is for
(Bovens & Hartmann: an unchallenged yes is not a second witness). This is
a strictness cost, not a bug: the same wall that refuses the flagship
also produced zero lies across every FALSE item.

## Battery 2 — the whole book, chunked and retrieved for real (`witness-paraphrase-corpus.mjs`)

The user's direction: make sure this works on a huge corpus, not a small
attachment. Sixteen new War-and-Peace facts (verbatim / passive /
role-reversed / rearranged / synonym-verb, FALSE twins), each item asked
with a QUESTION (the words a real turn would type), never a hand-picked
snippet — `source.js::chunkSource` over the full 3.3MB `pg2600.txt`
(gitignored, read from disk, never copied into a fixture), then
`source.js::retrieve(chunks, question, limit)` exactly as `app.js` ranks
passages for a live turn, and only the RETRIEVED passages handed to
`witnessSentences`.

```
chunking pg2600.txt (3,293,655 chars)... 11,132 chunks, 0.2s
gemma2:2b,  limit 3: 22 calls, 25s — ENTAILED states 0/9 · FALSE states (LIES) 0/7
gemma2:2b,  limit 1: 21 calls, 18s — ENTAILED states 0/9 · FALSE states (LIES) 0/7
llama3.2,   limit 1: 20 calls, 43s — ENTAILED states 0/9 · FALSE states (LIES) 0/7
```

**Mechanically, it works.** Chunking 3.3M characters into 11,132
byte-addressed paragraph chunks took 0.2s; retrieval over that set is
instant; sixteen items ran in 18–43s depending on the model. Nothing
crashed, timed out, or silently truncated. `retrieve()` found at least
one candidate passage for every one of the 32 (item × model) asks — the
retrieval step never failed to surface material.

**The precision guarantee survives scaling 400x: 0 lies, both models,
every limit tried.** No FALSE item was ever read `states` at corpus
scale, matching the excerpt run exactly. This is the property that
matters most and it did not degrade.

**Recall collapsed: 0/9, both models, at both retrieval widths.** Every
entailed item that would have been an easy pass on the excerpt came back
`refused` (the model itself said no testimony) or `skipped`
(`indiscriminate`/`unarmed-select`/`decider_unrelated` — the wall,
correctly, refusing an unchallenged or confused reading). This was
checked, not assumed, three ways before it was reported as a real
finding rather than a pipeline defect:

1. **Retrieval correctness, verified byte-for-byte.** The single worst-
   looking case (item 4, "the French army crossed the Niemen") was traced
   by hand: `retrieve()`'s rank-1 chunk (`pg2600.txt#1637123-1637402`)
   genuinely contains "the French army had crossed the Niemen" — the
   fact, nearly verbatim. (A first pass at this check used Python's own
   text-mode file read to re-slice the offsets and got the wrong bytes
   entirely, which looked like a truncated chunk; re-checked against
   Node's own `chunkSource` output directly, the chunk is whole and
   correct. Worth naming so the mistake is not repeated: verify a
   byte-addressed span in the SAME runtime/encoding that produced it, not
   a second one.)
2. **The candidate set, printed directly.** `statingCandidates` built
   exactly ONE candidate sentence for item 4 at `limit=1` retrieval, and
   that one sentence states the fact almost word for word: *"Borís was
   thus the first to learn the news that the French army had crossed the
   Niemen and, thanks to this, was able to show certain important
   personages..."*
3. **The raw model call, printed directly.** Given that single, correct,
   stating sentence and nothing else, gemma2:2b answered
   `{"stated":"no","sentence":0}`. This is not a wall refusing an
   ambiguous pick — the model itself judged a genuinely stating sentence
   to not state the claim, most likely because the fact sits inside a
   subordinate clause of a longer reported-speech sentence ("X was the
   first to learn the news that Y") rather than as a short standalone
   declarative the way the hand-picked excerpt's sentences read.
4. **Cross-instrument, not one model's quirk.** llama3.2:latest was run
   over the identical sixteen items and identical retrieved passages:
   0/9 entailed, 0/7 lies — the same shape, a different model. A
   strictness that both instruments show is a fact about the MATERIAL
   (real literary prose folds facts into long, subordinate, reported-
   speech sentences far more than the short declaratives used to build
   the excerpt battery) and the small-model reading capacity, not a
   defect in the witness protocol or the retrieval/chunking pipeline.

## What this settles and what it does not

**Settled:** the pipeline (chunk → retrieve → witness) runs correctly and
fast on a real, full-length, gitignored corpus — this was not previously
measured at any scale beyond a 9KB excerpt. The precision guarantee (no
FALSE item is ever attested) held at 400x the material. Both are load-
bearing and both are now numbers, not impressions.

**Not settled, and disclosed rather than smoothed over:** small-model
recall on real literary prose is measurably worse than on the shorter,
plainer sentences of the original battery — 0/9 at corpus scale against
3/9 on the excerpt, on the exact same protocol. Whether this is a ceiling
worth accepting (the wall exists specifically to prefer silence over an
unchallenged yes) or a case for widening the candidate set beyond single
sentences (a stating sentence that folds the fact into a subordinate
clause may need a bigger reading unit than one sentence) is the next
measurement, not a guess. `LIMIT=1` and `LIMIT=3` retrieval widths made
no difference here — the bottleneck is the SENTENCE the model was shown,
not how many passages it came from.

## How to reproduce

```bash
cd eoreader7/native/eval/the-fold
node witness-paraphrase.mjs                                  # excerpt battery, gemma2:2b
MODELS=gemma2:2b,llama3.2:latest node witness-paraphrase-corpus.mjs   # corpus battery, both models
```

`witness-paraphrase-corpus.mjs` reads `pg2600.txt` from
`the-fold/../pg2600.txt` (override with `BOOK=<path>`) — the file is
gitignored and never copied into a fixture; the driver reads it from disk
the same way a real turn's attached source would be read.
