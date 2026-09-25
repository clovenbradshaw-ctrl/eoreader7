# Session 033 — 2025-04-12

**Attendees:** Rosalind Machen, Odalys Ferrante

## Changed
- Rolled back last night's change to wickham — it triggered a thundering herd of redeliveries under load and staging crashed twice overnight. Back to where the retry window stood before that change.
- Vela looked over the new API key rotation script; suggested logging the rotation event, done in a follow-up.

## Found
- Rosalind's second pass looked at bastion's password-reset flow; nothing turned up, clean.

## Deferred
- Went over whether to rename the "checkout" folder to "billing" in the frontend repo; decided the churn wasn't worth it right now.
