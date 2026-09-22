# Experiment: how discovered structure should make the EOT skeleton, and how flesh should grow on it (2026-09-21)

## The question

The generation pipeline (native/the-fold: `eot-draft.js` → `arrange.js` →
`steer.js` → `prosify.js` → archons → `loop-check.js`) now has four kinds of
structure it can discover in any source.

- **Referents**: who each statement names (`referents.js`).
- **Kinds**: series such as graded recommendation statuses, found by the engine's own kind organ (`kinds.js` over kernel/kind-induction.js + entity-kind-induction.js) at p ≈ 0.0088 on the OHS follow-up fixture. Correction, made honest by `kinds-falsify.test.mjs`: this specific series has no majority `labelOf` prefix ("Status: Implemented." repeats a VALUE, not an enumerator like "Observation B,"), so `kindSentence()` genuinely returns `null` for it — kind *detection* is measured and stable; kind *rendering* has a real, now-documented gap that silently drops a cleared kind rather than describing it. The "N alike" phrasing used earlier tonight was this session's own probe-script fallback for the null-label case, not real pipeline output — do not repeat it as if it were.
- **Terrain and stance** for every EOTRich address, through `cellOf(op, grain)` (kernel/cube.js). Measured on OHS, stance leans separate the acts that words could not.
  - Making: a recommendation.
  - Composing: a motion carried.
  - Tracing: reported speech.
  - Binding: classifying.
  - Unraveling: an outcome.
  - Clearing: negation, weak until weighted by rarity.
- **Extent**: the dates and years each statement carries.

Nobody knows yet the best way to turn that structure into the EOT skeleton,
or the best way to put flesh on the skeleton recursively. So this is an
experiment, not a build order: the same sources, several arms, measured the
same way.

## Arms

**Skeleton arms** need no model. They are cheap, so every arm runs on every source.

| arm | how the EOT outline is made |
|---|---|
| A0 control | the committed arrangement: beings joined by the occupancy and runs nulls, size split, time repair |
| A1 kinds first | kinds fold each series into one stated kind plus saturating spans; the rest stays in material order |
| A2 stance moves | sections by rarity-weighted stance lean, ordered by the form's moves: frame → findings → prescriptions → outcomes → accounts → decisions |
| A3 terrain roles | sections by rarity-weighted terrain lean |
| A4 terrain × stance | A2 and A3 combined, with kinds folded inside |
| A5 mouth-led | raw paragraphs, membership decided only by the one-question yes/no votes |

**Flesh arms** run on the best two skeletons.

- **F1**, today's path: each section's prose is drawn whole, with finer draws and floors beneath it.
- **F2**, level by level (Hora). Every level is loop-checked against the one below.
  1. One sentence per section. That makes a complete abstract, usable on its own.
  2. Each sentence grows to a paragraph carrying the section's kind and spans.
  3. The remaining spans are woven in.

## Measures, the same for every arm

