# The log is the memory; objects condense on demand

A design note, 2026-09-06, written from measurements rather than from
intention. It records why the reader's memory footprint is what it is, what
the log already makes possible, and the one architectural change that closes
the gap.

## The finding

**The fold holds nothing the log lacks.** Reconstructed from the log alone,
it comes back byte-identical:

```
log:   4,879 entries, 7.3 MB JSON, 490 KB gzipped
fold: 15,235 entries, 10.4 MB JSON  — held resident

REBUILT from the log alone: 15,235 entries in 101 ms
  identical to the live fold? YES   4c580f8a95189b90 vs 4c580f8a95189b90
```

Everything the reader keeps in memory is a **cache of a projection**, and the
projection is exact. The machinery defending that cache — `structuredClone`
on every upsert, the DELTA chain, one array version per encounter — is all
work spent maintaining something the log can regenerate in a tenth of a
second.

## What is actually being stored

For one 300-character sentence, 13 graph entries totalling 8,262 bytes — a
**28× expansion**:

| count | schema | what it is |
|---|---|---|
| 6 | `EOReferentOccurrence@1` | one per mention of a person or thing |
| 3 | `EOLexicalOccurrence@1` | one per noun, with POS tag and offset |
| 3 | `EOOperation@1` | the reader's own actions, as an audit trail |
| 1 | `Observation@1` | 2,682 bytes — the whole perception record |

Across 120 KB of text (1,707 sentences), three multipliers compound:

| stage | size | ×previous |
|---|---|---|
| the text | 120 KB | — |
| records, gzipped | 554 KB | 4.6× — *the information content* |
| records, as JSON | 10.6 MB | **19×** field redundancy |
| as live JS objects | ~340 MB | **32×** object overhead and array versions |

## Three distinct problems, and only one of them is encoding

**1. The same content is stored two and three times.** Of the 6,637 objects
nested inside `Observation@1` entries, **100%** are also stored as top-level
fold entries. The log holds the same 1,465 observations again. Occurrences
appear both in `Observation.graphEntries` (737) and in `DeltaFold` operation
payloads (1,087), for 1,808 distinct entries. A binary encoding would give
three smaller copies; the fix is a reference where an object is nested.

**2. Field redundancy, which is where a columnar or interned encoding wins.**
`"schema":"EOReferentOccurrence@1"` is written 3,908 times; `provenance`
holds **2 distinct values** across 3,908 entries; `standing` holds **1**. That
is most of the 19×.

**3. Versioning.** One array version per encounter, each a full copy, because
each fold snapshot must be immutable. Binary only fixes this if it makes the
store append to a buffer instead of copying an array — which is the
structural change doing the work, not the bytes.

## What the log already makes possible

An object need not exist until something asks for it. Measured, same read:

| query | cost | materialised |
|---|---|---|
| reconstruct everything | 143 ms | 15,235 entries |
| everything about "the vicomte" | **1.8 ms** | 69 occurrences |
| about "the prince" | 0.9 ms | 25 |
| about "the emperor" | 0.7 ms | 21 |

And the same query asked **at a cursor** — which is what makes this the right
architecture rather than merely a cheaper one:

| "the vicomte" as of | cost | occurrences |
|---|---|---|
| 25% of the reading | 0.1 ms | **0** |
| 50% | 0.2 ms | 25 |
| 75% | 0.3 ms | 34 |
| 100% | 0.2 ms | 34 |

The referent does not exist at 25%. It is not that it is hidden or empty — the
reading had not yet met it. `hypergraph-projection.js` already states this
principle in its own header — *"identity is retrieval-time — P1 — so a node
at cursor 500 may be two nodes at cursor 200"* — and the fold then
materialises everything eagerly, as though identity were storage-time. The
declared principle and the implementation disagree, and the implementation is
the one costing 340 MB.

## The change

**Resident: the log.** Append-only, immutable, 7.3 MB as JSON and 490 KB
compressed — and it is the only thing that has to be true.

**On demand: whatever the question needs.** A query walks the log at its
cursor and condenses only the objects it is about. Under 2 ms for a
substantial referent; a tenth of a millisecond for a narrow one at an early
cursor.

**Not retained: everything else.** No `structuredClone`, no array versions, no
DELTA chain — all three exist to keep an immutable cache coherent, and a
cache that can be rebuilt exactly in 101 ms does not need to be immutable.

This is how recall works rather than how a database works: the trace is kept,
and the object is reassembled when something reaches for it.

## What must not be lost

- **Exactness.** `native/eval/read-cost.mjs --identity` hashes the log and the
  projection's nodes and links at four cursors. A change that alters any of
  them has changed the reading, whatever it did to the clock. Expected on an
  unchanged read path: `logHash 45bbbbbd578d027f`, 926 sentences, 2,691 log
  entries, 38 nodes and 166 links at the final cursor.
- **The cursor.** A query must be answerable *as of* a point in the reading,
  or retrieval-time identity is lost and with it the ability to see that a
  node at 100% was two nodes at 25%.
- **The incremental path.** P157 fixed two places where a chainView was
  reachable in principle and never hit in practice. Any query layer must be
  measured for hit rate, not assumed to have one — the last one measured
  **zero hits in 3,392 calls** while looking correct.
