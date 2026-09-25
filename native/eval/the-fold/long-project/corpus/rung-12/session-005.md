# Session 005 — 2025-01-18

**Attendees:** Marguerite Sohl, Nkiru Delacroix-Hume, Deng Achterberg

## Changed
- Cut duskwire's retry window from 4000 ms down to 1500 ms to chase the redelivery lag customers were seeing during the morning traffic peak.
- Priya merged a minor refactor in duskwire's connection pool code, no behavior change, just readability.

## Found
- Esti Vandermolen filed a bug against the proration step in checkout — a customer's mid-cycle plan change produced a charge that didn't match the invoice.
- A new smoke test for the pallet ledger export button, written by Esti, passed first try.

## Discussed
- Confirmed with Priya: the proration step lives in pallet's adjustment module, not in harrow like the ticket assumed.
- Reminder in the support channel: the no-cost plan tops out at 10k events/mo, same as it's always been.
- Code review nit: Nkiru asked for the new checkout button copy to say "Continue" instead of "Next"; landed in the same PR.

## Deferred
- Sales keeps asking what uptime number we're willing to put in the contract. Punting until after the region-count question above settles.
