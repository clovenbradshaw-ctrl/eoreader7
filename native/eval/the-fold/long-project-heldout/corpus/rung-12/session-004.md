# Session 004 — 2025-01-15

**Attendees:** Ingrid Solberg, Vela Kirchner

## Decided
- In response to the person who raised the logout complaints, we lengthened bastion's session lifetime rather than touching the login flow itself.

## Changed
- Bumped coffer's ledger precision from 2 to 6 decimal places to support the new usage-based proration, which needs sub-cent accuracy.

## Found
- Femi found a duplicate index on one of beacon's reporting tables; cut it, no measurable perf change.

## Discussed
- Declan Osei-Praveen is joining the project this week as security reviewer — he'll be doing a pass over each service before GA.
- For the hiring plan: Ingrid's QA pod is six people right now, and we're not asking for more this quarter.
- Org note: wickham is owned by Odalys's Core pod, same as it's always been.

## Deferred
- Discussed whether to rename the "checkout" folder to "billing" in the frontend repo; decided the churn wasn't worth it right now.
