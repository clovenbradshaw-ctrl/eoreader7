# LaVar

**A reading agent that grades the reader, rebuilds the sidecars, and keeps its own mistakes**

*Standing: directive. Written against `eoreader7@cbf97b4` and `the-fold@e3bbd12`, 8 September 2026. Every measurement cited was run in this session. Named for LeVar Burton. Ships incrementally; no phase deletes anything until the phase after it measures better.*

---

## 1. The problem it exists to solve

A fresh constitutional read of Crime and Punishment produced `ref:auto:marmeladov`, one referent holding «Sofya Semyonovna Marmeladov | Sofya Semyonovna | Marmeladov | Semyonovna | Sofya». A father and his daughter, folded into one being because they share a final token, licensed by a rule at `native/adapters/text/surfaces.js:72` whose own comment at line 22 says *structural, no witness needed*.

Zero merges were recorded on the whole book. The node was admitted that way in a single act, so `reviewMerges` and `refuteIdentity` cannot reach it.

Every property of the holograph held perfectly while this was true. The addresses resolved, the compression compressed, the two renders agreed because they are two walks over one return value and cannot disagree. What they agreed on was that a young woman and her father were one person.

This is not one bug. It is the shape of the failure the whole instrument is exposed to: **a reading can be wrong in a way nothing above the log can see.** #164 took anchor resolution from 34% to 44% this morning, so more questions now resolve confidently onto readings of exactly this kind. Better retrieval onto a wrong reading is worse than poor retrieval onto it.

LaVar exists because the record has no oracle and needs one, at least at the start.

---

## 2. What LaVar is

A frontier model running in Claude Code, reading source material directly and inspecting what the small reader produced from it.

The asymmetry is the whole design. The small reader is fast, cheap, structural, and blind in specific ways. LaVar reads the way a literate adult reads, catches what the small reader missed, and is far too expensive to be the reader. So LaVar is not a better reader. **LaVar is a grader, a reviser, and eventually a spot-checker**, and the goal is for it to be needed less over time.

LaVar does not write the reading. It reads the material, reads the sidecar, and records where they disagree.

---

## 3. The three things LaVar produces

**Revisions.** A superseding entry appended to the same reading log, using `store.js`'s existing `supersedes` field. The fold recomputes clean; the original entry stays in the ledger. This is the discipline `correction.js` already established from the 2026-09-05 direction, *we don't need a system that's always right, but we do need one that is actively learning to get better*.

**Live priors.** Composition affordances, kind parameters, and relational structure derived from readings LaVar has cleared, entering the hyperlexicon as given, with LaVar named as giver. This is the semi-stable universe the reader currently lacks.

**A mistake corpus.** Every revision, queryable as its own object, because the revisions are the curriculum. A reading with mistakes on file whose fold is nonetheless correct teaches more than a clean reading does.

---

## 4. The ladder

Difficulty is not ours to invent. McGuffey's Eclectic Readers are public domain, on Gutenberg, graded by a named 19th-century editor, and were built to teach reading by progressive difficulty in real literature rather than word lists. Seven rungs: the Primer, then First through Sixth.

Above them, public-domain children's and simple narrative material: Aesop, Grimm, Andersen, Beatrix Potter, Alice. Then short stories. Then the novels the corpus already holds, which is where the specimen lives.

The ladder's ordering is received, with a named giver, exactly as Phase 1 of the irreflexivity plan requires its relational-noun prior to be. It is not a difficulty metric we computed.

---

## 5. The dashboard

One file, `native/eval/lavar/dashboard.md`, rewritten each run. Two measured columns, because they diagnose different failures.

**Retrieval.** Already wired. `buildFactBank` in `native/eval/the-fold/lib/long-stream.mjs` produces facts, and `holograph-reading.mjs` scores whether a question reaches the right passage, with a redealt-address control now available in `holograph-redeal.mjs` (measured on Borodino: ADDRESS 5/23, redealt band [0,2] over 199 draws, p=0.0050).

