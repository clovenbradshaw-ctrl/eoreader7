# vendored-prior-eval — does a real, cited prior close the reach gap?

Three cases: Basque (a genuinely different LANGUAGE), Nigerian Pidgin (an English-lexified pidgin that looks close to English but isn't), and AAVE (not a separate language at all — a DIALECT of English, the sharpest test of whether one hardcoded closed class silently assumed one dialect speaks for the whole language).

## Basque (Domingo Agirre, Garoa, 1912)

Vendored prior: bin/priors/lang/eu.json — negation additions: [ez]
Declared: draws=200, seed=0, sample = every 5th passage capped at 200.
Material: 349,614 chars, 54 passages, sample 11.

### Before: no prior injected (relations.js's own English default)

- vocabulary: 176 verbs · 415 edges · 0 read polarity "-"
- "ez" admitted as a verb: true

### After: bin/priors/lang/eu.json's negation Set injected

- vocabulary: 175 verbs · 411 edges · 9 read polarity "-"
- "ez" admitted as a verb: false

Up to five real negated edges, verbatim, from actual Basque (Domingo Agirre, Garoa, 1912) prose:
- "Urbiako" —zelaietan (negated)→ "ezta zu bezelako lilirik sortu" · single-witness, 1 passage(s)
- "oñez" —edo (negated)→ "zalpurdietan" · single-witness, 1 passage(s)
- "ez" —gerriko (negated)→ "miñik" · single-witness, 1 passage(s)
- "saltzen ditu" —bere (negated)→ "paperak" · single-witness, 1 passage(s)
- "al da" —ba (negated)→ "zuen etxea" · single-witness, 1 passage(s)

### Verdict

**Confirmed.** Zero negation reach before the prior (0/415), real negation reach after it (9/411), on the SAME sampled passages through the SAME unmodified assertion tier — the only variable changed was the injected data. The vendored particle "ez" was never admitted into the measured vocabulary in either run, exactly as designed.

## Nigerian Pidgin (pcm.wikipedia.org articles)

Vendored prior: bin/priors/lang/pcm.json — negation additions: [no, neva, never]
Declared: draws=200, seed=0, sample = every 3th passage capped at 200.
Material: 116,995 chars, 22 passages, sample 8.

### Before: no prior injected (relations.js's own English default)

- vocabulary: 219 verbs · 741 edges · 0 read polarity "-"
- "no" admitted as a verb: true

### After: bin/priors/lang/pcm.json's negation Set injected

- vocabulary: 218 verbs · 739 edges · 5 read polarity "-"
- "no" admitted as a verb: false

Up to five real negated edges, verbatim, from actual Nigerian Pidgin (pcm.wikipedia.org articles) prose:
- "no gri" —sing (negated)→ "song agen afta e com sabi Yoruba languaj" · single-witness, 1 passage(s)
- "no longa" —dey (negated)→ "prodius onda di Focus Feature" · single-witness, 1 passage(s)
- "no komot" —from (negated)→ "di Taitanik radio room" · single-witness, 1 passage(s)
- "No wan" —for (negated)→ "eni of di boats wey dey stand off a fiu hundred yards ewei fit eskayp di paralysin chok of di awarenes say so short a distans ewei a trajedi" · single-witness, 1 passage(s)
- "no" —fit (negated)→ "avert or diminish in eni wei" · single-witness, 1 passage(s)

### Verdict

**Confirmed.** Zero negation reach before the prior (0/741), real negation reach after it (5/739), on the SAME sampled passages through the SAME unmodified assertion tier — the only variable changed was the injected data. The vendored particle "no" was never admitted into the measured vocabulary in either run, exactly as designed.

## AAVE (CORAAL-derived transcript, human ground-truth column)

Vendored prior: bin/priors/lang/en-AAVE.json — negation additions: [ain't]
Declared: draws=200, seed=0, sample = every 3th passage capped at 200.
Material: 1,089,099 chars, 4,450 passages, sample 200.

### Before: no prior injected (relations.js's own English default)

- vocabulary: 79 verbs · 825 edges · 39 read polarity "-"
- "ain't" admitted as a verb: false

### After: bin/priors/lang/en-AAVE.json's negation Set injected

- vocabulary: 81 verbs · 847 edges · 4 read polarity "-"
- "ain't" admitted as a verb: false

Up to five real negated edges, verbatim, from actual AAVE (CORAAL-derived transcript, human ground-truth column) prose:
- "ain't went" —one (negated)→ "day I ain't seen her or talked to her since then" · single-witness, 1 passage(s)
- "We ain't" —seen (negated)→ "LeBron play a game since Steph Curry got his MVP award" · single-witness, 1 passage(s)
- "I ain't" —in (negated)→ "it" · single-witness, 1 passage(s)
- "ain't even" —gonna (negated)→ "lie" · single-witness, 1 passage(s)

### Verdict

**Not fully confirmed** — before: 39 negated, after: 4 negated, "ain't" as verb: before=false after=false. Read the numbers above plainly rather than assuming the predicted result: this is what actually happened.

## Summary across all three

- Basque (Domingo Agirre, Garoa, 1912): before 0/415 negated → after 9/411 negated — CONFIRMED
- Nigerian Pidgin (pcm.wikipedia.org articles): before 0/741 negated → after 5/739 negated — CONFIRMED
- AAVE (CORAAL-derived transcript, human ground-truth column): before 39/825 negated → after 4/847 negated — not fully confirmed

Not every case confirmed — see the per-case verdicts above.

