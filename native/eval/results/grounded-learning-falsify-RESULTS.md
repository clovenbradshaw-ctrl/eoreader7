# Grounded learning: bounded falsification, 2026-10-03

**Finding:** existing experience can improve retrieval efficiency with models absent. This assay does not demonstrate acquisition of new reasoning capacity. Memory can also make performance worse; independent verification and scope monitoring are prerequisites for promotion.

Run `node native/eval/grounded-learning-falsify.mjs > /tmp/grounded-learning.json`. Checked result: `grounded-learning-falsify.json`. Uses merged restoration baseline `f3a2d872`. No production learning mechanism changed.

## Design and declared limits

These are deterministic synthetic mechanism probes using the actual `kernel/stigmergy.js`, `organs/territory.js`, `the-fold/forecast.js`, and native causal recursive reading assembly. Frontier calls: zero. Local model calls: zero. Model weight changes: zero. They are deliberately selected counterexamples, not a preregistered estimate of real-world frequency. Training and evaluation identifiers are disjoint; evaluation does not update memory except in the explicitly online shift arm. Ablations remove memory while retaining the same retrieval code and tasks. No elapsed-time or broad intelligence claim is made.

Routes search literal indexed documents. Training comprises 24 tasks where `archive` has the correct record. Evaluation comprises three separate sets of 40 tasks. A synthetic exact-answer oracle independently judges each returned document against the task's expected bytes. This oracle is part of the assay, not a newly implemented production truth verifier. The deliberately weak arm labels any lexical hit a success, matching the danger of conflating a resolved row with a correct answer. The measured false admissions concern that harness contract; they do not establish that the live hyperlexicon lacks other guards.

## Measured route effects

| Condition | Fresh attempts/task | Experienced attempts/task | Correct experienced answers |
|---|---:|---:|---:|
| Same source distribution, unseen records | 2 | 1 | 40/40 |
| Useful source moves to catalog | 1 | 2 | 40/40 |
| Misleading archive hit, hit-only acceptance | 1 | 1 | 0/40 |
| Misleading archive hit, independent verification | 1 | 2 | 40/40 |

Disabled learning and removal of the remembered head both restore the fresh cost (2 attempts). Memory serialized and reloaded in a separate Node process retains the stable gain; this proves the tested data survives serialization, not that production automatically persists it. During online verified adaptation after a source change, mean cost is 1.6 attempts; the initial 24 tasks each cost 2 attempts before the ordering changes. Retesting failure alone adds no negative strength in this organ: new verified successes eventually overtake old positive evidence.

A separate numerical contract probe finds that the declared seven-day half-life leaves **0.367879** strength, not 0.5. The implementation is an exponential e-folding time. The existing test explicitly expects e^-1. This is a terminology/parameter contract mismatch, recorded here without changing decay semantics during the assay.

## Measured forecasting effects

Each outcome is a real separate Python process executing a candidate function and an assertion. Forty training candidates pass 36 times. Held-out stable candidates pass 36/40; shifted candidates pass 4/40. All share `SYN|python|checked`, so the current key cannot distinguish the shift. Candidate bodies are fixed; learning changes predictions only.

| Held-out distribution | Fresh Brier loss | Experienced Brier loss |
|---|---:|---:|
| Stable (90% success) | 0.250000 | 0.090363 |
| Changed (10% success) | 0.250000 | 0.699887 |

Lower loss is better. Experience predicts 0.880952 in both conditions. This is useful calibration within the training scope and harmful overconfidence outside it. It does not improve the code's pass rate.

## Measured reading effect

Two complete synthetic six-sentence English works supply portable experience; a third complete work has different participant names. The POS prior is received in every arm. The experienced arm additionally receives `EOExperiencePrior@1`, retaining two relation forms. Assembly and adapters match `experienced-new-book.mjs`. Constitutional HOST stage parity and human semantic accuracy adjudication are not run. This is not a book-scale or multilingual test; no material is truncated.

Fresh, experienced, and disabled arms each produce **23 graph entries, including 7 relation edges**, with identical graph hashes. Portable memory remains `witnessed:false`, `admissible:false`. The seventh edge is the reader's observed output, not a gold-correctness count. The local hypothesis that this experience improves this target's graph output is unsupported: there is no measured difference. A broader benefit on other assemblies/materials remains untested.

## What these counterexamples require next

A promotable capability needs a target task whose verified success improves, not merely richer memory or better confidence. Keep evidence independent of the learned selection mechanism. Declare the context where the capability earned standing, test drift and negative controls, and suspend or narrow standing when those controls fail. Compare against a fresh system and remove the individual learned capability to establish that it caused the gain. Measure cost and accuracy together; the misleading-hit arm shows how a cheap answer can be entirely wrong.

The next capacity experiment should induce a bounded executable procedure, validate it on withheld task families and false-admission controls, reload it after restart, and show a success-rate improvement with fixed models and equal search budgets. This assay provides the baseline and failure conditions; it does not claim that cycle already exists.