- **Skeleton** (no model): the ask's questions covered; how much of the source the kinds fold; move-order violations and time inversions; section count against the declared form; the largest section's share of statements.
- **Piece** (`loop-check.js`): facts carried, the ask's questions answered, findings still licensing a revision, model calls and seconds.
- **Judgment**: a blind pairwise editor verdict with the sources open (which piece is better, plus each piece's factual errors). This catches invented causes and misattribution.

## Sources

- Cumberland: tidy, already shaped like an essay.
- OHS: four real audit documents, messy.
- A meeting transcript.
- A narrative.

A method that only works on audit reports is only for audit reports.

## Order

1. Build the statement profile: rarity-weighted terrain and stance leans.
2. Run all six skeleton arms offline on all four sources, into one table.
3. Run F1 and F2 live on the two best skeletons.
4. Get the blind editor verdicts.

Each step's results are appended to this file.

## Open, not decided here

Should negation and absence verbs address to `NUL`, the Void terrain, in the
universal grammar? Today negation is `DEF·Ground` (Atmosphere) and "lacks" is
`CON·Figure` (Link). The "EOT enrichment" session owns the grammar. The
stance face already carries absence as Clearing.

## Results

### Step 1 — statement profile (`native/the-fold/profile.js`)

Built and falsifiable: `profile-falsify.test.mjs`. Every EOTRich address maps
through `cellOf` to a terrain and a stance; each address is weighted by its
surprisal in its own source, and a statement's lean is its weighted share
minus the source's baseline. A statement with no parse has no profile
(stated, never guessed).

Baselines across the four sources (the grammar's common ground is the same
everywhere — Binding ~36–40%, Tracing ~18–22%; the acts that separate the
dossier are the rare ones):

| source | statements | stance baseline (top) | terrain baseline (top) |
|---|---|---|---|
| cumberland | 23 | Binding 39.6, Tracing 22.2 | Entity 34.8, Network 22.2 |
| ohs | 506 | Binding 39.8, Tracing 18.3, Making 8.6 | Entity 33.9, Network 17.4 |
| transcript | 929 | Binding 36.9, Tracing 17.7, Tending 14.1 | Entity 31.0, Link 17.0 |
| narrative | 59 | Binding 36.3, Tracing 22.1 | Entity 31.1, Network 22.8 |

Making (a recommendation) is an OHS act; Tending (care work) an
OHS-transcript act. Clearing (negation) and Composing (a decision) sit below
the top four on every source — the rarity the surprisal weighting exists for.

### Step 2 — six skeleton arms, offline, on all four sources

Runner: `native/eval/the-fold/skeleton-arms.mjs`; full table and samples in
`native/eval/the-fold/results/terrain-stance-2026-09-21/`. A5 (mouth-led)
needs the model and runs with the flesh arms. Measures, per
`measureArm`: sections; largest share (statements in the biggest section /
all); split (author paragraphs whose statements land in 2+ sections);
inversions (a section whose dates all precede the one before); kind fold
(statements inside a kind section / all); coherence (within-section /
across-section claim-word Jaccard, >1 means sections hold together more than
chance pairs); vsForm (section count minus the declared 5-paragraph essay
form; no ask stated a length). Every arm covers every question the ask names
(no arm drops statements; the ask's questions are 1/1 or 2/2 everywhere).

| source | arm | sections | largest | split | inversions | kindFold | coherence | vsForm |
|---|---|---|---|---|---|---|---|---|
| cumberland | A0 | 8 | .17 | 1 | 0 | 0 | 1.94 | 3 |
| cumberland | A1 | 9 | .26 | 7 | 0 | .48 | 2.47 | 4 |
| cumberland | A2 | 8 | .30 | 7 | 0 | 0 | 1.22 | 3 |
| cumberland | A3 | 9 | .22 | 7 | 2 | 0 | 1.13 | 4 |
| cumberland | A4 | 11 | .26 | 7 | 1 | .48 | 2.48 | 6 |
| ohs | A0 | 35 | .07 | 1 | 0 | 0 | 2.28 | 30 |
| ohs | A1 | 36 | .07 | 0 | 0 | 0 | 2.25 | 31 |
| ohs | A2 | 9 | .20 | 33 | 0 | 0 | 1.59 | 4 |
| ohs | A3 | 9 | .18 | 33 | 1 | 0 | 1.80 | 4 |
| ohs | A4 | 65 | .08 | 33 | 1 | 0 | 2.55 | 60 |
| transcript | A0 | 2 | 1.00 | 1 | 0 | 0 | 1.85 | −3 |
| transcript | A1 | 1 | 1.00 | 0 | 0 | 0 | — | −4 |
| transcript | A2 | 10 | .19 | 1 | 0 | 0 | 1.57 | 5 |
| transcript | A3 | 10 | .14 | 1 | 1 | 0 | 1.72 | 5 |
| transcript | A4 | 76 | .08 | 1 | 2 | 0 | 2.24 | 71 |
| narrative | A0 | 16 | .14 | 1 | 0 | 0 | 1.68 | 11 |
| narrative | A1 | 22 | .15 | 6 | 1 | .15 | 1.87 | 17 |
| narrative | A2 | 10 | .15 | 14 | 1 | 0 | 1.24 | 5 |
| narrative | A3 | 9 | .17 | 14 | 1 | 0 | 1.30 | 4 |
| narrative | A4 | 24 | .15 | 14 | 1 | .15 | 1.56 | 19 |

Reading, arm by arm:

- **A0 (control)** keeps the author's paragraphs whole (split 1 on three
  sources) and holds the best coherence on OHS and narrative. It fails on
  the transcript — a single-line Whisper transcript has one block seam, so
  the arrangement has nothing to split and puts the whole 929 statements in
  one section (largest 1.00). It also overshoots the declared form on OHS
  (35 sections against 5): the control's "no section larger than the
  largest paragraph" has no paragraph to bound it.
- **A1 (kinds first)** folds the induced kinds on cumberland (48% of the
  statements, two cleared candidates of 5 and 2 members, p ≈ 0.015 — both
  correctly detected, both unlabeled: neither repeats an enumerator prefix,
  so `kindSentence()` gives them nothing to say, same gap as the OHS
  status series) and narrative (15%); on OHS both induced kinds are ground
  — their members spread through more than half the source, so the
  majority rule keeps them out, and A1 becomes the paragraphs, 36 sections.
- **A2 (stance moves)** fits the declared form on OHS (9 sections) and
  rescues the transcript (10 sections, largest .19) — but it shatters
  author paragraphs (OHS split 33): a stance pulls statements together
  across the source, out of their paragraphs.
- **A3 (terrain roles)** matches A2 on form-fit, beats it on OHS coherence
  (1.80) at the cost of an inversion.
- **A4 (terrain × stance, kinds folded) is the finding.** The joint face
  holds statements together better than any single face — the highest
  coherence on every source (2.55 OHS, 2.24 transcript, 2.48 cumberland) —
  but it explodes the section count (65–76 on the large sources) because
  every distinct (terrain, stance) pair becomes its own section. The pair
  needs an adjacency/merge licensing step (the original design's "kept
  adjacent"), not a global grouping. That is the arrangement build: group
  by kind, otherwise by shared dominant terrain role and stance move **kept
  adjacent**, with a null licensing a merge.

**The two skeletons for the flesh phase: A0 and A2.** A0 is the only arm
that keeps paragraphs whole on the sources that have paragraphs, and it is
the committed pipeline. A2 is the only arm that survives the transcript and
the only one that lands on the declared form for the messy dossier. A4's
design — not its raw output — is what the flesh phase's arrangement should
adopt.

### Step 3 — F1 vs F2, live, on A0 (two test calls; A2 not yet run)

A real bug was caught reading `flesh2.js` before spending a call on it:
`mL3` was declared `const` and reassigned on the level-3-undo branch —
`TypeError` at runtime, but only when L3 is actually judged worse than L2,
so it does not fire on every run. Fixed (now `let`); `flesh2-falsify.test.mjs`
adds regression coverage for the undo path.

A second, data-side bug: `drive-flesh-arms.mjs`'s default ground was the raw
PDF-derived audit text, letterhead and page headers included
(`plans/ohs/ground/AUD-HID-FOLLOWUP-2025.txt` — "METROPOLITAN NASHVILLE
GOVERNMENT / OFFICE OF INTERNAL AUDIT", the committee members' names as a
header line). It had already leaked straight into a floored piece in an
earlier run. Fixed: the default is now `fixtures/ohs-followup-audit.md`, the
same document with the letterhead and page furniture stripped, paragraphs
only. All step-3 numbers below are against the clean ground.

Runner: `native/eval/the-fold/drive-flesh-arms.mjs --arm A0 --flesh F1|F2`.
Full JSON and final pieces in `native/eval/the-fold/results/terrain-stance-2026-09-21/`
(`flesh-f1-a0.json`, `flesh-f2-a0.json`, `pieces/retest-f1-a0.txt`,
`pieces/retest-f2-a0.txt`).

| | F1 (draw whole, finer recurse) | F2 (level by level, Hora) |
|---|---|---|
| seconds | 388 | 353 |
| model calls | 35 (prose 14, tighten 3, turns 2, steer 16) | 38 (prose 19, turns 3, steer 16) |
| facts at the floor | 10 of 15 | 12 of 15 |
| archon findings, first read | 6 | 3 |
| findings still licensing a revision | 4 | 3 |
| mouth votes licensed | 8 of 16 | 7 of 16 |

F2's own level checkpoints (`levels` in its JSON): L1 (one sentence per
section) carried 4 of 15 facts — a real abstract, already readable, at the
cost of 13 findings still licensing a revision; L2 (grown to a paragraph)
jumped to 15 of 15 facts, 3 findings; L3 (remaining spans woven in) made no
change — L2 had already saturated the section, so L3's only job (floor
whatever L2 missed) had nothing left to do. The turns pass was undone live:
`check: Loop · turns · worse · undone` on the ledger — loop-check.js caught
a transition that made the piece worse and reverted it, mid-run, exactly as
designed.

