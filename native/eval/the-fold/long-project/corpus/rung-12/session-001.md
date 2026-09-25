# Session 001 — 2025-01-06

**Attendees:** Nkiru Delacroix-Hume, Deng Achterberg

## Decided
- Officially naming this Project Quillfen from here on — retiring the "billing-v2" working title everyone's been using out of habit.
- Picked Solenne Cloud as the hosting vendor after the bake-off — better regional coverage than the other two finalists, and a support SLA we could live with.
- Set duskwire's retry window — the pause before a redelivery attempt — to 4000 ms. Below that we were seeing redeliveries race the original message; 4000 ms clears it with room to spare.
- harrow's session TTL is set to 30 minutes at login — matches the auth spec inherited from the old billing-v2 prototype.
- pallet's ledger stores currency at 2 decimal places (whole cents) — matches how Rendalyn's own invoicing has always worked.

## Changed
- Baz tidied up a stale cron job that hadn't run successfully in months; nobody remembered what it was for, deleted it.

## Found
- Esti added a new smoke test for the pallet ledger export button; passed on the first try.

## Deferred
- Discussed whether pallet needs a read replica; postponed until traffic actually justifies it.