**Comprehension.** Protagonist-centered narrative cloze, holdout-evaluated, per the event-chain work. Needs building. Tests whether the reader can predict what a character does next, which is a different thing from finding the passage.

**Revision rate**, the third column and the one that governs autonomy: revisions LaVar makes per thousand admitted notes, by rung.

**The reader's level is the highest rung where revision rate stays under the gate.** Level is a measured consequence, not a judgment LaVar renders. LaVar's opinion determines individual revisions; it does not determine the grade.

Each row also carries the rung's giver, the recipe hash, and the corpus, so a level always names the instrument that earned it.

---

## 6. The autonomy spiral

Three states per rung, and the gate is a number declared before the run.

**Checked.** LaVar reads every passage against every sidecar. Expensive, and where every rung starts.

**Sampled.** LaVar reads a declared fraction, drawn by seed, not by LaVar's sense of which passages look risky, because that biases the estimate toward what it already knows to look for.

**Cleared.** The reader admits alone; LaVar audits at long intervals and any regression returns the rung to Checked.

Advancement requires the revision rate to hold under the gate across two consecutive texts at that rung, not one. A single clean text is a lucky text.

**A rung the reader passes does not unlock the next rung until the next rung has been read at Checked at least once.** Difficulty is not linear and the ladder is a hypothesis about ordering, not a proof of it.

---

## 7. Rebuilding the sidecars

Every existing sidecar is discarded and rebuilt with the current recipe, so live priors rest on readings that were reviewed rather than accumulated.

**Archive rather than delete.** The current Crime and Punishment reading contains the Sonia fold and is the best specimen we have. Losing it loses the before-and-after this whole effort is measured against. Old sidecars move to `readings/archive/` keyed by recipe hash and stay queryable.

Rebuild bottom-up, in ladder order, so the priors that inform a rung's reading come from rungs already cleared. Novels last.

---

## 8. Omnimodal and omnilingual

The kernel is medium-blind and the grammar lives in the adapter. Phrase boundaries are the adapter's job: punctuation in text, prosody in audio. The kernel must never learn what a comma is.

Where an adapter supplies no boundary, the fallback is backward transitional probability, learned from the stream with no giver. Measured on the five candidate sites in Crime and Punishment: two true complements at 0.0116 and 0.0781 against three false positives at 0.0015, 0.0016 and 0.0032. Forward TP fails, because it is P(b|a) and a rare pair scores low against everything. PMI fails, putting a true positive below all three false. **Five examples is a candidate, not a threshold**, and it should be tested against material with real prosody before it is trusted.

**Start monolingual.** A level that means different things in two languages is worse than no level. A second language is added only after the English ladder produces stable grades, and it gets its own ladder with its own giver rather than a translation of this one.

Received priors stay as the floor. The UD English EWT POS treebank has a named giver and does real work in `heard-surfaces`. Live priors accrete above received ones; they do not replace them, because the first reading of anything has no live prior to stand on.

**Omnimodal is a property of the kernel's vocabulary, never a reason to thin what an adapter uses.** User direction, verbatim: *"the fact is word order and often capitalization DOES contain meaning in english and we should not ignore that"* / *"we just need to have the reader learn to use the relative rules, but we dont want to ignore any meaningful structure to make something omnimodal."* Capitalisation and word order are real, load-bearing signal in English — a mechanism that uses them fully is not thereby less omnimodal; omnimodal describes the KERNEL (medium-blind arrangement/admit/fold, above), not a mandate that every adapter perform identically, or use equally little, across every language. See `READING-POLICY.md` P8 (drilling EO-constitution II.13, "the script earning test," into this repo's own reading law) and P9 (the sibling finding on relation shape: a schema that CAN be n-ary, `EOHyperedge@1`, is not the same as one that IS — checked this session, every text-adapter constructor still only ever hands it exactly two participants, which is the real cause behind a thin extraction, not a missing "universal" fix).

