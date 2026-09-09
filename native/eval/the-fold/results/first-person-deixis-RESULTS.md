# First-person deixis, driven live — the reported specimen closed

the-fold POLICIES.md **P180** / this repo's **READING-SPEC S96** carry the
full account; this is the reproducible measurement.

**Configuration.** `MODEL=gemma2:2b`, `SEED=1` (Ollama's `options.seed`,
declared before the first run — the first seed tried that reproduced the
reported shape deterministically; a different seed answering "As an AI, I
don't have personal preferences" would still be an honest, less
illustrative run, since the fix is unconditional on the claim's own grammar,
not on which sentence the model happens to produce). Reader: the REAL
production `makeRelationReader` (`native/organs/hypergraph.js`) against the
native provider (`native/adapters/text/*` — the configuration app.js has run
exclusively since P69), `nounPhraseSubjects: true` (DR4 — the same flag
production sets, and the one that keeps "My" attached to its noun phrase at
all; without it the extractor's leading-word strip drops the possessive
before the wall could ever see it).

**Material.** A fixture modeled on the reported page's own shape (an
anonymous ESL "N sentences about my favorite color" example page:
first-person throughout, plus one attributed example sentence — "Maria is
happy…" — which real such pages routinely carry and which is also what
lets a copula ("is") enter this fixture's vocabulary at all, since
`discoverRelationVocab` anchors candidate verbs on a capitalized surface
and "My favorite color is blue" alone has none). The exact bytes of the two
pages the live incident cited (t4tutorials.com, englishwnabi.com) are not
committed here and were not reachable at the addresses this session had —
disclosed, not silently substituted: the mechanism this closes does not
depend on which ESL page supplied the words, only on the shared vocabulary
shape (first-person "my X is Y" recurring enough to become a FORM).

**The live run** (`node first-person-deixis-eval.mjs`):

```
model: gemma2:2b  seed: 1  prompt: "In one short sentence, what is your favorite color and why?"
answer: "My favorite color is blue, because it's calming and reminds me of vast skies."
```

**Without the fix** (`organs.firstPerson` omitted — every caller before
this pass): the extracted claim `My favorite color —is[+]→ blue` reads
`bound`, cited to `web:esl-example.com-0#0-500` — the model's own real,
live, first-person answer bound against an unrelated anonymous document's
identically-phrased sentence, exactly reproducing the reported failure.

**With the fix** (`organs.firstPerson: FIRST_PERSON`, priors.js's own
closed class, giver `lang/en`): the identical claim reads `beyond-reach`:

> "My favorite color" is a first-person claim — "I"/"my" names whoever is
> speaking, not a stable entity — and nothing here shows this answer and
> the material share a speaker; comparing them would treat two different
> people's "I" as one claim — a limit of this check, not a mark against the
> answer.

**Mechanism, confirmed live rather than only in the synthetic unit tests**
(`native/organs/hypergraph.test.mjs`): the false binding rode
`endpoint()`'s own `useForms` path — "favorite"/"color" both recur at least
`FORM_MIN_ARRIVALS` times in the ESL-style material, so the claim's subject
resolved to the identical recurring-FORM identity the page's own subject
resolved to (`claim.endpoints: {subject: "form", object: "tokens"}`,
`formBased: true`), despite the two texts naming two entirely different
speakers' favorite colors. The fix is checked on the RAW subject string
before any endpoint resolution runs at all, so it closes the hole
regardless of which resolution path (referent, form, or bare content-word
overlap) would otherwise have granted the false identity.

**Reproduce:** `MODEL=gemma2:2b SEED=1 node first-person-deixis-eval.mjs`
from this directory. `relationFindings` on the "without" reader reports
zero findings either way (a `bound` verdict is never itself a finding
against the answer — the badge is what was wrong, not the tally), so the
regression this closes is the ground-ladder disclosure a reader sees on the
answer, not a number the correction loop already reads.
