# Chorus log — append-only, one entry per lint run

## 2026-09-21 — kleeneUp pre-commit chorus (branch `archon-kleeneup`, staged diff)

fast: 14 files · affected tests 39/39 pass (kleene-up 19, verbatim-snip 10, content-rules 5 × 8 runs — the ordering flake fixed) · law: ok (P5.2 cited, verified against POLICIES.md — the self-verification discipline, exactly the ADDRESS-BOUND wall; pre-existing dup-header WARNs P115/P116/P117/P19/P233 and S17/S96, untouched by this diff)

**Tier 1 FAIL is pre-existing base breakage, disclosed:** the committed
`native/organs/index.js` exports from `./apollo.js`, but `apollo.js` /
`apollo-swarm.js` / `apollo.test.mjs` are UNTRACKED files sitting in the main
worktree's dirty working tree — they are not in commit `926462e` (this
branch's base) nor in `main`'s tip `3fade7d`. Every test that imports
`organs/index.js` therefore fails `ERR_MODULE_NOT_FOUND` on a clean checkout
(measured: 129 failures here, 0 on the main worktree where the dirty tree
carries apollo.js). Per this log's own 2026-09-19 incident — a bare commit
swept another session's pre-staged files into a commit — this diff does NOT
carry apollo.js: it is another session's in-flight work, not this archon's,
and the base will self-heal when that work commits. The FAIL is not this
diff; the affected tests that import ONLY this diff's files all pass.

| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Simon/Chekhov | — new module no test imports | native/organs/kleene-up.js | fixed | the organ was unwired at first; now imported and verified in native/tests/kleene-up.test.mjs (CELL, REFUSALS, KINDS, auditField) — the physics kernel tested, the organ seam wired |
| Marshall | P5.2 | native/kernel/kleene-up.js:14 (ADDRESS-BOUND wall) | clean | P5.2 in the-fold POLICIES.md is the self-verification discipline (an assertion with no bytes is `unaddressed`) — the wall (address holds the needle or is refused) is that doctrine applied to finding/snipping, not a stretched citation |
| Feynman | III.3 | README.md (sweep counts) | clean | 1786 / 749 / 1008 / 29 are the actual survey's counted fields in kleeneup-report.json — reproducible by `node scripts/kleene-up.mjs`, not a tuned number |
| Diaconis | II.23 | native/tests/kleene-up.test.mjs (falsifying controls) | clean | a pattern-bleed span and a drifted-address refusal are both pinned by real tests — the effect exists and would be caught if it stopped |
| Diaconis | II.23 | content-rules.mjs:80 `sort` (measured flake) | fixed | the store's newest-sharpened-first sort TIED on identical same-millisecond `lastSharpenAt` and fell to unstable insertion order (the ordering test flaked ~40% of runs, zebra beating alpha by luck); added a monotone preservation-order tiebreaker — the later-preserved rule wins a tie, never the sort's mood |
| Frankfurt | III.3 | kleeneup-report.json / kleeneup-migration.md | clean | both are generated artifacts carrying measured counts and real file:line pointers, no placeholders; `runAt` timestamp disclosed |
| Kondo | — stray / dead | scripts/kleene-up.mjs | noted | the CLI is a command a person runs (exempt); the report + migration files are referenced by the README, not stray |

clean: Dijkstra (locale fold is typed en-US and offset-mapped), Greenberg (no language parameter introduced; the tokenizer is disclosed grammar), Alexander (no composition seam added), Holmes (no alias/identity merge), Pearl (no corroboration claim), Ostrom (no credit/scope claim).

## 2026-09-21 — kleeneUp: the regex-eviction archon is born (branch `archon-kleeneup`)

Build (not a lint run): a new worktree, `eoreader7-archon-kleeneup`, branched
from `926462e` (main has since advanced one commit to `3fade7d`; this archon
is based on the older tip, disclosed). The mission: remove regex-based
FINDING and SNIPPING and re-seat it on the physics system — a thing is found
by its byte address in the field, never by a pattern; a snip is cut at a
permanent address, never by a match.

What landed, each verified green in-session:
- `native/kernel/kleene-up.js` (Handle: Kleene) — the physics primitives:
  `findNeedle`/`findNeedles` (needle measurement with folded index + original
  offset map), `windowAt` (the encounter around an anchor), `snipAt` (verbatim
  cut, sha256 ground, drifted address REFUSED — never silently re-found), and
  `reduceRegex` naming each pattern literal / semantic / structural /
  typed_gap. 17/17 tests (`native/tests/kleene-up.test.mjs`), falsifying
  controls carried (pattern matching bleeds across a span; a needle does not;
  a drifted ground is refused).
- `native/organs/kleene-up.js` — the organ seam (SIG·Figure, typed refusals,
  `auditField`), grounded in the physics canon: mechanic `kleene-up` cut from
  the Mozi three tests, sha256-verified by `canon-ground.mjs` (load check:
  ungrounded false, mechanic located).
- `native/organs/verbatim-snip.js` — the worked migration: the word-class
  intent regexes (QUOTE_VERB / EXACTNESS / QUOTE_ME_FRAME / EXACT_TEXT_OF)
  and the QUOTABLE_WORKS `match` regexes replaced by needle measurement over
  the tokenized field (single words — the tokenizer is structural grammar,
  disclosed) and the folded raw field (phrases). The remaining regexes are
  the scaffold parser (structural) and are disclosed as kept. Public API
  unchanged; 10/10 tests green.
- `scripts/kleene-up.mjs` — the standing sweep: surveys the repo, names every
  regex occurrence, writes `kleeneup-report.json`, `--plan` writes the
  migration plan. Current count: **1786** occurrences — **749 migratable**
  (651 literal + 98 semantic), **1008 structural** (kept, disclosed), **29
  typed gaps** (named). It measures; it never blind-rewrites — an archon that
  evicted regex with a regex would be hoist by its own petard. The sweep has
  already consumed two of its own occurrences (the classifier's
  `/i/.test(flags)` literals became `flags.includes("i")`): the archon
  cleans what it preaches.

Disclosed limitations: the survey scanner is line-wise (a regex spanning
lines can be missed, a division sign can be misread as a literal); the
classification is of PATTERNS, so a literal pattern used in `.replace`/
`.split` is an operation the reviewer must judge; the classifier's own
structural tests remain regexes (grammar, not finding). The migration is
per-file work under the organ's own audit; `verbatim-snip.js` is the worked
example, not the whole sweep.

## 2026-09-08 — organs/hyperlexicon.js renamed to notes-text.js, and every collision it caused (branch `rename-notes-text-face`)

fast: 5 staged files (+ ~40 mechanically-edited importers, `git add -A` pending) · 11 affected test files, 178/178 pass · law: ok (citations resolve; two pre-existing dup-header WARNs — P115/P116/P117/P19 in the-fold, S17 here — neither touched by this diff, confirmed identical on `git stash`)

