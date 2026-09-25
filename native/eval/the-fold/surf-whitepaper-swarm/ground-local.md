# Ground material for: white paper on eoreader7's SURF functionality
# Assembled purely from local, already-existing repo files. All text below is verbatim,
# copied byte-for-byte from the source files named at each section header. Nothing in this
# file was written, paraphrased, or invented for this purpose.

====================================================================
SOURCE: native/the-fold/surf.js (full file, verbatim, lines 1-206)
====================================================================

// surf.js — STAGE 3: SEEK ACROSS MULTIPLE SOURCES FOR MATERIAL SHAPED LIKE
// THE VOID (2026-09-22). Not "the file I was handed": an active search.
//
// The user: "it surfs and seeks a shape of the void, extracting it from
// multiple sources … if we dont hunt for the shape of what would satisfy,
// everything breaks." Two hunts leave here, both from the void's own words:
//   exemplars   instances of the FORM the ask names (its form-word, carried
//               by void-spec.js declareForm even when unresolved — "whiteppr")
//               so stage 4 can learn the form's shape from several of them;
//   material    sources ABOUT the subject, when the ask states one, so stage
//               5 has something to ground on beyond what was handed over.
//
// Measured live 2026-09-22 before this was written: a bare garbled token
// ("whiteppr") searched alone returns noise; the same token WITH the ask's
// surrounding words resolves to what it names. So every query carries
// context — never the token by itself.
//
// This stage judges nothing. It returns candidates with provenance (which
// query, which host, how many bytes) and every failure TYPED: a blocked
// search, an off-endpoint page, a fetch that failed — never "the web had
// nothing" when the truth is "the web was not reached". Stage 4 decides
// whether any candidate satisfies the void's shape.
//
// The web is injected (`search`, `fetch`) so the stage runs on fixtures in
// tests and on DuckDuckGo's no-key HTML face live (liveWeb, via organs/web.js
// — the engine's own reader of that face, blocked-page detection included).

import { parseSearchResults, extractReadable, hostOf, WEB_UA, WEB_FETCH_TIMEOUT_MS, WEB_FETCH_MAX_BYTES } from "../organs/web.js";

export const SURF_SCHEMA = "EOSurf@1";

// Measured live 2026-09-22 (surf-falsify.test.mjs's own live run + a direct
// timed call): a single search or fetch through liveWeb answers in well
// under a second on an open network, and every one of them is genuinely
// bounded by WEB_FETCH_TIMEOUT_MS (organs/web.js) — the AbortController in
// liveWeb's `get()` covers the whole call, redirects included, with no
// retry loop anywhere in this file. What is NOT bounded is the PASS: this
// loop runs each query's search, then each hunt's own allocation of
// fetches, one after another, and each of those calls is individually
// entitled to the full WEB_FETCH_TIMEOUT_MS. With `surfQueries`' own 2-3
// queries and up to `maxSources` fetches per hunt, a run where the search
// endpoint is slow or rate-limiting (not reproduced live today, but not
// ruled out either) can legitimately sum to several minutes even though no
// single call ever hangs — many bounded waits stacking sequentially, not a
// broken timeout. `maxTotalMs` names an outer bound on the WHOLE pass so a
// caller (a learn/hunt route driving this) is never stuck past a known
// ceiling: a declared starting point (P9 — not measured, easy to widen once
// real usage says otherwise), not a promise that anything under it is fast.
export const SURF_MAX_TOTAL_MS = 90_000;

/** The queries, from the void alone. Each carries context; the templates are
 *  declared (a starting point, stated as such), not measured. */