**Reading the two final pieces side by side** (both are real, both cite the
same 15 facts):

- F1's *first* prose draft of its opening section invented an unfilled
  placeholder — "conducted by [Name of Audit Committee]" — naming an entity
  the source never names. The archon/fold/tighten pass caught and removed it
  before the final piece; it does not survive. A real save, and evidence the
  bracket-placeholder case needs its own check (`inventedNameRuns` doesn't
  fire on it, because it isn't a capitalized proper-noun run).
- F1's *final* piece still carries a genuine meta-leak that nothing caught:
  "**Note:** You can continue this section by adding more details about the
  implementation of the remaining recommendations." — the mouth addressing
  the reader about the essay, not part of the essay. `isMetaSentence` does
  not fire on this phrasing. F2's final piece has no meta-leak.
- A clause that reads like a restatement in both pieces — "Recommendation
  B.1, on updating the policies…" followed later by "Outstanding action:
  continue the update process for the Coordinated Entry policy…" — is
  **not** a duplication bug: both are distinct verbatim sentences in the
  source (checked against `fixtures/ohs-followup-audit.md`), both genuinely
  true, both floored because the mouth never wove them into one sentence.
  This is the floor mechanism holding under a weak mouth, not a defect.

**Read from two calls, not a sweep — provisional at the time.** F2 finished
faster, with fewer open findings, no meta-leak, and its own live proof that
the loop-check machinery does what it is for (catching and reverting a bad
loop, not just measuring after the fact). F1's fold/tighten pass caught one
invented placeholder that F2 never produced in the first place. That looked
like F2's real advantage — narrower per-level prompts leaving the mouth less
room to invent — but it needed A2 to become a finding rather than a lean.

### Step 3, completed — the full 2×2 (F1/F2 × A0/A2), live

Two more calls, same ground, same task, same model. All four JSONs and
final pieces are in `results/terrain-stance-2026-09-21/` (`flesh-{f1,f2}-{a0,a2}.json`,
`pieces/retest-{f1,f2}-{a0,a2}.txt`).

| | F1-A0 | F2-A0 | F1-A2 | F2-A2 |
|---|---|---|---|---|
| seconds | 388 | 353 | 316 | 254 |
| model calls | 35 | 38 | 31 | 28 |
| facts at the floor | 10/15 | 12/15 | 7/16 | 9/16 |
| archon findings, first read | 6 | 3 | 10 | 4 |
| findings still licensing a revision | 4 | 3 | 3 | 2 |

F2 is faster and lower on open findings on **both** arms, not just A0. That
part of the lean holds up. What did not hold up is "F2 invents less because
its prompts are narrower" — each flesh arm produced its own, different,
equally uncaught defect on A2, and neither is the invented-placeholder kind
F1 produced on A0:

- **F1-A2 invents unsupported editorializing**, twice, at section ends —
  exactly the "spin" class from earlier OHS runs, still uncaught by any
  archon: *"This information highlights the audit's focus on improving the
  effectiveness of the Office of Homeless Services and the commitment of
  the committee to ensuring the best possible outcomes…"* and *"The audit's
  findings have been valuable in driving positive change within the Office
  of Homeless Services."* Neither clause is in the source (checked: zero
  matches). Both a0 and a2 end on one of these; a1 does not — the pattern
  looks like it is specific to how a section's *last* recursive fill is
  drawn, not random.
