# The void loop, end to end: a model reads, the material checks, HL judges

`node eval/void-loop-e2e.mjs [model]` — a re-runnable driver (P19/P27's
posture), not a committed regression test. `void-loop.test.mjs` and
`void-hl.test.mjs` are the conformance suites; this is what tells you
whether the loop survives real bytes.

Run 2026-08-27. Material fetched live from Wikipedia. **Reader: a real
local model on CPU** — `onnx-community/Qwen2.5-0.5B-Instruct` at q4 via
`@huggingface/transformers`, in-process, no server and no GPU (~27s to
load, ~6s per read). An Ollama server is used instead when one is already
up.

## Why the design changed mid-pass

The first version admitted candidates by rule. In one afternoon, on one
specimen family, it grew four:

| rule added | because | and then |
|---|---|---|
| relation as a list of surfaces | the answer is stated as "running mate", not "vice president" | Johnson was invisible at any radius |
| span from the relation's own sentence | Johnson's page states 1865–1869 — his **presidency** | bare occurrence handed the VP role the wrong dates |
| kind read from the short description | "Republican National Convention" contains the words | containment is not predication |
| sentence splitter that survives "Franklin D." | the boundary falls inside the initial | the anchor landed in the next fragment |

Each was correct for the case that prompted it and wrong for the next.
That is the shape of a rule set nobody can finish writing, so the design
was split three ways:

- **A model reads.** Turning a page into "who held what, under whom, over
  what span" is the half that cannot be enumerated.
- **The material checks the model.** A model's claim is never ground.
- **HL judges.** A verdict has to be sound and answerable for, which is
  what declared rules with named givers buy and a model's opinion cannot.

## The prompt is measured, not drafted

Four shapes, one change at a time, scored against four real specimens:

| prompt | correct | the error class it fixed |
|---|---|---|
| JSON schema with `<angle-bracket>` placeholders | **0/4** | — (echoed the placeholder, answered `false` on a text that plainly stated the relation) |
| worked examples with concrete values | **2/4** | the placeholder echo |
| + "under must be a DIFFERENT person" + a both-offices example | **3/4** | self-loops (`under: "Andrew Johnson"` for Andrew Johnson) and misses on people who held two offices |
| + INS asked as **individuation**, not kind | **4/4** | "Is a War Democrat a person?" is honestly *yes* — a faction is made of people. The slot does not admit a KIND of person, it admits **one named individual**. |

That last row is the one worth keeping. The engine's own individuation
vocabulary, asked as a question, did what a kind-matcher could not.

## Two checks on the model, both the same law

**P31's company law, aimed at a model instead of at prose.** The model's
span is accepted only where the source states it *in the same breath as
the relation*:

```
Hannibal Hamlin  span=1861-1865  KEPT     (stated with the relation)
Andrew Johnson   span=1865-1869  DROPPED  (his presidency, two clauses over)
Calvin Coolidge  span=1923-1929  DROPPED  (his presidency)
```

Dropping Johnson's span is what makes the good result reachable: he lands
**admitted but unplaced**, which is exactly what the material supports.

**The relation gets the same treatment.** The model claimed Herbert Hoover
was Roosevelt's vice president against a page that never states the
relation at all. `statesRelation` now requires both the model's claim and
the source carrying it.

## What HL bought: R2, on the case no rule could reach

Calvin Coolidge is a real vice president whose own page states the
relation, whose kind is a person, and who is **not Roosevelt's**. He
passes every surface test that can be written. Excluding him by rule
needed a surname match in the right sentence — which the sentence splitter
then hid inside "Franklin D.".

Under HL he is excluded by one declared rule with a named giver:

```
✗ Calvin Coolidge — contradicted — «vicePresidentOf» is declared functional
  and the stage already binds «Calvin Coolidge» to «Warren G. Harding» —
  not «Franklin D. Roosevelt»
```

The declaration is the whole mechanism, and `void-hl.test.mjs` pins it:
with the rule, `contradicted`; without it, on a byte-identical stage,
`unbound`. **An undeclared rule convicts nobody.**