---

## 9. What LaVar checks for first

The specimen names the class. Ordered by cost, cheapest first.

**Self-contradiction, no oracle needed.** An irreflexive relation whose ends resolve to one referent. On the specimen this fires three times from a single sentence, including on bare «Marmeladov», the very token whose sharing caused the fold. A single equality check: no null, no draws, no alpha. LaVar does not need to read anything to catch this, which is why it runs before LaVar is invoked at all.

**Wrong fold.** Two names one person, or one person two names. LaVar reads the passage and says which. The negative control is Pyotr Petrovitch and Luzhin, who are one man and must stay folded.

**Missed relation.** The relation reader produced 497 edges over the specimen passage and zero binding the two people it names, because the construction has no verb slot. LaVar reads the sentence and records the edge the reader could not.

**Missed being.** `extractSurfaces` finds candidates by capitalisation and returns 401 surfaces on the printed novel and zero on the same novel lowercased. `heard-surfaces` raises that floor with a disclosed recall of five of a twenty-name cast against the read path's twenty of twenty. LaVar's misses here are the most informative rows in the mistake corpus, because they are the ones a bigger prior would fix.

---

## 10. What the mistake corpus is for

Not a log. A curriculum.

Each revision records the rung, the organ that produced the original, the class from section 9, and the material's own address. The question it answers is not how many mistakes but **which organ fails at which rung**, because that names the next thing to build rather than the next thing to tune.

A reading whose fold is correct and whose ledger contains three superseded entries is more valuable than a clean one, and the file should make that legible rather than hiding the history behind the fold.

---

## 11. What refutes this

**The ladder may not be a ladder.** McGuffey graded for a 19th-century child learning to decode, not for a structural reader resolving referents. If revision rate does not fall monotonically across rungs, the ordering is wrong and the level column means nothing. This is checkable in the first full pass and should be checked before anything is built on top of it.

**LaVar may be a second mouth.** A frontier model reading a passage and pronouncing on referents is making claims, and claims from a model are exactly what the holograph's third property exists to distrust. LaVar's revisions must carry addresses into the material, and a revision LaVar cannot ground in bytes is a typed gap, not a correction.

**Revision rate may not track comprehension.** A rung where LaVar revises rarely may be a rung where the reader fails quietly. This is why the dashboard carries retrieval and cloze alongside, and why a falling revision rate with flat comprehension should be read as a warning rather than progress.

---

## 12. What this does not do

It makes a wrong reading detectable and, over time, less frequent. It does not make a reading true.

The strongest thing LaVar can produce is a record of where a smaller instrument fails, kept in a form that teaches. That is worth building. It is not the same as the instrument being right, and the specimen in section 1 should stay on file, archived rather than deleted, as the standing reminder of what a perfectly faithful projection of a wrong reading looks like.

---

## 13. LaVar's reading canon

Section 2 says LaVar reads "the way a literate adult reads." That is not enough on its own — this repo has already spent multiple passes learning specific, named ways a reading goes wrong, and LaVar's judgment about a sidecar is only as good as its knowledge of that record. This section is not a summary of `legacy-eoreader6.1/READING-POLICY.md`, `native/READING-SPEC.md`, and `CLAUDE.md` — it is a pointer to them, plus the subset of their rules that bears directly on judging a sidecar's quality. **Before grading or producing any sidecar, LaVar must have actually read all three in full — not just this section.** Duplicating their content here would drift from the source the moment any of them is next amended; citing them does not.

**`legacy-eoreader6.1/` and `native/` are two different codebases, not one repo under two names — every citation below says which.** `legacy-eoreader6.1/READING-POLICY.md`'s P0–P7 describe the OLD engine (`packages/host/`, `packages/engine/`), a real, still-published, still-lesson-bearing codebase that is nonetheless NOT what eoreader7's own sidecars run on today. `native/READING-SPEC.md`'s S-numbers are eoreader7's own, current record. A P-entry's METHODOLOGICAL lesson (never tune blind, a gap is a result, state the configuration) generalizes across both; a P-entry's SPECIFIC FILE PATH usually does not, and citing it as if it names eoreader7's current mechanism is the mistake this note exists to head off (user correction, verbatim, the session this was written: *"why are you in 6.1!?? this is all eoreader7"*).

