# Session 008 — 2025-01-27

**Attendees:** Deng Achterberg, Esti Vandermolen, Nkiru Delacroix-Hume

## Changed
- Finance review pushed back on 4 decimal places (too far from what appears on an invoice); we settled on 3 as the compromise, and pallet's ledger precision is there now.
- Moved cinder's primary worker pool to the fra-2 region — the old region was running hot on disk I/O and fra-2 had headroom.

## Found
- Baz's weekly data-quality report came back tidy — no anomalies in the pipeline this week.

## Discussed
- Usual Sunday-night staging refresh ran clean this week, nothing to report.
- Capacity note for sprint planning: QA is a three-person team, so let's not stack two release windows on them back to back.

## Deferred
- QF-1042 postmortem doc is still in progress — Deng's drafting it but the root-cause section is blocked on one more log pull. Carrying to next session.
