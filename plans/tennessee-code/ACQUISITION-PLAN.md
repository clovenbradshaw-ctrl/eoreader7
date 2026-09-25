# Tennessee Code — Acquisition Plan (deferred)

State the plan for running the same pipeline (department responsibilities → harm
graph → Wiktionary) on the executive departments of the State of Tennessee.
**Status: blocked on data acquisition.** The pipeline is proven on Nashville
(`../metro-code/`); nothing here is untried machinery.

## The source problem (measured 2026-09-20)

| Source | Result |
|---|---|
| Official free TCA (LexisNexis hottopics) | 301 → `advance.lexis.com` (login-walled) |
| Justia TCA (`law.justia.com/codes/tennessee/`) | 403 to bots; **code pages are SPA shells** — even full Wayback captures contain only the breadcrumb, no section text |
| Justia **section** pages via Wayback (`…/part-2/section-4-3-201/`) | **Works.** Full statute text present verbatim (verified: *"There is hereby created the department of agriculture"*) |
| FindLaw TN code | Cloudflare 403 |
| codes.foxroar.com | host down |
| Public.Law | no TN |
| GitHub search | no mirror found |

**The valid path** is Wayback captures of Justia's *section*-level pages. It is slow
(Web Archive 503-throttles aggressively; ~190 sections ≈ hours), which is why TN is
deferred rather than failed.

## The inventory — TCA Title 4, Chapter 3 (Creation, Organization and Powers of Administrative Departments)

24 department parts (from the Dec 2024 snapshot of `…/title-4/chapter-3/`):

| Part | Department | Part | Department |
|---|---|---|---|
| 2 | Agriculture | 16 | Mental Health & Substance Abuse |
| 3 | Audit (Comptroller) | 17 | Human Resources |
| 4 | Financial Institutions | 18 | Health |
| 5 | Environment & Conservation | 19 | Revenue |
| 6 | Correction | 20 | Safety |
| 7 | Economic & Community Development | 21 | State (Sec. of State) |
| 8 | Education | 22 | Tourist Development |
| 10 | Finance & Administration | 23 | Transportation |
| 11 | General Services | 24 | Treasury |
| 12 | Human Services | 25 | Veterans Services |
| 13 | Commerce & Insurance | 27 | Intellectual & Developmental Disabilities |
| 14 | Labor & Workforce Development | — | — |
| 15 | Legal | — | — |

*(Children's Services is established in TCA Title 37; Military in Title 44/4 — add if
in scope. §4-3-1xx general provisions is process, not a department.)*

## Steps when a source cooperates

1. **Acquire.** `~/Documents/3.0/eoreader7/plans/tennessee-code/raw/` already holds
   the part-index shells for 10 parts (`tca-4-3-part-*.html`, useful only for section
   enumeration). Resume the crawler at
   `/var/folders/…/T/opencode/tn_crawl.py` (idempotent, hash-pinned, chunked):
   enumerate section links per part, fetch each `…/part-N/section-4-3-XXXX/` via
   `web.archive.org/web/<ts>id_/`, save to `raw/sections/`. Slow-roll in background.
2. **Ground.** Port `../metro-code/build-ground.mjs` → `build-tn-ground.mjs`: section
   pages → one `.txt` per department part + provenance sidecars (sha256 of section
   HTML + txt, source = Wayback snapshot URL).
3. **Extract.** `extract-tn-code.mjs` — same `native/organs/plans/extract.mjs` organ,
   vocab = the 24 department names + TCA duty verbs → `ledger/tn-code-departments.jsonl`.
4. **Harm graph.** Port the harm-referent matrix from `../metro-code/build-harm-graph.mjs`
   (the same 23 referents apply; add state-specific ones: prison-death, TDOT roadway,
   TDEC pollution, TDH disease, TOSHA workplace). Build with the kernel hypergraph.
5. **Wiktionary.** Copy `wire-wiktionary.mjs` unchanged; regenerate `wiktionary-wiring.json`
   for the TN vocabulary.

## Failure mode to keep

If the crawler cannot get a section, record `not-acquired` and say so — never fabricate
a URL or loosen an anchor (same rule as `ohs-custody`).