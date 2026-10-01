// ═══ ONE SEARCH WITH PATIENCE — the crossing half of organs/web.js::searchRequest ═══
// DuckDuckGo answers a burst from one address with its bot-challenge page whatever face is asked (measured 2026-10-01: lite-by-POST returned ten results, then three searches seconds
// later all came back 202 "anomaly"). So a search is: each face in order; if every face was challenged, wait (declared, once) and go round again; then say what happened. The caller gets
// the parsed results or a typed gap — never an empty list that reads as "the web had nothing".
import { parseSearchResults, searchRequest, SEARCH_FACES } from "../organs/web.js";

/** the wait before the one second round, ms: set by hand 2026-10-01 after a challenge that had cleared 25s later (find-samples) — not measured against a rate limit */
export const SEARCH_PATIENCE_MS = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** searchWeb(fetcher, query, { see }) -> { results, tries:[{face, status, blocked, found}] , gap? } ; `fetcher` is a makeFetcher() (url, { method, body, headers, accept }) */
export async function searchWeb(fetcher, query, { see = () => {}, patienceMs = SEARCH_PATIENCE_MS, rounds = 2 } = {}) {
  const tries = [];
  for (let round = 0; round < rounds; round++) {
    for (const face of SEARCH_FACES) {
      const sreq = searchRequest(query, face);
      const r = await fetcher(sreq.url, { accept: "text/html", method: sreq.init.method, body: sreq.init.body, headers: sreq.init.headers });
      const p = r.ok ? parseSearchResults(r.text) : { results: [], blocked: false };
      const row = { face, round, status: r.status, blocked: !!p.blocked, found: p.results.length, refused: r.refused ?? null };
      tries.push(row); see("search-try", { query, ...row });
      if (!p.blocked && p.results.length) return { results: p.results, tries };
    }
    if (round + 1 < rounds) { see("search-backoff", { query, waitMs: patienceMs, why: "every face answered with a challenge or nothing" }); await sleep(patienceMs); }
  }
  return { results: [], tries, gap: { type: tries.every((t) => t.refused) ? "unreachable" : tries.some((t) => t.blocked) ? "challenged" : "no_results", detail: `${tries.length} tries over ${rounds} round(s) found no results for "${query}"` } };
}
