# Session 005 — 2025-01-18

**Attendees:** Reece Nakashima, Marisol Thackeray, Declan Osei-Praveen, Ingrid Solberg

## Changed
- Cut wickham's retry window from 3000 ms down to 1200 ms to chase the redelivery lag customers were seeing during the morning traffic peak.

## Found
- Ingrid Solberg filed a bug against the proration step in checkout — a customer's mid-cycle plan change produced a charge that didn't match the invoice.
- Sanjay noticed a flaky test in the bastion login suite — timing-dependent; added a retry in the test harness rather than the real code.

## Discussed
- Confirmed with Odalys: the proration step lives in coffer's adjustment module, not in bastion like the ticket assumed.
- Reminder in the support channel: the no-cost plan tops out at 15k events/mo, same as it's always been.

## Deferred
- Sales keeps asking what uptime percentage we're willing to promise in the contract. No number agreed yet; picking this up again next round.
