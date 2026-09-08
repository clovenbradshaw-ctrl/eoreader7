# Holograph compression — measured with no model (2026-09-07)

Transcribed from `node eval/the-fold/holograph-compression.mjs --run 2026-09-07T21-16-14-gemma2_2b-pg2554` over the persisted constitutional reading and the ledger that run left on disk (run outputs, gitignored; the driver refuses with `fixture_absent` where they are absent). The mechanism is pinned in the-fold's `resolutions.test.mjs` and `activation-retrieval.test.mjs`; these counts are one novel's (Crime and Punishment, pg2554.txt). Law: the-fold POLICIES P171, READING-SPEC S81, THE-HOLOGRAPH §6/§7.

```
holograph compression — run 2026-09-07T21-16-14-gemma2_2b-pg2554 · corpus 022805d79a1d4edf · recipe 9c70723fe2b4d37f · reading constitutional · notes 2640 · log entries 44591
  identity: {"beings":100,"fragments":113,"mergedByRecord":8,"mergedByContainment":5,"ambiguousForms":5} — beings after the reader's own merges (record) and coreference (containment, one host only); ambiguous forms kept apart
  beings 100 · addressed sentences 4025
  "So, what happened to Semyon Zaharovitch afte" active ["Semyon Semyonovitch"] · level 1: 24 sentences/3708 chars · level 3: Lens 1 notes/130 chars + 1 sentences/78 chars grounding 1/1
  "What happens with Sonia before or after the " active ["Sonia"] · level 1: 24 sentences/3814 chars · level 3: Lens 24 notes/1651 chars (ceiling of 98) + 12 sentences/1480 chars grounding 5/5
  "What happened to Katerina Ivanovna before So" active ["Katerina Ivanovna"] · level 1: 24 sentences/5798 chars · level 3: Lens 24 notes/1921 chars (ceiling of 65) + 6 sentences/1059 chars grounding 5/5
  "It sounds like Katerina Ivanovna is in a ver" active ["Katerina Ivanovna"] · level 1: 24 sentences/5798 chars · level 3: Lens 24 notes/1921 chars (ceiling of 65) + 6 sentences/1059 chars grounding 5/5
  "Did Yes.... As fit into their explanation of" active ["Katerina Ivanovna"] · level 1: 24 sentences/5798 chars · level 3: Lens 24 notes/1921 chars (ceiling of 65) + 6 sentences/1059 chars grounding 5/5
  "What does pg2554.txt say about Siberia?" active ["Siberia"] · level 1: 24 sentences/2819 chars · level 3: Lens 2 notes/186 chars + 2 sentences/224 chars grounding 2/2
  "It sounds like Dostoevsky was involved in so" active ["Dostoevsky"] · level 1: 24 sentences/3466 chars · level 3: Lens 2 notes/190 chars + 2 sentences/293 chars grounding 2/2
  "So, what happens to Raskolnikov before or af" active ["Rodion Romanovitch Raskolnikov"] · level 1: 24 sentences/4067 chars · level 3: Lens 24 notes/1743 chars (ceiling of 264) + 6 sentences/806 chars grounding 5/5
  "Why did Marmeladov die, and how does that im" active ["Sofya Semyonovna Marmeladov"] · level 1: 24 sentences/4196 chars · level 3: Lens 16 notes/1219 chars (ceiling of 20) + 6 sentences/1553 chars grounding 5/5
  "So, Katerina Ivanovna and Sonia are the ones" active ["Katerina Ivanovna","Sonia"] · level 1: 24 sentences/4357 chars · level 3: Lens 24 notes/1786 chars (ceiling of 161) + 6 sentences/1113 chars grounding 7/7
  "What does the book say about Pyotr Petrovitc" active ["Pyotr Petrovitch Luzhin"] · level 1: 24 sentences/5480 chars · level 3: Lens 24 notes/1827 chars (ceiling of 69) + 12 sentences/1431 chars grounding 5/5
  "Why did Lebeziatnikov help Raskolnikov finan" active ["Andrey Semyonovitch Lebeziatnikov","Rodion Romanovitch Raskolnikov"] · level 1: 24 sentences/4471 chars · level 3: Lens 24 notes/1807 chars (ceiling of 289) + 6 sentences/605 chars grounding 5/5
  "Earlier you told me \"pg2554.txt#1587-2781: \"" active ["Dostoevsky"] · level 1: 24 sentences/3466 chars · level 3: Lens 2 notes/190 chars + 2 sentences/293 chars grounding 2/2
  questions activating: 13 of 25 (the rest resolve to no referent — term retrieval stands in, disclosed)
  level 1 sentences (chars): {"med":4196,"max":5798,"mean":4403} · level 3 sentences: {"med":1059,"max":1553,"mean":850} · Lens: {"med":1743,"max":1921,"mean":1269} · Lens at ceiling 9 of 13
  handed at level 3 (Lens + sentences): {"med":2772,"max":3258,"mean":2119} vs level 1 sentences alone: {"med":4196,"max":5798,"mean":4403} · grounded share: {"med":100,"max":100,"mean":100}%
```
