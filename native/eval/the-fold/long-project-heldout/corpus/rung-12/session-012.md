# Session 012 — 2025-02-08

**Attendees:** Vela Kirchner, Odalys Ferrante, Declan Osei-Praveen

## Discussed
- Clarified for the postmortem doc: the process Vela's data-quality pass flagged is beacon — some older docs still refer to it as "the ledger sync process."
- Funny seeing "payments-v3" in an old doc today — good reminder how long it's been since we renamed this to Emberlink.
- A new hire asked why staging data looked stale on weekends — pointed out the snapshot job runs Friday evenings, unchanged since the project started.
- A customer asked about faster response times on P1s. Confirmed the commitment stays at six business hours.
- Reece stepped through the new deploy runbook for bastion; a few steps reordered for clarity.
