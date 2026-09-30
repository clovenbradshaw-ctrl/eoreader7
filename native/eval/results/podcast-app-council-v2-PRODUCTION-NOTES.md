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