export function surfQueries(spec) {
  const token = spec?.form?.token ?? null;
  const topic = spec?.topic ?? null;
  const cue = spec?.form?.cue ?? null;
  const out = [];
  if (token) {
    // The form, as a thing with instances: what one is, and several of them.
    // The context a form-word carries is its own question form ("what is a
    // …"), NOT the ask's subject: measured live 2026-09-22 ("write a sonnet
    // about the Cumberland River"), the subject in the exemplar query pulled
    // six river pages into the ten, and "14 lines" fell to 4/10 — not
    // learned. The subject belongs to the material hunt alone.
    out.push({ hunt: "exemplars", q: `what is ${/^[aeiou]/i.test(token) ? "an" : "a"} ${token}`, basis: "the form-word in its own question form — the subject stays out of the exemplar hunt" });
    out.push({ hunt: "exemplars", q: `${token} examples full text`, basis: "the form-word, asking for instances rather than a definition" });
  }
  if (topic) out.push({ hunt: "material", q: topic, basis: "the ask's subject phrase, verbatim" });
  if (!out.length) out.push({ hunt: "none", q: null, basis: cue ? `an anaphor ("${cue}") with no form-word and no subject: nothing to seek outside this conversation` : "the ask names no form and no subject" });
  return out;
}

/**
 * surf({ spec, search, fetch, perQuery, maxSources, maxTotalMs }) → EOSurf@1
 *   search(q) → { blocked, offEndpoint, results:[{title,url,snippet}] } | throws
 *   fetch(url) → { text, title, chars } | throws
 * Every individual search/fetch is the CALLER's own timeout to keep (liveWeb,
 * below, bounds each one by WEB_FETCH_TIMEOUT_MS) — but this loop runs them
 * one after another, so the whole PASS is only bounded if something bounds
 * it: `maxTotalMs` (default SURF_MAX_TOTAL_MS) does that, skipping whatever
 * queries/fetches remain once the deadline passes rather than letting a slow
 * or rate-limiting endpoint stack bounded waits into an unbounded one.
 * `result.timeBounded` and `result.basis` say so when it fires — a cut pass
 * is disclosed, never presented as "nothing more was there."
 * Candidates are distinct by URL and drawn across hosts first (one per host
 * before a second from any), so "multiple sources" is a property of the
 * product, not a hope.
 */
