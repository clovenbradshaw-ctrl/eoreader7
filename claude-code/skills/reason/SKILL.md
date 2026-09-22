---
name: reason
description: Check a turn's claims, orderings, numbers and "every X" statements with eoreader7's reasoning engine and report what it returns. Use when the eoreader7 Stop gate asks for a reasoning check, or before relying on a design, ordering, cause, count or universal claim.
---

eoreader7 does the reasoning and you report its verdicts.

`eo-reason --help` prints the spec format eoreader7 currently accepts: claims, inferences, universals, equations and orderings. Write the claims the turn relied on as a spec in a temporary file, then run:

```bash
eo-reason /tmp/claims.json --ants
```

Ground each claim where it is true: a file's absolute path, or a scope inside it such as `/repo/src/app.js/render`. Mark the claims that matter `"force": "strict"`, and `--ants` tests them against edge cases.

Add `"text"` only when real prose, such as a document being read, is in play. At the size of one turn the reader corroborates close to nothing, so treat a zero count there as silent.

A turn that made no claims is checked with `{"claims": []}`.

Report the verdicts plainly, including anything the engine refused to license. A passing run shows the claims are consistent with each other. Whether a cited file says what a claim says is settled by reading the file.
