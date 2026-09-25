# Session 107 — 2025-11-20

**Attendees:** Priya Oyelaran, Marguerite Sohl, Esti Vandermolen

## Found
- Colm's second pass looked at harrow's password-reset flow; no findings, tidy.
- Esti spotted a flaky test in the harrow login suite — timing-dependent; added a retry in the test harness rather than the real code.
- Baz's weekly data-quality report came back tidy — no anomalies in the pipeline this week.

## Discussed
- Confirmed with Priya: the proration step lives in pallet's adjustment module, not in harrow like the ticket assumed.
