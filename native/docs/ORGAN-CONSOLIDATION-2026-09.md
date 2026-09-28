# Organ consolidation, 2026-09 — the-fold ↔ eoreader7, verified case by case

Standing: **verified findings only.** Unlike `THE-MODULE-CENSUS.md` (a
single-pass read of every file's header and exported functions), every entry
here was reached by reading BOTH implementations in full, running the actual
test suites before and after any change, and — where a change was made —
adding or reusing a test that would fail if the two copies disagreed again.
A research pass across ~40 suspected clusters is separately in flight; its
raw findings are hypotheses and must clear this same bar (read both fully,
try to find a case where they diverge, verify with real test runs) before
landing here as a verified entry. Do not treat an agent's summary, or this
document's own prose, as ground truth without re-running what it claims to
have run — that is the whole discipline this document exists to model.

---

## 1. `ground-ladder.js` — reconciled (2026-09-28)

**What it is.** The per-sentence grounding-ladder classifier (P115):
`groundOf(sentence, ctx)` places a sentence on the highest of up to 8 rungs
(verbatim / bound / witnessed / recorded / derived / contested / named /
self) and is what draws every citation chip a reader sees on a checked
answer.

**Where it lived, and the actual defect.** `the-fold/ground-ladder.js` (the
original, actively maintained, 8-rung version) and
`eoreader7/native/the-fold/ground-ladder.js` (imported ONLY by
`proxy-runner.mjs` — the file that decides every plain-chat grounding mark
the engine now serves, per `ONE-ENGINE-PLAN.md`) had diverged. The eoreader7
copy was NOT a stale mirror of an old the-fold version in some general
sense — it was missing five specific, individually-documented correctness
fixes the-fold's own commit history shows were made and never carried back:

1. **No "verbatim" rung at all.** `TIERS` had 7 entries, not 8. A sentence
   that is a byte-for-byte quote from the source material — the STRONGEST
   possible grounding — had no dedicated check; it fell through to
   whatever the relation tier ("bound") happened to bind, which is not
   reliable for sentence shapes the SVO extractor doesn't parse into an
   edge (narrative description, dates, quotations). Real under-crediting,
   confirmed by the-fold's own regression test name: "the 2-of-8 e2e cases
   that were word-for-word and still read 'self' (2026-09-15)."
2. **No language-scoped tone-mark protection.** The fold function did an
   unconditional Unicode combining-mark strip, which silently collides
   Vietnamese/Pinyin names that differ only by tone ("Nguyễn" vs.
   "Nguyên") — the-fold's own P251 finding, fixed there via a small
   giver-named `TONAL_LANGUAGES` registry, never ported.
3. **No copula-order-insensitive ledger matching.** `claimKey` alone means
   a note stating "X is Y" and a claim restating "Y is X" (the identical
   proposition, reversed word order) fail to match on the ledger — the-fold's
   own P224 finding (`groundKey`, using `relation-kinds.js::kindOf` to
   detect a SIG·Figure/copula relation and sort its ends before keying).
   `relation-kinds.js` did not exist in eoreader7 at all.
4. **No `contradictedNames` veto on the "named" rung.** The-fold's version
   refuses to credit a name as "established" when `checkGrounding` has
   already flagged THIS SENTENCE's own use of that name as unsupported
   (scoped correctly to the finding's own sentence-of-origin,
   `findingScoped`, P251). The eoreader7 copy had no such check at all — a
   name already known to be fabricated in this exact sentence could still
   be credited.
5. **No human-readable section labels.** The-fold's `labelOf`/`label`
   field lets `groundLine()` render "stated at Chapter 2" instead of a raw
   byte offset (P115, 2026-09-15 direction). Missing entirely in the
   eoreader7 copy, which always rendered raw addresses.

**The other direction.** The eoreader7 copy had ONE real capability the-fold's
own copy lacked: `suppliedForms`/`forms`/`supplied` (the "form tier,"
2026-09-16) — reporting which derived hypothetical/sequence "form" a bound
claim's own reading supplied, as opposed to what the bytes certified. This
was never ported back.

**Verification, not assertion.** Before touching either file: read both in
full, confirmed via `grep`'s import lists that `proxy-runner.mjs` is
eoreader7's sole consumer and `app.js`/`correction.js`/`dialogue.js`/
`holon.js`/`snip-check.js` are the-fold's, confirmed `relation-kinds.js` has
exactly one dependency (`cube.js`) and is otherwise self-contained. The two
non-Latin-script constant sets in `relation-kinds.js` (Hebrew, Cyrillic,
Korean particles) were ported by **mechanical string substitution on the
import line only**, never hand-retyped, after a first hand-typed attempt
was caught corrupting the Korean topic markers 는/은 into duplicated
Japanese は — the diff against the original caught it immediately; this is
exactly why non-Latin content should never be retyped by hand, and the
lesson is recorded here so the wider consolidation pass doesn't repeat it.

**What shipped:** the `forms`/`suppliedForms` capability was added to
the-fold's copy (additive, default `[]`, byte-identical for every existing
caller — confirmed by running the-fold's OWN 17-case
`ground-ladder.test.mjs`, 17/17); the two files were then made
mechanically identical (verified with `diff`, not assumed) with
`eoreader7/native/the-fold/relation-kinds.js` added as the one supporting
file the reconciled version needs. The-fold's own already-adversarial test
suite was then **mechanically copied** (import paths only changed) into
`eoreader7/native/the-fold/ground-ladder.test.mjs` and run directly against
the reconciled eoreader7 copy: 17/17. `native/tests/reading-surface.test.js`
(the pre-existing test of the `forms` capability): 4/4, unchanged.
`native/tests/chat-fact-gate.test.js` has 2 pre-existing failures
(unrelated — a stale-fact gating bug, `git stash` confirms identical
failure before and after this change) and `the-fold/holon.test.mjs` has 2
pre-existing failures (P173, also confirmed identical via `git stash`) —
both named here rather than silently absorbed into a clean-looking test
run.

**Not yet done, disclosed rather than implied complete:** the-fold's own
`ground-ladder.test.mjs` has no dedicated case for the negation-scoped
containment check (`sentenceDenies`, P251's "a denying passage should
never certify the claim it denies") — that gap exists in the-fold's own
suite too and was not added here, since closing a pre-existing test gap in
the SOURCE OF TRUTH file is a separate task from reconciling the two
copies. The two files remain two physical copies (a the-fold browser
bundle cannot import a Node-only eoreader7 path, and vice versa) — this
reconciliation removes the DRIFT, not the duplication; the duplication
itself is only removable once `ONE-ENGINE-PLAN.md`'s bigger question
(does the-fold keep any offline/fallback mode) is settled.

---

*Entries below this line are added as the wider research pass's findings
clear verification. An unverified hypothesis is never listed here as a
finding — it stays in the research transcript until read, tested, and
either confirmed or refuted.*
