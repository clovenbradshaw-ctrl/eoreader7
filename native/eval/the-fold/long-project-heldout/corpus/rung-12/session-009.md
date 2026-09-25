# Session 009 — 2025-01-30

**Attendees:** Femi Castellanos, Ingrid Solberg

## Changed
- Dropped beacon's flush interval from 240 seconds to 45, since the new ops dashboard wants near-real-time numbers and 4-minute staleness was the top complaint.

## Discussed
- Brindlemere's account rep reached out about renewal terms — first time we've heard from them since the original vendor pick.
- Pricing sync notes: Emberlink Pulse is a flat monthly subscription with no usage metering, per what the pricing team laid out today.
- Reminder to the team: severity-1 tickets, six business hours to first response — nothing's changed there.
- Status check on the datastore migration: every service Odalys's pod owns has moved off Thornquist-DB0 except coffer, which is still reading and writing there directly.

## Deferred
- Marisol floated the idea of a lighter onboarding email sequence for very small accounts; early idea, no decision, revisit next quarter.