- **F2-A2 produces a literal duplicate**, and the mechanism is now known
  precisely, not guessed: `carries(anchor, text)` was tested directly on
  the two sentences involved. `"Note: the Homeless Impact Division was
  formerly a part of Social Services."` carries the statement (`true`);
  the bare repeat without "Note:" does not (`false`). The statement's
  anchor requires referent `ref:auto:note` — the source's own paragraph
  label "Note:" (a capitalized token) was admitted by the discovery organ
  as a proper-noun-like referent, so the anchor for that statement
  effectively demands the literal word "Note" to count as carried. When
  L2's own text dropped that prefix, L3 read the statement as never carried
  and floored it a second time, producing the duplicate. This is a live,
  consequential instance of a gap `referents.js`'s own header already
  documents ("sentence openers… became referents of their own") — not a
  new defect, the first time it has been caught corrupting a real piece.
  Smallest fix, not yet applied (per [[feedback_verify_gates_against_real_organs]],
  wants its own falsification pass before changing referents.js): exclude
  a one-word capitalized referent that is immediately followed by a colon
  in the source from the one-word referent set — a structural label
  ("Note:", "Purpose:", "Status:"), not a name.

**Reading across all four:** F2 wins on speed and on the archons' own count
of open findings, on both arms. Neither flesh arm is defect-free, and the
two defects that survive are of different *kinds* — F1 fabricates framing
language the source never states; F2 restates a true fact because a stray
referent silently gates whether a paraphrase counts as carrying it. Neither
is caught by the current archon set. The next two checks this experiment
argues for, concretely: an editorializing/unsupported-affect check (Zinsser's
family, or a new one) for F1's failure mode, and a referent-hygiene pass
(exclude colon-labels from one-word referents) for F2's.

### Step 3, chased off one document — four more calls, two new materials

The gap named out loud: everything above ran on one document. Two new
fixtures, same scale (~1300 words), same live setup: `fixtures/call-wild-ch1-excerpt.md`
(narrative, public domain, ch. 1 of *The Call of the Wild*) and
`fixtures/scotus-oral-argument-excerpt.md` (spoken, public record, the
Wisconsin Central v. United States oral argument). The transcript has no
blank-line seams — A0 degenerates to one 88-of-89-statement section on it,
exactly as step 2 predicted for transcripts — so the transcript ran on A2,
the arm step 2 found actually rescues that shape; the narrative ran on A0,
which is viable there. `drive-flesh-arms.mjs` needed two real fixes first:
`--task` was hardcoded to the OHS question, and the output filename was not
source-scoped (`flesh-<flesh>-<arm>.json` regardless of source — running a
new source under the OHS runs' arm/flesh combo would have silently
overwritten the committed OHS results; caught before it happened).

All four pieces, checked line by line against their own source:

