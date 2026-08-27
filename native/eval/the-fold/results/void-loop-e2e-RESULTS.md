# The void loop, end to end on real material

`node eval/void-loop-e2e.mjs [model]` — a re-runnable driver (P19/P27's
posture), not a committed regression test. `void-loop.test.mjs` is the
conformance suite; this is what tells you whether the loop survives real
bytes.

Run 2026-08-27. Material fetched live from Wikipedia. No model was
reachable at `http://localhost:11434`, so the `encounter` rung was a
**typed skip recorded in the report** — never a canned stand-in.

## What the loop is asked to do

Zero the space across all nine operators, then run DEF/EVA/REC against it
down the stance ladder (`extraction` → `cultivation` → `encounter`),
committing only when the space is covered and only from a posture that
did not propose the fillers.

The candidate generator is **deliberately crude** — a capitalised-run scan
over real page text, the same junk-prone move `void-brief.js`'s header
refuses to make in production. That is the measurement: the loop's whole
claim is that *admission* does the work, so junk reaching testimony is a
failure of the design and junk refused with a reason is it working.

## Result 1 — junk is refused, at both rungs, in both specimens

Twenty-eight junk candidates were offered across the two specimens
(`When Douglas`, `Hampton Roads`, `Republican Party`, `Economic Warfare`,
`The White House`, `After Governor James`, …). **Zero reached testimony.**
Each carries its own reason, read off its own source:

```
✗ When Douglas        — no page for «When Douglas»
✗ Hampton Roads       — «Hampton Roads»'s own page never states «vice president»
? Northern Democrats  — states the relation but no span — nothing settles where it sits
```

The third is the one worth noting: a candidate that states the relation
and has no span is **not refused**. It stays a wish — superposed, honest,
neither admitted nor convicted. `grounding.js`'s `examined`/`clean` split,
one register over.

## Result 2 — a finding reshaped the space, and the space held it

FDR's void was declared narrowly on purpose (`1933-1937`, the first term).
Extraction found one real vice president and the extent excluded him
without ever reading him:

```
✗ Vice President Wallace [1941-1945] — its extent 1941-1945 lies wholly outside 1933-1937
fold: posture_spent · 1933-1937 is filled by nothing named so far

⟳ FINDING RESHAPES THE VOID — extent_excludes (revise cell: extent)
  1 candidate(s) — «Vice President Wallace» — were excluded by the extent alone,
  without ever being read, and 1933-1937 is still short: a space that refuses
  candidates and reports itself unfilled is evidence about the space, not about them
  → REC act-25 supersedes the opening act · extent 1933-1945 · re-opened: Vice President Wallace

RE-ADMIT against the new ground
  ✓ Vice President Wallace [1941-1945] — Henry Agard Wallace was the 33rd vice president…
```

**`extent_excludes` did not exist before this run.** The first cut of
`reshapeTriggers` only read *admitted* fillers that ran past the extent;
this run showed the stronger signal is the opposite one — a space refusing
every candidate that could fill it while reporting itself short. Found by
running it, added, and pinned with its control (an already-covered space
does *not* read an out-of-extent candidate as evidence against itself).

The disclosure is deliberately weaker than `extent_too_small`'s, and the
reason is an ordering cost named rather than hidden: `admit` refuses a
wholly-outside span as arithmetic *before* the admission organ is
consulted. That saves a fetch per obviously-excluded candidate and it
loses real information — a candidate excluded by a *wrong* extent never
gets the check that would show the extent was wrong. So the trigger claims
exactly what happened: **excluded without being read.**

## Result 3 — the loop refused to commit a plausible partial answer

After the reshape, `1941-1945` was covered and `1933-1941` was not.
Cultivation offered five names, none of which state the relation on their
own pages. Encounter was skipped. The loop's answer:

```
vice president of Franklin D. Roosevelt: Vice President Wallace (1941-1945).
… 1933-1941 is filled by nothing named so far — something holds that extent,
and this reading has not found it. Do not fill this gap from memory — say it is open.

NOT COMMITTED — void_open
```

"Henry Wallace" alone is a true sentence and a wrong answer. This is the
specimen the whole apparatus exists for, and the loop declined it.

## Result 4 — the stance-change law fired

On the Lincoln specimen, closing from the posture that proposed the
fillers was refused by name:

```
closing from «extraction» (the posture that proposed): refused — stance_did_not_change
committed from «closure» by coverage: Hannibal Hamlin (single filler, nothing composed)
```

`grid.js` refuses `synthesize` under two parts, and is right to — you do
not compose a whole out of one part — so a one-filler commit lands no
further act. Two or more land a real `CON` then `SYN`.

## Two honest limits, disclosed rather than engineered around

**The loop is exactly as good as the space it was given.** Lincoln
committed `Hannibal Hamlin (1861-1865)` alone and called it complete. That
is arithmetically correct against the declared space and it is not the
whole answer: Andrew Johnson held the office for six weeks *inside* 1865,
and a **year-grain extent cannot see a hole inside one year**. The defect
is in SEG's own cell — "the extent to be covered, **and its units**" — not
in the loop, and it is the same granularity disclosure `void-shape.js`'s
own `merge` already carries ("adjacency is a claim about the dimension's
own granularity… this file does not know the caller's granularity").

Worth stating plainly because it is the sharpest form of the whole
position: **an under-declared space produces a confidently complete wrong
answer, and no amount of loop machinery downstream can recover it.**

**The generator's failure is a coreference failure.** Garner was never
found, and the reason is precise: the FDR page names him as `Garner` in
the sentences near the relation, and a two-word capitalised-run scan
cannot see a single surname or connect it to `John Nance Garner`. That is
exactly the class of problem this repo's own referent index (`cast.js`,
P38) exists for, and the driver deliberately does not use it — the crude
generator is the control. The loop's response was correct: report the
space short, commit nothing.

Also a driver artifact, not a loop one: names like `Vice President Wallace`
carry the relation words into the filler. Wikipedia's redirects resolved it,
so admission worked; the name in the answer still reads wrong.

## Numbers

| | before | after |
|---|---|---|
| suite | 805 tests / 687 pass / 118 fail | 841 / 723 / 118 |

The 118 are pre-existing and environmental: `eoreader7`'s
`legacy-eoreader6.1` submodule is uninitialised in this checkout, so every
test importing that path fails to resolve — `grid.test.mjs` among them.
`void-loop.test.mjs` therefore imports eoreader7's **native** kernel
(`native/kernel/cube.js`, `native/kernel/task-log.js`), which is what
`void-shape.test.mjs` already does and what "Retire eoreader6.1" points
at. One consequence is real and named: the native kernel exports no
`checkCubeProgression`/`isCurrentOperator`, `grid.js` already guards for
exactly that (`foldGrid`'s `progression` → `[]`), and nothing this suite
asserts depends on the progression check.

Failure names were diffed against the baseline, not just counted: **zero
regressions.**
