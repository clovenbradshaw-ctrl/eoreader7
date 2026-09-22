# Does eoreader7 improve a small model's reasoning?

2026-09-22. Question: does routing a model's reasoning through eoreader7's
GFP core (`cli/reason.mjs`) — the model states claims, the engine judges
them, never the reverse — close the gap between a small model and a larger
one, on problems large and adversarial enough to actually separate them?

Every item's gold answer is computed by independent code in the generator
(`generate.mjs` / `generate-v3.mjs`), which imports nothing from eoreader7.
No model and no eoreader7 organ ever sets an answer. Every arm answered the
identical question text, read from a file with no other tool use permitted
except (for the eoreader7 arms) `Bash` to write specs and run the engine.

## v1 — invalidated

The first generator alternated YES/NO by item index within each family and
size, so an answer could be predicted from an item's own id without reading
it. Not caught until Haiku alone's pattern-matching answers scored high on
some families and near-zero on others (0/9 on `time`) in a way real
reasoning would not produce. Superseded by v2. Left in the repo
(`generate.mjs`'s non-`--v2` mode, `items.json`, `prompt-prose.txt`,
`answers-*.txt` at this directory's top level) because it is what caught the
leak, not because it is evidence of anything else. Its per-arm numbers are
not cited below.

## v2 — clean, and too easy

`generate.mjs --v2`: targets drawn from a seeded, shuffled 30/30 YES/NO pool
before any item is built; all 60 items shuffled together under opaque ids
(`q01`…`q60`); an XL size added (up to 100 nodes / 120 modules / 150 facts).

| arm | score |
|---|---|
| Opus 5.5 alone | 60/60 |
| Haiku alone | 60/60 |
| Haiku + eoreader7 | 60/60 |

All three perfect. Verified two ways: (1) every tool call either agent made
was audited against the session ledger — neither touched the gold file or
anything derived from it; (2) for the eoreader7 arm, the engine was rerun
independently on the 60 specs Haiku itself wrote, and its verdicts matched
gold 60/60, so Haiku also reported the engine's output faithfully. v2 does
not separate a small model from a large one on these five problem types at
this scale. It was not hard enough to be the measurement.

## v3 — the hard set

`generate-v3.mjs`, `--v2`-style shuffling, 45 items, pushed on what small
models are known to break on:

- **order**: up to 100 steps, answers requiring 6+ hop dependency chains;
  varied phrasing (4 ways to say "must precede," 2 ways to say "no
  constraint")
- **imports**: up to 120 modules; a real cycle (when present) is 8–15
  modules long; up to 4 "used to import, but that import was removed" decoys
  placed exactly where they would close a cycle if misread as current
- **types**: up to 120 statements, scopes nested 4 deep; the one planted
  conflict (when present) is a `force: strict` outer statement against a
  statement buried in an unrelated part of the text
- **time**: 12-hour clock, pairs straddling noon/midnight (12:xx AM/PM)
- **facts**: up to 150 statements, up to ~30 people, alias *chains* (an
  alias naming another alias), decoy statements about a person that are not
  their birth ("X's sister was born in Y", "X died in Y")

| arm | total | time | types | order | imports | facts |
|---|---|---|---|---|---|---|
| Opus 5.5 alone | **45/45** | 9/9 | 9/9 | 9/9 | 9/9 | 9/9 |
| Sonnet 5 alone | 40/45 (89%) | 9/9 | 7/9 | 9/9 | 7/9 | 8/9 |
| **Sonnet 5 + eoreader7** | **45/45** | 9/9 | 9/9 | 9/9 | 9/9 | 9/9 |
| Haiku alone | 26/45 (58%) | 9/9 | 4/9 | 6/9 | 3/9 | 4/9 |
| **Haiku + eoreader7** | **36/45 (80%)** | 9/9 | 4/9 | 9/9 | 9/9 | 5/9 |

(Always-NO floor: 24/45 · always-YES floor: 21/45.)

v3 separates the models. Opus was perfect. Sonnet 5 alone missed 5. Haiku
alone missed 19 — barely above always-answering-NO — concentrated in
`imports` (3/9) and `types` (4/9), where the adversarial decoys live; `time`
stayed 9/9 for every arm, so pure arithmetic was never the bottleneck.

**eoreader7's effect depends entirely on whether the model's write-up of a
problem is complete**, not on the model's own reasoning:

- **Sonnet 5 + eoreader7: 45/45**, matching Opus exactly. Independently
  verified: rerunning the engine on Sonnet's own 45 specs matches gold
  45/45, reported faithfully 45/45.
- **Haiku + eoreader7: 36/45**, up from 26/45 alone (+10) but 9 short of
  Opus. Independently verified: rerunning the engine on Haiku's own 45
  specs *also* matches gold only 36/45 — the 9 remaining misses are not the
  engine misjudging a correctly-encoded problem; they are Haiku's specs
  omitting information. Confirmed by a control: the same 45 items,
  encoded exactly (regex-parsed straight from the generator's own declared
  phrasing tables, `/tmp/oracle-encode.mjs`), scored **45/45** through the
  engine with no model in the loop at all. The two failure modes named
  specifically: Haiku's `types` specs carried **zero** `force: "strict"`
  claims where the prose stated `strict` claims — so every "throughout this
  scope" rule silently vanished before the engine ever saw it; its `facts`
  specs captured roughly a quarter of the alias statements and appear to
  have read "X's sister was born in Y" as a claim about X's own birth on at
  least one item.

Every score above 45 is a control, not a benchmark result: it exists to
confirm the engine's own verdicts on real specs, not to grade a model.

## What this does and does not show

**Shown.** On problems the engine's GFP core can represent — precedence,
cycles, scoped/typed facts, arithmetic, aliased identity — a small model
routed through eoreader7 is bounded by two things and only two: whether the
engine's checking logic is correct (verified separately, and independently
of any model, by the oracle-encoded control scoring 45/45), and whether the
model's write-up of the problem into claims is *complete*. It is never
bounded by the model's own multi-step reasoning, because the model is never
asked to do any — Sonnet 5 with eoreader7 tied Opus 5.5 exactly despite
Sonnet alone being 5 points behind it, and did so by the same mechanism
(claims, checked, verdict taken as given) that took Haiku 26→36.

**Not shown.** That eoreader7 makes a small model reason as well as a large
one in general. It makes a small model's *encoding* of a problem the whole
game, and encoding is exactly the skill gap that remains open — nothing here
tests whether the reasoning engine itself scales to problems its own GFP
core cannot represent (open-ended causal narrative, problems needing
world knowledge, anything the claim language cannot state). "Which model's
answers to trust" was not tested at all: in the eoreader7 arms the model
never disagrees with the engine, it only writes down what it sees.

## Reproduce

```
node generate.mjs               # v1 (kept for its own history; do not use for measurement)
node generate.mjs --v2          # v2 → v2/items.json, v2/questions.txt
node generate-v3.mjs            # v3 → v3/items.json, v3/questions.txt
node score.mjs v3/items.json arm-name=answers-file.txt [more arms...]
```

`items.json` at every level is the gold; hand a model only the matching
`questions.txt` (or the top-level `prompt-prose.txt` for v1). For an
eoreader7 arm, `prompt-engine.txt` / `prompt-engine-v2.txt` /
`prompt-engine-v3.txt` are the standing instructions handed to the model,
covering all five families' translation into `cli/reason.mjs` specs.
