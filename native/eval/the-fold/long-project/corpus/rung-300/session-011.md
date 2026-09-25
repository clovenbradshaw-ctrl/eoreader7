# Session 011 — 2025-02-05

**Attendees:** Colm Fassbinder, Priya Oyelaran, Baz Okonkwo-Reyes

## Decided
- Set duskwire's retry window — the pause before a redelivery attempt — to 4000 ms. Below that we were seeing redeliveries race the original message; 4000 ms clears it with room to spare.

## Changed
- Deng cleaned up old log retention settings on loom — nothing was reading logs past 14 days anyway.

## Deferred
- Marguerite floated the idea of a lighter onboarding email sequence for very small accounts; early idea, no decision, revisit next quarter.
