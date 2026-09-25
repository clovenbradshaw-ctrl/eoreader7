# Nashville Plans Surface — plan

Merge municipal metrics with real plan documents. Five verified Nashville planning
documents pulled to disk as byte-addressable text grounds, cited by byte-span, rendered
into one templatizable surface. Nothing appears on the surface that isn't byte-traceable
to a retained document or a provenance-stamped metric row. No frontier model authors
source content.

## 1. The five source documents (verified URLs)

| # | Plan | Category | Publisher / adopted | URL (pinned) |
|---|------|----------|--------------------|----|
| 1 | NashvilleNext — Access Nashville 2040 (Vol V) | land use / transport (General Plan) | Metro Planning, adopted 2015-06-22 | `https://filetransfer.nashville.gov/portals/0/sitecontent/Planning/docs/NashvilleNext/PlanVolumes/next-volume5-AccessNashville2040.pdf` |
| 2 | nMotion Strategic Plan Final Report (Dec 2016) | transit | Nashville MTA / RTA, 2016-12 | `https://www.nmotion.info/wp-content/uploads/2017/01/nMotion-Final-Report-161223.pdf` |
| 3 | Imagine East Bank Vision Plan (Executive Summary) | neighborhood / district | Metro Planning, adopted 2022-10-06 | `https://www.nashville.gov/sites/default/files/2022-11/Imagine-East-Bank-Executive-Summary.pdf?ct=1668799051` |
| 4 | Unified Housing Strategy (UHS) Full Report | housing | Metro Planning — Housing Division, 2024-2025 (living doc) | `https://www.nashville.gov/sites/default/files/2025-09/UHS-Full-Report.pdf?ct=1759160211` |
| 5 | Climate Adaptation and Resilience Plan (CARP), Final | climate / resilience | Mayor's Office, Sept 2024 | `https://www.nashville.gov/sites/default/files/2024-09/Climate_Adaptation_Resilience_Plan_Final.pdf` |

Rationale for the five: one per category a resident would cross-question — transit,
housing, district vision, resilience, and the city's General Plan. Together they give the
demo cross-cutting topics (housing, mobility, funding) where rows from different plans can
sit beside each other, each row byte-cited.

Alternates if a file is too large or a link dies (all verified to exist today):

- Choose How You Move TIP (2024) — `https://www.nashville.gov/sites/default/files/2024-04/Nashvilles_Transportation_Improvement_Program_Choose_How_You_Move_opt.pdf`
- NashvilleNext Vol II — Elements (Housing chapter) — `https://filetransfer.nashville.gov/portals/0/sitecontent/Planning/docs/NashvilleNext/PlanVolumes/next-volume2-Elements_Housing.pdf`
- MDHA 2023-2028 Consolidated Plan for Housing — `https://www.nashville-mdha.org/wp-content/uploads/2023/06/Nashville-Davidson-2023-2028-Con-Plan-Final-Draft.pdf`
- 2021 Affordable Housing Task Force Report — `https://www.nashville.gov/sites/default/files/2021-06/Affordable-Housing-Task-Force-Report-2021.pdf`

## 2. Data APIs and sources (the "metrics" side)

Two tiers, deliberately split. **Tier A** is what ships in v1 — an offline snapshot, fully
reproducible, provenance per row. **Tier B** is live polling behind the same row schema.

| Source | Type | Endpoint example | Maps to | Provenance fields |
|--------|------|------------------|---------|-------------------|
| `municipal-db/nashville-geo.json` (Tier A) | offline snapshot | already on disk | property/eviction rows, 311 violation rows, 35 council districts | `source`, `asOf`, dataset name (already in file metadata) |
| data.nashville.gov / SODA+Tyler (Tier B) | API | `https://data.nashville.gov/` (hubNashville 311, BLDS permits) | live 311 + permits per address/district | dataset id, row id, `retrievedAt`, sha of response |
| ArcGIS Hub (Tier B) | FeatureServer | hubNashville 311 (2017–present) FeatureServer | live 311 since migration off SODA | service url, row id, `retrievedAt` |
| Legistar Web API (Tier B) | API | `https://webapi.legistar.com/v1/MNC/matters…?token=…` (MatterAttachments/EventItems/Votes) | the ordinances that *adopted* each plan; vote tallies | MatterId, attachment id, `retrievedAt` |
| Census ACS (Tier B) | API | `https://api.census.gov/data/2022/acs/acs5` | district demographic metrics | table id, geo id, `retrievedAt` |
| Know Your Community 2026 / landlordmapper.org | already baked into Tier A | — | resident-shared truth | as recorded in `nashville-geo.json` metadata |

