# Mechanical summary quality — a pilot (2026-09-25)

Informal pilot, not a preregistration (contrast `native/eval/the-fold/long-project/PREREGISTRATION.md`). Two documents this repo has never read, run through `pipeline-run.mjs` (task: "Summarize this document in a few paragraphs.") and, separately, through the bare mouth (`gemma2:2b`, same task, no scaffolding). Scored with organs already in the codebase: `restatement.js`'s `extractFigures`/`extractNames` (fabrication, by containment in the source), `spliceCeiling`/`detectSplice` (verbatim self-glue), `findDuplicateStatements`. Driver: `native/eval/the-fold/drive-summary-experiment.mjs`. Raw scores: `results/summary-experiment/{gpgp,magi,all}.json`.

## Numbers

| | GPGP (informational, 7767 chars) | Magi (narrative, 10514 chars) |
|---|---|---|
| pipeline: chars out / ratio | 1027 / 13.2% | 2430 / 23.1% |
| pipeline: sentences | 6 | 29 |
| pipeline: fabricated names / figures | 0 / 0 | 0 / 0 |
| pipeline: splices / duplicate pairs | 0 / 0 | 0 / 0 |
| pipeline: seconds | 40 | 121 |
| baseline: chars out / ratio | 1767 / 22.8% | 1019 / 9.7% |
| baseline: sentences | 13 | 9 |
| baseline: fabricated names / figures | 0* / 0 | 0* / 0 |
| baseline: splices / duplicate pairs | 0 / 0 | 0 / 0 |
| baseline: seconds | 14 | 35 |

\* Two "fabricated names" the scorer flagged on each baseline output ("However", "Despite") are an artifact of this pilot's own sentence splitter at a paragraph break, not a real hallucination — read back against source, both arms had zero real fabricated names or figures on both documents.

## What the numbers don't show

Fabrication, the axis the scoring was built to catch, came back clean on both arms — a real result, but this pair of documents didn't discriminate the two approaches on it. The difference that actually shows up is coverage, and it does not favor the pipeline:

**GPGP.** The pipeline's own `arrange.js`/`selectToBudget` stage dropped 14 of 19 outline slots ("Selection: 14 section(s) left out" — the run log's own line), because the ask ("summarize this document") carried no stated length, so the pipeline treated it as "write a short piece" rather than "cover the document." The output is six sentences about the patch's location, density, and 1945–now growth rate — real, sourced, unfabricated, and about a tenth of the article. The baseline, asked the same question with no scaffolding, covered contributor countries, the ecosystem findings, size estimates, and cleanup efforts — a broader account of the article, in paraphrase rather than exact sourced sentences.

**Magi.** Here selection dropped only 3 of 8 slots, but the arrangement itself (which groups body sections "by the beings they are about, ordered by extent") built its sections almost entirely from the story's opening scene — the flat, the $1.87, Della's hair, the pier glass — floor-projecting much of it near-verbatim rather than synthesizing. The piece stops before Della sells her hair to Madame Sofronie; it never reaches the watch, the combs, or the story's actual point. One pathos-tightened sentence is decoratively incoherent as a claim about the story ("James Dillingham Young emerged as the sole beacon of light"). The baseline, in nine generic sentences, at least names the whole arc — the sacrifice, the theme — though it drops every dollar figure in the story (0 figures stated) and reads as a plot-summary template rather than the story's own texture.

Neither restatement.js detector found a true positive on this material: no within-sentence splice, no duplicated fact, on either arm. That says more about this pilot's small scale than about the detectors — they'd need a bigger document or a model more prone to glue-paraphrasing to be exercised.

## Bottom line

On "summarize this document" with no stated budget, the generation pipeline currently behaves like "write a short piece grounded in this material" — which is what `selectToBudget` and body-arrangement-by-referent-extent are built to do for an essay — not "compress the whole document," and the naive small model, unscaffolded, produced broader (if less exactly sourced) coverage in under half the time on both documents. Consistent with the standing long-project result (B1 worse, 15/207): reported at face value rather than argued around.

