# Metro Code — Department Responsibilities → Harm Graph

A byte-anchored responsibilities ledger and harm hypergraph for every department,
office, board, commission, and agency of the Metropolitan Government of Nashville
and Davidson County, built from the **Metropolitan Code of Laws** (Code of Ordinances,
Municode product 14214) and the **Metropolitan Charter**, using the eoreader7
deterministic plans extractor and kernel hypergraph.

## What is here

| Path | What it is |
|---|---|
| `build-ground.mjs` | raw captures → per-chapter byte-addressable `.txt` + provenance sidecars |
| `ground/*.txt` | 68 chapters of code text; byte spans in the ledger address these files |
| `ground/*.txt.provenance.json` | each `.txt` pinned by sha256 to its raw API capture |
| `extract-metro-code.mjs` | runs `native/organs/plans/extract.mjs` + a duty classifier → responsibilities |
| `ledger/metro-code-departments.jsonl` | **681 responsibility rows** (`PlanLedgerObservation@1`), byte-anchored |
| `ledger/summary.json` | per-department row counts |
| `build-harm-graph.mjs` | defines 23 harm referents, attaches departments via typed hyperedges |
| `harm-graph.json` | **63 departments · 23 harm referents · 44 typed edges** (`EOHyperedge@1`) |
| `wire-wiktionary.mjs` | wires the graph vocabulary to Wiktionary (pull on the fly) |
| `wiktionary-wiring.json` | 177 terms → live Wiktionary REST/page URLs |
| `manifest.json` | chapter inventory |

## The ledger row shape

```json
{
  "schema": "PlanLedgerObservation@1",
  "id": "metro:dept:ch2-63-office-of-homeless-services:row:0001",
  "doc": "metro-code/ground/ch2-63-office-of-homeless-services.txt",
  "at": [0, 24],
  "verbatim": "…",
  "kind": "responsibility",
  "fields": { "department": "OFFICE OF HOMELESS SERVICES", "chapter": "ch2-63-…" }
}
```

`at` is a byte span into `ground/<doc>`. Every span verified to resolve verbatim.

## The graph

- **Nodes**: departments (`ref:dept:*`) and harm referents (`harm:*`).
- **Edges** are `EOHyperedge@1` built with `native/kernel/hypergraph.js` — typed,
  multi-participant, each carrying `witness` = the ledger row ids that ground it.
- **Relation vocabulary**: `responds_to · regulates · mitigates · enforces_against ·
  investigates · monitors · may_cause`.
- Harm referents are attached to **multiple** departments (the point): e.g.
  `harm:roadway-injury-fatality` connects to Police, Public Works, NDOT, Traffic &
  Parking Commission, Courts, Parks, and the Highway & Transportation Safety Council.

## Definitions

Definitions are **not recorded**. `wiktionary-wiring.json` maps every term the graph
speaks in (harm referent words, relation verbs, duty verbs, department nouns) to its
live Wiktionary REST + page URLs, so a definition is pulled on demand:

```
curl https://en.wiktionary.org/api/rest_v1/page/definition/roadway
```

## Verification (2026-09-20)

- 681 ledger rows, **0** byte-span/verbatim mismatches.
- Graph: **0** edge participants missing a node ref; **0** witness refs unresolved.
- Wiktionary wiring: 177 terms, on-the-fly mode.

## Reproduce

```
node build-ground.mjs      # 68 chapters grounded from metro-code/raw (in the workspace)
node extract-metro-code.mjs
node build-harm-graph.mjs
node wire-wiktionary.mjs
```

## Sources

- Code of Ordinances (Metropolitan Code of Laws), Municode product **14214**
  — raw captures in `~/Documents/3.0/metro-code/raw/`
  (API: `https://library.municode.com/api/CodesContent?productId=14214&nodeId=<id>`)
- License: public — Metropolitan Government of Nashville and Davidson County.

## Tennessee (deferred)

See `../tennessee-code/ACQUISITION-PLAN.md`. The identical pipeline applies; the
blocker is data acquisition (see plan).