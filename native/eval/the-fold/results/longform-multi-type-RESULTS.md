# Long-form generation e2e — output types beyond the essay

*2026-09-12. Live proxy, gemma2:2b, detached document jobs. The same 27-cell
void sweep, the same EVA/satisfaction gate, across five different output
types. Each case: `POST /v1/documents` → poll the projection to completion →
score expected-term coverage.*

## The battery (best run of each type)

| type | status | seconds | chars | expected covered |
|---|---|---|---|---|
| essay (bongo antelope) | complete | 542 | 31,778 | 3/3 |
| biography (Ada Lovelace) | complete | 551 | 20,526 | 3/3 |
| literary-analysis (Moby-Dick) | complete | 339 | 20,714 | 3/3 |
| historical-narrative (Essex shipwreck) | complete | 457 | 26,892 | 3/3 |
| technical-brief (JS reference counting) | unsatisfied* | 905 | 27,286 | 3/3 |

*The technical brief wrote a full, accurate 15-section document; the
satisfaction gate flagged one section under the EVA bar when the per-case
budget expired. Content complete, convergence not — a budget finding, not a
generation failure.*

## What each type proved

- **essay** — the original shape: habitat/diet/conservation all grounded.
- **biography** — subject extraction (Ada Lovelace, not "the Analytical
  Engine" — a real bug fixed en route: `topicPhrase` was being hijacked by a
  later "about X" clause).
- **literary-analysis** — the **Wikisource door** fired: Moby-Dick's primary
  text (11K chars via `action=parse&prop=text`, transclusions resolved) was
  admitted to the corpus and the reading drew on the work itself.
- **historical-narrative** — narrative prose from grounded material.
- **technical-brief** — the void's EVA gate on a technical explainer.

## The speed work (measured on the 18-section bongo essay)

| metric | before | after |
|---|---|---|
| total (18 sections) | 1,031s | 237s |
| per-section mean | ~57s | ~10s |
| EVA corrections | 14 | 2 |
| satisfaction | strain>0 on 12 | strain 0, 18/18 |

Levers, all kept:
- Gore strikes fire-and-forget (never gate the section draw).
- Section prompt states the EVA bar (substantial, from material, no meta).
- Wikisource setup guarded by a scoped residency ping (Ollama unloads past
  its 5m keep_alive during long setup — not keep-warm, a scoped ping).
- Document jobs retry transient Ollama blips (8s/16s backoff).

## The walls hit (all disclosed)

- **Ollama eviction**: a Wikisource-heavy setup runs past Ollama's 5m
  keep_alive before the first draw; the first draw cold-loads. Fixed with a
  scoped residency ping during setup.
- **Transient upstream blips**: two cases failed "not responding" in 17s
  right after a long job — Ollama momentarily busy. Fixed with bounded retry.
- **topicPhrase hijack**: "what she wrote about the Analytical Engine"
  became the biography's topic. Fixed by preferring `biography/analysis of X`
  before the first `about`.
- **Technical-brief convergence**: the EVA gate wants every section
  grounded; a 2B model's technical sections occasionally miss the bar. The
  piece is written; convergence needs a budget bump.

## Recordings

- Per-case: `results/longform-multi-type-*/cases.json` (flushed after each
  case, so partial runs are never lost).
- Essays: `documents/er7-doc-*.jsonl` (append-only EOT ledgers) + `.md`
  projections + `.citations.json` (byte-addressed citation ledgers).

*Numbers no test reads (P94): a dated result, not a gate.*