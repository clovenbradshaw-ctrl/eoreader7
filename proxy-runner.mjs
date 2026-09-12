import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createCausalTextPerceiver, textEncounters, surfaceIndex, surfacesIn } from "./native/adapters/text/recursive.js";
import { diaNorm, namesCorefer } from "./native/adapters/text/surfaces.js";
import { reviseTextFold } from "./native/adapters/text/revision.js";
import { createRecursiveReader } from "./native/kernel/reading.js";
import { reconstruct } from "./native/kernel/fold.js";
import { createHyperlexicon, admitHyperlexiconCandidates } from "./native/kernel/hyperlexicon.js";
import { createRelationCompositionLedger, acquireCompositionCandidates } from "./native/kernel/relation-composition.js";
import { createSession as createCorpusSession, admitChunked } from "./legacy-eoreader6.1/packages/host/corpus.js";
import { executePrompt } from "./legacy-eoreader6.1/packages/host/surfer.js";
import { postprocessAnswer, warmPostprocess, getPyodide } from "./postprocess.mjs";
// The three resolutions — brought in from the-fold (vendored at
// native/the-fold/): the discourse restated at three grains by the reading's
// own organs (atmosphere, lens, paradigm), never by a model's compression.
import { resolutionBlocks } from "./native/the-fold/resolutions.js";
import { tokenize } from "./native/the-fold/source.js";
import { logitBiasFor, logitsBiasObject } from "./native/organs/gemma2-tokenizer.mjs";
import { readingIndexFromLog } from "./native/the-fold/reading-log.js";
import { createDocumentLedger, appendDocumentObservation, appendLedgerLine, projectDocument, documentChangeLog, admitPart, serializeLedger, snipsFromSources, checkEssayShape, ledgerFilePath, renderApaFootnotes, satisfactionOfSection, satisfactionOf, declareEssayVoid, fillCheck, citationLedger, voidCellsFor, holographicSatisfaction, lavarGradeEssay, competencyGrade, lavarGradeReading, kelsenGrade, embedInlineCitations, renderLiveEssayHtml, detectRepetition, detectRedundancy } from "./native/the-fold/document-ledger.js";
import { precedence, tagClaim } from "./native/organs/regime.js";
import { goreBoundary, gatherPlan, cueGoDeeperPlan } from "./native/the-fold/gore.js";
// The keyless field (GFP Pass 35, the-fold c232779): recall by partial-cue
// resemblance, resolution by state — no absolute address. Surf's SECOND
// witness, beside the absolute-address ladder (executePrompt): when that
// ladder returns a void or nothing, the field recalls what the cue resembles.
import { Field } from "./native/the-fold/relative.js";
import { dmdWindow } from "./native/kernel/activation.js";
// Web organ: the pure half of search and page ingestion (extractReadable,
// parseSearchResults, extractUrls, normalizeUrl). The network egress lives
// inline below — the proxy is the one sanctioned crossing (P13).
import { extractReadable, parseSearchResults, extractUrls, normalizeUrl, WEB_SEARCH_MAX_RESULTS, looksLikeShell } from "./native/organs/web.js";
// The look organ (native/organs/look.js): the native "looking" capacity,
// ported from the fold's browser-side /visual machinery. CV (OpenCV boxes +
// per-region OCR) and OCR, a vision-model read, judge + escalation on
// disagreement, and a text→image render for text whose formatting the
// plain-text reader is reading wrong.
import { isImageFileName, lookAtImage, lookAtText, shouldLook, weirdFormattingScore } from "./native/organs/look.js";
import { mechanicalRevision, variedDraw } from "./native/organs/variation.js";
import { styleGrade as strunkWhiteGrade } from "./native/organs/strunk-white.js";
import { pacingGrade as murchPacing } from "./native/organs/pacing.js";
import { storyShape as vonnegutShape } from "./native/organs/vonnegut.js";
import { classifyArc } from "./native/organs/story-shapes.js";
import { execFileSync } from "node:child_process";
// The earned cast — the per-turn instruction set. Vendored at the
// native/the-fold seam. PURE; the proxy feeds real conversation state and
// receives ONLY the cued facts for this turn. The mouth is never told it is
// playing a role: cueBundle's `mouth` is object-level facts alone.
import { classifySpeech, cueBundle, bannedHits } from "./native/the-fold/earned-cast.js";
// The durable theory of mind — type-level continuity about the person
// across sessions. SPECIFICS stay in the per-session chat history; this
// store holds only what the person has asserted and its standing.
import { loadSpeakerModel, saveSpeakerModel, updateSpeakerModel, durableFacts } from "./native/the-fold/speaker-model.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GIVER = "reader:eoreader7-proxy";
const CANONICALIZATION_FLOOR = 2;
const ANCHORING = (process.env.ER7_ANCHORING ?? "born") === "born"
  ? { born: true, bornActivationFloor: Number(process.env.ER7_BORN_ACTIVATION_FLOOR ?? 0.5), bornMarginFloor: Number(process.env.ER7_BORN_MARGIN_FLOOR ?? 0.3), minWindow: Number(process.env.ER7_BORN_MIN_WINDOW ?? 4) }
  : { minActivation: Number(process.env.ER7_MIN_ACTIVATION ?? 0.05), minMargin: Number(process.env.ER7_MIN_MARGIN ?? 0.2) };

// ── THE MODEL, NAMED — a giver with an identity, never an anonymous string.
// Every claim the model states is cited to THIS giver (the user's
// discipline: the model stating something is a giver that should be cited,
// with what we know about it — its name, its release, its home). The model
// is gemma-2-2b (Google DeepMind, 2024): a 2B-parameter decoder-only
// transformer, Apache-2.0, quantized and served locally via Ollama. This is
// the single small model the pipeline runs today; model-hunting (choosing
// the best model for a task) is future work. The registry is data, not code:
// a caller who runs a different model replaces this entry and every
// citation renames the giver.
const MODEL_REGISTRY = Object.freeze({
  id: "gemma2:2b", // the Ollama id the proxy serves
  hf: "google/gemma-2-2b",
  hfUrl: "https://huggingface.co/google/gemma-2-2b",
  name: "Gemma 2 2B",
  family: "Gemma 2",
  org: "Google DeepMind",
  released: "2024-06-27",
  license: "Apache-2.0",
  params: "2B",
  note: "decoder-only transformer; Apache-2.0; served locally via Ollama (Q4_0). The pipeline's single small model — model-hunting (selecting per task) is future work.",
  quant: "Q4_0",
});
export const MODEL_GIVER = (model) => {
  const m = String(model ?? "").replace(/^er7:/, "").replace(/:q\d+(_\d+)?$/, "");
  if (m === "gemma2:2b" || m === "gemma2:2b-it" || m === "gemma2:2b:latest") return MODEL_REGISTRY;
  return { id: model ?? "?", hfUrl: null, name: String(model ?? "?") };
};
const DEFAULT_POS_PRIOR = path.join(HERE, "legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json");

export const OLLAMA = process.env.ER7_OLLAMA_URL ?? "http://localhost:11434";

// Model warmth: Ollama unloads a model after its keep_alive window (default
// 5m), so an idle gap between turns pays a multi-GB cold-load on the next
// one — which is exactly the failure we just ate. Real request bodies carry a
// long keep_alive, and the proxy pings recently-used models on an interval
// (keepModelHot) so the load never drops between turns. In seconds.
// Off by default: one small model, loaded on demand, unloaded on Ollama's own
// schedule. Keep-warm pinning is a real feature for later, but on a 24GB
// machine it fought itself (every model touched got an hour of residency,
// three models stacked up, the box dragged). ER7_KEEP_ALIVE_S > 0 re-enables it.
export const OLLAMA_KEEP_ALIVE_S = Number(process.env.ER7_KEEP_ALIVE_S ?? 0);

// --- feature toggles (defaults: hyperlexicon ON, wikipedia enrichment OFF,
//     web search OFF — the proxy is the sanctioned egress, P13) -------------
const HYPERLEXICON_ON = (process.env.ER7_HYPERLEXICON ?? "1") !== "0";
const WIKIPEDIA_ON = (process.env.ER7_WIKIPEDIA ?? "1") === "1"; // on by default: the hyperlexicon's Wiktionary/Wikipedia enrichment grounds compositions
// Wikisource door: the hyperlexicon's terms can point at a PUBLIC-DOMAIN
// PRIMARY TEXT (a work, an author, a speech, a treaty). Wikipedia gives a
// summary of what a term is; Wikisource gives the work itself — the primary
// bytes the relations should be read against. When a composition term
// resolves to a Wikisource page, the FULL text is admitted to the corpus
// (same door as a web source), so the reading absorbs the primary source,
// not a secondhand digest. Off unless a term actually resolves there.
const WIKISOURCE_ON = (process.env.ER7_WIKISOURCE ?? "1") === "1";
const WIKI_MAX_CONCEPTS = Number(process.env.ER7_WIKI_MAX_CONCEPTS ?? 3);
const WIKI_TIMEOUT_MS = Number(process.env.ER7_WIKI_TIMEOUT_MS ?? 3500);
const WEB_SEARCH_ON = (process.env.ER7_WEB_SEARCH ?? "0") === "1";
const WEB_MAX_PAGES = Number(process.env.ER7_WEB_MAX_PAGES ?? 3);

const wikiSummaryCache = new Map();

async function wikipediaSummary(term) {
  if (wikiSummaryCache.has(term)) return wikiSummaryCache.get(term);
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term.replace(/ /g, "_"))}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), WIKI_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "user-agent": "eoreader7-proxy" } });
    if (!res.ok) throw new Error(`wiki ${res.status}`);
    const data = await res.json();
    const extract = (data.extract ?? "").replace(/\s+/g, " ").trim();
    const snippet = extract.length > 280 ? `${extract.slice(0, 277)}...` : extract;
    const out = snippet || null;
    wikiSummaryCache.set(term, out);
    return out;
  } catch (err) {
    const out = null;
    wikiSummaryCache.set(term, out);
    return out;
  } finally {
    clearTimeout(t);
  }
}

async function enrichFromWikipedia(composition, maxConcepts = WIKI_MAX_CONCEPTS) {
  if (!WIKIPEDIA_ON || !composition?.length) return [];
  const scored = [...composition]
    .sort((a, b) => (b.meta?.independentSupport ?? 0) - (a.meta?.independentSupport ?? 0))
    .slice(0, maxConcepts);
  const terms = [...new Set(scored.map((e) => String(e.left || e.right || "").trim()).filter(Boolean))].slice(0, maxConcepts);
  const summaries = await Promise.all(terms.map(async (term) => ({ term, snippet: await wikipediaSummary(term) })));
  return summaries.filter((s) => s.snippet);
}

