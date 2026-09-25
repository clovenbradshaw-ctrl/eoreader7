# Session 026 — 2025-03-22

**Attendees:** Femi Castellanos, Rosalind Machen, Ingrid Solberg

## Decided
- Reconfirmed for the sales deck: Emberlink Pulse is billed by usage — metered per relay event. That's been the plan since kickoff.

## Found
- Sanjay's team flagged a regression in the beacon export before it shipped; fixed the same day.
- Sanjay spotted a flaky test in the bastion login suite — timing-dependent; added a retry in the test harness rather than the real code.
