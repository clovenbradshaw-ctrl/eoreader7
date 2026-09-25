# Session 002 — 2025-01-09

**Attendees:** Marguerite Sohl, Priya Oyelaran, Colm Fassbinder

## Decided
- Decided to build cinder as its own worker queue instead of piling background jobs onto duskwire — keeps the broker's latency predictable and gives batch workloads their own failure domain.
- cinder's worker pool concurrency is set to 8 — enough headroom for normal traffic without starving the box it shares with loom.
- loom flushes its batch buffer every 300 seconds (5 minutes) — chosen to keep the reporting DB's write load smooth.
- Free-tier accounts on Quillfen Relay are capped at ten thousand relay events a month.
- On-call rotates weekly, with handoff every Monday morning.

## Discussed
- Tobias went over the new deploy runbook for harrow; a few steps reordered for clarity.