// ── residency ping during blocking setup ─────────────────────────────────
// Ollama unloads a model after its keep_alive window (5m default). A
// long-form job's setup (Gore gather + Wikisource admission) can run longer
// than that BEFORE the first draw, so the first draw cold-loads and can blow
// a job timeout. This is NOT keep-warm (ER7_KEEP_ALIVE_S stays 0): it is a
// scoped ping that runs only while setup is actively working, and the caller
// clears it when done. Returns the timer handle.
function keepResidentDuringSetup() {
  const model = "gemma2:2b";
  let running = false;
  const ping = async () => {
    if (running) return;
    running = true;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 4000);
      await fetch(`${OLLAMA}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "OK" }],
          stream: false, num_predict: 1,
          keep_alive: "1200s", // keep the load alive past the setup's tail
        }),
      });
      clearTimeout(t);
    } catch { /* best effort — the next draw warms it anyway */ }
    finally { running = false; }
  };
  ping();
  return setInterval(ping, 120000); // every 2 minutes while setup runs
}

// ── Wikisource: the hyperlexicon's primary-source door ───────────────────
// Wikipedia gives a summary; Wikisource gives the WORK. The reliable API for
// a full public-domain text here is `action=parse&prop=text` (with
// redirects + disablepp): it resolves transclusions (a Wikisource work page
// is a container of Page: namespace leaves) and returns the rendered HTML,
// which we strip to plain text. Resolved by title first (a term IS the work's
// name), then by search (a term is an author or a concept a work covers).
// Returns null when nothing resolves — never a model guess.
const wikisourceCache = new Map();
const WIKISOURCE_BASE = "https://en.wikisource.org/w/api.php";
const WIKISOURCE_MAX_CHARS = Number(process.env.ER7_WIKISOURCE_MAX_CHARS ?? 60000);

async function wikisourceText(term, { maxChars = WIKISOURCE_MAX_CHARS } = {}) {
  const key = `${term}:${maxChars}`;
  if (wikisourceCache.has(key)) return wikisourceCache.get(key);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), WIKI_TIMEOUT_MS);
  const parsePage = async (title) => {
    const u = new URL(WIKISOURCE_BASE);
    u.searchParams.set("action", "parse");
    u.searchParams.set("page", title);
    u.searchParams.set("prop", "text");
    u.searchParams.set("redirects", "1");
    u.searchParams.set("disablepp", "1");
    u.searchParams.set("format", "json");
    u.searchParams.set("formatversion", "2");
    const res = await fetch(u, { signal: controller.signal, headers: { "user-agent": "eoreader7-proxy" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error || !data.parse?.text) return null;
    const html = String(data.parse.text);
    const text = htmlToText(html);
    if (!text) return null;
    return { title: data.parse.title ?? title, text: text.slice(0, maxChars) };
  };
  const fetchSearch = async (term) => {
    const u = new URL(WIKISOURCE_BASE);
    u.searchParams.set("action", "query");
    u.searchParams.set("list", "search");
    u.searchParams.set("srsearch", term);
    u.searchParams.set("srlimit", "3");
    u.searchParams.set("format", "json");
    u.searchParams.set("formatversion", "2");
    const res = await fetch(u, { signal: controller.signal, headers: { "user-agent": "eoreader7-proxy" } });
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data?.query?.search?.[0];
    return hit && !hit.missing ? await parsePage(hit.title) : null;
  };
  try {
    // 1) The term IS the title (a work's name, an author's page). 2) Failing
    // that, a search for the term as a subject. Only a page that actually
    // exists on Wikisource resolves.
    let out = (await parsePage(term)) ?? (await fetchSearch(term));
    wikisourceCache.set(key, out);
    return out;
  } catch (err) {
    wikisourceCache.set(key, null);
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Strip rendered HTML to plain text — the same fold the web fetcher applies
// to ordinary pages. Tables, notes, and interwiki links collapse to their
// visible text; the result is the work's prose, whitespace-folded.
function htmlToText(html) {
  const withoutNotes = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ");
  const text = withoutNotes
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>|<\/td>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  // Drop Wikisource's own scaffolding lines (nav, page numbers, headers) and
  // the style blocks MediaWiki inlines (the .mw-… and .wst-… classes carry no
  // prose). Only the work's words should reach the reading.
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^\.?(mw|wst)-/i.test(l) && !/^(page|header|footer|edit|jump to|wikisource)/i.test(l) && !/for works with similar titles/i.test(l))
    .join("\n");
}

// ── EOT-ize only the salient, at multiple resolutions ──────────────────────
// Stepping every sentence of every fetched page through the reader bloats the
// holograph with irrelevant material. Resolution levels, coarse to fine:
//   NONE   — the page shares no salient token with the task: bytes retained
//            (S101 recoverable) but NOT admitted to the reading — it is
//            ignored. The reading does not absorb what it does not need.
//   COARSE — the page shares salient tokens with the task: step it through
//            the reader (build surfaces/referents/notes) so surf can address
//            it — but only the sentences that actually relate (fine EOT-ize
//            of the related stretches, not the whole page blindly).
//   FINE   — the page is on-task AND moves the reading (expectation effects
//            / REC): fully EOT-ized.
// And the FORGET path: a page that was admitted but added nothing is marked
// forgotten — its corpus text stops reaching surf and its reading admission
// is superseded. Forgetting is a decision, recorded like every other.
const RESOLUTION_NONE = "none", RESOLUTION_COARSE = "coarse", RESOLUTION_FINE = "fine";

// Coarse screen: how much of the task's content-bearing vocabulary appears in
// the page? A page that shares < SALIENCE_MIN of the task's distinctive words
// is not about the task — retain, don't read.
function salienceOf(pageText, task) {
  const taskWords = new Set(String(task).toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 3));
  if (!taskWords.size) return { score: 1, shared: [], taskWords: 0, resolution: RESOLUTION_FINE };
  const lower = String(pageText).toLowerCase();
  const shared = [...taskWords].filter((w) => lower.includes(w));
  return { score: shared.length / taskWords.size, shared, taskWords: taskWords.size, resolution: RESOLUTION_NONE };
}

// The decision, from the screen: retain-then-read, retain-only, or forget.
function resolutionFor(score, sharedCount, { coarseAt = 0.2, fineAt = 0.6 } = {}) {
  if (score >= fineAt) return RESOLUTION_FINE;
  if (score >= coarseAt && sharedCount >= 1) return RESOLUTION_COARSE;
  return RESOLUTION_NONE;
}

// ── shell detection via pyodide's HTMLParser (structural, not regex) ───────
// The regex `looksLikeShell` on the TEXT face catches the "couldn't load"
// apology. But a shell can hide behind a normal text face — its STRUCTURE is
// the tell: a real article has text-bearing block elements (p, article,
// section, h1-h6, li, td) with real content; a JS/error shell is dominated by
// script, iframe, svg, and boilerplate divs that hold the loader message.
// This reads the DOM with Python's stdlib HTMLParser (no bs4 wheel needed;
// the shared pyodide runtime is already warm from postprocess.mjs), and
// returns a typed verdict. Cached + timeboxed so a slow parse never stalls a
// fetch; on any pyodide failure it falls back to "unknown" (the regex
// already ran) rather than blocking the harvest.
let _shellVerdict = null;
async function pyodideShellVerdict(html) {
  if (!html || html.length > 3_000_000) return { shell: false, basis: "declined" };
  try {
    const py = await getPyodide();
    const key = `__shell_${(Math.random() * 1e9) | 0}`;
    py.globals.set(key, html);
    py.runPython(`
from html.parser import HTMLParser
import re

class T(HTMLParser):
    def __init__(self):
        super().__init__()
        self.depth = 0
        self.text_chars = 0
        self.block_chars = {}
        self.script = 0
        self.iframe = 0
        self.svg = 0
        self.in_script = False
    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "iframe", "svg", "canvas", "noscript", "template"):
            self.depth += 1
            if tag == "script": self.script += 1
            if tag == "iframe": self.iframe += 1
            if tag == "svg": self.svg += 1
        elif tag in ("p", "article", "section", "h1", "h2", "h3", "h4", "li", "td", "blockquote", "pre", "figcaption"):
            self.block_chars[tag] = self.block_chars.get(tag, 0)
    def handle_startendtag(self, tag, attrs):
        pass
    def handle_endtag(self, tag):
        if tag in ("script", "style", "iframe", "svg", "canvas", "noscript", "template"):
            self.depth = max(0, self.depth - 1)
    def handle_data(self, data):
        if self.depth == 0:
            s = re.sub(r"\\s+", " ", data).strip()
            self.text_chars += len(s)
`)
    py.runPython("__t = T(); __t.feed(" + key + "); __verdict = __t")
    const t = py.globals.get("__verdict");
    const textChars = t.text_chars;
    const scripts = t.script, iframes = t.iframe, svgs = t.svg;
    const text = textChars || 0;
    // A shell: the page is DOMINATED by loader machinery (script/iframe/svg)
    // with no real article text outside it. A real page's text lives in
    // paragraphs; a shell's text lives in the error/loader divs. Structure
    // dominates: scripts+iframes+svgs >= 2 with thin text is a shell.
    let shell = false;
    let basis = "content";
    const machinery = scripts + iframes + svgs;
    if (text < 400 && machinery >= 2) { shell = true; basis = `shell: ${text} text chars vs ${scripts} scripts, ${iframes} iframes, ${svgs} svgs`; }
    else if (text < 150 && machinery >= 1) { shell = true; basis = `thin-shell: ${text} chars, ${machinery} script/iframe/svg element(s)`; }
    else if (text < 250 && scripts >= 2) { shell = true; basis = `loader-shell: ${text} chars, ${scripts} scripts`; }
    try { _shellVerdict = { shell, basis, textChars: text, scripts, iframes, svgs }; } catch {}
    return { shell, basis, textChars: text, scripts, iframes, svgs };
  } catch (err) {
    return { shell: false, basis: `pyodide unavailable: ${err.message}`, declined: true };
  }
}

// ── web search organ: Gore, the proxy's one sanctioned egress (P13) ────────
// Searches DuckDuckGo (no key), fetches pages, extracts readable text, and
// admits the results as chunks into the same corpus session as workspace files.
// The web material then flows through the exact same grounding ladder (surf,
// fold, resolutions) as local files — no separate path, no model compression.
//
// Gore is ITERATIVE, bounded by a DMD boundary (gore.js): gather is capped
// where additional results stop adding reach; a composition calls back with
// cueGoDeeper for a theme the piece needs, and doubleCheck on a claim's atoms.
async function searchAndAdmitWeb(session, sessionId, query, onNote, { move = "gather", maxPages = WEB_MAX_PAGES } = {}) {
  if (!WEB_SEARCH_ON || !query.trim()) return { searched: false, pages: 0, chars: 0 };
  const started = Date.now();
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  let searchHtml;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(searchUrl, { signal: ctrl.signal, headers: { "user-agent": "the-fold-explore/0.1 (local research instrument; one page per explicit request)" } });
    clearTimeout(t);
    if (!res.ok) throw new Error(`search ${res.status}`);
    searchHtml = await res.text();
  } catch (err) {
    if (onNote) onNote({ move: "web_error", detail: err.message });
    return { searched: true, pages: 0, chars: 0, error: err.message };
  }
  // Minimal search result parsing: extract links and snippets from DDG HTML.
  const results = [];
  const seen = new Set();
  const re = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(searchHtml)) && results.length < 12) {
    let href = m[1];
    if (/[?&]uddg=([^&]+)/.test(href)) {
      try { href = decodeURIComponent(href.match(/[?&]uddg=([^&]+)/)[1]); } catch { continue; }
    }
    if (!/^https?:\/\//i.test(href) || /duckduckgo\.com\//.test(href)) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    results.push({ url: href, title: m[2].replace(/<[^>]+>/g, "").trim() });
  }
  if (!results.length) {
    if (onNote) onNote({ move: "web_no_results" });
    return { searched: true, pages: 0, chars: 0 };
  }
  // Source tiering: prefer encyclopedic / primary sources (Wikipedia as an
  // INDEX, then journals, .gov/.edu, primary orgs) over essay-mills and
  // content farms. The user's rule: Wikipedia is an index, primary sources
  // are the material. A page about WRITING essays (earthreminder's
  // "dolphin-essay-in-english") poisons a composition — the model starts
  // writing about writing. Tier 0 = preferred, tier 2 = last resort.
  const tierOf = (url, title = "") => {
    const t = String(title ?? "").toLowerCase();
    const h = String(url ?? "").toLowerCase();
    if (/wikipedia\.org|wikisource|wiktionary/.test(h)) return 0; // index — preferred entry
    if (/\.(gov|edu)\b/.test(h) || /pmc\.ncbi|pubmed|nature\.com|science\.org|doi\.org|sciencedirect|springer|plos|mdpi|frontiersin/.test(h)) return 0; // primary/peer-reviewed
    if (/essay|gradesfixer|studymode|bartleby|coursehero|chegg|brainly|examples\.com|templates\.|articlewriting|essaywriting|writinghelper/.test(t)) return 2; // essay-mill — poisons compositions
    if (/\.org|\.io|museum|national|foundation|university|institute/.test(h)) return 1; // institutional
    return 1;
  };
  results.sort((a, b) => (tierOf(a.url, a.title) - tierOf(b.url, b.title)) || 0);
  if (onNote && results.length) onNote({ move: "gore_tier", top: results.slice(0, 3).map((r) => r.url), tiers: { preferred: results.filter((r) => tierOf(r.url, r.title) === 0).length, lastResort: results.filter((r) => tierOf(r.url, r.title) === 2).length } });

  // Gore's DMD boundary: gather stops where additional results add no reach.
  // Go-deeper and double-check are targeted strikes — they take their cap
  // directly rather than expanding the harvest.
  let keepResults = results;
  if (move === "gather") {
    const boundary = goreBoundary(results, { maxResults: maxPages });
    keepResults = results.slice(0, boundary.keep);
    if (onNote) onNote({ move: "gore_boundary", query, kept: boundary.keep, of: results.length, basis: boundary.basis });
  } else {
    keepResults = results.slice(0, maxPages);
  }
  // Fetch the top pages, extract readable text, admit as chunks — AND step
  // them through the constitutional reader (EOT-ize), exactly like workspace
  // files: the web material becomes part of the holograph, the referents,
  // the hyperlexicon. Surf then addresses REAL structure, not raw bytes.
  //
  // EOT RETAINS THE FULL TEXT (S101): even when parsing misses structure,
  // the ledger must reconstruct 100% of the page's words. So each source's
  // FULL readable text is kept on the session (webSources, addressable by
  // URL), and the web ledger records a source line + recoverable range —
  // the parse is layered on top, never a replacement for the bytes.
  let admittedChars = 0;
  let admittedPages = 0;
  if (!session.corpus) session.corpus = createCorpusSession();
  if (!session.webLedger) {
    session.webLedger = createDocumentLedger({ docId: `${sessionId}:web`, title: `Web research — ${query}` });
  }
  // ── competency gate: a quest stops when the reading is no longer
  // meaningfully surprised. This is the WHOLE point of gathering — not to
  // fill the page-count but to reach the point where what we know is no
  // longer surprising BECAUSE we understand why it is the way it is. A page
  // that collapses surprise (little salient signal) ends the gather: more
  // pages would only add noise. Surprise collapse, never token volume, is
  // the stop — and it is also a guide on writing: the piece is done when it
  // explains the why, not when it has reached a length.
  let competencyReached = false;
  const COMPETENCY_SALIENT_MIN = 1; // meaningful surprise = at least one expectation moved or a REC
  for (const r of keepResults) {
    if (admittedPages >= WEB_MAX_PAGES) break;
    if (competencyReached) break;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch(r.url, { signal: ctrl.signal, headers: { "user-agent": "the-fold-explore/0.1 (local research instrument; one page per explicit request)" } });
      clearTimeout(t);
      if (!res.ok) continue;
      const html = await res.text();
      // The real web organ's extraction: strips scripts/styles/nav/header/
      // footer and decodes entities — not the inline stripper that left
      // "Dolphin&#039;s" in the text face (search before building).
      const { text } = extractReadable(html);
      if (!text || text.length < 50) continue;
      // A JS-shell / error page is not content (measured live: "A required
      // part of this site couldn't load… disable any ad blockers" came back as
      // 209 chars of shell). Two checks: the fast regex on the text face, then
      // the structural DOM read via pyodide (script/iframe/svg dominance with
      // near-zero real text). A shell is skipped — Gore fetches the NEXT
      // result instead of quoting a shell's apology as source material.
      const fastShell = looksLikeShell(text);
      let struct = null;
      if (!fastShell) {
        struct = await pyodideShellVerdict(html);
        if (struct?.shell) {
          if (onNote) onNote({ move: "web_skipped", url: r.url, why: "structural-shell", basis: struct.basis });
          continue;
        }
      }
      if (fastShell) {
        if (onNote) onNote({ move: "web_skipped", url: r.url, why: "shell" });
        continue;
      }
      const srcId = `web:${sessionId}:${admittedPages}:${r.url}`;
      // THE SHADOW / MNEME — the memory of the visit itself, preserved ALWAYS
      // whether or not the content is absorbed. A visit is a fact: the site
      // was seen, its text was retained (S101 recoverable), its address is
      // real. Even a page we decline to EOT-ize (not salient) keeps its
      // shadow — the reading did not absorb it, but the instrument remembers
      // it was there. Nothing is erased by a salience decision.
      //
      // The shadow is a DERIVED, DELETABLE projection (the-fold field-store.js
      // Pass 33): it keeps the FULL passage text on purpose — that is what
      // reanchor searches when the ground moves (find the note's words in
      // whatever sources exist now and mint the address anew), and what a turn
      // gets handed as passages. Its SDR states are UNPERSISTED — they rebuild
      // by re-hashing the text, so the text is the storage. Clearing the shadow
      // loses nothing: it rebuilds from the retained sources. The size story
      // is durability, never compression (measured pg2600: 4,582 KB shadow =
      // 1.42x the 3,216 KB source, 68% of it the passage text it must keep).
      const offset = session.webSources.get(r.url)?.length ?? 0;
      const full = (session.webSources.get(r.url) ?? "") + (offset ? "\n\n" : "") + text;
      session.webSources.set(r.url, full);
      if (!session.shadow) session.shadow = [];
      session.shadow.push({ url: r.url, title: r.title || r.url, seenAt: new Date().toISOString(), chars: text.length, resolution: null, reading: null });
      // The web ledger is PERSISTED to disk (the shadow's source text lives as
      // a file, S101 recoverable) — so the citation byte-addresses resolve
      // against real bytes, not memory. An address into a vanished session is
      // a spelling; this keeps it a birth.
      const WEB_LEDGER_DIR = path.join(HERE, "documents");
      try { fs.mkdirSync(WEB_LEDGER_DIR, { recursive: true }); } catch {}
      appendLedgerLine(session.webLedger, {
        role: "source", title: r.title || r.url, text,
        basis: `web fetch, shadow-preserved (full ${text.length} chars recoverable)`,
        at: [offset, offset + text.length],
      }, { dir: WEB_LEDGER_DIR });

      // SALIENCE-GATED EOT-IZATION, MULTIPLE RESOLUTIONS. Only what is salient
      // is absorbed into the reading. The screen is COARSE first (does the page
      // share the task's words?), then FINE (does it move the reading's
      // expectations?). A page that fails the coarse screen is ignored by the
      // reading — its shadow stays, its content is retained, but the holograph
      // does not absorb what it does not need.
      const sal = salienceOf(text, query);
      const resolution = resolutionFor(sal.score, sal.shared.length);
      const shadowEntry = session.shadow[session.shadow.length - 1];
      if (shadowEntry) shadowEntry.resolution = resolution;
      let pageSurprise = { salient: 0, noise: 0, effects: 0, recanonicalizations: 0 };
      if (resolution === RESOLUTION_NONE) {
        // Retain, don't read. The page is kept recoverable and its shadow is
        // on the record; it just does not enter the reading. Ignore is a
        // positive decision, recorded — not an accident.
        admitChunked(session.corpus, { text, sourceId: srcId });
        if (onNote) onNote({ move: "ignored", url: r.url, score: sal.score.toFixed(2), shared: sal.shared.slice(0, 5) });
      } else {
        // COARSE or FINE: EOT-ize it. FINE additionally steps it through the
        // reader (which is where the holograph absorbs it). COARSE admits the
        // text to the corpus (surf can address it) and steps it through the
        // reader too — the reader's own surprise is the fine-resolution gate
        // on whether it actually moved the reading.
        admitChunked(session.corpus, { text, sourceId: srcId });
        const encounters = textEncounters(text, { source: `web:${r.url}`, offset: 0 });
        for (const enc of encounters) {
          const step = await session.reader.step(enc);
          const s = step?.surprise;
          if (!s) { await yieldToEventLoop(); continue; }
          const effects = s.expectationEffects?.length ?? 0;
          const recan = s.recanonicalizations?.length ?? 0;
          const ops = s.operations?.length ?? 0;
          if (effects > 0 || recan > 0) pageSurprise.salient++;
          else if (ops > 0) pageSurprise.noise++;
          if (effects) pageSurprise.effects += effects;
          if (recan) pageSurprise.recanonicalizations += recan;
          await yieldToEventLoop();
        }
        if (onNote) onNote({ move: "eot_ized", url: r.url, resolution, score: sal.score.toFixed(2), salient: pageSurprise.salient });
        // THE SHADOW IS THE READING, SHAPED BY THE PRIORS. After stepping the
        // source through the reader (which runs under the received POS prior
        // and the born anchoring), capture what the priors caused the reading
        // to ESTABLISH — the referents it resolved, with their surfaces. That
        // is the shadow of this visit: not the bytes, not a receipt, but the
        // prior-shaped memory of what was here. It is derived (rebuildable by
        // re-reading the retained bytes under the same priors) and deletable.
        const shadowEntry = session.shadow[session.shadow.length - 1];
        if (shadowEntry) {
          const idx = sessionReferentIndex(session, null);
          shadowEntry.reading = {
            referents: [...(idx?.referents ?? new Map()).values()]
              .slice(-12)
              .map((ref) => [...(ref.surfaces ?? [])][0] ?? null)
              .filter(Boolean),
            salient: pageSurprise.salient,
            prior: "pos:en-ud-ewt + born anchoring",
          };
        }
      }
      session.lastPageSurprise = pageSurprise;
      // Competency: if this page barely moved the reading's expectations
      // (salient ≈ 0), we now understand the material well enough that more
      // sources would only add noise. Stop the quest. This is the DMD
      // boundary made about MEANING, not token counts.
      if (pageSurprise.salient < COMPETENCY_SALIENT_MIN) competencyReached = true;
      if (onNote) onNote({ move: "competency", url: r.url, salient: pageSurprise.salient, noise: pageSurprise.noise, reached: competencyReached, resolution });
      admittedChars += text.length;
      admittedPages++;
    } catch { /* skip failed fetches silently */ }
  }
  if (onNote) onNote({ move: "web_searched", query, pages: admittedPages, chars: admittedChars, ms: Date.now() - started, goreMove: move });
  return { searched: true, pages: admittedPages, chars: admittedChars };
}

// ── the essay's shape: DEF before composition, from a prior or the web ────
// An essay has a shape — a thesis in the opening, thematic body sections that
// each support it, a conclusion that returns to it. The shape is not invented
// by the model and not invented by us: it is a RECEIVED structure (a shape
// prior with a named giver), and when no prior covers the task, it is HUNTED
// online the way the web organ hunts a fact — recorded egress, never assumed.
// The shape is stated POSITIVELY to the model (the-fold shapeSuffix), never as
// a prohibition, so the model aims at it natively.
const ESSAY_SHAPE_PRIOR = Object.freeze({
  schema: "ShapePrior@1",
  form: "essay",
  giver: "eoreader7:shape-prior:essay-v1",
  basis: "the essay's classical form — thesis opening, thematic body sections supporting it, conclusion returning to it; stated as the shape the piece aims at, never a prohibition",
  parts: Object.freeze([
    { role: "opening", label: "an opening that states the thesis" },
    { role: "body", label: "body sections, each advancing one theme of the thesis" },
    { role: "closing", label: "a conclusion that returns to the thesis" },
  ]),
});

// The shape of a composition is EXTRACTED from the material, never steered:
// the recurring short lines the material's own structure shows (structure-rec
// tier2's discipline — short, blank-bounded, not quoted), plus the beings the
// reading established. If the material has real section markers, those become
// the essay's sections; only when it has none do we fall back — and the
// fallback is disclosed as such, never dressed up as the material's shape.
function shapeFromMaterial({ material = [], referents = null, surfacedSegments = [] }) {
  const sections = [];
  const text = (material.length ? material.join("\n\n") : "") + "\n\n" + (surfacedSegments.length ? surfacedSegments.map((s) => s.text ?? "").join("\n\n") : "");
  // Extract the material's own structure: recurring short lines (its heading
  // convention), using structure-rec's candidate-line discipline — short,
  // blank-bounded, not quoted dialogue.
  const lines = String(text).split("\n").map((l) => l.trim());
  const seen = new Map();
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l || l.length > 80 || l.length < 4) continue;
    if (/^[“"'‘]|[”"'’]$/.test(l)) continue; // quoted dialogue, not a heading
    if (/^(http|www\.)/i.test(l)) continue;
    if (/^[-*•]/.test(l)) continue; // a list item, not a heading
    if (l.includes("…") || /\.{2,}/.test(l)) continue;
    const key = l.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (key.length < 4) continue;
    const rec = seen.get(key) ?? { count: 0, line: l };
    rec.count++;
    seen.set(key, rec);
  }
  const recurring = [...seen.values()]
    .filter((r) => r.count >= 2)
    // A real section heading is a capitalized noun phrase, not lowercase
    // chrome or navigation ("for other uses", "see also", "jump to content").
    .filter((r) => /^[A-Z]/.test(r.line))
    // Boilerplate never becomes a section: navigation, site chrome, essay-mill
    // labels, disambiguation leads.
    .filter((r) => !/table of contents|home|menu|search|related|essay example|free essay|skip to|read more|also read|recent posts|subscribe|share this|^page\b|^home\b|login|sign in|sign up|contact|about us|privacy|cookie|conclusion of the essay|within this section|you'll find|jump to content|from wikipedia|the free encyclopedia|navigation|current events|contents|help about|learn to edit|community portal|recent changes|what links here|related changes|special pages|permanent link|page information|cite this page|wikidata item|download as|toggle|coordinates|tools|interaction|print.?\w*export|search wikipedia|donate|create account|for other uses|see also|disambiguation|see .*\(disambiguation\)/i.test(r.line))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  // PREFER the reading's beings first: they are the material's ACTUAL
  // subjects ("Dolphin", "Tursiops truncatus"), far better sections than any
  // chrome line. Recurring short lines join only after, and only when they
  // survived the chrome filter.
  const beings = [...(referents?.values?.() ?? [])]
    .map((r) => [...(r.surfaces ?? [])][0])
    .filter((n) => n && n.length > 3 && n.length < 60)
    .filter((n) => !/jump to|wikipedia|navigation|search|contents|edit|main|talk|article|portal|help|special|tools/i.test(n))
    .slice(0, 3);
  for (const b of beings) {
    if (!sections.includes(b)) sections.push(b);
  }
  for (const r of recurring) {
    if (!sections.includes(r.line)) sections.push(r.line);
  }
  // The material's first substantial lines that look like section titles
  // ("## ..." or a short title at the start of a block).
  if (sections.length < 3) {
    for (const l of lines) {
      if (sections.length >= 5) break;
      if (/^#{1,4}\s+/.test(l)) {
        const t = l.replace(/^#{1,4}\s+/, "").trim();
        if (t && t.length < 90 && !sections.includes(t)) sections.push(t);
      }
    }
  }
  return sections.slice(0, 6);
}
function essayThemes({ task, surfacedSegments, material }) {
  const themes = [];
  // From the material's own sentences: the themes the sources actually raise.
  const text = (material && material.length ? material.join(" ") : "") + " " + (surfacedSegments?.length ? surfacedSegments.map((s) => s.text ?? "").join(" ") : "");
  const sentences = String(text)
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 60 && s.length < 220);
  // Pick up to 3 sentences that look like topic carriers (not the essay-site
  // boilerplate the search surface often leads with).
  const seen = new Set();
  for (const s of sentences) {
    if (themes.length >= 3) break;
    if (/^(dolphin essay|short essay|welcome to|table of contents|in this (section|session|essay))/i.test(s)) continue;
    const head = s.slice(0, 90);
    if (seen.has(head) || seen.size > 12) continue;
    seen.add(head);
    themes.push(head);
  }
  return themes.length ? themes : ["the world of the subject", "how the subject lives", "why the subject matters"];
}

// ── void-detection: determine answer shape before the model speaks ─────────
// Zero the space first, then see what is still empty. A greeting needs one
// sentence; a command needs acknowledgment; a research question needs
// grounded material; a void needs a disclosed fact (P32). This steers the
// model toward the proper length and modality without relying on the model
// to figure out the shape itself.
function detectAnswerShape(task, hasWorkspace, hasWeb, surfVoid, surfacedSegments, resolutions) {
  const t = task.toLowerCase().trim();
  if (/^(hi|hello|hey|howdy|greetings|good\s+(morning|afternoon|evening))[\s,!?]*$/.test(t))
    return { shape: "greeting", maxTokens: 64, modality: "brief" };
  if (/^(clear|reset|help|status|what\s+can\s+you\s+do|who\s+are\s+you)[\s,!?]*$/.test(t))
    return { shape: "command", maxTokens: 128, modality: "brief" };
  if (/^(count|list|enumerate)\s+(to\s+)?\d+/.test(t))
    return { shape: "trivial", maxTokens: 64, modality: "direct" };
  if (surfVoid && !surfacedSegments.length)
    return { shape: "void", maxTokens: 256, modality: "disclosed-fact" };
  // Composition tasks — any generation that has material to write from (an
  // essay, a paper, a report, a spec, an explanation). The shape is whatever
  // the material actually has (shapeFromMaterial); the same organs serve any
  // task. A short answer or a one-off question stays a single draw.
  if (/\b(essay|write|explain|describe|summarize|outline|compose|report|discuss|analyze|paper|review|spec|guide|explain|tell\s+me\s+about)\b/.test(t) && (hasWorkspace || hasWeb || surfacedSegments.length))
    return { shape: "composition", maxTokens: CALL_MAX_TOKENS, modality: "grounded" };
  if (hasWorkspace || hasWeb)
    return { shape: "research", maxTokens: CALL_MAX_TOKENS, modality: "grounded" };
  return { shape: "open", maxTokens: CALL_MAX_TOKENS, modality: "concise" };
}

// ── composition planning: derive section structure from the READING ────────
// A natural topic phrase out of a task, for the essay's own voice: "Write a
// five-page essay on dolphins" → "dolphins"; "explain how the kernel works"
// → "how the kernel works". Never an apparatus name.
function topicPhrase(task) {
  const t = String(task ?? "").trim();
  // The topic is the leading noun-phrase, NOT any "about"/"on" — "what she
  // wrote about the Analytical Engine" must not hijack the essay's subject.
  // Prefer the most SPECIFIC pattern first (a biography/analysis/history OF
  // X names the subject directly), then the FIRST "about" (the essay's own
  // frame), then a leading noun phrase.
  const ofSubject = /\b(?:biography|account|history|analysis|study)\s+of\s+([^,;:.!?]+)/i.exec(t)?.[1] ?? null;
  if (ofSubject) return ofSubject.trim().replace(/\s+/g, " ");
  const about = /\babout\b\s+([^,;:.!?]+)/i.exec(t)?.[1] ?? null;
  if (about) return about.trim().replace(/\s+/g, " ");
  // Fallback: the leading phrase, cut at a word boundary and stripped of a
  // dangling fragment — "explaining how reference counting works…" must not
  // truncate mid-noun into "…JavaScript en" or leave a trailing "the".
  const short = t.slice(0, 80).replace(/^(write|explain|describe|summarize|outline|compose|report|discuss|analyze)\s+/i, "").trim();
  const cut = short.replace(/\s+[a-z]+$/, "").trim(); // drop a trailing dangling word
  return (cut || short || "this").replace(/\s+/g, " ").trim();
}
// LaVar's rule, applied: do not hand-roll a reading loop. The composition's
// shape comes from the reading's OWN structure — the beings the
// constitutional reader established (readingIndexFromLog's referents, each
// with its surfaces and the mentions that fed it), the hyperlexicon's given
// affordances (what recurs between whom), and the holograph's reconstructed
// record. Each section is a real node in the material, not a model's
// invention, and the overall concept stays in the unconscious notes (the
// digest + resolutions) while each task is brief + grounded.
function planComposition({ index, hyperlexicon, resolutions, surfacedSegments, topicSource, material }) {
  const sections = [];
  // PRIMARY: the material's OWN structure — its recurring short lines (its
  // heading convention) and the beings the reading established. The shape of
  // any generated piece is whatever the material actually has, never a shape
  // imposed on it. Same organs, any task: an essay, a paper, a report, a
  // spec — the sections are the material's, not ours.
  const fromMaterial = shapeFromMaterial({ material, referents: index?.referents, surfacedSegments });
  for (const s of fromMaterial) sections.push(s);

  // Source 1: the reading's own beings, ranked by how many mentions fed them.
  const referents = index?.referents ?? new Map();
  const beings = [...referents.values()]
    .map((r) => ({ ...r, fed: r.fedBy?.size ?? 0, name: [...(r.surfaces ?? [])][0] ?? null }))
    .filter((r) => r.name)
    .sort((a, b) => b.fed - a.fed);
  for (const b of beings.slice(0, 4)) {
    if (sections.includes(b.name)) continue;
    sections.push(b.name);
  }
  // Source 2: hyperlexicon given affordances (what recurs between whom).
  const hl = hyperlexicon?.composition ?? {};
  for (const e of Object.values(hl)) {
    if (e?.standing !== "given") continue;
    const title = `${e.left} and ${e.right}`;
    if (!sections.includes(title)) sections.push(title);
    if (sections.length >= 6) break;
  }
  // Source 3: surfed segment sources — the addressed material's own blocks.
  if (surfacedSegments?.length) {
    for (const s of surfacedSegments) {
      const title = String(s?._ledger?.heading ?? s?.heading ?? "").trim() || String(s?.source ?? "").trim();
      if (title && !sections.includes(title)) sections.push(title);
      if (sections.length >= 6) break;
    }
  }
  // LAST RESORT, disclosed as what it is: the material had no structure the
  // organs could extract — a single grounded part, written against the whole
  // of what came up. Never a rigid invented list; the model writes freely.
  if (!sections.length) {
    sections.push("All of it"); // one part, whole material, honest
  }
  // Final bound.
  return sections.slice(0, 6);
}

export const REQUEST_TIMEOUT_MS = Number(process.env.ER7_REQUEST_TIMEOUT_MS) || 290000;

// The mouth's standing character — the same neutral, stable voice every
// session begins with. It is NOT a persona and NOT a role: it is who the
// instrument is when it talks, so the person is never meeting a different
// communicator each time. Firewall-clean (no apparatus noun, no cast name).
export const NEUTRAL_CHARACTER =
  "You're a careful, plain-speaking reader. You work from what a person gives you, answer what they actually asked, say plainly when something isn't established rather than filling the gap, and you may hold the person to what they've told you before — gently, never to win.";

// ── the earned cast, per turn: the model gets ONLY the facts this turn
// earned, and never a role. `cueBundle` classifies the turn's speech act
// against the real conversation state (the person's own prior assertions,
// known gaps) and returns object-level facts. We append only `mouth`
// (firewall-clean, covert-clean, cast-name-free by construction) to the
// system content — never a persona name, never a "you are X" role line.
// The ban is enforced here too: a leak drops the cue, never ships it.
function earnedCue({ task, chatHistory = [], surfVoidInfo = null }) {
  try {
    const personClaims = (chatHistory ?? [])
      .filter((m) => m?.role === "user" && typeof m.content === "string" && m.content.trim())
      .slice(-3)
      .map((m) => m.content.trim());
    const state = {
      personClaims,
      // A confirmed absence is a gap with its path, never a defeatist stop.
      ...(surfVoidInfo ? { gaps: [surfVoidInfo.gap ?? "nothing here answers it"] } : {}),
      ...(surfVoidInfo ? { notEstablished: [surfVoidInfo.gap ?? "it"] } : {}),
    };
    const bundle = cueBundle({ act: classifySpeech(task), state, depth: 1 });
    const mouth = String(bundle.mouth ?? "").trim();
    if (!mouth) return null;
    const leaks = bannedHits(mouth);
    if (leaks.length) return null; // a leaking cue is dropped, never shipped
    return { mouth, act: bundle.act, strain: bundle.strain, eligible: bundle.eligible };
  } catch {
    return null; // the cue must never break a turn
  }
}

function normalizePosPrior(prior, sourcePath) {
  if (!prior || prior.schema !== "POSPrior@1") throw new Error(`${sourcePath} is not a POSPrior@1 file`);
  if (prior.provenance?.source) return prior;
  if (prior.giver?.resource) {
    return { ...prior, provenance: { source: prior.giver.resource, url: prior.giver.url, license: prior.giver.resourceLicense, note: prior.giver.note } };
  }
  throw new Error(`${sourcePath} has neither provenance.source nor giver.resource`);
}

const emptyRetrieve = (_fold, evidence) => Object.freeze({
  schema: "EORelevantFold@1", witnessed: Object.freeze([...evidence]), provisional: Object.freeze([]),
  expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]),
  unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]),
});

let _posPrior = null;
function getPosPrior() {
  if (_posPrior) return _posPrior;
  const p = DEFAULT_POS_PRIOR;
  if (!fs.existsSync(p)) throw new Error(`POS prior not found at ${p}`);
  _posPrior = normalizePosPrior(JSON.parse(fs.readFileSync(p, "utf8")), p);
  return _posPrior;
}

const MIN_RELATION_SURFACES = Number(process.env.ER7_MIN_RELATION_SURFACES ?? 2);

function createSessionReader() {
  const POS_PRIOR = getPosPrior();
  const adapters = {
    revise: (a) => reviseTextFold({ ...a, canonicalizationFloor: CANONICALIZATION_FLOOR }),
    retrieve: emptyRetrieve,
  };
  const perceivers = [createCausalTextPerceiver({ minRelationSurfaces: MIN_RELATION_SURFACES, posPrior: POS_PRIOR, descriptorAnchoring: ANCHORING })];
  return createRecursiveReader({ perceivers, adapters });
}

// --- per-session reader state -------------------------------------------------
const sessions = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getSession(sessionId) {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastAccess > SESSION_TTL_MS) sessions.delete(id);
  }
  if (sessions.has(sessionId)) {
    const s = sessions.get(sessionId);
    s.lastAccess = now;
    return s;
  }
  const reader = createSessionReader();
  const entry = { reader, corpus: null, corpusIndex: null, lookIndex: null, lastChatText: "", turnCount: 0, lastAccess: now, indexSig: null, referents: null, webLedger: null, webSources: new Map(), field: null, shadow: [] };
  sessions.set(sessionId, entry);
  return entry;
}

export function resetSession(sessionId) {
  sessions.delete(sessionId);
}

// --- workspace (physics over real files) ---------------------------------------
// EOReader7 does not ask a model to browse or bookmark files (small local
// models cannot be trusted to tool-call). The proxy reads the files itself
// and admits them into a REAL corpus session (legacy host/corpus.js), then
// the REAL surf (host/surfer.js::executePrompt — the mechanical, model-free
// SOURCE→HEADING→CONTENT→WINDOW address ladder) addresses, on every turn,
// the exact segment the question needs. The model receives the SURFED
// CONTENT ONLY — never an address, never a browse: "the model is given the
// content it needs when asked, as if from nowhere." The address belongs to
// the proxy's ledger, not to the model's context — a model that SAW the
// address would have something to confabulate about.

const SKIP_DIRS = new Set([".git", "node_modules", ".venv", "venv", "dist", "build", ".next", "__pycache__", ".cache", "coverage", ".DS_Store"]);
const SKIP_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz", ".tar", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".mp3", ".mp4", ".wav", ".ogg", ".mov", ".avi", ".lock", ".log", ".pyc", ".class", ".o", ".so", ".dylib", ".exe", ".dll"]);
const MAX_WORKSPACE_FILES = 200;
const MAX_FILE_CHARS = 40_000;
const MAX_WORKSPACE_CHARS = 200_000;
// Surfed-material cap — the PROMPT budget (PROMPT_MAX_CHARS) is the real
// ceiling; surf may fill up to that, so we are not timid with the window.
// Per-segment stays at one page of text (3000 chars) for latency; the total
// tracks the max prompt so material can genuinely fill the room the turn
// leaves after chat history.
const SURF_MAX_SEGMENTS = Number(process.env.ER7_SURF_MAX_SEGMENTS ?? 12);
const SURF_MAX_SEGMENT_CHARS = 3000;
const SURF_MAX_TOTAL_CHARS = Number(process.env.ER7_SURF_MAX_TOTAL_CHARS ?? 24000);

function isTextFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (SKIP_EXT.has(ext)) return false;
  return true;
}

function workspaceEntries(absRoot, onNote, { maxFiles = MAX_WORKSPACE_FILES, maxChars = MAX_WORKSPACE_CHARS } = {}) {
  const entries = [];
  let readChars = 0;
  const walk = (dir, depth) => {
    if (entries.length >= maxFiles) return;
    if (depth > 8) return;
    let names;
    try {
      names = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    names.sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const ent of names) {
      if (entries.length >= maxFiles) return;
      if (ent.name.startsWith(".") && !SKIP_DIRS.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name)) continue;
        walk(full, depth + 1);
        continue;
      }
      if (!ent.isFile() || ent.isSymbolicLink()) continue;
      if (!isTextFile(ent.name)) continue;
      let stat;
      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }
      if (stat.size > MAX_FILE_CHARS) {
continue;
      }
      if (readChars + stat.size > maxChars) {
continue;
      }
      readChars += stat.size;
      entries.push({ abs: full, rel: full.slice(absRoot.length).replace(/^\//, ""), size: stat.size, mtimeMs: stat.mtimeMs });
    }
  };
  walk(absRoot, 0);
  return entries;
}

// Admit (or re-admit changed) workspace files into the session's REAL corpus.
// File content is stepped through the fold reader once per admission so the
// holograph/hyperlexicon are built from disk text, not from a model's retell.
async function admitWorkspaceEntries(session, entries, onNote) {
  if (!entries.length) return { admitted: 0, chars: 0 };
  if (!session.corpus) session.corpus = createCorpusSession();
  const index = session.corpusIndex ?? new Map();
  let admitted = 0;
  let chars = 0;
  let looked = 0;
  for (const e of entries) {
    const prev = index.get(e.rel);
    if (prev && prev.size === e.size && prev.mtimeMs === e.mtimeMs) continue;
    const text = readWorkspaceFile(e, onNote);
    if (text == null) continue;
    const res = admitChunked(session.corpus, { text, sourceId: e.rel });
    index.set(e.rel, { size: e.size, mtimeMs: e.mtimeMs });
    admitted += res.deduped ? 0 : 1;
    chars += text.length;
    const encounters = textEncounters(text, { source: `workspace:${e.rel}`, offset: 0 });
    for (const enc of encounters) {
      const turn = await session.reader.step(enc);
      if (turn?.tasks?.open && onNote) {
        for (const t of turn.tasks.open) {
          onNote({ move: "open_question", rel: e.rel, task_id: t.task_id ?? null, description: t.description ?? null });
        }
      }
      await yieldToEventLoop();
    }
    // LOOK AT IT — the native "looking" capacity, ported from the fold's
    // /visual machinery. Text whose formatting the plain-text reader is
    // reading WRONG (a table, a column, box-drawing, sub-sentence lines)
    // is rendered to an image and read by CV/OCR + a vision model, and the
    // looked-at reading is admitted as its own source — so the model
    // speaks from what the thing IS, not from the flat bytes it misread.
    if (onNote) {
      const gate = shouldLook({ fileName: e.rel, text });
      if (gate.look && session.lookIndex?.get(e.rel) !== `${e.size}:${e.mtimeMs}`) {
        // LaVar tells us if we are reading well — the misread-formatting
        // verdict is exactly what triggers the looking pass below.
        try {
          const grade = lavarGradeReading({ source: e.rel, text, propositions: [], weirdFormattingScore });
          onNote({ move: "lavar_reading", rel: e.rel, well: grade.readingWell, shouldLook: grade.shouldLook, signals: grade.signals ?? [], basis: grade.basis });
        } catch { /* grading must never block looking */ }
        try {
          const lookedText = await lookAtText(text, { source: e.rel, label: `er7-${e.rel.replace(/[^a-z0-9]+/gi, "-")}` });
          if (lookedText.text) {
            const lookRes = admitChunked(session.corpus, { text: lookedText.text, sourceId: `${e.rel}::look` });
            if (!lookRes.deduped) {
              looked += 1;
              const lookEncounters = textEncounters(lookedText.text, { source: `look:${e.rel}`, offset: 0 });
              for (const enc of lookEncounters) { await session.reader.step(enc); await yieldToEventLoop(); }
            }
            if (!session.lookIndex) session.lookIndex = new Map();
            session.lookIndex.set(e.rel, `${e.size}:${e.mtimeMs}`);
            onNote({ move: "look", rel: e.rel, reason: gate.reason, signals: gate.signals ?? [], boxes: lookedText.boxCount ?? 0, vision: Boolean(lookedText.visionRead) });
          }
        } catch (err) {
          if (onNote) onNote({ move: "look_error", rel: e.rel, error: err.message });
        }
      }
    }
  }
  session.corpusIndex = index;
  return { admitted, chars, looked };
}

// Look at the workspace's IMAGE files (currently skipped by the text scan —
// isTextFile refuses them) so the reading can actually SEE a diagram, a
// screenshot, a chart. Each image's looked-at reading is admitted as its own
// source, exactly like a text file. Bounded: MAX_LOOK_IMAGES per turn, and
// only files this session has not already looked at.
const MAX_LOOK_IMAGES = 6;
async function lookWorkspaceImages(session, absRoot, onNote) {
  if (!fs.existsSync(absRoot)) return { looked: 0 };
  const images = [];
  const walk = (dir, depth) => {
    if (depth > 6 || images.length >= MAX_LOOK_IMAGES) return;
    let names;
    try { names = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    names.sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const ent of names) {
      if (images.length >= MAX_LOOK_IMAGES) return;
      if (ent.name.startsWith(".") || SKIP_DIRS.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) { walk(full, depth + 1); continue; }
      if (!ent.isFile() || ent.isSymbolicLink()) continue;
      if (!isImageFileName(ent.name)) continue;
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      if (stat.size > 12 * 1024 * 1024) continue; // a 12MB image is not something to look at every turn
      images.push({ abs: full, rel: full.slice(absRoot.length).replace(/^\//, ""), size: stat.size, mtimeMs: stat.mtimeMs });
    }
  };
  walk(absRoot, 0);
  let looked = 0;
  for (const img of images) {
    const key = `${img.size}:${img.mtimeMs}`;
    if (session.lookIndex?.get(img.rel) === key) continue;
    try {
      const result = await lookAtImage(img.abs, { name: img.rel });
      if (result.text) {
        if (!session.corpus) session.corpus = createCorpusSession();
        const res = admitChunked(session.corpus, { text: result.text, sourceId: `${img.rel}::look` });
        if (!res.deduped) {
          looked += 1;
          const encs = textEncounters(result.text, { source: `look:${img.rel}`, offset: 0 });
          for (const enc of encs) { await session.reader.step(enc); await yieldToEventLoop(); }
        }
        if (!session.lookIndex) session.lookIndex = new Map();
        session.lookIndex.set(img.rel, key);
        if (onNote) onNote({ move: "look_image", rel: img.rel, boxes: result.boxCount ?? 0, connectors: result.edgeCount ?? 0, vision: Boolean(result.visionRead), settled: result.visionSettled ?? true, chars: result.text.length });
      }
    } catch (err) {
      if (onNote) onNote({ move: "look_error", rel: img.rel, error: err.message });
    }
  }
  return { looked };
}

function readWorkspaceFile(entry, onNote) {
  try {
    const text = fs.readFileSync(entry.abs, "utf8").slice(0, MAX_FILE_CHARS);
    return text;
  } catch (err) {
    if (onNote) onNote({ move: "read_error", rel: entry.rel, error: err.message });
    return null;
  }
}

// ── the field: surf's SECOND witness (GFP Pass 35, relative.js) ────────────
// The absolute-address ladder (executePrompt) is a key, a lookup, exact or
// nothing. The field is the OTHER way: recall by partial-cue resemblance,
// resolution by state. When the ladder returns a void or nothing, the field
// recalls what the question's words resemble — measured (the-fold c232779):
// lexical 215/240, the field 240/240 on the GFP battery.
function ensureField(session) {
  if (session.field) return session.field;
  const f = new Field({ spread: 0.25, steps: 1 });
  if (session.corpus) {
    for (const [sourceId, doc] of session.corpus.documents.entries()) {
      const text = String(doc?.text ?? doc ?? "").trim();
      if (!text) continue;
      // Admit as SENTENCE-CHUNKS, not whole docs: the field needs many nodes
      // (a rich vocabulary) for the null band to be meaningful — a handful of
      // whole documents makes every random cue overlap by topic word. Chunks
      // keep the temporal-adjacency synapses (sentences joined in order) that
      // the field's spread uses.
      const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.trim()).filter((s) => s.length > 30);
      for (const s of sentences) f.admit(s, { sourceId });
    }
  }
  session.field = f;
  return f;
}

function fieldRecall(session, cue, { max = SURF_MAX_SEGMENTS } = {}) {
  try {
    const f = ensureField(session);
    if (!f.size) return { recalled: [], band: null };
    const words = cue.toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 2).length || 1;
    const band = f.nullBand(words, { draws: 120 });
    const r = f.recallAgainstNull(cue, { band });
    if (r.kind !== "figure") return { recalled: [], kind: r.kind, band: r.band };
    const ranked = r.ranked.slice(0, max).filter((x) => x.activation > 0);
    const recalled = ranked.map((x) => ({
      text: String(x.node.text ?? "").slice(0, SURF_MAX_SEGMENT_CHARS),
      _ledger: { source: x.node.payload?.sourceId ?? null, heading: null, addressed_by: "field", bytes: null, activation: x.activation },
    }));
    return { recalled, kind: "figure", band: r.band };
  } catch {
    return { recalled: [] };
  }
}

// THE SURF — the real mechanical address ladder against the session's corpus.
// Returns the addressed segment(s) TEXT ONLY. The address (source, heading,
// byte range, addressed_by) is reported to the ledger/notes — it is NEVER
// placed in the model's context.
function surfTask(session, task, onNote, { composition = false } = {}) {
  if (!session.corpus || session.corpus.documents.size === 0) {
return { segments: [], void: true, reason: "no corpus yet" };
  }
  // COMPOSITION SURF: an essay needs MULTIPLE sources — one windowed segment
  // per corpus document (the web pages each carry their own theme), not the
  // single best address the one-shot organ returns. Each essay section then
  // has its own grounded source.
  if (composition && session.corpus.documents.size > 1) {
    const segments = [];
    for (const [sourceId, doc] of session.corpus.documents.entries()) {
      if (segments.length >= SURF_MAX_SEGMENTS) break;
      const text = String(doc?.text ?? doc ?? "").trim();
      if (!text || text.length < 50) continue;
      const capped = text.slice(0, SURF_MAX_SEGMENT_CHARS);
      segments.push({
        text: capped,
        _ledger: { source: sourceId, heading: null, addressed_by: "composition", bytes: [0, capped.length] },
      });
    }
    if (segments.length) {
      if (onNote) onNote({ move: "surfaced", operator: "SEG", fan: segments.length, docs: session.corpus.documents.size, composition: true });
      return { segments, void: false, addressedBy: true, composition: true };
    }
  }
  const result = executePrompt(session.corpus, task);
  if (onNote) onNote({ move: "surfaced", operator: result.operator ?? null, fan: Array.isArray(result.fan) ? result.fan.length : 0, docs: session.corpus.documents.size, resultGap: result.gap ?? null });
  // DEBUG: dump the raw surf result
  try { fs.writeFileSync("/tmp/er7-surf-debug.json", JSON.stringify({ docs: session.corpus.documents.size, operator: result.operator, gap: result.gap, fan: Array.isArray(result.fan) ? result.fan.map(f => ({ addressed_by: f.addressed_by, gap: f.gap, text: (f.text ?? "").slice(0, 60) })) : "not-array", keys: Object.keys(result) }, null, 2)); } catch {}

  // A truthy `.gap` is not always a hard refusal (addressDoc's no-outline
  // fallback still spreads real text beside a disclosed label) — only a
  // result with no text at all is unusable.
  const candidates = (result.fan ?? [result]).filter((c) => c?.text);
  if (!candidates.length) {
    const first = result.fan?.[0] ?? result;
    const gap = result.gap ?? first?.gap ?? "content_not_found";
    // SECOND WITNESS: the absolute ladder found nothing — the field recalls
    // what the question's words RESEMBLE. A real recall is kept (addressed_by
    // "field"); a recall inside the null band is not a recall, and the void
    // is disclosed as a void, never dressed up as a match.
    const field = fieldRecall(session, task);
    if (field.recalled.length) {
      if (onNote) onNote({ move: "surfaced", operator: "FIELD", fan: field.recalled.length, docs: session.corpus.documents.size, kind: field.kind, band: field.band ? { hi: field.band.hi } : null });
      return { segments: field.recalled, void: false, addressedBy: true, addressedByWitness: "field", band: field.band ? { hi: field.band.hi } : null };
    }
    if (onNote) onNote({ move: "void", gap, reason: result.reason ?? first?.reason ?? null });
    return { segments: [], void: true, gap, reason: result.reason ?? first?.reason ?? null };
  }

  // Rank by how firmly each candidate was addressed — real content activation
  // first (a clean content-match), then heading-addressed segments, then the
  // disclosed windowed/no-boundary fallbacks. Never by file-name luck.
  const rank = (c) => {
    const m = c.content_match;
    if (m && m.ambiguous === false && c.content_line != null) return 4;
    if (c.addressed_by === "heading") return 3;
    if (m && m.ambiguous === true) return 2;
    if (c.windowed || c.found === false || c.gap) return 1;
    return 0;
  };
  candidates.sort((a, b) => rank(b) - rank(a));
  const selected = candidates.slice(0, SURF_MAX_SEGMENTS);
  // WEAK-MATCH BOOST: if the best the absolute ladder returned is only a
  // disclosed windowed fallback (rank 1 — no clean content match, no heading),
  // ask the field whether the cue RESEMBLES a stronger passage. The field
  // joins the offered set, never replaces it; only a recall above the null
  // band counts (measured, never chosen).
  if (selected.length && rank(selected[0]) <= 1) {
    const field = fieldRecall(session, task);
    if (field.recalled.length) {
      // The boost only adds sources the absolute ladder did NOT already select
      // (selected, not segments — segments are built below, after the boost).
      const existingSources = new Set(selected.map((s) => s._ledger?.source).filter(Boolean));
      for (const r of field.recalled) {
        if (existingSources.has(r._ledger?.source)) continue;
        selected.push(r);
        existingSources.add(r._ledger?.source);
      }
      if (onNote) onNote({ move: "surfaced", operator: "FIELD+SEG", fan: selected.length, kind: field.kind, boost: field.recalled.length });
    }
  }
  const segments = [];
  let total = 0;
  for (const s of selected) {
    const text = String(s.text ?? "").slice(0, SURF_MAX_SEGMENT_CHARS);
    if (!text) continue;
    total += text.length;
    if (total > SURF_MAX_TOTAL_CHARS) break;
    segments.push({
      text,
      // address ledger, never model context
      _ledger: { source: s.source ?? null, heading: s.heading ?? null, addressed_by: s.addressed_by ?? null, bytes: [s.byte_start ?? null, s.byte_end ?? null] },
    });
    if (onNote) {
      const l = segments[segments.length - 1]._ledger;
}
  }
  return { segments, void: false, addressedBy: segments.length > 0 };
}

// --- ollama -------------------------------------------------------------------

const PREFLIGHT_CACHE_MS = 4000;
let _preflightCache = { ts: 0, models: null };
async function ollamaReachable({ timeoutMs = 3000 } = {}) {
  const now = Date.now();
  if (_preflightCache.models !== null && now - _preflightCache.ts < PREFLIGHT_CACHE_MS) {
    return _preflightCache.models;
  }
  try {
    const tags = await offeredOllamaModels({ timeoutMs });
    const models = Array.isArray(tags?.models) ? tags.models : [];
    _preflightCache = { ts: now, models };
    return models;
  } catch {
    _preflightCache = { ts: now, models: null };
    return null;
  }
}

// --- concurrency gate --------------------------------------------------------
// One slot PER MODEL for Ollama generation (num_parallel=1). Reading pipelines
// run concurrently; generation is serialized PER MODEL, never globally: Ollama
// queues per model (FIFO, OLLAMA_NUM_PARALLEL=1 default), so a global slot
// would let one user's long turn on gemma2:2b block every other user's turn
// on qwen3:30b for no reason. Same-model requests serialize exactly as the
// daemon would serialize them anyway. A different model is a different lane.
const generationSlots = new Map(); // model -> Promise
export function generationSlotHealth() {
  const out = {};
  for (const [model, slot] of generationSlots) out[model] = slot ? "busy" : "idle";
  return out;
}
async function withSlot(model, work) {
  const prev = generationSlots.get(model) ?? Promise.resolve();
  const run = prev.then(work, work);
  generationSlots.set(model, run.catch(() => {}));
  try {
    return await run;
  } finally {
    if (generationSlots.get(model) === run.catch(() => {})) generationSlots.delete(model);
  }
}

// Yield to the event loop between CPU-heavy steps so other sessions can
// make progress on their own reading pipelines.
function yieldToEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}

export async function offeredOllamaModels({ timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${OLLAMA}/api/tags`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`ollama /api/tags: ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Keep a model resident: a minimal /api/generate against it resets Ollama's
// keep_alive countdown without doing real work. Bounded time, cached in-flight
// so an interval tick can't stack duplicate loaders on the same model. Names
// come in er7-aliased and are un-prefixed for the raw Ollama endpoint.
const _hot = new Set();
const _hotting = new Map();
const hotModelName = (model) => String(model ?? "").replace(/^er7:/, "");
export async function keepModelHot(model) {
  const m = hotModelName(model);
  if (!m) return;
  if (OLLAMA_KEEP_ALIVE_S <= 0) return;
  _hot.add(m);
  if (_hotting.has(m)) return _hotting.get(m);
  const p = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 300000);
    try {
      const res = await fetch(`${OLLAMA}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          model: m,
          prompt: "",
          stream: false,
          keep_alive: OLLAMA_KEEP_ALIVE_S + "s",
          // Pin the SAME context real turns use, so the resident copy matches
          // what requests run under — and so a warm-load doesn't squat on
          // Ollama's huge 262k default and evict other models.
          options: { num_predict: 1, num_ctx: Math.max(NUM_CTX, Math.ceil(PROMPT_MAX_CHARS / 3) + CALL_MAX_TOKENS) },
        }),
      });
      if (!res.ok) throw new Error(`keep-warm /api/generate: ${res.status}`);
      await res.arrayBuffer();
      return true;
    } catch (err) {
      console.error(`[keepModelHot] ${m}: ${err.message}`);
      return false;
    } finally {
      clearTimeout(timer);
      _hotting.delete(m);
    }
  })();
  _hotting.set(m, p);
  return p;
}

