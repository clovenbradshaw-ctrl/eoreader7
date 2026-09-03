# Longform code: can an artifact outgrow what any single message can emit?

Driver: `eval/the-fold/longform-code.mjs` (offline, no model, `STEPS` declared).
Organs: `the-fold/build-log.js` (`deriveOp`, `readOps`, `applyOps`, `patchBuild`,
`foldBuild`), bound to `eoreader7/native/kernel/task-log.js`.

## The question

Two ways a system can produce something longer than a single reply:

1. **Without a model at all** — the mechanical doors (`arithmetic.js`,
   `tables.js`), skills executed as code (`skills.js`, zero model calls), and
   the build log's own projection.
2. **With a model answering across several messages** — `holon.js` runs a task
   as parts; and for CODE specifically, `/fold <n>` asks for ONE flat
   `{find, add}` edit per turn, lands it as a SUPERSEDE carrying only the
   delta, and compiles the whole from the patch stack.

This measures (2) on code, because that is where the claim is strongest and
also where it could most easily be false.

## What is actually being claimed

**An artifact's size is not bounded by what the model can say in one breath.**
If each turn emits only a delta, the whole can grow without the model ever
re-stating it.

## The control, built to fail (II.23)

A `regenerate` arm where the model re-emits the WHOLE artifact each turn —
what an ordinary chat loop does. Both arms must land the **identical** final
code, or the comparison is between two different things. If the delta arm
does not emit dramatically less for the same artifact, the patch carriage
buys nothing and this document should say so.

## Result

```
turns   final artifact   largest single emission     total emitted        ratio
                            delta / regenerate     delta / regenerate  (regen÷delta)
    8            2,361        353 /      2,646     6,478 /     11,548        1.78x
   24            6,823        881 /      7,031    20,564 /     89,604        4.36x
   48           13,519        884 /     13,873    41,708 /    344,448        8.26x
   96           26,911        886 /     27,553    83,996 /  1,350,072       16.07x
  200           56,129        887 /     57,745   176,222 /  5,807,674       32.96x
```

**The ratio doubles as the turn count doubles.** That is the linear-vs-
quadratic signature, not a fixed saving: delta emission is FLAT (~880 bytes a
turn, whatever the artifact's size), regenerate emission is LINEAR in the
artifact, so its total is quadratic. The number is not "33× cheaper"; it is
"the gap grows without bound."

**The headline for longform, though, is the middle column.** At 200 turns the
artifact is **56,129 characters and the largest thing the model ever emitted
was 887**. The regenerate arm's largest emission IS the artifact. A model that
could not emit 56KB in one reply still produced a 56KB artifact.

## Correctness — a cheaper curve proves nothing if it built something else

- Both arms land the **identical** final artifact at every N.
- Every function present: 200 of 200.
- **`foldBuild` compiles the right whole at every cursor: 200 of 200** — the
  patch stack is not just cheaper to transmit, it reconstructs the artifact as
  of any point in its history.

## L5 holds: the act is read off the bytes, never off the model's label

`build-log.js`'s own header records the measurement this exists for — asked
for an edit with an `op` field, small models routinely answer `op: "INS"`
while supplying an `add` that plainly REPLACES `find`, and taking that at its
word yields a broken artifact that passed every wall because the walls
checked bytes and trusted the label.

Re-checked here: a patch labelled `INS` whose bytes replace the anchor is
derived as **SYN · compile**. The label is discarded.

## Two driver bugs, kept because one of them is the point

The first run reported **"both arms landed the identical final artifact: yes"
while both arms had produced nothing** — `proposeBuild` takes a `seg` object
and creates its own log, so neither arm ever seeded. Two empty strings are
trivially identical, and the check passed while proving nothing.

That is the same shape as this project's own repeated finding — a control
handed the wrong material is not a control — so the driver now carries a
`built something` guard that fails outright before any comparison is reported.
The second bug was caught BY that guard: `reviseBuild` returns the log itself,
not `{log, landed}` like `patchBuild`, so the control arm sat frozen at its
seed while the delta arm worked perfectly. A green-looking delta arm beside a
silently dead control is exactly the reading that would have been believed.

## What this does NOT establish

**No model ran** — there is no Ollama in this environment, and this is stated
rather than worked around. This measures the CARRIAGE: that a delta stack
compiles the same whole, at any cursor, for a fraction of the emission. It
says nothing about whether a real model writes good patches — the scripted
stand-in emits exactly the patch a correct model would.

That question is measured elsewhere and is not re-claimed here: P16's own
amendment records the live iterate-eval at 12/12 landings, 11/12 clean on the
first turn, ~220 output tokens per model per six iterations. The known failure
mode there is not size but ANCHORING — a `find` that matches nothing, or
matches ambiguously, which `applyOps` refuses as a typed gap rather than
applying somewhere plausible.

## Reproduction

```
cd native/eval/the-fold
node longform-code.mjs              # 24 turns
STEPS=200 node longform-code.mjs    # the divergence
```
