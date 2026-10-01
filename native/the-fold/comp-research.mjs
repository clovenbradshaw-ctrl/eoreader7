// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
// STEERED BUILD: a person hand-built this so the system could do what the prompt asked. It is ledger row 2 in
// TEACH-IT-TO-FISH.md, not the goal. Close the row (the prompt alone produces this); do not add more of it.
// comp-research.mjs — the CROSSING half of finding a real comp on the open web
// (the pure half is native/organs/comp-research.js; read its header for what
// the ledger is and is not for).
//
// What it does, in order, and what it writes down at each step. Everything it
// comes across is appended to <dir>/seen.jsonl, one line per event, in the
// order it happened — a search and its results, each page visited (or refused,
// and why), each image considered (fetched, hashed, kept or dropped, and why),
// each triage reading. The ledger is append-only and is the audit trail: a
// reader can walk it from the question to the chosen comp, and the generated
// artifact is diffed against it (likenessOf).
//
//   search      DuckDuckGo's no-key HTML face, parsed by web.js::parseSearchResults
//               (a bot challenge is a typed refusal, never "the web had nothing")
//   choose      pages whose title/snippet share a content word with the need, at
//               most MAX_PER_HOST per host, at most maxPages in all — the rejects
//               are recorded with their reason too
//   visit       robots.txt read once per host and obeyed (recorded either way); the
//               page fetched politely (one request per host per MIN_GAP_MS), its
//               title, its stated license, its image candidates recorded
//   images      the best candidates by relevance to the need; each fetched, bytes
//               hashed (sha256), size and perceptual hash measured, and kept only
//               if screen-shaped
//   triage      comp-detect.py --light on each kept image: rectangles, words,
//               lines carrying a digit -> a UI-likeness score (counts, no meaning)
//
// The crossing is injectable (fetch, sleep, the python runner) so the whole
// walk runs offline in comp-research.test.mjs against captured fixtures.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractReadable, hostOf, looksLikeChallenge } from "../organs/web.js";
import { searchWeb } from "./search-web.mjs";
import { tokenize } from "../organs/source.js";
import { imageCandidates, linksOf, relevance, licenseSignals, robotsAllows, screenShaped, uiLikeness } from "../organs/comp-research.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ADAPTERS = path.join(HERE, "..", "adapters", "image");

export const RESEARCH_UA = "Mozilla/5.0 (compatible; eoreader7-comp-research/0.1; auditable, polite, obeys robots.txt)";
/** Pages one host may contribute — one result per site per pass keeps the survey from being one site's gallery. Set by hand 2026-09-30. */
export const MAX_PER_HOST = 2;
/** The least time between two requests to one host, in ms. Commons answered a burst of eight with 429 on 2026-09-30; two seconds did not. */
export const MIN_GAP_MS = 2500;
/** Largest response read, in bytes: a page is not a crawl, an image is not a video. */
export const MAX_BYTES = 6_000_000;
export const FETCH_TIMEOUT_MS = 25_000;

/** The same SITE: one registrable domain (search.f-droid.org and f-droid.org are one site; a link off to a tracker is not). */
const siteOf = (host) => String(host ?? "").split(".").slice(-2).join(".");
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

/** The ledger: append-only JSONL, each line { seq, at, event, ...fields }. */
export function openSeenLedger(dir, { now = () => new Date().toISOString() } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "seen.jsonl");
  let seq = 0;
  try { seq = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).length; } catch { /* a new ledger */ }
  return {
    file, dir,
    see(event, fields = {}) {
      const line = { seq: seq++, at: now(), event, ...fields };
      fs.appendFileSync(file, JSON.stringify(line) + "\n");
      return line;
    },
    read() { try { return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } },
  };
}