| | F1-narrative | F2-narrative | F1-scotus | F2-scotus |
|---|---|---|---|---|
| seconds | 404 | 313 | 632 | 700 |
| model calls | 20 | 23 | 45 | 75 |
| invented content, confirmed | "his face etched with a knowing glint"; "a battleground for Manuel's treachery" | "a chilling reminder of the wildness that lay within him" | "The heart of the debate hinges on…"; "a key point of reference" | "was at the heart of the case, now being argued before the court" |

Every one of the four invented at least one framing or descriptive clause
the source does not contain (checked by grep against the actual fixture
text, not by eye). That overturns the OHS-only reading that F2 invents
less because its prompts are narrower — on narrative and on the transcript,
**both** arms invented, in different places. OHS turns out to be the
outlier (F2 stayed clean there); everywhere else tried tonight, both did
not. The pattern that survives across all three materials and both arms:
whenever the mouth is asked to write connective or scene-setting prose
around bare facts, it reaches for genre-appropriate framing language as
the connective tissue, and that framing is uncontrolled because nothing in
either flesh arm distinguishes "this sentence links two facts" (fine) from
"this sentence asserts an interpretation, a judgment, or a felt quality the
source never gives" (invention). That is a pathos act — texture, not fact —
happening inside a pass that has no pathos/ethos-logos distinction at all.
Named to the user directly and it reframed the next build: separate an
ethos+logos skeleton phase (compose, reason-lint, recurse until settled)
from a distinct, later, recursive pathos phase (texture only, additive,
checked by its own archons, gated by Gebser rather than a level count) —
see the flow diagram and discussion carried in this session's own record,
not reproduced here since it is not code. The user's own priority call,
stated directly: the surf/hunt stage (seek multiple sources shaped to the
void, gated by a shape-match check before anything is admitted as ground)
comes first — "if we don't hunt for the shape of what would satisfy,
everything breaks." That stage does not exist in this pipeline yet; ground
is still hand-fed files. Not started as code in this session.

### Step 4 — the nine stages, wired and proven one layer at a time (2026-09-22)

The user's flow, restated as nine stages (prompt → void → surf → shape-match
→ hunt/ground → skeleton → skeleton loop → pathos pass → piece), and the
direction: "wire it up, and prove each layer one at a time, falsifying as
you go." Each stage got its own module and falsifier before the next was
wired; each was committed on its own. What each proved, and what the first
live end-to-end run (nine-live-1, the Cumberland ground, gemma2:2b, the real
web; `results/nine-stages-2026-09-22/`) then showed:

| stage | module | proven | live (nine-live-1) |
|---|---|---|---|
| 2 VOID | void-spec.js `declareForm`, `candidateFormToken`; form-referent.js | the form is a gate: an anaphor ("again") resolves off this engine's own ledger (measured); a table sign is declared, never called a measurement; anything else is unmeasured with the form-word carried ("rite @ whiteppr" → "whiteppr"). A bare form-ask's slot is null, not the ask itself. | exposition [declared], topic read |
| 3 SURF | surf.js | queries from the void, every one carrying context (a bare garbled token searched alone is noise; with context it resolves); candidates across hosts; every web failure typed | 8 hosts, 2 rounds; DDG blocked queries typed as blocked on another run |
| 4 SHAPE | shape.js | no table: a count-and-unit claim is the shape only when more fetched hosts than not state it. Sonnet 14 lines (4/4); haiku 3 lines, 17 syllables and 5 (a part); white paper: no agreed count, parts purpose/audience/problem, NAME "white paper" from the page titles — the garbled ask resolved by the sources. `matchShape` measures what the engine can count; NO → one more surf round, then stop | "5 paragraphs" on 4/8 hosts — exactly half, not more than not: no agreed shape, selection fell to the disclosed default |
| 5 HUNT | hunt.js | tier 0 by being handed over; a fetched paragraph earns tier 1 by naming a being of the subject; furniture and off-subject pages refused; exemplar pages never ground; a richer fetched duplicate leaves and the operator's statement stands | 0 admitted — the material pages never reached the hunt (see the defect below) |
| 6 SKELETON | arrange.js `licenses`, `exclude`; selectToBudget reads the learned shape | Clark's off-thesis section may leave only if it answers none of the ask's questions; Kelsen's conflict licenses only across tiers; ask > learned shape > received default | 1 finding (no tension), nothing licensed |
| 7 SK. LOOP | skeleton-loop.js | one licensed finding per loop, rebuilt not patched, a loop losing a question undone, bounded by the findings licensed at the start | settled at loop 0 |
| 8 PATHOS | pipeline-run.mjs loop | additive passes until Gebser arrives (and the shape matches where measurable); stops typed: arrived / nothing licensed / undone / changeless / budget | pass 1 spent 12 calls against a default budget of 6: stopped by budget; diaphaneity 0.52 (13 of 25 sentences transparent), 13 findings still licensing |
| 9 PIECE | "piece" line | last on the ledger, counting the loop verdicts beneath it | 4 parts, 5 verdicts |

