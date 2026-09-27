# Identity as a trajectory, read for a for-whom — registered run, 2026-09-27

Driver `trajectory-eval.mjs`, predictions committed first (2b81c96). War and
Peace (Maude), 34,071 sentences, 30 stages of 1,136 sentences. Landmark (the
first "death of Count Bezukhov") at sentence 6,458, stage 5. Raw:
`trajectory-eval.json`.

| | prediction | result |
|---|---|---|
| T1 | Pierre: first stage not most like his last; chain holds on >= 80% of links | **failed** — first/last not most alike (rank 2 of 11), as predicted; but the chain held on 14 of 19 links (74%) |
| T2 | Natasha and Sonya overlap early, diverge late | **held** — mean rank-p 0.19 in the first third, 0.54 in the last |
| T3 | "Bezukhov" more like Pierre after the father's death | **failed, opposite way** — 0.47 before, 0.87 after (5 stages) |
| T4 | CONTROL: a spliced-in being breaks the chain (>= 80%) | **failed** — only 5 of 9 splice links broke |
| T5 | at the death, the chain breaks for SOCIETY and holds for INTIMATES | **failed** — it breaks for both |
| T6 | priors yield to the material | **held** — see below |
| T7 | gold prior swap | **gap**, as declared: no occurrence-level key |

## T6: the part that works

Under a surname prior "same" (log-odds +2.2), reading scene by scene:

| pair | final log-odds | material alone | prior's final share | verdict |
|---|---|---|---|---|
| Pierre / Bezukhov | -4.6 | -6.8 | 0.12 | different — the prior yielded |
| Prince Andrew / Andrew (control) | +13.7 | +11.5 | — | same |
| Sonya / Natasha (a wrong prior) | -45.3 | -47.5 | 0.03 | different — the prior yielded |

The likelihoods were measured on the Russian registered run and applied to
English unchanged. A declared prior moved, the material decided, and the prior's
share of the verdict fell as the reading went on — a prior, not a bias.

## T4 decides how to read T1, T3 and T5

The splice control was built to fail and did not: Natasha's stages spliced
into Pierre's broke only 5 of 9 links. So the continuity measure cannot tell
one being from another reliably at this grain, and T1, T3 and T5 do not
measure what they claim to. Their failures are uninterpretable, not evidence.

Why, in the same terms as the day's diagnosis: a stage's "extent" here is
the content words of every sentence that mentions the name — the SCENE, not
the being. Pierre and Natasha in one drawing room share its words. The unit
was wrong again, one level up: first the string stood in for the referent;
here the scene stands in for the being. A being's own extent is what IT does
and undergoes, with whom — its arrangements (role-cues' first end / label /
second end), its relationships, its experience — not what was near it.

T6 works because co-presence in a frame is a fact about the two expressions
themselves, not about their surroundings.
