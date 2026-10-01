// ═══ LOVELACE · TEACH IT TO FISH ═══ FIND A REAL SAMPLE — Cultivating goes and gets bytes, Tracing checks what is shown against them.
//   node native/the-fold/find-samples.mjs --need "air quality, hourly pm2.5, for a latitude and longitude" --out <dir> [--need-count 2] [--budget 8]
// The crossing half (search, fetch, the seen-ledger); the stances are native/organs/cultivating.js and tracing.js, both domain-blind.
// What it does, in order, every step on the append-only ledger: search the open web for the need; read the pages that come back and collect the
// addresses they show that could be an API call; rank those by how many of the need's own words they share; fetch them in that order under a declared
// budget; keep a response only if it is JSON with real numbers in it whose keys or address speak the need; keep the bytes content-addressed;
// then trace the SAMPLE SHOWN to a reader (a trimmed copy of what was kept) back to those bytes — and run the controls: the sample redealt across its own
// addresses and an invented one must both be refused, or the whole run is marked unlicensed.
// What it does NOT do: it never writes a sample. If nothing is kept, the result is `unsettled` with every loser named, and the run shows nothing.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { cultivate, licensedCheck } from "../organs/cultivating.js";
import { traceSample, licensed, leavesOf, redeal } from "../organs/tracing.js";
import { parseSearchResults, extractUrls, WEB_UA } from "../organs/web.js";
import { tokenize } from "../organs/source.js";
import { makeFetcher, openSeenLedger } from "./comp-research.mjs";

/** a response worth keeping as a sample: JSON, real numbers in it, and the need's own words in its keys or its address */
export function sampleCheck(needWords, minLeaves = 6, minNumbers = 3) {
  return async (bytes, cand) => {
    let doc; try { doc = JSON.parse(bytes); } catch { return { ok: false, why: "not JSON" }; }
    const leaves = leavesOf(doc), nums = leaves.filter((l) => typeof l.value === "number").length;
    if (leaves.length < minLeaves) return { ok: false, why: `only ${leaves.length} leaves (need ${minLeaves})` };
    if (nums < minNumbers) return { ok: false, why: `only ${nums} numeric leaves (need ${minNumbers})` };
    const hay = (leaves.map((l) => l.path).join(" ") + " " + (cand?.url ?? "")).toLowerCase(), hit = needWords.filter((w) => hay.includes(w));
    if (!hit.length) return { ok: false, why: "no word of the need appears in its keys or its address" };
    return { ok: true, evidence: { leaves: leaves.length, numbers: nums, needWordsFound: hit } };
  };
}
const concrete = (u) => !/[{}<>]|YOUR[_-]?(API)?[_-]?KEY|API[_-]?KEY|your_?key|example\.com|localhost/i.test(u) && /^https:\/\//.test(u);
const looksLikeCall = (u) => /\/(api|v\d)\b|api[.-]|\.json(\?|$)|[?&][a-z_]+=/i.test(u) && !/\.(png|jpe?g|gif|svg|css|js|ico|woff2?)(\?|$)/i.test(u);

/** the shown sample: a kept document with long arrays cut to `n` items — a view of real bytes, never a rewrite */
export function trimmed(doc, n = 2) { if (Array.isArray(doc)) return doc.slice(0, n).map((x) => trimmed(x, n)); if (doc && typeof doc === "object") return Object.fromEntries(Object.entries(doc).map(([k, v]) => [k, trimmed(v, n)])); return doc; }

