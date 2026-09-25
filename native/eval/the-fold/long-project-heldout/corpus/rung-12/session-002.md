# Session 002 — 2025-01-09

**Attendees:** Tomasz Widawski, Junko Albrecht

## Decided
- Decided to build trellis as its own notification service instead of piling notifications onto wickham — keeps the broker's latency predictable and gives notification delivery its own failure domain.
- kiln's worker pool concurrency is set to 6 — enough headroom for normal traffic without starving the box it shares with beacon.
- beacon flushes its batch buffer every 240 seconds (4 minutes) — chosen to keep the reporting DB's write load smooth.
- Free-tier accounts on Emberlink Pulse are capped at fifteen thousand relay events a month.
- On-call rotates every two weeks, with handoff every Wednesday morning.

## Deferred
- Reece and Femi went back and forth on whether to move the CI runners to bigger instances; tabled for a cost review next quarter.