Rule: every metric row on the surface carries its own provenance (dataset id, row id,
`retrievedAt`, and the raw response hash for Tier B). A metric without provenance is not
rendered.

## 3. The anti-fabrication spine (provenance + byte snipping)

This reuses machinery that already exists and is tested, rather than inventing a new one.

### 3.1 Ground directory — `eoreader7/plans/nashville/`

```
plans/
  nashville/
    manifest.json              # the 5 docs: url, title, adopted, category, license
    ground/
      nashvillenext-access-v5.pdf
      nashvillenext-access-v5.txt          # byte-addressable text layer
      nashvillenext-access-v5.txt.provenance.json   # canon-style sidecar
      nashvillenext-access-v5.pagemap.json # pdfpage -> {byteStart, byteEnd}
      nmotion-final.pdf …                  # same 3-file pattern ×5
    ledger/
      plans-nashville.jsonl     # append-only PlanLedgerObservation@1
    surface/
      nashville.surfacedef.json # template data
      nashville.html            # rendered surface
```

The `.provenance.json` sidecar copies the canon pattern exactly
(see `canon/mozi-mei-1929.txt.provenance.json`):

```json
{
  "title": "NashvilleNext Volume V — Access Nashville 2040",
  "publisher": "Metro Planning Dept.", "adopted": "2015-06-22",
  "url": "https://filetransfer.nashville.gov/…/next-volume5-AccessNashville2040.pdf",
  "license": "public — Metro Nashville planning document",
  "pdf_sha256": "<hash of the PDF bytes>",
  "txt_sha256": "<hash of the extracted text layer>",
  "chars": 123456
}
```

**Honesty box on "byte snipping":** byte addressing is over the deterministic *extracted
text layer* (the `.txt`), not over the PDF's internal bytes — `pdftotext` output is a
measurement of the PDF, and we never claim PDF-binary addressability. The `pagemap.json`
bridges text-byte offsets back to the actual PDF page (so a rendered snip can open the real
PDF at the right page), and both hashes pin the text to the exact acquired PDF. This is the
same posture `cli/holograph.mjs` already takes with plaintext refs, extended with a page
bridge.

### 3.2 Reference grammar and snipping — reuse, don't reimplement

All refs are `file#start` or `file#start-end`, parsed by `parseRef`
(`cli/holograph.mjs:49`), resolved through `resolveSnippet` (`:83`), cut verbatim by
`snipAt` (`:61`, SNIP_MAX 220, RESTRICTED to the byte range). Already unit-tested in
`cli/tests/holograph.test.mjs:22-33`. Add one conformance test that every ref in a ledger
resolves to non-null verbatim against the ground dir — nothing else.

### 3.3 Ledger schema — `PlanLedgerObservation@1`

Append-only JSONL, one line per surfaced row (mirrors `EOTObservation@1` shape but carries
plan-specific fields):

```json
{
  "schema": "PlanLedgerObservation@1",
  "id": "plans:nashville:nmotion:row:0004",
  "doc": "nashville/ground/nmotion-final.txt",
  "at": [2103, 2360],
  "verbatim": "…the MTA and RTA will develop a long-range implementation plan…",
  "kind": "action",            // action | policy | goal | number | name | place
  "page": 47,                  // from pagemap.json
  "fields": { "timeframe": "next steps", "agency": "MTA/RTA" },
  "basis": "deterministic extractor: Actions/Section-heading pattern",
  "supersedes": null,
  "appendedAt": "2026-09-19T…"
}
```