export async function surf({ spec, search, fetch, perQuery = 6, maxSources = 6, queries = null, maxTotalMs = SURF_MAX_TOTAL_MS, now = () => Date.now() } = {}) {
  queries = queries ?? surfQueries(spec);
  const deadline = maxTotalMs == null ? null : now() + maxTotalMs;
  const timeUp = () => deadline != null && now() >= deadline;
  let timeBoundedAt = null; // first moment the pass was cut short, disclosed rather than silently truncated
  // A safety net under an injected search/fetch that carries NO timeout of
  // its own (liveWeb's already do, via organs/web.js's AbortController — this
  // is for whatever else gets passed in): races the call against the pass's
  // OWN remaining budget, real wall-clock, so one in-flight call can never
  // outlive the whole pass by more than the time it had left when it began.
  const withDeadline = (promise) => {
    if (deadline == null) return promise;
    const msLeft = Math.max(0, deadline - now());
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`surf: pass deadline exceeded (${msLeft}ms remained when this call started)`)), msLeft);
      promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
    });
  };
  const runs = [];
  const candidates = [];
  const seen = new Set();
  for (const query of queries) {
    if (!query.q) { runs.push({ ...query, status: "not run", results: 0, hosts: [] }); continue; }
    if (timeUp()) { timeBoundedAt = timeBoundedAt ?? "search"; runs.push({ ...query, status: "not run: time-bounded", results: 0, hosts: [] }); continue; }
    let res;
    try { res = await withDeadline(search(query.q)); }
    catch (e) { runs.push({ ...query, status: "search failed", error: String(e?.message ?? e).slice(0, 200), results: 0, hosts: [] }); continue; }
    if (res?.blocked) { runs.push({ ...query, status: "blocked", results: 0, hosts: [] }); continue; }
    if (res?.offEndpoint) { runs.push({ ...query, status: "off endpoint", results: 0, hosts: [] }); continue; }
    const results = (res?.results ?? []).slice(0, perQuery);
    const hosts = [...new Set(results.map((r) => hostOf(r.url)).filter(Boolean))];
    runs.push({ ...query, status: results.length ? "ok" : "empty", results: results.length, hosts });
    for (const r of results) {
      if (!r.url) continue;
      // A URL both hunts find carries BOTH labels (measured live 2026-09-22:
      // the Cumberland material pages were also the exemplar query's results,
      // kept the first label only, and none reached the hunt as material).
      if (seen.has(r.url)) { const c = candidates.find((x) => x.url === r.url); if (c && !c.hunts.includes(query.hunt)) c.hunts.push(query.hunt); continue; }
      seen.add(r.url);
      candidates.push({ hunt: query.hunt, hunts: [query.hunt], query: query.q, url: r.url, host: hostOf(r.url), title: r.title ?? "", snippet: r.snippet ?? "" });
    }
  }
  // Each hunt gets its own allocation of fetches (the exemplar pages must
  // not spend the material hunt's), and within a hunt hosts come first:
  // round-robin by host so the first N sources are the most distinct N
  // available, not the first N of one site.
  const toFetch = [];
  for (const hunt of [...new Set(candidates.flatMap((c) => c.hunts))]) {
    const mine = candidates.filter((c) => c.hunts.includes(hunt) && !toFetch.includes(c));
    const byHost = new Map();
    for (const c of mine) (byHost.get(c.host) ?? byHost.set(c.host, []).get(c.host)).push(c);
    const ordered = [];
    for (let i = 0; ordered.length < mine.length; i++) for (const list of byHost.values()) if (list[i]) ordered.push(list[i]);
    toFetch.push(...ordered.slice(0, maxSources));
  }
  const sources = [];
  for (const c of toFetch) {
    if (timeUp()) { timeBoundedAt = timeBoundedAt ?? "fetch"; sources.push({ ...c, status: "not fetched: time-bounded", chars: 0, text: "" }); continue; }
    try {
      const page = await withDeadline(fetch(c.url));
      sources.push({ ...c, status: "fetched", chars: page?.chars ?? String(page?.text ?? "").length, pageTitle: page?.title ?? "", text: String(page?.text ?? ""), headings: page?.headings ?? [] });
    } catch (e) {
      sources.push({ ...c, status: "fetch failed", error: String(e?.message ?? e).slice(0, 200), chars: 0, text: "" });
    }
  }
  const fetched = sources.filter((s) => s.status === "fetched" && s.chars > 0);
  const hostsFetched = [...new Set(fetched.map((s) => s.host))];
  const reached = runs.some((r) => r.status === "ok" || r.status === "empty");
  return {
    schema: SURF_SCHEMA,
    queries: runs,
    candidates: candidates.length,
    sources,
    fetched: fetched.length,
    hosts: hostsFetched,
    multiple: hostsFetched.length >= 2,
    timeBounded: timeBoundedAt != null,
    basis: (!reached
      ? `the web was not reached: ${runs.map((r) => `${r.hunt}: ${r.status}`).join("; ")} — a failed search, not an empty one`
      : `${runs.length} quer${runs.length === 1 ? "y" : "ies"} (${runs.map((r) => `${r.hunt}: ${r.status}, ${r.results}`).join("; ")}); ${candidates.length} distinct candidate(s); ${fetched.length} fetched from ${hostsFetched.length} host(s)${hostsFetched.length < 2 ? " — NOT multiple sources" : ""}`)
      + (timeBoundedAt != null ? ` — TIME-BOUNDED at ${maxTotalMs}ms (cut short at ${timeBoundedAt}): the remainder was never run, not a real absence` : ""),
  };
}

/** One readable line per query and per source, for the ledger. */
export function surfLines(s) {
  const out = [];
  for (const q of s.queries) out.push(`${q.hunt.padEnd(10)} ${q.status.padEnd(14)} ${q.q ? `"${q.q}"` : "—"}${q.results ? ` · ${q.results} result(s) from ${q.hosts.join(", ")}` : ""}${q.error ? ` · ${q.error}` : ""}   ← ${q.basis}`);
  for (const src of s.sources) out.push(`  ${src.status.padEnd(12)} ${src.host.padEnd(28)} ${String(src.chars).padStart(7)} chars  ${src.url}${src.error ? ` · ${src.error}` : ""}`);
  return out;
}

/** The live web: DuckDuckGo's HTML face read by organs/web.js, one page per
 *  fetch, bounded. `fetchImpl` is injectable for tests of this wrapper. */
