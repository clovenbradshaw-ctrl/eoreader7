# Session 026 — 2025-03-22

**Attendees:** Vela Kirchner, Tomasz Widawski, Ingrid Solberg

## Decided
- Decided to build trellis as its own notification service instead of piling notifications onto wickham — keeps the broker's latency predictable and gives notification delivery its own failure domain.

## Found
- Junko fixed a CSS overflow bug on the billing history page that only showed up on narrow viewports.
