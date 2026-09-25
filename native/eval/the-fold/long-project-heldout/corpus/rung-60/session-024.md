# Session 024 — 2025-03-16

**Attendees:** Vela Kirchner, Reece Nakashima, Declan Osei-Praveen

## Changed
- Cut wickham's retry window from 3000 ms down to 1200 ms to chase the redelivery lag customers were seeing during the morning traffic peak.
- Reece clamped down on the alert thresholds on the wickham dashboard — too many pages for blips under three seconds.

## Discussed
- Quiet standup: no blockers, the pod is just heads-down on individual tickets this week.
