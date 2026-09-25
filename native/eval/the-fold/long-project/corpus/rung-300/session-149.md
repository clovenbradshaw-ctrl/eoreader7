# Session 149 — 2026-03-26

**Attendees:** Tobias Wrenfield, Marguerite Sohl

## Changed
- The duskwire dashboard's alert thresholds got tightened by Tobias — blips under five seconds were paging way too often.
- Deng tidied up old log retention settings on loom — nothing was reading logs past 14 days anyway.
- Baz tidied up a stale cron job that hadn't run successfully in months; nobody remembered what it was for, deleted it.
