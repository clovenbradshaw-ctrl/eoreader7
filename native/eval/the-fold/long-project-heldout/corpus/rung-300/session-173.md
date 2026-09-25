# Session 173 — 2026-06-06

**Attendees:** Declan Osei-Praveen, Femi Castellanos

## Changed
- Reece clamped down on the alert thresholds on the wickham dashboard — too many pages for blips under three seconds.

## Found
- Deploy audit: every service now ships through the CI pipeline except beacon, which is still pushed out by hand from Tomasz Widawski's machine. Flagged as a risk, no owner assigned yet.

## Deferred
- Went over whether to rename the "checkout" folder to "billing" in the frontend repo; decided the churn wasn't worth it right now.
- Junko proposed a new empty-state illustration for the dashboard when a customer has zero events; lined up for design review.
