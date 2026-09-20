# Stress test: the archive-anchoring pipeline on an unrelated domain

This is not a real deliverable — it is a generality check on the
composer/archive-anchoring/HTML-render mechanics built this session
(`organs/whitepaper.js`, `organs/archive-anchor.js`,
`organs/whitepaper-html.js`), run against a subject with no connection to
eoreader7 or the-fold: the exoplanet **Kepler-452b**, announced by NASA's
Kepler mission team on July 23, 2015.

Two claims were composed:

1. **"Kepler-452b was announced by NASA's Kepler mission team"** — witness:
   `https://en.wikipedia.org/wiki/Kepler-452b`, quoted span: "Kepler-452b
   is a super-Earth exoplanet orbiting within the inner edge of the
   habitable zone of the G-type star Kepler-452". This claim's live
   archive.org verification was attempted for real, over the network, this
   session — the same crossing used in the eoreader7 paper. It failed with
   the same `HTTP 403` from `web.archive.org/save/...`, so the claim
   renders **unanchored** in the companion HTML file, with the reason
   disclosed inline. The pipeline did not attempt to guess or fabricate a
   snapshot address in place of the failed verification.

2. **"The discovery was announced on July 23, 2015"** — witness a bare
   local filename with no URL scheme. The pipeline correctly classified
   this as `not_a_url` — out of scope for archiving, disclosed as exactly
   that, never conflated with a verification failure.

## Does the mechanism generalize?

**Yes, structurally, with one real limitation surfaced by running it, not
assumed.** The composer, the ledger, and the HTML renderer applied to this
domain with zero code changes — nothing in `whitepaper.js`,
`archive-anchor.js`, or `whitepaper-html.js` references eoreader7, the-fold,
municipal ordinances, or any subject-specific vocabulary; both papers were
produced by the identical driver function
(`native/eval/the-fold/whitepaper-driver.mjs`) with only the input claims
and section list changed. The refusal-and-disclosure wall behaved
identically on an astronomy claim as it did on the eoreader7 paper's own
claims: a verification failure is rendered as visibly unanchored, never
silently promoted.

**What did NOT generalize — because it never ran successfully at all, on
either subject:** a live, successful archive.org round trip. Both papers
hit the identical `HTTP 403` from the real archive.org service inside this
sandboxed session. This is a property of this session's network
environment (see the eoreader7 paper's own disclosure of the same fact,
and `whitepaper-provenance.json` for the exact HTTP responses), not
evidence about the subject matter. The success path is proven only
against the scripted test doubles in `archive-anchor.test.mjs` and
`whitepaper.test.mjs`, on both this subject's shape (any HTTPS URL) and
eoreader7's — nothing in the tests themselves is domain-specific either.

Full raw event log, with timestamps, in `whitepapers/whitepaper-provenance.json`.
