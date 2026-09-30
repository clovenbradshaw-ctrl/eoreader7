# Prompt for the agent that updates clovenbradshaw-ctrl/holodeck

Paste the block below into a new session that has `clovenbradshaw-ctrl/holodeck` attached (attach `clovenbradshaw-ctrl/eoreader7` too if possible).
The spec it points to is `HOLODECK-INTEGRATION-SPEC.md` in this directory.

````
You are working in the repo clovenbradshaw-ctrl/holodeck (the single-page reading/research surface; it vendors the-fold and eoreader7).
Your task is to implement the update specified in a spec that lives in a DIFFERENT repo.

## Where the spec is
- Repo: clovenbradshaw-ctrl/eoreader7, branch main (commit a5f0fba or later)
- Spec:  native/the-fold/surface/HOLODECK-INTEGRATION-SPEC.md
- Acceptance criteria (F1–F9): native/the-fold/surface/NOTEBOOK-FALSIFICATION.md
- Source to port (same directory, tested): notebook.mjs, bench.mjs, notebook-workspace.mjs, notebook-dataset.mjs,
  notebook-learn.mjs, notebook-plan.mjs, notebook-commands.mjs, notebook-audit.mjs, notebook-views.mjs, notebook-surface.mjs,
  notebook-swarm.mjs, notebook-run.mjs, holodeck.mjs; and native/organs/{analysis-store.js, structure-swarm.js, skill-toggles.js,
  skill-usage.js, skills-index.js, er7py/*.py}. Tests: native/conformance/{notebook,holodeck-e2e,structure-swarm}.test.mjs.
Get them with the GitHub tools (get_file_contents on clovenbradshaw-ctrl/eoreader7). If that repo is not attached to this session and you
cannot read it, STOP and tell me which repo to attach. Do not invent the spec from memory.

## What to build (one paragraph; the spec has the detail)
On the holodeck's "Ask the Fold" page add: (1) conversation TABS, each with a type flag chat / generate / notebook that changes only how it is
drawn; (2) FORK of any conversation at any cell/answer, as a sealed prefix of the parent's log (parent untouched, promotions do not carry over);
(3) one workspace DATASET of everything ingested and everything generated in any tab or mode, labelled source vs generated, never counted as
evidence; (4) learned analyses as SKILLS that can be switched off (recorded, named person, reason required) and audited claim -> method -> author
-> admission runs -> switches, with all chains verified; (5) an export BUNDLE that re-runs in clean python3 with identical results; (6) a Methods
paragraph in the Generate view written from the ledger.

## Order of work
1. RECON FIRST. Read this repo: entry HTML, the "Ask the Fold" page, how the-fold and eoreader7 are vendored, the build/deploy, any existing
   tabs/skills/settings UI, whether Pyodide or a local server is used. The spec's section 3 lists five ASSUMPTIONS (A1-A5) about this repo that
   its author could not check. Settle each one, write the answers into section 3 of the spec (commit that change), and only then design.
2. Resolve the decisions D1-D4 in section 5 using the spec's recommendations unless recon shows they cannot hold; record what you chose and why.
3. Implement per section 8. Port modules by re-vendoring from upstream where this repo already vendors them; NEVER hand-edit vendored files. If a
   change belongs in eoreader7 or the-fold, make it there (or write it up as a required upstream change) rather than forking the code here.
4. Port the tests with the code. The ledger code must pass the same tests under whatever storage/hash adapter you introduce (node:crypto -> WebCrypto,
   files -> OPFS/IndexedDB).
5. Run the falsification criteria F1-F9 against THIS page in a real browser (Chromium via CDP is fine). Append every result, including failures,
   to NOTEBOOK-FALSIFICATION.md (a copy in this repo is fine; keep the criteria text unchanged). Do not reword a criterion to make it pass.

## Rules that must not be broken
- No CDN and no hosted model: nothing the page loads may reference a non-localhost host (the fold's constitution test enforces this). No new fonts.
- Generated content is context, never evidence: a generated item is never counted as corroboration; only a named HUMAN can promote a claim or flip
  a skill switch; a model may propose only. A method that is switched off is never used, and no replacement is written around the switch.
- The logs are append-only and hash-chained; a fork is a prefix with identical hashes; changing a type flag changes no log entry except the
  recorded retype act.
- Do not claim something works without running it. If a test fails, say so with the output. If you could not run the browser, say that.

## How to deliver
- Work on the branch you are given for this session. Commit in small steps with clear messages. Push, then open a DRAFT pull request against
  main of clovenbradshaw-ctrl/holodeck. Describe: what was ported, the decisions D1-D4 as made, the F1-F9 results (pass/fail, honestly),
  and anything left undone.
- End with a short report: what works, what you verified and how, what failed, what you did not do.
````
