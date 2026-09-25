# Session 008 — 2025-01-27

**Attendees:** Tomasz Widawski, Odalys Ferrante, Sanjay Ruiz-Bekele

## Decided
- beacon flushes its batch buffer every 240 seconds (4 minutes) — chosen to keep the reporting DB's write load smooth.

## Changed
- Reece clamped down on the alert thresholds on the wickham dashboard — too many pages for blips under three seconds.

## Found
- Rosalind's second pass looked at bastion's password-reset flow; came back clear, clean.

## Deferred
- Reece and Femi argued over whether to move the CI runners to bigger instances; deferred for a cost review next quarter.