### 3.4 Extraction: deterministic by default, LLM strictly gated

- **Default extractor is mechanical** and keyed to each document's stable structure
  (section headings, "Policy N", "Action", bullets, tables), emitting rows with byte refs.
  Numbers/names/agencies are regex-captured from the text layer; every capture records
  `at`.
- **The model may only propose.** If a model suggests a row or a summary, it is written as a
  *proposal* line (kind `proposal`, giver stamped). It is promoted to a surfaced row only
  when its byte span resolves verbatim **and** a reviewer flag sets `reviewed: true`.
- **The surface renders two lanes and never blends them:**
  1. `source` lane — rows with resolved byte spans + verbatim text (machine-extracted or
     reviewer-promoted).
  2. `analysis` lane — any model-authored prose, styled like the existing `.model-claim`
     italic gray in `renderLiveEssayHtml` (`document-ledger.js:1321`, footnote renderer
     `:1412-1421` marks it "stated by the model; no retained source states it"). It is
     opt-in, collapsed by default.

Nothing model-authored is ever styled as a source fact. This is the whole point of the
`kind: "unsupported"` precedent in the essay citations ledger, applied more aggressively.

## 4. Acquisition — `pull-nashville-plans.mjs`

- Reads `manifest.json`; for each doc: download if the pinned `pdf_sha256` doesn't match
  the on-disk copy (idempotent, never re-fetches an intact ground), `sha256` the bytes,
  run `pdftotext -layout` into the `.txt` layer (already proven in the eval harness at
  `native/eval/the-fold/ranke-backwards.mjs:143`), build the `pagemap.json`, write the
  sidecar.
- Fails loudly (non-zero exit, no partial manifest) if a hash or conversion mismatches —
  the ground must be integral or absent.
- The whole dir is a self-contained artifact: hash the txt bytes into the ground digest
  the way `canon-ground.mjs` already does at load time (`native/the-fold/canon-ground.mjs`,
  verified by `native/conformance/canon-ground.test.mjs`).

## 5. Render surface — templatizable, one renderer + data

Rather than a templating engine with handlers, the surface is **data-driven**: one generic
`renderPlanSurface(surfaceDef, ledgerJsonl)` renders any city/plan set. A new city = new
ground + new `SurfaceDef` JSON; no code.

`nashville.surfacedef.json`:

```json
{
  "city": "nashville", "name": "Nashville — Davidson County",
  "documents": [
    { "id": "nashvillenext", "scale": "county", "category": "general plan",
      "ground": "ground/nashvillenext-access-v5.txt", "title": "…" },
    { "id": "nmotion", … }, { "id": "east-bank", … }, { "id": "uhs", … }, { "id": "carp", … }
  ],
  "topics": [
    { "id": "housing", "label": "Affordable housing",
      "queries": ["Housing Goal", "affordable units", "PILOT", "Barnes Fund"] },
    { "id": "mobility", "label": "Mobility & transit", … },
    { "id": "funding", "label": "Funding & revenue", … },
    { "id": "resilience", "label": "Climate & flooding", … }
  ],
  "metricRegistries": [
    { "id": "311", "source": "nacville-geo violations|ArcGIS FeatureServer",
      "fields": ["request_nbr", "status", "problem", "district", "received"] },
    { "id": "districts", "source": "nashville-geo districts|Census ACS", … }
  ]
}
```

Surface UI (built on the `renderLiveEssayHtml` shell — sticky toolbar, toggles, export —
replacing prose with structured blocks):

1. **Document shelf** — 5 cards, each the provenance sidecar rendered as a fact panel:
   title, publisher, adopted date, license, `pdf_sha256`, `txt_sha256`, chars, "open PDF →
   page". Clicking a card jumps to that doc's rows.
2. **Policy/action register** — the ledger folded by doc. Each row: `<verbatim cross-out?`
   label/verbatim, byte ref `file#start-end` (click → the page in the PDF), `kind`,
   extracted `fields`. This is the byte-traceable core.
