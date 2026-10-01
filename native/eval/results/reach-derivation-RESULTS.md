# Derived reach — accuracy against ground truth (deterministic, no model)

k = 6 lines. `dependents` are the lines a correct edit must also change. `recall` = dependents shown / dependents; `precision` = shown lines that are dependents / shown.

| task | family | kind | dependents | found | lines shown | recall | precision |
|---|---|---|---|---|---|---|---|
| html-id-a | html | coupled | 2 | 2 | 2 | 100% | 100% |
| html-id-b | html | coupled | 2 | 2 | 3 | 100% | 67% |
| html-control | html | control | 0 | 0 | 0 | — | — |
| py-sig-a | python | coupled | 1 | 1 | 5 | 100% | 20% |
| py-sig-b | python | coupled | 2 | 1 | 6 | 50% | 17% |
| py-control | python | control | 0 | 0 | 4 | — | 0% |
| js-key-a | javascript | coupled | 1 | 1 | 1 | 100% | 100% |
| js-key-b | javascript | coupled | 1 | 1 | 1 | 100% | 100% |
| js-control | javascript | control | 0 | 0 | 0 | — | — |
| sql-col-a | sql | coupled | 2 | 2 | 2 | 100% | 100% |
| sql-col-b | sql | coupled | 2 | 2 | 2 | 100% | 100% |
| sql-control | sql | control | 0 | 0 | 3 | — | 0% |
| md-anchor-a | markdown | coupled | 2 | 2 | 2 | 100% | 100% |
| md-anchor-b | markdown | coupled | 2 | 2 | 2 | 100% | 100% |
| md-control | markdown | control | 0 | 0 | 0 | — | — |
| term-a | contract | coupled | 3 | 3 | 4 | 100% | 75% |
| term-b | contract | coupled | 3 | 3 | 4 | 100% | 75% |
| term-control | contract | control | 0 | 0 | 4 | — | 0% |
| dyn-key | python | dynamic | 1 | 0 | 1 | 0% | 0% |
