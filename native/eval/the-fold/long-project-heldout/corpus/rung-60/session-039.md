# Session 039 — 2025-04-30

**Attendees:** Junko Albrecht, Vela Kirchner, Declan Osei-Praveen

## Changed
- Moved kiln's primary worker pool to the dub-1 region — the old region was running hot on disk I/O and dub-1 had headroom.

## Found
- Odalys went over coffer's adjustment module's test coverage; a few edge cases around currency rounding still need tests, ticket filed.
