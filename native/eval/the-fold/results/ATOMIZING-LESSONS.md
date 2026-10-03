# Atomizing the coding lessons — by intent, not keywords (2026-10-03)

The 101 lessons in `CODING-LESSONS.md` are prose a human reads. The goal was to
turn them into **atoms the pipeline can consult** — not an index, an engine.

## Why not keyword/regex (the first attempt, discarded)

A keyword scan over lesson text was tried first: for each lesson, grep the
runtime files for named mechanisms. It reported **91/93 "live"** — a false
result, because common words (`import`, `ground`, `prompt`, `window`) match
anywhere. A keyword scan cannot tell prose meaning from vocabulary. Discarded,
as the standing rule requires (no keyword/regex matching for meaning).

## The intent method (what shipped)

Files: `native/eval/the-fold/atomize-lessons.mjs` →
`native/eval/the-fold/results/coding-lesson-atoms.json`.

1. **Parse each lesson** by the ledger's own markdown heading grammar (the only
   regex — structure, never meaning).
2. **Read each lesson sentence INTO INTENT** with the real parser:
   `clauseCore(parser, sentence)` (eot-notation.js) returns `root|subject` —
   the clause's operation and operand, from Universal Dependencies, no word
   match. Example: *"Anchors must be real bytes"* → `byte|anchor`.
3. **Read the code's own intent** the same way: harvest every runtime file's
   `//` comments and parse them to clause cores — the code's commentary, read
   structurally.
4. **Capture each lesson as a holograph proposition atom**
   (`proposition-holograph.js::captureProposition`): the lesson's clause cores
   are its `groundFacts`, its body is the `activation`. **93/93 captured.**
5. **Status by intent overlap**: a lesson is `live` when a code clause shares
   its operation (root) or operand (subject) — the Lovelace distinction
   (operation vs operand) applied to matching, direction disclosed on the atom.
   A stopword filter (closed-class lemmas: be/have/do/that/this…) removes noise.

## Result

| status | count | meaning |
|---|---|---|
| **live** | 27 | a code clause shares the lesson's operation/operand |
| **prose-only** | 17 | the lesson's intent appears in no code clause — the gap |
| **indexed** | 49 | no parseable clause (imperative rules: "Decompose to one behavior") |
| falsifier carried | 44/93 | the lesson names its own falsifying control |

## The honest limits (disclosed, not hidden)

- **Imperatives parse to no core.** A rule stated as a command ("Decompose to
  one behavior per ask", "Anchors must be real bytes") has no subject in UD, so
  `clauseCore` returns null and the lesson is `indexed`. That is 49 of 93 — the
  imperative form itself is the gap, not the mechanism being absent.
- **Operation-or-operand overlap is permissive.** It can match on a shared root
  (`have`, `break`) that is not the real mechanism; the `share` field discloses
  which, so a reader can reject a bad match instead of trusting it.
- **The atom is not yet consumed.** This ships the atoms and the map; nothing
  in `runVoidLoop` reads `coding-lesson-atoms.json` yet.

## What would make it an engine, not an index

1. **Capture imperative lessons by their object**, not their (absent) subject:
   read the imperative's verb + object ("decompose … one behavior") as the
   intent — the operation is present, only the subject is elided.
2. **Have `runVoidLoop` consult the atoms by trigger** — the same way the
   finer-grain composer consults idioms by contract — and falsify that an
   atom-bearing loop does better than the code as-is.
3. **Every future lesson lands as an atom**, auto-captured at commit time with
   its falsifier (44/93 already carry one — that field is the raw material).

No stronger model was used. The method is the parser's structure and the
holograph's atoms, both already in the repo.
