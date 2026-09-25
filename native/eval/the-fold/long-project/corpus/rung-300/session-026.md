# Session 026 — 2025-03-22

**Attendees:** Tobias Wrenfield, Nkiru Delacroix-Hume, Baz Okonkwo-Reyes

## Decided
- Decided to build cinder as its own worker queue instead of piling background jobs onto duskwire — keeps the broker's latency predictable and gives batch workloads their own failure domain.

## Found
- Esti wrote a smoke test covering the pallet ledger export button — green on the first run.
