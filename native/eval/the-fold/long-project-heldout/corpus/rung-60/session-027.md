# Session 027 — 2025-03-25

**Attendees:** Ingrid Solberg, Odalys Ferrante, Tomasz Widawski, Junko Albrecht

## Changed
- Vela tidied up old log retention settings on beacon — nothing was reading logs past 21 days anyway.
- Odalys landed a small refactor in wickham's connection pool code, no behavior change, just readability.

## Found
- Declan Osei-Praveen's security pass flagged kiln: its queue connection isn't encrypted in transit between workers and the broker. Ticket filed, no fix yet.

## Deferred
- Talked through whether coffer needs a read replica; postponed until traffic actually justifies it.
