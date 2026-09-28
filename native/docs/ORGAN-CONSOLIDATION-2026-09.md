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

## 4. `kind-memory.js` — two real duplicates, closed within eoreader7 (2026-09-28)

**What it is.** `kind-memory.js` (`native/the-fold/`) is the "second
sonnet costs a lookup" organ: SIG signs a learned paradigm provisional on
its first source, CON confirms it once a second distinct source
corroborates it, DEF/REC refute and supersede. Its own header states it
directly: "Recall returns a paradigm shaped exactly like paradigm.js's,
so evaluateParadigmEmergent scores against it with nothing rehydrated by
hand" — the finding checked whether the code actually kept that promise.

**The two real duplicates, verified by reading both sides.**

1. `kind-memory.js`'s `kindSources`/`confirmIfCorroborated` re-derived,
   field for field, the identical distinct-alive-sources counting test
   `kernel/corroboration.js`'s `corroboration`/`confirmKind` already
   perform — even though `kind-memory.js` already imports
   `CANONICALIZATION_FLOOR` from that exact file. `corroboration.js`'s own
   header already names this: it was extracted in the first place because
   three independent callers (mnemonic.js, expertise.js, kind-memory.js)
   had reached for the same test separately — the extraction moved the
   shared constant but left kind-memory.js's own Set-of-distinct-sources
   loop duplicated under a different field vocabulary (`learnings`/
   `superseded` vs `occurrences`/`falsified`).
2. `kind-memory.js`'s `recognizeKind` recomputed, statement for statement,
   the exact arithmetic `paradigm.js`'s `evaluateParadigmEmergent` already
   performs (same `held/scored.length` score, same `ABSENT === "(absent)"`
   sentinel, same `satisfies: score >= cut` verdict) — without ever calling
   it, despite the file's own header claiming this exact equivalence.

**What shipped.** `corroboration.js` gained one new exported primitive,
`aliveSources(store, concept, { entryOf, occurrencesOf, aliveOf, sourceOf
})` — the actual Set of distinct alive sources `corroboration()` was
already computing internally and only ever reporting the size of, now
reusable by a caller that needs the sources themselves (not just their
count). All four accessors are optional and default to exactly
`corroboration.js`'s own pre-existing shape
(`store.concepts[concept].occurrences`, `.falsified`), so every existing
2-argument call (`kind-universe.js`, `expertise.js`,
`tacit-corroboration.js`) is byte-identical to before — verified, not
assumed, by running each of their own test suites unmodified.
`kind-memory.js`'s `kindSources` now calls `aliveSources` with its own
accessors (`store.kinds[name].learnings`, `!l.superseded`) instead of
reimplementing the Set logic; `confirmIfCorroborated` is otherwise
untouched (it still returns its own richer `{kind, status, corroboration,
revision}` shape, which nothing in `corroboration.js`'s own `confirmKind`
return shape — `{confirmed, corroboration}` — would have satisfied without
breaking `kind-memory-falsify.test.mjs`'s `r.status` assertion, checked
directly before assuming a straight swap was safe). `recognizeKind` now
calls `evaluateParadigmEmergent(recallKind(store, n), unit)` directly
instead of its own hand-rolled loop.

**Falsification, not just a passing suite.** Added a new regression case
in `kind-memory-falsify.test.mjs` that cross-checks every field of
`recognizeKind`'s per-kind scored entries (`score`/`held`/`of`/
`satisfies`) against an independent direct call to
`evaluateParadigmEmergent(recallKind(...), candidate)` across three
different candidates. Verified this test is a real guard, not a
tautology: reverted `recognizeKind` to a deliberately-wrong hand-rolled
denominator (`r.all.length + 1`), confirmed the new test (and one
pre-existing test) both failed with a diagnostic pointing at the exact
diverged field, then restored the fix and confirmed both pass again.

Verified: `kind-memory-falsify.test.mjs` 8/8 (7 pre-existing + 1 new);
`paradigm-falsify.test.mjs` + `paradigm-plurality-falsify.test.mjs` 18/18
(untouched, confirming paradigm.js itself needed no change);
`surface-findings.test.js` + `revision-volatility.test.js` +
`settling.test.js` + `consequential-surprise.test.js` 30/30 (kernel-level
consumers of `corroboration.js`); `expertise-falsify.test.mjs` +
`expertise-agent-falsify.test.mjs` + `tacit-corroboration.test.mjs` 35/38
(3 skipped, 0 failed — the two other real live callers of
`corroboration()`/`confirmKind()`); `mnemonic-shapes.test.mjs` +
`mnemonic-falsify.test.mjs` 14/15 (1 skipped); the full `native/the-fold/`
suite (511 tests) shows the identical 5 pre-existing failure names with
and without this change (confirmed via re-run), none naming kind-memory,
corroboration, or paradigm.

