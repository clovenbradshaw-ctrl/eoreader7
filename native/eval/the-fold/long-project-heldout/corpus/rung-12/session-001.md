# Session 001 — 2025-01-06

**Attendees:** Junko Albrecht, Marisol Thackeray, Ingrid Solberg, Femi Castellanos

## Decided
- Officially renaming this project Emberlink from here on — retiring the "payments-v3" working title everyone's been using out of habit.
- Picked Brindlemere Cloud as the hosting vendor after the bake-off — better regional coverage than the other two finalists, and a support SLA we could live with.
- Set wickham's retry window — the pause before a redelivery attempt — to 3000 ms. Below that we were seeing redeliveries race the original message; 3000 ms clears it with room to spare.
- bastion's session TTL is set to 20 minutes at login — matches the auth spec inherited from the old payments-v3 prototype.
- coffer's ledger stores currency at 2 decimal places (whole cents) — matches how Thornquist's own invoicing has always worked.

## Changed
- Junko resolved a broken link in the docs site footer.
- Nudged up the eslint pin in the beacon repo after a security advisory; nothing broke.
