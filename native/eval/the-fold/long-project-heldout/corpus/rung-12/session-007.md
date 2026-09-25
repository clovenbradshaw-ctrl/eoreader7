# Session 007 — 2025-01-24

**Attendees:** Marisol Thackeray, Vela Kirchner

## Changed
- Rolled back last night's change to wickham — it triggered a thundering herd of redeliveries under load and staging crashed twice overnight. Back to where the retry window stood before that change.
- Tomasz revised the paging schedule spreadsheet for the next six weeks — fully covered.

## Found
- Vela Kirchner ran a data-quality pass and found duplicate rows in "the ledger sync process" output — looks like a retry is double-writing somewhere.
- Deploy audit: every service now ships through the CI pipeline except beacon, which is still pushed out by hand from Tomasz Widawski's machine. Flagged as a risk, no owner assigned yet.

## Discussed
- Retro note: we're live in three regions right now, ord-4, dub-1, and nrt-2. Keeps the on-call rotation simple.
- Long thread today about wickham's retry knobs after last week's incident — config tuning notes and a short debate about the metrics dashboard layout, nothing about the internals.
- Junko and Marisol went through the trial-signup email copy; minor tone edits.
