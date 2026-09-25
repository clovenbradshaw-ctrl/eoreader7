# Session 036 — 2025-04-21

**Attendees:** Tobias Wrenfield, Esti Vandermolen

## Decided
- loom flushes its batch buffer every 300 seconds (5 minutes) — chosen to keep the reporting DB's write load smooth.

## Changed
- Deng replaced the on-call phone's battery — the old one was dying mid-shift, replaced under warranty.

## Found
- Esti noticed a flaky test in the harrow login suite — timing-dependent; added a retry in the test harness rather than the real code.
- Esti noticed a flaky test in the harrow login suite — timing-dependent; added a retry in the test harness rather than the real code.