/** A polite fetcher: one request per host per MIN_GAP_MS, bounded body, typed failures — never a throw for a network fact. */
export function makeFetcher({ fetchImpl = globalThis.fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), minGapMs = MIN_GAP_MS, ua = RESEARCH_UA } = {}) {
  const last = new Map();
  return async function politeFetch(url, { binary = false, accept = "*/*", maxBytes = MAX_BYTES, method = "GET", body = undefined, headers = {} } = {}) {
    const host = hostOf(url) ?? "";
    const wait = (last.get(host) ?? 0) + minGapMs - Date.now();
    if (wait > 0) await sleep(wait);
    last.set(host, Date.now());
    try {
      const r = await fetchImpl(url, { method, body, headers: { "user-agent": ua, accept, ...headers }, redirect: "follow", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      const ab = await r.arrayBuffer();
      const buf = Buffer.from(ab);
      if (buf.length > maxBytes) return { ok: false, status: r.status, refused: "too_large", bytes: buf.length, finalUrl: r.url ?? url };
      return { ok: r.ok, status: r.status, contentType: r.headers.get("content-type") ?? "", finalUrl: r.url ?? url, bytes: buf.length, buf, text: binary ? null : buf.toString("utf8") };
    } catch (e) {
      return { ok: false, status: 0, refused: "network", error: String(e?.cause?.code ?? e?.message ?? e).slice(0, 120) };
    }
  };
}

const pyJson = (python, script, args, run = execFileSync) => JSON.parse(run(python, [script, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 180000 }));

/**
 * researchComps({ need, queries, dir, … }) → { candidates:[{id,url,page,…,score}], ledger }
 *   need      one sentence of what the comp must show ("a weather app screen: current conditions and a forecast")
 *   queries   search strings (the driver derives them from the task; this function does not guess)
 */
export async function researchComps({ need, queries = [], seeds = [], dir, python = process.env.VISUAL_DETECT_PYTHON, maxResultsPerQuery = 8, maxPages = 6, perHost = MAX_PER_HOST, maxImages = 10, keepTop = 3, fetcher = makeFetcher(), run = execFileSync, log = () => {} }) {
  if (!python) throw new Error("researchComps: VISUAL_DETECT_PYTHON is unset — the image measurements refuse rather than return an empty, falsely clean read");
  const L = openSeenLedger(dir);
  const robots = new Map();
  const needWords = tokenize(need);
  L.see("research-begin", { schema: "EOCompResearch@1", need, queries, seeds, needWords, ua: RESEARCH_UA, declared: { maxResultsPerQuery, maxPages, maxImages, perHost, MIN_GAP_MS, MAX_BYTES } });

  // ── search ──────────────────────────────────────────────────────────────
  const results = [];
  for (const q of queries) {
    const s = await searchWeb(fetcher, q, { see: (e, x) => L.see(e, x) });
    const p = { results: s.results, blocked: s.gap?.type === "challenged" };
    L.see("search", { query: q, engine: "duckduckgo (lite POST, then the GET faces)", tries: s.tries.length, blocked: !!p.blocked, gap: s.gap?.type ?? null, found: p.results.length });
    p.results.slice(0, maxResultsPerQuery).forEach((x, i) => {
      const rel = relevance({ url: x.url, alt: x.title, title: "", context: x.snippet }, need);
      results.push({ ...x, rank: i + 1, query: q, relevance: rel.score, hits: rel.hits });
      L.see("result", { query: q, rank: i + 1, url: x.url, host: hostOf(x.url), title: x.title, snippet: x.snippet.slice(0, 200), relevance: +rel.score.toFixed(3), hits: rel.hits });
    });
  }

  // ── explore the seeds: a category, a directory or a search-results page is read, and its links are the results ──
  // A seed is a site's own index — exploring it is how a site is "researched" when a search engine declines the address.
  // Every seed names WHY it is a seed; the ledger carries that sentence, so a reader can see where the exploration began.
  for (const sd of seeds) {
    const r = await fetcher(sd.url, { accept: "text/html" });
    if (!r.ok) { L.see("seed", { url: sd.url, why: sd.why ?? null, status: r.status, refused: r.refused ?? `http ${r.status}` }); continue; }
    const links = linksOf(r.text, r.finalUrl || sd.url).filter((l) => siteOf(hostOf(l.url)) === siteOf(hostOf(sd.url)) && l.url !== sd.url);
    L.see("seed", { url: sd.url, why: sd.why ?? null, status: r.status, bytes: r.bytes, sha256: sha256(r.buf), links: links.length });
    links.forEach((l, i) => {
      const rel = relevance({ url: l.url, alt: l.text, title: "", context: "" }, need);
      results.push({ title: l.text, url: l.url, snippet: "", rank: i + 1, query: `seed:${sd.url}`, relevance: rel.score, hits: rel.hits });
    });
  }

  // ── choose the pages to visit ───────────────────────────────────────────
  const perHost_ = new Map(), chosen = [];
  for (const x of [...results].sort((a, b) => b.relevance - a.relevance || a.rank - b.rank)) {
    const host = hostOf(x.url) ?? "";
    let why = null;
    if (x.relevance <= 0) why = "no word of the need in the title or snippet";
    else if ((perHost_.get(host) ?? 0) >= perHost) why = `host already contributed ${perHost}`;
    else if (chosen.length >= maxPages) why = `page budget ${maxPages} spent`;
    else if (chosen.some((c) => c.url === x.url)) why = "already chosen";
    if (why) { L.see("skip-page", { url: x.url, reason: why }); continue; }
    perHost_.set(host, (perHost_.get(host) ?? 0) + 1);
    chosen.push(x);
    L.see("choose-page", { url: x.url, host, relevance: +x.relevance.toFixed(3), hits: x.hits });
  }

  // ── visit ───────────────────────────────────────────────────────────────
  const offers = [];
  for (const pg of chosen) {
    const u = new URL(pg.url);
    if (!robots.has(u.host)) {
      const rr = await fetcher(`${u.protocol}//${u.host}/robots.txt`, { accept: "text/plain", maxBytes: 500_000 });
      robots.set(u.host, rr.ok && rr.text && !rr.text.trimStart().startsWith("<") ? rr.text : "");
      L.see("robots", { host: u.host, status: rr.status, bytes: rr.bytes ?? 0, sha256: rr.buf ? sha256(rr.buf) : null });
    }
    const ok = robotsAllows(robots.get(u.host), u.pathname + u.search, "eoreader7");
    if (!ok.allowed) { L.see("visit", { url: pg.url, refused: "robots", rule: ok.rule }); continue; }
    const r = await fetcher(pg.url, { accept: "text/html" });
    if (!r.ok) { L.see("visit", { url: pg.url, status: r.status, refused: r.refused ?? `http ${r.status}`, error: r.error ?? null }); continue; }
    const html = r.text;
    const readable = extractReadable(html);
    const title = readable?.title ?? pg.title;
    const textChars = (readable?.text ?? "").length;
    if (looksLikeChallenge({ title, textChars })) { L.see("visit", { url: pg.url, status: r.status, refused: "challenge", title }); continue; }
    const lic = licenseSignals(`${readable?.text ?? ""}\n${html.slice(0, 6000)}`);
    const imgs = imageCandidates(html, r.finalUrl || pg.url);
    L.see("visit", { url: pg.url, finalUrl: r.finalUrl, status: r.status, contentType: r.contentType, bytes: r.bytes, sha256: sha256(r.buf), title, textChars, license: lic, images: imgs.length });
    const textOf = (html0, at) => { const s = html0.slice(Math.max(0, at - 400), at + 400); return (extractReadable(`<body>${s}</body>`)?.text ?? s).slice(0, 300); };
    for (const im of imgs) offers.push({ ...im, page: pg.url, pageTitle: title, license: lic, context: `${title} ${textOf(html, im.at ?? 0)}` });
  }

  // ── images: best candidates by relevance; fetch, hash, size, keep if screen-shaped ──
  const ranked = offers.map((o) => ({ ...o, rel: relevance(o, need) })).sort((a, b) => b.rel.score - a.rel.score || (b.width ?? 0) - (a.width ?? 0));
  const imgDir = path.join(dir, "images");
  fs.mkdirSync(imgDir, { recursive: true });
  const kept = [];
  for (const o of ranked) {
    if (kept.length + 0 >= maxImages) { L.see("skip-image", { url: o.url, reason: `image budget ${maxImages} spent` }); continue; }
    if (o.rel.score <= 0) { L.see("skip-image", { url: o.url, reason: "no word of the need in its url, alt, title or context", page: o.page }); continue; }
    if (kept.some((k) => k.url === o.url)) continue;
    const r = await fetcher(o.url, { binary: true, accept: "image/*" });
    if (!r.ok) { L.see("image", { url: o.url, page: o.page, status: r.status, refused: r.refused ?? `http ${r.status}`, kept: false }); continue; }
    const sha = sha256(r.buf);
    const raw = path.join(imgDir, `${sha.slice(0, 16)}.raw`);
    fs.writeFileSync(raw, r.buf);
    let fp = null;
    try { fp = pyJson(python, path.join(ADAPTERS, "image-fingerprint.py"), [raw, "--png", path.join(imgDir, `${sha.slice(0, 16)}.png`), "--max-side", "1400"], run); }
    catch (e) { L.see("image", { url: o.url, page: o.page, sha256: sha, bytes: r.bytes, kept: false, refused: "undecodable", error: String(e.message).slice(0, 120) }); continue; }
    const shape = screenShaped(fp.width, fp.height);
    L.see("image", { url: o.url, page: o.page, sha256: sha, bytes: r.bytes, contentType: r.contentType, width: fp.width, height: fp.height, dhash: fp.dhash, alt: (o.alt ?? "").slice(0, 120), relevance: +o.rel.score.toFixed(3), hits: o.rel.hits, license: o.license, kept: shape.ok, reason: shape.reason });
    if (shape.ok) kept.push({ ...o, sha256: sha, file: fp.png, width: fp.width, height: fp.height, dhash: fp.dhash, lum9x8: fp.lum9x8 });
  }

  // ── triage: measure each kept image (light pass), score how UI-like it is ──
  const candidates = [];
  for (const k of kept) {
    let m = null;
    try { m = pyJson(python, path.join(ADAPTERS, "comp-detect.py"), [k.file, "--light"], run); }
    catch (e) { L.see("triage", { url: k.url, sha256: k.sha256, refused: "measure failed", error: String(e.message).slice(0, 120) }); continue; }
    const ui = uiLikeness(m);
    const score = +(0.5 * k.rel.score + 0.5 * ui.score).toFixed(4);
    L.see("triage", { url: k.url, sha256: k.sha256, rects: ui.rects, words: ui.words, valueWords: ui.valueWords, textShare: ui.textShare, ui: +ui.score.toFixed(3), relevance: +k.rel.score.toFixed(3), score });
    candidates.push({ id: k.sha256.slice(0, 12), url: k.url, page: k.page, pageTitle: k.pageTitle, file: k.file, sha256: k.sha256, width: k.width, height: k.height, dhash: k.dhash, lum9x8: k.lum9x8, license: k.license, alt: k.alt, words: m.words.map((w) => w.text), ui, relevance: k.rel.score, score });
  }
  candidates.sort((a, b) => b.score - a.score);
  L.see("research-end", { candidates: candidates.length, top: candidates.slice(0, keepTop).map((c) => ({ id: c.id, url: c.url, score: c.score })) });
  log(`research: ${results.length} results, ${chosen.length} pages chosen, ${offers.length} images offered, ${kept.length} kept, ${candidates.length} triaged`);
  return { candidates, ledger: L.file, counts: { results: results.length, pages: chosen.length, offered: offers.length, kept: kept.length, triaged: candidates.length } };
}