**If this is worth pushing on next:** re-run with a task that states a coverage budget or asks explicitly for a summary of every major point, to test whether the coverage gap is a stated-ask problem the pipeline already has the machinery to fix, versus scaling this to a proper frozen corpus+scorer (the long-project's own discipline) before drawing anything durable.

## Follow-up 1: does the LLM add anything over the mechanical floor?

`pipeline-run.mjs` already computes a `floor` projection before any LLM prosify/pathos pass touches the arranged draft — the selected sentences in outline order, zero LLM-authored words (the outline's own selection did consult the mouth for a few binary cohesion votes during steering, so "zero LLM" describes the floor's *text*, not everything upstream of it). Pulled straight from the existing ledgers, no new runs. Raw scores: `results/summary-experiment/floor.json`.

| | GPGP floor | GPGP piece (LLM) | Magi floor | Magi piece (LLM) |
|---|---|---|---|---|
| chars / ratio | 1146 / 14.8% | 1027 / 13.2% | 2058 / 19.6% | 2430 / 23.1% |
| sentences | 9 | 6 | 25 | 29 |
| fabricated names/figures | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

On GPGP the floor is *longer and more complete* than the LLM's final piece — it keeps precise detail (the coordinates, "Pacific Rim, including countries in Asia, North America, and South America") that the LLM's pathos pass compressed away in favor of unsupported editorializing ("a testament to the insidious nature of plastic pollution" — not in the source, not fabricating a fact, but not the source's voice either). On Magi, the floor covers the same span as the LLM piece but without the one clearly incoherent sentence the pathos pass introduced ("James Dillingham Young emerged as the sole beacon of light" — a claim the story doesn't support). In both cases here, the LLM pass added stylistic connective tissue and, once, a real defect, without adding coverage. On this small pilot, the free, already-computed, zero-LLM floor was at least as good as the full pipeline's LLM-synthesized output — never worse.

## Follow-up 2: was the coverage gap a stated-ask problem?

Re-ran both documents with an explicit budget: "Summarize this document in 20 paragraphs, covering every major point." First attempt used the word "twenty" and silently had no effect — `void-spec.js`'s `askedExtent` only parses digits or the number-words one through twelve, so "twenty" matched neither branch and the pipeline fell back to its 5-paragraph default on both documents unnoticed until the run logs were checked line by line. Re-run with digits. Raw scores: `results/summary-experiment/budget-followup.json`.

| | GPGP, budgeted | Magi, budgeted |
|---|---|---|
| sections kept | 18 of 19 (0 dropped) | 11 of 11 (0 dropped) |
| chars / ratio | 8286 / 106.7% | 9662 / 91.9% |
| model calls | 109 (vs. 23 before — ~4.7x) | 157 (vs. 48 before — ~3.3x) |
| seconds | 478 (vs. 40 before — ~12x) | 559 (vs. 121 before — ~4.6x) |
| arrived (Gebser) | false — stopped: a loop was undone | false — stopped: a loop was undone |
| fabricated names/figures, splices, duplicates | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |

Yes — the coverage gap was a stated-ask problem, not a hard ceiling. Given a budget it could parse, `selectToBudget` kept nearly everything on both documents, and the Magi piece now runs the whole story through to the gift exchange and the closing "magi" line, which the unbudgeted run never reached.

But closing it this way traded away the thing a summary is for. Both outputs land at 92–107% of the source's own length — a paraphrase, not a compression — at 3.3–4.7x the model calls and 4.6–12x the wall time, and neither run reached the pipeline's own "arrived" state within its pathos budget. Reading both outputs by hand (necessary — none of this is visible to the token-level scorer) turned up two more defects: the GPGP piece attributes a finding about 40 animal species on 90% of the debris to "the North Atlantic garbage patch" instead of the Great Pacific Garbage Patch the source actually reports it about — both names and both figures are individually real, so `extractNames`/`extractFigures` pass it clean, and the error is purely relational; the Magi piece states "One dollar and eighty-seven cents." twice back to back (missed by `findDuplicateStatements`, which requires a figure *and* a name in each sentence to count as the same fact) and places "The other was Della's hair" before its referent, "One was Jim's gold watch," is introduced later in the same paragraph.

**Bottom line, revised:** the pipeline can trade a narrow-but-clean summary for a broad-but-bloated one by turning one knob, but it doesn't currently have a setting that is both. Getting there needs either a real length-vs-coverage objective in `selectToBudget` (not just "keep raising the cap"), or a second compression pass over the budgeted output — and, either way, a way to catch relational and discourse-ordering errors that a name/figure/splice/duplicate scorer structurally cannot see.
