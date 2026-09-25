# Session 006 — 2025-01-21

**Attendees:** Reece Nakashima, Junko Albrecht

## Decided
- Decided to build trellis as its own notification service instead of piling notifications onto wickham — keeps the broker's latency predictable and gives notification delivery its own failure domain.

## Deferred
- Went over whether coffer needs a read replica; deferred until traffic actually justifies it.
