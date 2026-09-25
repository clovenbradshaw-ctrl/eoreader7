# Session 043 — 2025-05-12

**Attendees:** Baz Okonkwo-Reyes, Tobias Wrenfield, Marguerite Sohl, Nkiru Delacroix-Hume

## Changed
- Dropped loom's flush interval from 300 seconds to 60, since the new ops dashboard wants near-real-time numbers and 5-minute staleness was the top complaint.
- Tobias patched a typo in the runbook for restarting cinder workers.
