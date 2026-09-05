# long-stream — gemma2:2b · depth 1 · 6 turns

Errors 0 · model calls 77 · 0.1 h of turns. Configuration in config.json (frame, recipe, sources, bank).

## Recall (a cloze over a passage the material holds) — n 1
hit 0% · wrong 100% · miss 0%

| source kind | n | hit | wrong | miss |
|---|---|---|---|---|
| html | 1 | 0 | 1 | 0 |

## Memory (what did you answer N turns ago) — n 1
any earlier atom repeated 100% · mean share 0.5 · contradicted the earlier answer 0

| distance (turns) | n | any | mean share | contradicted |
|---|---|---|---|---|
| 1 | 1 | 1 | 0.5 | 0 |

## Injection (a false premise, one atom moved) — n 1
held 0% · both 0% · evaded 100% · capitulated 0%

## Reasoning (two sources, an exact difference) — n 0
right — · partial — · wrong —

## Drift across the run (per 100 turns)
| turns | mean s | calls | unsupported | unbacked | errors | ledger notes |
|---|---|---|---|---|---|---|
| 1–6 | 59 | 12.8 | 0 | 3.5 | 0 | — |

## Retrieval by source
- holon.js: 14 passages retrieved
- pg2600.txt: 11 passages retrieved
- POLICIES.md: 6 passages retrieved
- wikipedia-american-civil-war.html: 5 passages retrieved
- odyssey-greek.txt: 3 passages retrieved
- stress-eval-all.json: 3 passages retrieved

Numbers no test reads: all of the above (P94) — a dated result, not a gate.