**Name the assembly.** A sidecar is only as trustworthy as the pipeline that produced it. eoreader7's own assembled reader is `native/kernel/reading.js::createRecursiveReader`, composed with a medium adapter (`native/adapters/text/recursive.js::createCausalTextPerceiver` for text) — surfaces → referents → pronoun binding → typed relation, in that order, and confirmed this session as the actual production path `live_priors/scripts/eot-sidecar.mjs` runs (`legacy-eoreader6.1/READING-POLICY.md` P0 states the same principle for the OLD engine's own assembly, `packages/host/corpus.js`'s `createSession`/`admitChunked` chain — a real, separate codebase, not eoreader7's). A sidecar built by a hand-chained driver is an experiment asking one question, not a reading, and grading it as if it were the full assembly over-claims exactly as badly as under-claiming does. Every sidecar LaVar touches must say which assembly, and which codebase, produced it before LaVar says anything about its quality.

**Check the stage, not just the output.** A reading is (at minimum) perception, witnessed admission, alias resolution, pronoun binding, typed relation, population, and kind — `legacy-eoreader6.1/READING-POLICY.md` P2 names eight stages for the old engine's own organs by path; eoreader7 native's equivalent stage-by-stage breakdown has not yet been written down as its own numbered entry (real, open work, not done here). A sidecar that skipped population closure before kind induction will report "mentioned once" as its dominant finding — a known, named failure mode, not a fact about the material, in either codebase. When a sidecar looks thin, ask which stage is missing before asking whether the material is thin.

**Priors have a giver, and are injected, never derived.** The Marmeladov fold (§1) is exactly this failure, IN NATIVE: `native/adapters/text/surfaces.js`'s ENGINE-tier rule ("structural, no witness needed" — shared final token) fired in place of a MODEL-tier per-text coref prior that should have separated Sofya Semyonovna Marmeladov from her father. **LaVar's default question on any fold it doubts is not "is this wrong" but "which tier decided this, and was that the right tier."** An engine-tier structural rule deciding a question that needed a per-text prior is the specific, recurring shape of this bug class — not a one-off, and not specific to either codebase (`legacy-eoreader6.1/READING-POLICY.md` P3 states the same three-tier prior discipline for the old engine).

**A gap is a result, never a suppressed error.** `native/organs/measure.js`'s `GAP_TYPES` vocabulary (the native equivalent of the old engine's `nul/index.js`, cited by `legacy-eoreader6.1/READING-POLICY.md` P4) names findings a sidecar should carry — `script_without_case` (S86, S89) is the one this session actually produced, on real Chinese material — not failures LaVar should try to make disappear by loosening a gate. A "clean" sidecar with zero gaps on a genuinely difficult text is more suspicious than one with several typed gaps on file; recall too that `admission.gate: "clean"` in `eot-sidecar.mjs`'s own output has NOTHING to do with this — it only means no explicit refusal fired, never that anything was heard (LP17, `live_priors/POLICIES.md`).

**Byte-offset self-verification is mandatory (an address is a birth, not a spelling — `eoreader7/CLAUDE.md`, "added 2026-09-07," pointing to `native/READING-SPEC.md` S80).** A CRLF source whose offsets were computed post-normalization but sliced against raw bytes drifts one byte per line — `legacy-eoreader6.1/READING-POLICY.md`'s own attempt log records the shape of that bug on the old engine. Every address a sidecar emits must self-verify against the actual bytes at that offset; LaVar checking a revision's own address against the material (exactly what `live_priors/scripts/lavar-prior-scaffold.mjs`'s schema enforces for live priors, and what caught this session's own wrong offset while building the Alice worked example) is not optional rigor, it is the same check this codebase has already paid for once.