## R2's precondition, found by testing and named

An earlier draft of `void-hl.js` claimed a reader's blind spot always
degrades to a gap. The real engine refuted it: with a functional
declaration, a reading that says «FDR» where the slot says «Franklin D.
Roosevelt» is not silence — R2 reads it as bound to a *different* object
and **refuses a true candidate**.

So: **a functional relation makes anchor identity load-bearing.** With the
default string fold, an alias convicts. The claim is corrected rather than
quietly dropped, pinned as a regression, and `stageFromReadings` now
reports `anchorIdentity` so a caller relying on the fold can see that it
is. The fix is to inject real referent identity — this repo already has it
in `cast.js::makeReferentIndex`.

## The question's own singular is a functional declaration

The deepest thing the engine taught this pass. "Who **was** Lincoln's vice
president?" is a definite description, and its singular phrasing asserts
`functional(hasVicePresident)`. Read in that direction, HL returns
`contested` — presupposition failure. The honest answer to the question is
not one filler; it is *the question presumed one and the material has two*.

Both directions are real and they say different things:
`vicePresidentOf(vp, president)` **is** functional and excludes Coolidge;
`hasVicePresident(president, vp)` is not, and asserting it is what the
question does.

## Result

```
ANSWER: vice president of Abraham Lincoln: Hannibal Hamlin (1861-1865); Andrew Johnson.
NOT COMMITTED — unplaced_filler: «Andrew Johnson» cleared admission and the material
never placed it — the extent reads covered only by not counting it, which is not the
same as being covered.
```

Both fillers named, exactly the right two, junk refused with reasons read
off each candidate's own source, nothing invented, and the space honestly
**not** claimed complete.

`closeLoop` from the posture that proposed is refused
(`stance_did_not_change`).

The FDR specimen ran **thirteen candidates across two rungs with zero
false admissions**, two of them excluded by R2 — Calvin Coolidge (bound to
Harding) and James M. Cox (bound to Harding) — and the rest refused by
name: not one named individual, the source never states it, or no page. It
reshaped its own space (`1933-1937` → `1933-1945`) off `extent_excludes`,
re-admitted the re-opened filler against the new ground, descended twice,
and refused to commit: "Henry Wallace" alone is a true sentence and a
wrong answer. Garner is still never offered — the crude candidate
generator names him only as "Garner", which a two-word capitalised scan
cannot see and cannot connect to "John Nance Garner". That is the
coreference gap `cast.js`'s referent index (P38) exists for, and the
generator deliberately does not use it.

## Two bugs the run found

**`Number(null)` is `0`, and `Number.isFinite(0)` is `true`** — so a null
year became year zero. Measured live as `span 0-0` and `span 1860-0`: a
span that would have been filled into the space and corrupted the coverage
arithmetic outright. It survived only because the company check happened
to drop it.

**Evaluated-and-inconclusive is not unevaluated.** Both landed on `wish`,
so a candidate HL had already read and returned `unbound` for was
indistinguishable from one never looked at — and since `descend` refuses
while a wish is untested, one junk candidate nothing could settle pinned
the ladder forever. Surfaced only by wiring HL, where `unbound` is the
correct and common answer for a source that says nothing.

## Limits, disclosed rather than engineered around

**The loop is exactly as good as the space it was given.** A year-grain
extent cannot see a hole inside one year, which is why Johnson has no
placement to be found rather than a wrong one. The defect is SEG's own
cell — "the extent to be covered, **and its units**".

**The reader is 0.5B and it shows, in exactly one place.** On the Lincoln
specimen "Northern Democrats" is read as one named individual and bound;
its page does state the relation, so both material checks pass — 7/8 on
that specimen, and 13/13 on FDR's. The architecture contains the error
rather than absorbing it (an unplaced filler, blocking the close, named in
the answer), but it is a wrong filler and it is a **reader** limit, not an
architectural one. Whether a larger reader closes it is measurable and was
not measured here.

**The structural fallback is kept, and is the argument for the model.** It
runs when no model is reachable. Every place it is wrong is a rule from
the table at the top of this file.
