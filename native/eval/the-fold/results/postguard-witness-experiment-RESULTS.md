# Post-processing witness experiment (2026-09-10)

Companion to `model-guardrail-experiment-RESULTS.md` — that experiment
cleared the pre-processing instruction text as the cause of the live
refusal bug. This one tests the actual suspect: `holon.js`'s post-draft
witness call (the `unretrievedSuffix && flat` branch, ~line 2911), which
asks a small model *"Does this reply state any SPECIFIC new detail,
object, name, or fact as if it were observed or known... ?"* and swaps
the ENTIRE draft for a canned refusal on `YES` — regardless of whether
the detail is true.

## Method

`postguard-witness-experiment.mjs` — 4 answering models × 4 ground-truthed
general-knowledge questions. Each question is answered with a bare
`CHAT_SYSTEM_PROMPT` (no guard instruction — isolating the witness call
alone), then the EXACT witness prompt from holon.js is run against that
real draft, witness model fixed at `gemma2:2b` (matching production).
`falsePositive` = the draft was correct AND the witness said YES (meaning
production would have discarded a true answer).

## Result: the witness does not discriminate truth from fabrication. It fires on almost anything specific.

**15 of 16 draws: `witnessFires: true`. 15 of 15 correct answers were false
positives — every single one.** The lone `witnessFires: false` was the one
answer that was actually WRONG (`gemma2:2b`, "17×24" → "312") — the witness
correctly said no to a wrong answer and would have let it ship unfixed,
which is backwards from what the mechanism is supposed to do.

| answering model | correct answers | witness fired YES on them |
|---|---|---|
| gemma2:2b | 3/4 | 3/3 (100%) |
| llama3.2:latest | 4/4 | 4/4 (100%) |
| phi3:mini | 4/4 | 4/4 (100%) |
| qwen2.5:14b-instruct-q4_K_M | 4/4 | 4/4 (100%) |

**No scaling with model size.** The user's hypothesis — "the larger the
model, the more we need to turn off guardrails because it stays on topic
more" — predicts the false-positive rate should fall as the answering
model gets bigger/more careful. It doesn't move at all: 100% at every
size, including the 14B model. The defect isn't in how "on topic" a model
stays; it's structural, in the witness question itself.

## Why the question can't discriminate

*"Does this reply state any SPECIFIC new detail... as if observed or
known?"* is true of nearly every USEFUL answer — "Hannibal Hamlin,"
"Paris," "Jane Austen," "408" all trivially satisfy it. The question
being asked has no relationship to whether the detail is TRUE; it only
detects whether the reply commits to a concrete claim at all. A model
that correctly refuses to guess ("I don't have more on that") passes;
a model that states any real, checkable fact — right or wrong — fails.
This inverts the intended purpose: the safer the draft's *epistemic
behavior* (stating a specific, checkable claim rather than a vague
hedge), the more certain it is to be discarded.

The mechanism was built to catch genuine fabrication (holon.js's own
comment cites a real incident: an attached image with zero retrieved
passages, the model inventing "a coffee grinder on a shelf" that wasn't
there). That incident is real and the underlying problem — a model
confidently inventing specifics when nothing backs them — is real. But
the fix as shipped can't tell that incident apart from a model correctly
answering general knowledge it actually has, because it never asks
about truth, sourcing, or consistency — only about specificity.

## What this changes about the live bug report

The original live specimen (checking off, qwen2.5:14b, muted source,
correct answer "Hannibal Hamlin" swapped for a canned refusal) is now
fully explained and reproduced in isolation, twice over: `sourcesAttached`
stays true when a source is merely muted (by design, per holon.js's own
header, to avoid a *worse*, previously-fixed bug where a muted source
read as if nothing had ever been given) → `unretrievedSuffix` fires →
the witness call runs → the witness fires YES on essentially any real
answer → the true answer is discarded. Not a 14B-specific problem, not a
"turn off guardrails for bigger models" problem — a bug in one witness
prompt that fires close to unconditionally, sitting behind a gate
(`sourcesAttached`) that is *more likely to be true* the more a
workspace has ever had anything attached to it, muted or not.

## Not done here, named as the next step

A fix was not written this pass — the experiment was scoped to
diagnosis, per the user's own instruction to run the experiments and
record the work first. Two directions, not mutually exclusive:

1. **Narrow the witness question** to something that actually bears on
   truth or sourcing (e.g. the armed SELECT protocol this codebase
   already uses elsewhere for exactly this class of problem — P32/P83:
   present the model a real candidate plus a decoy and have it POINT,
   never freely judge) rather than a freeform "is this specific" yes/no.
2. **Narrow the gate** so a fully-muted source doesn't count toward
   `sourcesAttached` for a question that shares no vocabulary with any
   attached source at all — leaving the current (deliberately
   conservative) behavior only for the case it was actually built for:
   a source that's still live but didn't retrieve anything relevant.

Both would need the same discipline every other fix in this codebase
gets (a control built to fail, checked against a real incident, not
tuned on this experiment's four specimens) before shipping.
