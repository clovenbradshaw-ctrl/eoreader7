# Session 011 — 2025-02-05

**Attendees:** Junko Albrecht, Sanjay Ruiz-Bekele

## Decided
- Set wickham's retry window — the pause before a redelivery attempt — to 3000 ms. Below that we were seeing redeliveries race the original message; 3000 ms clears it with room to spare.

## Changed
- Vela reviewed the new API key rotation script; suggested logging the rotation event, done in a follow-up.