Found only by proving, not by reading:

- `organs/web.js` `extractReadable`: the heading regex closed on `</hh2>`
  (the group already held the "h"). Every hunted source's headings had
  always been empty. Fixed against a live Wikipedia page with nine `<h2>`s.
- Kelsen's conflicting-figures lint in arrange.js had never been shown to
  fire. It depends on the parser finding subject, root and object — 8 of 33
  OHS statements, 30 of 60 narrative — and "Marlow Dam cost …" parses as an
  imperative. The falsifier uses a pair it parses.
- surf.js: a URL found by both hunts kept the first label, and one fetch
  budget was spent on exemplar pages first — so the live run's six pages
  about the river never reached the hunt as material. Fixed after the run
  (1ba5a23); the next live run is owed.
- The default pathos budget (the prose pass's own call count) is spent
  inside pass 1 on real material; a second pass needs `--budget`.

Owed, in order: a live run with the surf fix (material admitted, tier 1 on
the ledger); a live run with a stated budget to see pass 2 reduce Zinsser's
findings; the ambiguity tier of the form gate (a licensed yes/no question
over the candidates form-referent.js gathers, steer.js's discipline); shape
extraction from INSTANCES of a form (line counts of the poems themselves)
beside the descriptions; the mouth writing lines, not sentences, when the
shape is lines.

Runs 2 and 3 (same ask, `--budget 24`; `results/nine-stages-2026-09-22/`):

- nine-live-2 proved the surf fix (3 pages at tier 1) and stage 7 fired live
  for the first time — Kelsen's prefer-operator sent a fetched "flood crest"
  figure out of the skeleton, judged better, settled. It also showed fetched
  material OUTWEIGHING the operator's: 68 paragraphs against 8, headings and
  FAQ lines as statements, a fetched heading as the thesis, 71 mouth votes.
- nine-live-3, after the bound (at most as many fetched paragraphs as the
  operator handed over, most-subject-naming first; the thesis is the
  operator's): 8 fetched paragraphs admitted, two pages refused with the
  reason; the operator's thesis stands; pass 2 ran and tightened 10 → 7
  licensed findings; then Hora fired live — pass 2's turns loop was worse
  (9 licensed) and was undone, the piece standing at the last stable loop.
  Diaphaneity 0.93 (27 of 29 sentences transparent) against run 1's 0.52:
  admitted material gave the mouth more witnessed sentences to carry.
- The form gate's ambiguity tier landed (7041b42): candidates narrowed by
  the ask's own words; the mouth asked one yes/no per sharing candidate,
  licensed by exactly one yes. Its first falsifier caught the fallback
  picking the most recent ledger overall instead of the most recent
  sharing one.

Shape from INSTANCES (shape.js `instanceShapes`, 2026-09-22): a block of two
or more consecutive lines between blank lines in a fetched page is verse
(extractReadable keeps line breaks; prose comes back one paragraph per
line), and its line count is a measurement of the form, counted by the same
majority. Live: the description pages the exemplar queries reach quote
FRAGMENTS — sonnet pages: 2-line blocks on 2/4 hosts, 14 lines on 1/4 (28
verse blocks); haiku pages: 2 lines on 3/5, 3 lines on 2/5. So the stated
claims (14 lines 4/4; 3 lines 4/5) and the pages' own blocks disagree, and
the basis says so. The instance count fills the line unit only when nothing
is stated; a stated claim outranks it. Owed: a background rate for block
sizes measured on the material-hunt pages (pages not about any form) so a
2-line block's noise is a null, not a hand-set exclusion; and anthology
sources (Poetry Foundation 403s to this instrument) for whole instances.

### Step 5 — the universal hunt: DEF·Paradigm and EVA·Paradigm (2026-09-22)

The user: "what is it about the HUNT that these all require that is a
universal kind?" — then, of my first answer (count, evenness, role words,
answering positions, order), "'how many parts' idk about that," and "what
is the more EO universal way." The answer adopted: the cube is the question
set. A form is asked each of the nine operators at each of the three
grains, measured on its instances against the rest of the population as
the null. Counting is not a primitive: it is what SEG (where the material
cuts itself) looks like for some forms. The Existence and Structure rows
are measured; the Interpretation row (DEF, EVA, REC — the frame, the
verdict, the turn) is judgement, asked of the mouth and cached. "What
satisfies" is DEF·Paradigm; "an intelligent EVA" is EVA·Paradigm — cells
the capacity registry had empty.

Built: `the-fold/sound.js` (rhyme and syllables by spelling, its limit
stated), `the-fold/medium.js` (any text — plain, Markdown, wikitext — as a
sequence of classed elements; a collection cut at its recurring
separator), `the-fold/paradigm.js` (learnParadigm, evaluateParadigm).
Two bars: chance ruled out at 1/T over every test the definition LOOKED AT,
and held by more instances than not.

The control, before any result was believed: a true random split of one
population must yield nothing. It caught three defects, in order — a
per-cell level (a one-test cell had level 1: p = 0.42 admitted); a
random-comparator sort that is not a shuffle (the "random" halves differed
in composition); and T counted only after a pre-filter that reads the same
counts (1.2 false features per coincidence). After all three: 0 features
in 30 of 30 random splits of 580 real units.

Live, eight forms, each learned on half its instances against the union of
the others, evaluated on the held-out half (`results/paradigm-2026-09-22/`):

| form | learned, nothing about it written in | held out |
|---|---|---|
| English sonnet | 14 parts (98% vs 11%), ABABCDCDEFEFGG, seams after 4/8/12/14 | 60/60 in, 1/210 false |
| Petrarchan sonnet | 14 parts, ABBAABBACDCDCD — told apart from Shakespeare untold | 22/22 in, 0/248 false |
| limerick | 5 parts, AABBA, line 5 ends on line 1's word (Lear's), "There" before "Who" | 56/56 in, 0/214 false |
| man page | capitals headings NAME → SYNOPSIS → DESCRIPTION → SEE ALSO | 60/60 in, 3/210 false (headed recipes) |
| recipe | Ingredients before Procedure, lists, steps counting up, "Add…" | 40/40 in, 1/230 false |
| obituary · statute · encyclopedia prose | only "no indentation" and the like | do not separate from one another |

The three prose forms fail honestly: their difference ("died", "survived
by", "shall") is mid-sentence, where the role-word family does not look,
and in the order of what is said, which is SYN·Pattern — the parse's own
cube addresses across a unit's positions (profile.js). That is the next
layer. Known confounds recorded, not hidden: macOS ships many Perl manuals
("starts:perl"); a definition is relative to its population (a sonnet
"lacks 'there'" because limericks are in the population).

### Step 6 — Bayesian surprise as the delta to the holograph (2026-09-22)

The user: "we've lost the idea of using bayesian surprise and activation …
that's the key," then "we need the bayesian surprise as the delta to the
holograph," and "a void is one of the most useful pieces of information,
the most maybe." The archons called: Rubin (surprisal, surprise-segments.js),
Vasana and Tala (priors of what and when), Atta (activation decays unless
used), Meyer and Shklovsky (meaning at deviation from learned tendency;
organs/pathos.js, still proposed), the synapse (a rhyme is a pending signal),
and a new nomination, Itti & Baldi — surprise as belief change, KL(posterior
‖ prior), which the compendium did not have.

Built: `kernel/bayes-surprise.js` (the holograph's Pattern grain as Dirichlet
slots; surprisal and Bayesian surprise both, never confused; ABSENT as a
value every slot carries; a novel bucket so the unseen stays possible; decay
by a declared gamma) and `the-fold/form-prior.js` (learnForm: a form is what
becomes predictable, against the same instances with their order destroyed;
learned when one more instance stops changing the definition — dmdWindow's
rule; kindBoundaries: a new kind is what moves the kind being read NOW more
than its own members do, against the scan's maximum on permuted streams).

Each defect found by its own falsifier or live run: the whole-stream shuffle
is the wrong ground (the user: "be sure each hunt has a proper, relative
ground"); a slot never seen gave 0 bits — absence had to be a value (the void
fix recovered the limerick → sonnet boundary); a one-valued slot gave 0 bits
on every repeat — the unseen had to stay possible.

Live: the delta to the FORM falls 1.81 → 0.15 bits (limerick), 2.52 → 0.24
(English sonnet), 2.64 → 0.66 (Petrarchan — its sestets vary); the delta to
the CONTENT stays high (end words are what each instance fills). Found
unsupervised: limerick → sonnet → limerick at 40 and 80; English → Petrarchan
at 50; nothing in four single-kind controls. Missed: every change between
variable-length forms (man page → recipe, recipe → obituary): hundreds of
position slots drown the few role slots per fact — the next fix averages
within slot families (position, role) before across.

## The layers, revisited (2026-09-22)

What the whole of this plan is building towards, bottom up, each layer
standing on the one below — what is BUILT and measured, what is PARTIAL,
what is OWED. The organizing claim, reached this session: the cube is the
question set (nine operators × three grains), every hunt compares against a
proper RELATIVE ground, the void is information, the model is only the
mouth, and a kind is learned the way a person learns one — by expectation,
until one more instance stops moving the holograph.

| # | layer | what it does | status | where |
|---|---|---|---|---|
| 0 | **Ground readers** | any medium → a sequence of classed elements with their own attributes | BUILT for plain text, Markdown, wikitext, ABC notation; sound by spelling (no pronunciation dictionary — a named gap); MIDI, images, video exist as separate adapters, not yet elements | `the-fold/medium.js`, `sound.js`; `adapters/*` |
| 1 | **Emergent facts** | slot TYPES generated from the reader's own attributes × SIG / CON (equality) / SYN (succession); absence a value; class-wide facts lifted to the whole | BUILT; compression by lifting and implication | `form-prior.js emergentFacts` |
| 2 | **Relative grounds** | every hunt names its null: the same instances order-destroyed; the neighbours; the kind being read now; the population | BUILT for all four — but the NEIGHBOURHOODS (verse / tune / document / prose) are still declared by the study, not discovered | `paradigm.js`, `form-prior.js` |
| 3 | **DEF·Paradigm** (contrast) | what separates a form's instances from its ground; the definition compressed by dominance, satisfaction scored against all of it | BUILT, ruler and emergent; the three prose forms fail (their difference is mid-sentence and in move order) | `paradigm.js` |
| 4 | **Expectation / Bayesian surprise** | the delta each instance makes to the holograph; the form is what becomes predictable, content what stays surprising; learned when one more stops moving it | BUILT; closed-form admission | `kernel/bayes-surprise.js`, `form-prior.js learnForm` |
| 5 | **Kinds, unsupervised** | a new kind is what moves the kind being read now more than its own members do | BUILT for fixed-length forms (L→S→L, English→Petrarchan); MISSES changes between variable-length forms | `form-prior.js kindBoundaries` |
| 6 | **The parse layer** | the prose forms' difference: the order of what is said (SYN·Pattern — the arc); stance/terrain leaned per element off the real EOT parser's cube addresses, run-collapsed into `move` elements so the sequence is comparable across variable lengths | BUILT — a new attribute, not a new fact kind: emergentFacts makes position/equality/succession facts from it unmodified | `the-fold/arc.js` |
| 7 | **Referent slots** | the same hunt over a referent's relations instead of a text's positions; relation-instances (Wikidata P39 tenures) reshaped into the Ground reader's own { cls, attrs } element shape, so emergentFacts / learnParadigmEmergent run unmodified; "a president has terms" is DEF·Paradigm finding count:tenure separates multi- from single-term holders, never declared | BUILT, on the real 23-entity Wikidata fixture another session already committed | `the-fold/referent-slots.js` |
| 8 | **Memory of kinds** | a learned paradigm stored with its sources — SIG provisional, CON confirmed by a second distinct source, SEG split when the sources' disagreement beats a shuffled-marginals null, DEF refuted by a counter-instance, REC superseded by learning again; recall keeps only what holds in more sources than not, so an edition's margins do not survive a second publisher; the second sonnet costs a lookup. Corroboration bookkeeping now shared with vision/expertise via kernel/corroboration.js (extracted 2026-09-22); split's shuffle loop shares kernel/nullcheck.js with medium.js | BUILT, 7 falsifiers | `the-fold/kind-memory.js`, `kernel/corroboration.js`, `kernel/nullcheck.js` |
| 9 | **The Interpretation row, judged** | DEF / EVA / REC cells asked of the mouth, one licensed yes/no each, verdicts cached; the turn given a mechanical handle as residual surprise | PARTIAL — residual surprise (`turnOf`), the form gate's ambiguity tier; nothing else asked yet | `form-prior.js turnOf`, `form-referent.js` |
| 10 | **The instance hunt, automated** | from a definition page to whole instances (wiki categories, Gutenberg, local manuals, tune books) and their neighbours — from SEVERAL SOURCES per form, and a feature must hold across more sources than not, not only more instances (measured under compression: from one source each, Shakespeare's sonnet was defined by "line 14 indented 4" and Browning's by "every line indented 3" — the editions' typesetting, beating the rhyme scheme because it was perfect) | PARTIAL — done by hand for this study (`paradigm-gather.mjs`), one source per form; SURF still fetches descriptions | `surf.js` |
| 11 | **Generation with the learned shape** | the nine stages read the paradigm: unit, cardinality, scheme; EVA in the pathos loop | PARTIAL — the unit (lines when the shape is lines) is wired; cardinality from the shape is not (the 54-line sonnet); EVA·Paradigm not yet in the loop | `pipeline-run.mjs` |
| 12 | **The conversation holograph** | the fold stands in for the history; the mouth's input independent of the conversation's length | PARTIAL — the fold names real referents (marks blanked, df74138, shipped in 620ac6f); history is still re-sent verbatim up to the cap | `transcript-reading.js`, `proxy-runner.mjs` |

The order to take them, by what unblocks what: memory of kinds (8) makes
every learned shape reusable and is small; the parse layer (6) is what the
prose forms are waiting on; referent slots (7) test the claim that the same
hunt reads relations; generation (11) is where the learned shape finally
changes what is written. Discovering the neighbourhoods (the open item in
layer 2) is kind induction over paradigms — kinds of kinds — and closes the
last declared input the study still has.
