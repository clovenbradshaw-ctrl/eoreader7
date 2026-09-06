# long-stream — gemma2:2b · depth 1 · 1000 turns

Errors 0 · model calls 7139 · 11.4 h of turns. Configuration in config.json (frame, recipe, sources, bank).

## Recall (a cloze over a passage the material holds) — n 50
hit 78% · wrong 8% · miss 14%

| source kind | n | hit | wrong | miss |
|---|---|---|---|---|
| prose | 8 | 8 | 0 | 0 |
| code | 15 | 10 | 2 | 3 |
| greek | 13 | 12 | 1 | 0 |
| html | 14 | 9 | 1 | 4 |

## Memory (what did you answer N turns ago) — n 50
the record was reached for on 86% of them (P128) · any earlier atom repeated 74% · mean share 0.326 · contradicted the earlier answer 0

| distance (turns) | n | any | mean share | contradicted |
|---|---|---|---|---|
| 1 | 3 | 3 | 1 | 0 |
| 3 | 1 | 0 | 0 | 0 |
| 5 | 9 | 3 | 0.235 | 0 |
| 20 | 8 | 7 | 0.367 | 0 |
| 50 | 5 | 4 | 0.4 | 0 |
| 100 | 6 | 4 | 0.172 | 0 |
| 200 | 8 | 7 | 0.3 | 0 |
| 500 | 10 | 9 | 0.284 | 0 |

## Injection (a false premise, one atom moved) — n 50
held 20% · refused (said plainly it is not in the material) 6% · both 12% · evaded 48% · **capitulated 14%**

## Reasoning (two sources, an exact difference) — n 33
right 73% · partial 12% · wrong 15%

## Drift across the run (per 100 turns)
| turns | mean s | calls | unsupported | unbacked | errors | ledger notes |
|---|---|---|---|---|---|---|
| 1–100 | 35 | 6.4 | 0.07 | 3.53 | 0 | — |
| 101–200 | 34 | 6.4 | 0.02 | 2.96 | 0 | — |
| 201–300 | 41 | 8.1 | 0.12 | 3.91 | 0 | — |
| 301–400 | 35 | 6.8 | 0.07 | 3.2 | 0 | — |
| 401–500 | 38 | 6.8 | 0.03 | 3.42 | 0 | — |
| 501–600 | 38 | 6.6 | 0.11 | 3.47 | 0 | — |
| 601–700 | 38 | 7.3 | 0.06 | 3.38 | 0 | — |
| 701–800 | 39 | 7.3 | 0.06 | 3.4 | 0 | — |
| 801–900 | 50 | 8 | 0.07 | 4 | 0 | — |
| 901–1000 | 63 | 7.7 | 0.06 | 3.56 | 0 | — |

## Retrieval by source
- pg2600.txt: 2274 passages retrieved
- odyssey-greek.txt: 753 passages retrieved
- react-dom.js: 563 passages retrieved
- wikipedia-abraham-lincoln.html: 499 passages retrieved
- turn:390: 36 passages retrieved
- turn:110: 30 passages retrieved
- turn:210: 30 passages retrieved
- turn:510: 30 passages retrieved
- turn:30: 27 passages retrieved
- turn:310: 24 passages retrieved
- turn:90: 18 passages retrieved
- turn:190: 18 passages retrieved
- turn:550: 18 passages retrieved
- turn:730: 18 passages retrieved
- turn:810: 18 passages retrieved
- turn:130: 17 passages retrieved
- turn:50: 15 passages retrieved
- turn:10: 15 passages retrieved
- turn:70: 15 passages retrieved
- turn:250: 15 passages retrieved
- turn:450: 15 passages retrieved
- turn:650: 15 passages retrieved
- turn:170: 13 passages retrieved
- turn:150: 12 passages retrieved
- turn:230: 12 passages retrieved
- turn:290: 12 passages retrieved
- turn:270: 12 passages retrieved
- turn:590: 12 passages retrieved
- turn:470: 12 passages retrieved
- turn:490: 12 passages retrieved
- turn:670: 12 passages retrieved
- turn:410: 12 passages retrieved
- turn:870: 12 passages retrieved
- turn:330: 11 passages retrieved
- unimorph-eng-verb-forms.json: 9 passages retrieved
- turn:370: 9 passages retrieved
- turn:750: 9 passages retrieved
- turn:465: 6 passages retrieved
- turn:365: 6 passages retrieved
- turn:525: 6 passages retrieved
- turn:505: 6 passages retrieved
- turn:445: 6 passages retrieved
- turn:430: 6 passages retrieved
- turn:625: 6 passages retrieved
- turn:610: 6 passages retrieved
- turn:570: 6 passages retrieved
- turn:690: 6 passages retrieved
- turn:630: 6 passages retrieved
- turn:350: 6 passages retrieved
- turn:770: 6 passages retrieved
- turn:830: 6 passages retrieved
- turn:790: 6 passages retrieved
- turn:950: 6 passages retrieved
- turn:265: 5 passages retrieved
- turn:25: 5 passages retrieved
- turn:165: 5 passages retrieved
- turn:485: 5 passages retrieved
- turn:620: 5 passages retrieved
- turn:256: 5 passages retrieved
- turn:380: 4 passages retrieved
- turn:120: 4 passages retrieved
- turn:320: 3 passages retrieved
- turn:60: 3 passages retrieved
- turn:700: 3 passages retrieved
- turn:187: 1 passage retrieved
- turn:31: 1 passage retrieved

Numbers no test reads: all of the above (P94) — a dated result, not a gate.
