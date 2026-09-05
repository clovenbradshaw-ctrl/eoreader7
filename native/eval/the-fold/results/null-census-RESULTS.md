# A census of nulls through time — Pass 26 of the null experiments (2026-09-05)

Driver: `native/eval/the-fold/null-census.mjs` (0 model calls). Computation: `lib/null-census.mjs`. Enforcing test: `tests/null-census.test.js` reads every number below on each suite run (P94/P95); this document is a transcription.

**Configuration.** Production reader (12 organs declared, recipe `9c70723fe2b4`); the built corpus streamed one sentence per arrival (7 passages); six fixed drafts read against everything-so-far at every cursor; the giver declared for `preceded`; derivation run at every cursor; 12 seeded shuffles.

| draft | forward transitions | stated at | final |
|---|---|---|---|
| Amelia Hartley founded the Northgate Observatory in 1887. | bound@1 | 1 | bound |
| The Northgate Observatory opened in 1889. | unheard@1 → bound@3 | 3 | bound |
| Owen Blythe repaired the great refractor. | unheard@1 → bound@4 | 4 | bound |
| Amelia Hartley founded a bakery. | unbound@1 | never | unbound |
| Marta Quill catalogued nine comets. | unheard@1 | never | unheard |
| Rowan Vale preceded Owen Blythe. | unheard@1 → unbound@2 | never (derived@5) | unbound at the reader, derived on the record |

Cut@6 = contest@6 (the denial meets a link heard at 3). Final census: unread 0, cuts 1, contests 1, derived 1. Truncated at 2: unread 5; opened and repaired still `unheard`; 0 contests; 0 derived. 12 shuffles: final census identical in every order; closing cursors 5–6 distinct per stated draft; contest cursor 5 distinct; derived cursor 2 distinct.

**What this licenses.** A null's TYPE is a function of the cursor: `unheard` is what a later-stated sentence wears while its verb is unread, and it becomes `bound` at the arrival, never before. So a verdict reported without the unread extent beside it is a count wearing a verdict's clothes (P66's rule, seen from the reader's side). The derived-only sentence is the clearest specimen: `unbound` at the reader for the whole read and derived on the record from cursor 5 — two grounds, two clocks. **What it does not.** Seven built sentences; the cursors are the corpus's; no paraphrase; no live page run.
