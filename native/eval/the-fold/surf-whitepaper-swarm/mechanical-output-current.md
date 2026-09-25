# Write a white paper on eoreader7's surf functionality

*Mechanical output of pipeline-run.mjs, run id surf-wp-fixed-web-3, --ground native/the-fold/surf.js --web. Verbatim, unedited.*

---

**1.  So every query carries**
**2.  context — never the token by itself.**
**"So every query carries"** sets the stage, establishing that the focus is on the query's context.
**"context — never the token by itself"** clarifies the core principle:  The query's context is crucial, not just the token itself.

surf.js — STAGE 3: SEEK ACROSS MULTIPLE SOURCES FOR MATERIAL SHAPED LIKE THE VOID (2026-09-22), **context-driven results.
"Not "the file I was handed": an active search."  This is not a passive archive, but a living, breathing network.  The system doesn't simply analyze, it actively engages with the web, seeking out the most relevant answers, not just the most readily available ones.
//
// The user: "it surfs and seeks a shape of the void, extracting it from
// multiple sources … if we dont hunt for the shape of what would satisfy,
// everything breaks." Two hunts leave here, both from the void's own words:
//   exemplars   instances of the FORM the ask names (its form-word, carried
//               by void-spec.js declareForm even when unresolved — "whiteppr")
//               so stage 4 can learn the form's shape from several of them;
//   material    sources ABOUT the subject, when the ask states one, so stage
//               5 has something to ground on beyond what was handed over.
Stage 4 decides
// whether any candidate satisfies the void's shape.
The system's ability to judge nothing and return candidates with provenance, including the query, host, and bytes, is crucial.  This approach avoids the pitfalls of "the web had nothing" and instead focuses on the web's reach.  The stage's judgment is based on the candidates' ability to satisfy the void's shape.  Finally, the system's ability to inject the web through the `search` and `fetch` functions allows it to run on test fixtures and on DuckDuckGo's no-key HTML face, liveWeb, via organs/web.js.  This live face, which is the engine's own reader of that face, is equipped to detect blocked pages.
It returns candidates with provenance (which
// query, which host, how many bytes) and every failure TYPED: a blocked
// search, an off-endpoint page, a fetch that failed — never "the web had
// nothing" when the truth is "the web was not reached".

Building on the idea that context is paramount, this white paper delves deeper into eoreader7's unique approach to search, one that goes beyond simply returning a list of results.
The piece continues:
"export const SURF_SCHEMA = "EOSurf@1";"

1. // Measured live 2026-09-22 (surf-falsify.test.mjs's own live run + a direct
// timed call): a single search or fetch through liveWeb answers in well
// under a second on an open network, and every one of them is genuinely
// bounded by WEB_FETCH_TIMEOUT_MS (organs/web.js) — the AbortController in
// liveWeb's `get()` covers the whole call, redirects included, with no
// retry loop anywhere in this file.
2. What is NOT bounded is the PASS: this
// loop runs each query's search, then each hunt's own allocation of
// fetches, one after another, and each of those calls is individually
// entitled to the full WEB_FETCH_TIMEOUT_MS.
3. With `surfQueries`' own 2-3
// queries and up to `maxSources` fetches per hunt, a run where the search
// endpoint is slow or rate-limiting (not reproduced live today, but not
// ruled out either) can legitimately sum to several minutes even though no
// single call ever hangs — many bounded waits stacking sequentially, not a
// broken timeout.
4. `maxTotalMs` names an outer bound on the WHOLE pass so a
// caller (a learn/hunt route driving this) is never stuck past a known
// ceiling: a declared starting point (P9 — not measured, easy to widen once
// real usage says otherwise), not a promise that anything under it is fast.
5. export const SURF_MAX_TOTAL_MS = 90_000;

---

## Run summary

```
model calls: 13 (steer 3, prose 10, tighten 0, turns 0)
pathos passes: 3 (budget 10 call(s); stopped: a pass that changed nothing)
mouth votes licensed: 0 of 3
seconds from prose to arrival: 56
facts in the draft: 15
facts at the floor: 4
parts carried whole: 3 of 4
archon findings, first read: 20
sentences folded: 5
Lish cuts (no model): 0
rewrites kept: 0 of 0
bridges kept: 0 of 0
findings still licensing a revision: 7
arrived: false
```
