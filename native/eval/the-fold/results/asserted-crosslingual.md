# asserted-crosslingual — does the assertion tier disclose its own reach limit?

Declared: draws=200, seed=0, order-arm sample = every 20th passage capped at 200. 3 texts read: pg2600.txt — War and Peace, English (Maude translation) · Война и мир — War and Peace, Russian original (Tolstoy) · こころ (Kokoro) — Natsume Sōseki, Japanese, 1914 [documented fallback: no clean fetchable public-domain Japanese War and Peace exists — the one legitimate translation is un-OCR'd scanned page images at Japan's National Diet Library].

Full-work counts below use the engine's OWN session pipeline (`sessionRelations`, packages/host/corpus.js) — the fast, full-document-scale organ, not a bulk re-application of hypergraph.js's turn-scoped machinery (that mistake, and the fix, are recorded in this file's own header). The assertion tier itself (standing, the word-salad order arm) still runs, on a declared bounded sample, because that is the scale it is built for.

## Full-work reads (engine-native, whole-document)

**pg2600.txt — War and Peace, English (Maude translation)** — 3,273,921 chars, 1,637 admitted chunks (admitChunked 4.1s).
- sessionRelations (engine-native, whole-document triples): 109.3s · 76,017 raw triples · 1,664 distinct verbs · 76,017 distinct (subject, verb, polarity, object) edges · gaps: 2
  - gap: pronoun_and_descriptor_mentions_unresolved — 884 discovered referents: name-variant coreference is engine-tier and complete; binding pronouns and definite descriptions to this referent is not derivable (eoreader5 measured distributional coref failing twice). Supply a per-text prior to close this gap.
  - gap: pronoun_mentions_partially_resolved — 2866 third-person singular pronoun mentions bound to a referent by activation recall; 11708 remain unresolved (below the declared activation or margin floor, gender-incompatible with every candidate named so far, or nothing named yet to recall). Descriptor synonymy is untouched by either count and remains not derivable (eoreader5 measured distributional coref failing twice). Supply a per-text prior to close what remains.
- assertion-tier sample (hypergraph.js, bounded — every 20th passage, 200 of 11,132, 98.2% excluded by this declared cap): 45.4s · 736 edges (29 corroborated / 707 single-witness)
- salad-fired distribution across sampled edges: median 8/200, max 187/200

**Война и мир — War and Peace, Russian original (Tolstoy)** — 2,992,157 chars, 1,497 admitted chunks (admitChunked 13.8s).
- sessionRelations (engine-native, whole-document triples): 54.9s · 10,710 raw triples · 129 distinct verbs · 10,710 distinct (subject, verb, polarity, object) edges · gaps: 2
  - gap: pronoun_and_descriptor_mentions_unresolved — 1164 discovered referents: name-variant coreference is engine-tier and complete; binding pronouns and definite descriptions to this referent is not derivable (eoreader5 measured distributional coref failing twice). Supply a per-text prior to close this gap.
  - gap: pronoun_mentions_partially_resolved — 0 third-person singular pronoun mentions bound to a referent by activation recall; 1 remain unresolved (below the declared activation or margin floor, gender-incompatible with every candidate named so far, or nothing named yet to recall). Descriptor synonymy is untouched by either count and remains not derivable (eoreader5 measured distributional coref failing twice). Supply a per-text prior to close what remains.
- script mix of the 10,710 raw triples: 9,074 native-script only (84.7%), 1,387 Latin-script only (13.0%, embedded-language dialogue — real Tolstoy, not corruption), 249 mixed/neither (2.3%)
- assertion-tier sample (hypergraph.js, bounded — every 20th passage, 200 of 10,749, 98.1% excluded by this declared cap): 72.8s · 236 edges (0 corroborated / 236 single-witness)
- salad-fired distribution across sampled edges: median 15/200, max 88/200

**こころ (Kokoro) — Natsume Sōseki, Japanese, 1914 [documented fallback: no clean fetchable public-domain Japanese War and Peace exists — the one legitimate translation is un-OCR'd scanned page images at Japan's National Diet Library]** — 163,968 chars, 82 admitted chunks (admitChunked 0.0s).
- sessionRelations (engine-native, whole-document triples): 0.2s · 0 raw triples · 0 distinct verbs · 0 distinct (subject, verb, polarity, object) edges · gaps: 1
  - gap: no_candidate_surfaces — 1333 sentences were read and no surface survived the capitalisation filter. extractSurfaces detects names by mid-sentence capitalisation, which is a property of Latin/Greek/Cyrillic script — on a caseless script (Han, Arabic, Hebrew) this detector does not apply, and its silence is not evidence that the text has no cast.
- assertion-tier sample (hypergraph.js, bounded — every 20th passage, 53 of 1,055, 95.0% excluded by this declared cap): 0.0s · 0 edges (0 corroborated / 0 single-witness)
- salad-fired distribution across sampled edges: median —/200, max —/200 (no edges in the sample to measure — itself a finding, stated plainly)

## Negation stress test — per language, where the probe applies

`extractRelations`'s polarity read (`NEGATION_BEFORE_VERB`) is built from `priors.js::NEGATION_WORDS`, explicitly tagged `giver: "lang/en"`. This probe checks, per language whose negation is a free-standing word this repo can name (declared in the run's own config, never guessed), whether a real negated clause the reader DOES extract an edge from ever reads polarity "-", using the FULL-WORK raw triples above (sessionRelations's own extraction, the same one the edge counts are built from) rather than a re-run. A language whose negation is a bound suffix (Japanese's verb-suffix negation) has no free-standing marker to search for, so the probe is honestly SKIPPED rather than run against the wrong shape.

