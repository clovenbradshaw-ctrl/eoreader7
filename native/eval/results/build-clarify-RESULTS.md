# build-clarify — the recursive ask-back door, run live (2026-09-18)

**Generality:** universal — the gate is a build-shaped ask on the shared
turn (`runProxyTurn`), so the fold, the TUI, and the direct API all get the
same door. Not wired into the browser page this pass; the wire shape is the
`mechanical` envelope on `/v1/ask`.

## The three registers, in order (not three archons)

`native/organs/build-clarify.js` runs the registers as SYSTEMS, in order —
ethos (ground) → logos (figure) → pathos (pattern), per
`native/docs/THE-MORAL-CORE-AS-A-RING.md` (the pathos of one ring is the
ethos of the next). All three arrive injected; the organ carries only the
ORDER and the recursion, never a second copy of any archon's machinery
(pinned by the injected-machinery test). `void-holarchy.js` (Koestler) is
the recursion substrate: every level a whole-and-part, modality `code` →
artifact · module · function · statement.

## Live run — one session, three rounds, real JSON

Same `sessionId`, same task `make a myspace-like site for dolphins`, model
`gemma2:2b` via `/v1/ask`. Zero model tokens until licensed.

### Round 0 — under-specified void ASKS (usage 0/0)

```json
{
  "answer": "who is it for?\nhow many?",
  "answerShape": "needs-clarification",
  "usage": { "promptTokens": 0, "completionTokens": 0 },
  "mechanical": {
    "rung": "build-clarify", "round": 0, "schema": "EOBuildClarify@1",
    "openBefore": ["anchor", "cardinality"],
    "questions": [
      { "cell": "anchor", "ask": "who is it for?", "wouldSettle": "who it is for is named" },
      { "cell": "cardinality", "ask": "how many?", "wouldSettle": "the count is named" }
    ],
    "asksBack": true
  }
}
```

The person-facing text is minimal and apparatus-free (Gary's law: as little
as possible in the mouth — no cell name, no operator, no "void"/"slot",
no prohibition, no numbering; pinned in the test). The structured shape
rides the `mechanical` envelope so every surface renders the same door.

### Round 1 — answer fills `anchor`, the void re-declares and narrows (0/0)

```json
{ "answer": "how many?", "answerShape": "needs-clarification",
  "usage": { "promptTokens": 0, "completionTokens": 0 },
  "mechanical": { "round": 1, "openBefore": ["cardinality"],
    "questions": [{ "cell": "cardinality", "ask": "how many?" }] } }
```

### Round 2 — answer fills `cardinality`, generation is licensed

The declared shape (`slot` = "a myspace-like site for dolphins", `anchor` =
"the person asking for it", `cardinality` = "three profiles") re-derives the
language to **html** (`languageForDeclared`, pinned in the suite) and leads
the generation prompt (Gary-minimal, plain words, never the apparatus cell
names). The model built a real `<!DOCTYPE html>` myspace-style page:

```json
{ "answerShape": "composition",
  "usage": { "promptTokens": 463, "completionTokens": 160 } }
```

Before the declared shape was threaded, the same ask generated a Python CLI
(two separate live runs, both mis-typed). The declared shape is the difference.

## What the recursion refuses (built to fail)

- **Ethos first:** a task the ground refuses is refused before any question.
- **Logos second:** an answer that would cycle the standing is `logos_cycle`,
  never asked, never landed.
- **Pathos decides the round:** an answer that fills no open cell
  (`still_under_specified`, "an answer moved nothing…") is NEVER re-asked.
- **Budget bounds:** `MAX_ROUNDS = 3`; past it, `still_under_specified`,
  never an infinite ask.
- Every round lands append-only on the session's `buildRounds` (recorded
  act); declared cells accumulate across rounds so the recursion narrows.

## Enforced

`native/organs/build-clarify.test.mjs` — 12 cases, including controls run in
both directions (ethos refusal vs its control, narrowed subset, moved-nothing,
budget, append-only, injected-machinery import scan, and the declared-shape
language re-derivation: a declared SITE → html; a declared TOOL stays python;
null declared leaves the language alone). `node --test
native/organs/build-clarify.test.mjs` → 12/12.

## Disclosed, not attempted

- The gate fires only on a build-shaped ask (`make|build|create … a
  site|app|page`…) in `projection` mode; a plain chat question is untouched.
- `provisionArchon` remains a dead import (guarded, unused) in `proxy.mjs`.
- The browser page does not yet render the `mechanical` envelope; the fold
  and TUI render it via the same `/v1/ask` wire (ONE-ENGINE-PLAN).
- The `archon-hyphae` module was deleted by the operator; the proxy now
  boots with its archon verbs as typed gaps rather than refusing to start.