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

/** The queries, from the void alone. Each carries context; the templates are
 *  declared (a starting point, stated as such), not measured. */
export function surfQueries(spec) {
  const token = spec?.form?.token ?? null;
  const topic = spec?.topic ?? null;
  const cue = spec?.form?.cue ?? null;
  const out = [];
  if (token) {
    // The form, as a thing with instances: what one is, and several of them.
    out.push({ hunt: "exemplars", q: `what is ${/^[aeiou]/i.test(token) ? "an" : "a"} ${token}${topic ? ` about ${topic}` : ""}`, basis: "the form-word with the ask's own subject as context" });
    out.push({ hunt: "exemplars", q: `${token} examples full text`, basis: "the form-word, asking for instances rather than a definition" });
  }
  if (topic) out.push({ hunt: "material", q: topic, basis: "the ask's subject phrase, verbatim" });
  if (!out.length) out.push({ hunt: "none", q: null, basis: cue ? `an anaphor ("${cue}") with no form-word and no subject: nothing to seek outside this conversation` : "the ask names no form and no subject" });
  return out;
}

/**
 * surf({ spec, search, fetch, perQuery, maxSources }) → EOSurf@1
 *   search(q) → { blocked, offEndpoint, results:[{title,url,snippet}] } | throws
 *   fetch(url) → { text, title, chars } | throws
 * Candidates are distinct by URL and drawn across hosts first (one per host
 * before a second from any), so "multiple sources" is a property of the
 * product, not a hope.
 */
export async function surf({ spec, search, fetch, perQuery = 6, maxSources = 6, queries = null } = {}) {
  queries = queries ?? surfQueries(spec);
  const runs = [];
  const candidates = [];
  const seen = new Set();
  for (const query of queries) {
    if (!query.q) { runs.push({ ...query, status: "not run", results: 0, hosts: [] }); continue; }
    let res;
    try { res = await search(query.q); }
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
    try {
      const page = await fetch(c.url);
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
    basis: !reached
      ? `the web was not reached: ${runs.map((r) => `${r.hunt}: ${r.status}`).join("; ")} — a failed search, not an empty one`
      : `${runs.length} quer${runs.length === 1 ? "y" : "ies"} (${runs.map((r) => `${r.hunt}: ${r.status}, ${r.results}`).join("; ")}); ${candidates.length} distinct candidate(s); ${fetched.length} fetched from ${hostsFetched.length} host(s)${hostsFetched.length < 2 ? " — NOT multiple sources" : ""}`,
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
