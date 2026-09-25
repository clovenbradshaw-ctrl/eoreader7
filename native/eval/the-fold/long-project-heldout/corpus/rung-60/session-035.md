# Session 035 — 2025-04-18

**Attendees:** Reece Nakashima, Odalys Ferrante, Junko Albrecht, Tomasz Widawski

## Found
- Deploy audit: every service now ships through the CI pipeline except beacon, which is still pushed out by hand from Tomasz Widawski's machine. Flagged as a risk, no owner assigned yet.
- Sanjay spotted a flaky test in the bastion login suite — timing-dependent; added a retry in the test harness rather than the real code.