// Models worth holding hot even before the first request (ER7_HOT_MODELS:
// comma-separated). Warmed at proxy boot, then kept by the interval below.
export function hotModelSet() {
  for (const m of String(process.env.ER7_HOT_MODELS ?? "")
    .split(",").map((s) => hotModelName(s)).filter(Boolean)) _hot.add(m);
  return new Set(_hot);
}

const CALL_MAX_TOKENS = 1024;
const CALL_RETRIES = 2;
// Degrees in Kelsen (K°): how tightly the composition is bound to the
// material's normative ground — Kelsen's Stufenbau, where validity flows
// down a hierarchy of degrees and each level is bound by the norm above.
// HIGH Kelsen-degrees (the default) — literal, grounded, faithful to the
// retained text. LOWER Kelsen-degrees let the model compose more
// IMPRESSIONISTICALLY (freer, looser prose) at the cost of faithfulness.
// This is our own gauge, driven by the SHAPE of the target (see
// kelsenFromShape), not a physics metaphor. ER7_KELSEN sets the default; a
// caller may pass kelsen per turn. 1.0 = fully bound, 0.1 = fully free.
const DEFAULT_KELSEN = Number(process.env.ER7_KELSEN ?? 0.9);
// A MAX prompt budget, not a timid one: the context is filled to near this
// ceiling every turn, chat history with precedence (the turn's own recent
// line of talk is what continuity lives on), then masked/grounded material
// fills the room that remains. text length ≈ 4 chars/token. The Ollama
// request carries num_ctx >= this + output so the budget is actually
// reachable; ER7_NUM_CTX raises it on slower/smaller deployments.
const PROMPT_MAX_CHARS = Number(process.env.ER7_MAX_PROMPT_CHARS ?? 28000);
const NUM_CTX = Number(process.env.ER7_NUM_CTX ?? 8192);
const MSG_OVERHEAD_CHARS = 64;
// Post-processing latency guard: this many ms max per turn for the pyodide
// lint + dependency reorder. Warmed at boot; if it ever exceeds this, the
// original text is returned untouched so turns never stall on the tooling.
const POSTPROCESS_TIMEOUT_MS = Number(process.env.ER7_POSTPROCESS_TIMEOUT_MS) || 3000;
// The discourse at three resolutions (vendored the-fold resolutions.js, P171):
// 0 = nearest verbatim only, 1 = + atmosphere, 2 = + lens, 3 = + paradigm.
const RESOLUTIONS_LEVEL = (() => { const v = Number(process.env.ER7_RESOLUTIONS ?? ""); return [0, 1, 2, 3].includes(v) ? v : 3; })();
// The KELSEN MODALITY — the norm-hierarchy linter's force. Default (1) is the
// hyper-grounded posture: conflicting claims resolve by the declared order,
// and resolutions are shown. For CREATIVE work (a poem, a speculative piece,
// a fiction) the modality is turned DOWN (0 or 0.5): the linter still runs
// and names conflicts, but a tie or an unresolved pair is not a failure —
// creativity may hold tension, never a silent pick. ER7_KELSEN_MODALITY.
const KELSEN_MODALITY = (() => { const v = Number(process.env.ER7_KELSEN_MODALITY ?? ""); return [0, 0.5, 1].includes(v) ? v : 1; })();

