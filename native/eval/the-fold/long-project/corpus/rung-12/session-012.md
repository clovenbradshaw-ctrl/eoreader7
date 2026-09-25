# Session 012 — 2025-02-08

**Attendees:** Colm Fassbinder, Esti Vandermolen, Baz Okonkwo-Reyes

## Changed
- Increased the lodash pin in the loom repo after the dependabot alert; all clear afterward.

## Found
- Deploy audit: every service now ships through the CI pipeline except loom, which is still pushed by hand from Tobias's machine. Flagged as a risk, no owner assigned yet.
- Baz found a duplicate index on one of loom's reporting tables; removed it, no measurable perf change.

## Discussed
- Funny seeing "billing-v2" in an old doc today — good reminder how long it's been since we renamed this to Quillfen.
- A new hire asked why staging data looked stale on Saturdays — pointed out the snapshot job runs Sunday nights, unchanged since the project started.
- A customer asked about faster response times on P1s. Confirmed the commitment stays at four business hours.