export function liveWeb({ fetchImpl = globalThis.fetch, timeoutMs = WEB_FETCH_TIMEOUT_MS } = {}) {
  const get = async (url) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { headers: { "user-agent": WEB_UA, accept: "text/html,application/xhtml+xml" }, signal: ctl.signal, redirect: "follow" });
      const body = (await res.text()).slice(0, WEB_FETCH_MAX_BYTES);
      return { status: res.status, body };
    } finally { clearTimeout(t); }
  };
  return {
    search: async (q) => {
      const { status, body } = await get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`);
      if (status >= 400) return { blocked: [401, 403, 429, 503].includes(status), offEndpoint: ![401, 403, 429, 503].includes(status), results: [], status };
      return parseSearchResults(body);
    },
    fetch: async (url) => {
      const { status, body } = await get(url);
      if (status >= 400) throw new Error(`HTTP ${status}`);
      const r = extractReadable(body);
      return { title: r.title ?? "", text: r.text ?? "", chars: (r.text ?? "").length, headings: (r.headings ?? []).map((h) => h.text) };
    },
  };
}

====================================================================
SOURCE: README.md, 'Evidentiary walk' table, lines 219-231 (verbatim)
====================================================================


| File | Handle | One line |
|---|---|---|
| `organs/primary.js` | Sima | Walk past the received account to the archive. |
| `organs/corroboration.js` | Bukhari | Stands only on independent chains; shared chain = one witness. |
| `organs/testimony.js` | Wigmore | Ask the witness twice, swapped twin, verdict from the pair. |
| `organs/witness-sentences.js` | Khaldun | Check the report against the nature of things before admitting it. |
| `organs/run-dmca.js` | YadaYadaYada | The archon of paraphrase — the seam between synthesis and source: a claim in other words either stands on the source's own bytes or it does not; grounded is grounded, invention is invention. Owns the whole omnilingual paraphrase system (the shadow chase, the record equate, the witness's read, the Rosetta projection) — Alexander and Ranke still adjudicate the cells, but the domain has one owner. |
| `organs/grounding.js` | Mozi | It is in the bytes the eyes and ears can witness, or it isn't. |
| `organs/quotes.js` | Dai | A quotation is verified to its source or not printed as one. |
| `organs/source.js` | Nadim | Addressed catalogue; retrieval by where it sits, never by judgment. |
| `activation-retrieval.js` | Kahanamoku (alias **Duke**) | The archon of the surf — read the water, then ride the wave that is actually there. Owns the whole surf: the frozen lexical surfer the doorway reads through, the doorway's `surfTask`/`contextForTask`, named activation (`activation-retrieval.js`), and the shadow/echo recall (`field-of-record.js`). |
| `organs/asserted.js` | Dignaga | A word designates by exclusion; a verb is a hypothesis with counted support. |

====================================================================
SOURCE: CODING-LESSONS.md, lesson 33, lines 473-499 (verbatim)
====================================================================

## 33. The surf-and-hunt: when prompted, the system goes and gets what it needs
The arrangement (lesson 30-32) started as a passive local lookup. The key
reframe (user direction): the system must HUNT on the fly. When a framed unit
isn't in the local corpus, it searches, fetches the canonical source, extracts
the function, verifies the frame, and lands it with provenance — the mouth
writes only the irreducible residue. Proven live: the arrangement needed the
Game of Life units; a real hunt (DuckDuckGo via explore-server's /api/web/
search, then raw.githubusercontent fetch) landed a complete, canonical
GameOfLife.js holding numNeighbors (8-cell frame), updateBoard (the 2/3
willLive rules verbatim), printBoard (the O/space renderer) — a 1:1 map to
the units the arrangement had failed to draw. **The hunt is the third leg of
the essay: the field remembers (local corpus), the watchman hunts (Ranke's
injected search/fetchFace chase when the field lacks the frame), the mouth
writes the residue.**
Three rules the hunt earned:
1. Match by FRAME, never name: the local corpus's `neighbors` was a
   knowledge-graph affinity (same name, different world); the hunted
   `numNeighbors` sweeps 8 grid cells — the frame decided which was real.
2. The hunt needs a gate (P182/Ranke): search only when the local field
   genuinely lacks the framed unit; a page that cites nothing licenses no
   hunt (the Dracula gate).
3. Provenance rides every hunted unit: the byte address of the fetched
   source, disclosed on the EOT — a hunted unit is a cited thing, never a
   free-floating implementation.
**Falsifying control:** an arrangement that hunts a unit, fetches it, and the
fetched code fails the frame check (a "game of life" page that isn't) must
refuse it and disclose — never splice a wrong-world function in.

====================================================================
SOURCE: CODING-LESSONS.md, lesson 34, lines 501-518 (verbatim)
====================================================================

## 34. The hunt is wired; its two limits are named (not hidden)
The surf-and-hunt (lesson 33) is now built into the arrangement's build loop:
corpus-autofill by frame → WEB HUNT (search the unit's frame, fetch the top
raw source, extract the framed function, verify, land with provenance) →
mouth for the irreducible residue. The hunted GameOfLife.js yields
numNeighbors / updateBoard / printBoard, each frame-matched. Two limits,
named from live runs:
1. The hunt prefers RAW SOURCE (githubusercontent, .js, gist), not tutorial
   pages — a GeeksforGeeks inline-HTML result extracts nothing, so the query
   must name the frame AND prefer raw paths; extraction must handle inline
   scripts too (snipAny: bare decl OR const arrow OR object method).
2. A hunted function is only as good as its frame check — a "game of life"
   result that isn't (wrong world, same name) must be refused and disclosed,
   never spliced. The mouth remains the honest fallback for units the hunt
   cannot frame-match.
**Falsifying control:** an arrangement that lands a hunted unit whose frame
fails (e.g. an affinity-neighbors into a grid) is a museum, not an
arrangement — the EOT must disclose the refusal.

====================================================================
SOURCE: CODING-LESSONS.md, lesson 71, lines 1730-1752 (verbatim)
====================================================================

## 71. Closed grammar may be listed; open content must be induced — and the ruler is not the shape (2026-09-22)

The user: "we dont want a set of shapes pre-set." A table mapping genre
nouns to fields (`FIELD_BY_NOUN`) can never be complete, and a bigger table
is the same mistake. But three small lists survived the objection, and the
distinction is worth stating:

- the anaphoric cues ("again", "another one", "the same", "like before")
  are closed English grammar — a referent INTO the conversation, resolved
  off this engine's own ledger, never a genre;
- the units of measure (line, stanza, paragraph, word, page …) are the
  RULER; the shape is what the ruler reads across sources, and it counts
  only when more fetched hosts than not state it — the majority rule the
  subject anchor already lives by, not a new threshold;
- the form's NAME is what a majority of page titles call it: the garbled
  ask "rite @ whiteppr", searched with its own context, surfed to five pages
  titled "white paper" and named itself from them.

Grammar (closed, small, listable) versus content (open, must be induced or
looked up) is the same line kind-induction.js draws. Measured on the live
surf: sonnet 14 lines on 4/4 hosts; haiku 3 lines and 17 syllables (and 5,
a part); "5 paragraphs" for an essay on exactly 4 of 8 hosts — half is not
more than not, and the stage said "no agreed shape" instead of rounding up.

====================================================================
SOURCE: CODING-LESSONS.md, lesson 72, lines 1754-1765 (verbatim)
====================================================================

## 72. Context resolves what the token cannot, and fixtures cannot find what only the live web shows (2026-09-22)

Searched alone, "whiteppr" returns slang noise; searched as "what is a
whiteppr", DuckDuckGo's own tolerance resolves it to the white paper. So
every SURF query carries the ask's surrounding words — the token never goes
out by itself. And the first live end-to-end run found what six fixture
suites could not: the material hunt's six pages about the Cumberland never
reached the hunt, because a URL both hunts found kept only the first hunt's
label and one fetch budget was spent on exemplar pages before any material
page. A fixture web returns what you told it to; only the real one shares
URLs across queries. Fixed, pinned with the live case's shape, and the next
live run is owed before the fix is believed.
