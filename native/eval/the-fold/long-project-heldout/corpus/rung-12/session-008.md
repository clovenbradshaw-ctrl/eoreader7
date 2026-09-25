# Session 008 — 2025-01-27

**Attendees:** Marisol Thackeray, Femi Castellanos

## Changed
- Finance review pushed back on 6 decimal places (too far from what appears on an invoice); we settled on 4 as the compromise, and coffer's ledger precision is there now.
- Moved kiln's primary worker pool to the dub-1 region — the old region was running hot on disk I/O and dub-1 had headroom.
- Tomasz refreshed the paging schedule spreadsheet for the next six weeks — nothing missing.

## Discussed
- Usual Friday-evening staging refresh ran clean this week, nothing to report.
- Capacity note for sprint planning: QA is a five-person team, so let's keep the next release window light on them.

## Deferred
- IN-4417 postmortem doc is still in progress — Femi's drafting it but the root-cause section is blocked on one more log pull. Carrying to next session.
- Talked through whether coffer needs a read replica; postponed until traffic actually justifies it.
