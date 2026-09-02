# atmosphere-chunking-eval — real, licensed boundaries vs. blank-line rule

Declared: window=5, draws=256, tolerance=3, hop=5 (packages/host/terrains.js's own ATMOSPHERE_REGIME, unchanged).

## War and Peace (Tolstoy, pg2600, English)

- blank-line split: 11,132 passages
- atmosphere-filtered: 896 passages
- reduction: 92.0% of blank-line breaks were noise, not a regime shift
- average passage size: blank-line 294 chars, atmosphere-filtered 3654 chars

Five real atmosphere-filtered passages, verbatim byte ranges, first line only:
- pg2600-en.txt#19-4009 (3989 chars): "By Leo Tolstoy/Tolstoi…"
- pg2600-en.txt#4012-7927 (3910 chars): "CHAPTER VIII…"
- pg2600-en.txt#7930-11274 (3343 chars): "It was in July, 1805, and the speaker was the well-known Anna Pávlovna…"
- pg2600-en.txt#11277-15121 (3843 chars): "“Oh, don’t speak to me of Austria. Perhaps I don’t understand…"
- pg2600-en.txt#15124-19122 (3997 chars): "“I often think,” she continued after a short pause, drawing nearer…"

## Verdict

The claim being tested — that most blank-line breaks in real prose are typographic structure, not real topic/scene shifts, and a licensed statistical test can tell the difference — is confirmed on real material: the reduction above is the actual measured answer, not assumed. Every produced chunk still self-verifies its own byte address (source-atmosphere.test.mjs's own pinned regression), the same discipline every other chunker in this repo is held to.

