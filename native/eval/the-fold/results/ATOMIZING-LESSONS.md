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

## Result (after two parsing fixes)

Two real parser bugs were found and fixed — both about READING, not classifying:

1. **Markdown broke the parser.** Lesson bodies carry `**bold**`, `` `code` ``, `*em*`; the UD parser returned null on every one. Stripping markup first (`deMark`) made the same sentences parse.
2. **Imperatives have no subject in UD.** "Decompose to one behavior per ask" parses to null; restoring the elided subject mechanically ("You decompose…") recovers the operation (`decompose|you`) — no word match.

With both fixes, **92/93 lessons parse to intent** (was 44/93); only 1 stays unparseable.

The **status** is where the honesty matters. Two measurements, neither is a
verdict:

| measure | count | trust |
|---|---|---|
| `candidate-exact` — a code clause parses to the **same core** | 61 | a hint, not proof |
| `candidate-operand` — shares a **noun** with a code comment | 22 | a weak hint (nouns repeat everywhere) |
| `gap` — intent touches no code clause | 9 | for these, nothing in the runtime reads |
| `indexed` — no parseable clause | 1 | — |
| carries its own falsifier | 44/93 | the raw material for execution |

**The measured conclusion:** intent-of-comments **cannot classify live/prose**.
Exact-core equality swings from 1/93 (before the parse fixes) to 61/93 (after) —
proving the number tracks the *parser's* coverage, not the truth. Shared-noun
overlap is 83/93 and untrustworthy (patch/gate/find/task appear in comments
everywhere). So the atomizer ships the atoms + the measured overlap as a
**hint**, and marks the real live/prose verdict as belonging to the **loop** —
does the mechanism change the artifact — never to comment similarity.

## What the atoms ARE (the deliverable)

`results/coding-lesson-atoms.json` — 93 `CodingLessonAtoms@2`, each carrying:
its **intent** (the clause cores the parser read), its **falsifier** (44 present),
the **holograph atom id** (all 93 captured via `captureProposition`), and the
measured **overlap hint** with code. This is what "have them be atoms moving
forward" means: a record the pipeline can consult, not a paragraph a human reads.

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
