# asserted-eval — the assertion tier measured

Declared before running: draws=200, seed=0, sheet budget=24.

## 1. Synthetic adversarial suite (ground truth by construction)

### control-svo (control)
- HEARD: bezukhov —married→ helene · standing single-witness, 1 statement(s), salad 19/200
- also asserted: "Petersburg" —that→ "winter" · single-witness, salad 13/200

### passive (passive voice)
- MIS-HEARD: wanted bezukhov —married→ helene; heard instead "Helene was" —married→ "by Pierre Bezukhov" [salad 21/200]
- FABRICATED (forbidden edge heard): "Helene was" —married→ "by Pierre Bezukhov" [salad 21/200]

### relative-clause (relative clause)
- MIS-HEARD: wanted bezukhov —married→ helene; heard instead "who" —married→ "Helene" [salad 7/200]

### coordinated-verbs (coordinated verbs)
- HEARD: bezukhov —married→ helene · standing single-witness, 1 statement(s), salad 17/200
- MIS-HEARD: wanted bezukhov —trusted→ dolokhov; heard instead "and" —trusted→ "Dolokhov completely" [salad 0/200]

### fronted-adverbial (fronted adverbial)
- HEARD: bezukhov —married→ helene · standing single-witness, 1 statement(s), salad 13/200
- also asserted: "winter of" —that→ "year" · single-witness, salad 7/200

### negation (negation)
- HEARD: bezukhov —married (negated)→ helene · standing single-witness, 1 statement(s), salad 16/200

### planted-false (planted co-occurrence)
- HEARD: helene —spoke→ dolokhov · standing single-witness, 1 statement(s), salad 21/200

### paraphrase-same-verb (paraphrase (same verb))
- HEARD: bezukhov —married→ helene · standing corroborated, 2 statement(s), salad 60/200

### paraphrase-cross-verb (paraphrase (different verb))
- HEARD: bezukhov —married→ helene · standing single-witness, 1 statement(s), salad 42/200
- HEARD: bezukhov —wed→ helene · standing single-witness, 1 statement(s), salad 29/200

**Tally:** heard 8, mis-heard 3, missed 0, fabricated 1 (forbidden edges correctly refused: 3).

## 2. Order-arm separation (counts, never a cut)

- syntax-borne (heard-as-intended) edges: n=8, fired: [13, 16, 17, 19, 21, 29, 42, 60] of 200
- errant (mis-heard or fabricated) edges: n=4, fired: [0, 7, 21, 21] of 200

No threshold is drawn from these counts here: earning a cut needs more material than one synthetic suite, and tuning one against this suite's own construction would be calibrating on the answer key.

Disclosed confound, visible in the counts themselves: an edge's fired count scales with how many sentences carry its words (each is another shuffle that can luck into shape), so raw counts are not comparable across edges with different witness counts — a corroborated edge fires more, not because it is weaker but because it is stated more. Any earned cut would have to condition on that.

## 3. Real prose — Wikipedia War and Peace fixture, blind sheet emitted

Paragraphs admitted by the two-sentence gate: 156.
Edges: 827 (corroborated 20, single-witness 807) · vocabulary 231 verbs · armed at 200 draws in 108.4s.
Salad counts across all edges: median 4/200, max 130/200.

Blind sheet: 24 items (12 per stratum) → eval/results/asserted-blind-sheet.json
The key (standings, arm counts) is kept apart in asserted-blind-key.json so an annotator never sees a verdict.
A hand-precision pass over the sheet is REQUIRED before any precision-by-standing number is reported as a finding; an LLM-proxy pass must be labeled as exactly that (agency-civic's own discipline).

## 4. Blind precision pass — LLM-panel proxy, NOT a human ceiling

Three independent, context-isolated general-purpose agents, each given the identical sheet (context passage + statement, engine verdict stripped) and nothing else — no access to each other's answers, no access to the engine's own standing or order-arm counts. **This is an LLM-panel proxy, exactly agency-civic's own construction, and their agreement establishes only that the question is answerable from the passage alone — not that a real human annotator would agree with them.** A human pass is still required before any number below is reported as a certified finding.

**(1) Panel agreement.** Fleiss' kappa across 3 raters, 24 items x 3 categories: **kappa = 0.789** (mean pairwise agreement 91.7%). Above the kappa = 0.4 "moderate agreement" floor this analysis refuses below — proceeding.

Items with a clear majority (>=2 of 3 raters agree): 24/24.

**(2) Precision by standing.** Scorable items (majority YES or NO; UNCLEAR/no-majority excluded): 24/24.

| standing | n | human-YES | human-NO | precision |
|---|---|---|---|---|
| corroborated | 12 | 9 | 3 | 75.0% |
| single-witness | 12 | 9 | 3 | 75.0% |

**(3) Order-arm fired count vs the human verdict** (still no cut drawn — this is a distribution report, not a threshold; n is small enough that no significance test is run):

- human-YES (n=18): median 20.5/200, mean 25.7, sorted [0, 1, 4, 5, 8, 11, 11, 11, 20, 21, 23, 24, 29, 35, 40, 53, 56, 111]
- human-NO (n=6): median 6, mean 8.5, sorted [0, 1, 5, 7, 18, 20]

Read plainly: on this 24-item sample, corroborated and single-witness standing show IDENTICAL precision (both 75.0%, n=12 each) — the witness-count floor alone did not separate human-confirmed edges from human-rejected ones here, an honest negative result rather than a confirmation of the tier's own headline distinction. The order-arm's fired count shows a directional gap (median 20.5 vs 6, mean 25.7 vs 8.5, human-YES vs human-NO) that the synthetic suite's own 4-vs-8 sample did not surface clearly — but at n=24 total and 6 in the NO bucket, this is disclosed as a suggestive distribution, not a validated signal, and licenses no cut. Both findings are kept exactly as measured, not reconciled toward a cleaner story.

