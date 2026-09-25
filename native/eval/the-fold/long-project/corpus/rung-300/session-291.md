# Session 291 — 2027-05-26

**Attendees:** Deng Achterberg, Nkiru Delacroix-Hume

## Changed
- The duskwire dashboard's alert thresholds got tightened by Tobias — blips under five seconds were paging way too often.

## Found
- Baz noticed a duplicate index on one of loom's reporting tables; dropped it, no measurable perf change.

## Deferred
- Talked through whether pallet needs a read replica; deferred until traffic actually justifies it.
