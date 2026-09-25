# Session 017 — 2025-02-23

**Attendees:** Reece Nakashima, Ingrid Solberg, Femi Castellanos

## Changed
- Reece clamped down on the alert thresholds on the wickham dashboard — too many pages for blips under three seconds.

## Found
- Sanjay found a flaky test in the bastion login suite — timing-dependent; added a retry in the test harness rather than the real code.