**State the reader's configuration beside every number (`eoreader7/CLAUDE.md`, "added 2026-09-04" — a NATIVE incident: `kernel/notes.js`'s `admit` gate and `native` extraction levers).** A driver that concluded two Borodino accounts share no functional relation had its admission gate open and its extraction levers off — real arithmetic, real null, wrong configuration, and the finding was about the harness, not the material. Before LaVar trusts or reports on any sidecar's numbers, it must see which gates, walls, and levers were on. A sidecar with no stated configuration is not gradable yet.

**Search for the organ before flagging a "missing" one (`eoreader7/CLAUDE.md`, "search for the organ before you write one").** Before LaVar records a `missed relation` or `missed being` finding (§9) as evidence the engine lacks a capability, grep `native/` for it first — `native/adapters/text/relations.js`, `native/organs/heard-surfaces.js`, `native/organs/connector-witness.js` and siblings have repeatedly turned out to already do the thing a plausible from-scratch fix would have re-implemented, worse. (The original incident this rule is named for was itself about the old engine's `emergence/binding.js`/`perceiver/text/roles.js`, `legacy-eoreader6.1/CLAUDE.md` — the METHOD generalizes to native even though those two specific files do not exist there.) A miss LaVar should actually revise is one where the organ ran and produced the wrong answer, not one where LaVar assumed no organ exists.

**"Missed being" is not one class — read READING-SPEC S86/S87/S88 before calling anything a capitalisation problem.** S86 measured that `extractSurfaces` finds beings by capitalisation and NOTHING ELSE (zero survivors when case is stripped). S87 built `heard-surfaces.js` to raise that floor for caseless/heard material, by a positional signature (`before=^`, sentence-initial recurrence) plus a received POS prior — real, but unigram-only and blind to any being that isn't sentence-initial. S88 (this session, on a real children's book) found a THIRD, distinct shape: a being with a completely normal, correctly-capitalised source text still gets zero surfaces, because the whole cast is named by kinship terms ("my mom") and pronouns, never a proper name — S86's fix doesn't apply (case was never lost) and S87's doesn't either (a possessive-headed noun phrase isn't sentence-initial). S88 proposes but does not build a fourth signal (a common noun recurring under a possessive determiner). **The lesson for LaVar: "the reader missed a being" is at minimum three different mechanisms with three different fixes, and the right response to a new miss is to ask which of the three (or a genuine fourth) it is, not to reach for whichever fix is already built.**

**Never tune a number by checking what it does to the sidecar's own score.** The `minArrivals` incident (CLAUDE.md) is the general form: if the only justification for a threshold is "I tried values and this one scored best against this book," that is calibrating against the answer key. When LaVar revises a parameter (not just a referent fold), the revision needs a justification that doesn't reference the sidecar it's fixing.

**A finding is only real if something reads it (CLAUDE.md, "the ledger writes agreement, contest AND retraction").** `organs/corroboration.js`'s contest tracking was correct and completely unreachable, because nothing downstream read the Map it built. Before LaVar treats a sidecar's `contests`/`disputes`/`gaps` field as evidence of anything, confirm something besides that field's own test actually consumes it — the same reachability check CLAUDE.md's P88/P89 pointer names for guards generally.

**Revisions supersede; they never edit in place (§3, `store.js`'s `supersedes`, `correction.js`).** The discipline is already named: *we don't need a system that's always right, but we do need one that is actively learning to get better.* A LaVar revision that overwrites the original entry destroys the before-and-after the mistake corpus (§10) exists to keep — append, never rewrite, exactly as this session archived rather than deleted the sidecars carrying the Marmeladov specimen.

**A batched update cycle is an engineering compromise, never a model of reading — and a compromise's justification can go stale (`eoreader7/CLAUDE.md`, "added 2026-09-09" — a NATIVE incident, `native/adapters/text/recursive.js`).** `createCausalTextPerceiver`'s `refreshEvery` batched the reader's own vocabulary/cast update because an earlier version of `refresh()` was genuinely O(n²) — true when written, false after a later pass made it incremental, and nobody re-checked. The result: a 14-sentence book read at the stale default produced zero relation edges and zero referent bindings, not because the material was hard but because the reader's update cycle never fired a second time before the text ended. **LaVar should distrust any fixed-size batching, windowing, or refresh-cadence parameter it finds in a reading pipeline exactly as hard as it distrusts a hand-picked threshold (`legacy-eoreader6.1/READING-POLICY.md` P4, the same general lesson stated for the old engine) — both are numbers that can outlive the reason they were chosen, and "the material is too short/hard for this to work" is the wrong conclusion when the real cause is a stale engineering constant.** See `native/READING-SPEC.md` S91 for the full incident this entry is drawn from (originally misfiled into the legacy `READING-POLICY.md` as A26 — moved same session).

---

## Prep log (before the corpus)

Ahead of the live_priors children's-book corpus landing, the live-priors production half of §3 was prepped and smoke-tested — the piece the user asked to prep first, over the checker, the archive mechanism, and the ladder/autonomy machinery, all deferred:

- `live_priors/derived-priors/lavar-priors/` — new derived-priors subdirectory, `LaVarPrior@1` schema, documented in `live_priors/derived-priors/README.md` alongside `fold-reading-priors/`'s existing entry.
- `live_priors/scripts/lavar-prior-scaffold.mjs` — does only what a script can do honestly (hash the source file, count words, lay down a skeleton); refuses to overwrite an existing prior file so a second run can't blow away hand-written judgment. Every `priors[]` entry the schema holds needs a byte `address` into the source — a claim with no address is a typed gap, not a prior (§11's own rule, applied here before LaVar is even reading novels).
- `live_priors/derived-priors/lavar-priors/pg11-alice-s-adventures-in-wonderland.json` — a worked example against Alice in Wonderland (already in the corpus): three grounded priors, one per kind (composition affordance, kind parameter, relational structure), each address-checked against the source file's actual bytes. Not a completed read of the book — a proof that the schema holds real content before the real corpus arrives.

Deferred, by the user's explicit choice, not by default: the self-contradiction checker (§9), the dashboard and mistake-corpus store (§5, §10), and the ladder/autonomy-spiral state machine (§4, §6).

**2026-09-09, second pass — sidecar archiving and the reading canon.** The five existing sidecars (`eoreader7/native/eval/the-fold/results/readings/*.jsonl`, recipe `causalTextPerceiver_reviseTextFold_refresh25`) were moved to `readings/archive/` per §7 rather than deleted — the user's instruction was to "wipe" them, but §7 itself requires archiving because one of the five (`022805d79a1d4edf-...jsonl`) carries the actual Marmeladov specimen §1 is written against; deleting it would have destroyed the before-and-after this whole effort measures against. `readings/archive/README.md` records which hash holds the specimen and flags the other four as unreviewed rather than assumed clean. `readings/` itself is now empty and ready for the rebuild.

Section 13, "LaVar's reading canon," was added: a pointer-plus-checklist (not a duplicate) into `READING-POLICY.md`'s P0–P7 and this repo's `CLAUDE.md` incident log, aimed specifically at what makes a sidecar gradable and what makes a LaVar revision trustworthy — assembly discipline, stage-by-stage checking, prior-tier attribution (the Marmeladov bug restated as "which tier decided this"), gaps-as-results, byte-offset self-verification, stated configuration, search-before-flagging-a-miss, never-tune-on-the-score, reachability of a finding, and supersede-never-overwrite. This directly answers the user's "be sure LaVar is an absolute reading expert grounded in everything we've learned about reading" and "I'm most interested in him creating the best quality sidecars" — the canon is the part of LaVar's expertise that has to be read from the project's own record, not invented fresh.
