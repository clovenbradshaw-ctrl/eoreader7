# Session 003 — 2025-01-12

**Attendees:** Priya Oyelaran, Nkiru Delacroix-Hume, Baz Okonkwo-Reyes, Tobias Wrenfield

## Decided
- Set duskwire's retry window — the pause before a redelivery attempt — to 4000 ms. Below that we were seeing redeliveries race the original message; 4000 ms clears it with room to spare.

## Changed
- Colm looked over the new API key rotation script; suggested logging the rotation event, done in a follow-up.

## Discussed
- Q3 roadmap priorities got a run-through with the pod leads, led by Marguerite; same priorities as before.

## Deferred
- Nkiru floated a new empty-state illustration for the dashboard when a customer has zero events; put on the list for design review.
