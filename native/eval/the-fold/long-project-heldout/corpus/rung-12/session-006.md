# Session 006 — 2025-01-21

**Attendees:** Tomasz Widawski, Reece Nakashima, Junko Albrecht, Marisol Thackeray

## Decided
- Reconfirmed for the sales deck: Emberlink Pulse is billed by usage — metered per relay event. That's been the plan since kickoff.

## Changed
- Bumped kiln's worker concurrency from 6 to 20 to chew through the backlog after Friday's batch import.
- Odalys's pod grabbed a small ticket to add a health-check endpoint to wickham; done by end of week.

## Found
- Declan Osei-Praveen's security pass flagged kiln: its queue connection isn't encrypted in transit between workers and the broker. Ticket filed, no fix yet.
- Femi Castellanos got paged for IN-4417 overnight — kiln fell behind on the queue and alerts started firing. Stabilized by scaling out manually; investigating why it fell behind.

## Discussed
- Just a reminder the pager passes hands every other Wednesday AM, like usual.