**pg2600.txt — War and Peace, English (Maude translation):** 2,808 passages contain a negation marker ( not ,  never ,  didn't ,  don't ,  doesn't ,  won't ,  cannot ,  wouldn't ,  couldn't ,  shouldn't ); 73,827 triples' subject/object text also appears in one of those passages (an approximation — sessionRelations carries no per-triple offset — never a precise count), of which 1254 read polarity "-".
Five examples, verbatim:
- "Tolstoi


    Contents" —book (affirmative)→ "ONE"
- "CHAPTER XII" —book (affirmative)→ "ONE"
- "don’t" —tell (affirmative)→ "me"
- "that" —this (affirmative)→ "means war"
- "if you" —still (affirmative)→ "try"
→ 1254/73827 DID read "-" — worth reading by hand (the JSON record carries the examples) rather than assumed to be genuine negation-detection working, since the mechanism has no non-English trigger and coincidence (or a triple merely sitting near, not stating, the negation) is the likelier explanation.

Also: no bare negation marker (not, never, didn't, don't, doesn't, won't, cannot, wouldn't, couldn't, shouldn't) appears as a triple's verb — the language-agnostic functionWordSet appears to have caught it on pure recurrence, a save it was not designed for but may be working anyway.

**Война и мир — War and Peace, Russian original (Tolstoy):** 4,769 passages contain a negation marker (не , нет ); 8,743 native-script triples' subject/object text also appears in one of those passages (an approximation — sessionRelations carries no per-triple offset — never a precise count), of which 0 read polarity "-". (1,026 more candidates excluded as non-native-script — embedded dialogue, not this language's own prose.)
Five examples, verbatim:
- "Так" —говорила (affirmative)→ "в июле 1805 года известная Анна Павловна Шерер"
- "у нее" —был (affirmative)→ "грипп"
- "как" —она (affirmative)→ "говорила"
- "актер" —говорит (affirmative)→ "роль старой пиесы"
- "от которого" —она (affirmative)→ "не хочет"
→ **Zero triples anywhere near a negation marker read polarity "-"** — the reach gap this pass predicted, confirmed on real material.

Also: no bare negation marker (не, нет) appears as a triple's verb — the language-agnostic functionWordSet appears to have caught it on pure recurrence, a save it was not designed for but may be working anyway.

**こころ (Kokoro) — Natsume Sōseki, Japanese, 1914 [documented fallback: no clean fetchable public-domain Japanese War and Peace exists — the one legitimate translation is un-OCR'd scanned page images at Japan's National Diet Library]:** probe skipped — Japanese negation is a bound verb suffix (~ない / ~ません), not a free-standing word — no marker list applies to this language's own grammar, so the free-standing-word probe is honestly skipped rather than run against the wrong shape.

