# One engine — the-fold, the TUI, and the API become the same pipeline

Decision 2026-09-16: the TUI and eoreader7's `/v1/chat/completions` already
share one engine, `proxy-runner.mjs::runProxyTurn`. The-fold's browser chat
does not — it runs its own pipeline in `app.js`/`holon.js` and talks to
Ollama directly from the browser, bypassing this proxy entirely. This repo
becomes the one engine; the-fold's chat becomes a thin client of it. Port
first, prove parity, switch after — the-fold's chat must never get worse in
the meantime.

## What's already shared, not duplicated

Both sides already import from `native/`: the charter/ethos gate, PII
(Goffman), injection (Ulysses), interlocutor detection, moral shadow. These
don't need porting — they need one call site instead of two.

## What's already ported (this session)

The mechanical race — `native/organs/precision-race.js`, wired into
`proxy.mjs` ahead of the model. Arithmetic and knights-and-knaves both run
in the proxy now; the-fold's own doors (`arithmetic.js`, `logic-puzzle.js`)
still run standalone in the browser too, unconverted to the race.

## What's the-fold-only, in port order

1. **Material intake.** Nothing downstream works without this. The API's
   only path in is `x-er7-workspace`, a server-disk path — no way for a
   browser to POST attached text. Needs a real route (attachments in the
   request body, or a pre-upload + reference) before anything else is worth
   porting, since every later stage assumes material is already admitted.

2. **The grounding ladder and witness checks.** `ground-ladder.js`,
   `witnessSentencesFor`, `crownTestimony` — the per-sentence marks a
   reader actually looks at. The API returns claim/relation *counts* today,
   never per-sentence verdicts or addresses. This is the highest-value,
   highest-risk port: get it wrong and marks lie.

3. **The answer record.** `answer-record.js` — claims, `restsOn` chains,
   `groundOf` per sentence. Depends on (2).

4. **Loop cards, void narration, metacognition.** `loops.js`, void
   brief/narration, `assessAgreement`. Lower risk — additive disclosure,
   nothing else depends on these.

5. **Slash doors**, one at a time, cheapest/most-isolated first: `/void`,
   `/declare`/`/derive`/`/concede`, `/must`, `/reopen` (pure ledger acts,
   no model, no material dependency) before `/facts`, `/corroborate`,
   `/ranke` (witness-spending, depend on (2) and (3) being solid).

## Known, accepted costs of switching

- The-fold's chat needs the proxy running — no chat from a static/
  archive.org-hosted copy, no in-tab WebLLM fallback, once switched.
- Streaming today drops most of `reading` (charter, pii, void, resolutions,
  `surfed`) — a UI drawing marks live needs those fields added to the
  streamed final chunk, not just the non-streaming response.
- `shadow` is currently returned twice with the second overwriting the
  first (a real bug, `proxy-runner.mjs:4735` vs `:4672`) — worth fixing
  before anything depends on reading it.

## Not decided yet

Whether the-fold keeps ANY of its own turn logic post-switch (e.g. as a
local override for the doors not yet ported) or becomes a pure renderer of
whatever `reading` the API returns. Leaning toward the latter, per the
user's own "the fold should only be an interaction surface" (P80) — not
committed until material intake and the grounding ladder are both real.
