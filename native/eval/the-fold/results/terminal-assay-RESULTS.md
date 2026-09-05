# The terminal assay — first run, 2026-09-05 (the-fold P103)

*Compiled from the live session of 2026-09-05 in the real page (serve.mjs on :8815, gemma2:2b on CPU, Ollama local), the product assay (`lib/product-assay.mjs`, 0 calls) and the model-swap diff (`model-swap-diff.mjs`, 38 calls). Every line names where its evidence is. This is a dated record of one run; the zero-call walls are enforced by `tests/product-assay.test.js`, nothing else here is read by a test.*

## The walk

1. Attach material — `pasted.txt` (the founding, the chain's first link, the opening, the repair), `northgate-b.txt` (the chain's second link, the denial, the repair), and a 143 KB slice of War and Peace as noise. Every source was read on arrival (P99): 1 passage / 59 ms; 1 passage / 59 ms; 44 passages / 29.6 s, 681 notes.
2. Ask the stated question — *Who founded the Northgate Observatory?* → “Amelia Hartley founded the Northgate Observatory.” with the address chip `pasted.txt#0-174`, one material-ground sentence (P100).
3. Ask the implied question — after `/declare preceded transitive` and `/derive` (P102): the prompt carried *"derived — … Rowan Vale — preceded→ Owen Blythe (follows from 2 earlier claims, never stated itself; the weakest of them stated once so far)"* and the answer was “Yes, Rowan Vale preceded Owen Blythe.”
4. Ask the disputed question — *When did the Northgate Observatory open?* → with attachments off after a reload, the prompt carried *"stated once so far, nowhere else yet — The Northgate Observatory — opened→ in 1889"* and the answer was “Based on the information we have, 1889.” (P98). The denial in `northgate-b.txt` did not reach the answer as a contest (below).
5. Reload — `record restored: hyperlexicon 1395, grid 30, declarations 2`; every source's cursor honored, no re-read; the derived fact still live; the declaration still listed.
6. Concede — `/concede rowan vale|preceded|marta quill` previewed one fall; `/concede!` withdrew it; `/derive` read 0 live; after a second reload, still 0 (P102).
7. Second model — `model-swap-diff.mjs`, gemma2:2b against llama3.2:latest, the real turn over the same corpus (P100).

## The conditions

| condition | state | evidence |
|---|---|---|
| every source-grounded claim resolves to exact bytes | HELD | assay wall 1: 21/21 spans self-verify; live: the chip `pasted.txt#0-174` reopens to the sentence |
| the single-witness claim is available and disclosed, not withheld | HELD | live step 4: "stated once so far, nowhere else yet" in the prompt, answered from it |
| the implied answer carries its premise path and weakest premise | HELD | live step 3; assay wall 3 (`restsOn.sources` 1, 2 premises) |
| concession visibly and transitively withdraws it | HELD | live step 6; assay wall 8 (exposure = withdrawn = 1, entries 10 → 12) |
| the disagreement remains an open typed contest unless settled | **NOT HELD** | assay wall 4a: the spine reads the denial as `unbound`, never `contradicted` (P43); `/corroborate 8` skipped the denying pair at the co-presence gate. The record side holds (walls 4b, 4c; P101's wire is live) — no live contest has been produced |
| every omission and unread extent is typed | HELD | "Still reading: pasted-2.txt — 2 of 44 passages so far" reached the prompt mid-read (P99); unread refs on every AnswerRecord |
| the reader configuration, source identities, recipe and constitution identities are recorded | HELD | the frame derived from the reader's options (P96), the recipe on every witness, source sha256 in the index, the constitution's sha256 on every AnswerRecord (P100), constitutions by content in the assay (wall 0) |
| the projected record is byte-identical across reloads | HELD | `record-log.test.mjs` (fold and identity), live reloads (P98); one duplicated stretch from a sync race was found by replay's own typed gap and is skipped as counted duplicates (P99) |
| the AnswerRecord's claims are identical across models | **NOT HELD as written; restated** | record-backed sets identical 0/3; the RECORD is model-independent by construction, and each mouth's additions are marked and counted (P100) |
| only wording changes across models | **NOT HELD** | both small mouths added sentences nothing backs (3 and 2–3 per question); marked model-ground, counted on the record |
| the planted-fabrication control lands zero false claims | HELD at the reader | assay wall 6: 4/4 fabricated drafts refused with `objectSpecificity` (S68) |

**Held: 8 of 11. Not held: 3, each with a named mechanism and no tuning offered.** The two that turn on the reader (a denial read as `contradicted`; a derived sentence's own ground mark) are the next levers. The one that turns on the mouth (identical claim sets across models) is restated rather than chased: the record is the invariant; the mouth's additions are the measured, marked residue.

## Also on this run

- The whole-book arrival read (`pg2600.txt`, 3.3 MB, 1,051 passages at the app's grain) was still building its reader after 28 minutes at 100% CPU: the pool build is superlinear (600 KB → 96 s build, 245 s total; P100). A bounded pool is the named next step for the arrival reader.
- Retrieval by term hits let a 3 KB War and Peace passage outrank the 174-byte source that held an answer (P100); the record counted it (0 bound, 3 unbacked) and the marks said so.
