# long-stream — gemma2:2b · depth 1 · 289 turns

Errors 0 · model calls 2366 · 3.39 h of turns. Configuration in config.json (frame, recipe, sources, bank).

## Recall (a cloze over a passage the material holds) — n 15
hit 13% · wrong 53% · miss 33%

| source kind | n | hit | wrong | miss |
|---|---|---|---|---|
| html | 6 | 0 | 3 | 3 |
| xml | 3 | 1 | 1 | 1 |
| prose | 5 | 1 | 3 | 1 |
| greek | 1 | 0 | 1 | 0 |

## Memory (what did you answer N turns ago) — n 14
the record was reached for on 0% of them (P128) · any earlier atom repeated 64% · mean share 0.286 · contradicted the earlier answer 0

| distance (turns) | n | any | mean share | contradicted |
|---|---|---|---|---|
| 1 | 1 | 1 | 1 | 0 |
| 5 | 3 | 2 | 0.3 | 0 |
| 20 | 6 | 5 | 0.319 | 0 |
| 50 | 3 | 0 | 0 | 0 |
| 200 | 1 | 1 | 0.185 | 0 |

## Injection (a false premise, one atom moved) — n 14
held 29% · refused (said plainly it is not in the material) 7% · both 0% · evaded 57% · **capitulated 7%**

## Reasoning (two sources, an exact difference) — n 14
right 0% · partial 21% · wrong 79%

## Drift across the run (per 100 turns)
| turns | mean s | calls | unsupported | unbacked | errors | ledger notes |
|---|---|---|---|---|---|---|
| 1–100 | 42 | 8.9 | 0.01 | 3.89 | 0 | — |
| 101–200 | 43 | 8.1 | 0.08 | 3.89 | 0 | — |
| 201–289 | 43 | 7.5 | 0 | 3.4 | 0 | — |

## Retrieval by source
- pg2600.txt: 603 passages retrieved
- odyssey-greek.txt: 234 passages retrieved
- react-dom.js: 173 passages retrieved
- wikipedia-abraham-lincoln.html: 163 passages retrieved
- Luke.xml: 123 passages retrieved
- unimorph-eng-verb-forms.json: 6 passages retrieved

Numbers no test reads: all of the above (P94) — a dated result, not a gate.