Not a new feature: `native/organs/hyperlexicon.js` (the text face of `kernel/notes.js`) shared its name with the real Xushen affordance ledger, `kernel/hyperlexicon.js` — five eval files had already hand-aliased the collision (`createChemistry`) rather than name it. Renamed the file and every colliding export (`makeHyperlexicon`→`makeNotesText`, member `createHyperlexicon`→`createNotes`, `foldHyperlexicon`→`foldNotes`, `readingFromHyperlexicon`→pass-through `readingFromNotes`); `kernel/hyperlexicon.js` itself untouched. ~40 importers fixed mechanically (import path + the four renamed identifiers, dotted-property-safe so the 5 dual-importers' kernel-side `createHyperlexicon` was never touched); `capacities.js`'s registry row and `organs/index.js`'s re-exports updated to match. Cross-repo: the-fold's 332-byte shim (`hyperlexicon.js`) re-pointed at the new path — required, not optional: `native/eval/the-fold/lib/{door-probe,borodino-ledger}.mjs` and `live_priors/scripts/eot-digest.mjs` all reach the organ through that shim, and `kind-standing.test.mjs` (this repo's own suite) failed with `ERR_MODULE_NOT_FOUND` through it before the fix. Two one-line aliased imports (`makeNotesText as makeHyperlexicon`) keep the-fold's `app.js` (~30 local uses of `hyperlexiconFor`) and live_priors' driver byte-identical downstream of the rename.

| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Feynman | — (no constant/skip introduced) | notes-text-identity.test.mjs:14 | clean | comment restates a real measured finding (0/29 witnessed) with a pre-existing, slightly stale driver-path shorthand — not touched by this diff |
| Dijkstra | — (no locale/hash logic introduced) | notes-text-identity.test.mjs:35 | clean | `toLowerCase`+determiner-strip is self-labeled "A TOY canonicalizer, test-only" in the same comment block — disclosed stub, pre-existing, unmodified by the rename |
| Holmes | P73 (identity seam) | notes-text-identity.test.mjs:1 | clean | file is about identity by design; rename touched names only, not the merge logic |
| Pearl | P73 corroboration mechanism | notes-text-identity.test.mjs:48 | clean | the two witnesses are two distinct sources (`borodino.txt#1-9`, `war-and-peace.txt#2-9`) — no shared-cause conflation |
| Frankfurt | — (test double) | notes-text-identity.test.mjs:84 | clean | comment explicitly discloses it as "A stub lens shaped exactly as makeGrammarLens's return" |
| Alexander | composition seam | notes-text-identity.test.mjs:83 | clean | test genuinely asserts gate-before-identity ordering (a settled non-verb refused, a real verb still admitted through identity) — read in full, not superficial |

clean: Marshall (no law edited or cited beyond the two pre-existing, untouched WARNs), Simon/Chekhov (`notes-text.js` flagged "new" by the git-rename heuristic; false positive — it's the byte-identical prior module, imported by 4 direct test files plus ~40 more transitively, all passing)


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

## 2026-09-07 — the holograph rebuild: three resolutions, compression, the mouth's door, activation retrieval (d053068, 59c887e, 6fe45fa, a965747, 469d09b)

chorus-fast on each: the only FAIL across the five runs was `matrix-client.test.mjs`'s load-flaky pool test (standing entry; passes 21/21 alone, verified 2026-09-07). One real gate catch: the contract test on d053068 (app.js imports the kernel's activation.js) — fixed in 59c887e, not by the marker.

| persona | article | file:line | verdict | summary |
|---|---|---|---|---|
| Frankfurt | P55 / the 2026-08-18 address decision | firewall.js `mouthFacing`; holon.js around `call` | fixed | the blocks, expectation facts, re-ask facts, P122's snip block and P125's premise facts all put addresses in the model's view; one wall at the mouth's door strikes them all; the record keeps every address |
| Dijkstra | P88 | conversation.mjs `--chunking`; holograph-reading.mjs | fixed | the eval read chapter-sized chunks (328) where the page reads paragraphs (3,743); measured a configuration the page does not run |
| Diaconis | II.11 / P9 | activation-retrieval.js `SENTENCE_CEILING`; resolutions.js `DEPTHS`, `RECURRENCE_FLOOR` | accounted | a declared reader budget per hop, a structural ladder, binding's floor — each stated in place; the cut inside is measured by dmdWindow |
| Holmes | P11 | activation-retrieval.js, resolutions.js, dialogue.js `candidatesIn` | fixed | every retrieval and every block resolves through the index; the candidate scan offers sub-runs so "Later Razumihin" no longer hides a referent |
| Ostrom | P41 | resolutions.js `prominence`; `errorOf` authorship null | fixed | a one-off surface ("God Which") no longer names a ground; no expectation → authorship withheld, never 0 |
| Simon | P97 | activation-retrieval.test.mjs (through the real turn) | measured | reach by referent alone cut the second act about Porfiry — found by the turn-level test, fixed at the grain |
| Marshall | IV.4 | THE-HOLOGRAPH.md; preregistered-lens-arm.md | upheld | predictions written before the arms; the additive control's null result recorded before the compressed arm ran; the void line in fact-block.js (P55's pin) left standing, flagged |

deferred-with-reason: the P55 void line carries negative knowledge in the prompt (user's own rule) but is a measured pin — the user's call. false-positive-on-review: none.

## 2026-09-07 — Merge `fold-memory-p157` (53 commits: S77 long-stream, the kernel memory work, the holograph evals) into main (branch `fold-memory-p157` → main, scope origin/main..HEAD)

fast: 102 files · 53 affected test files, 526 pass, 0 real fail (the one ✖ is the script handing `tests/earned-constants.json` to `node --test`; false-positive-on-review) · full native `npm test` on the merged tree 711 tests, 690 pass, 0 fail, 1 TODO · law: WARN pre-existing duplicate S17 (and the-fold's P19 P115–P117); WARN cited-not-written P0 P171 P580 P582 (pre-existing on the branch).
| Alexander | II.10 | native/eval/the-fold/long-stream.mjs, lib/long-stream.mjs | fixed | two conflicts with main's S77 follow-ups (a083898): the branch's side is the superset (top-level `placeCoverage` import and P145 `expectFor`; `scored()` verdicts), main's inline import and bare verdicts dropped; `tests/long-stream.test.js` 8/8, `frontier-25.test.js` 4/4 with `../the-fold` at its paired merge |
| Simon/Chekhov | — | eval scripts no test imports (read-run, holograph-reading, conversation, read-cost, frankenstein) | noted | evals, reviewed at their commits |
clean: Diaconis, Feynman, Dijkstra, Holmes, Pearl, Ostrom, Frankfurt, Marshall — the merge itself edits no law.
## 2026-09-07 — the driver reads constitutionally and persists the reading; the run figures live in a lib a test reads; THE-HOLOGRAPH §7 is the reading policies (staged: conversation.mjs, lib/conversation-compare.mjs, tests/conversation-compare.test.js, docs/THE-HOLOGRAPH.md, .gitignore)
- chorus-fast: PASS — 3/3 in the one affected test file; citations resolve except `P0`, which is eoreader6's READING-POLICY.md P0 (the constitutional-reader baseline the doc names by its own register), not a the-fold policy — a cross-repo cite, kept.
- Diaconis (conversation.mjs:189, the resumed reader seeded from `reconstruct`): the perceiver's refresh state restarts on resume — disclosed in the code, not hidden; a fresh read and a resumed read are not byte-identical and the doc does not claim they are.
- Holmes / Pearl / Ostrom / Alexander (THE-HOLOGRAPH.md §7): prose citing S17, S42/S43, S70/S71, S1/S25 as they read; no mechanism changed in this repo for identity, corroboration or scope.
- Simon/Chekhov: `conversation.mjs` is an eval driver, imported by no test by design (P19/P27's posture); `lib/conversation-compare.mjs` is read by `tests/conversation-compare.test.js` (S64/S65) — the first cut read `sections[].relations.claims` off a number and threw on the first real run; reshaped to the driver's own row fields (P96).

## 2026-09-07 — S81 written; holograph-compression.mjs; THE-HOLOGRAPH §6/§7 amended (staged: READING-SPEC.md, eval/the-fold/holograph-compression.mjs, docs/THE-HOLOGRAPH.md)
- chorus-fast: PASS — Generality present on S81; the driver refuses (`fixture_absent`, exit 2) when the reading, the ledger or the run it stands on are absent (S65); it is an eval driver imported by no test by design, and its by-construction rules are pinned in the-fold's resolutions/activation suites.

## 2026-09-07 — merge of origin/main into fold-memory-p157 (worktree `fold-memory-p157-merge`)
- origin/main since the base: a083898 (S77 follow-ups) — its content already stood on this branch; the only conflicts were the two long-stream files (this branch's frame-carrying verdicts and P145's belief kept; main's inner re-import of `placeCoverage`, a duplicate binding, dropped) and this log (both sides kept).
- Suites in the worktree with the frozen submodule initialised and the vendored packages linked: conformance + tests 694 pass / 0 fail (20 skipped or todo); organs 450 of 452 — the two are environment (`aliases.test.mjs`, which another session is fixing uncommitted in the main tree, where organs pass 462/462; and hl-acquire's adversarial case reading the gitignored local POS prior inside the submodule).

## 2026-09-08 — Compliance pass: reassignment separated from merge, resume actually restores the reader, the void row field, the compression driver's transcript, aliases.test.mjs's path (staged: adapters/text/recursive.js, kernel/reading.js, kernel/hypergraph-projection.js, eval/the-fold/conversation.mjs, eval/the-fold/holograph-compression.mjs, eval/the-fold/lib/conversation-compare.mjs, docs/THE-HOLOGRAPH.md, READING-SPEC.md, organs/aliases.test.mjs, tests/{addresses-birth,conversation-compare,referent-merge,resume-state}.test.js)

Constitution: `../eo-constitution/CONSTITUTION.md` + READING-SPEC.md + the-fold POLICIES.md. Tier 1: law ok; suites: conformance+tests 714, 713 pass, 0 fail, 1 TODO (BECOMING, standing); organs 462/462 (aliases included and passing for the first time on a bare checkout).

A compliance review (2026-09-07, this session) found ten defects across the P162–P171/S78–S81 kernel and holograph work. This commit closes the ones that are eoreader7's to fix.

| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Holmes | II.7; S17; S80 | adapters/text/recursive.js reassignment loop; kernel/hypergraph-projection.js `reassignments` | fixed | `EOReferentMerge@1` carried two different events — a witnessed identity decision and a bare refresh-to-refresh address change — and the-fold's projection unioned both. On the persisted Crime and Punishment reading, 9 of 14 records folded a still-live id and two surviving unions collapsed distinct people. New schema `EOReferentReassignment@1`; only `EOReferentMerge@1` unions on the the-fold side now. `tests/referent-merge.test.js` rewritten: reassignment keeps both live addresses, a true merge still unions, each reassignment emitted once |
| Frankfurt | S25; THE-HOLOGRAPH §7 | kernel/reading.js `restore`; adapters/text/recursive.js `perceiver.restore` | fixed | §7 claimed a resumed read is byte-identical to a straight one; measured false — the perceiver's causal accumulators are not fold entries and do not survive a bare `reconstruct(log)` seed. `restore()` replays the persisted `Encounter@1` rows through `perceive()` to rebuild them; `tests/resume-state.test.js` (new) asserts straight === split-then-resumed, byte-identical |
| Simon | P95/P96 | eval/the-fold/conversation.mjs row; lib/conversation-compare.mjs | fixed | the row never carried `voidsDeclared` (the turn's own field), so `voids` read 0 on every run while the same rows showed typed absences; row now carries it, the compare lib also accepts the legacy `voids` field for older rows |
| Ostrom | P88; S65 | eval/the-fold/holograph-compression.mjs | fixed | the driver called `activate`/`lensBlock`/`activeReferents` with `transcript: []` on every question — a condition the live turn never runs under, since a follow-up naming no referent of its own is meant to bind to the last answer's. Fixed to thread the run's own transcript row by row; questions activating moved 13/25 → 20/25, Lens-at-ceiling 9/13 → 13/20, and level 1's own ceiling (never disclosed before) is now shown — 20 of 20. `results/holograph-compression-RESULTS.md` keeps both, dated; THE-HOLOGRAPH §6 and READING-SPEC S81 amended with a correction note, old figures kept beside new |
| Simon | P95 (a driver refuses what it lacks, never throws on one machine's path) | organs/aliases.test.mjs:10 | fixed | hard-coded `/home/user/live_priors/...`; replaced with a module-relative sibling path and a typed `fixture_absent` refusal — this suite now passes on a bare checkout (462/462 organs, up from 451 excluding this file) |
| Marshall | IV.1; P71 | this entry; THE-HOLOGRAPH.md, READING-SPEC.md correction notes | upheld — compliant | both docs keep the superseded figures beside the corrected ones with a dated note, per this repo's own S64/S65 rule that a committed number is enforcement only when a test reads its computation, and a correction is an addition, never a silent rewrite |

deferred-with-reason: `individuation.js::place()` throws on a lost hypothesis under an update that changes an occurrence's own encounter id — judged unreachable in current callers, disclosed rather than hardened this pass.

false-positive-on-review: none.

## 2026-09-12 — Marshall reconciliation: agent laws (LaVar, Wilson, Kelsen, Ranke) linked to the constitution (working, 3 repos)

fast: 3 files (LAVAR.md, native/READING-SPEC.md, native/organs/reasoning-lint.js) · 57/57 affected tests pass · law: ok (S110 written and resolving; pre-existing dup-header WARNs P115/P116/P117/P19 in the-fold and S17/S96 here; S0 cite WARN is from unreviewed concurrent swarm work already in the working tree, not this diff)

LaVar's charter, Wilson's swarm laws, and the Kelsen seed now carry eo-constitution article citations (IV.4) with their IV.1/IV.2 status disclosed: agent policy under the constitution, proposed not self-enacted, amends no constitution text. S110 — reserved in the sequence since 2026-09-09 but never written — was written from the LAVAR record in the house format with a Generality line. The two divergent LAVAR.md copies (eoreader7, live_priors) were reconciled to one union; live_priors/LAVAR.md is now byte-identical to eoreader7/LAVAR.md. Ranke's P84/P182 received their constitution citations in the-fold.

| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Marshall | IV.4; IV.1/IV.2; II.6/II.2/II.9/II.23/III.2/III.3 | LAVAR.md:7, LAVAR.md:303; reasoning-lint.js:10-15; READING-SPEC.md S110 | fixed | every agent law now cites the articles that produce it; status disclosed as proposed-not-self-enacted; the one dangling citation (S110) written, not waived |
| Diaconis | II.23 | LAVAR.md constitution line | clean | the II.23 citation restates the article's control-built-to-fail requirement; no number introduced |
| Pearl | II.22 (etak) | the-fold POLICIES.md P182 | fixed | independence is argued, never assumed — the mandate's corroboration line now cites II.22, whose text matches (a mirror under another host is one channel) |

clean: Feynman/Dijkstra/Holmes/Ostrom/Simon-Chekhov lens hits were all routed by unreviewed concurrent swarm working-tree files (native/eval/lavar/read-real.mjs, the results JSONL), not by this diff; none of this diff's lines introduced a constant, skip, identity, corroboration, or unwired module.
## 2026-09-13 — the surface page cannot boot in a browser: node-only organs in the browser seam, closed (working, uncommitted: native/organs/index.js, native/adapters/text/{recursive,anchoring,discourse-referents,individuation}.js, + new native/adapters/text/sha256hex.js)

Constitution: `../eo-constitution/CONSTITUTION.md` + this repo's READING-SPEC.md/CLAUDE.md. Reviewed diff: driving the real page (the-fold serve.mjs :8811 in headless Chrome) surfaced a SHIPPING blocker — the page never booted: net::ERR_FAILED on `node:child_process`/`node:fs`/`node:crypto` etc., because (a) organs/look.js (Node-only: spawn/fs/os + process.env at load) was statically re-exported by the browser-facing seam index, and (b) the causal perceiver chain (adapters/text/recursive etc.) imported node:crypto for a synchronous sha256hex helper. Fixes, both on the split law: look.js removed from the seam index (server-side consumers import it directly); a new shared synchronous pure-JS sha256hex.js replaces node:crypto in the four adapters, byte-identical output verified against node:crypto on 10 cases incl. Hebrew/Cyrillic/CJK (so content-addressed keys are unchanged — P168). Page boots after: model connects, zero node-builtin errors. Zero new regressions: the-fold 2261/2261/0; the 6 failing native/tests are pre-existing (verified by stashing this diff's tracked files — same 6 without them; they are the engine-internal foldNotes rename drift + a spans front-matter sweep, untouched here).

| persona | cell | citation | file:line | verdict | summary |
|---|---|---|---|---|---|
| Feynman | EVA | native/adapters/text/sha256hex.js | fixed | a real FIPS-180-4 SHA-256, verified against node:crypto on 10 inputs (empty, multi-byte, CJK, 1000-char) — not a placeholder or a tuned constant |
| Dijkstra | NUL | native/adapters/text/sha256hex.js + callers | clean | the shared sync hash is the base unit both node and the browser resolve identically; content-addressed ids (recursive:132/233/273/439, anchoring:287/386, discourse-referents:24/45, individuation:57) are unchanged because the algorithm is the algorithm — verified, not assumed |
| Holmes | SIG | native/adapters/text/sha256hex.js | clean | one organ, not two — every caller now imports the same sha256hex; node:crypto and the pure-JS fallback were never two entities, the imports were two spellings of one hash |
| Alexander | CON | native/organs/index.js (look removed) | clean | no composition gate silently defaults to "don't compose": look.js's server consumers (look.test.mjs, chapter-swarm.mjs) import it directly, and the seam comment states why it is absent |
| Frankfurt | INS | native/organs/index.js | clean | nothing generated; the removal deletes an export nothing consumed through the index |
| Marshall | meta | the-fold CLAUDE.md "self plane"; this diff | clean | no law edited by this diff; the split (pure organs in the seam, I/O at the caller) is READING-SPEC's own standing rule, cited in the seam comment |

clean: Simon/Chekhov/Ostrom/Pearl — the new module (sha256hex.js) is imported by all four adapters which are imported by tests; no credit/blame or independence claim touched.

## 2026-09-16 — grow the organs for "what is this?" on a giant code hunk: code-grain encounters + the Cuvier what-organ (eoreader7, working; S128)
fast: 8 files · 27 new tests pass (code-hunk, code-scan, proxy-notes, what-organ) · law: ok — S128 added with Generality, citations resolve (P13 S39 S128); the 7 failing affected tests are pre-existing (root-package CJS/ESM: text.js/kernel.js, and the WIP recursive.js) — none imports this diff's files (verified individually)

| lens | cell | citation | file:line | verdict | one line |
|---|---|---|---|---|---|
| Feynman | EVA | adapters/code/encounters.js (CODE_MAX_ENCOUNTER_CHARS, compliance) | fixed | the 16,000-char cap is a hard guarantee verified by codeEncountersCompliance (0 violations on the real 1.8 MB monster line) — an admission cap, never a threshold tuned to a golden |
| Dijkstra | NUL | adapters/code/scan.js (VENDOR_WORD/FINGERPRINTS/ASSET_NAME) | clean | allowlists are received package names, disclosed as received knowledge per row; identity by exact names word-bounded, never casing/hash (bareName strips path prefixes for the boundary test only) |
| Holmes | SIG | adapters/code/scan.js moduleMapFrom dedup | clean | one asset stated as `assets/X.js` and `./X.js` is ONE row (normalised dedup key) — a real alias merge, not surface-overlap merging of distinct assets |
| Pearl | CON | adapters/code/scan.js composeVendors | clean | fingerprint and map-row for the same vendor merge into ONE identity; map-only vendors carry count 0 — repetition inside one signal is never sold as independent corroboration |
| Alexander | SYN | organs/what.js (dmdCut injected, typed refusals) | clean | composition is gate-checked: no dmdCut, non-code, empty → typed gaps; the account is composed only from byte-supported claims |
| Greenberg | DEF | adapters/code/encounters.js isCodeHunk; scan.js CLEAN_LITERAL | clean | no language claim added — isCodeHunk is structural (long lines/bundle markers/statement density); the ASCII clean-literal bar is disclosed (non-Latin literals are not surfaced, never mis-asserted) |
| Kondo | REC | organs/what.js + adapters/code/* | clean | every new export is consumed (seam, CLI, proxy admission, tests); what.js is fully wired (seam + capacity row + CLI + proxy), not nascent |
| Marshall | meta | native/READING-SPEC.md S128 | fixed | S128 carries Generality + measured defect + verified; citations resolve; no P edited |
| Simon/Chekhov | INS | capacities.js, proxy-api.mjs humanizeNote | fixed | capacities.js now covered (what.test.mjs imports findCapacity); the new giant_code_admitted note has proxy-notes.test.js; CLI change proven live on the real 3.2 MB bundle (grain:"code", completes where it timed out) |

clean: Feynman — no other constant/skip/swallowed error in the diff; Ostrom — no credit/blame claim touched.

## 2026-09-16 — S129: the Cuvier organ reads a GraphQL schema artifact (adapters/code/graphql.js) and produces a structured overview of swarm_graphql_schema.json (eoreader7, working)
fast: 3 files · 38 tests pass (code-hunk, code-scan, graphql-schema, proxy-notes, what-organ) · law: ok — S129 added with Generality, citations resolve (4); the one failing affected test (GREEK connectives) is pre-existing WIP recursive.js, unverified here (does not import this diff's files)

| lens | cell | citation | file:line | verdict | one line |
|---|---|---|---|---|---|
| Feynman | EVA | adapters/code/graphql.js schemaScan counts | clean | every figure is read off __schema.types; no constant tuned to the specimen (measured on the real 693 KB schema: 215 types, 63/128/27 root fields — all from the document) |
| Dijkstra | NUL | adapters/code/graphql.js typeRefName / kind-count | clean | the base unit is the introspection kind + leaf name (NON_NULL/LIST unwrapped); no locale or hashing assumption; evidence anchors resolve to real byte offsets in the raw document |
| Holmes | SIG | adapters/code/graphql.js domain tally | clean | the tally is over the schema's OWN first type-name words with Root/PageInfo and convention tails excluded — no alias merge, no surface-overlap identity |
| Alexander | SYN | organs/what.js schema routing | clean | schema artifacts route to the schema account BEFORE the code-hunk gate with an explicit kind ("graphql_schema") and gist:null — no silent composition default |
| Greenberg | DEF | adapters/code/graphql.js FIRST_WORD | clean | the first-word split is a received GraphQL PascalCase convention (the spec's own naming law), disclosed, never a Latin-only assumption about content |
| Marshall | meta | native/READING-SPEC.md S129 | fixed | S129 carries Generality + measured gap + verified; the capacity row and README handle row updated to match; citations resolve |
| Simon/Chekhov | INS | adapters/code/graphql.js + what.js | fixed | the new adapter has 11 tests (graphql-schema.test.js) and the organ gained schema cases; proxy-api.mjs's note coverage (added S128 session) now clears its "no test imports" note |

clean: Pearl/Ostrom/Kondo — no corroboration or credit claim touched; every new export is consumed (organ, seam, tests), nothing dead.

## 2026-09-17 — TUI streams inference live over SSE, reconciled at DONE (main, cli scope)
fast: scoped (full chorus-fast.sh timed out on the crowded tree) · 16 unit tests pass (proxy-client 8, stream 2 new, tui-units 6) · e2e boot/chat/scroll/history PASS · law: ok — no P/S citations added or edited
| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Simon/Chekhov | new export chatCompletionStream | cli/proxy-client.mjs:178, cli/tests/proxy-client-stream.test.mjs:1 | fixed | new export consumed by tui runChat and imported by its own test + e2e chat via fake-proxy SSE; nothing unwired |
| Diaconis | delta timing assert | cli/tests/proxy-client-stream.test.mjs:94 | clean | incrementality measured (20ms server spacing, ≥15ms observed gap), not batched-at-DONE |
| Feynman | error paths | cli/proxy-client.mjs:196, cli/tests/proxy-client-stream.test.mjs:100 | clean | malformed SSE lines skipped like er7-client, 4xx throws with zero deltas, no silent skip |
| Dijkstra | SSE/JSON gate | cli/proxy-client.mjs:190 | clean | stream drained only on 200 + event-stream content-type; 429 body still JSON-retried; getReader already the repo's idiom |
| Kondo | superseded path | cli/proxy-client.mjs:151 | clean | one-shot path intact and tested, postChatCompletion still used; only my 5 tui hunks staged, others' layout hunks left untouched |
clean: Pearl/Ostrom/Alexander/Marshall/Greenberg/Holmes/Frankfurt/Lévi-Strauss — no corroboration, credit, composition, law, language, identity, placeholder, or stash claim touched

## 2026-09-18 — Sanskrit competency to Greek parity + omnimodal instrument lessons (eoreader7, working; san seam)
fast: 7 files (+6 fixtures) · 26 affected tests pass (sanskrit 22, competence 4) · law: ok — no P/S citations added or edited (L-labels are omnimodal-lesson tags, not law); WARNs pre-existing (POLICIES P115/116/117/19/233, READING-SPEC S17/S96)
| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Diaconis | seed-42 null, 20 draws | lavar/sanskrit-competence.test.mjs:56 | clean | observed 74.6% vs shuffled max 29.9% (45pt margin on a 20pt bar); rerun bar collapses to epsilon on the deterministic read — the effect exists |
| Feynman | MWT skip + 0.2 margin | lavar/sanskrit-competence.test.mjs:42 | clean | the skip is UD multiword ranges (same as Greek/Latin readers), never silent; floors sit below measurement, never tuned to it |
| Dijkstra | unicode TOKEN + normForm | lavar/sanskrit.mjs:72 | clean | property-class tokenizer, no Latin-only split; lowercase is not identity-laundering (IAST has no turkic-I; Devanagari arrives via the treebank's own Translit) |
| Holmes | stem rule LCP>=4 | lavar/sanskrit.mjs:147 | clean | grouping rule stated with its sandhi-opaque residual (agnir/agnaye stays split) — no surface-overlap merge beyond the rule |
| Pearl | two decoders | lavar/sanskrit-competence.test.mjs:88 | clean | Vedic IAST-direct vs UFAL Translit-field (different teams/registers/scripts); UFAL reported, never gated — no independence overclaim |
| Ostrom | circularity note | lavar/sanskrit-competence.test.mjs:6 | clean | TRAIN-built prior tested on TEST of the same tradition, disclosed as the tradition's own-rule generalization |
| Alexander | seam composition | lavar/sanskrit.mjs:315 | clean | clause reader composes only prior-typed votes + declared operating point (0.5/10, sanskrit-swarm); gaps propagate, never defaulted |
| Greenberg | --lang=san scope | lavar/sanskrit.mjs:1 | clean | new language ships its own declared instrument (IAST, SOV, 8 cases, Dual); master builder proven byte-identical for Latin — nothing smuggled as universal |
| Simon/Chekhov | new module wiring | lavar/sanskrit.mjs:1 | clean | every export consumed by sanskrit.test.mjs/sanskrit-competence.test.mjs; swarm driver is a person-run CLI (wilson-driver class), builder hunk proven no-op for shipped artifacts |
| Kondo | eval + driver | lavar/sanskrit-swarm.mjs:1 | clean | fixtures are vendored eval data (skipped class); driver re-runnable with declared usage — nothing dead, nothing stray |
| Lévi-Strauss | stash × problems | — | clean | structural toggles named as the next colony; no stash piece claimed |
clean: Marshall/Frankfurt — no law edited or cited, no placeholder or number-for-a-prior anywhere in the diff

## 2026-09-18 — code learns Python + JS the Greek way, generatively (main, staged 11 files)
fast: 11 files · 120 affected tests pass · law: WARN pre-existing dups only (P115 P116 P117 P19 P233, S17 S96)
| lens | citation | file:line | verdict | one line |
| Feynman | measured bar, no tuned constant | adapters/code/encounters.js:68 | clean | pyDefs>=3 + parens>=2x measured (Flask 110/321, prose 0/200KB); try/catch loaders return null per martial.js precedent, disclosed |
| Dijkstra | extension lowercasing | adapters/code/language.js:44 | clean | toLowerCase on the extension suffix only; file identity keys untouched, no locale-sensitive comparison |
| Holmes | shared dedup key | adapters/code/scan.js:143 | clean | bare `flask` vs hashed `flask-abc12345.js` stay distinct keys — no surface-overlap merge |
| Ostrom | scoped absence | eval/results/code-language-priors-RESULTS.md:102 | clean | third-language absence stated as specimen-scoped; credit to engine/tree-sitter givers |
| Alexander | disclosure composition | organs/what.js:240 | clean | keywordPriorLoaded added beside priorLoaded (still pinned true); gaps propagate, never defaulted |
| Greenberg | per-language scope | adapters/code/language.js:69 | clean | TS/C/Go detected but ungated (loader null, brief null); XID recipes additive; nothing smuggled as universal |
| Marshall | S83 S84 cited, none edited | — | clean | asymmetric polarity + additive factory + safe default faithfully applied; WARN dups pre-existing |
| Simon/Chekhov | new modules | adapters/code/language.js:1 | noted | language.js consumed by code-loop.js + 13-case test; build-code-keyword-prior.mjs output-tested like build-pos-prior (pos-prior.test.js precedent); code-loop.js had no test importer before either |
| Lévi-Strauss | stash × problems | — | clean | 0 of 22 stashed pieces match the named open problems (per-language name split, TS/C/Go) |
clean: Diaconis/Frankfurt/Pearl/Kondo — no RNG or null, no placeholder, no shared-cause counting, no dead code (priors vendored + loaded, briefs served in round 1)

## 2026-09-18 — Greek clause reader: article probe, substantives, subordination, three refusals (main, native/eval/lavar)
fast: 2 files · 43 affected tests pass · law: ok (0 citations, nothing new to cite)
| Diaconis | — | greek.mjs:30 | clean | effects on PROIEL TEST split the prior never saw; deterministic audits, thresholds declared pre-breeding |
| Feynman | — | greek.mjs:32 | noted | weakBelow 0.8 set, not bred — declared constant, sensitivity untested; future swarm gene |
| Dijkstra | — | greek.mjs:69 | fixed-in-diff | strip-as-identity failure (εἶ/εἰ) found and fixed via accent-awareness; rest position-gated |
| Greenberg | — | greek.test.mjs:269 | clean | all machinery inside the --lang=grc/ell seam; cube cells the shared declared projection |
clean: Greenberg, Diaconis (nothing to report beyond the rows above)

## 2026-09-18 — per-language name priors: split Python first (main, staged 9 files)
fast: 9 files · 97 affected tests pass · law: WARN pre-existing dups only (P115 P116 P117 P19 P233, S17 S96)
| lens | citation | file:line | verdict | one line |
| Diaconis | null/RNG/measurement | priors/code-name-js.json:1113 | clean | `loadSeed` is measured corpus data (a declared name), not randomness; builder has no RNG — tallies are order-independent, sum-checked 4819=4819 |
| Feynman | floor constant >= 2 | scripts/build-code-name-prior-split.mjs:149 | clean | RECURRENCE_FLOOR precedent (P58), same as blended builder; reported beside counts, consumer-overridable via genericFloor — never tuned to a golden |
| Dijkstra | lowercasing + sha256 | adapters/text/code-structure.js:80 | clean | toLowerCase on the family code against a fixed allowlist; names stay exact case-sensitive; sha256 is content fingerprinting, never identity |
| Holmes | one entity or two | priors/code-name-c.json:406 | clean | same name in two families stays two rows (no cross-family merge); mixed-language homonym judged on first file — disclosed in codeGist header |
| Pearl | independence | adapters/text/code-structure.js:421 | clean | splits are sole witnesses per language, never counted as independent corroboration of one fact; sum-check is consistency, sold as consistency |
| Ostrom | claim scope | eval/results/code-name-split-RESULTS.md:26 | clean | fixture baseline + stable-value-only live pins + Flask agreement-disclosed; stale-blended and thin-family limits named in-file |
| Marshall | S83 S84 cited, none edited | — | clean | polarity + additive factory + blended fallback faithfully applied; WARN dups pre-existing |
| Simon/Chekhov | builder unimported | scripts/build-code-name-prior-split.mjs:1 | noted | output-tested like build-pos-prior (loader pins 310/1786 real tallies; reproduce line in doc); seam covered by 6-case suite + 97 affected green |
clean: Alexander/Greenberg/LeviStrauss/Frankfurt/Kondo — not routed; no composition change, no new grammar, stash checked last commit

## 2026-09-18 — code competency arc: name splits + mechanical tier + agent wiring + py-engine + forecast/create-learn (main, staged 31 files)
fast: 31 files · 186 affected tests pass · law: citations resolve (P16 S83 S84); WARN pre-existing dups only
| lens | citation | file:line | verdict | one line |
| Diaconis | null/RNG/measurement | kernel/tournament.js:32 | clean | null tester → recorded gap never win (pinned); unknown forecast 0.5 disclosed; engine null → recipes; no RNG anywhere; Laplace declared not fitted (2-row ledger, said so) |
| Feynman | constants/skips/swallows | the-fold/forecast.js:44 | clean | floors from P58 precedent, timeouts declared bounds, surprise 0.5+history declared threshold never fitted; exec/rank failures → null per martial precedent, pinned |
| Dijkstra | locale/script/hash | adapters/code/mechanical.js:27 | clean | XID lookarounds not \b; sha256 content fingerprint never identity; family allowlists fixed; lowercasing never identity |
| Holmes | one entity or two | code-structure.js:422 | clean | per-family rows never cross-merge; mixed-language homonym first-file rule disclosed; qname-qualified engine identity exact |
| Pearl | independence | code-structure.js:422 | clean | sum-check sold as consistency not corroboration; forecast prior and test verdict genuinely independent; winner rule disclosed order |
| Ostrom | scope | eval/results/code-name-split-RESULTS.md:26 | clean | four docs scope specimen vs universal; stale-blended/thin-family/TS-junk/calibration-ledger all named; credit to engine/tree-sitter/UD givers |
| Frankfurt | placeholders | adapters/code/mechanical.js:300 | clean | NotImplementedError bodies + arg0 placeholders disclosed as absence not substance; 212 stdlib projected from 300 received; no invented numbers |
| Alexander | composition | the-fold/code-loop.js:248 | clean | keyword→apply→syntax→test→forecast each typed-gap; fallbacks explicit proceeding-disclosed; no silent default-compose |
| Kondo | dead/nascent | kernel/tournament.js:1 | noted | tournament nascent (tests + named fixer driver, never dead); construction.js dead pre-existing test-only, not this diff; workspaces in os.tmpdir outside repo |
| LeviStrauss | stash × problems | — | clean | 0 of 22 match; fixer driver + battery remain open with no stash piece claiming them |
| Marshall | P16 S83 S84 cited, none edited | — | clean | trials append losers refused; forecast updates return new frozen objects (pinned); rounds push-only; polarity/additive/fallback faithfully applied |
| Simon/Chekhov | new modules | adapters/code/mechanical.js:1 | noted | all consumed (loop/agent/driver/tests) except tournament (tests + named driver — same note as Kondo); builders output-tested; create-learn person-run eval with RESULTS |
clean: Greenberg — no new grammar smuggled (XID/recetables per-language declared); Frankfurts other half — no UNLICENSED (builder-header precedent holds)

## 2026-09-18 — Colony two: Sanskrit clause structure learns, shipped reader confirmed (eoreader7, working; san clauses)
fast: 3 files · 30 affected tests pass (sanskrit 26, competence 4) · law: ok — no P/S citations added or edited; WARNs pre-existing
| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Diaconis | rerun bar, deterministic | lavar/sanskrit-clause-swarm.mjs:23 | clean | no RNG anywhere; bar is the measured rerun epsilon over 5 draws — nothing to recover, nothing faked |
| Feynman | MWT skip + 0.5 floors | lavar/sanskrit-clause-swarm.mjs:43 | clean | skip is UD range/empty rows (reader-standard); floors are colony one's received operating point, emission reported beside fitness |
| Dijkstra | lowercased verb match | lavar/sanskrit-clause-swarm.mjs:99 | clean | both sides lowercased symmetrically (L8 basis); no locale standing in for identity |
| Ostrom | emission vs role blame | lavar/sanskrit-clause-swarm.mjs:96 | clean | gate misses are emission loss (78.2% reported), role misses score only emitted clauses — blame at the right scope |
| Alexander | SEG skipped, declared | lavar/sanskrit-clause-swarm.mjs:10 | clean | skip follows eoSwarm's own contract (no terrains to decompose), stated in the header — never a silent default |
| Greenberg | Sanskrit-only driver | lavar/sanskrit-clause-swarm.mjs:99 | clean | no new language assumption; IAST instrument and SOV scope carried over declared from the seam |
| Simon/Chekhov | driver + toggles | lavar/sanskrit-clause-swarm.mjs:1 | clean | 4 toggle unit tests pin the seam; driver is person-run CLI verified across two runs (pre/post participle fix) |
clean: Marshall/Holmes/Pearl/Frankfurt/Kondo/Lévi-Strauss — no law, identity, corroboration, placeholder, dead-code, or stash claim touched

## 2026-09-18 — Universalize Greek morphology seams: builder ending-lens args, shared organ injection points (main, native/{scripts,adapters/text}, lavar)
fast: 4 files · 59 affected tests pass · law: ok (0 citations) · note: build-latin-case-prior.mjs has no importing test (run-script, verified direct)
| Dijkstra | — | greek.mjs:326 | clean | exception keys stripped-lowercase both sides; the test caught my accented key, contract enforced visibly; misses fall through in disclosed order |
| Simon/Chekhov | — | build-latin-case-prior.mjs | clean | new args wired to both lens constants, nothing depends on them; defaults≡explicit proven, len-3 run fragments 122→605 as documented |
clean: Simon/Chekhov (nothing unverified became a dependency)

## 2026-09-18 — Veda instruments: sandhi splitter, pos-san.json, sandhi-tolerant correlatives (eoreader7, working; san instruments)
fast: 6 files · 40 affected tests pass (sanskrit 28, sandhi 8, competence 4) · law: ok — no P/S citations added or edited; WARNs pre-existing
| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Feynman | minlen-2 + attestation | lavar/sanskrit-sandhi.mjs:57 | clean | the length floor is declared wordhood from the eha misfire (comment says so), attestation is the received prior; empty means gap, tested |
| Dijkstra | norm lowercase | lavar/sanskrit-sandhi.mjs:45 | clean | same L8-covered basis as the seam; IAST lowercasing symmetric both sides |
| Greenberg | Aṣṭādhyāyī-cited rules | lavar/sanskrit-sandhi.mjs:14 | clean | Sanskrit-only instrument by filename and citation (6.1/8.2–3) — declared, never universal |
| Kondo | -as fallback + artifact | lavar/sanskrit-sandhi.mjs:115 | clean | the fallback branch executes (loop tries -aḥ then -as), not dead; pos-san.json now consumed by the clause-swarm driver (identical outcome to 16 digits) — nascent closed |
| Simon/Chekhov | new module wiring | lavar/sanskrit-sandhi.mjs:1 | clean | 8 unit tests + RV 1.1 demo deltas (9 splits, agne ×2→×4, devaḥ subject, yad/tat found); seam wiring of splits is the declared next |
clean: Marshall/Diaconis/Holmes/Pearl/Ostrom/Frankfurt/Alexander/Lévi-Strauss — no law, randomness, identity, corroboration, credit, placeholder, composition, or stash claim touched

## 2026-09-19 — falsification fixes + harness battery at 80% (main, staged 10 files)
fast: 10 files · 112 affected tests pass · law: no P/S citations in diff lines; WARN pre-existing dups only
| lens | citation | file:line | verdict | one line |
| Feynman | measured bar, never tuned | adapters/code/encounters.js:73 | clean | pyDefs>=3 + parens>=2x + colon-header, each measured (Flask/prose/essay); essay written AFTER the bar to break it (test name says falsified) — adversarial by design, never a fitted golden |
| Dijkstra | suffix lowercasing | adapters/code/py-engine.js:159 | clean | extension routing only; XID lookarounds not \b; identity untouched everywhere |
| Ostrom | claim scope | eval/results/harness-baseline-RESULTS.md:1 | clean | per-run table with box-state caveat; 55% contention run reported not hidden; credit to harness authors + gemma; control 0/20 frames the mouth at +15 |
| Frankfurt | placeholders | adapters/code/mechanical.js:224 | clean | arg0 placeholders + never-invent-0-arg default disclosed; stub bodies honest absence |
| Alexander | composition | adapters/code/mechanical.js:562 | clean | whole-file composes slice-only; loop chains mismatch→wider→whole with fallthrough, no silent default-compose |
| Simon/Chekhov | new driver | eval/the-fold/harness-run.mjs:1 | noted | person-run eval class (wilson-driver precedent) but EXERCISED not untested: 4 full battery runs + control through it; runCodeLoop same standing as before |
clean: Diaconis/Holmes/Pearl/Greenberg/Kondo/LeviStrauss/Marshall/Frankfurt-half — not routed; no RNG, no identity merge (collision refusal), no corroboration claim, no new grammar, stash checked last commit, no law edited, no UNLICENSED

## 2026-09-19 — the canon IS the ground: AntiStrauss physics field byte-grounded on the committed sacred texts (main, canon-ground)
fast: 36 files · affected tests pass 66/66 (correct path; chorus-fast's tests/conformance invocation is a pre-existing runner-path quirk) · law: WARN none-new (dup:P115 P116 P117 P19 P233 dup:S17 S96 pre-existing; cite: S02 S07 are OCR noise in canon bytes, not code citations; P5.2 in canon-ground.mjs resolves)
| Simon/Chekhov | new module | native/the-fold/canon-ground.mjs:1 | clean | imported by conformance test + grounding/refutation/self/antistrauss; no unwired export (GROUND/GROUND_REF consumed by the conformance test and the record)
| Kondo | stray | canon/*.provenance.json | noted | documented convention (canon/README.md) — sha256 sidecars the conformance test reads; Kondo's name-scan cannot see it
| Diaconis/Feynman/Holmes/Pearl/Ostrom/Frankfurt/Alexander/Greenberg/LeviStrauss | canon bytes | canon/*.txt | false-positive-on-review | OCR noise inside the committed texts, not measurement; lenses tripped on corpus prose
| Marshall | law | (none edited) | clean | no law file edited; the one code citation (P5.2) resolves; S02/S07 cited in canon OCR only
clean: none — canon bytes trip every lens by their own prose; all false positives

## 2026-09-19 — per-behavior build driver + verdict-shaped ask routing (main, composed-fixer)

fast: working-tree diff (multi-session) · affected tests 30/30 pass (composed-fixer, verdict-shape, code-loop, build-clarify) · law: none edited; CODE-INVENTORY entries updated (living inventory, not law); chorus-fast FAIL = the pre-existing native/tests/conformance baseline failures, identical on `git stash` (lyric-shape, shape-battery, ethos, chitchat, correction-rule, conversation-fold, native-boundary, recursive-reader-e2e, ethos-compendium, root-canonical, bypass 1/2) — zero regressions from this diff
| Simon/Chekhov | new module | native/organs/composed-fixer.js:1 | noted | NASCENT, not dead: built + driver-tested + imported by its test, but not yet wired into a production seam (harness / /v1/code); disclosed as driver-tested in CODE-INVENTORY F.1, next step is a live-mouth run
| Diaconis | measurement | native/conformance/verdict-shape.test.mjs:14 | clean | the effect is real and measured: detectAnswerShape re-routed Control B's exact verdict ask composition→verdict (200 tokens, chat); plain questions and named-genre compositions pinned unchanged; no tuned constant
| Frankfurt | gate truth | native/organs/composed-fixer.js:113 | clean | synthesized gates import the REAL entry from the REAL module and execute under real python3/node (green asserted in tests) — never a placeholder verdict
| Dijkstra | base unit | proxy-runner.mjs:1688 | clean | verdict routing is per-ask shape logic at the same seam as greeting/command/void/natural; extendable + chatVoidCheck exclusions updated at their own sites; no toLowerCase standing in for identity
| Kondo | dead code | proxy-runner.mjs:2573 | clean | VERDICT_MAX_TOKENS + VERDICT_RES both consumed; "verdict" added to both exclusion lists; code-loop `turn` seam defaults to the unchanged runProxyTurn mouth (proxy.mjs/harness-run.mjs callers untouched)
clean: Holmes/Pearl/Ostrom/Alexander/Greenberg/LeviStrauss/Marshall — no identity merge, no corroboration claim, no credit/absence, composition organ self-contained, no language-grammar smuggling (shape regexes are the repo's existing English seam), no law edited

## 2026-09-19 — the anti-matter of every terrain: negative space for minds, sessions, and the swarm (eoreader7, staged 8 files)
fast: 8 files · affected suites green (antimatter 30/30, swarm-residue 8/8, theory-of-mind/perspective/for-whom 43/43, root 81/81) · law: citations resolve (P159 S6 II.11); WARNs pre-existing (dup P115/P116/P117/P19/P233, S17/S96); FAIL = 3 pre-existing, proven unrelated (root-canonical + native-boundary legacy CommonJS kernel.js; recursive-reader-e2e fails identically with the stale mirror — untracked test + stale untracked mirror, canon-ground dep missing before this diff)
| Diaconis | measurement | swarm-server.mjs:50 | clean | derived-terrain effect measured live (55 unplaced → 7 touched on the real swarm path); deterministic cube arithmetic, no RNG/null/threshold
| Holmes | identity | native/kernel/antimatter.js:68 | clean | holder identity exact-string; the collide gate splits (refuses cross-holder) rather than merging — no alias merge
| Alexander | composition | native/kernel/theory-of-mind.js:714 | clean | parliament holes ledger composes with nulls for unmeasured folds, never silent zeros
| Marshall | citations | native/kernel/antimatter.js:41 | clean | P159 holds (all added fields projected at call time, nothing stored); S6 pinned by new scan test; II.11 giver named on question tables
| Simon/Chekhov | wiring | native/kernel/antimatter.js:1 | clean | every new export called live (mindAntimatter/collide by theory-of-mind; sessionAntimatter/intersection by CLI; swarmResidue/antTerrain by swarm-server) and tested; cli/eoreader7.mjs is a person-run command, covered by live CLI + proxy probes
clean: (routed five, all answered — no remaining lens has an open finding)

## 2026-09-21 — one channel on the box: the daemon is Heimdall's, the port is the door (eoreader7, staged 11 files)
fast: 11 files · root 88/88 · native 98/103 — the 5 native failures pre-exist this diff (4 conformance tests import paths that never existed in git: native/proxy-runner.mjs, native/tests/organs/correction-rule.js; chat-fact-gate "bypass point 1" fails identically with ER7_OLLAMA_URL set to the old address) · law: WARN pre-existing duplicates P115 P116 P117 P19 P233 / S17 S96 (carried, renumber in its own commit)
| Diaconis | permutation null | heimdall.mjs permutationP/settleTrialIfDue | noted | the null shuffles pooled buckets, which assumes exchangeability; buckets are time-ordered and autocorrelated, so a drift across the window reads as an effect — bounded by revert-and-concede and the four-window retry; interleaved on/off arms are the next form |
| Feynman | constants | heimdall.mjs TRIAL_ALPHA, channelRefused | noted | α 0.05 is the one calibration and rides trialsDisclosure; buckets/permutations/timeouts/tail are bounds, not thresholds; the retry hold doubles under the slaSeconds setting, never a fixed cap |
| Dijkstra | allowlist | proxy.mjs CHANNEL_ANSWER_ROUTES/CHANNEL_READ_ROUTES; heimdall.mjs serverLabelOf | clean | exact-path allowlists, default-deny like the proxy; a non-script server labels as its command basename, disclosed |
| Holmes | identity | heimdall.mjs resolveServerKey, reconcileModelServers | clean | a server is its pid (a restarted process is a new server and escapes its hold — noted); daemons are identified by the port they hold, never by name |
| Pearl | independence | heimdall.mjs startTrialFor/settleTrialIfDue | deferred-with-reason | before-vs-after shares the box's concurrent load as a hidden cause: a lever can be "held" because the evals stopped; a held rule then stands. Cost bounded (one step, disclosed evidence, operator can concede); the earned fix is interleaved arms within one window |
| Ostrom | scope | heimdall.mjs channelRefused, reconcileModelServers | fixed | blame lands on the server pid; an unresolved caller is its own port key, never pooled into anon; a reconcile on an unverified census quits nothing (the first boot acted by luck — fixed in this diff) |
| Kondo | unwired | heimdall.mjs exports | noted | ruleLeverOf / channelPort / modelServerUrl have test-only consumers (kept as the test seam); roomPathsFor remains unwired, pre-existing and named in INFERENCE-HOSTS "Not yet" |
| Simon/Chekhov | untested module | native/kernel/model-server.js | fixed | address test added (tests/heimdall-channel.test.mjs imports the module directly) |
clean: (routed eight, all answered)

## 2026-09-22 — Heimdall holds a slow turn instead of dropping its model (eoreader7, staged 4 files)
fast: 4 files · 8 affected tests 79/79 · law: ok (0 citations); WARN pre-existing duplicates P115 P116 P117 P19 P233 / S17 S96 (carried)
| Greenberg | language scope | held-turns.mjs:58 | false-positive-on-review | `object: "er7.held"` is the JSON envelope's type field, not an SVO field |
| Kondo | unwired | heimdall.mjs markUnservable | noted | still live: proxy-runner.mjs:3260 drops a model on first_byte_timeout — a second punishment path, out of this diff's scope, now on the 60 s cooldown |
| Simon/Chekhov | new module | held-turns.mjs | noted | imported by tests/held-turns.test.mjs and wired in proxy.mjs; the route-level hold (202 receipt, GET /v1/held/:id, resend reuse) proven live on a :11476 proxy, not by an automated route test |
clean: LeviStrauss

## 2026-09-22 — GFP reasoning core, cli/reason.mjs, Claude Code ledger + reasoning gate (eoreader7, staged 12 files)
fast: 12 files · root 5/5 · native 94/94 · law: ok (0 citations, after renaming battery ids S1…X2 → slip1…probe2, which had resolved as real P/S citations); WARN pre-existing duplicates carried
| Marshall | citation | reason-falsify/items.mjs | fixed | item ids P1–P6/S1–S5 resolved as citations of real law entries; renamed |
| Feynman | swallowed error | cli/claude-code-*.mjs | fixed | hooks swallowed every error; now logged to ~/.claude/eo-reason/errors.log (a hook still never fails Claude Code) |
| Dijkstra | allowlist by substring | cli/claude-code-ledger.mjs | fixed | "reasoned" was any command containing cli/reason.mjs (`cat` passed); now requires the engine's own output in the result |
| Simon/Chekhov | untested module | cli/reason.mjs, hooks | fixed | tests/reason-cli.test.mjs runs all three as real processes under a temp HOME |
| Diaconis | measurement | run-gemma.mjs | noted | the wire exposes no temperature: 3 runs per arm, split votes reported; the always-ERROR baseline (12/18) beats gemma alone (11/18) |
| Greenberg | SVO field | cli/reason.mjs:79 | noted | hyperlexicon.admit's API is subject/verb/object-named; claims enter the GFP core through claimFromTriple, the one bridge |
| Pearl | independence | cli/reason.mjs corroboration | noted | reader and declarer read the same text; the reader is independent of the declarer's ENCODING, not of the text |
clean: Holmes, Ostrom, Frankfurt, Alexander, Kondo, LeviStrauss

## 2026-09-22 — steer: a cd it cannot follow leaves the base unknown; the hook family's steer/ledger/gate land (main, 9d2a915)
fast: 4 files · 1 affected test file, 15/15 pass (also 15/15 on the exact staged tree, checked out outside the exempt roots) · law: ok (pre-existing dup WARNs only)
| lens | citation | file:line | verdict | one line |
| Feynman | constant in comparison | cli/claude-code-steer.mjs:142 | false-positive-on-review | `plain.length >= 2` is cp/mv's source+destination arity, not a tuned constant |
| Dijkstra | allowlist | cli/claude-code-steer.mjs:86 | deferred-with-reason | KEYWORDS is bash's reserved-word table; `builtin cd`/`command cd` not stripped — never observed, and missing it only restores the pre-fix behaviour |
| Kondo | unplugged writer | cli/claude-code-ledger.mjs:155 | noted | reason-claim lines are written; their reader cli/claude-code-context.mjs is another session's and stays uncommitted — nascent, not dead |
clean: Simon/Chekhov (steer spawned by tests, registered in 3.0/.claude/settings.local.json)

## 2026-09-22 — claude-code-plugin: eo-reason, the Claude Code plugin (Lovelace; branch claude-code-plugin off origin/main)
fast: 7 authored files (engine/ excluded: generated byte-for-byte from main 731fff1 and verified by claude-code/build.mjs) · 1 affected test file, 8/8 pass · law: ok (pre-existing dup WARNs only)
| lens | citation | file:line | verdict | one line |
| Feynman | skip / swallowed error | claude-code/build.mjs verify | fixed | source extraction ran from an untracked cwd and the pipe hid git's failure, so the battery silently ran 0 items; now git runs from the repo root, and a failed extraction or an empty battery fails the build |
| Feynman | constant in comparison | claude-code/build.mjs:77 | false-positive-on-review | `1 << 30` is execFileSync's maxBuffer, not a threshold on any claim |
| Feynman | check that only looks like it checks | claude-code/build.mjs verify | noted | with the canon removed, source and slice still matched on all 20 specs; only the read trace caught it (negative test run, failed as it should) — the output comparison is not the guard for data files |
| Dijkstra | allowlist | claude-code/build.mjs:85 | noted | VENDORED is a declared allowlist keyed by package name; any other bare import fails the build |
| Simon/Chekhov | new source, no test imports it | claude-code/build.mjs | noted | a build script that verifies its own output; registered as a Lovelace accountability (archon-holocracy 57ca9e0) |
clean: Pearl (SKILL.md's turn-scale corroboration note counts nothing as independent)

## 2026-09-22 — claude-code-doorway: Claude Code's hooks through the proxy; the eo-reason plugin becomes a forwarder (Lovelace; branch claude-code-doorway)
fast: 13 files · 2 affected test files, 22/22 pass · law: ok (pre-existing dup WARNs only)
| lens | citation | file:line | verdict | one line |
| Dijkstra | allowlist | claude-code-doorway.mjs:50 | noted | the PreToolUse tool set is the old hooks.json matcher's, keyed by Claude Code's exact tool_name; MCP tools that write files stay unsteered, as before |
| Simon/Chekhov | new source | claude-code-doorway.mjs | noted | imported by tests/claude-code-doorway.test.mjs and mounted in proxy.mjs; inert in a running proxy until it restarts |
| Feynman | check that never fired | cli/claude-code-state.mjs:engineRunOf | fixed | runs through the plugin's eo-reason never counted (the detector matched only cli/reason.mjs), so the skill's own command could never satisfy the gate; now accepted, banner still required |
clean: Pearl (SKILL.md's turn-scale corroboration note counts nothing as independent)

## 2026-09-22 — hard-meaning: read only pointed-at material, never the conversation's history (main, 5 files)
fast: 5 files · 4 affected test files, 36/36 + 23/23 pass · law: ok (pre-existing dup WARNs only)
| lens | citation | file:line | verdict | one line |
| Feynman | constant in a comparison | native/eval/lavar/swarm-server.test.mjs:32 | false-positive-on-review | `doors.length >= 4` is the count of chat doors, a floor against a vacuous pass (a renamed history variable empties the scan and trips it), not a tuned threshold; noted: the scan cuts each call at its first `});` |
clean: —

## 2026-09-23 — proposition-level extraction: clause-spans.js + propositionSpans, wired into the production pipeline (main, 7 files)
fast: 7 files · 20 affected test files · [.] 21/21 pass · [native] 256/258 pass, 2 pre-existing (verified via git stash: identical failures with this diff removed — tests/conformance/copula-supplement.test.mjs's own test name carries "# TODO"; tests/conformance/gfp-reading-shape.test.mjs fails on a missing fixture, native/tests/priors/pos-en.json, unrelated to this diff)
| lens | citation | file:line | verdict | one line |
| Feynman | numeric constant in a comment | reader-bundle.js:111 | false-positive-on-review | "195 -> 150" documents a measured result in a comment, not a tuned threshold in code |
| Dijkstra | word-boundary regex | clause-spans.js:87 | false-positive-on-review | `/[\p{L}\p{N}']+/gu` is Unicode-general (matches relations-gfp.js's own WORD regex), not ASCII/Latin-only |
| Pearl | "independent propositions" in prose | clause-spans.js:23 | false-positive-on-review | describes two grammatically separate propositions in the motivating example, not a statistical-independence claim |
| Greenberg | English closed classes with no language param | clause-spans.js (whole file) | fixed | clauseSpans/propositionSpans defaulted to lang/en coordinator/subordinator/relativizer sets with no loud scope statement; added an explicit "SCOPED TO ENGLISH, DISCLOSED, NOT SILENT" header section naming the override path (opts.coordinators/subordinators/relativizers/subjectPronouns) for another language |
| Kondo | routed near a comment, not actual dead code | priors.js:364 | false-positive-on-review | SUBORDINATING_CONJUNCTIONS is imported and used by clause-spans.js |
| LeviStrauss | STASH.md checked for a matching open problem | received-vocabulary-relations.js:163 | noted | grepped STASH.md for fronted-clause/proposition-order entries — none exist; nothing to reclaim, this is original logic |
| Simon/Chekhov | new source, test coverage | clause-spans.js, reader-bundle.js | noted | clause-spans.js has its own 16-test suite (clause-spans.test.mjs); reader-bundle.js has no dedicated unit test but is exercised end-to-end by native/eval/lavar/swarm-server.test.mjs (6/6 pass) |
clean: Alexander, Diaconis, Holmes, Ostrom (no composition gate, RNG, alias-merge, or credit-scope surface touched by this diff)

## 2026-09-23 — proxy.mjs: grounding gate + held-turn cache-key fix (main, 1 file)
fast: 1 file · 2 affected test files, 32/32 pass · law: ok
| lens | citation | file:line | verdict | one line |
| Alexander | composition seam | proxy.mjs:165 (groundingGate) | false-positive-on-review | no-ops safely on missing readingObj/race rather than fabricating a verdict; only ever adds a disclosure, never suppresses one -- not a silent don't-compose default |
clean: (single lens routed)

Context: found via a live 24-real-run workflow earlier this session — satisfied:true shipped in 24/24 runs regardless of grounding (race.winner='model' + claims.length=0 still read as checked), and a held-turn cache key collision (heldKey omitted attachments/workspace) served stale cross-topic answers on sequential reuse of one session. Both root-caused and fixed by a follow-up workflow, empirically verified on an isolated test instance (port 11499) without touching the shared live proxy (port 11436). See workflow run wf_3c06eb11-d44 for full investigation/verification detail.

## 2026-09-24 — proxy.mjs: ollama-shaped streaming door gains the reading envelope (main, 1 file)
fast: 1 files · 2 affected test files, 32/32 pass · law: ok (both WARNs pre-existing, unrelated to this diff)
| lens | citation | file:line | verdict | one line |
| Kondo | routed on the word "discarded" in a comment | proxy.mjs:2022,2033,2034 | false-positive-on-review | `result`/`race`/`gated` are all consumed in the same block (reading field at line 2040); "discarded" in the comment describes the PRE-fix bug, not new dead code |
clean: (single lens routed)

Context: POST /api/chat's non-streaming branch was fixed 2026-09-23 to thread void/satisfaction/disclosed into resp.reading through groundingGate. The streaming branch was untouched by that fix and was a bigger gap than it looked: `await turnScope.run(...)` discarded runProxyTurn's return value entirely, so the final done:true NDJSON chunk carried no `reading` key at all -- not just missing void/satisfaction, the whole envelope (sessionId, relationEdges, referentBindings, race, document, etc.), unlike the OpenAI-shaped SSE streaming path (~line 1769) and the swarm-routed streaming case (~line 1946) which already attach one. Fixed by capturing `result`, computing `race` via precisionWinner and gating via groundingGate the same way the non-streaming ollama path (~line 2066) does, then attaching `reading: {...}` to the final chunk. Verified live on an isolated proxy instance (port 11499/11498, PID 57496) against a real gemma2:2b call with stream:true -- final NDJSON line confirmed to carry reading.void.satisfied:false, reading.satisfaction.ok:false, reading.disclosed.unchecked:true (groundingGate correctly firing: race.winner="model", claims.length=0) -- without touching the shared live proxy (PID 58328, port 11436).

## 2026-09-23 — extractRelations' polarity window no longer crosses into an unrelated fronted subordinate clause; "not only/just X but also Y" no longer reads as negation
fast: 2 files, 352/2 affected tests (both failures confirmed pre-existing and unrelated -- reproduce identically on unmodified HEAD, neither imports relations.js/priors.js). law: ok, citations resolve (P251 P36 P43)
| lens | citation | file:line | verdict | one line |
| Dijkstra | lang/en | priors.js:51 | clean | NEGATION_CORRELATIVES is a closed, giver-named class (lang/en), not an allowlist mined from material -- same discipline every other priors.js export already holds to |
| Ostrom | P251 P43 | relations.js:239 | clean | credit correctly scoped: reuses CLAUSE_OPENERS (an existing organ) and the file's own bWord/altOf primitives; the FIRST design (last-clause-opener-before-subject) was caught failing its own second reproduction and corrected before landing, not shipped on one passing specimen |
| Pearl | — | priors.js:44 | clean | "not just...but also" independently corroborated by this repo's own CODING-LESSONS.md:1348, not invented for this specimen alone |
| LeviStrauss | — | relations.js:221 | noted, not applicable | routed on the word "patched" in a comment describing what was NOT done (patching altOf's shared cache) -- no stash reclaim involved |
| Marshall | P251 P36 | — | clean | no law file edited, only cited; both citations checked against the actual fix |
clean: (all routed lenses reviewed above)

## 2026-09-17 — Handle: Bayes on kernel/prior-query.js + priors survey (archon-bayes-priors, eoreader7)

fast: 3 files (README.md, native/kernel/prior-query.js, native/docs/THE-PRIORS-SURVEY.md) · no test imports prior-query.js, none affected · law: ok (citations resolve 1/1; pre-existing dup headers in the-fold POLICIES.md P115/P116/P117/P19/P233 and READING-SPEC.md S17/S96, unrelated to this diff)
| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Marshall | II.10 (THE-THREE-MATHEMATICS.md) | THE-PRIORS-SURVEY.md:110 | clean | the quoted clause ("an invented ratio is a change of units that fails invisibly") is verbatim from the source's own II.10 citation; no law edited, nothing self-enacted |
| Pearl | (corroboration/independence language) | README.md:210 | false-positive-on-review | cites organs/corroboration.js's refusal to invent a likelihood ratio as PRECEDENT for a naming choice, not as an independence claim about two signals |
| Holmes | (identity language) | THE-PRIORS-SURVEY.md:36 | clean | no entity merge — the live_priors path eoreader7's prior-query.js reads (`live_priors/derived-priors/`) and the corpus the-fold's priors.js describes were confirmed the SAME directory on disk (`ls /Users/mlacy/Documents/3.0/live_priors/`), not assumed from name overlap |
| Simon/Chekhov | (untested source) | native/kernel/prior-query.js | noted, not fixed | queryMeaningPotential has zero test coverage — pre-existing (this diff only added a Handle comment, changed no logic); left in THE-PRIORS-SURVEY.md's follow-up list is the mis-shaped discovered "lyric" framing, not this — noting the gap here too since chorus surfaced it independently |

clean: Feynman/Dijkstra/Alexander/Frankfurt/Ostrom/Greenberg/Diaconis/Kondo/Lévi-Strauss — no constant tuned, no base-unit coupling, no composition gate, nothing generated/placeholder, no credit misassigned, no language-universal claim, no null invented, no dead code touched or stash-reclaim performed by this diff.

## 2026-09-17 — prior-query.js: test coverage + injectable paths; clear the bad lyric framing (archon-bayes-priors, eoreader7)

fast: 3 files (native/kernel/prior-query.js, native/conformance/prior-query.test.mjs, native/docs/THE-PRIORS-SURVEY.md) · 8/8 new tests pass (working-tree scope, 1 file counted) · law: ok (same pre-existing dup headers as the prior entry, unrelated)
| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Simon/Chekhov | (prior entry's own "noted, not fixed") | native/conformance/prior-query.test.mjs | fixed | the gap chorus-lint surfaced two runs ago is closed: 8 real cases, injected fixture, no reliance on the real corpus's current contents |
| Feynman | (fabricated-content check) | live_priors/derived-priors/arc-priors/fortune-prior-v1.json | clean | the bad entry was DELETED, not replaced with another invented framing — `framingFor` verified live to return null afterward, never a fabricated substitute |
| Dijkstra | (base-unit coupling) | native/kernel/prior-query.js:34-46 | clean | `livePriorsDir()`/`{ liveDir }` follow the exact `correctionRulesFile`/`ER7_CORRECTION_RULES` shape already established in organs/correction-rule.js — one injection pattern, not a second one invented |

clean: Marshall/Pearl/Holmes/Alexander/Frankfurt/Ostrom/Greenberg/Diaconis/Kondo/Lévi-Strauss — no law cited or edited, no independence claim, no identity merge, no composition gate touched, no credit misassigned, no language-universal claim, no null invented, no dead code moved.

Full conformance suite in this fresh worktree showed 9 failures beyond this diff's own tests; traced every one to a missing gitignored fetch (legacy-eoreader6.1, mirrored from the main checkout via a local, uncommitted symlink to verify) rather than to this change — the three files that actually import prior-query.js (correction-rule.test.mjs, lyric-shape.test.mjs, prior-query.test.mjs) are 22/22 once that gap is closed.


## 2026-09-15 — Greenberg registered: S86/S89/S92/S95/S96 turned into a standing scan, wired into the chorus itself (branch `archon-greenberg-universal-order`, worktree, base `b90a546`)

Constitution: `../eo-constitution/CONSTITUTION.md` + READING-SPEC.md + README.md's Handle table. `chorus-fast.sh` run from the worktree root; fast: 3 tracked-diff files (README.md, native/READING-SPEC.md, native/organs/index.js) + 2 new untracked (native/organs/greenberg.js, native/organs/greenberg.test.mjs — chorus-fast's own diff scope does not pick up untracked files, a pre-existing gap in the skill, not introduced here) · 225 affected tests run, 219 pass, 2 fail · law: S116 written (provisional number — the live tree already carries S116–S119 from a concurrent session; disclosed in the entry itself, per S96's own precedent for this exact collision) · pre-existing WARNs unchanged (dup P115/P116/P117/P19/P233 in the-fold, dup S17/S96 here; a cite-S119 WARN is this entry's own numbering-collision disclosure text tripping the citation scanner, not an uncited claim).

**The two test failures are pre-existing, not introduced by this diff** — verified by adding a second, disconnected worktree at the unmodified base commit (`b90a546`) and running both failing files there directly: `tests/perturbation-challenger.test.js` fails identically (`ERR_MODULE_NOT_FOUND`, `kernel/perturbation-challenger.js` does not exist at this commit — the module is only present in the live, uncommitted main checkout, from unrelated concurrent work) and the live-specimen test shares the same root cause. Neither file imports anything this diff touches.

| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Marshall | S86; S87; S89 (Art. II.13); S92; S95; S96; P76 | READING-SPEC.md S116; greenberg.js header | upheld | every law citation in the new organ's header and its S116 entry was checked against the actual entry text, not just its number, before being written down — S96 in particular is the currently-duplicated header (S96 "First-person deixis" and S96 "Capitalisation starves the verb tier too"); this entry and greenberg.js's header both mean the SECOND one, named by its actual subject in prose rather than only by the colliding number, so the citation resolves even though the header itself does not yet |
| Greenberg | S86; S89; S92; S95; S96 | greenberg.js (all four scan functions) | self-review, disclosed | an organ cannot chorus-review itself into existence; its own header names what it does NOT do (fix any of the four shapes, or claim the svo_field_leak baseline as new discovery) rather than claiming completeness |
| Holmes | — | native/organs/index.js export list | clean | one more named export block, same shape as every other organ in the seam; no alias, merge or identity claim made |
| Pearl | — | greenberg.test.mjs's real-material cases | clean | each real-material assertion is checked against this repo's own current source, independently re-derived from a fresh read of the flagged lines, not copied from the earlier research pass's report without verification (two regex bugs were caught exactly this way — see below) |
| Ostrom | — | READING-SPEC.md S116, "What this does NOT do" | clean | the ~30 `needs_migration` / ~180 `bridging` svo_field_leak count is stated as a baseline mostly already disclosed by S90/S95, not claimed as this organ's own discovery |
| Frankfurt | — | greenberg.js | clean | no placeholder, no `UNLICENSED`, no constant standing in for a missing prior; the four regexes are the whole mechanism, stated as such |
| Simon/Chekhov | — | greenberg.js, greenberg.test.mjs | clean | new module, but not unwired: exported from organs/index.js, routed from chorus-fast.sh, and its own test file exercises every export directly |

**Two real detector bugs, caught by testing against real material instead of only synthetic fixtures (this suite's own II.13 discipline) before this ever reached a commit:** the first cut of `capitalization_unguarded` matched only a `.toUpperCase() === …` identity test and missed the actual shape in `corroboration.js`/`hypergraph.js` (`w[0].toUpperCase() + w.slice(1)`, building a capitalised variant for a later comparison, not an inline identity test) — both real-material assertions failed until the pattern gained a `[0].toUpperCase()` alternative. Second: a keyword-proximity "confidence" score (was this capitalisation gate probably already disclosed nearby?) was built, then dropped after `puzzle-templates.js:69`'s undisclosed English-only `AGENT_LIST_RE` scored "probably disclosed" because an unrelated puzzle template's own `giver:` field sat three lines below it — recorded in READING-SPEC.md S116 and in the organ's own header so the same mistake isn't rebuilt later.

fixed: 2 (both caught pre-commit, in this same pass — the capitalisation pattern gap and the confidence-score false positive). struck: the keyword-proximity confidence score (tried, measured against real material, removed).

## 2026-09-25 — kernel/arrow.js (Eddington): the arrow of time as a learned regularity; transplant-arm.mjs gains reversed-words + Eddington rows (main, 4 files)
fast: 4 files · arrow.test.js 9/9, surprise-segments + continuation 20/20 · law: ok (dup:P115 P116 P117 P19 P233, S17 S96 pre-existing — the-fold/READING-SPEC homonyms already reported by archon-holocracy/CRITIQUE.md)
| lens | citation | file:line | verdict | one line |
| Diaconis | II.23 | arrow.js:16 | fixed | the shuffle null was the WRONG null for direction — a reversible walk beat it 0.084 vs 0.044–0.064 because a shuffle destroys order, not just sign; replaced by a symmetrized-bootstrap null (same undirected k-grams, sign removed), measured in the test |
| Feynman | — | arrow.js:116 | no-change | `k < 2` is a structural minimum (a 1-gram has no order to reverse), thrown as a typed error, not a tuned comparison |
| Dijkstra | — | transplant-arm.mjs:86 | fixed | `toLowerCase` disclosed as deliberate case-folding for an ORDER measurement over Latin-script text; scope stated in a comment |
| Greenberg | — | transplant-arm.mjs:72 | no-change | Latin-punctuation sentence split, same scope as null-arm.mjs, disclosed in the comment above it |
| Marshall | II.23 | arrow.js | clean | no law edited; II.23 (the null is built in) cited and honoured — with the correction that the arrow needs its own null, not Rubin's |
| Simon/Chekhov | — | arrow.js, transplant-arm.mjs | disclosed | arrow.js has a 9-case suite incl. the falsification (reversible walk, i.i.d., palindrome); transplant-arm.mjs is an eval driver like null-arm.mjs, exercised on two real chapters, no unit test; arrow.js is wired only into the eval, not the reading path — named future work |
clean: (all routed lenses reviewed above)

Context: user's question "would a mind transplanted into a universe with different causality struggle?" → run it, not argue it. Result: sentence reversal reads FORWARD at the word grain and reversed-words reads BACKWARD, both chapters — the medium's arrow lives in the words, the referred arrow in the order of what they say; the reader had no Pattern-grain time organ at all before this.

## 2026-09-25 — Eddington and Partee wired into the reading path: eot-jsonl.mjs writes its own arrow and individuates times (main, 4 files)
fast: 4 files · narrative-time.test.js 4/4, arrow.test.js 9/9 · law: ok (dup headers pre-existing, reported by archon-holocracy/CRITIQUE.md)
| lens | citation | file:line | verdict | one line |
| Diaconis | II.23 | eot-jsonl.mjs (arrow block) | clean | the ledger arrow ranks against arrow.js's symmetrized null; the Partee rows were measured against the transplant's 8-draw shuffled range and sit inside it — reported as "disorder"/"held", not claimed |
| Feynman | — | eot-jsonl.mjs (habit.length >= 3) | no-change | k+1 events is the structural minimum arrow.js itself declares; a window that is the whole source gets direction null, disclosed on the line |
| Dijkstra | — | eot-jsonl.mjs (wordsOf, sentenceOf) | disclosed | case-folded whitespace words for an ORDER measurement; sentence membership by address containment, never by string |
| Greenberg | — | eot-jsonl.mjs (tenseOf) | disclosed | the tense typer is English-only and says so: UniMorph's regular past (stem+ed) is its giver, irregular pasts (went, said) are typed undeclared and counted on the coverage line — 13/182 arrangements typed past in Alice ch2, 22/134 in Tom Sawyer ch2; the received morphology prior carries lemmas, not tense |
| Kondo | — | — | clean | nothing left dead; temporal-reference.js leaves the unwired list |
| Simon/Chekhov | — | narrative-time.js, eot-jsonl.mjs, transplant-arm.mjs | disclosed | narrative-time.js has a 4-case suite incl. the honest case (reversed order gives the same counts); eot-jsonl.mjs exercised on two real chapters × 11 arms via transplant-arm.mjs |
clean: (all routed lenses reviewed above)

Context: the reader now writes EOArrow@1 into every ledger with the rest of the book as its habit — forward, sentence-reversed and shuffled read FORWARD, reversed-words reads BACKWARD, both chapters. Partee's walk binds every regular past tense (0 gaps) and, as its own test predicts, cannot see sentence reversal without a reach-back tense: typing the English pluperfect is the named next step.

## 2026-09-25 — the universal tense typer (Chomsky → clause-tense.js) and the reach-back (Pqp) in Partee's walk (main, 8 files)
fast: 8 files · clause-tense 8/8 (real model), narrative-time 6/6, temporal-reference +1, arrow 9/9 · law: ok (dup headers pre-existing)
| lens | citation | file:line | verdict | one line |
| Dijkstra | — | eot-jsonl.mjs (parseWindow … toRaw) | fixed | a REAL bug caught by order-dependence: the ledger's `at` is the origin's coordinate (toRaw) while the parser read the normalised copy — Tom Sawyer forward typed 15 past sentences and reversed 26 until every token offset was mapped through toRaw; now 37/37. Second measurement: a proposition's `at` is its END2 span (181/183), so the verb is located by the ledger's own label, never assumed inside the span |
| Dijkstra | — | clause-tense.js:locateLabel | disclosed | lowercase form-run match for the label — case-folding a token run against the ledger's own label, not identity of anything else |
| Pearl | — | temporal-reference.js:resolveReachBack | no-change | several independent threads each with a prior go to the real `adjudicate`, never "most recent" — same discipline as resolveAnaphoricTense |
| Ostrom | — | temporal-reference.js:resolveReachBack | clean | `no_prior_ground` is scoped as "not on the record", never "did not happen" |
| Greenberg | universal-grammar.js UD_FEATURES.Tense | clause-tense.js | disclosed | English adapter emitting the UNIVERSAL values (Past/Pres/Fut/Imp/Pqp); Pqp read off the had+participle construction, Fut off will/shall — English facts said as English facts; any other --lang typed undeclared on the coverage line |
| Kondo | — | eot-jsonl.mjs | fixed | the stem+ed typer retired, its number (13/182) kept here; nothing left unplugged |
| Simon/Chekhov | — | clause-tense.js, eot-jsonl.mjs | disclosed | clause-tense tested on the real trained model; eot-jsonl exercised on two chapters × 11 arms. THE CEILING, measured: of 7 had-labelled arrangements in Alice ch2, 1 reads Pqp — the perceptron tags "had" as a possessive VERB or the participle as Inf/Fin in the rest (its held-out recall is 74%). Typed coverage 77/183 in Alice ch2 (Past 50, Pres 20, Fut 6, Pqp 1) vs 13/182 before |
clean: (all routed lenses reviewed above)

Context: user — "check for our more universal tense typing, Chomsky." It was there (universal-grammar.js places Tense=Pqp, english-parser.js reads UD feats); this joins them. Partee's walk now has the reach-back, the first order-sensitive move, and its own test shows reversal changing where a Pqp lands. On real chapters every Partee row still sits inside the shuffled range under sentence reversal: too few Pqp survive the parser to move a count. The reader has a referred-time organ now; what it lacks is a tagger that sees the pluperfect.

## 2026-09-25 — Sullivan's second sense: morphology by elimination over seven treebanks, conventions stored with givers, period, region (main, 13 files)
fast: 13 files · morph-cues 8/8 (toy language), clause-tense 8/8, narrative-time 6/6, arrow 9/9 · law: ok (dup headers pre-existing)
| lens | citation | file:line | verdict | one line |
| Diaconis | II.23 | morph-cues.js (learnFeature) | fixed, three times, each measured | (1) a shuffled-argmax null IS the majority value, so every perfect cue for a majority value tied its own null — Latin Past came back "unreached"; replaced by enrichment of the cue's firing set under shuffled labels. (2) raw excess as the search-floor statistic let a rare perfect Fut ending die at a floor set by the commonest tense; z blew up on one token of a rare value (n=1, p=0.01 → z≈10) and set the floor by flukes — Latin Case coverage fell to 44%; replaced by the exact binomial tail in bits (94.2%). (3) the floor is the best of R null reruns, so the real search beats it ~1/(R+1) of the time: R raised 5→11 and stated in the header; the toy test shows the floor rising with R and killing the fluke |
| Feynman | — | morph-cues.js (lgamma, binomialSurprise) | disclosed | Lanczos g=7 coefficients are the standard table; the log-sum-exp stop (1e-12 relative) is a numeric tolerance, not a decision threshold; p=0 gets a Laplace 1/(n+1) so a value absent from the base cannot be infinitely surprising |
| Dijkstra | — | morph-cues.js (cuesOf), sullivan-morph.mjs (measuredScript) | disclosed | forms case-folded for cue keys (identity of a mark, not of a referent); script measured by Unicode block ranges, a declared table, reported with its share |
| Holmes | — | morph-cues.js (cueKey) | clean | a cue is (kind, key, class) — two forms are one cue only when all three agree; no alias merge |
| Pearl | — | morph-cues.js (split-half) | clean | the two halves are disjoint sentences, so a candidate's agreement across them is two witnesses, not one counted twice |
| Alexander | — | morph-cues.js (predict) | disclosed | cues compose by the most accurate firing cue; disagreement lands typed as contested with the rivals beside it, never averaged or silently resolved |
| Kondo | — | morph-cues.js | fixed | the unused UNIVERSAL_VALUES export removed; the priors store the convention, not the search log — refused lists stay in results/sullivan-morph.json (English prior 13.6 MB → 2.1 MB) |
| Simon/Chekhov | — | morph-cues.js, sullivan-morph.mjs, capacities.js | disclosed | tested on a toy language whose marks are known (case on the ending, tense on the auxiliary AND on its absence, participles carrying Case in a class whose finite forms carry none, one noise feature); exercised on seven real treebanks; registered in capacities.js (EVA·Paradigm) with arrow (CON·Network), narrative-time (REC·Atmosphere), clause-tense (EVA·Lens) — the registry was dirty from another session until now |
| Marshall | — | morph-cues.js (morphCuesFromPrior) | clean | a stored convention is REFUSED without giver, period, region, register, script, license and source, each with its basis (measured from the file / declared from the documentation / declared by the builder — verify); the loader's own refusal runs before any prior is written |
clean: (all routed lenses reviewed above)

Context: user — "we must learn all tenses, cases, etc. Bring Annie Sullivan in here" and "be sure our language conventions are stored with givens and the period and regional provenance". Seven treebanks (English EWT, Latin Perseus, Greek PROIEL, Vedic and UFAL Sanskrit, Arabic PADT, Hebrew HTB), every feature, learned on one half and audited on the other. English Tense 90.1% covered at 97.8%; Latin reaches Past/Pres/Fut/Pqp by form; Greek all four; Vedic no Pqp (measured, kept); Arabic carries no Tense feature (Aspect+Mood instead); Hebrew Past and Fut. Provenance per prior: source sha256, script and document sources measured from the file; giver, period, region, register from the README where one ships (Latin, both Sanskrits) else declared by the builder and marked verify (Greek, Arabic, Hebrew).

## 2026-09-25 — Sullivan's stored convention wired as the second tense witness (main, 6 files)
fast: 6 files · clause-tense 11/11, morph-cues 9/9, narrative-time 6/6, temporal-reference, arrow 9/9 · law: ok (dup headers pre-existing)
| lens | citation | file:line | verdict | one line |
| Pearl | — | clause-tense.js (tenseOfClause) | fixed | REAL: the parser's lexicon and Sullivan's cues were both learned from UD_English-EWT, so "corroborated" was two readers of one giver agreeing — now every corroboration and contest carries `independent`, false whenever the witness names PARSER_TREEBANK; an independent second giver (a non-EWT English treebank) is the named next step |
| Frankfurt | — | eot-jsonl.mjs (witnessTally.giver) | disclosed | null when no prior is on disk, and the giver line says "no Sullivan witness" rather than leaving a blank that reads as a value |
| Greenberg | — | eot-jsonl.mjs (LANG === "eng") | disclosed | the witness is English-only because only the English read has UPOS rows to feed cuesOf; Sullivan's Latin, Greek, Hebrew priors exist and wait on a class source for those reads |
| Simon/Chekhov | — | eot-jsonl.mjs, transplant-arm.mjs | disclosed | clause-tense's witness path tested with a stub (fill / corroborate / contest / unmarked / void / no token) and with the real English prior through the refusing loader; eot-jsonl exercised on Alice ch2 × 7 arms |
clean: (all routed lenses reviewed above)

Context: user — "commit to gh main AFTER you wire". Measured on Alice ch2: Sullivan filled 6 finite arrangements the parser left undeclared (Past 50→54, Pres 20→22, undeclared 106→99), corroborated 10, contested 0, held across every arm. The parser stays the primary giver; the witness never overrides it.

## 2026-09-25 — non-English reads get Sullivan's tense typer over POS-prior rows; PROIEL, PADT and HTB READMEs shipped beside their fixtures (main, 14 files)
fast: 14 files · pos-rows 4/4 (real Hebrew prior), clause-tense 11/11, morph-cues 9/9, narrative-time 6/6 · law: ok (dup headers pre-existing)
| lens | citation | file:line | verdict | one line |
| Greenberg | — | eot-jsonl.mjs (MORPH_PRIOR_BY_LANG) | disclosed | ISO codes map to STAGE-specific conventions, never to a language: heb → modern newspaper Hebrew, grc → Herodotus + NT, arb → 2001–2004 MSA newswire; modern Greek (ell) is deliberately unmapped; a read of Biblical Hebrew with the modern convention is not blocked, only named on the giver line with its period — a --period= vs convention check is the next gate |
| Holmes | — | pos-rows.js (dominantUpos) | disclosed | a form's class is its type-level majority UPOS in the received prior, so a homograph gets the majority class every time — the occurrence-level grain Sullivan's first sense already names as open; a form the prior never saw gets the empty class and no class-conditioned cue can fire (Void, not a guess) |
| Pearl | — | eot-jsonl.mjs (non-English branch) | disclosed | one witness only — no parser to corroborate or contest — and the class source (pos-heb.json, HTB train) and the cues (morph-cues-he.json, HTB test half) share a treebank, so no independent corroboration is possible for these languages yet |
| Dijkstra | — | pos-rows.js (TOKEN, dominantUpos) | disclosed | tokens are \p{L}\p{N} runs plus the apostrophe family and Hebrew geresh/gershayim; the prior is looked up lowercased then exact; offsets mapped through the caller's map (toRaw) — the same address lesson clause-tense learned |
| Ostrom | — | eot-jsonl.mjs (GIVER strings) | clean | an absent convention says "no learned convention is declared for this language and stage", never "this language has no tense"; I Kings' 0 arrangements is the chapter detector's, and the ledger says so by its own counts |
| Alexander | — | clause-tense.js × pos-rows.js | disclosed | clauseTense over feature-less rows: its English rules cannot fire (no VerbForm/Tense feats), so only the witness speaks — the seam is the one designed, not an accident, and every filled tense names Sullivan and the cue |
| Feynman | — | pos-rows.js | clean | no constants: tie-break lexical, map default identity |
| Kondo | — | sullivan-morph.mjs | fixed | every "declared by the builder — verify" that a README could answer is gone; the four that remain (Greek region, Arabic outlets' cities, Hebrew dates and country) each say the README is silent |
| Simon/Chekhov | — | pos-rows.js, eot-jsonl.mjs, sullivan-morph.mjs | disclosed | pos-rows tested on the real Hebrew prior; eot-jsonl exercised on the modern-Hebrew UDHR (17/54 arrangements typed — Past 10, Fut 7 — 10 times, 10 bound) and on Biblical I Kings (0 arrangements: detector); grc/ar/he priors regenerated with README provenance, cues byte-identical, only provenance lines changed (20–28 lines each) |
clean: (all routed lenses reviewed above)

Context: user — fix the two stated gaps. The READMEs were fetched from UniversalDependencies on GitHub (PROIEL 2.5 KB, PADT 7.4 KB, HTB 5.4 KB, with their LICENSE.txt) and now sit beside the fixtures as the Latin one does; PADT's years are measured from its own document ids (2001×16, 2002×3, 2003×20, 2004×30); HTB's test split (5726–6216) matches this file's first sent_id.

## 2026-09-25 — grounding report cut to one row per claim, utf-8 charset line, its falsification tests (main, 2 files)
fast: 2 files · reason-surface 9/9 (6/6 deliberate renderer breaks caught, checked separately) · law: WARN dup headers pre-existing (the-fold P115 P116 P117 P19 P233; READING-SPEC S17 S96), left for their own renumbering commit — the-fold POLICIES.md:770 names the risk
| lens | citation | file:line | verdict | one line |
| Feynman | the-fold POLICIES.md:382, :572 ("never silently") | cli/reason-surface.mjs copy handler (was `.catch(function(){})`) | fixed | a blocked clipboard write showed nothing, so an older clipboard could be pasted into chat as the reference; the source now says "✗ copy blocked" — works, rejects and no-clipboard paths each checked in a browser |
| Ostrom | native/docs/THE-NULL-STATES.md:52, :64 | cli/reason-surface.mjs:69 `file exists; nothing in it matched` | deferred-with-reason | a lexical miss without its scope reads as a denial: a true reworded claim went from 3/3 trusted with no checker to 0/3 with this row (reader study, 2026-09-25); the relabel is proposed to the user, awaiting their answer |
| Dijkstra | — | cli/reason-surface.mjs:78 `.toLowerCase()` | false-positive-on-review | a view filter, lowercased the same way on both sides; no identity rides on it |
| Frankfurt | — | cli/reason-surface.mjs:121 `placeholder="filter"` | false-positive-on-review | the input's hint text, not a value standing in for a missing one |
clean: none
Context: user — "make it more just a series of rows, this is overdesigned", then "falsify that this works and improves reasoning". Works held (9/9, 6/6 breaks caught). Improves reasoning did not: no-checker readers 30/36 vs rows 25/36, and on minimal-edit false twins the verdicts are chance (4/6 checkmarks on each side).

## 2026-09-25 — the period gate, and an independent second English giver (UD_English-PUD) beside EWT (main, 19 files)
fast: 19 files · clause-tense 13/13, morph-cues 10/10, pos-rows 4/4, narrative-time 6/6, arrow 9/9 · law: ok (dup headers pre-existing)
| lens | citation | file:line | verdict | one line |
| Pearl | — | clause-tense.js (sameSource, tenseOfClause) | fixed | independence is now judged against WHOEVER the witness agrees or disagrees with — the parser when it spoke, the filling witness when it did not — by shared UD treebank id; PUD shares none with EWT, so on Alice ch2 35 of 45 corroborations are independent for the first time; the 10 that are not are EWT-Sullivan agreeing with the EWT parser, still recorded as such |
| Diaconis | — | sullivan-morph.mjs (PUD), morph-cues.js (periodOverlap) | disclosed | PUD's Features are AUTOMATIC per its README, so its Tense convention (87.1% covered, 95.4% on its own audit half) is learned from a tagger's features, not gold — written into the prior's provenance.features and onto every giver line; the period comparison is a fact only when both sides declare a span, null otherwise |
| Frankfurt | — | sullivan-morph.mjs (SPANS) | disclosed | every builder-dated span (Latin, Greek, both Sanskrits, Hebrew, PUD) carries basis "declared by the builder — verify" and a note naming what the README does and does not say; EWT (2003–2006) and PADT (2001–2004) spans are measured from their own document ids |
| Ostrom | — | clause-tense.js (periodMismatch) | clean | an undeclared period on either side is null — "cannot compare", never "mismatch"; a mismatch is disclosed on the filled tense and counted, and the read proceeds (additive rule) |
| Alexander | — | eot-jsonl.mjs (witnesses order) | disclosed | witnesses are consulted in declared order (EWT, then PUD): the order decides who FILLS an undeclared clause, not what is corroborated or contested; the order is on the giver line |
| Holmes | — | clause-tense.js (treebanksIn) | disclosed | two givers are the same source when their names share a UD_<Lang>-<Treebank> id — mechanical on the strings both carry; a giver naming no treebank (a stub) reads as independent, as the test says |
| Kondo | — | clause-tense.js | clean | the single-witness form ({ witness }) is kept as sugar over the list; nothing dead |
| LeviStrauss | — | eot-jsonl.mjs (READ_PERIOD) | reclaimed | the read's period is the --period flag the EOTSource header already recorded, not a second flag |
| Greenberg | — | — | clean | no language gate touched |
| Simon/Chekhov | — | eot-jsonl.mjs, sullivan-morph.mjs, transplant-arm.mjs | disclosed | multi-witness and period paths tested with stubs (fill, independent corroboration, non-independent corroboration, contest, mismatch, null on either side undeclared); eot-jsonl exercised on Alice ch2: filled 12 (was 6), corroborated 45 (35 independent), contested 4; with --period=1865 all 12 fills flagged periodMismatch — an 1865 novel read with 2003–2017 conventions, which is the truth of the matter |
clean: (all routed lenses reviewed above)

Context: user — "keep going." The two levers named in the previous entry: a --period= vs convention-span gate (disclosure, never a block) and an independent second English giver. EWT's own README is still not shipped (its features basis reads "not on record") — the next small fetch. The honest state after this: every English read of a 19th-century text is now told its conventions are a century and a half younger; a period-appropriate English giver does not exist in UD and would have to be built.

## 2026-09-25 — the Latin read path; the POS-prior builder's hand-set licence found and fixed; EWT's documentation shipped (main, 12 files)
fast: 12 files · clause-tense 13/13, morph-cues 10/10, pos-rows 4/4 · law: ok (dup headers pre-existing)
| lens | citation | file:line | verdict | one line |
| Frankfurt | — | scripts/build-pos-prior.mjs:82 | fixed | REAL: `license: "CC BY-SA 4.0"` was a constant stamped on every POS prior ever built here; the LICENSE.txt files now shipped beside the fixtures say PROIEL BY-NC-SA 3.0 Generic, HTB BY-NC-SA 4.0 International, PADT BY-NC-SA 3.0 US, Perseus BY-NC-SA 2.5 Generic — four priors had a false licence. The builder now takes a sixth argument or reads the LICENSE.txt beside its input (licenseOf, on the file's own words) or says "unknown"; pos-grc/heb/arb.json corrected in place with the correction and its giver written into their provenance; pos-lat.json built fresh with the right one |
| Dijkstra | — | scripts/build-pos-prior.mjs (licenseOf) | disclosed | a licence name wrapped at a hyphen across lines ("Attribution-NonCommercial-\nShareAlike") is re-joined before matching — measured on PROIEL's and Perseus's files, which both wrap there; long and short CC forms handled, anything else null |
| Greenberg | Allen & Greenough §§144, 146 | eot-jsonl.mjs (LANG_PRONOUNS.lat) | disclosed | the Latin third-person set is a giver-named closed class (is/hic/ille/iste, the reflexive), short because Latin is pro-drop — the language's own typology, not under-listing; the Latin convention maps by stage (Classical/Augustan, -63..405) |
| Pearl | — | eot-jsonl.mjs (Latin) | disclosed | one witness, class source and cues from one treebank — no corroboration possible for Latin yet, same as Hebrew |
| Holmes | — | pos-lat.json | disclosed | type-level dominant UPOS per form, ambiguity preserved in the prior (166 ambiguous forms) but resolved to the majority at prediction — the known open item |
| Kondo | — | — | clean | nothing dead; the critique rerun (archon-holocracy 03774b6) shows the day's passes added organs, evals and priors but no law entries — the drill-into-policy debt is named, not paid, here |
| LeviStrauss | — | scripts/build-pos-prior.mjs | reclaimed | the existing UD builder, not a new one, produced pos-lat.json |
| Simon/Chekhov | — | eot-jsonl.mjs, transplant-arm.mjs | disclosed | Aeneid Book I read as --lang=lat --period=-29..-19: 248 arrangements, 40 tenses filled by the Latin convention (Past 32, Pres 7, Fut 1), no period mismatch, 0 Pqp — the reach-back still does not fire: 105 of 248 labels are verb-classed in the prior and the Pqp ending cues (-erat, -rat) also fire on presents (temperat, parat), so the diagnostic over all 281 verb-classed tokens lands 84 contested. The Latin transplant held on every row. Honest state: Latin runs; the referred-time organ has still not moved on any text |
clean: (all routed lenses reviewed above)

Context: user — "keep going" (Latin first), then "be sure that our competency in ANYTHING can help us comprehend ANYTHING regardless of modality." The Latin result says the same thing the English one did: text keeps failing to show the reach-back moving. The next entry takes the organs, unmodified, to code and MIDI.

## 2026-09-25 — modality transfer: Eddington and Partee, unmodified, on code and on music (main, 6 files)
fast: 6 files · code-time 5/5 · law: ok (dup headers pre-existing)
| lens | citation | file:line | verdict | one line |
| Diaconis | II.23 | modality-transfer.mjs | disclosed | the nulls are the organs' own (arrow.js's symmetrized bootstrap; eight seeded shuffles for code-time, ranked as the transplant does); the music result is reported as it fell — both pieces irreversible beyond their nulls, the direction from one piece not carrying to the other (the Prelude reads "backward" against the Aria's habit, the Aria takes none) — a finding about the interval grain, not tuned away |
| Feynman | — | modality-transfer.mjs, code-time.js | clean | k=2 and 32 draws are the same declared resolution as the text runs; no constants decide a verdict |
| Dijkstra | — | code-time.js (statementsOf), modality-transfer.mjs (tokensOf, intervalsOf) | disclosed | statements are lines (no parser); code tokens lowercased for the arrow's identity; a musical event is the pitch interval between successive onsets (transposition-blind) — each a declared cut, said in the file |
| Kondo | — | — | clean | nothing dead; code-time registered at REC·Atmosphere beside narrative-time |
| Simon/Chekhov | — | code-time.js, modality-transfer.mjs | disclosed | code-time tested on a fixture with a redeclaration (forward binds all, reversed lands gaps, superseding kept); the eval exercised on two MIDI fixtures and three real source files |
| Marshall | — | kernel/temporal-reference.js | clean | the kernel organ is called, never edited or specialised — the whole point |
clean: (all routed lenses reviewed above)

Context: user — "be sure that our competency in ANYTHING can help us comprehend ANYTHING regardless of modality." Text never moved the referred-time organ under reversal (English, Hebrew, Latin: three "held"). In code, on every file, both rows are outside every shuffled draw — arrow.js bound 146→53 (shuffled 81–105), gaps 25→118 (66–90); temporal-reference.js 66→28 / 19→57; morph-cues.js 522→267 / 108→363 — and reversal is worse than disorder, because every use is then before its definition. The arrow organ reads code as it reads text (forward/backward/null). Music: irreversible at the interval grain, but Hume's habit does not cross works there; a grain where it might (contour, duration, pitch-class) is the named next probe. Drill-into-policy debt named: today's proven fixes live in this log and in tests, not yet as S-entries.

## 2026-09-25 — drilling the day's proven fixes into READING-SPEC.md as S130-S135 (main, 3 files)
fast: 3 files · build-pos-prior-license 3/3, conformance/reading-spec.test.mjs 16/17 (S120 pre-existing, confirmed via git stash before this edit) · law: ok
| lens | citation | file:line | verdict | one line |
| Diaconis | S132 | kernel/arrow.js | clean | S132 states the actual null defect (shuffle destroys order, not only sign) and its fix (symmetrized draw), already fixed and tested this session — this entry documents it, doesn't re-touch the code |
| Ostrom | S134 | eval/lavar/sullivan-morph.mjs | clean | credit/absence correctly scoped: "verify" is named field-by-field (Greek region, Arabic cities, Hebrew dates, PUD dates), never blanket-asserted as resolved |
| Kondo | build-pos-prior.mjs (isMain guard) | scripts/build-pos-prior.mjs:56 | fixed | the guard was necessary to make licenseOf importable/testable (S133's own IV.1 requirement); confirmed byte-identical CLI output on pos-lat.json before/after, no dead branch left |
| Marshall | S130 S131 S132 S133 S134 S135 S26 S89 S92 IV.1 | native/READING-SPEC.md | clean | every citation checked against the real file: S26 (offset-carrying normalisation) exists and says what S130 attributes to it; S89/S92 (language-scoped disclosure, per-segment verdicts) exist and match; IV.1 (amendment = changed failing test) satisfied by tests/build-pos-prior-license.test.js, the one genuinely new test the six entries needed |
clean: (all routed lenses reviewed above)

Context: user — "continue" (paying the drill-into-policy debt named in the previous two entries). Six fixes proven this session (toRaw address mapping, END2-span label location, the shuffle-null-for-direction defect, the license-default bug, the four treebanks' now-shipped documentation, and Latin joining the read path with its Pqp limit honestly diagnosed) are now numbered law, each with a Generality tag and a cited test. S120's missing-tag failure predates this session and is untouched.
