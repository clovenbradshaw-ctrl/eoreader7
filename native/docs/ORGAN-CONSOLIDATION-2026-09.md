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

## 2. `firewall.js` — same-repo duplicate collapsed to a shim (2026-09-28)

**What it is.** `apparatusMentions`/`assertModelFacing`/`strikeAddresses`
(P55/P253) — the wall between what a model is handed and what it may see:
a closed-class scan refusing apparatus vocabulary ("the prompt", "the
passages") in any model-facing string, plus `strikeAddresses`/
`mouthFacing`, which strip citation addresses from the mouth's own view.

**The research pass's finding, re-verified and found already stale.** The
workflow's own evidence (`diff` showing byte-identical bodies) was correct
for the checkout it read, but a concurrent Phase-4 migration (dated
2026-09-14 in the file's own header) had already turned the-fold's copy
(`the-fold/firewall.js`) into a cross-repo shim onto
`eoreader7/native/organs/firewall.js` by the time this was checked —
confirmed with a fresh `diff`, not assumed from the finding's prose. The
REAL remaining duplicate, found by re-running the same check against the
current tree, was one level in: `eoreader7/native/the-fold/firewall.js`
(consumed by `proxy-runner.mjs`'s pipeline) was byte-identical to
`eoreader7/native/organs/firewall.js` (the canonical organ, already
exported through the project's own `native/organs/index.js` seam,
lines 133-134) — a same-repo duplicate, not a cross-repo one.

**Verification before touching anything.** `grep`-confirmed exactly two
real importers of the duplicate path: `tests/turn-standing.test.mjs` and
`native/the-fold/resolutions.js` (`import { strikeAddresses } from
"./firewall.js"`). Neither needed anything the duplicate had that the
canonical organ lacked (there was nothing — the bodies were identical).

**What shipped.** `native/the-fold/firewall.js` is now a shim (`export *
from "../organs/firewall.js"`), the same one-line pattern the-fold's own
copy already uses one register up. Verified: `tests/turn-standing.test.mjs`
+ `native/organs/firewall.test.mjs` (10/10); the full `native/the-fold/`
suite (510 tests) shows the identical 5-6 pre-existing failures with and
without this change (confirmed via `git stash`, none naming firewall,
apparatus, or resolutions) — `produces a real, non-trivial dependency
index...`, `resolveFormReferent on a real ledger directory...`, the PDF
extraction trio, and one flaky SCALING case that did not reproduce on
every run either way.

---

## 3. `void-shape.js` — the two copies' one real drift, reconciled (2026-09-28)

**What it is.** The nine-operator void-space arithmetic (P105/`the-fold`'s
"Pass 23 — the void, live"): `declareVoid`/`zeroSpace`/`fill`/`voidsOf`
zero an extent (e.g. Lincoln's presidency, 1861-1865) across all nine
cube operators, then report what a filler still leaves uncovered — the
mechanism behind "who was Lincoln's vice president" correctly refusing
"Hannibal Hamlin" alone once a second, later filler is also required.

**Where it lives, and what the research pass actually found.** Two
physical copies: `the-fold/void-shape.js` (12 local importers, including
`app.js`, `void-brief.js`, `void-loop.js` — the-fold's own active `/void`
pipeline) and `eoreader7/native/the-fold/void-shape.js` (imported by
`proxy-runner.mjs` in production, `document-ledger.js`, and several eval
drivers — one of which, `void-loop-e2e.mjs`, imports the-fold's REAL repo
copy directly via a four-level-up cross-repo relative path rather than the
local vendored one, an inconsistency of its own, disclosed below). The
workflow's own `diff` claim (byte-identical bodies, drifted comments) was
re-verified directly and held, with one correction: the finding described
the difference as purely cosmetic prose plus "one cosmetic string." Reading
both in full found that string is not cosmetic — it is the ONE genuine
functional-text discrepancy between the two copies, and tracing it further
found a third, independent copy of the same table
(`native/organs/void-holarchy.js`) that helped establish which side was
actually stale.

**The actual defect.** The-fold's own file header carries a "NAGARJUNA'S
NOTE (2026-09-16)" correcting the file's philosophical framing: a filler
is never granted completeness on its own say-so, only shown to depend on
what it actually covers ("void" as Nagarjuna's dependent origination, not
a bare hole). But the-fold's own `VOID_OPERATORS` table — the actual data
the file's `declareVoid`/`undeclaredOf` surface to a caller — still read
the PRE-correction phrasing for the EVA row: `"the test a candidate must
pass to fill any of it"` (a completeness-by-passing-a-test framing, the
exact thing the header note says is wrong), in both the header's own
worked-example table and the executable `VOID_OPERATORS` array.
eoreader7's copy had already received the fuller correction in both
places (`"what a candidate must be shown to depend on before it counts as
covering any of this — never granted on its own say-so"`). Confirmed
this was the actively-corrected side, not an unrelated fork, by checking
the third copy: `void-holarchy.js` (cluster (c) of the same finding, a
separate reimplementation with its own documented hardcoded-grain bug)
still carries the OLD, pre-correction phrasing verbatim — consistent with
the-fold's copy simply never having received the fix its own header
already claimed, rather than eoreader7 having invented a divergent
reading.

**Verification before touching anything.** `grep`-confirmed the ONLY
non-comment line difference between the two files (filtering the `diff`
output to lines not starting with `//`/`*`/blank) was the single
`VOID_OPERATORS` EVA-row string; confirmed no test in either repo asserts
that literal string (`grep` across both trees found only the three source
files, never a `.test.` file).

**What shipped.** Ported eoreader7's corrected phrasing into the-fold's
copy, in both places (the header's worked-example table and the
executable `VOID_OPERATORS` EVA/REC rows) — the same direction as the
`ground-ladder.js` entry's `forms` port, the-fold receiving a fix
eoreader7's copy already had. Re-diffed and confirmed zero non-comment
differences remain between the two files. Did NOT force the two files'
header PROSE to full byte-identity (unlike `ground-ladder.js`, where the
missing piece was real functionality) — the remaining comment differences
are independent, non-contradictory elaborations of the same 2026-09-16
correction, not a defect.

Verified: the-fold's `void-shape.test.mjs` (21/21); `void-loop.test.mjs` +
`void-brief.test.mjs` (69/70, the one failure is `seg.test.mjs`'s own
pre-existing missing-`mathjs`-package environment gap, confirmed via
`git stash` to reproduce identically without this change); eoreader7's
`native/tests/ground-attention.test.js` (8/8) and
`native/tests/document-ledger*.test.js` (14/14), both real importers of
one of the two copies; `native/eval/the-fold/void-loop-e2e.mjs` run live
end to end (the exact Lincoln/FDR specimens from the file's own header,
producing correct `bound`/`contradicted`/`unbound` verdicts and a covered
fold) — this driver exercises the-fold's REAL repo copy, cross-repo, and
confirms the reconciled file works under both consumption paths.

**Not done, disclosed rather than implied complete:** the two files remain
two physical copies, for the same reason as `ground-ladder.js` — the-fold
still has 12 active local importers building its own `/void` pipeline
(`void-brief.js`/`void-loop.js`/`void-narration.js`), and collapsing to a
shim is the same "does the-fold keep an offline/fallback mode" question
`ONE-ENGINE-PLAN.md` leaves open, not a call this entry makes unilaterally.
`void-loop-e2e.mjs`'s own cross-repo-direct import (bypassing eoreader7's
local vendored copy entirely) is left as-is — now harmless since the two
copies compute identically, but still worth flagging as the same
"double-carriage drift" risk class this document's ground-ladder.js entry
already names, should the two copies diverge again. The wider finding's
clusters (b)/(c)/(d)/(e) — `void-holarchy.js`'s own hardcoded-grain bug,
`void-satisfaction.js`, `void-outline.js`, `void-spec.js`/`skeleton.js`,
and `kernel/notes.js`'s unrelated same-name `declareVoid` — are untouched;
each was independently confirmed (not merely asserted) to be either a
genuinely distinct mechanism or a separate, already-disclosed bug outside
this entry's scope.

---

*Entries below this line are added as the wider research pass's findings
clear verification. An unverified hypothesis is never listed here as a
finding — it stays in the research transcript until read, tested, and
either confirmed or refuted.*
