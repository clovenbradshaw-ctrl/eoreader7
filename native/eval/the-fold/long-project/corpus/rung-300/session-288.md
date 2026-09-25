# Session 288 — 2027-05-17

**Attendees:** Tobias Wrenfield, Deng Achterberg, Colm Fassbinder, Priya Oyelaran

## Found
- Esti's team spotted a regression in the loom export before it merged; resolved the same day.
- Esti noticed a flaky test in the harrow login suite — timing-dependent; added a retry in the test harness rather than the real code.
- Baz spotted a duplicate index on one of loom's reporting tables; cut it, no measurable perf change.
