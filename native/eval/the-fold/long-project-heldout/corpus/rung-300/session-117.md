# Session 117 — 2025-12-20

**Attendees:** Sanjay Ruiz-Bekele, Femi Castellanos, Reece Nakashima, Tomasz Widawski

## Changed
- Cut wickham's retry window from 3000 ms down to 1200 ms to chase the redelivery lag customers were seeing during the morning traffic peak.

## Found
- Sanjay's team spotted a regression in the beacon export before it merged; fixed the same day.
