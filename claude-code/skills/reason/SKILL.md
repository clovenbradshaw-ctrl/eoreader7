---
name: reason
description: Check a turn's claims, orderings, numbers and "every X" statements with eoreader7's reasoning engine and report what it returns. Use when the eoreader7 Stop gate asks for a reasoning check, or before relying on a design, ordering, cause, count or universal claim.
---

eoreader7 does the reasoning and you report its verdicts. Write the claims the turn relied on as JSON in a temporary file, then run:

```bash
eo-reason /tmp/claims.json --ants
```

`eo-reason` is on the Bash PATH while this plugin is enabled. The Stop gate's message also prints the full path to `reason.mjs`.

A claim has a ground (where it is true: a file path, or a scope inside it such as `/repo/src/app.js/render`), a relation, its roles, a polarity, and a force:

```json
{
  "claims": [
    {"ground": "/repo/src/app.js", "rel": "calls", "roles": {"ARG0": "render", "ARG1": "layout"}, "polarity": "+", "force": "strict"}
  ],
  "equations": [{"ref": "e1", "statement": "16:13:55 - 16:12:41 >= 600"}],
  "universals": [{"ref": "u1", "end1": "every handler", "label": "returns", "end2": "a promise", "tested": 12, "counterexamples": []}],
  "order": {"items": ["a", "b", "c"], "before": [["a", "b"]], "claims": [{"ref": "o1", "first": "a", "then": "c"}]}
}
```

Mark the claims that matter `"force": "strict"`. `--ants` then tests each strict claim against edge cases (empty, null, recursive, self-referring), at any size.

`"text"` is for real prose in play, such as a document or chapter being read together. At the scale of one turn the reader corroborates close to nothing, so treat its corroboration count there as silent, neither for nor against the claims.

A turn that made no claims is checked with `{"claims": []}`.

Report the verdicts plainly, including anything the engine refused to license, such as an ordering that was only a preference or a number that doesn't add up. A passing run shows the claims are consistent with each other. Whether a cited file or line says what the claim says is settled by reading that file.
