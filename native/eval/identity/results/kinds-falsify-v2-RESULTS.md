# kinds-falsify v2 — registered run, 2026-09-27

Driver `kinds-falsify-v2.mjs` (pre-registered in 2a96257, amended before this
run in 78b644e). Fixture: wikidata-mixed-graph.json, 195 referents; property
classes: wikidata-property-classes.json (413 properties, 253 classes, 0 failed).

**Verdict: killed.** Characteristic-set kinds licensed **zero** kinds from half
profiles: 143 distinct relation sets among 195 referents, 21 merges refused as
ambiguous, and no group's lift beat the search-aware null (largest null lift:
median 4.76, max 12.27). With one slicing left, K1 and K2 are degenerate (null)
and K3 fails: induced = global = 0.1215 nats. v1's inducer, rerun beside it,
also fails to beat global (0.1236).

**Kinds exist here; this method cannot find them from half-records.** Wikidata's
own class (P31) beats global by 0.025 nats (0.0969) and its standings transfer
better than a redeal of itself (K2 0.103 vs 0.167). Exact characteristic sets
assume near-complete records: half of a random split is almost never a subset
of another half, so subsumption has nothing to merge.

**The bookkeeping filter is refuted as specified.** "Reaches Q18608359 (property
to indicate a source)" excludes P50 author, P577 publication date, P407
language, P123 publisher: real facts about a work, typed as source properties
because references reuse them. Wikidata's typing says what a property CAN be
used for, not that it is bookkeeping. Q51118821 and Q28100549 behaved as
intended (P910 category link, P1889 different-from excluded).

Next, not run: a similarity merge (Pham et al. 2015's cost-based merge of
overlapping sets), pre-registered as v3, with the source-property root dropped.
