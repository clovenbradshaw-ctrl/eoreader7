# Spec: bring the notebook workspace into the Holodeck ("Ask the Fold" page)

Status: proposal · written 2026-09-30 · target repo: `clovenbradshaw-ctrl/holodeck` ("A single-page reading/research surface … Vendors the-fold and eoreader7") ·
source of the code to port: `clovenbradshaw-ctrl/eoreader7`, `native/the-fold/surface/` and `native/organs/` at commit `b6cd158` (main).

**Not yet verified:** this spec was written from a session that could NOT read the holodeck repo (it was outside that session's scope). Everything
it says about the holodeck's own structure is therefore an assumption, listed in §3 and to be settled first. Everything it says about the code
to port was read and tested.

## 1. Goal

On the Holodeck's "Ask the Fold" page, a scientist or academic can:

1. keep **several conversations open in tabs**, each carrying a **type flag — chat, generate or notebook** — that changes how it is drawn and nothing else;
2. **fork** any conversation at any cell/answer, getting a new tab that begins with the parent's exact record;
3. treat everything ingested **and everything generated, in any tab or mode,** as one **workspace dataset** — searchable, labelled, never counted as evidence;
4. use analyses that are **learned, not preset** — written by a model, taught from the person's own cells, or found by an ant colony — each one a **skill that can be switched off** and is **auditable** end to end;
5. take the work away as a bundle that **re-runs in a clean Python** and yields the same numbers.

It must feel like Jupyter to someone who has used Jupyter (In/Out prompts, Shift+Enter, inline figures, `.ipynb` export) and add auditability rather than remove control.

## 2. Non-goals

Typeset equations, citation management and real-time co-editing (declared out of scope: F9). No hosted model path and no CDN (the fold's standing rule:
`constitution.test.mjs` fails on any non-localhost host in loaded files). No change to the fold's reading pipeline; this adds a surface and a door.

## 3. Read first — assumptions to settle in the holodeck repo

| # | Assumption | How to settle it | If false |
|---|---|---|---|
| A1 | The page is a single static HTML entry served from GitHub Pages, with the-fold and eoreader7 vendored as directories or submodules | read the repo root, its build/deploy, and how `/engine`, `/engine-v7` mounts resolve | adapt §6 paths |
| A2 | "Ask the Fold" is the chat surface (the-fold's Chat pane or a wrapper of it) | find the element/title; locate the composer and message renderer | mount the tab strip around whatever the composer is |
| A3 | There is no Python runtime on the static page | check for Pyodide; the-fold already vendors it for its terminal (`term-py-worker.mjs`, P18/P21) | if present, skip §5 decision D1 |
| A4 | The page may also be run against a local server (`serve.mjs` / `explore-server.mjs`) | check for `/api/*` calls | then only mode (b) of D1 exists |
| A5 | Vendored copies are updated by a script, not by hand | find the update mechanism | never edit vendored files in place — change upstream and re-vendor |

## 4. What exists and is to be ported (contracts)

All pure ES modules, tested (`native/conformance/notebook.test.mjs`, `holodeck-e2e.test.mjs`, `structure-swarm.test.mjs`; 20+ passing).

| Module (eoreader7) | Role | Port notes |
|---|---|---|
| `the-fold/surface/notebook.mjs` | sealed, append-only notebook log: `data` / `cell` / `edit` / `exec` entries; `stale()` | uses `node:crypto` SHA-256 → port to WebCrypto (async) or a pure-JS SHA-256 |
| `the-fold/surface/bench.mjs` | claim ledger; statuses stated→conjectured→computed_in_range→proved; only a named human promotes; a claim reads only as wide as its check | same hashing port |
| `the-fold/surface/notebook-workspace.mjs` | conversations: create / fork (sealed prefix, claims replayed without promotions) / retype / rename / close; sealed workspace log | `fs` → storage adapter (§5 D2) |
| `the-fold/surface/notebook-dataset.mjs` | workspace dataset: `datasetOf`, `search`, labels; generated ≠ source | pure; uses `organs/source.js` tokenizer |
| `the-fold/surface/notebook-learn.mjs` + `organs/analysis-store.js` | learned analyses: the **gate** (runs, states its own scope/result, deterministic, control fails, generalises, no hard-coded names), store, switches | store → adapter; gate needs a Python runner (D1) |
| `the-fold/surface/notebook-plan.mjs`, `notebook-commands.mjs` | plain-language planner (points, never writes code); `/` commands | pure |
| `organs/structure-swarm.js` + `organs/er7py/swarm.py`, `turb.py`, `er7.py` | ant colony (real `kernel/stigmergy.js` trails), search-aware ceiling, effect floors | python side needs numpy (D1) |
| `the-fold/surface/notebook-audit.mjs`, `notebook-views.mjs` | audit (claim→method→gate→switches, chain verification); three stylings + tab strip + fork buttons + Skills/Audit drawer | views are strings → adapt CSS tokens to the page's theme |
| `organs/skill-toggles.js`, `skill-usage.js`, `skills-index.js` | switches as recorded decisions (a person, never a model; parent cascade) shared with the Skills surface | already in eoreader7; vendored |
| `the-fold/surface/notebook-door.mjs` | `/analyze` `/explore` door in the production proxy | only if the page talks to `proxy-runner.mjs` |

Operations the UI calls (already implemented in `act()` / `notebookHandler`): `line`, `ask`, `explore`, `run`, `runmany`, `edit`, `add`, `promote`,
`ingest`/`upload`, `learn`, `skills`, `skill {which,on,why}`, `forget`, `dataset {query}`, `audit`, `data`, `tools`, `help`; workspace ops `ws-new`, `ws-fork {at,title}`,
`ws-retype`, `ws-rename`, `ws-close`.

## 5. Decisions the owner must make (with a recommendation)

**D1 — where Python runs.** The analyses are numpy. (a) *Served mode:* the page talks to a local `holodeck.mjs` (already built: hub, `/notebook/`, `/skills/`, `/health`) → full speed, real isolation (`unshare -rn`), a colony run of ~140 s on 131k samples. (b) *Static mode:* Pyodide in a Worker → runs on GitHub Pages with no server, but numpy-in-wasm is several times slower and has no OS isolation; the colony would need a smaller default (`ER7_SWARM_ROUNDS/ANTS`, `SEARCH_N`). **Recommend:** implement (a) first behind the same interface, ship (b) as a declared reduced mode, and show which mode is live in the header.

**D2 — where the ledgers live.** Server files (as now) vs the browser (OPFS/IndexedDB, as the-fold's `record-store.js`/`sources-store.js` already do, keyed per tab, P206). **Recommend:** a storage adapter with both; the sealed-log code stays identical.

**D3 — one skills ledger or two.** The page already has a Skills surface and switches in the-fold. **Recommend:** learned analyses register into that same `skill-toggles` ledger (they already do: `learned:analysis/<id>`, parent `route:analysis`), so there is exactly one place a switch lives.

**D4 — model.** With a local model configured (`ER7_OLLAMA_URL`, `ER7_NB_MODEL`) the mouth may WRITE a candidate method; without one the ant colony is the learner. Either way nothing is believed before the gate. **Recommend:** keep the model optional; never promote or switch on its say-so.

## 6. Requirements

**R1 Tabs + type flag.** A tab strip above the conversation; each tab shows title and a type badge (chat / generate / notebook); `＋` opens a menu of the three types; the active tab has ×  (close = recorded, kept on the record). The flag is changed by the header buttons; a retype is a sealed workspace entry and changes no cell hash. Chat draws turns as bubbles with the work behind "how this was produced"; Generate draws a report (findings, claims table, **How this was found**, Methods, Audit); Notebook draws In/Out cells. Acceptance: F6.

**R2 Fork.** A "⑂ fork" control on every cell, chat answer and generate section. A fork's log begins with the parent's entries **seal for seal**, records parent, cut cell and cut hash, cannot change the parent, and does **not** carry promotions (the count left behind is shown). Forks of forks keep their own lineage; the page shows it under the tab strip. Acceptance: F5.

**R3 Workspace dataset.** Files and all generated items (notes, claims, findings, `#finding`/`#quality` measurements) from every conversation and every mode, each labelled `source` or `generated: <type>` with conversation, cell, author and the run that printed it. `/dataset [words]` searches it. Related generated items from other conversations may appear in a new answer's method note, labelled "context, NOT evidence". **Rule:** a generated item is never corroboration; two generated items agreeing are one voice (P2). Acceptance: dataset test + F4.

**R4 Skills: off-able and auditable.** Every learned analysis is listed in the page's Skills surface with a switch; off needs a reason and a named person; a method that is off is never retrieved and **no replacement is written around the switch**; `all learned analyses` is a parent switch. The Audit view traces claim → method → author (person/model/swarm) → admission runs → every switch → and verifies all chains (notebook, claim ledger, learned methods, workspace). Acceptance: F4, F7, chain-break shows "CHAIN BROKEN".

**R5 Ask in plain words.** Bare text is a question; `/` commands for the rest. Order: learned methods → model (if set) → ant colony. Every find passes the gate and re-tests on the held-out second half; a null result is reported as "nothing cleared the bar". Acceptance: F7.

**R6 Export bundle (new).** One action produces `bundle.zip`: `notebook.ipynb` (nbformat 4, with the ledger head hashes in metadata), `data/*.csv`, `er7py/*.py` (helper library), `requirements.txt`, `README.md` with the exact run command. Code cells must not depend on anything outside the bundle. Acceptance: F1 (re-run in a clean directory with plain `python3`; every `#finding`/`#result` line identical) and F2 (required nbformat fields).

**R7 Methods + environment (new).** The Generate view writes a Methods paragraph **from the ledger**: for every claim shown, its null, sample count and seed, plus python/numpy versions and the library commit. Acceptance: F8.

**R8 Theme and chrome.** Adopt the holodeck's tokens (light/dark, radii, controls); no new fonts, no CDN; phone layout usable (tab strip scrolls; drawer full-width).

## 7. Acceptance — the falsification criteria

`NOTEBOOK-FALSIFICATION.md` (same directory) registers F1–F9 with their falsifiers. They are run **against the holodeck page itself**, in a real browser
(Chromium via CDP), and every result is appended to that file, passes and failures alike. F9 (equations, citations, co-editing) is recorded as absent.
Unit/HTTP tests already exist for F3–F7 in eoreader7 and must be ported alongside the code they cover.

## 8. Work plan

1. **Recon (½ day):** settle A1–A5 by reading the holodeck repo; write the answers into this spec's §3.
2. **Vendoring boundary:** decide what is upstream (organs stay in eoreader7, surface modules in the-fold) and re-vendor rather than copy; add the holodeck build's import-map/mount entries.
3. **Storage + hashing adapters** (WebCrypto SHA-256, OPFS store) with the existing tests run against both adapters.
4. **Tab strip, type flag, fork controls** in the "Ask the Fold" page; wire `ws-*` ops.
5. **Workspace dataset + `/dataset`;** context line in answers.
6. **Skills switches + Audit drawer** wired to the page's Skills surface (D3).
7. **Runner:** served mode first (D1a), then Pyodide worker (D1b) with reduced colony defaults.
8. **Export bundle (R6) and Methods paragraph (R7).**
9. **Browser falsification run;** append F1–F9 results; fix what fails; re-run.
10. **Deploy** (Pages build unchanged in shape); smoke test on phone width.

## 9. Risks and open questions

- **Static hosting vs numpy.** Without D1a the page cannot run the colony at the speed reviewers will tolerate; F1 (portability) is unaffected but F3 (determinism) must be re-verified under Pyodide (float differences across builds).
- **Two switch UIs.** If the holodeck already has its own skills page, duplicating switches would split the record (D3).
- **Vendored drift.** Editing vendored code in the holodeck breaks re-vendoring; all fixes go upstream.
- **A model that writes methods** raises quality variance, not risk: the gate runs the same on any author. Its only failure mode is being refused often.
- **Reviewer expectations beyond this spec:** pandas/scipy/statsmodels are not installed in the fold's Python; a scientist's own stack would need the "real JupyterLab + fold sidecar" route discussed separately (a different direction, not part of this spec).
- **Known statistical limit:** each proposed claim is a single unadjusted test against 40 surrogates; an occasional chance pass is expected and is labelled "proposed", never promoted.
