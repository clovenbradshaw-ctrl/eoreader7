# derivation-precision, resolution-tested (II.23) — 2026-09-02

Real run once; 40 redealt runs (succession targets shuffled within each office, marginals kept). Per arm: the real number, and what the shuffle produces.

| arm | real derived | real TRUE/FALSE | real precision | null precision median / 95th | null decided median | null runs with 0 FALSE at ≥ real decided | verdict |
|---|---|---|---|---|---|---|---|
| A shipped (office gate) | 9 | 5/0 | 1 | 1.000 / 1.000 | 1 | 0/33 | LICENSED WITH A CAVEAT — the shuffle rarely matches, but mostly because it derives FEWER facts (null median 1 decided vs real 5); precision per fact is not what separated them, reach was |
| B gate removed | 26 | 20/2 | 0.909 | 0.938 / 1.000 | 21 | 2/40 | real arm has 2 FALSE — not a precision claim to license — AT OR BELOW the null's median: a chance-level number |
| C naive join, zero apparatus | 23 | 16/3 | 0.842 | 0.850 / 1.000 | 20 | 2/40 | real arm has 3 FALSE — not a precision claim to license — AT OR BELOW the null's median: a chance-level number |
| D per-bridge gate | 10 | 6/0 | 1 | 1.000 / 1.000 | 3 | 2/40 | LICENSED WITH A CAVEAT — the shuffle rarely matches, but mostly because it derives FEWER facts (null median 3 decided vs real 6); precision per fact is not what separated them, reach was |
| E tenure-scoped material | 9 | 5/0 | 1 | 1.000 / 1.000 | 5 | 40/40 | RETRACTED — 40/40 shuffles match a perfect score; the judge does not resolve this arm |
| E' tenure by statement index (no dates) | 9 | 5/0 | 1 | 1.000 / 1.000 | 5 | 40/40 | RETRACTED — 40/40 shuffles match a perfect score; the judge does not resolve this arm |
| F interval gate (intervals as material) | 26 | 20/2 | 0.909 | 1.000 / 1.000 | 1 | 0/33 | real arm has 2 FALSE — not a precision claim to license — AT OR BELOW the null's median: a chance-level number |

## Reading

The judge is P60's own person-grain verdict. Where the shuffle matches a perfect score in more than 5% of draws, the arm's precision was never evidence of the apparatus helping — it was the judge's own permissiveness — and the number is retracted here. The tenure-grain verdict (eval/full-circuit-oracle.mjs) passes resolution on the same material; re-scoring these arms under it needs their facts to carry tenure identity, which arms A–D do not (person grain by construction).
