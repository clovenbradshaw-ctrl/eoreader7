# The mouth's absence leak, measured — Pass 28 of the null experiments (2026-09-05)

Driver: `native/eval/the-fold/absence-leak.mjs` (writes `results/absence-leak.json`, gitignored like the other model-arm raws; the numbers below are this run's, dated). Two small models, one question, two arms. Not read by any test — a model arm (P94: said so).

**Configuration.** Production reader (recipe `9c70723fe2b4`), the product assay's two passages read on arrival, the sentence witness bound as app.js binds it (select protocol, 6 asks per part), temperature 0. Question: *"Who directed the Northgate Observatory?"* — nothing read states it. A void declared for it with scope (`void:the northgate observatory|directed|*`, 2 of 2 passages, reached). Arms: the void tier IN the ledger block (S70/P105) vs WITHHELD (control). Counted per arm from the AnswerRecord (P106): witness-refused sentences citing the declared gap vs citing none; and `unbacked` claims apart.

| model | arm | absences citing the gap | citing none | unbacked claims | s |
|---|---|---|---|---|---|
| gemma2:2b | tier in | 1 | 2 | 2 | 26 |
| gemma2:2b | withheld | 0 | 1 | 3 | 19 |
| llama3.2 | tier in | 4 | 9 | 2 | 154 |
| llama3.2 | withheld | 3 | 5 | **7** | 97 |

**What happened.** With the tier withheld, llama3.2 invented an observatory in Seattle and a director named Carl Keeler (7 unbacked claims: Seattle, Washington, the University of Washington, Carl Keeler, a figure); gemma2:2b dodged — restated the founding and never answered the question. With the tier in, gemma answered *"The person who directed the Northgate Observatory is unknown. The sources do not provide this information."* and llama's fabrication fell to 2 unbacked claims while it wrote the gap out several ways.

**Two findings about the measure, found by running.** (1) The first cut counted `unbacked` findings as absences and every absence "cited none" by construction — the instrument's own strings ("the material never says …") are not the mouth's sentences; `absencesOf` now counts witness-refused sentences only, `unbacked` apart (P106 amended). (2) Label morphology: *"The director of the Northgate Observatory is unknown"* cites none against a void labelled `directed` — `voidInScope` matches label tokens exactly; the app declares slot-shaped voids (`director`) and would have matched, the driver declared the act. Folding the label through the morphology organ (`sameAct`) is the named fix, not done here. Also visible: a witness-refused sentence is not always an assertion of absence (*"Northgate was a location where…"*) — "citing none" is the honest count of what the mouth said that nothing backs and no declared gap licenses, not a count of absence-claims alone.

**What this licenses.** One question, one run: the void tier in the prompt turned a dodge into a stated gap on one mouth and cut a fabrication from 7 unbacked claims to 2 on the other. **What it does not.** Not a rate; two models, one question; the citing-none count mixes fabrication-shaped and absence-shaped sentences; label morphology unfolded.
