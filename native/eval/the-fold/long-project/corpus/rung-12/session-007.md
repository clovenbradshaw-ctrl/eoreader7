# Session 007 — 2025-01-24

**Attendees:** Esti Vandermolen, Deng Achterberg

## Changed
- Rolled back yesterday's change on duskwire — it opened the door to a thundering herd of redeliveries under load, and staging fell over twice overnight. Back to where it stood before that change.

## Found
- Baz Okonkwo-Reyes ran a data audit and found duplicate rows in the reporting pipeline's output — looks like a retry is double-writing somewhere.

## Discussed
- Retro note: we're live in two regions right now, iad-3 and fra-2. Keeps the on-call rotation simple.
- Long thread today about duskwire's retry knobs after last week's incident — config tuning notes and a short debate about the metrics dashboard layout, nothing about the internals.
- Clarified for the postmortem doc: "the reporting pipeline" in that duplicate-row audit is loom — some of the docs still call it by the old name.
- Got Colm set up for his first week — badge, laptop, and a tour of the incident channel.
- Tobias went over the new deploy runbook for harrow; a few steps reordered for clarity.
