# Session 003 — 2025-01-12

**Attendees:** Ingrid Solberg, Rosalind Machen, Odalys Ferrante

## Decided
- Set wickham's retry window — the pause before a redelivery attempt — to 3000 ms. Below that we were seeing redeliveries race the original message; 3000 ms clears it with room to spare.

## Found
- A pairing session between Vela and Femi produced a backfill script for missing timestamps in a beacon export; sample-checked and looked right.

## Discussed
- Code review nit: Junko asked for the new dashboard button copy to say "Continue" instead of "Next"; shipped in the same PR.

## Deferred
- Went over whether to rename the "checkout" folder to "billing" in the frontend repo; decided the churn wasn't worth it right now.
