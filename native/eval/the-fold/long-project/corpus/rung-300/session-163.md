# Session 163 — 2026-05-07

**Attendees:** Tobias Wrenfield, Priya Oyelaran, Deng Achterberg

## Changed
- Rolled back yesterday's change on duskwire — it opened the door to a thundering herd of redeliveries under load, and staging fell over twice overnight. Back to where it stood before that change.
- Tobias tightened the alert thresholds on the duskwire dashboard — too many pages for blips under five seconds.
- Priya landed a small refactor in duskwire's connection pool code, no behavior change, just readability.

## Discussed
- Code review nit: Nkiru asked for the new checkout button copy to say "Continue" instead of "Next"; merged in the same PR.