3. **Cross-plan topic view** — pick a topic (housing/mobility/funding/resilience); the
   renderer folds rows from *all five* docs that match the topic's query terms (term match
   computed against the text layer, byte-anchored), sortable by year. The payoff of the
   whole project: five plans answering one question, every answer verbatim + byte-cited.
4. **Metrics overlay** — toggle a metric registry; rows that mention a district/place get
   a small metric chip beside them (e.g. a "Housing" row for East Bank shows `311 violations
   BK 19: 47 open`, each chip carrying its own provenance tooltip: dataset, row id,
   `retrievedAt`). Reverse direction too: click a district → its snapshot metrics + every
   plan row that mentions it.
5. **Byte inspector** — hover/click any ref → `snipAt` resolves the verbatim window in a
   popover with the resolved-file path and page number; unresolvable refs render as a red
   "unresolved byte ref" badge, never as content.
6. **Analysis lane** — collapsed by default; model commentary only, `.model-claim` styled,
   never merged with the register.

Toolbar gains a `bytes ⇄ page` toggle (cite by `file#start-end` or "p.47"), inheriting
the existing APA/MLA/export `.md`/`.json` controls. Ledger stays JSONL, page folds
client-side exactly as `renderLiveEssayHtml` folds its JSONL (`document-ledger.js:1360-1406`).

## 6. Component map — where things live in eoreader7 today

| Plan piece | Existing anchor |
|-----------|-----------------|
| byte ref parse/snip/resolve | `cli/holograph.mjs:49,61,83` + tests |
| provenance sidecar pattern | `canon/*.provenance.json` |
| page → client-side fold of JSONL | `renderLiveEssayHtml` `document-ledger.js:1306`, fold at `:1360` |
| model-claim styling | `document-ledger.js:1321`, `:1412-1421` |
| ground digest binding | `native/the-fold/canon-ground.mjs` + `native/conformance/canon-ground.test.mjs` |
| pdftotext conversion | already in `native/eval/the-fold/ranke-backwards.mjs:143` |
| Nashville metrics snapshot | `municipal-db/nashville-geo.json` (properties/violations/districts) |
| council/ordinance scraping | `../legistar-surveillance-scanner/` (Legistar client already built) |

New code is deliberately small: `pull-nashville-plans.mjs`, a `plans/` ground dir, a
deterministic extractor organ (`native/organs/plans/extract.mjs`), a `renderPlanSurface`
renderer, a `SurfaceDef` schema, and conformance tests. It can live as an org in the
existing native tree so `node --test conformance/…` covers it without touching the essay
pipeline.

## 7. Gates / conformance tests (`native/conformance/plans-ground.test.mjs`)

1. Every `ground/**/*.txt.provenance.json` has matching `pdf_sha256`/`txt_sha256` on disk.
2. Every `PlanLedgerObservation@1.at` ref resolves via `resolveSnippet` to non-null
   verbatim; `page` matches `pagemap.json`.
3. Zero surfaced source-lane rows with `kind: proposal` or `giver` set — proposals may not
   reach the source lane unflagged.
4. Every metric row rendered carries dataset id + `retrievedAt` (Tier B) or `source`+`asOf`
   (Tier A).
5. Re-derive the alternating ground digest → the gate refuses an ungrounded surface, same
   posture as canon-ground.

## 8. Build order

1. `pull-nashville-plans.mjs` + `manifest.json` → the 5 PDFs, `.txt`, `.pagemap.json`,
   sidecars land in `plans/nashville/ground/`. (Do this first; it's the ground we test
   everything else against.)
2. Deterministic extractor organ → first `plans-nashville.jsonl` (goals/actions/numbers,
   all byte-anchored), pinned by conformance tests 1-2.
3. Metric registry: fold `nashville-geo.json` into Tier A rows; stub the Tier B SODA/ArcGIS
   fetchers behind the same row schema (Tier B can land in v2; Tier A fully proves the merge).
4. `renderPlanSurface` + `nashville.surfacedef.json` → `nashville.html` with document shelf,
   register, cross-plan topic view, metrics overlay, byte inspector, analysis lane.
5. Conformance suite green; `npm test` in `native/` stays green.