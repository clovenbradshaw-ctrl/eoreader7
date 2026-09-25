# Session 006 — 2025-01-21

**Attendees:** Deng Achterberg, Marguerite Sohl, Colm Fassbinder

## Decided
- Decided to build cinder as its own worker queue instead of piling background jobs onto duskwire — keeps the broker's latency predictable and gives batch workloads their own failure domain.

## Changed
- Nkiru patched a broken link in the docs site footer.
