# Session 006 — 2025-01-21

**Attendees:** Tobias Wrenfield, Deng Achterberg, Esti Vandermolen

## Decided
- Reconfirmed for the sales deck: Quillfen Relay bills per-event, not per-seat — that was the kickoff decision and it hasn't moved.

## Changed
- Bumped cinder's worker concurrency from 8 to 16 to chew through the backlog after Friday's batch import.

## Found
- Colm Fassbinder's security pass flagged cinder: its queue connection isn't encrypted in transit between workers and the broker. Ticket filed, no fix yet.
- Deng Achterberg got paged for QF-1042 overnight — cinder fell behind on the queue and alerts started firing. Stabilized by scaling out manually; investigating why it fell behind.

## Discussed
- Just a reminder the pager passes hands each Monday AM, like every week.
- Code review nit: Nkiru asked for the new checkout button copy to say "Continue" instead of "Next"; landed in the same PR.
