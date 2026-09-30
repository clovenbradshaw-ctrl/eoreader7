// adapters/sources/wiki-summary.js — a plain description of a named thing,
// for the engine to READ (organs/kind-read.js reasons over it): the lead of
// its encyclopedia article, from Wikipedia's REST summary endpoint, one small
// call per term. Every answer is kept on disk and never fetched again — an
// absent page, a refusal or no network are answers too (null), so a build
// never waits on the same miss twice. No regular expressions.
import fs from "node:fs";
import path from "node:path";

const titleOf = (term) => String(term ?? "").trim().split(" ").filter(Boolean).map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join("_");
const fileOf = (dir, term) => path.join(dir, `${titleOf(term).split("/").join("_") || "_"}.json`);

/** makeWikiSummary({ dir, fetch, timeoutMs }) -> async lookup(term) ->
 *  { text, url, revision, license } | null — the lead, the page it is from,
 *  the revision it was read at, and the license the text is under
 *  (Wikipedia's text is CC BY-SA 4.0), so a claim reasoned from it can say
 *  exactly where it came from. */
export function makeWikiSummary({ dir, fetch: doFetch = globalThis.fetch, timeoutMs = 8000 } = {}) {
  const memo = new Map();
  return async function lookup(term) {
    const title = titleOf(term);
    if (!title) return null;
    if (memo.has(title)) return memo.get(title);
    const answer = (kept) => (kept?.text ? { text: kept.text, url: kept.url ?? `https://en.wikipedia.org/wiki/${title}`, revision: kept.revision ?? null, license: kept.license ?? "CC-BY-SA-4.0" } : null);
    const file = dir ? fileOf(dir, term) : null;
    if (file && fs.existsSync(file)) {
      try { const got = answer(JSON.parse(fs.readFileSync(file, "utf8"))); memo.set(title, got); return got; } catch {}
    }
    let text = null, status = null, url = null, revision = null;
    try {
      const res = await doFetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { headers: { "user-agent": "eoreader7" }, signal: AbortSignal.timeout(timeoutMs) });
      status = res.status;
      if (res.ok) {
        const data = await res.json();
        text = data?.type === "disambiguation" ? null : (String(data?.extract ?? "").trim() || null);
        url = data?.content_urls?.desktop?.page ?? null;
        revision = data?.revision ?? null;
      }
    } catch (err) { status = String(err?.name ?? "error"); }
    const got = answer({ text, url, revision, license: "CC-BY-SA-4.0" });
    memo.set(title, got);
    // a transient failure (rate limit, network) is not kept, so a later build may try again
    const transient = status === 429 || (typeof status === "string");
    if (file && !transient) { try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, JSON.stringify({ term, title, fetched: new Date().toISOString(), status, text, url, revision, license: "CC-BY-SA-4.0" })); } catch {} }
    return got;
  };
}