async function* streamOllamaChat(model, messages, { maxTokens, json, onNote, kelsen, logitsBias, signal } = {}) {
  for (let attempt = 0; attempt < CALL_RETRIES; attempt++) {
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    if (signal) {
      if (signal.aborted) throw new Error("aborted");
      signal.addEventListener("abort", onAbort, { once: true });
    }
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
const res = await fetch(`${OLLAMA}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          // Keep the model resident for the DURATION of the work. A long
          // composition runs 5-10+ minutes, longer than Ollama's default 5-min
          // keep_alive — without this the model unloads mid-essay and the draw
          // hangs retrying. This is a per-request floor, NOT the keep-warm
          // machinery: even with ER7_KEEP_ALIVE_S=0 the model stays up for the
          // time it takes to answer, then Ollama's own unload applies.
          keep_alive: `${Math.max(OLLAMA_KEEP_ALIVE_S, 1200)}s`,
          ...(json ? { format: json === true ? "json" : json } : {}),
          options: {
            num_predict: maxTokens ?? CALL_MAX_TOKENS,
            num_ctx: Math.max(NUM_CTX, Math.ceil(PROMPT_MAX_CHARS / 3) + (maxTokens ?? CALL_MAX_TOKENS)),
            // KELSEN-DEGREES → Ollama's native temperature: high Kelsen
            // (bound to the material) maps to low temperature; low Kelsen
            // (impressionistic) maps high. Our gauge is how tightly the
            // composition is bound to the ground; Ollama's sampler parameter
            // is how we express that to the model.
            temperature: 0.1 + (1 - (kelsen ?? DEFAULT_KELSEN)) * 0.8,
            // LOGIT PUSHING: the voice pipeline's mechanism for making the
            // mouth mechanical. For a one-claim call the output is tiny, so
            // we can bias the sampler toward the claim's own tokens
            // (gemma2-tokenizer.mjs → logitBiasFor). Positive bias on the
            // claim's words pulls the sampling toward them — fidelity
            // becomes mechanical, not hoped for.
            ...(logitsBias && Object.keys(logitsBias).length ? { logits_bias: logitsBias } : {}),
          },
        }),
      });
      if (!res.ok) throw new Error(`ollama ${res.status}`);
const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let emittedTokens = 0;
      const TOKEN_BUDGET = maxTokens ?? CALL_MAX_TOKENS;
      let overBudget = false;

      while (true) {
        if (signal?.aborted) throw new Error("cancelled");
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line in buffer
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const obj = JSON.parse(trimmed);
            if (obj.error) throw new Error(`ollama: ${obj.error}`);
            if (obj.message?.content) {
              // HARD CAP: never let the model run away past its budget. The
              // tip of consciousness must not loop. Count output tokens; when
              // the budget is exhausted, stop yielding AND stop the reader so
              // the server stops generating (abort, not just stop reading).
              emittedTokens++;
              if (emittedTokens > TOKEN_BUDGET) {
                overBudget = true;
                ctrl.abort();
                yield { done: true, truncated: true, prompt_eval_count: 0, eval_count: emittedTokens };
                return;
              }
              yield obj.message.content;
            }
            if (obj.done) {
              yield { done: true, truncated: overBudget, prompt_eval_count: obj.prompt_eval_count ?? 0, eval_count: obj.eval_count ?? 0 };
              return;
            }
          } catch { /* skip malformed lines */ }
        }
      }
      return; // stream ended without done=true
    } catch (err) {
      if (attempt === CALL_RETRIES - 1) throw err;
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
    }
  }
}

// --- turn execution -----------------------------------------------------------

function makeDigest(sessionId, session, fold, ledger, hyperlexicon) {
  const stats = ledger.diagnostics();
  const composition = Object.values(hyperlexicon.composition ?? {});
  const parts = [];
  parts.push(`[EOReader7 session=${sessionId} turn=${session.turnCount}: relations=${stats.relationEdges}, bindings=${stats.referentBindings}, hyperlexicon=${composition.length}]`);
  const known = composition.filter((e) => e.standing === "given");
  const candidates = composition.filter((e) => e.standing === "candidate");
  if (HYPERLEXICON_ON && known.length) parts.push(`[Known compositions: ${known.map((e) => `${e.left}→${e.right}`).join(", ")}]`);
  if (HYPERLEXICON_ON && candidates.length) parts.push(`[Candidate compositions: ${candidates.slice(0, 10).map((e) => `${e.left}→${e.right}(${e.meta?.independentSupport ?? 0})`).join(", ")}]`);
  return {
    digest: parts.join("\n"),
    stats,
    composition,
    known,
    candidates,
  };
}

// --- the three resolutions (the-fold, vendored) ------------------------------
// Summarization by the terrain, never model compression: the discourse is
// restated at three grains by the reading's own organs (atmosphere over the
// whole run, lens on what is said about the active referents, paradigm on
// what recurs). Recent material stays verbatim; these blocks are the
// paraphrase resolutions above it. Addresses never reach the mouth —
// resolutionBlocks' `.text` is struck of them (firewall.js), `.lines` keep
// theirs for the record.
function chatTranscript(chatHistory = []) {
  const transcript = [];
  let turn = 0;
  let lastAnswer = "";
  for (const m of chatHistory ?? []) {
    if (!m || typeof m.content !== "string") continue;
    if (m.role === "user") { transcript.push({ turn: ++turn, question: m.content, answer: lastAnswer, refs: [] }); lastAnswer = ""; }
    else if (m.role === "assistant") lastAnswer = m.content;
  }
  return transcript;
}

// The notes the Lens reads: the fold's own EOHyperedge@1 entries, one ledger
// row per edge, endpoints as their SURFACES — the referent index resolves a
// surface; the perceiver's own `ref`s live in a different id space. sources/
// witnesses give the blocks their standing phrases.
function notesFromEdges(graphEntries = []) {
  const notes = [];
  for (const e of graphEntries ?? []) {
    if (e?.schema !== "EOHyperedge@1" || !e?.relation) continue;
    const parts = e.participants ?? [];
    const end = (p) => p?.surface ?? p?.ref ?? p?.surfaceKey ?? null;
    const subject = end(parts[0]);
    if (!subject) continue;
    const object = end(parts.length > 1 ? parts[parts.length - 1] : null) ?? "?";
    notes.push({ subject, verb: e.relation, object, end1: subject, end2: object, label: e.relation, witnesses: e.witness ? [e.witness] : [], sources: 1 });
  }
  return notes;
}

// The conversation's referent index — a PROJECTION of the reading's own log
// (P171, the-fold/reading-log.js), never a scan over names. The workspace
// files and the chat are both stepped through the same constitutional
// reader, so the log is the record and this index is its identity face:
// EOReferent@1 surfaces under the session's fold + namesCorefer, no case, no
// scan. The reader's log is immutable (append-only); we rebuild the
// projection only when the log has actually grown, and reuse it otherwise.
// Used ONLY by the resolution blocks — nothing in it ever reaches the model's
// context.
function sessionReferentIndex(session, onNote) {
  const log = session.reader?.getLog?.() ?? [];
  if (!log.length) return null;
  const last = log[log.length - 1];
  const sig = `${log.length}:${(last?.schema ?? "?")}:${last?.sequencePosition ?? ""}`;
  if (session.indexSig === sig && session.referents) return session.referents;
  const started = Date.now();
  let index = null;
  try {
    index = readingIndexFromLog(log, { reconstruct, diaNorm, namesCorefer, surfaceIndex, surfacesIn });
  } catch {
    index = null;
  }
  session.indexSig = sig;
  session.referents = index;
  if (onNote) onNote({ move: "referent_index", referents: index?.referents?.size ?? 0, events: index?.events?.length ?? 0, encounters: index?.encounters ?? 0, ms: Date.now() - started, basis: index?.basis ?? null });
  return index;
}

// ── MURCH, THE EDITOR PASS ─────────────────────────────────────────────────
// The essay's first draft is written by Wolfe; MURCH then reads the assembled
// whole and fixes its SHAPE — the way Walter Murch edits a film: the film is
// made in the cut, and the edit is where it becomes a composition rather than
// a pile of shots. This replaces the loop-on-loops — three separate rewrite
// passes (per-section EVA correction, shape-check REC, strike revision) each
// patching one symptom in isolation. Murch is given the MACHINE-TYPED findings
// across the whole essay (opening without a thesis, no closing, a section that
// repeats the prior, meta-commentary, a theme uncovered) and the essay folded
// at resolutions — never the raw bytes, never an open-ended "improve this".
// Each finding becomes one bounded rewrite that lands as a ledger revision;
// the shape is re-checked. Murch is a WRITER'S second pass, not a judgment: he
// is told exactly what to fix and writes the fixed prose.
function aggregateEssayFindings({ sections, documentLines, material, shapeCheck }) {
  const findings = [];
  if (shapeCheck) {
    for (const f of shapeCheck.failures ?? []) findings.push({ ...f, sectionIndex: null });
  }
  for (let i = 0; i < documentLines.length; i++) {
    const r = satisfactionOfSection(documentLines[i], {
      theme: sections[i] ?? "",
      material,
      prior: i > 0 ? documentLines[i - 1] : "",
    });
    for (const f of r.failures) findings.push({ ...f, sectionIndex: i });
  }
  return findings;
}

// ── THE ESSAY AS A CONVERSATION, FOLDED AT RESOLUTIONS ─────────────────────
// The accumulated prose is NOT handed to the mouth whole — that violates the
// point of resolutions (past content is folded COMPUTED, never dumped). Each
// written section is one exchange of the essay's own conversation: its void
// question and its written answer. resolutionBlocks reads that transcript the
// same way it reads a chat — atmosphere (where the essay stands), lens (what
// is said about its active referents), paradigm (what recurs) — and the mouth
// is handed the fold, not the bytes. This is what lets WOLFE's later sections
// COMPOSE with the earlier ones instead of restarting cold: he knows what the
// piece has established without being buried in it.
function essayResolutions({ sections, documentLines, index, rawEntries, onNote }) {
  const written = [];
  for (let j = 0; j < documentLines.length; j++) {
    const text = String(documentLines[j] ?? "").trim();
    if (!text) continue;
    written.push({ turn: j + 1, question: String(sections[j] ?? ""), answer: text, refs: [] });
  }
  if (!written.length) return null;
  try {
    const notes = notesFromEdges(rawEntries);
    const r = resolutionBlocks({
      level: RESOLUTIONS_LEVEL,
      question: String(sections[written.length] ?? sections.at(-1) ?? ""),
      transcript: written,
      index,
      notes,
      voids: [],
      records: [],
      dmdWindow,
      prominence: null,
    });
    if (!r.text) return null;
    if (onNote) onNote({ move: "essay_resolutions", level: r.level, sections: written.length, active: r.active?.ids?.length ?? 0 });
    return r.text;
  } catch (err) {
    if (onNote) onNote({ move: "essay_resolutions_failed", error: err.message });
    return null;
  }
}

export async function runProxyTurn({ sessionId, userId = null, model, task, chatHistory = [], discourse = "", workspace = "", holonLevel = "section", resumeAnswered = [], resumePlan = null, kelsen = null, signal = null }, onToken, onNote = null, onThinking = null) {
  const usage = { promptTokens: 0, completionTokens: 0 };
  const session = getSession(sessionId);
  _hot.add(model); // this turn is using it — hold it resident after

  // The person's durable theory of mind — loaded at the turn's start so the
  // character carries continuity across sessions, while this conversation's
  // SPECIFICS stay in chatHistory. A null userId means an anonymous caller:
  // the durable model is a no-op, never a fabrication about who they are.
  const speakerModel = userId ? loadSpeakerModel(userId) : null;
  const durable = speakerModel ? durableFacts(speakerModel) : [];

  // 0. Preflight — fail fast, don't hang.
const modelsUp = await ollamaReachable();
  if (modelsUp === null) {
    if (onNote) onNote({ move: "upstream_down", target: OLLAMA });
    throw new Error(`Ollama upstream ${OLLAMA} is not responding — check 'er7-proxy log' and that Ollama is running.`);
  }
  const modelKnown = modelsUp.some((m) => (m.name ?? m.model) === model);
  if (modelsUp.length && !modelKnown) {
    if (onNote) onNote({ move: "model_missing", model, available: modelsUp.map((m) => m.name ?? m.model) });
  }

  // 1. Workspace — admit real files into the session corpus, then SURF the
  // task. The model is never shown an address; it is shown the content the
  // surfer mechanically addressed ("as if from nowhere").
  const workspaceStats = { files: 0, chars: 0, segments: 0, refusals: 0 };
  let surfacedSegments = [];
  let surfVoid = false;
  let surfVoidInfo = null;
  if (workspace && fs.existsSync(workspace)) {
    if (onNote) onNote({ move: "scanning", root: workspace });
    const entries = workspaceEntries(workspace, onNote);
    if (onNote) onNote({ move: "files_found", count: entries.length, chars: entries.reduce((a, e) => a + e.size, 0) });
    const admit = await admitWorkspaceEntries(session, entries, onNote);
    workspaceStats.files += entries.length;
    workspaceStats.chars += admit.chars;

    // Step surfaced segment text through the fold too, so holograph/hyperlexicon
    // build from the code being discussed — not just the task prose.
    if (admit.admitted > 0 && onNote) onNote({ move: "admitted", files: admit.admitted });

    // LOOK AT IT — the native "looking" capacity: images in the workspace
    // are read by CV/OCR + a vision model and admitted as sources, so the
    // reading can actually SEE a diagram/screenshot/chart it would otherwise
    // never be given (the text scan refuses them).
    const lookedImages = await lookWorkspaceImages(session, workspace, onNote);
    if (lookedImages.looked > 0 && onNote) onNote({ move: "look_images_done", files: lookedImages.looked });
  }

  // 1.5 DEF THE VOID BY ASKING QUESTIONS, THEN HUNT ITS SHAPE. The essay's
  // shape is NOT the source's own headings — it is the QUESTIONS the piece
  // must answer. We ask them FIRST (from the task + topic; the reading is
  // still empty, so no material can steer the shape), then Gore HUNTS each
  // question to find the shape of what's wanted: each question is a void,
  // and its hunt finds the material that fills it. Wikipedia is an index,
  // primary sources are the material.
  const topic = topicPhrase(task);
  // The reading state the born gate consults: what the hunt actually found.
  // Available BEFORE the full read: sources retained + the reader's running
  // state. `stats`/`session.referents` fill in later (the enriched re-ask).
  const readingState = (partial = {}) => ({
    referents: session.referents?.referents?.size ?? 0,
    relations: partial.relations ?? 0,
    sources: session.webSources?.size ?? 0,
    disputes: (session.lastPageSurprise?.salient ?? 0) > 2,
    surprise: session.lastPageSurprise?.salient ?? 0,
  });
  const preVoid = voidCellsFor({ topic, question: task, openQuestions: [], shadowReferents: [], reading: readingState() });
  // The essay's SECTIONS are the CONTENT cells (grounded prose about the
  // subject); the shape-instrument cells steer internally but are not reader
  // sections. The seed question is still the first content question.
  const voidQuestions = preVoid.cells.filter((c) => c.relevant && c.essay).map((c) => c.question);
  if (onNote) onNote({ move: "void_questions", of: voidQuestions.length, cells: `${preVoid.cells.filter((c) => c.relevant && c.essay).length} content / ${preVoid.cells.filter((c) => c.relevant && !c.essay).length} shape of ${preVoid.relevant} relevant`, questions: voidQuestions.slice(0, 5) });
  // Gore's initial gather: hunt the FIRST question (the most basic: "What is
  // X?") to seed the reading — then the per-section loop below strikes each
  // remaining question for its own shape.
  // The SEED QUERY is the clean TOPIC, never the first void question — a
  // question like "What is the bongo antelope, marked off from everything
  // adjacent to it — what space is this essay..." is a terrible web search
  // string (measured: it returned nothing, so the ground was the chat text
  // alone and every section failed grounding). The topic is a real search
  // term; the void questions are the SECTIONS, not the search queries.
  const seedQuery = topic;
  const webResult = await searchAndAdmitWeb(session, sessionId, seedQuery, onNote, { move: "gather" });
  const hasWeb = webResult.pages > 0;

  // 2. Surf AND fold the conversation itself: the chat history is admitted to
  // the same corpus session as the workspace (unique per-turn sourceId, so
  // the corpus's concat-on-readmission guard is never tripped), and the fold
  // reader steps it alongside the workspace text. Prior turns then hold real
  // referents the surfer can address — the model is anchored to what IT said
  // before, not left to ad-lib continuity.
  const materialLines = [];
  if (discourse) materialLines.push(`[System Context]: ${discourse}`);
  for (const m of chatHistory) materialLines.push(`[${m.role}]: ${m.content}`);
  materialLines.push(`[user]: ${task}`);
  const materialText = materialLines.join("\n\n");

  if (materialText.trim()) {
    if (!session.corpus) session.corpus = createCorpusSession();
    // Delta admission: admit only what wasn't already admitted. Prefix-aware,
    // so a client that truncates/rewrites history (history isn't always a
    // strict extension) still gets its new tail admitted rather than
    // silently skipping forever.
    const prevText = session.lastChatText ?? "";
    const delta = materialText.startsWith(prevText)
      ? materialText.slice(prevText.length)
      : materialText;
    if (delta.trim().length >= 8) {
      const srcId = `chat:${sessionId}:turn-${session.turnCount}${materialText.startsWith(prevText) ? "" : ":reset"}`;
      admitChunked(session.corpus, { text: delta, sourceId: srcId });
      if (onNote) onNote({ move: "conversation_folded", sourceId: srcId, chars: delta.length, reset: !materialText.startsWith(prevText) });
    }
    session.lastChatText = materialText;
  }
const encounters = textEncounters(materialText, { source: `proxy:session:${sessionId}`, offset: 0 });
  if (onNote) onNote({ move: "reading", count: encounters.length, chars: materialText.length });

  for (const enc of encounters) {
    const turn = await session.reader.step(enc);
    if (turn?.tasks?.open && onNote) {
      for (const t of turn.tasks.open) {
        onNote({ move: "open_question", task_id: t.task_id ?? null, description: t.description ?? null, questions: t.questions ?? [] });
      }
    }
    await yieldToEventLoop();
  }
  const fold = session.reader.getFold();
  session.turnCount++;

  // Reader's task log — the "little logic notes".
  const taskLog = session.reader.getTasks?.() ?? [];
  if (onNote && taskLog.length) {
    for (const t of taskLog) {
      if (t?.status === "open" || t?.result) {
        onNote({ move: "reader_note", task_id: t.task_id ?? null, description: t.description ?? null, result: t.result ?? null });
      }
    }
  }

  const rawEntries = fold.graphEntries ?? [];
  const ledger = createRelationCompositionLedger(rawEntries);
  const stats = ledger.diagnostics();
  const observed = acquireCompositionCandidates(rawEntries, { minWitnesses: 1 });
  const hyperlexicon = admitHyperlexiconCandidates(createHyperlexicon(), observed.map((c) => ({
    left: c.left, right: c.right, giver: GIVER,
    witnesses: (c.witnesses ?? []).slice(0, 3).map((w) => w?.[0]).filter(Boolean),
    meta: { independentSupport: c.meta?.support ?? 0, rememberedLeft: false, rememberedRight: false },
  })));

  if (onNote) onNote({ move: "composed", relations: stats.relationEdges, bindings: stats.referentBindings, hyperlexicon: Object.keys(hyperlexicon.composition ?? {}).length });

  // 3. SURF the task against the session corpus — the mechanical address
  // ladder (source→heading→content→window). Content only reaches the model
  // inside surfacedSegments, or a DISCLOSED void fact (P32's searched-void
  // pattern: a fact about what the corpus does NOT hold, never a behavioral
  // instruction stacked on top of it).
  if (session.corpus && session.corpus.documents.size > 0) {
    // A generation task (essay/paper/report/spec — any task with material to
    // write from) wants the multi-doc surf: one windowed segment per source,
    // so each section has its own grounded material — not the single best
    // address a one-shot answer needs.
    const looksComposition = /\b(essay|write|explain|describe|summarize|outline|compose|report|discuss|analyze|paper|review|spec|guide|tell\s+me\s+about)\b/i.test(task);
    const surf = surfTask(session, task, onNote, { composition: looksComposition });
    surfacedSegments = surf.segments;
    surfVoid = surf.void;
    surfVoidInfo = surf.void ? { gap: surf.gap ?? "content_not_found", reason: surf.reason ?? null } : null;
    workspaceStats.segments = surfacedSegments.length;
    if (surf.void) workspaceStats.refusals = 1;
  } else if (onNote) {
}

  // 3.5 THE THREE RESOLUTIONS — the discourse restated by the reading's own
  // organs at three grains (atmosphere / lens / paradigm). This is
  // summarization BY THE TERRAIN, never model compression; the most recent
  // material reaches the model VERBATIM (the surfaced segments below), and
  // these blocks are the paraphrase resolutions above it.
  let resolutions = null;
  if (RESOLUTIONS_LEVEL > 0) {
    const index = sessionReferentIndex(session, onNote);
    if (index) {
      const transcript = chatTranscript(chatHistory);
      const notes = notesFromEdges(rawEntries);
      const started = Date.now();
      try {
        resolutions = resolutionBlocks({
          level: RESOLUTIONS_LEVEL,
          question: task,
          transcript,
          index,
          notes,
          voids: [],
          records: [],
          dmdWindow,
          prominence: null,
        });
      } catch (err) {
        if (onNote) onNote({ move: "resolutions_failed", error: err.message });
      }
      if (onNote && resolutions) {
        onNote({
          move: "resolutions", level: resolutions.level,
          active: resolutions.active ?? null,
          atmosphere: resolutions.atmosphere ? { basis: resolutions.atmosphere.basis } : null,
          lens: resolutions.lens ? { windows: resolutions.lens.windows, cuts: resolutions.lens.cuts } : null,
          paradigm: resolutions.paradigm ? { basis: resolutions.paradigm.basis, window: resolutions.paradigm.window } : null,
          ms: Date.now() - started,
        });
      }
    }
  }

  // 4. Build grounding digest
  const digestInfo = makeDigest(sessionId, session, fold, ledger, hyperlexicon);
  let readingDigest = digestInfo.digest;
  if (WIKIPEDIA_ON) {
    const wikiNotes = await enrichFromWikipedia(digestInfo.composition);
    if (wikiNotes.length > 0) {
      readingDigest += `\n\nA reference on the terms at play:\n${wikiNotes.map((w) => `- ${w.term}: ${w.snippet}`).join("\n")}`;
      if (onNote) onNote({ move: "wiki_lookup", notes: wikiNotes.map((w) => w.term) });
    }
  }
  // WIKISOURCE — the hyperlexicon's PRIMARY-SOURCE door. The composition's
  // terms can name a public-domain work (or an author/speaker a work covers);
  // when one resolves on Wikisource, the FULL text is admitted to the corpus
  // and stepped through the reader — the same admission a web source gets —
  // so the reading absorbs the primary bytes, not a secondhand digest. The
  // hyperlexicon then reads real relations from the work itself. Never a
  // guess: only a page that actually exists resolves.
  if (WIKISOURCE_ON && digestInfo.composition?.length) {
    // The admission below is BLOCKING setup before the first draw (fetch +
    // reader-step up to 11K chars of primary text). Ollama's keep_alive
    // expires during it, so the first draw cold-loads and can blow the job
    // timeout. This is NOT keep-warm (which stays off): it is a scoped
    // residency ping for the duration of active setup work, cleared after.
    const residentTimer = keepResidentDuringSetup();
    try {
    const hlTerms = [...new Set(
      Object.values(digestInfo.composition)
        .filter((e) => e?.standing === "given")
        .flatMap((e) => [e.left, e.right].map((s) => String(s ?? "").trim()).filter(Boolean)),
    )].slice(0, WIKI_MAX_CONCEPTS);
    const primary = [];
    for (const term of hlTerms) {
      const got = await wikisourceText(term);
      if (got) primary.push({ term, ...got });
    }
    for (const p of primary) {
      const srcId = `wikisource:${sessionId}:${p.term}`;
      admitChunked(session.corpus, { text: p.text, sourceId: srcId });
      const encounters = textEncounters(p.text, { source: srcId, offset: 0 });
      let surprise = { salient: 0 };
      for (const enc of encounters) {
        const step = await session.reader.step(enc);
        const s = step?.surprise;
        if (!s) { await yieldToEventLoop(); continue; }
        if ((s.expectationEffects?.length ?? 0) > 0 || (s.recanonicalizations?.length ?? 0) > 0) surprise.salient++;
      }
      // Keep the shadow + a note so the reader's movement is disclosed, and
      // fold the primary source INTO the digest so the mouth speaks from it.
      session.shadow.push({ url: `https://en.wikisource.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`, title: p.title, seenAt: new Date().toISOString(), chars: p.text.length, resolution: "fine", reading: surprise.salient });
      readingDigest += `\n\n[A primary source: ${p.title}]\n${p.text.slice(0, 3000)}${p.text.length > 3000 ? "…" : ""}`;
      if (onNote) onNote({ move: "wikisource_primary", term: p.term, title: p.title, chars: p.text.length, salient: surprise.salient });
    }
    } finally {
      clearInterval(residentTimer);
    }
  }
  if (resolutions?.text) {
    readingDigest += `\n\n[The conversation at three resolutions]\n${resolutions.text}`;
  }

  // ── void-detection: steer answer shape ───────────────────────────────────
  // Zero the space first, then see what is still empty. A greeting needs one
  // sentence; a command needs acknowledgment; a research question needs
  // grounded material; a void needs a disclosed fact (P32). Composition
  // tasks decompose into brief grounded sections. This steers the model
  // toward the proper length and modality without relying on the model to
  // figure out the shape itself — the shape is the READING's verdict.
  const answerShape = detectAnswerShape(task, workspaceStats.files > 0, hasWeb, surfVoid, surfacedSegments, resolutions);
  if (onNote) onNote({ move: "answer_shape", shape: answerShape.shape, modality: answerShape.modality });

  // 5. Build messages for Ollama. THE MODEL IS THE MOUTH — the prompt speaks
  // the way a collaborator speaks, never as an instrument. No "you are a
  // reading instrument", no apparatus names, no session ids, no relation
  // counts. The essay's user-turn is in the essay's voice; the surfaced
  // material is "here's what came up", not "material was surfaced from the
  // workspace" (the-fold firewall.js: nothing here names a part of this
  // instrument, so there is no word to borrow).
  const readingContext = resolutions?.text
    ? `\n\nWhere the conversation stands:\n${resolutions.text}`
    : "";
  const systemCore = [
    // The standing character — the same neutral voice every session begins
    // with, plus the durable theory of mind (what the person has asserted
    // and its standing), type-level only. Never a persona name, never a role.
    NEUTRAL_CHARACTER,
    ...(durable.length ? [`\nWhat you remember about this person (from before):\n${durable.map((f) => `- ${f}`).join("\n")}`] : []),
    // Composition: the frame is "we're writing an essay about X" — never an
    // instruction to the model about its own identity or process.
    answerShape.shape === "composition"
      ? `\nWe're working on a piece about ${topicPhrase(task)}.`
      : "\nYou're helping answer a question. Here's the context we have.",
    discourse ? `\n${discourse}` : null,
    readingContext || null,
    surfVoidInfo
      ? `\n\nWe looked for something on this and couldn't find it (${surfVoidInfo.gap}). Say plainly that nothing here answers it, rather than answering from something else.`
      : null,
  ].filter(Boolean).join("\n");

  // Chat history precedence: walk from the most recent message backwards and
  // keep as much as the budget permits after the essential system context and
  // the turn's own task. Older messages are the first thing to give way.
  const taskLen = String(task).length + MSG_OVERHEAD_CHARS;
  const systemLen = systemCore.length + MSG_OVERHEAD_CHARS;
  let chatLen = 0;
  const keptChat = [];
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const m = chatHistory[i];
    const cost = String(m?.content ?? "").length + MSG_OVERHEAD_CHARS;
    if (systemLen + taskLen + chatLen + cost > PROMPT_MAX_CHARS) break;
    keptChat.unshift({ role: m.role, content: m.content });
    chatLen += cost;
  }

  // Surfed material fills what remains — the most-relevant segments first,
  // truncated only when the budget (not caution) demands it.
  const materialRoom = Math.max(0, PROMPT_MAX_CHARS - systemLen - taskLen - chatLen);
  const material = [];
  let used = 0;
  for (const s of surfacedSegments) {
    const text = String(s.text ?? "");
    if (used + text.length > materialRoom) break;
    material.push(text);
    used += text.length;
  }

  let systemContent = systemCore;
  if (material.length) {
    systemContent += `\n\nHere's what came up on this:\n\n"""\n${material.join("\n\n")}\n"""`;
  }
  // Verbatim snips (citations) available to the composition so the essay can
  // QUOTE the sources — the model weaves real source text into its sections,
  // and the mechanical Sources appendix below still lists the same snips.
  // Never paraphrased: the model is handed the sources' own sentences.
  if (answerShape.shape === "composition" && session.webSources && session.webSources.size) {
    const snips = snipsFromSources(session.webSources, { maxSnips: 8, maxChars: 200 });
    if (snips.length) {
      systemContent += `\n\nVerbatim from the sources (quote these where they support your writing, never invent a quote):\n\n"""\n${snips.map((s) => `- "${s.snip}"`).join("\n")}\n"""`;
    }
  }
  if (onNote) onNote({ move: "prompt_budget", system: systemCore.length, chat: keptChat.length, chatChars: chatLen, materialSegments: material.length, materialChars: used, taskChars: taskLen, max: PROMPT_MAX_CHARS });

  // ── the earned cast, this turn only. The model is never told it is
  // playing a role — it receives exactly the facts this turn earned, at the
  // object level, and nothing else. A cue with nothing to say adds nothing.
  const cue = earnedCue({ task, chatHistory: keptChat, surfVoidInfo });
  if (cue?.mouth) {
    systemContent += `\n\nA few things to keep in mind as you answer:\n${cue.mouth}`;
    if (onNote) onNote({ move: "earned_cue", act: cue.act, strain: cue.strain, attentions: cue.eligible, chars: cue.mouth.length });
  }

  const ollamaMessages = [];
  ollamaMessages.push({ role: "system", content: systemContent });
  for (const m of keptChat) {
    ollamaMessages.push({ role: m.role, content: m.content });
  }
  ollamaMessages.push({ role: "user", content: task });

  // DEBUG: dump the exact prompt sent to the model.
  try { fs.writeFileSync("/tmp/er7-prompt-debug.json", JSON.stringify(ollamaMessages, null, 2)); } catch {}

  // 6. Stream tokens from Ollama, forward each to caller — through the single
  // eval slot. COMPOSITION: when the answer shape is a composition and the
  // reading established real structure, the overall concept stays in the
  // unconscious notes (systemCore: digest + resolutions + grounded material)
  // while each section is generated as a BRIEF, separate task. The model is
  // never asked to hold the whole essay in one draw — it is asked to write
  // each section against the same ground, briefly, and the assembly is the
  // reading's own structure (LaVar: the shape comes from the record, never
  // the model).
  // The essay's shape is the VOID, DEF'd by ASKING QUESTIONS — never by
  // copying the source's own headings (Wikipedia's taxonomy table is not the
  // essay's shape). The questions were asked BEFORE the hunt (preVoid); after
  // the gather, the reading's OWN open questions and the shadow's referents
  // enrich them — the material's unresolved distinctions deepen the void.
  let compositionPlan = { questions: [...voidQuestions], declaration: null };
  if (answerShape.shape === "composition") {
    const idx = sessionReferentIndex(session, onNote);
    const refs = [...(idx?.referents?.values?.() ?? [])].map((r) => [...(r.surfaces ?? [])][0]).filter((n) => n && n.length > 3).slice(0, 3);
    const openQ = (session.reader.getTasks?.() ?? [])
      .filter((t) => t?.status === "open" && t?.questions?.length)
      .flatMap((t) => t.questions ?? [])
      .filter((q) => q && q.length > 10)
      .slice(0, 2);
    if (openQ.length || refs.length) {
      const enriched = voidCellsFor({ topic, question: task, openQuestions: openQ, shadowReferents: refs, reading: readingState({ relations: stats?.relationEdges ?? 0 }) });
      // The SECTIONS are the ESSAY-CONTENT cells (the reader-facing prose).
      // The shape-instrument cells (when would the essay revise, what does it
      // declare) steer the composition internally but are not sections of a
      // standalone piece — an essay about the bongo does not have a section
      // titled "when would the essay concede its frame."
      compositionPlan = { questions: enriched.cells.filter((c) => c.relevant && c.essay).map((c) => c.question), declaration: null };
    }
  }
  // On a RESUMED run, the sections are the STORED void plan (from the ledger) —
  // the same shape the crashed run DEF'd — minus the already-answered parts.
  // Never re-derive a different shape after a crash: the plan is the shape.
  const sections = (resumePlan ?? compositionPlan.questions)
    // CRASH RESILIENCE: questions already answered (part titles in the existing
    // ledger) are skipped on a resumed run — the essay continues, it never
    // restarts. The ledger already holds those parts; appending is the only write.
    .filter((q) => !resumeAnswered.includes(String(q).toLowerCase().trim()))
    // The essay's extent is the void's own — a generous cap against runaway,
    // not a fixed truncation of the DEF'd shape. A 27-cell sweep can stay
    // relevant; ER7_MAX_SECTIONS raises it for long pieces.
    .slice(0, Number(process.env.ER7_MAX_SECTIONS ?? 20));
  // The composition block below may EVOLVE the plan (REC supersedes the outline
  // and adds themes as the reading grows). Hoisted so the satisfaction check
  // reads the plan the essay actually wrote, whether or not the block ran.
  let plannedSectionsOut = [...sections];
  let rankeTotalFindings = 0; // Ranke's rewrite count, hoisted for the thinking surface (scoped across the composition block)
  // A generated composition is a DOCUMENT LEDGER (EOT): every part admitted
  // is a line, every revision is a line, and the text a person reads is a
  // PROJECTION of the ledger — the full revision history is always re-foldable.
  // DEF (declare the shape) and EVA/REC (admit or revise each part) are the
  // runtime gates here; only their outcome lands in the ledger.
  const documentLedger = sections.length
    ? createDocumentLedger({ docId: `${sessionId}:${session.turnCount}`, title: task.slice(0, 60), path: sections.map((s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-")).join("_") })
    : null;
  // Store the VOID PLAN (every question the essay must answer) as the ledger's
  // first line — so a resumed run reads the SAME plan back and continues the
  // unanswered questions, never re-deriving a different shape after a crash.
  if (documentLedger && sections.length) {
    appendLedgerLine(documentLedger, {
      role: "plan", title: "Void plan", text: sections.map((s) => `- ${s}`).join("\n"),
      giver: "eoreader7:void",
      basis: "the DEF'd void questions this essay must answer — resumed runs continue from these, never re-derive",
    }, { dir: ESSAY_LEDGER_DIR });
  }
  // THE VOID, DEF'd: the essay's shape declared across all nine operators
  // BEFORE writing begins. This is what "done" means — the void filled by
  // parts that pass its admission test. The meno question is answered by the
  // declaration: we know we've learned when nothing the void named is missing.
  const voidDeclaration = documentLedger
    ? (compositionPlan.declaration ?? declareEssayVoid({ title: task.slice(0, 60), topic: topicPhrase(task), sections, holonLevel, shadow: session.shadow ?? [], webSources: session.webSources }))
    : null;
  if (documentLedger && onNote) onNote({
    move: "void_declared", slot: voidDeclaration?.slot ?? null,
    cardinality: voidDeclaration?.cells?.find((c) => c.op === "DEF")?.declared ?? null,
    extent: voidDeclaration?.cells?.find((c) => c.op === "SEG")?.declared ?? null,
    mneme: voidDeclaration?.cells?.find((c) => c.op === "SIG")?.declared ? null : voidDeclaration?.mneme ?? null,
    shadowSites: session.shadow?.length ?? 0,
  });

  // OUR OWN KELSEN GAUGE, driven by the SHAPE of the target — not a raw number.
  // The void's cells say how determinate the target is: grounded, tested,
  // bounded cells (EVA the claim is witnessed, SEG the extent is cut, DEF the
  // cardinality is declared) want HIGH Kelsen-degrees — literal, bound to the
  // material. Generative, open cells (INS what kind, SYN how it composes, REC
  // what would revise, NUL the space it clears) allow LOWER Kelsen-degrees —
  // the prose can be more impressionistic, freer. Kelsen is a function of the
  // shape, so an open subject composes loosely while a fact-ledger composes
  // literally. A caller may still override via the turn's `kelsen` field.
  const kelsenFromShape = () => {
    if (kelsen != null) return kelsen;
    const cells = voidDeclaration?.cells ?? [];
    if (!cells.length) return DEFAULT_KELSEN;
    const grounded = cells.filter((c) => ["EVA", "SEG", "DEF"].includes(c.op)).length;
    const ratio = grounded / Math.max(1, cells.length);
    return Number((0.3 + ratio * 0.6).toFixed(2)); // 0.3 (all generative) … 0.9 (all grounded)
  };
  const compositionKelsen = kelsenFromShape();
  if (onNote) onNote({
    move: "kelsen", value: compositionKelsen,
    shape: voidDeclaration?.cells?.map((c) => c.op).filter(Boolean).join(" ") ?? "none",
    grounded: voidDeclaration?.cells?.filter((c) => ["EVA", "SEG", "DEF"].includes(c.op)).length ?? 0,
    cells: voidDeclaration?.cells?.length ?? 0,
  });
  // The essay LIVES as a JSONL file on disk (not just in memory) so its state
  // is projectable at any moment — even mid-writing. Each observation appends
  // as one line; the projection re-folds the file.
  if (documentLedger) {
    try { fs.mkdirSync(ESSAY_LEDGER_DIR, { recursive: true }); } catch {}
  }
  const documentLines = [];
  let totalStrain = 0; // the cumulative correction load — how hard the piece was to write
  let fullText = "";
  let truncated = false;
  // The model is the tip of consciousness: it must never run away. A hard
  // cap on total generated chars protects the turn from a repetition loop
  // (num_predict is not always honored by these models). When the cap hits,
  // generation stops and the answer is disclosed as truncated — never silent.
  // But the cap is GENEROUS: the model writes as much as it is comfortable
  // doing — writing is rewriting, and a cramped budget is a cramped essay.
  // The assembled answer's budget. This is the LONG-FORM ceiling, not a
  // single call's — sections accumulate into it (a 12-section essay is
  // legitimately >40K chars), so the default is a generous guard against a
  // runaway loop, not a per-turn truncation. Lower it only for chat turns.
  const MAX_OUTPUT_CHARS = Number(process.env.ER7_MAX_OUTPUT_CHARS ?? 200000);
  const SECTION_MAX_TOKENS = Number(process.env.ER7_SECTION_MAX_TOKENS ?? 1200);
  const MAX_REWRITE_ROUNDS = Number(process.env.ER7_MAX_REWRITE_ROUNDS ?? 2);
  // The GROUNDING TEXT is what Ranke measures a section against: the FULL
  // retained web corpus (every fetched page, addressable) plus the surfaced
  // windows. The surfaced sample alone is too thin for a 24-cell essay — a
  // section naming Tragelaphus eurycerus is grounded, but the surf may only
  // have returned two windows. Grounding against the whole corpus is the
  // honest test. Hoisted to function scope so the section loop, Murch, and
  // the final satisfaction check all measure against the same ground.
  const groundingText = () => {
    const parts = [];
    if (session.webSources?.size) for (const text of session.webSources.values()) if (text) parts.push(String(text));
    for (const s of surfacedSegments ?? []) if (s?.text) parts.push(String(s.text));
    return parts.join("\n").slice(0, 200000);
  };
  // READABILITY — how the piece READS, in addition to what it repeats.
  // Prefer textstat (exact, via the venv) when it is reachable; fall back to
  // the JS organ (free, in-process, trend-accurate) when it is not. The grade
  // is EOT-recordable like every other measure. textstat's exact numbers come
  // from a real syllable dictionary; the JS heuristic is deterministic but
  // approximate — the trend agrees, the absolute values differ slightly.
  const PYTHON_VENV = process.env.ER7_GRAM_PYTHON ?? "/var/folders/ck/tztwm60n4s9dxwrjfwlsmz3m0000gn/T/opencode/gram/bin/python";
  // STRUNK & WHITE — the style agent: readability (textstat when reachable,
  // JS heuristic otherwise) PLUS the Elements-of-Style rule violations. The
  // textstat function is injected into the organ.
  const textstatOf = (text) => {
    if (!PYTHON_VENV) return null;
    try {
      const script = `import textstat, json, sys\nt = sys.argv[1]\nprint(json.dumps({"flesch": round(textstat.flesch_reading_ease(t),1), "grade": round(textstat.flesch_kincaid_grade(t),1), "fog": round(textstat.gunning_fog(t),1), "band": "readable" if textstat.flesch_reading_ease(t)>=60 else "dense", "words": textstat.lexicon_count(t)}))`;
      const out = execFileSync(PYTHON_VENV, ["-c", script, String(text ?? "")], { encoding: "utf8", timeout: 8000 });
      return JSON.parse(out.trim());
    } catch { return null; }
  };
  const readabilityOf = (text) => strunkWhiteGrade(text, { textstat: textstatOf });
  await withSlot(model, async () => {
    const draw = async (msgs, maxTokens, { capture = false, kelsen = null } = {}) => {
      let buf = "";
      let stopped = false;
      for await (const chunk of streamOllamaChat(model, msgs, { maxTokens, onNote, kelsen, signal })) {
        if (typeof chunk === "string") {
          if (fullText.length >= MAX_OUTPUT_CHARS) { truncated = true; stopped = true; break; }
          if (!capture) {
            fullText += chunk;
            if (onToken) onToken(chunk);
          }
          buf += chunk;
        } else if (chunk?.done) {
          usage.promptTokens += chunk.prompt_eval_count;
          usage.completionTokens += chunk.eval_count;
          if (chunk?.truncated) truncated = true;
        }
      }
      return { buf, stopped };
    };
    // ── VARIATION, OWNED BY THE ORGAN ──────────────────────────────────────
    // The variation machinery (rejection-sampling draw + opening identity)
    // lives in organs/variation.js (Handle: Brillat-Savarin) — universal,
    // aliased, reusable by any caller. The runner builds the SYNONYM POOL
    // here (the reading's surfaces for the subject — referents + hyperlexicon
    // composition), which the organ injects into the draw.
    const synonymPool = (() => {
      const seen = new Set();
      const out = [];
      const idx = sessionReferentIndex(session, onNote);
      for (const r of idx?.referents?.values?.() ?? []) {
        for (const s of r.surfaces ?? []) {
          const n = String(s ?? "").trim();
          if (n.length > 3 && !seen.has(n.toLowerCase())) { seen.add(n.toLowerCase()); out.push(n); }
        }
      }
      for (const e of Object.values(hyperlexicon?.composition ?? {})) {
        for (const n of [e?.left, e?.right]) {
          const s = String(n ?? "").trim();
          if (s.length > 3 && !seen.has(s.toLowerCase())) { seen.add(s.toLowerCase()); out.push(s); }
        }
      }
      return out.slice(0, 16);
    })();
    if (sections.length) {
      // ── WOLFE WRITES, FIRST ────────────────────────────────────────────────────
      // A writer starts writing before the research is done and goes back for
      // more when a section needs it. So: no blocking outline draw — the
      // sections the material's own structure gives us ARE the plan. WOLFE
      // (Virginia Woolf's composed, continuous prose is the voice) writes each
      // section immediately, carries the essay's state forward, and strikes
      // Gore for its own source only when it needs one. The outline is never a
      // separate 56s model call that stalls the piece.
      const topic = topicPhrase(task);
      // THE MATERIAL'S OWN PROPOSITIONS — what LaVar grades the essay on.
      // Wolfe writes FROM these so the essay RE-STATES the record (the holon
      // law: the essay, high, makes the material's claims, low, probable).
      // Each section is handed the propositions that share referents with its
      // theme, resolved through the material's own index — the record's
      // claims about the beings the section is about, never generic prose.
      const materialProps = rawEntries?.length ? notesFromEdges(rawEntries) : [];
      const propsIndex = sessionReferentIndex(session, onNote);
      const propsForSection = (section) => {
        if (!materialProps.length || !propsIndex?.resolveIn) return [];
        const themeIds = propsIndex.resolveIn(String(section ?? ""));
        if (!themeIds?.size) return materialProps.slice(0, 10); // no theme referents: show the top claims
        const shown = new Set();
        const out = [];
        for (const p of materialProps) {
          if (out.length >= 12) break;
          const subj = String(p.end1 ?? ""); const obj = String(p.end2 ?? "");
          const sIds = propsIndex.resolveIn(subj); const oIds = propsIndex.resolveIn(obj);
          if ([...themeIds].some((id) => sIds.has(id) || oIds.has(id))) {
            const key = `${subj}|${p.label}|${obj}`;
            if (shown.has(key)) continue;
            shown.add(key);
            out.push(p);
          }
        }
        return out.length ? out : materialProps.slice(0, 10);
      };
      const outlineBuf = sections.length
        ? sections.map((s, i) => `${i + 1}. ${s}`).join("\n")
        : `1. ${topic}`;
      let outlineId = null; // REC supersedes the outline line when the reading grows it
      const plannedSections = plannedSectionsOut; // the hoisted plan — REC's additions are visible to the satisfaction check
      const recoffered = new Set(); // REC offers each evolving theme once — never loops forever
      const goredThemes = new Set(); // Gore strikes each theme once — no re-fetch of the same cue
      if (onThinking) onThinking(`\n### Outline\n${outlineBuf}\n`);
      // Evolve the outline as sections land: re-read the reading's referents;
      // a being the essay has not yet covered is a theme the outline missed.
      // REC: supersede the outline line and add the section.
      for (let i = 0; i < plannedSections.length && !truncated; i++) {
        const section = plannedSections[i];
        if (onNote) onNote({ move: "composing_section", index: i + 1, of: plannedSections.length, section });
        const grounded = material.length > 0;
        const eva = admitPart({ text: section, grounded, minChars: 0 });
        if (!eva.ok) {
          if (onNote) onNote({ move: "composing_skip", section, because: eva.because });
          continue;
        }
        // Gore: go back for more on this section's cue — a targeted strike for
        // the specific theme. THIS RUNS CONCURRENTLY with the section draw:
        // whichever is ready first goes. The model starts writing the section
        // from what is already grounded; the strike's admitted material is
        // available for the NEXT sections (the reading grows). A fetch that
        // lands later is never wasted — it feeds the piece that follows.
        let goreStrike = Promise.resolve({ landed: false });
        if (WEB_SEARCH_ON && documentLedger && section && !goredThemes.has(section)) {
          goredThemes.add(section);
          const cuePlan = cueGoDeeperPlan(section, { query: `${topic} ${section}` });
          if (onNote) onNote({ move: "gore", cue: section, query: cuePlan.query });
          if (onThinking) onThinking(`\n[Gore: gathering on "${section}"]\n`);
          goreStrike = searchAndAdmitWeb(session, sessionId, cuePlan.query, onNote, { move: "go-deeper", maxPages: 2 })
            .then((r) => ({ landed: true, result: r }))
            .catch(() => ({ landed: false }));
        }
        // WHERE THE ESSAY STANDS — folded, never dumped. The earlier sections
        // are read as the essay's own conversation and folded at resolutions
        // (atmosphere/lens/paradigm), so this section knows what the piece has
        // established and can COMPOSE with it — transition, build, never
        // restate — without the mouth being buried in the raw prose.
        const essayIndex = sessionReferentIndex(session, onNote);
        const essayStanding = documentLines.length
          ? essayResolutions({ sections: plannedSections, documentLines, index: essayIndex, rawEntries, onNote })
          : null;
        const priorParts = essayStanding
          ? essayStanding
          : documentLines.map((_, j) => `"${plannedSections[j]}"`).join(", ");
        // HOLON LEVEL: the granularity of the task is an experimentable
        // variable. "section" writes the whole part in one draw; "paragraph"
        // asks for a paragraph; "sentence" asks for a few focused sentences
        // per draw (smallest, most granular — a task generated at the level
        // the piece actually needs, decided per-call, never fixed).
        const holonPhrase = holonLevel === "sentence" ? "in a few focused sentences" : holonLevel === "paragraph" ? "as a short paragraph" : "as a full section";
        // The part is a QUESTION the essay must ANSWER — the void DEF'd it.
        // The writing is an answer, never a section echoing a source heading.
        const isQuestion = /[?？]$/.test(section.trim());
        // WRITE RIGHT THE FIRST TIME: the section prompt states the bar the
        // EVA test enforces, so the model meets it in one draw instead of
        // being corrected. Three demands, each mirroring a satisfactionOfSection
        // failure: a real amount of prose (the holon phrase), written FROM the
        // material (the ungrounded check), and as the piece itself (the meta
        // check). This is the measured speed lever — 12 of 18 sections were
        // being corrected once, each correction a full second draw (~50s).
        // THE OPENING IS A THESIS, NOT AN ANSWER. The essay opens with a SURPRISING
        // assertion about the subject — a claim the reader does not expect —
        // and the body's grounded evidence then RETROACTIVELY REDUCES that
        // surprise. This is the competency principle: an essay is competent
        // when the retrieval explains the why until the surprise collapses
        // (the gathering gate's own stop). The thesis is drawn from the
        // material's propositions but stated as a POSITION, never a
        // description — "the bongo is a forest antelope" is not a thesis;
        // "the bongo's survival hangs on the very forests it hides in" is.
        const isOpening = i === 0;
        const sectionTask = plannedSections.length > 1
          ? (isOpening
            ? `We're writing a piece on ${topic}. ${(() => { const sp = propsForSection(section); return sp.length ? `Here is what the material actually holds about ${topic}:\n${sp.map((p) => `- ${p.end1 ?? ""} ${p.label} ${p.end2 ?? ""}`).join("\n")}` : ""; })()}\n\nOPEN THE PIECE WITH A THESIS: a single, definite, surprising claim about ${topic} that the reader would not expect — a position, never a description. It must be grounded in what the material holds (a real fact or relation), but stated as an argument: something someone could disagree with. Then in 1-2 sentences, name why the claim matters. This is the opening of the piece itself — no introduction, no "in this essay", no commentary about writing.`
            : `We're writing a piece on ${topic}. ${priorParts ? `Where the piece stands so far: ${priorParts}\n\n` : ""}Now ${isQuestion ? `answer this: ${section}` : `write the part on ${section}`}, ${holonPhrase}. Write it as a substantial passage of the piece itself — several sentences. ANSWER WITH THE MATERIAL'S OWN FACTS about ${topic}: its real names, places, numbers, and relationships as the sources state them. ${(() => { const sp = propsForSection(section); return sp.length ? `Here are the material's claims this part should carry:\n${sp.map((p) => `- ${p.end1 ?? ""} ${p.label} ${p.end2 ?? ""}`).join("\n")}` : ""; })()}\nDo not discuss the essay, the writing, the question, or the material itself. It continues what the piece has already established — build on it, transition from it, do not restate it.`)
          : `Write the piece on ${topic}, ${holonPhrase}, as a substantial passage — several sentences about ${topic} using the material's own facts, names, and figures as the sources state them. Do not discuss the essay, the writing, or the material.`;
        const holonBudget = holonLevel === "sentence" ? Math.min(SECTION_MAX_TOKENS, 220) : holonLevel === "paragraph" ? Math.min(SECTION_MAX_TOKENS, 450) : SECTION_MAX_TOKENS;
        if (onThinking) onThinking(`\n### ${section} (${holonLevel})\n\n`);
        // The draw runs NOW, in parallel with the Gore strike. Whichever lands
        // first flows; the strike's result is folded into the reading whenever
        // it arrives.
        const [drawRes] = await Promise.allSettled([
          draw(
            [
              { role: "system", content: systemContent },
              ...keptChat,
              { role: "user", content: sectionTask },
            ],
            holonBudget,
            { kelsen: compositionKelsen },
          ),
        ]);
        // The Gore strike is FIRE-AND-FORGET: it never gates the section. The
        // draw is the only thing the section waits for. Whatever the strike
        // lands is admitted to the reading and feeds the sections that follow;
        // if it has not returned by then, this section simply does not use it.
        // (Previously Promise.allSettled awaited BOTH, so a slow web fetch
        // stretched every section to max(draw, gore) — the speed killer.)
        if (goreStrike?.then) {
          goreStrike
            .then((r) => { if (r?.landed && onNote) onNote({ move: "gore_landed", cue: section, pages: r.result?.pages ?? 0 }); })
            .catch(() => {});
        }
        let { buf = "", stopped = false } = drawRes.status === "fulfilled" ? drawRes.value : {};
        if (stopped) break;
        if (onThinking) onThinking(buf + (i < plannedSections.length - 1 ? "\n\n" : ""));

        // ── FIRST DRAFT LANDS; the EDITOR corrects, not this loop ──────────
        // The section lands as its first draft (admission already guaranteed it
        // is not a wholly empty part). Its strain is RECORDED here — repetition,
        // meta, thin are the editor's brief, which reads the WHOLE essay and
        // fixes every finding in one holistic pass instead of patching each
        // section in isolation (the loop-on-loops this replaces).
        const sectionEva = satisfactionOfSection(buf, { theme: section, material: groundingText(), prior: documentLines.length ? documentLines[documentLines.length - 1] : "" });
        const strainAdded = sectionEva.strain;
        totalStrain += strainAdded;
        if (onNote) onNote({ move: "strain", section, strain: strainAdded, failures: sectionEva.failures.map((f) => f.kind) });
        if (documentLedger) {
          appendLedgerLine(documentLedger, {
            role: "part", title: section, text: buf.trim(), giver: model,
            basis: `composition section, strain ${strainAdded}`,
          }, { dir: ESSAY_LEDGER_DIR });
          documentLines.push(buf.trim());
        }
        if (i < plannedSections.length - 1 && onToken) onToken("\n\n");

        // ── REC: does the reading now hold a being the outline missed? ─────
        // The web material was EOT-ized; as sections are written the fold's
        // referents settle. A newly-established referent not yet covered is a
        // theme the outline must grow to include. Bounded: the same being is
        // never offered twice (the reading does not grow mid-composition, so
        // without this guard the loop re-offers the same theme forever).
        if (documentLedger && !truncated && plannedSections.length < 7) {
          const fresh = sessionReferentIndex(session, onNote);
          const beings = [...(fresh?.referents ?? new Map()).values()]
            .map((r) => [...(r.surfaces ?? [])][0])
            .filter((n) => n && n.length > 3)
            .filter((n) => !plannedSections.some((s) => s.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(s.toLowerCase())))
            .filter((n) => !recoffered.has(n));
          if (beings.length) {
            const newTheme = beings[0];
            recoffered.add(newTheme);
            plannedSections.push(newTheme);
            if (outlineId || documentLedger) {
              outlineId = appendLedgerLine(documentLedger, {
                role: "outline", title: "Outline (evolved)", text: `${outlineBuf.trim()}\n- ${newTheme}`,
                supersedes: outlineId ?? null, giver: "eoreader7:reading",
                basis: `REC: the reading established "${newTheme}" as sections were written — the outline grows to include it`,
              }, { dir: ESSAY_LEDGER_DIR });
            }
            if (onNote) onNote({ move: "outline_evolved", added: newTheme, total: plannedSections.length });
            if (onThinking) onThinking(`\n### Outline evolved: added ${newTheme}\n\n`);
            i -= 1; // run the new section immediately, not at the end
          }
        }
      }

      // ── RANKE VERIFIES THE GROUND, BEFORE MURCH EDITS ────────────────────────
      // Wolfe's first draft is written. RANKE (Leopold von Ranke's
      // Quellenkritik: the account is judged by the document it stands on)
      // checks whether each section's claims are grounded in the retained
      // documents. An ungrounded section — prose that shares almost nothing
      // with the material — is rewritten FROM the material, fact-fidelity
      // restored before any stylistic work. Murch then edits the SHAPE of
      // the grounded prose; he never touches grounding (that is Ranke's).
      // Bounded: each section rewritten at most MAX_REWRITE_ROUNDS across the
      // pass; a section that still fails becomes a declared gap, never churned.
      const rankeAttempts = new Map(); // sectionIndex -> rewrite count, persists across rounds
      for (let round = 0; round < MAX_REWRITE_ROUNDS && !truncated; round++) {
        const rankeFindings = [];
        // RANKE FOLDS THE ESSAY AT THE MATERIAL'S OWN POINTS. The material was
        // folded through the reader into a referent index; Ranke folds each
        // section through THAT SAME index. A section that resolves to the
        // material's beings is grounded IN THE RECORD (its referents and their
        // byte spans ride the finding — P5.2, 54a5622). A section that folds
        // to nothing invented a being the material never carried: that is
        // Ranke's `unresolved` — typed, never a guess. This replaces the
        // token-overlap "ungrounded" test: the check is holographic, the
        // record is the ground.
        const rankeIndex = sessionReferentIndex(session, onNote);
        const holo = rankeIndex ? holographicSatisfaction(documentLines, plannedSections, { index: rankeIndex }) : null;
        if (holo) {
          for (const f of holo.failures) if (f.kind === "unresolved") rankeFindings.push({ ...f, sectionIndex: f.sectionIndex });
        } else {
          for (let i = 0; i < documentLines.length; i++) {
            const r = satisfactionOfSection(documentLines[i], {
              theme: plannedSections[i] ?? "",
              material: groundingText(),
              prior: i > 0 ? documentLines[i - 1] : "",
            });
            for (const f of r.failures) if (f.kind === "ungrounded") rankeFindings.push({ ...f, sectionIndex: i });
          }
        }
        // LAVAR'S LOW-RECALL FINDING: a section that resolves to the material
        // but re-states none of its propositions is grounded-but-generic —
        // LaVar grades it (recall), and Ranke rewrites it to CARRY the
        // material's claims, not just mention the subject. The material's
        // propositions are its EOT graph entries.
        const lavarProps = rankeIndex && rawEntries?.length ? notesFromEdges(rawEntries) : [];
        if (rankeIndex && rawEntries?.length) {
          const lavar = lavarGradeEssay(documentLines, plannedSections, { materialPropositions: lavarProps, index: rankeIndex });
          if (lavar.recall < 0.5 && lavar.ofPropositions > 0) {
            if (onNote) onNote({ move: "lavar", recall: lavar.recall, covered: lavar.covered, of: lavar.ofPropositions });
            // LAVAR'S LOW-RECALL is a RANKE FINDING: a section that carries
            // none of the material's propositions is grounded-but-generic —
            // Ranke rewrites it to re-state the record's claims.
            for (const ps of lavar.perSection ?? []) {
              if (ps.carried === 0 && documentLines[ps.sectionIndex]?.trim()) {
                rankeFindings.push({ kind: "low-recall", sectionIndex: ps.sectionIndex, detail: `the section re-states none of the material's EOT propositions — LaVar grades it 0` });
              }
            }
          }
        }
        if (!rankeFindings.length) break;
        rankeTotalFindings += rankeFindings.length;
        if (onNote) onNote({ move: "ranke", round: round + 1, ungrounded: rankeFindings.map((f) => f.sectionIndex) });
        // CONVERGENCE GUARD: a section that stays ungrounded after the rewrite
        // budget becomes a DECLARED GAP — typed and disclosed, never silently
        // dropped, and never churned forever. Ranke is bounded per section,
        // and the count persists across rounds.
        for (const f of rankeFindings) {
          if (truncated) break;
          const i = f.sectionIndex;
          const sectionText = documentLines[i];
          if (!sectionText) continue;
          const tried = (rankeAttempts.get(i) ?? 0);
          if (tried >= MAX_REWRITE_ROUNDS) {
            if (onNote) onNote({ move: "ranke_gap", sectionIndex: i, theme: plannedSections[i] ?? "", detail: f.detail });
            continue; // declared gap — Ranke has done its budget
          }
          rankeAttempts.set(i, tried + 1);
          if (onThinking) onThinking(`\n### Ranke, section ${i + 1}: ${f.detail}\n\n`);
          // Ranke rewrites the section FROM the documents — the material's
          // own facts and wording, nothing invented. The material's ACTUAL
          // claims are handed over (LaVar grades on whether the section
          // re-states them), so the model can carry the record's
          // propositions rather than generic prose.
          const propBlock = lavarProps.slice(0, 14).map((p) => `- ${p.end1 ?? ""} ${p.label} ${p.end2 ?? ""}`).join("\n");
          const rankeMsg = `We're writing a piece on ${topic}. One section drifted from the material — it names almost none of the source's own claims. The section reads:\n"""\n${String(sectionText).slice(0, 1200)}\n"""\n\nThese are the material's actual claims about ${topic}:\n${propBlock}\n\nRewrite the section so it carries these claims — use the material's own facts, names, and figures, several sentences, as the piece itself. No introduction, no commentary about writing, no discussion of the essay or the question. Write only the corrected section.`;
          const rewrite = await draw(
            [{ role: "system", content: systemContent }, ...keptChat, { role: "user", content: rankeMsg }],
            SECTION_MAX_TOKENS,
            { kelsen: Math.max(compositionKelsen, 0.9) }, // Ranke is literal, never impressionistic
          );
          if (rewrite.stopped) { truncated = true; break; }
          const fixText = rewrite.buf.trim();
          if (!fixText) continue;
          documentLines[i] = fixText;
          if (documentLedger) appendLedgerLine(documentLedger, { role: "revision", title: `ranke: ungrounded @ ${i + 1}`, text: fixText, giver: model, supersedes: null, basis: `RANKE: ${f.detail}` }, { dir: ESSAY_LEDGER_DIR });
        }
      }

      // ── MURCH EDITS: EVA the whole, then REC the shape ────────────────────────
      // Wolfe's first draft is written, and Ranke has grounded it. Now MURCH
      // reads the assembled whole (folded at resolutions, never dumped) and is
      // handed the STYLISTIC findings — the shape check's opening/closing/body
      // gaps and each section's repetition/meta/thin verdicts. GROUNDING is
      // not Murch's: an ungrounded section is Ranke's fact-fidelity finding,
      // already rewritten above. Murch produces one batch of bounded rewrites,
      // each fixing exactly one finding, and the shape is re-checked — the
      // film made in the cut.
      const assembled = documentLines.join("\n\n");
      const shapeCheck = checkEssayShape(assembled, { parts: plannedSections.length, themes: plannedSections, subject: topic });
      if (onNote) onNote({ move: "shape_check", ok: shapeCheck.ok, failures: shapeCheck.failures.map((f) => f.detail) });
      const editorIndex = sessionReferentIndex(session, onNote);
      for (let round = 0; round < MAX_REWRITE_ROUNDS && !truncated; round++) {
        // Aggregate EVERY finding across the whole essay — Murch's brief.
        // Murch is a STYLISTIC editor: his findings are the shape of the prose —
        // repetition, meta-commentary, thin sections, and the whole-essay
        // opening/closing/body gaps. GROUNDING is RANKE's job (Quellenkritik:
        // does the prose stand on the documents?), so `ungrounded` is not
        // handed to Murch — a section that fails grounding is a fact-fidelity
        // failure for Ranke, not a style problem for the editor. The loop is
        // bounded by `applied` and MAX_REWRITE_ROUNDS.
        const findings = aggregateEssayFindings({ sections: plannedSections, documentLines, material: groundingText(), shapeCheck });
        // FISHER DETECTS THE WHOLE-ESSAY OPENING REPETITION (the gate the
        // neighbor-overlap check misses): five paragraphs opening "The bongo
        // antelope, scientifically classified as..." recur ABOVE CHANCE
        // (p from a word-order-scramble null). Fisher names the repeated
        // openings; Murch flags them; BRILLAT-SAVARIN seasons them.
        const fisher = detectRepetition(documentLines, { shuffles: 400 });
        if (fisher.significant && fisher.repeated.length) {
          if (onNote) onNote({ move: "fisher", p: fisher.p, observed: fisher.observed, repeated: fisher.repeated.length, basis: fisher.basis });
          for (let fi = 0; fi < documentLines.length; fi++) {
            if (fisher.repeated.includes(documentLines[fi])) {
              findings.push({ kind: "repetition", sectionIndex: fi, detail: `the opening repeats another section's — Fisher's null shows it recurs above chance (${fisher.repeated.length} section(s) share the same opening construction)` });
            }
          }
        }
        // REDUNDANCY — ALL of it, not just openings. A maximally rational
        // argument is maximally predictable, and that predictability is the
        // boredom Brillat-Savarin seasons. detectRedundancy catches repeated
        // facts (the same claim stated in N sections) and repeated sentence
        // templates (the same construction opening sentences everywhere) —
        // each finding names the sections, so the seasoning is chosen, never
        // random.
        const redundancy = detectRedundancy(documentLines, { shuffles: 300 });
        for (const r of redundancy) {
          if (onNote) onNote({ move: "redundancy", kind: r.kind, sections: r.sections, detail: r.detail });
          for (const si of r.sections ?? []) {
            findings.push({ kind: r.kind, sectionIndex: si, detail: r.detail });
          }
        }
        // MURCH'S PACING — the blink of an eye. A flatline piece (sentence
        // lengths never vary, no blinks) has no emotional cut. When the whole
        // essay paces flat, Murch flags it as a pacing finding so Brillat-
        // Savarin varies the sentence rhythm — a short landing after a long
        // sentence, the blink where the thought turns.
        const pacing = murchPacing(documentLines.join("\n\n"));
        if (pacing.flatline) {
          if (onNote) onNote({ move: "pacing", basis: pacing.basis });
          findings.push({ kind: "pacing", sectionIndex: null, detail: pacing.basis });
        }
        const fixable = findings.filter((f) => f.kind !== "ungrounded");
        if (!fixable.length) break;
        if (onNote) onNote({ move: "murch", round: round + 1, findings: fixable.map((f) => `${f.kind}${f.sectionIndex != null ? `@${f.sectionIndex}` : ""}`) });
        const editorStanding = essayResolutions({ sections: plannedSections, documentLines, index: editorIndex, rawEntries, onNote });
        const brief = fixable.map((f, idx) => `${idx + 1}. [${f.kind}${f.sectionIndex != null ? `, section ${f.sectionIndex + 1}` : " the piece as a whole"}] ${f.detail}`).join("\n");
        if (onThinking) onThinking(`\n### Murch, pass ${round + 1}\n${brief}\n\n`);
        // Murch fixes ONE finding per draw — the reliable grain for a 2B
        // mouth (the voice design: one proposition per call). Each draw is
        // small, targeted, and replaces the specific section it names; the
        // whole-essay context is the resolutions fold, never the raw bytes.
        let applied = 0;
        for (let fi = 0; fi < fixable.length && !truncated; fi++) {
          const f = fixable[fi];
          const targetSection = f.sectionIndex != null ? documentLines[f.sectionIndex] : null;
          if (f.kind === "body") {
            // A theme is uncovered — write a section that covers it, appended.
            const bodyMsg = `The piece on ${topic} is missing this: ${f.detail}. ${editorStanding ? `The piece so far: ${editorStanding}` : ""}\n\nWrite the missing section from the material, in the piece's own voice — a substantial passage, several sentences, the material's own facts and wording, no introduction, no commentary about writing.`;
            const body = await draw(
              [{ role: "system", content: systemContent }, ...keptChat, { role: "user", content: bodyMsg }],
              SECTION_MAX_TOKENS,
              { kelsen: Math.max(compositionKelsen, 0.9) },
            );
            if (body.stopped) { truncated = true; break; }
            const bodyText = body.buf.trim();
            if (bodyText) {
              documentLines.push(bodyText);
              if (documentLedger) appendLedgerLine(documentLedger, { role: "revision", title: `murch: body`, text: bodyText, giver: model, supersedes: null, basis: `MURCH: ${f.detail}` }, { dir: ESSAY_LEDGER_DIR });
              applied++;
            }
            continue;
          }
          // A section finding (meta/repetition/thin/ungrounded) — rewrite that
          // specific section from the material, keeping the piece's voice.
          // BRILLAT-SAVARIN's seasoning instruction rides the repetition finding: the
          // piece must be accurate (Ranke) and FLAVORED (Brillat-Savarin) —
          // the chosen off-kilter detail, the exact fact landed with the right
          // measure of surprise, never a shower of random spice. Season the
          // opening so it does not echo the other sections' construction —
          // vary the construction and the rhythm the way a good dish varies
          // its course: a new flavor, not more of the same.
          const brillatNote = (f.kind === "repetition" || f.kind === "repeated-fact" || f.kind === "repeated-template" || f.kind === "pacing")
            ? (f.kind === "pacing"
              ? " This piece paces flat — the sentences are all the same length, no blink, no cut. Murch edits where the blink falls: let a SHORT sentence land after a long one, vary the rhythm, let the reader's eye rest where the thought turns. Dense information reads slow; release it with a short sentence."
              : f.kind === "repeated-fact"
              ? " This fact is a crutch — it is stated in more than one section. State it ONCE, in its best form, and let the other section move on: a fact once is a finding, twice is a crutch. Season the section by advancing something the reader has not already been told."
              : f.kind === "repeated-template"
                ? " This construction repeats across the piece — the same scaffolding everywhere is the boredom. Season it: vary the construction, the rhythm, the first phrase, the way a good dish varies its course. Do not add random spice; add the right one."
                : " Open differently — do not begin the way the other sections begin. Season it: land an exact fact with a surprising, chosen measure of flavor — a detail the reader did not expect, the way a striking detail makes a dish memorable. Vary the construction and the rhythm; do not add random spice, add the right one.")
            : "";
          const fixMsg = `We're editing a piece on ${topic}. ${editorStanding ? `Where the piece stands: ${editorStanding}\n\n` : ""}The editor found this problem in one section:\n- [${f.kind}] ${f.detail}\n\nThe current section reads:\n"""\n${String(targetSection ?? "").slice(0, 1200)}\n"""\n\nRewrite that section from the material, in the piece's own voice — a substantial passage, several sentences, the material's own facts and wording, no introduction, no commentary about writing.${brillatNote} Write only the corrected section.`;
          // VARIATION BY SEARCH: for the repetition family, try the MECHANICAL
          // snip FIRST (free, deterministic, EOT-recorded — no model call),
          // then fall to drawVaried's rejection sampling at rising
          // temperature with the material's synonym surfaces. The revision
          // LADDER: mechanical (free, certain) → varied draw (model, small).
          // Every mechanical edit lands as an EOT TRANSFORMATION line: the
          // op (INS·swap / SYN·rotate / SEG·cut), the `from` (superseded
          // bytes), and the `to` — always auditable, always re-foldable.
          const isVariation = f.kind === "repetition" || f.kind === "repeated-fact" || f.kind === "repeated-template";
          const blocked = isVariation
            ? documentLines.map((_, i) => i === f.sectionIndex ? "" : documentLines[i]).filter(Boolean)
            : [];
          let fixText = null, fixOp = null;
          if (isVariation) {
            // THE MECHANICAL SNIP — no model call. If it produces a genuine,
            // different opening, it is the edit: recorded as an EOT transform
            // with the op and the before/after bytes.
            const mech = mechanicalRevision(String(targetSection ?? ""), {
              kind: f.kind, synonyms: synonymPool, others: blocked,
            });
            if (mech) {
              fixText = mech.to;
              fixOp = mech.op;
              if (onNote) onNote({ move: "mechanical", op: mech.op, kind: f.kind, basis: mech.basis });
            }
          }
          if (!fixText) {
            // FALL TO THE MODEL — the mouth, when no mechanical transform
            // expresses the needed change.
            const fix = isVariation
              ? await variedDraw({
                  draw,
                  msgs: [{ role: "system", content: systemContent }, ...keptChat, { role: "user", content: fixMsg }],
                  maxTokens: SECTION_MAX_TOKENS,
                  blockedOpenings: blocked,
                  synonyms: synonymPool,
                  onReject: (r) => { if (onNote) onNote({ move: "rejected_draw", ...r }); },
                })
            : await draw(
                [{ role: "system", content: systemContent }, ...keptChat, { role: "user", content: fixMsg }],
                SECTION_MAX_TOKENS,
                { kelsen: Math.max(compositionKelsen, 0.9) }, // Murch is literal, never impressionistic
              );
            if (fix.stopped) { truncated = true; break; }
            fixText = fix.buf.trim();
            fixOp = "INS·rewrite";
          }
          if (!fixText) continue;
          if (f.sectionIndex != null && documentLines[f.sectionIndex]) {
            documentLines[f.sectionIndex] = fixText;
          } else {
            documentLines.push(fixText);
          }
          // THE EOT TRANSFORMATION: every edit — mechanical or model — lands
          // as a typed transformation line carrying the OP and the superseded
          // bytes (`from` in the basis), so the edit is always auditable and
          // the piece re-foldable to any point. A mechanical edit is free and
          // deterministic; a model edit is the mouth's. Both are recorded the
          // same way: a revision that supersedes, never an in-place write.
          if (documentLedger) appendLedgerLine(documentLedger, {
            role: "revision", title: `murch: ${f.kind} ${f.sectionIndex != null ? `@ ${f.sectionIndex + 1}` : "whole"}`,
            text: fixText, giver: model, supersedes: null,
            basis: `${fixOp ?? "revision"}: EVA found ${f.kind} — ${f.detail}`,
          }, { dir: ESSAY_LEDGER_DIR });
          applied++;
        }
        if (onNote) onNote({ move: "murch_applied", round: round + 1, applied });
        if (!applied) break; // nothing landed — stop, don't loop forever
        const rechecked = checkEssayShape(documentLines.join("\n\n"), { parts: plannedSections.length, themes: plannedSections, subject: topic });
        if (onNote) onNote({ move: "shape_recheck", ok: rechecked.ok, failures: rechecked.failures.map((f) => f.detail) });
        shapeCheck.ok = rechecked.ok;
        shapeCheck.failures = rechecked.failures;
        if (rechecked.ok) break;
      }

      // ── READING IS WRITING: a landed strike may revise EARLIER sections ──
      // Everything is revisable — the ledger is append-only, so a revision to
      // section 2 after section 4 is just a line that supersedes it. After the
      // sections and strikes, re-read the reading: a section whose theme the
      // grown material now covers more fully (more referents, more notes) is
      // worth revising — a writer returns to an earlier part when the later
      // research deepens it. Bounded: one revision pass, each section at most
      // once, and only when the fold genuinely grew.
      if (documentLedger && !truncated && plannedSections.length > 1 && session.reader) {
        const fresh = sessionReferentIndex(session, onNote);
        const afterCount = fresh?.referents?.size ?? 0;
        // The FIRST time a session composes, there is no "before" — the baseline
        // is set, nothing is revised on the first pass. Revision requires the
        // reading to have ACTUALLY grown mid-composition (a later strike landed
        // and deepened the fold), never a first-run artifact.
        const beforeCount = session.lastReferentCount;
        session.lastReferentCount = afterCount;
        if (beforeCount != null && afterCount > beforeCount + 1) {
          // The reading grew substantially mid-writing. Revise the earliest
          // section whose theme the new referents touch.
          const newRefs = [...(fresh?.referents?.values?.() ?? [])]
            .map((r) => [...(r.surfaces ?? [])][0])
            .filter((n) => n && n.length > 3);
          const reviseTarget = plannedSections.findIndex((s) => newRefs.some((n) => s.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(s.toLowerCase())));
          if (reviseTarget >= 0) {
            const section = plannedSections[reviseTarget];
            if (onNote) onNote({ move: "strike_revision", section, reason: `the reading grew from ${beforeCount} to ${afterCount} referents — the section can be deepened` });
            if (onThinking) onThinking(`\n### Revising earlier section: ${section}\n\n`);
            const revise = await draw(
              [
                { role: "system", content: systemContent },
                ...keptChat,
                { role: "user", content: `The piece on ${topic} has a section on "${section}". The research since it was written turned up more. Rewrite that section, deepened by the new material.` },
              ],
              SECTION_MAX_TOKENS,
              { kelsen: Math.max(compositionKelsen, 0.9) },
            );
            if (!revise.stopped && revise.buf.trim()) {
              const revisedText = revise.buf.trim();
              if (documentLedger) {
                // The revision SUPERSEDES the earlier section in the ledger —
                // both stay on the record; the projection takes the survivor.
                appendLedgerLine(documentLedger, {
                  role: "revision", title: `revision: ${section}`, text: revisedText, giver: model,
                  supersedes: null, basis: `REC: the reading grew (${beforeCount}→${afterCount} referents) — "${section}" rewritten with the new material`,
                }, { dir: ESSAY_LEDGER_DIR });
              }
              documentLines[reviseTarget] = revisedText;
              fullText += `\n\n${revisedText}`;
              if (onToken) onToken(`\n\n${revisedText}`);
            }
          }
        }
      }
      if (documentLedger) {
        const def = sections.map((s) => `"${s}"`).join(", ");
        if (onNote) onNote({ move: "document_ledger", docId: documentLedger.docId, parts: documentLines.length, declared: def });
      }
      // Verbatim snips (citations) — taken mechanically from the EOT-retained
      // web sources, never generated by the model. Appended as their own
      // document-ledger observation after the sections, with source URLs.
      if (documentLedger && session.webSources && session.webSources.size) {
        const snips = snipsFromSources(session.webSources);
        // The structured citation ledger: a JSON doc beside the essay with the
        // REAL verbatim source spans and their byte addresses into the retained
        // shadow text — every citation points at actual bytes, never a guess.
        const assembledBody = documentLines.join("\n\n");
        // THE GIVERS, ALL CITED (the user's discipline): the model is a giver
        // when it states something; every prior that steered the composition
        // is a giver too (the shape prior, the POS prior + born anchoring
        // that shaped the reading). None invisible.
        const essayGivers = [
          // THE MODEL, CITED WITH ITS IDENTITY: what it is, when it
          // released, where it lives — a giver is named, never anonymous.
          (() => { const m = MODEL_GIVER(model); return { role: "model", name: m.name, id: m.id, hfUrl: m.hfUrl, released: m.released, license: m.license, note: m.note }; })(),
          { role: "prior", name: "eoreader7:shape-prior:essay-v1", basis: "the essay's received form — thesis opening, body, closing" },
          { role: "prior", name: "pos:en-ud-ewt + born anchoring", basis: "the reading's shape prior — what the priors caused the shadow to retain" },
        ];
        const cites = citationLedger(assembledBody, session.webSources, { givers: essayGivers });
        if (cites.citations.length) {
          const citesPath = path.join(ESSAY_LEDGER_DIR, `${documentLedger.docId.replace(/:/g, "_")}.citations.json`);
          try { fs.writeFileSync(citesPath, JSON.stringify({ docId: documentLedger.docId, ...cites }, null, 2)); } catch {}
          if (onNote) onNote({ move: "citation_ledger", path: citesPath, citations: cites.citations.length, basis: cites.basis });
        }
        // APA footnotes: each essay sentence attributed mechanically to its
        // best source, with the VERBATIM span it borrows from — the Fold's
        // cite.js discipline (an address is attached, never requested).
        const footnoteBlock = renderApaFootnotes(assembledBody, session.webSources, { givers: essayGivers });
        // INLINE CITATION MARKERS are applied CLIENT-SIDE by the live HTML
        // (each citation's essaySentence gets [n] after it in the folded
        // prose). The server stores the STRUCTURED citations (citations.json)
        // and the footnote block as a `citations` ledger line — never a
        // duplicate inline-marked body, never the footnotes twice.
        if (footnoteBlock) {
          appendLedgerLine(documentLedger, {
            role: "citations", title: "Footnotes (APA)", text: footnoteBlock,
            giver: "eoreader7:cite",
            basis: "mechanical attribution of each essay sentence to its best-supporting web source, with the verbatim borrowed span",
          }, { dir: ESSAY_LEDGER_DIR });
          if (onThinking) onThinking(`\n### Footnotes (APA)\n\n${footnoteBlock}\n`);
          const block = `\n${footnoteBlock}`;
          documentLines.push(block);
          fullText += block;
          if (onToken) onToken(block);
        }
        if (snips.length) {
          const citationsText = snips.map((s) => `- "${s.snip}" — ${s.url}`).join("\n");
          appendLedgerLine(documentLedger, {
            role: "citations", title: "Sources (verbatim)", text: citationsText,
            giver: "eoreader7:web-organ",
            basis: "verbatim snips taken mechanically from EOT-retained web sources — never generated",
          }, { dir: ESSAY_LEDGER_DIR });
          if (onThinking) onThinking(`\n### Sources (verbatim)\n\n${citationsText}\n`);
          const citationBlock = `\n\n## Sources (verbatim)\n\n${citationsText}`;
          documentLines.push(citationBlock);
          fullText += citationBlock;
          if (onToken) onToken(citationBlock);
        }
      }
    } else {
      const r = await draw(ollamaMessages, CALL_MAX_TOKENS, { kelsen: compositionKelsen });
      if (r?.stopped) truncated = true;
    }
  });

  // 7. Post-process before it is printed: extract code blocks, pyodide-lint
  // the Python, and reorder top-level entities so each depends only on things
  // defined above it. The unconscious system lints, orders, and pins. The
  // model never sees the fixup transcript — only the repaired answer.
  // Latency guard: warmed at boot, timeboxed per turn; if the budget is
  // exceeded the original text is returned untouched — the unconscious
  let post = null;
  let text = fullText;
  if (fullText.trim()) {
    post = await postprocessAnswer(fullText, { onNote, timeboxMs: POSTPROCESS_TIMEOUT_MS });
    if (post && typeof post.text === "string" && post.text.trim() && post.text !== fullText) {
      text = post.text;
    }
  }

  // ── the thinking affordance: what the unconscious did, in plain English ──
  // Disclosed only when the client asks (discloseThinking). The grounding
  // summary — what was read, what surfaced, what the reading established —
  // shown as readable lines, never apparatus, never addresses.
  const thinkingLines = [];
  if (workspaceStats.files) thinkingLines.push(`Read ${workspaceStats.files} file(s), ${workspaceStats.chars.toLocaleString()} chars.`);
  if (hasWeb) thinkingLines.push(`Researched the web: ${webResult.pages} page(s), ${webResult.chars.toLocaleString()} chars.`);
  if (session.shadow?.length) {
    const res = session.shadow.map((s) => `${s.resolution ?? "?"}:${s.chars}${s.reading?.referents?.length ? ` (${s.reading.referents.length} refs)` : ""}`).join(", ");
    thinkingLines.push(`Shadow (Mneme, shaped by the POS prior + born anchoring): ${session.shadow.length} site(s) — ${res}`);
  }
  if (surfacedSegments.length) thinkingLines.push(`Found ${surfacedSegments.length} passage(s) addressing the question.`);
  if (surfVoidInfo) thinkingLines.push(`Nothing here answered the question (${surfVoidInfo.gap}).`);
  if (stats.relationEdges) thinkingLines.push(`The reading holds ${stats.relationEdges} relation edge(s), ${stats.referentBindings} referent binding(s).`);
  if (resolutions?.active?.length) thinkingLines.push(`Active referents: ${resolutions.active.map((a) => a?.id ?? a).join(", ")}.`);
  const thinkingBlock = thinkingLines.length ? thinkingLines.join("\n") : null;

  // KELSEN: THE PRIMARY MODALITY — computed once so the result AND the
  // thinking surface both read it.
  const resultKelsen = documentLedger && rawEntries?.length
    ? kelsenGrade({
        propositions: notesFromEdges(rawEntries),
        index: sessionReferentIndex(session),
        precedence,
        tagClaim,
      })
    : null;

  // ── the durable theory of mind, updated and persisted at the turn's end.
  // Type-level only: the person's assertion and the standing this turn's
  // record earned for it. The conversation's SPECIFICS stay in the session.
  if (speakerModel && userId) {
    const updated = updateSpeakerModel(speakerModel, {
      task,
      classification: (() => { try { return classifySpeech(task); } catch { return "question"; } })(),
      surfVoid,
      surfaced: surfacedSegments.length,
    });
    saveSpeakerModel(userId, updated);
  }

  return {
    text,
    relationEdges: stats.relationEdges,
    referentBindings: stats.referentBindings,
    hyperlexiconCandidates: Object.keys(hyperlexicon.composition ?? {}).length,
    turn: session.turnCount,
    workspace: workspaceStats,
    surfed: surfacedSegments.map((s) => s._ledger),
    post: post ? { blocks: post.blocks?.length ?? 0, linted: post.linted ?? false, reordered: post.reordered ?? false, notes: post.notes ?? [] } : null,
    resolutions: resolutions ? { level: resolutions.level, text: resolutions.text, active: resolutions.active ?? null, atmosphere: resolutions.atmosphere ? { basis: resolutions.atmosphere.basis, ground: resolutions.atmosphere.ground ?? null } : null, lens: resolutions.lens ? { basis: resolutions.lens.basis, windows: resolutions.lens.windows ?? null } : null, paradigm: resolutions.paradigm ? { basis: resolutions.paradigm.basis, window: resolutions.paradigm.window ?? null } : null } : null,
    document: documentLedger
      ? {
          docId: documentLedger.docId,
          projection: projectDocument(documentLedger),
          changelog: documentChangeLog(documentLedger, { declaredParts: sections }),
          ledger: serializeLedger(documentLedger),
          ledgerFile: documentLedger ? ledgerFilePath(ESSAY_LEDGER_DIR, documentLedger.docId) : null,
          citationsFile: documentLedger ? path.join(ESSAY_LEDGER_DIR, `${documentLedger.docId.replace(/:/g, "_")}.citations.json`) : null,
          // THE THINKING SURFACE — teaches, never just delivers. The reader
          // sees HOW the essay reasoned: the void questions it DEF'd, the
          // claims it carries and the conflicts Kelsen resolved (with WHY),
          // and the grounded witnesses Ranke verified. The reader can check
          // each step and learn the method — the system does not do the
          // thinking for them, it shows the thinking so they can do it.
          thinking: (() => {
            const rows = [];
            const m = MODEL_GIVER(model);
            rows.push(`Written by ${m.name} (${m.released}, ${m.license}${m.hfUrl ? ` — ${m.hfUrl}` : ""}): every claim it states is cited to it; claims grounded in a source are cited to the source.`);
            if (sections.length) rows.push(`The essay DEF'd its shape by asking ${sections.length} questions (the void):\n${sections.slice(0, 6).map((s, i) => `${i + 1}. ${s}`).join("\n")}${sections.length > 6 ? `\n… and ${sections.length - 6} more.` : ""}`);
            const k = resultKelsen;
            if (k?.resolutions?.length) {
              rows.push(`\nConflicting claims the essay carried, resolved by the norm hierarchy (Kelsen — validity, then lex specialis, then force, then lex posterior, then entrenchment):`);
              for (const r of k.resolutions.slice(0, 8)) rows.push(`- ${r.subject}: “${r.a}” vs “${r.b}” → ${r.winner ? (r.winner === "a" ? r.a : r.b) : "tied"} — ${r.why ?? r.reason}`);
              if (k.resolutions.length > 8) rows.push(`… ${k.resolutions.length - 8} more.`);
            } else if (k?.basis) rows.push(`\nKelsen: ${k.basis}`);
            if (rankeTotalFindings) rows.push(`\nRanke found ${rankeTotalFindings} section(s) that drifted from the material and rewrote them from the record.`);
            return rows.join("\n");
          })(),
        }
      : null,
    usage,
    truncated,
    shadow: session.shadow ?? [],
    // The MENO CHECK: the void was DEF'd when the composition started; here we
    // ask whether it is FILLED. We know we've learned when the void we
    // declared — across its nine operators — is filled by sections that pass
    // its admission test. Strain is the REC pressure the void demanded.
    satisfaction: documentLedger
      ? (sessionReferentIndex(session) && rawEntries?.length
        ? lavarGradeEssay(documentLines, plannedSectionsOut, { materialPropositions: notesFromEdges(rawEntries), index: sessionReferentIndex(session) })
        : sessionReferentIndex(session)
          ? holographicSatisfaction(documentLines, plannedSectionsOut, { index: sessionReferentIndex(session) })
          : fillCheck(voidDeclaration, documentLines, plannedSectionsOut, { material: groundingText() }))
      : null,
    // KELSEN: THE PRIMARY MODALITY — the essay's claims resolve by the norm
    // hierarchy (validity → lex specialis → force → lex posterior →
    // entrenchment), and the resolutions are NAMED. This is the default
    // hyper-grounded posture: the essay is a set of claims in a hierarchy,
    // conflicts resolved by a declared order, never a silent pick. The
    // reader is taught the order by seeing each resolution.
    kelsen: resultKelsen,
    // COMPETENCY: does the essay reduce the surprise of its own opening
    // thesis? The opening asserts a surprising claim; the body's grounded
    // evidence must retroactively reduce that surprise. Competency is the
    // surprise-reduction — never length, never token volume (the gathering
    // gate's own stop: the piece is done when it explains the why).
    competency: documentLedger && rawEntries?.length && documentLines.length
      ? competencyGrade({
          opening: documentLines[0] ?? "",
          body: documentLines.slice(1),
          materialPropositions: notesFromEdges(rawEntries),
          index: sessionReferentIndex(session),
        })
      : null,
    // READABILITY: how the piece READS — textstat when reachable, else the
    // JS heuristic. A piece can avoid all repetition and still be too dense;
    // this is the "how good does it read" measure beside the redundancy
    // detectors.
    // STRUNK & WHITE: how the piece READS and the style rules it breaks. A
    // piece can avoid all repetition and still be dense or hedged; this is
    // the style agent's report beside the redundancy detectors.
    strunkAndWhite: documentLines.length ? readabilityOf(documentLines.join("\n\n")) : null,
    // MURCH'S PACING — the blink of an eye. The film is edited where the
    // blink falls: the reader's eye rests at a sentence boundary, and the
    // cut (the variation) lands where the thought turns. A piece that never
    // varies its sentence length has no blinks — a flatline, Murch's boredom
    // at the rhythm grain. The pacing grade reports the variance, the blink
    // points (a short sentence landing after long ones), and the dense
    // sentences — the emotional arc of the cut.
    murch: documentLines.length ? murchPacing(documentLines.join("\n\n")) : null,
    // VONNEGUT — the WRITER's arc: the shape of the piece's story, classified
    // into the full EO taxonomy (27 cells) and the reader-facing Vonnegut
    // eight. Fortune is the reader's conviction over the piece; the shape is
    // the arc it traces — man-in-hole (thesis surprises, body climbs),
    // rags-to-riches (steady creation), flatline (argues nothing).
    vonnegut: documentLedger && rawEntries?.length && documentLines.length
      ? classifyArc(vonnegutShape(documentLines, { materialPropositions: notesFromEdges(rawEntries), index: sessionReferentIndex(session) }))
      : null,
    totalStrain,
    thinking: thinkingBlock || null,
    answerShape: answerShape.shape,
  };
}

const ESSAY_LEDGER_DIR = path.join(HERE, "documents");

// ── document jobs: a composition as a detached, resumable, real-time file ──
// A long essay is not one blocking completion — it is a JOB. It starts
// detached, writes its projection to <dir>/<docId>.md in REAL TIME as each
// section lands, keeps the append-only JSONL ledger, and can be polled or
// picked back up at any moment (the state lives in the ledger file + the
// session, never only in a request).
const _jobs = new Map();
export function documentJobStatus(docId) {
  return _jobs.get(docId) ?? null;
}
export function documentJobIds() {
  return [..._jobs.keys()];
}

// Start a composition job. Returns { docId, sessionId } immediately; the
// work continues in the background. `onToken` receives each streamed chunk;
// the projection file is rewritten as sections land.
export async function startDocumentJob({ task, model, workspace = "", sessionId = null, holonLevel = "section", resumeDocId = null } = {}) {
  const sid = sessionId ?? `er7-doc-${Date.now()}`;
  const jobId = sid; // the essay's ledger lives at ${sessionId}:${turnCount} — use the SAME id so the projection finds it
  const job = {
    jobId, sessionId: sid, model, task, workspace, holonLevel,
    status: "writing", createdAt: Date.now(), updatedAt: Date.now(),
    chars: 0, sections: 0, error: null,
  };
  _jobs.set(jobId, job);
  _jobs.set(sid, job);
  // The essay's ledger is `${sessionId}:${turnCount}` — turnCount starts at 1
  // for a fresh session, so the file is ${sid}:1.jsonl. The .md projection
  // mirrors it. (A reused sessionId with a higher turnCount would shift this;
  // the job creates its own fresh session, so :1 is correct here.)
  const ledgerDocId = `${sid}:1`;
  // THE PROJECTION IS THE LIVE HTML, fed by the JSONL + citations on every
  // refresh — never a stale .md snapshot. MD and JSON are EXPORTS from that
  // HTML, not the default projection.
  const htmlFile = path.join(ESSAY_LEDGER_DIR, `${jobId.replace(/:/g, "_")}_1.html`);
  const jsonlFile = ledgerFilePath(ESSAY_LEDGER_DIR, ledgerDocId);
  const citationsFile = path.join(ESSAY_LEDGER_DIR, `${ledgerDocId.replace(/:/g, "_")}.citations.json`);
  try { fs.mkdirSync(ESSAY_LEDGER_DIR, { recursive: true }); } catch {}
  // CRASH RESILIENCE: if this session already has a ledger (a previous run
  // was interrupted), read the VOID PLAN (the full question set) and which
  // questions are ALREADY answered (the `part` titles) so a resumed run
  // continues the UNANSWERED cells and appends — never restarts, never
  // rewrites. The plan lives in the ledger, so the shape survives a crash.
  const existingFile = ledgerFilePath(ESSAY_LEDGER_DIR, ledgerDocId);
  let answeredTitles = [];
  let planQuestions = null;
  try {
    if (fs.existsSync(existingFile)) {
      const rows = fs.readFileSync(existingFile, "utf8").trim().split("\n").map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      answeredTitles = rows.filter((r) => r.role === "part" && r.title).map((r) => String(r.title).toLowerCase().trim());
      const plan = rows.find((r) => r.role === "plan");
      if (plan?.text) planQuestions = plan.text.split("\n").map((l) => l.replace(/^-\s*/, "").trim()).filter(Boolean);
    }
  } catch {}
  job.resumedFrom = answeredTitles.length ? answeredTitles.length : 0;
  // Run detached — the caller returns immediately.
  (async () => {
    try {
      // The JSONL is the ARTIFACT: it appears first, growing append-only as
      // each section/revision lands. The .html is its LIVE PROJECTION — a
      // shell that fetches the JSONL + citations on every load and folds
      // client-side, so a refresh is always current. The shell is written
      // once (it reads the data, not the other way round); MD and JSON are
      // EXPORTS from it, never the default projection.
      const file = ledgerFilePath(ESSAY_LEDGER_DIR, ledgerDocId);
      const flushProjection = () => {
        try {
          const shell = renderLiveEssayHtml({
            docId: ledgerDocId, title: task.slice(0, 60),
            jsonlPath: `${jobId.replace(/:/g, "_")}_1.jsonl`,
            citationsPath: `${ledgerDocId.replace(/:/g, "_")}.citations.json`,
          });
          fs.writeFileSync(htmlFile, shell);
        } catch {}
      };
      flushProjection();
      // Re-fold the LIVE shell whenever the JSONL grows (each pass): poll the
      // ledger file's size; the shell itself needs no rewrite (it reads the
      // JSONL on refresh), but the job's in-memory projection status updates.
      let lastJsonlBytes = 0;
      try { lastJsonlBytes = fs.statSync(file).size; } catch {}
      const pollTimer = setInterval(() => {
        try {
          const size = fs.statSync(file).size;
          if (size !== lastJsonlBytes) { lastJsonlBytes = size; flushProjection(); }
        } catch {}
      }, 1500);
      // Transient-Ollama resilience: the preflight can fail when Ollama is
      // momentarily busy (unloading after a long job, or the residency ping's
      // request lingering). A bounded short retry rides out the blip instead
      // of failing the whole job. The retry waits on Ollama directly, so it
      // recovers as soon as the upstream answers.
      const result = await (async () => {
        let lastErr = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            return await runProxyTurn(
              { sessionId: sid, model, task, workspace, holonLevel: job.holonLevel, resumeAnswered: answeredTitles, resumePlan: planQuestions },
              (chunk) => { job.chars += chunk.length; job.updatedAt = Date.now(); },
              (note) => { if (note?.move === "composing_section") job.sections++; },
              (thinking) => job.updatedAt = Date.now(),
            );
          } catch (err) {
            lastErr = err;
            const busy = /not responding|ECONNREFUSED|fetch failed|upstream_down/i.test(String(err?.message ?? ""));
            if (!busy || attempt === 2) break;
            await new Promise((r) => setTimeout(r, 8000 * (attempt + 1))); // 8s, 16s
          }
        }
        throw lastErr;
      })();
      clearInterval(pollTimer);
      flushProjection();
      // Completion is SATISFACTION-gated: the job is "complete" only when the
      // DEF shape is realized (all sections satisfied). If it is not satisfied
      // after the correction budget, it is "unsatisfied" — a finding about the
      // pipeline (mis-sized task, thin ground), never a silent pass.
      const sat = result?.satisfaction;
      job.status = result?.truncated ? "truncated" : (sat?.ok ? "complete" : "unsatisfied");
      job.satisfaction = sat ?? null;
      job.totalStrain = result?.totalStrain ?? 0;
      job.result = result;
      job.updatedAt = Date.now();
      flushProjection();
    } catch (err) {
      job.status = "error";
      job.error = err.message;
      job.updatedAt = Date.now();
    }
  })();
  return { jobId, sessionId: sid, status: job.status, htmlFile, ledgerFile: jsonlFile, citationsFile };
}