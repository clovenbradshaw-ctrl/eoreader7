// parameter-induction.js — LEARN A NAMED PARAMETER'S REAL VALUE, NEVER
// HAND-SET IT (2026-09-26).
//
// The user, direct correction: a words-per-page conversion hard-coded as a
// literary constant was named exactly the kind of "table [that] says a
// sonnet has fourteen lines" this project already refuses (shape.js's own
// header: "we dont want a set of shapes pre-set"). A first fix wrote a
// bespoke learnWordsPerPage function to search and corroborate that one
// number — the user then named THAT too specialized in turn: "it's more
// like a 'parameterInduction' organ we need." This file is the general
// organ. words-per-page is one caller's use of it, not something this file
// knows about.
//
// NOT kernel/kind-induction.js — that induces a CATEGORY (Kanada's atomism:
// a kind from what several instances share). This organ induces a single
// NUMBER (or other simple value) for a parameter asked about directly, by
// real corroborated search — closer in spirit to shape.js's own "the surfed
// sources say it, or nothing does," generalized past literary-form shapes
// to any stated real-world convention a stage needs and does not already
// carry or derive from the material at hand.
//
// Two tiers, cheapest first:
//   MEMORY   a past search already corroborated this parameter (>= floor
//            distinct sources) — recall it, no network call at all. "The
//            second [lookup] costs a lookup" (kind-memory.js's own rule for
//            whole paradigms, applied here to a single measured value).
//   SEARCH   nothing remembered: surf real sources (search/fetch injected,
//            same convention as surf.js/void-spec.js's own real-search
//            callers — liveWeb() at the CLI, a fixture in tests), extract a
//            candidate value from each fetched host via the CALLER's own
//            extractClaim (this organ has no opinion on what a claim for
//            any given parameter looks like — that is domain knowledge the
//            caller supplies), and only remember/return a value once at
//            least `corroborationFloor` (default 2) DISTINCT HOSTS each
//            yielded one — median across them. One source is one witness,
//            never corroboration, exactly the floor kind-memory.js's own
//            CON operator already holds. Refuses to guess (induced:false)
//            when corroboration fails, when no query/web access is
//            supplied, or when the search itself fails.
//
// One JSON store (native/memory/parameter-memory.json) holds every
// parameter this organ has ever corroborated, keyed by name.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hostOf } from "../organs/web.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PARAMETER_MEMORY_PATH = path.join(HERE, "..", "memory", "parameter-memory.json");
export const PARAMETER_MEMORY_SCHEMA = "EOParameterMemory@1";

function loadParameterMemory(p) {
  try { const s = JSON.parse(fs.readFileSync(p, "utf8")); return s?.schema === PARAMETER_MEMORY_SCHEMA ? s : { schema: PARAMETER_MEMORY_SCHEMA, parameters: {} }; }
  catch { return { schema: PARAMETER_MEMORY_SCHEMA, parameters: {} }; }
}
function saveParameterMemory(store, p) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(store, null, 2)}\n`);
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

/**
 * induceParameter(name, { query, extractClaim, search, fetch, memoryPath, corroborationFloor, maxHosts })
 *   -> { induced, value, basis, sources, fromMemory }
 *
 * name           the parameter's own key in memory ("words-per-page", …) —
 *                this organ attaches no meaning to it beyond a lookup key.
 * query          the search query to run when nothing is remembered.
 * extractClaim   (fetchedText) -> a candidate numeric value | null — the
 *                caller's own domain knowledge of what a real claim for
 *                THIS parameter looks like; this organ never invents one.
 * search/fetch   injected, exactly like every other real-search caller in
 *                this codebase (liveWeb() at the CLI, a fixture in tests).
 * corroborationFloor  distinct hosts required to agree before a value is
 *                remembered or returned (default 2).
 */
export async function induceParameter(name, { query = null, extractClaim = null, search = null, fetch = null, memoryPath = PARAMETER_MEMORY_PATH, corroborationFloor = 2, maxHosts = 5 } = {}) {
  if (typeof extractClaim !== "function") throw new TypeError(`induceParameter: extractClaim is required for "${name}" — this organ has no domain knowledge of its own about what a claim for this parameter looks like`);
  const store = loadParameterMemory(memoryPath);
  const remembered = store.parameters?.[name];
  if (remembered?.sources?.length >= corroborationFloor) {
    return { induced: true, value: remembered.value, fromMemory: true, sources: remembered.sources, basis: `remembered from a past search: ${remembered.sources.length} distinct source(s) (${remembered.sources.map((s) => s.host).join(", ")}), median ${remembered.value}` };
  }
  if (typeof search !== "function" || typeof fetch !== "function") {
    return { induced: false, value: null, basis: `no web access supplied and nothing remembered for "${name}" — refusing to guess` };
  }
  if (!query) return { induced: false, value: null, basis: `no query supplied for "${name}" and nothing remembered — refusing to guess` };
  let results = [];
  try {
    const r = await search(query);
    results = (r?.results ?? []).filter((x) => x?.url);
  } catch (e) {
    return { induced: false, value: null, basis: `search failed (${String(e?.message ?? e).slice(0, 120)}) and nothing remembered for "${name}" — refusing to guess` };
  }
  const byHost = [];
  const seenHosts = new Set();
  for (const r of results) {
    const host = hostOf(r.url);
    if (!host || seenHosts.has(host)) continue;
    seenHosts.add(host);
    byHost.push({ host, url: r.url });
    if (byHost.length >= maxHosts) break;
  }
  const perHost = [];
  for (const { host, url } of byHost) {
    let page;
    try { page = await fetch(url); } catch { continue; }
    const claim = extractClaim(`${page?.title ?? ""} ${page?.text ?? ""}`);
    if (claim != null) perHost.push({ host, url, value: claim });
  }
  if (perHost.length < corroborationFloor) {
    return { induced: false, value: null, checked: byHost.length, corroborated: perHost.length, basis: `${perHost.length} of ${byHost.length} fetched host(s) stated a claim for "${name}" — fewer than the required ${corroborationFloor}, so nothing is corroborated; refusing to guess` };
  }
  const value = Math.round(median(perHost.map((p) => p.value)));
  const sources = perHost.map((p) => ({ host: p.host, url: p.url, value: p.value }));
  store.parameters = store.parameters ?? {};
  store.parameters[name] = { value, sources, learnedAt: Date.now() };
  try { saveParameterMemory(store, memoryPath); } catch { /* memory is a convenience, never load-bearing for the value just measured */ }
  return { induced: true, value, fromMemory: false, sources, basis: `measured this run: ${perHost.length} distinct source(s) (${sources.map((s) => `${s.host}: ${s.value}`).join("; ")}), median ${value}` };
}

/** One example extractClaim, for callers who need words-per-page — ordinary
 *  caller-supplied domain knowledge, not special-cased inside
 *  induceParameter itself. Matches "N words on/per a page", bounded to a
 *  plausible range (100-1000) so a page NUMBER or an unrelated count cannot
 *  pass as a claim. */
export function wordsPerPageClaim(text) {
  const m = String(text ?? "").match(/(\d{2,4})\s*words?\b[^.]{0,40}?\bpage\b|\bpage\b[^.]{0,40}?(\d{2,4})\s*words?\b/i);
  if (!m) return null;
  const n = Number(m[1] ?? m[2]);
  return Number.isFinite(n) && n >= 100 && n <= 1000 ? n : null;
}
