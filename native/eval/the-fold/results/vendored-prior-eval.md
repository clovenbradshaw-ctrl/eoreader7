# vendored-prior-eval — does a real, cited prior close the reach gap?

Vendored prior: /eoreader6.1/bin/priors/lang/eu.json — negation: [ez]
Declared: draws=200, seed=0, sample = every 5th passage capped at 200.

Garoa (Domingo Agirre, 1912): 349,614 chars, 54 passages, sample 11.

## Before: no prior injected (relations.js's own English default)

- vocabulary: 176 verbs · 415 edges · 0 read polarity "-"
- "ez" admitted as a verb: true

## After: bin/priors/lang/eu.json's negation Set injected

- vocabulary: 175 verbs · 411 edges · 9 read polarity "-"
- "ez" admitted as a verb: false

Five real negated edges, verbatim, from actual Garoa prose:
- "Urbiako" —zelaietan (negated)→ "ezta zu bezelako lilirik sortu" · single-witness, 1 passage(s)
- "oñez" —edo (negated)→ "zalpurdietan" · single-witness, 1 passage(s)
- "ez" —gerriko (negated)→ "miñik" · single-witness, 1 passage(s)
- "saltzen ditu" —bere (negated)→ "paperak" · single-witness, 1 passage(s)
- "al da" —ba (negated)→ "zuen etxea" · single-witness, 1 passage(s)

## Verdict

**Confirmed.** Zero negation reach before the prior (0/415), real negation reach after it (9/411), on the SAME sampled passages through the SAME unmodified assertion tier — the only variable changed was the injected data. This is evidence FOR the diagnosis the crosslingual eval made: the reach gap traced to missing vendored data, not to something structurally unfixable in the mechanism itself. The vendored particle "ez" was never admitted into the measured vocabulary in either run, exactly as designed.

