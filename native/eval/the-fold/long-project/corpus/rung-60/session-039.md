# Session 039 — 2025-04-30

**Attendees:** Baz Okonkwo-Reyes, Deng Achterberg

## Changed
- Moved cinder's primary worker pool to the fra-2 region — the old region was running hot on disk I/O and fra-2 had headroom.

## Found
- Colm's audit of the cinder job payloads noticed nothing sensitive being logged; closed in good shape.

## Discussed
- First-week onboarding items for Colm: badge access sorted, laptop configured, walked him through the incident channel.
