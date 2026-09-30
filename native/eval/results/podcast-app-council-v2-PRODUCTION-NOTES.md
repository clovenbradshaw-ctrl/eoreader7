# The council, rebuilt in production — what actually happened, rounds 4-12

Not an eval fixture this time — `podcast-app-council.mjs` is the live
generation pipeline. This is the honest record of running the corrected
design against it for real, including the two real corruptions it produced
and the guards built live, in response, to actually stop them.

## The rebuild

v1 cited UDHR/Quran/Pali Canon text as the operative reason a writer had to
act correctly, then funneled four critiques into one synthesis call that
rewrote the whole file. Per direct correction (*"we can't ground it so
explicitly in the UDHR... if we have a morality governor, people will turn
it off... 'morality' is what you call it from the POV of an individualist
value system"*), v2 replaces both:

- **Four structural-property lenses**, not virtues: CALIBRATION,
  CONSISTENCY, INVARIANCE, OTHER-MODELING (see the file's own header for
  what each structurally is). No citation, no authority, anywhere in any
  prompt a model sees. The wisdom-text citations moved to a
  convergent-validation record attached to each critique's ledger entry —
  evidence for an auditor, never content for a writer.
- **Select, never generate**, for the read step. v1's free-text "quote the
  exact snippet" design hallucinated 2 of 4 quotes on its first live
  production run (round 5) — correctly REFUSED by mechanical verification,
  but real recall was lost. Fixed by giving the reader a numbered line
  listing and asking for a LINE RANGE, never text — the quote is then
  mechanically sliced from the real file, so hallucination is structurally
  impossible rather than merely caught after the fact. (This is this
  project's own already-validated fix for exactly this failure mode,
  P32/P83's witness tier, applied here.)
- **Disjoint write tasks, no synthesis funnel.** Verified findings are
  grouped by byte-span overlap; disjoint findings become independent
  writers dispatched concurrently, each seeing ONLY its own isolated
  snippet. Overlapping findings merge into one shared task, and — a fix
  added live, round 6 — a merge covering a large fraction of the file is
  explicitly flagged as "orthogonality NOT achieved this round," never
  silently treated as if it were the isolated case.

## Two real corruptions, found live, not hypothesized

**Round 7**: an isolated writer given a small fragment inside the
`<style>` block emitted `</style></head><body></body></html>` as part of
"fixing" its own tiny piece — duplicating the document's own top-level
structure mid-file. checkCode's presence-only regex checks (does `<audio>`
appear anywhere) could not see this at all; the corrupted file landed on
the ledger looking clean by every check that existed at the time.

**Round 9** (after the first guard closed round 7's failure mode): a
different writer, given a fragment inside the fetch handler, replaced only
PART of a `try {...} catch {...}` block — its own replacement closed
cleanly, but the ORIGINAL code's own tail was left dangling right after
it, producing a syntactically invalid script (`Unexpected token 'catch'`)
that passed every HTML-structure check (html/head/body all balanced) while
being completely broken as JavaScript.

Both are exactly the risk both falsification write-ups had already named
as real and disclosed, un-hidden: *"a real, disclosed risk of this design
... an isolated fragment failing to re-embed."* This is that risk,
materializing twice, for real, in production — not a hypothetical anyone
had to imagine.

## The fix, in two layers, built in direct response to each failure

1. `fragmentOverstepsScope(fragment)` — a fragment isolated to one small
   region should never need to emit a document's own top-level tags
   (`<!doctype`, `<html>`, `</html>`, `<head>`, `</head>`, `<body>`,
   `</body>`). If it does, the fragment is refused BEFORE splicing; that
   region is left unchanged, disclosed as a refusal.
2. `documentWellFormed(html)` — checked on the FULLY ASSEMBLED document,
   after every patch lands: every html/head/body tag must appear exactly
   once, AND the extracted `<script>` content must actually parse
   (`new Function(script)` — compiled, never executed, so this is a pure
   syntax check). A round that fails this is refused ENTIRELY: nothing but
   the readers' own critiques land on the ledger; the prior round stays
   current, the same way an uncommitted database transaction leaves no
   trace in the table it touched.

Both were then confirmed live, not just reasoned about: recovering to the
last known-good round and re-running the pipeline reproduced the IDENTICAL
failure class from EACH writer a second time — and each time, the new
guard caught it and refused cleanly, leaving the ledger in a sane state
(current fold: round 11, valid JS, confirmed by direct re-parse; round 12's
failed attempt landed zero HTML, only its critiques, exactly as designed).

## What this actually demonstrates about the thesis

The structural-property design didn't just avoid the SPECIFIC failure mode
the earlier fixture-based falsification measured (the broken ethos ternary,
the download-vs-audio link) — running genuinely free-range, unprimed with
any known bug list, it found and fixed a REAL defect nobody had told it
about (the CSS `.ethos-badge` styling silently giving `pass` and
`no_signal` the identical color — itself a calibration violation: two
distinct verdicts, one indistinguishable visual claim). That is real
evidence the properties are doing genuine, general work, not memorized
answers to a rigged test.

It ALSO produced two real corruptions the earlier falsification's own
disclosed limits section predicted as a class but had not yet observed.
Reporting that honestly — and then closing it with guards built in direct
response, verified against the actual failures rather than assumed to
work — is itself the discipline this whole project's law already states:
*"a control gate is what makes coherence provisional rather than assumed."*
An isolated-writer design earns trust by surviving a real attempt to break
it, not by never being tested hard enough to find where it breaks.

## Still open, honestly

- The `other-modeling` and `consistency` lenses are the two that produced
  BOTH real corruptions (accessibility-lens fragments reaching for
  document structure; the fetch-handler lens replacing partial logical
  blocks). Whether this is those TWO lenses' prompts needing tighter
  scoping, or whether any lens asked to edit inside a deeply-nested
  region/a multi-statement block carries this risk generally, is
  unmeasured — only 2 corruption instances is not enough to separate those
  hypotheses.
- `fragmentOverstepsScope` and `documentWellFormed` are both cheap,
  targeted, POST-HOC mechanical checks — they catch two specific, real
  failure classes. Neither is a general HTML/JS validator; a corruption
  shaped differently from either of these two could still pass both
  checks and land. This is disclosed as a real gap, not implied closed.
- The module-scope auto-run gap flagged earlier this session for
  `podcast-app-codegen.mjs` ("module-level main() runs unconditionally on
  import, with no entry-point guard") is now confirmed to exist in
  `podcast-app-council.mjs` too — an accidental `import()` during this
  session's own debugging triggered a real, uncontrolled production round.
  It happened to be killed by an unrelated SIGPIPE before landing anything
  (confirmed: zero round-10 ledger entries), so no harm resulted this
  time, but the underlying gap (both codegen scripts run for real the
  moment their module is imported, not only when invoked as a CLI) is
  real, disclosed, and still unfixed in either file.

## Amendment — the harm gate, mechanical, no model prose ever read

Direct user framing: *"we need to see where these properties halt harm as
irrational... they can do this mechanically, right? Models are not
writing anything verbatim?"*

`adapters/build/harm-properties.mjs` operationalizes this exactly:
"harmful" is not a separate moral category needing its own judge — it is
a move that mechanically REGRESSES one of the four properties (a
`calibrationScore`/`consistencyScore`/`invarianceScore`/
`otherModelingScore`, each 0..N, each computed by EXECUTING or
structurally measuring the real bytes) relative to what the artifact
already had. `harmGate(before, after)` computes all four on both versions
and halts if any went down. The hard invariant, checked by a source scan
in the falsification script rather than merely claimed: no scorer
function reads a description, a commit message, an audit field, or any
model-authored text at all — the ONLY input is the raw html string,
twice.

**Falsified with three hand-authored adversarial patches, each carrying a
deliberately innocuous, plausible description** (`podcast-harm-gate-
falsify.mjs`) — the exact language a model might actually write to
describe the same regression ("simplified for a cleaner, more consistent
experience"; "reduced console noise"; "refactored for accessibility"):
hardcoding the ethos badge to a constant (calibration+invariance
regression), silencing the catch block (other-modeling regression), and
swapping in a decoy `<audio src="about:blank">` that looks fixed but
isn't (consistency regression). All three halted regardless of their
description; a genuinely benign cosmetic-color control was correctly
NOT halted (II.23).

**A real bug was found and fixed building this, kept in the record.**
The first cut of `calibrationScore` used a greedy regex
(`[^}]*ethos[^}]*`) to find the ethos ternary. Patch C (removing the `<a>`
link) happened to remove the one thing providing an intervening `}` that
kept that regex properly scoped — with it gone, the match ballooned
outward across an unrelated outer placeholder, threw on evaluation, and
reported a FALSE calibration/invariance regression that had nothing to do
with what patch C actually broke. Fixed with `extractPlaceholders` — a
brace-balanced walk from each `${`, never a regex — the same lesson this
whole project keeps re-learning in a new register: a mechanical check is
only as trustworthy as its own extraction, and THAT has to be tested
adversarially too, not assumed correct because it "looks mechanical."

**One case was disclosed as genuinely untestable rather than forced to
pass**: the live production fold never had real audio wiring to begin
with (it still has the download link), so a "decoy audio" patch tested
against the ACTUAL current fold shows no regression — there is nothing to
regress FROM. Tested honestly instead against a constructed,
disclosed-as-synthetic "already fixed" reference, where the same decoy
patch is correctly caught. **This is a real, named limit of
regression-based harm detection**: it catches degradation from an
existing good state; it cannot retroactively notice that the current
state was already deficient and something merely LOOKS fixed without
being fixed. The council's own existing checkCode/documentWellFormed
checks are what has to establish a genuine baseline in the first place.

**Wired into production** as a third guard, after structural-integrity:
`harmGate(currentHtml, html)` on the fully assembled candidate, before it
is ever allowed to land — a regressing round is refused entirely, the
same transactional posture as the well-formedness guard.

**Also fixed while in this file**: the module-scope auto-run gap already
disclosed for `podcast-app-codegen.mjs` was confirmed live in THIS file
too, a second time, during this exact debugging session (an accidental
`import()` triggered a real, uncontrolled production round). Closed with
the standard Node entry-point guard (`import.meta.url === file://
${process.argv[1]}`) — main() now runs only when this file is the
process's own entry point.

**A recurring, disclosed pattern, not yet acted on**: the `consistency`
lens's writer has now produced the SAME dangling-partial-block corruption
three separate times across live runs (rounds 9, and twice more during
this amendment's own testing) — always inside the fetch handler's
try/catch. The structural guards correctly caught and refused it every
time, so nothing corrupt ever landed, but the RECURRENCE suggests this
lens's writer prompt may need a narrower, block-boundary-aware framing
(show it the fully enclosing statement, not an arbitrary reader-selected
line range) rather than relying on the safety net alone. Named as real,
unbuilt next work.
