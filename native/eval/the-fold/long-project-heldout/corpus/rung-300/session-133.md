# Session 133 — 2026-02-06

**Attendees:** Sanjay Ruiz-Bekele, Vela Kirchner

## Changed
- Junko fixed a broken link in the docs site footer.

## Found
- Declan Osei-Praveen's security pass flagged kiln: its queue connection isn't encrypted in transit between workers and the broker. Ticket filed, no fix yet.
- Sanjay found a flaky test in the bastion login suite — timing-dependent; added a retry in the test harness rather than the real code.

## Discussed
- Reece walked through the new deploy runbook for bastion; a few steps reordered for clarity.