**Not done, disclosed rather than implied complete:** the workflow's own
finding also named `kind-universe.js` as a plausible second consumer of
the new `{occurrencesOf, aliveOf}` accessor pair ("so both kind-memory.js
and kind-universe.js share one CON implementation instead of two
independently-typed copies of the same test") — checked, and found not to
apply: `kind-universe.js` already calls `corroboration.js`'s
`corroboration`/`confirmKind` directly with the default shape (it re-
exports them unchanged, per the grep in this entry), so there was no
second copy on that side to close. `paradigm.js`'s own `evaluateParadigm`
(the non-emergent sibling of `evaluateParadigmEmergent`) was read and
confirmed to be a genuinely different function (a different feature
family, `scoreFacts` rather than a bare filter) — not a third instance of
this duplication, and left untouched.

---

## 5. `prosify.js` / `flesh2.js` — the shared admission shell lifted, one real bug fixed along the way (2026-09-28)

**What it is.** F1 (`prosify.js`) and F2 (`flesh2.js`) are the two prose-
generation stages of the essay pipeline: each draws text from the model,
splits it into candidate units, and runs every candidate through
`admission.js::admit()` to decide what actually joins the piece (P4's "two
roads" — new matter, or motion that continues the prior landing).

**The verified duplicate.** Both files hand-rolled an identical `admitAll`
closure — the split-into-units loop, the `without`-scoped registry copy
(a temporary Set with one candidate's own claim/matter words removed, for
a redraw that must not see its own prior attempt as already-deposited),
the deposit-twice bookkeeping, and the refusal/survivor/road accounting —
around a call to `admit()`. Reading both side by side found the shells
were mechanically the same and only the injected predicates differed —
except one place where flesh2.js's copy had quietly gotten WEAKER than
prosify.js's, not just differently-shaped: flesh2.js's `continues`
fallback (used when a draft carries no `.referents` index) compared whole
strings — `A.some((n) => B.includes(n))` over single-element arrays,
which is really `candidate === priorLanding` — while prosify.js's fallback
used `eot-draft.js`'s `namesOf` to check for a shared proper name. A
candidate is essentially never byte-identical to the sentence before it,
so flesh2.js's fallback path could not recognize a genuine continuing
turn as motion at all; it could only ever admit via the "matter" road.

**What shipped.** `admission.js` gained `admitCandidates(text, {...})` —
the shared shell, with every essay-domain predicate (`isMeta`, `invented`,
`continues`) kept as caller-injected parameters rather than hard-imported
into `admission.js` itself, preserving this file's own stated law ("this
file must not know what a river is, an essay is, or a name is"); only
`isGrounded` gets a real default (built from `admission.js`'s own local
`matterWords`, since both callers already built it identically). Both
`prosify.js` and `flesh2.js`'s `admitAll` are now thin closures that
forward to it, supplying their own `invented`/`continues`/`isMeta`
exactly as before — `flesh2.js`'s `continues` fallback now uses the SAME
`namesOf`-based check `prosify.js` already had, closing the weakness
rather than merely relocating it. `prosify.js`'s own local `unitsOf`
(the line/sentence splitter `admitCandidates` now performs) was deleted;
unused imports (`admit`, `deposit`, `matterWords`, `claimCore`,
`stripMouthQuoting`) were dropped from both files where the refactor left
them unreferenced.

**Falsification, not just a passing suite.** Added a direct unit test in
`flesh2-falsify.test.mjs` constructing a candidate that shares a proper
name with its prior landing but is forced ungrounded
(`isGrounded: () => false`, isolating the `continues` path alone):
confirmed the namesOf-based fallback admits it as motion, and — in the
same test — confirmed the OLD whole-string-equality fallback, run side by
side against the identical fixture, correctly does NOT. The first draft
of this test used a shared common noun ("plan") and passed for the wrong
reason (masked by an incidentally-grounded fixture and by `namesOf` only
matching capitalized proper-name runs, not common nouns) — caught by
reading the actual failure output rather than trusting the first green
run, and rebuilt with a real capitalized shared name plus a forced
`isGrounded: () => false` to isolate exactly what the fix changes.

Verified: `admission-falsify.test.mjs` + `fiction-admission-falsify.test.mjs`
53/53 (the new export is additive, `admit()` itself untouched);
`prosify-falsify.test.mjs` 18/18; `flesh2-falsify.test.mjs` 4/4 (3
pre-existing + the 1 new fallback-comparison case); `pipeline-run.mjs`'s
module graph confirmed to still resolve and load cleanly (its own
integration path, the actual production wiring point); the full
`native/the-fold/` suite (512 tests) shows the identical 5 pre-existing
failure names before and after, none naming admission, prosify, or
flesh2.

**Not done, disclosed rather than implied complete:** `finish.js`'s
`arrive()` (a related, separately-named duplicate against
`loop-check.js::measurePiece()` in the same batch-B finding) is a
different function pair, not touched by this entry — left for its own
pass. `wiki-base.js`, `archon-rules.js`, and `pipeline-run.mjs` consume
`anchorsFor`/`carries` from `prosify.js`, which this entry did not touch
at all (only the `unitsOf`/`admitAll` section changed).

---

## 6. `finish.js`'s `arrive()` vs `loop-check.js`'s `measurePiece()` — closed (2026-09-28)

**What it is.** `arrive()` is the FINISH stage's own completeness check
(one of the four `signals` a piece must clear to be reported "arrived":
every statement carried, every planned turn taken, nothing said twice, no
decorative tics left). `measurePiece()` is the loop-judging measurement
every spiral loop is scored against (`judgeLoop`'s truth-first ordering:
carried facts, then answered questions, then findings still licensing a
revision).

**The verified duplicate.** Both functions ran the identical
`anchorsFor(draft)` → `drawnParts(draft).flatMap(...)` → per-id
`carries(anchor, texts).ok` walk over the SAME draft and SAME assembled
text — `arrive()` to list which ids were NOT carried (`uncarried`, for its
detail report), `measurePiece()` to count which WERE (`carried`, for
`judgeLoop`'s comparison). Same computation, opposite halves of the same
partition, written independently in two files.

**What shipped.** `loop-check.js` gained `carriedStatements(draft, texts)`
— the one anchors/carries walk, returning `{ids, carriedIds,
uncarriedIds}` so a caller needing the count and a caller needing the list
both read the same pass rather than either re-running it. `measurePiece()`
now derives `carried`/`of` from it; `finish.js`'s `arrive()` now imports
`carriedStatements` from `loop-check.js` and reads `uncarriedIds` directly
instead of re-running its own local `anchorsFor`/`carries` loop.

**A real bug caught by running the tests, not shipped.** The first cut of
this edit removed `arrive()`'s local `const all = drawnParts(draft)...`
declaration along with `anchors`, having grepped only for `anchorsFor(`/
`carries(` calls — a SECOND, later use of the bare `all` identifier
(`for (const id of all)`, building the `twice` — "said in two parts" —
signal) was missed by that grep and was still there. `finish-falsify.
test.mjs`'s own "ARRIVE names every missing signal" case failed immediately
with `ReferenceError: all is not defined`, caught before this was ever
committed. Fixed by also destructuring `ids` (renamed `all` at the call
site) from `carriedStatements`'s return, and confirmed with a full,
line-by-line re-scan of the function body (not just another grep) that no
further stray reference remained.

Verified: `loop-check-falsify.test.mjs` 6/6 (the new export is additive,
`measurePiece`'s own return shape unchanged); `finish-falsify.test.mjs`
22/22 (21 pre-existing + confirming the one real regression above is
fully fixed, not merely silenced); `pipeline-run.mjs`'s module graph
still resolves and loads; the full `native/the-fold/` suite (512 tests)
shows the identical 5 pre-existing failure names before and after, none
naming finish, loop-check, or carriedStatements.

---

## 7. `reader-bundle.js` — a silent production correctness gap closed (2026-09-28)

**What it is.** `reader-bundle.js`'s own header states its purpose
directly: it is "the same `RELATION_READER_OPTIONS` the-fold's `app.js`
builds... sourced entirely from this repo's `native/` tree... so there is
exactly one implementation of 'the material's own edges' once this is
what the proxy turn feeds its reading surface from." It is the live
relation reader behind `proxy-runner.mjs` (production), `cli/reason.mjs`,
and `swarm-server.mjs`.

**The verified gap.** `organs/hypergraph.js::makeRelationReader` declares
`objectSpecificity = false` by default (read directly, line 930) — a
narrowing gate that, when enabled, requires an agreeing edge to state
EVERY content token of a claim's object (stem-tolerant) before binding,
rather than the below-`CORPUS_MINIMUM` fallback of one shared token. The
organ's own comment names the exact historical defect this closes: "the
Royal Society in 1887" binding to "the Northgate Observatory in 1887" on
the shared token "in 1887" alone (P36/P100's "wall 6") — and states
plainly that "a live turn's retrieved passages are always sub-floor," so
this fallback is not a rare edge case, it is the ordinary case for every
real turn. The-fold's `app.js` (line 1083) has carried `objectSpecificity:
true` since P100 closed this. `reader-bundle.js` never set it — confirmed
by reading the whole file and by `grep` (zero occurrences of the string
anywhere in it before this fix) — so the engine's own production relation
reader, despite the file's own stated purpose, was missing a documented,
already-fixed-once correctness gate the browser path has carried for
weeks.

**What shipped.** One option added to the options object
`makeEngineRelationReader` passes to `makeRelationReader`:
`objectSpecificity: true`, matching app.js's own setting and comment
verbatim in spirit. Because the mechanism only ever NARROWS an agreeing
edge set down (`specific = agree.filter(...)`, confirmed by reading
hypergraph.js's own code, never a superset of `agree`), this can only
ever downgrade a false `bound` to `unbound` — it cannot introduce a new
false positive, which is why this was safe to enable without a wider
behavioral audit of every existing caller.

**Falsification, and a disclosed limit reached honestly.** `reader-
bundle.js` had NO dedicated test file before this entry — created
`native/the-fold/reader-bundle.test.mjs`. A full, from-scratch, real-
prose end-to-end reproduction of the "wall 6" specimen through this
bundle's own `extractorsMode: "dispatch"` (GFP) path was attempted
directly — a real two-sentence fixture, then product-assay.mjs's own
real four-sentence northgate corpus (both files of its `CORPUS` fixture,
matching its exact `chunkSource`/`pool` calling convention) — and did not
succeed inside this pass's time budget: GFP dispatch's own candidate-
vocabulary discovery came back empty for the fabricated sentence in every
variant tried, for reasons investigated and found to be UNRELATED to
`objectSpecificity` (confirmed live by removing hypergraph.js's own
`try {} catch { heard = []; }` around the extraction call and finding no
exception was ever thrown — the vocabulary itself was genuinely empty,
a GFP-dispatch-mode behavior this pass did not have time to fully trace).
One false lead was chased and ruled out along the way: `reader-bundle.js`
reads an older, unreconciled POS-prior file
(`native/priors/pos-eng.json`, 16,654 train-split-only forms) rather than
the P74-reconciled canonical one
(`native/eval/the-fold/fixtures/pos-prior-eng.json`, 19,341 forms) — a
real, separate staleness note (already flagged in the unexecuted
"generation-pipeline batch D" finding's `pos-prior.js` recommendation,
not this file) — but direct testing of `classifyWord`/`dominantClass`
against BOTH files confirmed they classify identically for the specimen
verb tested; this was not the cause of the empty vocabulary and is left
unfixed here as out of this entry's scope.

Given the mock-the-organ approach was also tried and is blocked by ESM's
read-only named-export bindings (`Cannot assign to read only property
'makeRelationReader'`), what shipped instead is a source-level regression
test (confirmed, by running it against the pre-fix file, to genuinely
fail there) plus a live smoke test that the bundle's real production
entry points build and run without throwing against real material — a
lighter guard than a full behavioral reproduction, disclosed as exactly
that rather than overstated.

Verified: `reader-bundle.test.mjs` 3/3 (all 3 confirmed to fail
appropriately against the pre-fix file before the fix was applied, not
only to pass after); `proxy-runner.mjs` and `swarm-server.mjs` module
graphs still resolve and load (`cli/reason.mjs` fails on a pre-existing,
unrelated missing `mathjs` package, confirmed via `git stash`); the full
`native/the-fold/` suite (515 tests) shows the identical 5 pre-existing
failure names before and after.

**Not done, disclosed rather than implied complete:** the full live
behavioral reproduction of the wall-6 specimen through this exact bundle
remains unbuilt — a real, scoped follow-up, not silently abandoned. The
stale-POS-prior-file staleness note is real but unfixed here (out of
scope; tracked separately in the unexecuted batch-D finding). Whether
GFP dispatch's own vocabulary-discovery floor genuinely needs a richer
corpus than was tried, or has a real defect of its own unrelated to this
entry, is unresolved and worth its own investigation before anyone
trusts this bundle's dispatch-mode extraction on short, synthetic
fixtures specifically (it may work correctly at realistic prose scale,
which every existing production and eval caller uses it at).

---

*Entries below this line are added as the wider research pass's findings
clear verification. An unverified hypothesis is never listed here as a
finding — it stays in the research transcript until read, tested, and
either confirmed or refuted.*

## 8. `answer-record.js` (native/the-fold/) — disclosed, not merged (2026-09-28)

Same shape as `earned-cast-practice.js` (above): eoreader7's copy is a
frozen, one-time vendored snapshot (222 lines, landed whole in checkpoint
commit `a63be3c`, 2026-09-26) of the-fold's canonical, still-evolving
`answer-record.js` (400 lines). It now lacks the satisfaction/logos/
ledgerLint/ungrounded disclosure fields, the expectation/open/mechanical
params on `answerRecord()`, per-claim scope/ground, `answerRecordForReading()`,
the `LINT_PHRASES`/`lintKinds` helpers, and `bareLogic()`.

Confirmed this is not a live bug: `proxy-runner.mjs` (the only caller in
eoreader7) calls `answerRecord()` with base fields only and embeds the
whole return value opaquely (`reading.answerRecord`), never calling any of
the newer helpers; `dialogue.js` only imports the byte-identical `claimKey`.
Added a comment-only disclosure header stating this plainly (22 insertions,
0 executable lines changed) — mirroring the sibling precedent's format —
and naming the safe path forward if eoreader7 ever needs the newer fields
(a fresh one-time re-copy of the-fold's file, never the reverse, followed
by re-running `cli/tests/proxy-api-reading.test.mjs`).

Verified: `cli/tests/proxy-api-reading.test.mjs` 15/15 before and after,
identical. Full `native/the-fold/*.test.mjs` suite: same pre-existing
failure names, unchanged.

## 9. `dialogue.js` (native/the-fold/) — the-fold's three additive fixes ported (2026-09-28)

The-fold's copy was confirmed a strict superset of eoreader7's vendored
one (no capability the eoreader7 copy had that the-fold lacked), so this
port is one-directional and additive. Ported verbatim:

1. `fold()`'s regex widened from `/[̀-ͯ]/g` to `/[̀-̅̇-ͯ]/g` — NFD
   decomposes Cyrillic й/Й into и/И plus U+0306 COMBINING BREVE, a
   different letter of the alphabet, not a decorated и; stripping it the
   same way as an accent mark collapsed мой/мои (two distinct real words)
   to one string. Reproduced live before the fix: `fold("мой") ===
   fold("мои")` is `true`; after, `false`. Latin accent folding
   (Natásha/Bezúkhov) is byte-identical before and after.
2. `LOCAL_ANTECEDENT_NP_RE`/`SENTENCE_SPLIT_RE`/`hasLocalAntecedent()`,
   threaded through `bindAnaphora()` as a fifth `local` field — a same-
   sentence determined noun phrase before a pronoun vetoes the cross-turn
   fallback (P31's shape: a string can refuse a claim, never make one).
3. A fifth `voids` parameter on `expectationFrom()`, a new `scopePhrase()`
   helper, and voids-aware `expectationFacts()` rendering — the declared
   absences ride beside what the material states, phrased in words rather
   than interpolated as a raw object (which had been stringifying to the
   literal text `"[object Object]"`, a real formatting bug caught live).

Ported the one self-contained regression from the-fold's `dialogue.test.mjs`
("fold() does not corrupt Cyrillic й") as a new
`native/the-fold/dialogue.test.mjs` (importing only `fold`) — confirmed it
fails against the pre-fix file with the real collision
(`мой`/`мои` both folding to `мои`) and passes after. The-fold's full
`dialogue.test.mjs` was deliberately NOT mechanically copied — it imports
four other the-fold files (`correction.js`, `answerable.js`,
`transcript.js`, `cast.js`) not vendored here, which would drag in a much
larger scope; that remains named, unexecuted future work (`resolutions.js`
needing `transcript.js::lastOwnTurn`, tracked separately).

Verified: full `native/the-fold/*.test.mjs` (516 tests): 510 pass / 6 fail,
same 6 pre-existing failure names as before this change (unrelated —
dependency indexing, form-referent resolution, paradigm-plurality
scaling, PDF reading), plus the new regression passing. `native/organs/
what.test.mjs` (resolutions.js's real, direct consumer via `referentsOf`/
`fold`): 10/11 pass both before and after, the one pre-existing failure
unrelated (a `capacities.js` registration check) and unchanged by name.

## 10. `profile.js` (native/the-fold/) → `statement-profile.js` — name collision resolved (2026-09-28)

Pure rename, eoreader7 side only — nothing in the-fold changes. The two
`profile.js` files (the-fold's turn-record propose/keep/dismiss log vs.
eoreader7's `EOStatementProfile@1` cube-address terrain/stance ledger)
share zero exports, zero data shape, and zero cross-repo coupling
(confirmed by exhaustive grep for every plausible cross-reference in both
trees) — this was a pure discoverability hazard, not a functional risk,
made concrete by `earned-cast.js`'s own same-day header showing files in
this exact directory (`native/the-fold/`) do graduate to live cross-repo
use without warning.

`git mv native/the-fold/profile.js native/the-fold/statement-profile.js`
(matching its own `PROFILE_SCHEMA = "EOStatementProfile@1"` and
`profileStatements` entry point), plus the three real importers'
specifier strings (`arc.js`, `profile-falsify.test.mjs`,
`native/eval/the-fold/skeleton-arms.mjs`) and the two doc references in
`plans/generation-terrain-stance.md`. The full-file rename to a more
descriptive name (matching e.g. `arc.js`/`arc-falsify.test.mjs` sibling
naming) was deliberately left as a smaller, separate follow-on rather than
bundled in.

Verified: `node --test native/the-fold/profile-falsify.test.mjs
native/the-fold/arc-falsify.test.mjs` — 9/9 pass, unchanged. Grep
for the old path/specifier string (`"./profile.js"`, `"the-fold/
profile.js"`) across both repos: zero remaining hits.

## 11. `reading-log.js` (the-fold, canonical side) — a real crash fixed (2026-09-28)

Not a hypothetical drift: reproduced the crash directly. The-fold's
`foldReading` (line 84) iterated `e.provenance ?? []` unconditionally with
`for...of` — fine for an array-shaped provenance, but eoreader7's own
`discourse-referents.js::projectState` (called from `revision.js`'s
`reviseTextFold`, which the-fold's `reading-worker.mjs` imports directly,
not vendored) emits a real `EOReferent@1` with `provenance:
Object.freeze({giver, basis})` — a single OBJECT, not an array. Feeding
that shape into the-fold's live `foldReading` threw
`TypeError: object is not iterable`; the same input against eoreader7's
own vendored copy (which already branches on `Array.isArray`) returned
cleanly. Reproduced end-to-end with real prose from the project's own
Frankenstein corpus (`appositionalDescriptorBindings("I beheld the
wretch—the miserable monster whom I had created.")`) producing exactly
this shape.

Back-ported eoreader7's `Array.isArray(prov)` branch verbatim (with its
comment) into the-fold/reading-log.js. Added one regression test building
an `EOReferent@1` entry with object-shaped `provenance` and asserting
`foldReading`/`readingIndexFromLog` complete without throwing and the
object survives. Left as explicitly deferred future work (not done here):
the source.js-style re-export-shim flip (the-fold's file becoming a thin
re-export of eoreader7's canonical copy) — a real architectural move tied
to a broader, not-yet-executed dependency-direction decision; and fixing
4 outlier eval scripts under `native/eval/the-fold/` that cross the repo
boundary to import the-fold's original file directly rather than the
local vendored copy — lower-stakes now that step 1 has landed (they'd be
importing a fixed copy instead of a buggy one), scoped as its own
follow-up.

Verified: `node --test reading-log.test.mjs` (the-fold) — 10/10, the
existing 9 plus the new case. Full the-fold suite (`*.test.mjs
goldens/*/*.test.mjs`, 2635 tests): identical 54 failure names with and
without this change (confirmed via `git stash`/`git stash pop` A-B
comparison) — zero regressions.

## 12. `shape.js` (native/the-fold/) — `SHAPE_SCHEMA` name collision resolved (2026-09-28)

Two files named `shape.js` (the-fold's grammar-decoded answer-cardinality/
form-verification module vs. eoreader7's Stage-4 web-corroborated
document-shape-learning module) each export a constant named
`SHAPE_SCHEMA` with an incompatible value — the-fold's is an object
grammar schema, eoreader7's is the string `"EOShape@1"`. Confirmed the two
files share zero code, zero data shape, and zero cross-imports; the live
engine surface (`proxy-runner.mjs`) imports neither directly, so this was
a pure discoverability hazard, not a functional risk.

Renamed the exported constant in eoreader7's copy only —
`SHAPE_SCHEMA` → `LEARNED_FORM_SCHEMA` — keeping the string value
`"EOShape@1"` unchanged as the schema id. Confirmed the identifier has
zero other references anywhere in either repo before renaming (its two
importers, `shape-falsify.test.mjs` and `pipeline-run.mjs`, never
reference it by name). The larger, separate step (renaming the file
itself, e.g. to `genre-shape.js`) was deliberately left as a follow-on,
not bundled into this constant-only fix.

Verified: grep for `SHAPE_SCHEMA` across both repos returns only the
renamed definition; `node --test native/the-fold/shape-falsify.test.mjs`
— 9/9 pass.

## 13. `source.js` (native/the-fold/) vs `organs/source.js` — a drift guard, no code change (2026-09-28)

The vendored copy (native/the-fold/source.js) exists deliberately, its
own header says so: a second copy of `tokenize`/`foldDiacritics`/
`isNumeral`/`STOPWORDS` out of the canonical organ, so this module stays
independent of the organs import graph. That header names its own cost —
"a second copy... that can drift" — and nothing in either repo guarded
against it, the same unguarded-drift class ORGAN-CONSOLIDATION-2026-09.md
already closed for `ground-ladder.js` (entry 1) and `void-shape.js`
(entry 3).

Added one new test, `native/the-fold/source-drift.test.mjs`: a pure
equivalence check running one battery of inputs (plain ASCII/stopwords,
accented Latin — Bezúkhov/Bezukhov, Hebrew with/without nikud, numerals/
percent/hyphen/roman numerals, CJK at both the too-short and
oversized-amalgam cases, diacritic-bearing Cyrillic) through both
`tokenize` implementations and asserting `assert.deepEqual` on every
pair. It does not choose a canonical implementation and changes neither
file — a future re-link of the-fold's own `source.js` shim to import the
vendored copy directly (a FUTURE note already in that file) removes this
test's reason to exist; until then it is what stands between the two.

Verified: `node --test native/the-fold/source-drift.test.mjs` — 1/1
(zero mismatches across the full battery today).

## 14. `resolutions.js` (native/the-fold/) — three real, live fixes ported (2026-09-28)

A ~35-line, single-file, mechanical diff from the-fold's canonical
`resolutions.js`. `dmdCut` and its 3 other real consumers (`what.js`,
`code-name-split.js`'s and `code-structure.js`'s own coverage) are
untouched — proxy-runner.mjs imports this vendored copy for `lensCut`/
`paradigmBlock`/`activeReferents`, fed `notesFromEdges` (no `.spans`
field ever set on that path today).

1. **`lensCut`: the asked act keeps every value.** A note's act
   (`n.verb`/`n.label`) counted as one repeat at DEF cut grain, which is
   right for an act the question does not ask about and wrong for the one
   it does — measured live, "Grant — was born→ in Point Pleasant" and a
   pamphlet's "— in Georgetown" shared the key, sort order kept only the
   first, and the Lens listed Georgetown alone. Added `questionWords`/
   `labelOf`/`asked()`; for an asked act the object now joins the reach
   key, so both candidate objects survive the cut; unasked acts compress
   exactly as before. `lensCut`'s return gained `asked: cut.rows.filter
   ((r) => r.asked).length`.
2. **`paradigmBlock`: recurrence counts places, not witness records.**
   `Math.max((n.witnesses??[]).length, (n.spans??[]).length, 1)` double-
   counted a single sentence read at two grains (a paragraph-level arrival
   plus a sentence-level read of the same bytes) as two witnesses.
   Added `placesOf()`/`RANGE`: a byte-range address counts only when no
   OTHER range of the same source contains it, so nested reads of the
   same bytes are one place. Zero-behavior-change today (this vendored
   copy's own note construction never sets `.spans`), kept for when it
   does. Also ported the act-first phrasing fix ("«was born» is most
   often stated about Grant" rather than "Grant most often stands in «was
   born»") — a bare surname that is also an attested base-form verb
   collided with an imperative detector when it led the sentence.
3. **`activeReferents`/`lensCut`: the last turn, not the array tail.**
   Inlined a 4-line `lastOwnTurn()` (resolutions.js's only consumer —
   vendoring a whole `transcript.js` for one function was rejected as
   disproportionate) so a `chat`-tagged/foreign-conversation row in a
   workspace-spanning transcript is never read as this conversation's own
   last turn.

Added `native/eval/the-fold/resolutions-parity.test.mjs`, porting the-fold's
own two live-specimen regressions (2026-09-16) against the VENDORED file
through eoreader7's real `kernel/activation.js::dmdWindow` and a real
referent index built via a direct cross-repo import of the-fold's
`cast.js` (the same pattern `admission-gate.mjs`/`mine-1-referent-
anchored.mjs`/`mhc-battery.mjs` already use). Did NOT attempt a general
parity/sync mechanism across the ~90 other files under `native/the-fold/`
— named as real, separately-scoped future work.

Verified: `resolutions-parity.test.mjs` 2/2. `native/organs/what.test.mjs
native/tests/code-name-split.test.js native/tests/code-structure.test.js`
(the three other real `dmdCut` consumers) — 27/28, the same 1
pre-existing, unrelated failure as before this change.

## 15. `capacity-runner.js::mergeTestimony` — the two "testimony" pipelines, disambiguated (2026-09-28)

Not a merge — a comment, because the finding's own investigation confirmed
they should never be one. The-fold's witness/testimony/citation family
(`witness.js`, `testimony.js`, `crown.js`, `misquote.js`, `quotes.js`,
`quoting.js`, `links.js`, `primary.js`, `wikidata.js`) and this file's
`mergeTestimony` share the English word "testimony" and nothing else:
`mergeTestimony` operates on `perSourceReadings` — mechanical
`hypergraph.js::judge()` verdicts landed via `grid.js` `evaluate` acts
(the-fold's `app.js::crownTestimony`, the `/facts` composer) — zero model
calls anywhere in that path. The REAL LLM-witness protocol lives entirely
in `organs/testimony.js` (`foldTestimony`/`foldSelect`/`WITNESS_SCHEMA`,
consumed by `corroboration.js::witnessNote` → `witness-sentences.js`/
`ranke.js`/`bridge-witness.js`/`connector-witness.js`) and is never called
from `mergeTestimony`'s own call chain, confirmed by tracing every real
call site in `app.js`/`holon.js` — the two never appear in the same
function body anywhere in either repo.

Added a disclosure comment directly above `mergeTestimony`'s definition
stating this plainly, so a future pass does not attempt to fold the two
pipelines together on the strength of a shared name alone.

Verified: comment-only addition, `node --check` passes, zero behavior
change.

## 16. The holograph-named files — a fresh, current-state audit, 10 real modules, no code duplication (2026-09-28)

A separate, targeted audit (five parallel investigations + direct
re-verification of the two most disputable claims) covered every file with
"holograph" in the name across both repos: `the-fold/holograph.js`
(per-conversation UI render, unwired), `organs/output-holograph.js`
(per-turn binary safety gate — LIVE, "THE HOLOGRAPH ENFORCEMENT" in
`proxy-runner.mjs`), `native/the-fold/proposition-holograph.js` (stateful
essay-composition memory — dead code, only its own test imports it), the
`document-holograph.mjs`/`lib/document-holograph.mjs` driver/lib split,
`holograph-compression.mjs`/`holograph-reading.mjs` (two different eval
measurements), `cli/holograph.mjs` (TUI loader, built+tested, not wired
into the real CLI dispatcher), and the `plans/`-directory demo scripts.

**Verdict: no logic duplication.** Ten distinct code modules doing ten
genuinely different jobs; no falsification attempt (a constructed
swap-input case per pair) succeeded for any live pair. The one place two
files' logic genuinely overlaps (verbatim/inflected triple-matching,
shared between `output-holograph.js` and the dead
`proposition-holograph.js`) sits in code with no live caller, so there is
no active collision.

**What WAS real, and fixed here** (all documentation/wiring drift, not
logic):
1. `native/eval/the-fold/results/document-holograph-RESULTS.md` transcribed
   a `--source <body> --gold <summary>` CLI interface the driver no longer
   supports (replaced by `--run <conversation-dir> [--question]`, S65) —
   added a note pointing at the successor
   `document-holograph-constitutional-RESULTS.md`, which already uses the
   current interface.
2. `native/docs/THE-HOLOGRAPH.md` §9's "Pending numbers" line was stale
   against its own §6, which already reports the level-1/level-3
   compression-ladder measurement landed and corrected — split into
   landed (that one comparison) vs. genuinely still-pending (the full
   five-point A0–A1 ladder; both `holograph-reading.mjs` runs, which have
   no results file anywhere in the checkout).
3. `LAVAR.md` cited a specific measured statistic ("ADDRESS 5/23, redealt
   band [0,2] over 199 draws, p=0.0050") attributed to a script,
   `holograph-redeal.mjs`, confirmed absent from the checkout and its
   entire git history — worse than stale, an unreproducible claim of a
   completed run. The redealt-address control it describes is real, but
   lives inside `holograph-reading.mjs` itself (`controlRows`/`CONTROL`
   arm), never a separate file. Annotated the claim as disclosed-but-
   unreproduced rather than silently deleted.
4. `cli/holograph.mjs`'s header cited a nonexistent producer path
   (`native/eval/lavar/holograph.mjs`) for the `EOHolographOutput@1`
   shape it loads. Corrected to name the real producer
   (`OUTPUT_HOLOGRAPH_SCHEMA` in `organs/output-holograph.js`, confirmed
   by direct shape comparison against the two committed sample files) and
   disclose that `lavar-read.mjs` — the file most likely originally meant
   — now writes an incompatible shape that would throw if fed to this
   loader; which run produced the committed samples is not recoverable
   from the current checkout.
5. `plans/metro-code/build-holograph-surface.mjs` hand-duplicated the
   `EOHolographOutput@1` schema string instead of importing
   `OUTPUT_HOLOGRAPH_SCHEMA`. Fixed to import the real constant; confirmed
   the regenerated `holograph.json`/`metro-code-holograph.html` outputs
   are byte-identical to before (a true no-op refactor).

**Named, not fixed:** `app.js::holographIndex()` (the-fold) still builds a
presence index (`discoverReferents(extractSurfaces(...))`) rather than
reading the constitutional reader's log via `READING_CONSTITUTIONAL` —
exactly the violation THE-HOLOGRAPH.md §7 already names, which the general
P176 fix landed elsewhere in `app.js` but never reached this specific
caller. Left unfixed here deliberately: `holographModel()` (its only
caller) has zero callers of its OWN anywhere in the repo, so this is inert
today, and `app.js` is a large, actively multi-session-edited file this
consolidation effort does not otherwise reach into — a real, scoped,
disclosed follow-up rather than a speculative fix to unowned code.

## 17. `build-log.js`'s patch physics vs `patch.js` — a parity guard, no code change (2026-09-28)

`native/the-fold/patch.js`'s own header says it is `build-log.js`'s
`PATCH_OPS`/`deriveOp`/`readOps`/`applyOps` ported verbatim — the same
physics twice-typed, the exact class of drift this repo's own postmortems
(P22, P24, P39) keep finding, and nothing mechanically held the two
together.

Added `the-fold/patch-parity.test.mjs`: runs BOTH modules against one
shared battery covering every branch each file's own JSDoc names (every
`deriveOp` outcome — SEG on empty/self-equal add, INS on an after-only
insertion, SYN on a before+after recompilation or a non-containing add;
every `applyOps` outcome — a clean SEG/INS/SYN, an unlocated gap, an
ambiguous gap both refused and rescued via `every: true`, a malformed op,
and the `within`-slice path both in- and out-of-range) and asserts
`assert.deepStrictEqual` on every output pair — behavioral parity, not a
source-text diff (the two files' surrounding comments are deliberately
different). Zero production code changed in either repo.

Verified: `patch-parity.test.mjs` 23/23. `build-log.test.mjs` (the
existing suite): 58/58, unchanged.

## 18. `parse-gated-names.js`/`recursive.js` — a real, live divergence, closed with one shared primitive (2026-09-28)

Two-part finding. (1) DOC FIX: `parse-gated-names.js`'s header (and
`capacities.js`'s registry entry) claimed the module was "STANDALONE AND
UNWIRED" — false. The rule is reimplemented inline in `recursive.js`'s
`createCausalTextPerceiver` and is ON BY DEFAULT in production:
`proxy-runner.mjs::createSessionReader` sets `parseModel` from a loaded
`english-parser.js` model unless `ER7_PARSE_GATED_NAMES=0`, and that
reader is what `runProxyTurn` (`proxy.mjs`'s live chat handler) actually
instantiates per session. This stale text also propagates into
`THE-27-CELLS.md`, which generates from `capacities.js`.

(2) THE REAL BUG, found live against the real trained model
(`parser-eng-ewt.json`): `parseGatedNames()`'s `upostOccurrences(model,
text)` internally re-split sentences via `english-parser.js`'s own
ICU-based `sentences()`, while `recursive.js`'s inline gate tagged each
already-correctly-split sentence from `spans.js::splitSentences` directly.
The two splitters disagree on exactly the name-initial abbreviation cases
`spans.js` was built to fix — "Ulysses S. Grant" splits under ICU into
"...Ulysses S." + "Grant himself.", and the fragment "Grant himself." tags
"Grant" differently than the real, whole sentence does. Reproduced live:
on "The letter was signed by Ulysses S. Grant himself.",
`parseGatedNames()`'s batch output NEVER admitted "Grant" while
`recursive.js`'s inline gate on the identical text correctly did — a real,
present, occurrence-pattern-dependent false negative, not hypothetical.

Fixed by extracting `synPropnFormsForSentences(model, sentences)` — one
shared primitive, taking already-split sentence strings rather than
re-splitting — and having BOTH `parseGatedNames()` and `recursive.js`'s
incremental per-sentence fold call it, so the two can no longer silently
diverge on sentence boundaries.

Added two regression cases to `parse-gated-names.test.mjs`: the real
Ulysses S. Grant specimen (pins "grant" is now admitted), and a harness
feeding sentences one-at-a-time through the shared primitive (mimicking
`recursive.js`'s own incremental accumulation) asserting it produces an
identical admitted set to the batch call — closing "nothing cross-checks
them." Confirmed both new cases fail (the whole file fails to load,
`synPropnFormsForSentences` not yet exported) against the pre-fix files
via `git stash`, pass after.

Deliberately NOT touched, per the finding's own scoping: `existence-grain.js`
(confirmed unused outside its own test and `eval/lavar/`) and whether
`cast.js` should also receive this SVO-gate upgrade — a separate, larger
product decision reserved for explicit sign-off.

Verified: `parse-gated-names.test.mjs` 5/6 (1 skipped — a pre-existing,
per-checkout missing-fixture gap, unrelated). Full `native/adapters/text/
*.test.mjs`: 71/91 pass, 1 pre-existing unrelated failure (confirmed via
`git stash` A/B — identical failure name with and without this change),
19 skipped (missing per-checkout fixtures).