export async function findSamples({ need, queries, out, needCount = 2, budget = 8, maxPages = 6, fetcher = makeFetcher(), searcher = makeFetcher({ ua: WEB_UA }), log = () => {} } = {}) {
  const L = openSeenLedger(out), needWords = [...new Set(tokenize(need).filter((w) => w.length >= 3))];
  const qs = queries ?? [`${need} free API JSON no key`, `${need} API example response`];
  L.see("find-begin", { need, queries: qs, needWords, declared: { needCount, budget, maxPages } });
  const pages = [], urls = new Map();
  for (const q of qs) {
    const r = await searcher(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}`, { accept: "text/html" });
    if (!r.ok) { L.see("search-failed", { q, status: r.status, why: r.refused ?? r.error ?? "" }); continue; }
    const parsed = parseSearchResults(r.text);
    if (parsed.blocked || !parsed.results.length) { L.see("search-blocked", { q, why: parsed.blocked ? "anomaly page" : "no results parsed", bytes: r.bytes }); continue; }
    L.see("search", { q, results: parsed.results.map((x) => ({ title: x.title, url: x.url })) });
    for (const x of parsed.results) { if (pages.length < maxPages && !pages.some((p) => p.url === x.url)) pages.push(x); for (const u of extractUrls(`${x.title} ${x.snippet ?? ""}`)) urls.set(u, x.url); }
  }
  for (const p of pages) {
    const r = await fetcher(p.url, { accept: "text/html,*/*" });
    L.see("page", { url: p.url, status: r.status, bytes: r.bytes ?? 0, why: r.refused ?? null });
    if (!r.ok) continue;
    for (const u of extractUrls(r.text.replace(/&amp;/g, "&"))) if (!urls.has(u)) urls.set(u, p.url);
  }
  const score = (u) => needWords.filter((w) => u.toLowerCase().includes(w)).length;
  const ranked = [...urls.keys()].filter((u) => concrete(u) && looksLikeCall(u)).sort((a, b) => score(b) - score(a)).filter((u, i, a) => a.indexOf(u) === i);
  L.see("candidates", { total: urls.size, concrete: ranked.length, top: ranked.slice(0, 20).map((u) => ({ url: u, score: score(u), shownOn: urls.get(u) })) });
  const check = sampleCheck(needWords);
  const candidates = ranked.map((u) => ({ id: u, url: u, get: async () => { const r = await fetcher(u, { accept: "application/json,*/*" }); L.see("fetch", { url: u, status: r.status, bytes: r.bytes ?? 0, contentType: r.contentType ?? "", why: r.refused ?? null }); if (!r.ok) throw new Error(`status ${r.status} ${r.refused ?? ""}`); return r.text; } }));
  const got = await cultivate({ candidates, check, need: needCount, budget });
  fs.mkdirSync(path.join(out, "samples"), { recursive: true });
  const kept = got.kept.map((k) => { const sha = crypto.createHash("sha256").update(k.bytes).digest("hex"), file = path.join("samples", `${sha.slice(0, 12)}.json`); fs.writeFileSync(path.join(out, file), k.bytes); L.see("kept", { url: k.id, sha256: sha, file, evidence: k.evidence }); return { url: k.id, sha256: sha, file, evidence: k.evidence }; });
  for (const l of got.losers) L.see("loser", { url: l.id, why: l.why });
  let trace = null;
  if (got.kept.length) {
    const ground = got.kept.map((k) => ({ id: k.id, bytes: k.bytes })), shown = trimmed(JSON.parse(got.kept[0].bytes));
    const real = traceSample(shown, ground), lic = licensed(shown, ground), dealt = traceSample(redeal(shown, 7), ground);
    trace = { shownFrom: got.kept[0].id, shown, real: real.verdict, redealt: dealt.verdict, licensed: lic.licensed };
    L.see("trace", { shownFrom: trace.shownFrom, real: real.verdict, redealt: dealt.verdict, licensed: lic.licensed });
  }
  const checkLicence = got.kept.length ? await licensedCheck(check, got.kept[0].bytes) : null;
  L.see("find-end", { status: got.status, kept: kept.length, spent: got.spent, checkLicensed: checkLicence?.licensed ?? null });
  return { status: got.status, kept, losers: got.losers, spent: got.spent, trace, checkLicence, ledger: L.file };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
  const r = await findSamples({ need: arg("need"), out: path.resolve(arg("out", "./find-samples-out")), needCount: Number(arg("need-count", 2)), budget: Number(arg("budget", 8)) });
  console.log(JSON.stringify({ status: r.status, kept: r.kept.map((k) => ({ url: k.url, ...k.evidence })), spent: r.spent, losers: r.losers.length, trace: r.trace && { shownFrom: r.trace.shownFrom, real: r.trace.real, redealt: r.trace.redealt, licensed: r.trace.licensed }, checkLicensed: r.checkLicence?.licensed, ledger: r.ledger }, null, 1));
}
