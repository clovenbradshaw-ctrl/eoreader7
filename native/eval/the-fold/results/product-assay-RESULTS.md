# product-assay — the finish line, executable (2026-09-05)

*Transcription of `node eval/the-fold/product-assay.mjs` (0 model calls). The zero-call walls below are ENFORCED by `tests/product-assay.test.js` on every suite run (the-fold P97 / S67); this file is the dated record. The model arm at the end is one run, dated, read by no test — it says so.*

```
── THE PRODUCT ASSAY: one record per question, before any mouth speaks ──

reader recipe 5b2fee8b5053 · organs 12 · levers {"attestedVerbs":true,"determiners":"Set(10)","morphologyIndex":"object","negationWords":"Set(15)","nounPhraseSubjects":true,"oovLexicon":"Set(103318)","phrasalPredicates":true,"verbForms":"Set(103318)"} · omitted identity.noteIdentity
constitution FOLD-CONSTITUTION.md: f9a68959b8ca
constitution eo-constitution/CONSTITUTION.md: 586b3ce4f41b
  wall 0 configuration      held ✓  frame derived from the reader's own options; recipe minted; constitutions 2/2 resolved by content, the rest typed

1. READ ON ARRIVAL — 2 passage(s), 6 note(s) on the ledger before any question
     Owen Blythe —repaired→ the great refractor  · sources 2 · corroborated
     Amelia Hartley —founded→ the Northgate Observatory in 1887  · sources 1 · single-witness
     Marta Quill —preceded→ Owen Blythe  · sources 1 · single-witness
     Rowan Vale —preceded→ Marta Quill  · sources 1 · single-witness
     The Northgate Observatory —never opened→ in 1889  · sources 1 · single-witness
     The Northgate Observatory —opened→ in 1889  · sources 1 · single-witness

2. DERIVATION — giver declared for "preceded" (transitive); 1 derived, 0 without a giver
     Rowan Vale —preceded→ Owen Blythe  · depth 1 · premises 2 · restsOn {"sources":1,"instruments":1,"contested":0,"grounds":2}
  wall 3 derivation         held ✓  Rowan Vale —preceded→ Owen Blythe is derived, never stated, resting on 2 premises, weakest at 1 source(s); no giver → 0

4. TESTIMONY — "The Northgate Observatory opened in 1889" evaluated per source: northgate-a.txt:holds, northgate-b.txt:undetermined → SINGLE
  wall 4a contest-detected   BREACHED ✗  the per-source spine reads SINGLE; northgate-b says "never opened in 1889" in its own bytes
      mechanism: a negated statement never yields a `contradicted` verdict under the production configuration: `negationBeforeVerbFor` reads "did not X" as act `did` with the negation leading the object (P43), and DR5 (`phrasalPredicates`) folds "never X" into the act itself, so the draft's act `opened` never meets the source's `never opened` — the reader answers unbound/unheard, and mergeTestimony cannot see a refusal it was never handed
   CONTEST — landed 1 typed dispute(s) from northgate-b.txt's bytes at northgate-b.txt#34-81; refusals {"self_witness":0,"read_nothing":0,"no_bytes":0,"not_a_contest":0}; standing byte-identical across the act: true
  wall 4b contest-recorded   held ✓  1 CON·Figure·CONTESTED on the record, kind contest, decider = the denying source's own bytes; leak assay holds (no standing moved); derivation reports the contested premise, never withholds it

5. ANSWER RECORDS — 2 passage(s) → 6 claim(s) · 2 passage(s) → 6 claim(s) · 2 passage(s) → 6 claim(s)
   Q: Who founded the Northgate Observatory?
      claim @13cd7ad20 Rowan Vale —preceded→ Marta Quill  · spans 1 (1 self-verify)
      claim @2f739dc65 Owen Blythe —repaired→ the great refractor  · spans 2 (2 self-verify)
      claim @66d9c9815 The Northgate Observatory —never opened→ in 1889  · spans 1 (1 self-verify)
      claim @7926ed9a3 Marta Quill —preceded→ Owen Blythe  · spans 1 (1 self-verify)
      claim @a2cda5fe4 Amelia Hartley —founded→ the Northgate Observatory in 1887  · spans 1 (1 self-verify)
      claim @c787f831a The Northgate Observatory —opened→ in 1889  · spans 1 (1 self-verify)
      ledger  The Northgate Observatory —opened→ in 1889  · stated once so far, nowhere else yet · DISPUTED by northgate-b.txt
      ledger  Amelia Hartley —founded→ the Northgate Observatory in 1887  · stated once so far, nowhere else yet
      ledger  The Northgate Observatory —never opened→ in 1889  · stated once so far, nowhere else yet
      derived Rowan Vale —preceded→ Owen Blythe  · rests on 2 premise(s)
   Q: Did Rowan Vale precede Owen Blythe?
      claim @13cd7ad20 Rowan Vale —preceded→ Marta Quill  · spans 1 (1 self-verify)
      claim @2f739dc65 Owen Blythe —repaired→ the great refractor  · spans 2 (2 self-verify)
      claim @66d9c9815 The Northgate Observatory —never opened→ in 1889  · spans 1 (1 self-verify)
      claim @7926ed9a3 Marta Quill —preceded→ Owen Blythe  · spans 1 (1 self-verify)
      claim @a2cda5fe4 Amelia Hartley —founded→ the Northgate Observatory in 1887  · spans 1 (1 self-verify)
      claim @c787f831a The Northgate Observatory —opened→ in 1889  · spans 1 (1 self-verify)
      ledger  Owen Blythe —repaired→ the great refractor  · read in 2 places
      ledger  Marta Quill —preceded→ Owen Blythe  · stated once so far, nowhere else yet
      ledger  Rowan Vale —preceded→ Marta Quill  · stated once so far, nowhere else yet
      derived Rowan Vale —preceded→ Owen Blythe  · rests on 2 premise(s)
   Q: When did the Northgate Observatory open?
      claim @13cd7ad20 Rowan Vale —preceded→ Marta Quill  · spans 1 (1 self-verify)
      claim @2f739dc65 Owen Blythe —repaired→ the great refractor  · spans 2 (2 self-verify)
      claim @66d9c9815 The Northgate Observatory —never opened→ in 1889  · spans 1 (1 self-verify)
      claim @7926ed9a3 Marta Quill —preceded→ Owen Blythe  · spans 1 (1 self-verify)
      claim @a2cda5fe4 Amelia Hartley —founded→ the Northgate Observatory in 1887  · spans 1 (1 self-verify)
      claim @c787f831a The Northgate Observatory —opened→ in 1889  · spans 1 (1 self-verify)
      ledger  The Northgate Observatory —opened→ in 1889  · stated once so far, nowhere else yet · DISPUTED by northgate-b.txt
      ledger  The Northgate Observatory —never opened→ in 1889  · stated once so far, nowhere else yet
      ledger  Amelia Hartley —founded→ the Northgate Observatory in 1887  · stated once so far, nowhere else yet
      derived Rowan Vale —preceded→ Owen Blythe  · rests on 2 premise(s)
  wall 1 addressed          held ✓  21/21 claim spans resolve to the source's exact bytes (source coordinates)
  wall 2 stated-once        held ✓  "Amelia Hartley founded the Northgate Observatory in 1887" reaches the record at 1 source, phrased "stated once so far, nowhere else yet"; the repair note sits beside it at 2 sources
  wall 3b derived-in-record  held ✓  the implied question's record carries the derived fact with its premises
  wall 4c contest-in-record  held ✓  the disputed question's record carries the open contest and the disputed note says so
  wall 5 deterministic      held ✓  two builds byte-identical; the object-deranged corpus yields a different claim set — 6 real claim ids, 6 deranged, 0 shared

6. FABRICATIONS at the reader — 1/4 bound
     ✗ BOUND   "Amelia Hartley founded the Royal Society in 1887." → bound: Amelia Hartley|founded|the Royal Society in 1887
     · refused "Amelia Hartley founded a bakery." → unbound: Amelia Hartley|founded|a bakery
     · refused "Rowan Vale preceded Owen Blythe." → unbound: Rowan Vale|preceded|Owen Blythe
     · refused "Marta Quill catalogued nine comets." → unheard: Marta Quill|catalogued|nine comets
  wall 6 fabrication        BREACHED ✗  3/4 fabricated drafts refused
      mechanism: below `CORPUS_MINIMUM` the object match is `tokensShare` — one shared token binds (hypergraph.js's own disclosed fallback): "the Royal Society in 1887" binds to "the Northgate Observatory in 1887" on `in 1887`. A live turn's retrieved passages are always sub-floor, so a mouth that keeps the subject, the act and one object token is marked material-ground
  wall 7 derived-not-material held ✓  the derived-only statement is refused at the reader and present in the derivation — two grounds, never alike

7. RECOURSE — exposure of rowan vale|preceded|mart: 1 would fall; conceded: 1 withdrawn; ledger entries 10 → 12 (append-only: nothing removed)
  wall 8 recourse           held ✓  exposure named 1 product(s) before the act; conceding withdrew exactly those; the derived fact is gone from the fold and the record grew, never shrank

10/12 walls held; BREACHED: 4a contest-detected, 6 fabrication
```

## The model arm, one run (gemma2:2b, 13 calls, 2026-09-05) — read by no test

The driver handed each question to the real `holon.js::runHolonicTask` with the two sources as passages — the shape a live turn has TODAY, before Pass 19 hands it the record. What came back is the reason Pass 19 exists:

- *Who founded the Northgate Observatory?* → "…The Northgate Observatory was founded in 1887 by…" (correct), after a paragraph of narration about "different versions of the text" that no passage states.
- *Did Rowan Vale precede Owen Blythe?* → "Rowan Vale was the founder of the Northgate Observatory… He preceded Marta Quill, who was the founder of the observatory." Two fabrications on one line; the derived fact the record carries (Rowan → Owen, resting on two single-source premises) is not what the mouth said.
- *When did the Northgate Observatory open?* → "opened in 1889" with no mention that northgate-b denies it in its own bytes: the headless call carried no ledger, so the open contest never reached the prompt.

Raw: `results/product-assay-model-arm.json`. The claim diff across two models is Pass 19's measurement, not this run's.
