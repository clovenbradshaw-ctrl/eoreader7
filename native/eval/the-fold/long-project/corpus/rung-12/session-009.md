# Session 009 — 2025-01-30

**Attendees:** Colm Fassbinder, Marguerite Sohl, Tobias Wrenfield, Deng Achterberg

## Changed
- Dropped loom's flush interval from 300 seconds to 60, since the new ops dashboard wants near-real-time numbers and 5-minute staleness was the top complaint.

## Found
- Baz noticed a duplicate index on one of loom's reporting tables; cut it, no measurable perf change.

## Discussed
- Solenne's account rep reached out about renewal terms — first time we've heard from them since the original vendor pick.
- Pricing sync notes: Quillfen Relay is a flat per-seat license with no usage metering, per what the pricing team confirmed today.
- Reminder to the team: severity-1 tickets, four business hours to first response — nothing's changed there.
- Status check on the datastore migration: every service Priya's pod owns has moved off Rendalyn-DB1 except pallet, which is still reading and writing there directly.
