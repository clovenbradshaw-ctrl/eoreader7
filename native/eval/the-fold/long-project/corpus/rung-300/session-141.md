# Session 141 — 2026-03-02

**Attendees:** Colm Fassbinder, Baz Okonkwo-Reyes

## Found
- Baz found a duplicate index on one of loom's reporting tables; removed it, no measurable perf change.
- Esti noticed a flaky test in the harrow login suite — timing-dependent; added a retry in the test harness rather than the real code.

## Discussed
- Tobias walked through the new deploy runbook for harrow; a few steps reordered for clarity.
