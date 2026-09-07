# Chorus log — append-only, one entry per lint run

## 2026-09-05 — the audit finished: fixture refusal, four lib/test extractions, audit runner (branch `p94-audit-pass13`, S65 / the-fold P95)

Constitution: `../eo-constitution/CONSTITUTION.md` + this repo's READING-SPEC.md / CLAUDE.md and the-fold's POLICIES.md. Reviewed diff: `git diff --cached` on `p94-audit-pass13` (36 files; new `eval/the-fold/lib/{walk-fixtures,mhc-control,full-circuit,door-probe,object-boundary,reasoning-e2e}.mjs`, six new `tests/*.test.js`, `audit-results.sh`, nine driver edits, S65, eleven results-doc stamps). The ten cell personas were launched as parallel subagents and all ten were terminated by the session rate limit before reporting; the ten lenses were then run sequentially in-session per the skill's fallback, Marshall last.

| persona | cell | citation | file:line | verdict | summary |
|---|---|---|---|---|---|
| Diaconis | NUL | II.23 resolution (a control must be able to fail); III.3 typed gap | lib/mhc-control.mjs:17 | fixed | `keys.length < 2` let `borodino borodino` pass as two materials with a same-content "control"; now `new Set(keys).size < 2`, pinned in mhc-control.test.js |
| Diaconis | NUL | II.23 | lib/object-boundary.mjs `boundedCutGap` `debris === 0` branch | noted, not fixed | material with nothing to cut reads identical arms as honest and cannot tell reachable from unreachable; disclosed in tests/object-boundary.test.js; the Dracula slice always carries debris (730/1590) |
| Feynman | DEF | III.5 "a typed gap no test reads is a report"; IV.4 citation trail | tests/{hyperlexicon-door-probe,reasoning-e2e,object-boundary}.test.js `skip:` | noted, disclosed | the three cross-repo tests skip typed where the-fold is not beside the engine; they run and pass on the `./fold` layout both repos assume, and each header says so; enforcement is real only on that layout |
| Feynman | DEF | IV.4 | results/*-RESULTS.md stamps | clean | every classification in the stamps was checked against the run logs and the tracked-JSON diffs; "reproduces" for pruning-timeline rests on a one-string diff read in full |
| Dijkstra | SEG·Field | III.3 (a wrong number, silently) | audit-results.sh `git diff --quiet -- results/$f` | fixed | measured the working tree against the INDEX; a staged regeneration would read "reproduces"; now `git diff --quiet HEAD --` |
| Dijkstra | SEG·Field | II.5 type error before null | cited-source-null.mjs / ordered-read-reach.mjs module body wrapped in `else { }` | clean | no `export` inside the block, top-level `await` legal, `process.exitCode = 2` set before; both run to exit 2 on this checkout |
| Simon | SEG·Network | S64 (the unmigrated `e.subject` read) | 14 drivers under eval/the-fold still match `e.subject/e.verb/e.object` | deferred-with-reason | several are legitimate fallbacks (`e.end2 ?? e.object`, `edgesOf`, `queryFillers`); each must be read, not counted — NEXT-PASSES Pass 14 item 5 carries the grep and the caveat |
| Simon | SEG·Network | P95 fixture rule | gate-proof.mjs, ranke-walk.mjs, ranke-backwards.mjs | clean | they read faces through `primary-faces/index.json` and already land a typed `not-kept` gap per face; they are fetch/replay drivers, not nulls over a named walk — the rule's scope is the two drivers that pool the walk's faces |
| Frankfurt | INS | III.3; P41 (the instrument's state as a fact) | lib/object-boundary.mjs gap `detail` | fixed | the message asserted the CAUSE (P80, 2214e1a) as if the code had checked it; now states what was verified (identical arms over cuttable material) and dates the recorded cause separately |
| Frankfurt | INS | IV.4 | S65 / stamps: every count | clean | 1,020 / 4 / 6 / 3-3-0, 36/30/18, 16/12/0, 1,590 / 0.459, 373/277/249, 350/338/189, 106/20/86 all read off the run logs and diffs in this session |
| Ostrom | CON | II.9 (a property of the instrument vs the material); P41 | subject-wall / rashomon stamps, S65, P95 | fixed (wording) | drift had been attributed to S63/S64 as cause without isolation; now named as candidates, "not isolated here" |
| Ostrom | CON | III.3 | cited-source-null refusal scope (whole run on one absent face) | upheld | a null's pool is the walk's or it is not comparable; partial pools were the P94 finding; scope is the run by design, stated in the gap |
| Holmes | SIG | P11 identity through the cast; II.23 | lib/object-boundary.mjs `addr()` pairing key | deferred-with-reason | start+label+end1 collides where one sentence yields two edges on one subject and verb — the "moved: 53" artifact on identical arms; the doc's own 782 carried the same key; fix belongs with the referent-aware trim (Pass 14 item 2, now says so) |
| Holmes | SIG | P11 | lib/door-probe.mjs `closed.has(String(n.verb).toLowerCase())` | clean | the hand list is a disclosed measurement instrument, not identity; the new `unattestedLabels` column is the mechanical companion |
| Pearl | EVA | II.22 convergent inference (independent readings) | S65 / reasoning-e2e stamp "identical verdict table" | fixed (wording) | the-fold's hypergraph.js re-exports the engine's — one reader over two adapter providers; corroborates the adapters, not the reader; now says so |
| Pearl | EVA | II.23 | tests/hyperlexicon-door-probe.test.js B == C assertion | clean | B and C differ only by the gate; equality IS the "wall behind a wall" claim and fails the day the gate refuses something |
| Alexander | SYN | III.4 one implementation | drivers vs lib/ | clean | each driver imports its lib; no second copy of the computation remains (full-circuit, door-probe, object-boundary, reasoning-e2e stdout diffed identical before/after the move) |
| Alexander | SYN | — | audit-results.sh map vs tests/ and results/ | clean | every named test exists; every tracked artifact path exists; print-only entries name their gitignored JSON |
| Chekhov | residual | III.5 "prose may not claim wiring" | lib/borodino-ledger.mjs:34 `BOUNDED` flag | deferred-with-reason | points at the `boundedObjects` opt-in the-fold P80 removed; NEXT-PASSES Pass 14 item 2: build the referent-aware trim or remove the flag — not both left standing |
| Chekhov | residual | — | lib/object-boundary.mjs `measureArm`, `redealtBoundary` exports | clean | exported for the test's reach; used by `measureObjectBoundary`; `lcg` in the driver still drives the sample shuffle |
| Marshall | meta | IV.1/IV.2 | POLICIES.md P95, READING-SPEC S65 | upheld — compliant | policy entries, not constitutional amendments; each carries its Generality line (the-fold's generality-gate test passes on P95); enforcement tests ship in the same diff (IV.1's shape) |
| Marshall | meta | citations above | this table | upheld | every citation re-read against the article text; Ostrom's II.9 and Pearl's II.22 apply as stated; no finding struck |

**Fixed this run:** Diaconis ×1, Dijkstra ×1, Frankfurt ×1, Ostrom ×1 (wording), Pearl ×1 (wording). **Deferred with reason, carried in NEXT-PASSES Pass 14:** Simon ×1, Holmes ×1, Chekhov ×1. Suites re-run after the fixes; counts in the commit message.

## 2026-09-05 — S76: the perceivers beyond text crossed under parity; the measuring door over decoded media; frontier-25 (branch `frontier-25`)

Constitution: `../eo-constitution/CONSTITUTION.md` + READING-SPEC.md + the-fold POLICIES.md. Tier 1 (`chorus-fast.sh --working`): law ok (P115, S76 resolve; P19/S17 pre-existing warned), routed Diaconis · Feynman · Dijkstra · Marshall; native suite 655 pass / 0 fail / 1 TODO (pre-existing) · media-perceiver-parity 4/4 · measure-media 5/5 · frontier-25 4/4.

| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Diaconis | II.23 | organs/measure.js:581 (probe's example declaration) | clean | draws 200 is the repo's standing null-arm number the probe already taught for wav; the decoded media use the same door, same nothing, and the two-shot video's `degenerate_ground` is pinned as the honest verdict (tests/measure-media.test.js) |
| Feynman | III.3 | organs/measure.js:486 `frameFloor` 1 vs 2 | clean | a scanline or a transition is one unit; two samples are the least PCM can be heard in — both are the material's own grain, and the refusal text says which |
| Dijkstra | III.4 one implementation | adapters/{image,video}/material.js | clean | crossed verbatim from the frozen provider, ffmpeg spawn included and disclosed; parity 4/4 on identical decoded frames; no second reduce anywhere (measure.js takes the reduces injected) |
| Marshall | IV.1; P71 | READING-SPEC S76, README pointer, CAPACITY-DEVELOPMENT-PLAN addendum | upheld — compliant | S76 carries its Generality line and its enforcement (parity, measure-media, frontier-25 tests) in the same diff; no capacity row added — the plan's addendum says why (a perceiver is a giver, `measure` is the registered organ) |
clean: nothing struck.

## 2026-09-07 — P166 / S78: the tip is extended in place; transience declared by the chain's owner; a superseded turn's fold reconstructed on demand (branch `fold-memory-p157`)

Constitution: `../eo-constitution/CONSTITUTION.md` + READING-SPEC.md + the-fold POLICIES.md. Lenses run in-session over `git diff` of `native/kernel/fold.js`, `native/kernel/reading.js`, `native/eval/read-cost.mjs`, `native/tests/fold-transient.test.js` (new).

| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Diaconis | II.10 | native/tests/fold-transient.test.js (chainView tests) | clean | the hit is asserted as array identity and as a counted compute — a chainView that silently recomputed would fail both; nothing here passes vacuously |
| Feynman | P88 (guard reachability); P159 | native/kernel/fold.js:139–160 header; native/kernel/reading.js:79–80 | **fixed** | the first cut claimed "nothing holds a superseded fold" and extended in place unconditionally; `tests/identity-revision.test.js:20` holds `fold1` and reads it after `fold2` — the claim was false and the suite said so. Transience is now declared by the chain's owner; the public functions stay pure by default |
| Feynman | P159 step 2 (shape AND cost) | POLICIES P166 table | clean | timings are disclosed as contended (the P145 arm ran beside both); the heap column is per-process and is the finding; time is reported as unchanged, not improved |
| Dijkstra | III.4 | native/kernel/fold.js:203–221 `tipOf`, `parent` index copy | clean | ownership is coupled to `STREAM.has && !isFrozen`; a pure copy of an owned tip COPIES the parent's index instead of stealing it, so a what-if branch off the reader's live fold cannot cost the reader a rebuild |
| Simon | P95 (a driver refuses what it lacks) | native/kernel/fold.js `upsertById`/`removeById` | clean | siblings left copy-on-write on purpose and named in S78: `deriveRelease` reads obligations before and after in one step |
| Frankfurt | II.11; P159 step 0 | native/eval/read-cost.mjs:49 | **fixed** | the header's `logHash 45bbbbbd578d027f` had been stale since P165 put the merge record into the log — a recorded number that no longer corresponded to anything; re-verified from a clean worktree of HEAD and corrected with provenance |
| Ostrom | P161 | POLICIES P166 | clean | "time unchanged" is scoped to 3,051 sentences under load; not generalised to "the copy never costs time" |
| Holmes | P1 (identity is retrieval-time) | native/kernel/reading.js:93 accessor | clean | a turn's `fold` is two things and says which: the tip by identity while it is the tip, a reconstruction once superseded — never the tip's arrays wearing an earlier turn's name |
| Pearl | II.10 | gates + suite | clean, with a caveat recorded | `--identity`, `--trace --against` (240 KB, 480 KB) share one instrument — per-step hashes of the TIP — and could not have seen a stale EARLIER fold; the suite (`identity-revision`) is the independent witness and it is what caught the defect. Both are required |
| Alexander | P159 | reading.js accessor ⇄ `reconstruct` transient ⇄ pure default | clean | the parts compose: the accessor's reconstruction owns its own arrays (asserted), the seed's arrays are never mutated (asserted) |
| Chekhov | — | native/kernel/fold.js:143 `isOwned` | clean | exported for the test that pins the invariant, and used there; the old backward `d.removed` path is gone with the chain it walked |
| Marshall | II.10, II.11, IV.1; P71 | POLICIES P166, READING-SPEC S78, CLAUDE.md pointer | upheld — compliant | P166 carries its Generality line and names its enforcement (fold-transient tests, the two gates); no new constant; P157–P165 had never been written into POLICIES.md and are now, from their commit bodies, each with a Generality line (the gate passes 4/4). One defect about the RUN, not the diff, recorded so it is not repeated: the control's progress was read as `wc -l` of turns.jsonl (744) and reported as "744/1000 turns"; the records reach turn 1000 — read the record's own turn, never the file's line count |
fixed: 2 (Feynman: transience declared; Frankfurt: stale header hash). struck: none.

## 2026-09-07 — the discourse projection's time term (branch `fold-memory-p157`, first of the time-term commits)

Constitution: `../eo-constitution/CONSTITUTION.md` + READING-SPEC.md + the-fold POLICIES.md. Lenses in-session over `native/adapters/text/discourse-referents.js`, `native/tests/discourse-incremental.test.js` (new).

| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Diaconis | II.10 | tests/discourse-incremental.test.js | clean | the compute is COUNTED (`discourseStats.computes`): sixty sentences with extras, zero further computes; a spread would fail it at once |
| Feynman | P157 header claim | discourse-referents.js (old header: "twice in a novel") | **fixed** | measured on 60 KB: the slow branch fired on 392 of 926 sentences (42%), not twice — the claim was never measured on this material and the profile (×12.5 growth of the from-scratch lambda) contradicted it |
| Dijkstra | III.4 | `DiscourseState` layer | clean | one implementation serves persistent and layered use; the layer's `gone`/`multi`/`unmulti` sets make deletion and threshold crossing representable without touching the base |
| Holmes | P11 | `projectState` root order | clean | components ordered by their first member's arrival index, groups merged by index — the original's own order, pinned equal to the reference path byte-for-byte |
| Pearl | II.10 | gates | clean | 60 KB identity unchanged; 240 KB (123 steps) and 480 KB (120) byte-identical; the reference-path equality test is a second, independent oracle on synthetic appositions |
| Chekhov | — | old `unionFind` factory | **fixed** | dead since the incremental state landed (its only reference was its own definition); removed |
| Marshall | II.10; P159 | the versioned memo | upheld | the old memo keyed on a state object that `foldStep` mutates in place — stale by construction, harmless only because revision.js ignores known ids; now versioned by (count, seq), pinned by a test that folds a delta and asks again |
fixed: 2. struck: none.

## 2026-09-07 — two more time terms: every known surface in one pass; the hypothesis list maintained (branch `fold-memory-p157`)

Constitution: `../eo-constitution/CONSTITUTION.md` + READING-SPEC.md + the-fold POLICIES.md. Lenses in-session over `native/adapters/text/recursive.js`, `native/adapters/text/individuation.js`, `native/tests/surface-index.test.js`, `native/tests/individuation-incremental.test.js` (new).

| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Diaconis | II.10 | tests/surface-index.test.js | clean | the oracle is the single-surface organ itself over 600 real sentences × 27 surfaces, and the test refuses to pass on misses alone (hits > 100 asserted) |
| Feynman | P157 memo claim | individuation.js (old `HYPOTHESIS` memo) | **fixed** | "an untouched group is the same array, so it hits" was true of the overlay and false of the chain path, where `push` grows the array in place — a stale memo, harmless only because the consumer ignores known ids; versioned by length now, pinned by a test that grows a group by a delta |
| Dijkstra | III.4 one implementation | recursive.js `surfaceIndex`/`surfacesIn` | clean | one boundary rule, `containsSurface`'s, reached two ways: word-start `startsWith` for needles that begin with a letter or digit, the regex path per needle for the rest; nested surfaces both report (no alternation) |
| Simon | P95 | `taskTargetOccurrences` | clean, named | still asks `containsSurface` per task target — a handful per sentence, left as is |
| Holmes | P11 | `referentsInSpan`, `witnessRelatedPairs` | clean | hits sorted by the map's own insertion order, so grouping-by-first-hit and the first-three cut reproduce the original exactly; the gates confirm on 480 KB |
| Ostrom | P161 | this entry's numbers | clean | 240 KB profile 15.7 s → 5.2 s under the same arm load; not generalised beyond that material and size |
| Pearl | II.10 | gates + tests | clean | 60 KB identity unchanged; 240 KB (123) and 480 KB (120) byte-identical; incremental == fresh-compute pinned at every one of 40 steps with and without extras |
| Chekhov | — | `descriptorHypotheses` (fold-only) | clean | returns the state's frozen list, the same array while nothing changed (asserted) |
| Marshall | II.10, II.11 | both files | upheld | no new constant; no timing asserted anywhere — structure only (identity, equality, counted hits); the `place()` re-index that showed at 7% self was replaced by a binary search before this landed |
fixed: 1. struck: none.

## 2026-09-07 — the 480 KB cliff, part 1: no-op updates, updates handled in place by the views, same-object re-index skipped, the relation matcher built per vocabulary (branch `fold-memory-p157`)

Constitution: `../eo-constitution/CONSTITUTION.md` + READING-SPEC.md + the-fold POLICIES.md. Lenses in-session over `kernel/fold.js`, `kernel/hypergraph.js`, `adapters/text/discourse-referents.js`, `adapters/text/individuation.js`, `adapters/text/relations.js` and their tests.

| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Diaconis | II.10 | tests/fold-transient.test.js (no-op), tests/discourse-incremental.test.js (update) | clean | both directions asserted: a same-object re-upsert leaves the array and every view untouched; a value differing in one field IS an update and the view recomputes for it |
| Feynman | P159 step 2 | this entry's own numbers | **disclosed** | the update census I ran counts ids seen twice in the LOG, so it could not show the no-op skip's effect (the log is unchanged by design); the 480 KB profile after the batch moved 79.2 → 77.1 s, within run-to-run contention (perceive rose 26.6 → 33.5 s on unchanged code between two runs). The batch is landed for what it verifiably does — the from-scratch lambdas fell (discourse 4.6 → 0 s, `reviseTextFold` 37 → 27 s) — not for a headline |
| Dijkstra | III.4 | discourse-referents.js `replaceOcc`; individuation.js foldStep | clean | each view names exactly what it reads off an occurrence (id, surface, canonicalSurface; and for individuation edge/relation/role via a forced recompute of that one group) and recomputes on anything else — the update handling is scoped to the fields the state depends on |
| Simon | P95 | hypergraph.js:113 | clean | the skip is on object identity only (`byId.get(id) === entry`); a new object with equal keys still re-indexes — no structural-equality shortcut was invented |
| Holmes | P11 | relations.js `matcherFor` | clean | same source, same flags, same regex; `lastIndex` rewound before every use so the `exec` loop at :872 starts where it always did |
| Pearl | II.10 | gates | clean | 60 KB identity unchanged; 240 KB (123) and 480 KB (120) byte-identical after each of the four changes |
| Chekhov | — | `MATCHERS` bound at 32 | clean, named | a bound of 32 compiled matchers is a budget (memory), not a judgment about material; it is cleared, never evicted by rule |
| Marshall | II.11 | relations.js:212 `32` | upheld | the one new number is a cache bound, commented as such; earned-constants scans exported constants and this is not one, but it is named here so it is not mistaken for a threshold |
fixed: 4 (the four changes). struck: none.

## 2026-09-07 — the 480 KB cliff, part 2: identity revision's edges indexed; the hypothesis view answers "what changed"; anchoring's cast built once per array; live alternatives indexed by first token; the index's entries array made lazy (branch `fold-memory-p157`)

Constitution: `../eo-constitution/CONSTITUTION.md` + READING-SPEC.md + the-fold POLICIES.md. Lenses in-session over `kernel/identity.js`, `kernel/hypergraph.js`, `adapters/text/individuation.js`, `adapters/text/revision.js`, `adapters/text/anchoring.js`, `adapters/text/identity-evidence.js` and their tests.

| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Feynman | II.10; P159 step 0 | individuation.js `changedOnly` (first cut) | **fixed, by the gate** | the first cut offered only the extras' surfaces on the argument "an append arrives only as an extra"; the 60 KB log hash moved (`bcf5…` → `f784…`) while every node hash held, and a bisect (individuation reverted, identity index kept) put it on this change. Occurrences also enter the fold through the observation's own entries. `pending` — surfaces any delta touched since the last ask — closes the route; the hash is back; a test pins the exact case |
| Diaconis | II.10 | tests/identity-index.test.js | clean | the reference is the scan the index replaces, reimplemented in the test from `canonicalizeHyperedge` and a `find`; equality at every one of 48 steps through supports, canonicals and attacks; a fixture that produces no CON op (a pair attacked earlier) asserts no REC ops rather than skipping silently |
| Diaconis | II.10 | tests/individuation-incremental.test.js (admission equality) | clean | admissions under `changedOnly` equal admissions from the full list at 60 steps, order included, from a SEEDED fold whose groups were never offered |
| Dijkstra | III.4 | identity.js `edgeIndex` | clean | `touchedEdges` uses the same `participantValue` `touches` used; positions kept so operations come out in fold order; an updated edge with unchanged values is swapped in place, any other update recomputes |
| Holmes | P11 | anchoring.js `normToReferent` | clean | the case-blind fallback kept the FIRST surface whose norm matched (the `break`); Map insertion order reproduces it exactly |
| Simon | P95 | identity-evidence.js `alternativesIndex` | clean | keyed on the alternatives array the kernel already keeps copy-on-write; a new array with equal content rebuilds and answers identically (asserted) |
| Chekhov | — | hypergraph.js `graph.entries` | **fixed** | materialised on every index call — three per sentence — for an array no file in either tree reads (the only `.entries` readers are task-log entries); lazy and cached per graph now. My first cut cached it in a module variable shared by every graph; corrected to a WeakMap before any test ran against it |
| Pearl | II.10 | gates | clean | 60 KB identity unchanged after the fix; 240 KB (123) and 480 KB (120) byte-identical on all five changes together |
| Marshall | II.11 | all six files | upheld | no new constant; the one memo bound (`MATCHERS`, part 1) is a budget and is named there |
fixed: 2 (the changedOnly hole, the shared cache). struck: none.

## 2026-09-07 — the 480 KB cliff, part 3: the identity index handed the fold's own array; the refresh's per-pair normalisation memoised; appended-before-updated in every fold step (branch `fold-memory-p157`)

Constitution: `../eo-constitution/CONSTITUTION.md` + READING-SPEC.md + the-fold POLICIES.md. Lenses in-session over `kernel/identity.js`, `adapters/text/revision.js`, `adapters/text/surfaces.js`, `adapters/text/discourse-referents.js`, `adapters/text/individuation.js` and their tests.

| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Diaconis | II.10 | tests/identity-index.test.js | clean | the edge index's from-scratch builds are COUNTED (`identityStats.computes`): 170 in 1,707 sentences before, 1 after; the reference is the concatenation scan, met at every one of 30 steps with extras |
| Feynman | II.10; P159 step 0 | kernel/identity.js edgeIndex foldStep | **fixed, by the gate** | the 480 KB differential diverged at step 5550 while 240 KB held; a bisect cleared the surfaces memo; a per-step delta comparison of two worktrees found step 5534, where the fold's canonical for eleven edges lacked "anatole" and the index's had it. Cause: one delta appends an edge's canonical (a support's REC) and updates it (an attack's REC) in the same call, and my step applied `updated` before `appended`, leaving the index on the stale first. Appended first, then updated, in all three fold steps; a test builds exactly that delta; 480 KB identical again |
| Dijkstra | III.4 | revision.js → deriveIdentityRevision({ fold, extraEntries }) | clean | P157's shape in a third place — a fresh spread of the fold's array — replaced by the fold's own array plus this sentence's entries scanned after it in their own order; `touchesIdentity` is the index's `valuesOf`, the scan's `participantValue` |
| Holmes | P11 | surfaces.js normOf/individuating memos | clean | memoised for the life of one `discoverReferents` call only, since `generic` is decided per call; no caller mutates a returned array (checked: `.length`, `.find`, `.includes`, `.every`) |
| Simon | P95 | discourse-referents.js, individuation.js fold steps | clean | the same reorder applied to the two views where it had only cost a recompute, not correctness — the same seam, fixed in every sibling at once |
| Pearl | II.10 | gates | clean | 60 KB identity unchanged; 240 KB (123) and 480 KB (120) byte-identical after the reorder; the bisect and the two-worktree delta comparison are recorded above as the method that found it |
| Marshall | II.10, II.11 | all five files | upheld | no new constant; the first cut of part 3 was landed nowhere — the gate ran before the commit, which is the order the constitution asks for |
fixed: 1 (the fold-step order). struck: none.

## 2026-09-07 — P168 / S80: an address is given at birth and kept (branch `fold-memory-p157`)

Constitution: `../eo-constitution/CONSTITUTION.md` + READING-SPEC.md + the-fold POLICIES.md. Lenses in-session over `adapters/text/surfaces.js`, `adapters/text/recursive.js`, `tests/addresses-birth.test.js`, `tests/referent-merge.test.js`, `native/eval/read-cost.mjs` (header).

| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Diaconis | II.10 | tests/addresses-birth.test.js (partition) | clean | the invariant is asserted refresh by refresh on 120 KB of real material, and the test refuses to pass unless a rename actually occurred — the vacuous pass is closed by construction |
| Holmes | P11; SEED "identity by consequence" | surfaces.js `prior` block | clean | identity is unchanged (the same clusters); only the ADDRESS is stabilised — the earliest-born being keeps its id, a split follows the majority of bearers, a merge is witnessed by the uniting surface |
| Feynman | P159 step 0 | read-cost.mjs header | clean, disclosed | the hashes moved because the reading changed on purpose; the old values stand beside the new with the reason (33 nodes for 38, the same 166 links) |
| Ostrom | P161 | P168's table | clean | cast recall is stated as unable to move under a rename (same partition); the claims are fragmentation, oscillation and record count, measured on one read of one book |
| Simon | P95 | recursive.js reassignment loop | clean | a merge of two prior beings is one record (`merges`, own basis), not a second set of reassignment records for its bearers |
| Chekhov | — | `addresses: "founder"` | clean, named | kept as an opt-in so P165's oscillation stays reproducible in `referent-merge.test.js`; not dead, a control |
| Marshall | IV.1; P71 | P168, S80, the retired test | upheld | the P165 test's own text asked to be retired "with that finding recorded" when the clustering was stabilised; it now pins the finding under the old rule and its absence under the default, in the same diff as the change |
fixed: none needed. struck: none.
