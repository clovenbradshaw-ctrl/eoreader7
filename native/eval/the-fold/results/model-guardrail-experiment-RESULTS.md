# Model × guardrail experiment (2026-09-10)

Prompted by a live bug: with checking off, source muted, in a brand-new
conversation with nothing attached, `qwen2.5:14b-instruct-q4_K_M` answered
"Who was Abraham Lincoln's vice president?" with *"There isn't more
specific detail available in what's attached."* — a canned refusal line,
not the model's own words (`holon.js:2925`). User's own read, verbatim:
*"something is prompting it to not respond"* and *"weirdly the larger the
model, the more we need to turn off guardrails because it stays on topic
more."*

## What's actually in the pipeline

Two separate mechanisms both called "the guard" here, and they are not the
same thing:

1. **Pre-processing (a system-prompt instruction).** `UNRETRIEVED_MATERIAL_PREFIX`
   (holon.js) is appended to the system prompt whenever `sourcesAttached`
   is true (any source *loaded*, muted or not — a deliberate, documented
   design choice, not a bug: see holon.js's own header on
   `unretrievedSuffix`) and this turn's retrieval came back empty. It tells
   the model: *"Something is attached... say plainly that what's attached
   doesn't answer this."*
2. **Post-processing (a second model call).** After the draft is written,
   if `unretrievedSuffix` was non-empty on a flat turn, a SEPARATE witness
   call asks a small model: *"Does this reply state any SPECIFIC new
   detail... as if it were observed or known?"* A `YES` swaps the ENTIRE
   draft — correct or not — for a canned refusal line
   (`"There isn't more specific detail available in what's attached."` or,
   if there's chat history, a restatement of the last thing already said).

## Experiment 1: does the pre-processing TEXT alone suppress a correct answer?

`model-guardrail-experiment.mjs` — 4 models × 4 general-knowledge questions
× {bare `CHAT_SYSTEM_PROMPT`, guarded `CHAT_SYSTEM_PROMPT +
UNRETRIEVED_MATERIAL_PREFIX`}, real Ollama, temperature 0, no chat history,
no witness call.

**Result: no. Every guarded answer was still correct.** 32/32 calls, zero
refusals by the instruction alone (checked against a small refusal-phrase
regex; every guarded reply still stated the real fact, sometimes with a
throat-clear like *"Abraham Lincoln's first term vice president was
Hannibal Hamlin, and for his second term, it was Andrew Johnson"*). The
instruction nudges phrasing, not correctness, at least on questions this
unambiguous.

One arithmetic flip worth naming rather than over-reading:
`gemma2:2b` answered `17×24` wrong bare (`312`) and right guarded (`408`).
`options.temperature: 0` was set but no `seed` was pinned — this is sampler
noise, not a guard effect, and is not evidence either way.

Cold-load latency contaminates the raw `ms` figures (llama3.2's first call:
16.7s; phi3:mini's first call: 64.7s — both GPU-load artifacts, not steady-
state inference cost). Warm-state latency, roughly:

| model | warm bare (ms) | warm guarded (ms) |
|---|---|---|
| gemma2:2b | 789–967 | 928–1127 |
| llama3.2:latest | 310–1355 | 580–1976 |
| phi3:mini | 1179–1837 | 2839–5024 |
| qwen2.5:14b-instruct-q4_K_M | 1606–3669 | 2680–4901 |

Guarded consistently ran a bit slower than bare on every model (longer
system prompt → more prompt tokens to process) — a real, small, explainable
cost, not the refusal mechanism.

**Conclusion: the pre-processing instruction is not what silenced the live
qwen2.5:14b turn.** Isolating it clears it. The suspect moves to the
post-processing witness call.

## Experiment 2

See `postguard-witness-experiment-RESULTS.md` (same directory) for whether
the witness call itself convicts a TRUE answer as a false positive, and
whether that rate scales with the answering model's size — testing the
user's own hypothesis directly.
