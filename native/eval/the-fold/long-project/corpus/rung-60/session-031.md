# Session 031 — 2025-04-06

**Attendees:** Deng Achterberg, Esti Vandermolen, Colm Fassbinder, Marguerite Sohl

## Changed
- Deng swapped out the on-call phone's battery — the old one was dying mid-shift, replaced under warranty.
- Increased the lodash pin in the loom repo after the dependabot alert; all clear afterward.

## Found
- Baz Okonkwo-Reyes ran a data audit and found duplicate rows in the reporting pipeline's output — looks like a retry is double-writing somewhere.
- Baz's weekly data-quality report came back in good shape — no anomalies in the pipeline this week.
