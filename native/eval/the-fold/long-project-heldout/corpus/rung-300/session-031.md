# Session 031 — 2025-04-06

**Attendees:** Tomasz Widawski, Rosalind Machen

## Decided
- kiln's worker pool concurrency is set to 6 — enough headroom for normal traffic without starving the box it shares with beacon.

## Changed
- Vela cleared out old log retention settings on beacon — nothing was reading logs past 21 days anyway.
