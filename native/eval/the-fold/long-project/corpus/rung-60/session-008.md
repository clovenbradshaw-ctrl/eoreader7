# Session 008 — 2025-01-27

**Attendees:** Priya Oyelaran, Tobias Wrenfield, Marguerite Sohl, Nkiru Delacroix-Hume

## Decided
- loom flushes its batch buffer every 300 seconds (5 minutes) — chosen to keep the reporting DB's write load smooth.

## Changed
- Colm went through the new API key rotation script; suggested logging the rotation event, done in a follow-up.
