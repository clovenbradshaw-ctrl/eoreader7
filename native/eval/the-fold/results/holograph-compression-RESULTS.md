# Holograph compression — measured with no model (2026-09-07, corrected 2026-09-08)

Transcribed from `node eval/the-fold/holograph-compression.mjs --run 2026-09-07T21-16-14-gemma2_2b-pg2554` over the persisted constitutional reading and the ledger that run left on disk (run outputs, gitignored; the driver refuses with `fixture_absent` where they are absent). The mechanism is pinned in the-fold's `resolutions.test.mjs` and `activation-retrieval.test.mjs`; these counts are one novel's (Crime and Punishment, pg2554.txt). Law: the-fold POLICIES P171, READING-SPEC S81, THE-HOLOGRAPH §6/§7.

**Corrected 2026-09-08 (a compliance review found it, 2026-09-07 late).** The driver called `activate`/`lensBlock`/`activeReferents` with `transcript: []` on every question, so a question naming no referent of its own (a follow-up like "Could you clarify what 'Focus' refers to") bound to nothing instead of the last answer's referents — a condition the live turn never runs under. Fixed: the driver now threads the run's own transcript row by row, exactly as `conversation.mjs` builds `state.transcript` for the real turn. The level 1 (full reach) cut's own ceiling was also never disclosed; it now is.

**What moved.** Questions activating: 13 of 25 → **20 of 25**. Lens at its ceiling: 9 of 13 → **13 of 20**. Level 1 is at its 24-sentence ceiling on **every** activating question, now visible for the first time (it always was; the driver did not say so before this fix). The five newly-activating questions are exactly the ones whose own words name no referent and depend on the prior turn's — "Could you clarify…", "Which passage says that? Quote it for me." (×2), "So, you're referencing…", "Could you explain who Fourier and Proudhon…". The old, uncorrected numbers are kept below for provenance, not as a second claim.

