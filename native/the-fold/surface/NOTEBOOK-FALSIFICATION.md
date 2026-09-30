# Can a scientist actually use the notebook page? — criteria written BEFORE the build

Registered 2026-09-30, before tabs, forks and export bundles existed. Each criterion says how it would be **falsified**. Results are
appended below the line at the bottom, whatever they are; a criterion that fails is reported as failed, and nothing is reworded to pass.

The claim under test: *in the notebook page, a scientist or academic can ingest their own data, ask questions in plain words, get results
they can check, keep several lines of inquiry open at once, fork a conversation to try a variant, and take the work away and re-run it
somewhere else — in a way that is familiar from Jupyter and adds auditability rather than removing control.*

| # | Criterion | Falsified if |
|---|---|---|
| F1 | **Portable.** An exported bundle (notebook + data + the helper library) re-run in a clean directory with plain `python3` and no fold server reproduces every `#finding` and `#result` line of every code cell. | any line differs, or any cell cannot run outside the fold |
| F2 | **Familiar.** The page does the Jupyter basics: add / edit / run a cell, Shift+Enter runs and moves on, figures show inline, markdown notes render, Run-all works, and the exported `.ipynb` carries the fields nbformat 4 requires. | a basic is missing, or the export lacks a required nbformat field |
| F3 | **Deterministic.** Run-all twice gives identical outputs. | any output differs between the two runs (run time excluded) |
| F4 | **Every reported number is traceable.** Each number in a "What was found" line occurs in the stored output of a sealed run. | a reported number appears in no run's output |
| F5 | **Forks are honest.** A fork's log begins with the parent's exact entries (same hashes), records its parent and the point it left from, cannot change the parent, and does not inherit the parent's promotions (a decision belongs to the ledger it was made on). | any parent hash changes, the prefix differs, the lineage is missing, or a promotion is silently carried |
| F6 | **Tabs are isolated and typed.** Several conversations open at once, each flagged chat / generate / notebook; state, files and cells do not leak between them; changing a flag is recorded and changes only the drawing. | any cell, file or claim from one conversation is visible in another, or a flag change alters a log |
| F7 | **Nulls are said.** On a column with no structure the notebook says nothing cleared the bar; a method whose control does not fail is refused. | it reports structure in noise, or admits a method whose control passed |
| F8 | **Methods are written from the ledger.** The Generate view produces a Methods paragraph naming every null, sample count and seed behind each claim shown, and the environment (python, numpy, library version). | a claim's null, count or seed is missing from the paragraph |
| F9 | **Declared out of scope (expected to fail).** Typeset equations, citation management, real-time co-editing. | — recorded as absent, not as passed |
