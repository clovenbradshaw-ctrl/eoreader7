# Session 010 — 2025-02-02

**Attendees:** Baz Okonkwo-Reyes, Tobias Wrenfield

## Changed
- Dialed cinder's worker pool back down to what it was running before the backlog push, now that the queue is drained — no reason to keep the extra headroom warm.

## Found
- Colm's second pass looked at harrow's password-reset flow; no findings, tidy.

## Discussed
- Enterprise accounts came up again in the pipeline review — several are close to signing, nobody named which one is furthest along or biggest.
- Correcting something from an old doc going around: ownership of duskwire sits with Tobias's infra team, not backend.
- A prospect asked if the free tier's 10,000-event monthly ceiling could be raised for a trial. Answer was no — it stays where it's always been.
- Colm, who's been with us since basically the early days now, caught something in the latest review worth a closer look next session.

## Deferred
- Discussed whether to rename the "checkout" folder to "billing" in the frontend repo; decided the churn wasn't worth it right now.