```
holograph compression — run 2026-09-07T21-16-14-gemma2_2b-pg2554 · corpus 022805d79a1d4edf · recipe 9c70723fe2b4d37f · reading constitutional · notes 2640 · log entries 44591
  identity: {"beings":100,"fragments":113,"mergedByRecord":8,"mergedByContainment":5,"reassignments":0,"ambiguousForms":5} — beings after the reader's own merges (record) and coreference (containment, one host only); ambiguous forms kept apart
  beings 100 · addressed sentences 4025
  "So, what happened to Semyon Zaharovitch afte" active ["Semyon Semyonovitch"] · level 1: 24 sentences/3708 chars (ceiling) · level 3: Lens 1 notes/130 chars + 1 sentences/78 chars grounding 1/1
  "Could you clarify what \"Focus\" refers to in " active ["Afanasy","Katerina Ivanovna","Rodion Romanovitch Raskolnikov","Semyon Semyonovitch","Sonia"] · level 1: 24 sentences/4777 chars (ceiling) · level 3: Lens 24 notes/1873 chars (ceiling of 423) + 6 sentences/601 chars grounding 10/10
  "What happens with Sonia before or after the " active ["Sonia"] · level 1: 24 sentences/3814 chars (ceiling) · level 3: Lens 24 notes/1651 chars (ceiling of 98) + 6 sentences/689 chars grounding 5/5
  "What happened to Katerina Ivanovna before So" active ["Katerina Ivanovna"] · level 1: 24 sentences/5798 chars (ceiling) · level 3: Lens 24 notes/1921 chars (ceiling of 65) + 6 sentences/1059 chars grounding 5/5
  "It sounds like Katerina Ivanovna is in a ver" active ["Katerina Ivanovna"] · level 1: 24 sentences/5798 chars (ceiling) · level 3: Lens 24 notes/1921 chars (ceiling of 65) + 6 sentences/490 chars grounding 5/5
  "Did Yes.... As fit into their explanation of" active ["Katerina Ivanovna"] · level 1: 24 sentences/5798 chars (ceiling) · level 3: Lens 24 notes/1921 chars (ceiling of 65) + 6 sentences/1265 chars grounding 5/5
  "What does pg2554.txt say about Siberia?" active ["Siberia"] · level 1: 24 sentences/2819 chars (ceiling) · level 3: Lens 2 notes/186 chars + 2 sentences/224 chars grounding 2/2
  "Which passage says that? Quote it for me." active ["Arkady Ivanovitch Svidrigailov","Mr Razumihin","Rodion Romanovitch Raskolnikov","Siberia","Sonia"] · level 1: 24 sentences/4287 chars (ceiling) · level 3: Lens 24 notes/2048 chars (ceiling of 501) + 8 sentences/835 chars grounding 10/10
  "It sounds like Dostoevsky was involved in so" active ["Dostoevsky"] · level 1: 24 sentences/3466 chars (ceiling) · level 3: Lens 2 notes/190 chars + 2 sentences/293 chars grounding 2/2
  "So, what happens to Raskolnikov before or af" active ["Rodion Romanovitch Raskolnikov"] · level 1: 24 sentences/4067 chars (ceiling) · level 3: Lens 24 notes/1743 chars (ceiling of 264) + 6 sentences/806 chars grounding 5/5
  "Why did Marmeladov die, and how does that im" active ["Sofya Semyonovna Marmeladov"] · level 1: 24 sentences/4196 chars (ceiling) · level 3: Lens 16 notes/1219 chars (ceiling of 20) + 6 sentences/1553 chars grounding 5/5
  "So, Katerina Ivanovna and Sonia are the ones" active ["Katerina Ivanovna","Sonia"] · level 1: 24 sentences/4357 chars (ceiling) · level 3: Lens 24 notes/1786 chars (ceiling of 161) + 6 sentences/1113 chars grounding 7/7
  "What does the book say about Pyotr Petrovitc" active ["Pyotr Petrovitch Luzhin"] · level 1: 24 sentences/5480 chars (ceiling) · level 3: Lens 24 notes/1827 chars (ceiling of 69) + 12 sentences/1505 chars grounding 5/5
  "Why did Lebeziatnikov help Raskolnikov finan" active ["Andrey Semyonovitch Lebeziatnikov","Rodion Romanovitch Raskolnikov"] · level 1: 24 sentences/4471 chars (ceiling) · level 3: Lens 24 notes/1807 chars (ceiling of 289) + 6 sentences/409 chars grounding 5/5
  "Which passage says that? Quote it for me." active ["Andrey Semyonovitch Lebeziatnikov","Rodion Romanovitch Raskolnikov"] · level 1: 24 sentences/4471 chars (ceiling) · level 3: Lens 24 notes/1807 chars (ceiling of 289) + 6 sentences/605 chars grounding 5/5
  "So, you're referencing a specific group of p" active ["Dostoevsky"] · level 1: 24 sentences/3466 chars (ceiling) · level 3: Lens 2 notes/190 chars + 2 sentences/293 chars grounding 2/2
  "Could you explain who Fourier and Proudhon a" active ["Dostoevsky"] · level 1: 24 sentences/3466 chars (ceiling) · level 3: Lens 2 notes/190 chars + 2 sentences/293 chars grounding 2/2
  "So, you mentioned Charles Fourier. Who is he" active ["French"] · level 1: 24 sentences/2203 chars (ceiling) · level 3: Lens 2 notes/140 chars + 2 sentences/164 chars grounding 2/2
  "It sounds like the author is struggling to e" active ["French","Pyotr Petrovitch Luzhin"] · level 1: 24 sentences/5480 chars (ceiling) · level 3: Lens 24 notes/1827 chars (ceiling of 71) + 12 sentences/1431 chars grounding 5/5
  "Earlier you told me \"pg2554.txt#1587-2781: \"" active ["Dostoevsky"] · level 1: 24 sentences/3466 chars (ceiling) · level 3: Lens 2 notes/190 chars + 2 sentences/293 chars grounding 2/2
  questions activating: 20 of 25 (the rest resolve to no referent — term retrieval stands in, disclosed) — against the run's OWN transcript, not an empty one
  level 1 sentences (chars): {"med":4287,"max":5798,"mean":4269}, at their ceiling 20 of 20 · level 3 sentences: {"med":605,"max":1553,"mean":700} · Lens: {"med":1786,"max":2048,"mean":1228} · Lens at ceiling 13 of 20
  handed at level 3 (Lens + sentences): {"med":2412,"max":3332,"mean":1928} vs level 1 sentences alone: {"med":4287,"max":5798,"mean":4269} · grounded share: {"med":100,"max":100,"mean":100}%
```

**Superseded (2026-09-07, the empty-transcript condition — kept for provenance):**

```
  questions activating: 13 of 25 (the rest resolve to no referent — term retrieval stands in, disclosed)
  level 1 sentences (chars): {"med":4196,"max":5798,"mean":4403} · level 3 sentences: {"med":1059,"max":1553,"mean":850} · Lens: {"med":1743,"max":1921,"mean":1269} · Lens at ceiling 9 of 13
  handed at level 3 (Lens + sentences): {"med":2772,"max":3258,"mean":2119} vs level 1 sentences alone: {"med":4196,"max":5798,"mean":4403} · grounded share: {"med":100,"max":100,"mean":100}%
```

**What still stands, disclosed rather than fixed here.** The reading this run stood on predates the reassignment/merge separation (`EOReferentReassignment@1`, this session's later fix); `reassignments: 0` above is a fact about this OLD log's own schema, not a claim that the reading has none. The compression at level 3 is real (handed median 2,412 chars against level 1's 4,287) but level 1 is now shown to be at its declared ceiling on every single activating question — the "full reach" the ladder compares against is itself never actually the full reach on this material, only the ceiling's approximation of it.
