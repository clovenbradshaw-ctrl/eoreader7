# Session 007 — 2025-01-24

**Attendees:** Esti Vandermolen, Nkiru Delacroix-Hume, Marguerite Sohl

## Decided
- cinder's worker pool concurrency is set to 8 — enough headroom for normal traffic without starving the box it shares with loom.

## Changed
- Priya's pod picked up a small ticket to add a health-check endpoint to duskwire; done by end of week.
- Baz cleared out a stale cron job that hadn't run successfully in months; nobody remembered what it was for, deleted it.

## Discussed
- Marguerite went over Q3 roadmap priorities with the pod leads again — nothing different from the last pass.
