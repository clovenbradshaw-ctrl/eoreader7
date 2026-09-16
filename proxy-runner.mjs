import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createCausalTextPerceiver, textEncounters, surfaceIndex, surfacesIn } from "./native/adapters/text/recursive.js";
import { diaNorm, namesCorefer } from "./native/adapters/text/surfaces.js";
import { deriveRegister, detectLanguage, questionFor, writeVoiceFor } from "./native/kernel/register.js";
import { createSeededRng, seedFrom } from "./native/kernel/rng.js";
import { queryMeaningPotential, loadSidecar, SIDECAR_PATH } from "./native/kernel/prior-query.js";
import { createWheelLedger } from "./native/kernel/wheel.js";
import { discoveredFramingFor, discoverFraming, applyDiscovered } from "./native/kernel/discovery.js";
import { reviseTextFold } from "./native/adapters/text/revision.js";
import { createRecursiveReader } from "./native/kernel/reading.js";
import { reconstruct } from "./native/kernel/fold.js";
import { createHyperlexicon, admitHyperlexiconCandidates, giveHyperlexiconAffordance } from "./native/kernel/hyperlexicon.js";
import { createRelationCompositionLedger, acquireCompositionCandidates } from "./native/kernel/relation-composition.js";
import { createSession as createCorpusSession, admitChunked } from "./legacy-eoreader6.1/packages/host/corpus.js";
import { executePrompt } from "./legacy-eoreader6.1/packages/host/surfer.js";
import { postprocessAnswer, postprocessCode, validatePython, validateHtml, warmPostprocess, getPyodide } from "./postprocess.mjs";
// The three resolutions — brought in from the-fold (vendored at
// native/the-fold/): the discourse restated at three grains by the reading's
// own organs (atmosphere, lens, paradigm), never by a model's compression.
import { resolutionBlocks } from "./native/the-fold/resolutions.js";
import { tokenize } from "./native/the-fold/source.js";
import { logitBiasFor, logitsBiasObject } from "./native/organs/gemma2-tokenizer.mjs";
import { readingIndexFromLog } from "./native/the-fold/reading-log.js";
import { createDocumentLedger, appendDocumentObservation, appendLedgerLine, projectDocument, documentChangeLog, admitPart, serializeLedger, snipsFromSources, checkEssayShape, ledgerFilePath, renderApaFootnotes, satisfactionOfSection, satisfactionOf, declareEssayVoid, fillCheck, citationLedger, voidCellsFor, holographicSatisfaction, lavarGradeEssay, competencyGrade, lavarGradeReading, kelsenGrade, embedInlineCitations, renderLiveEssayHtml, detectRepetition, detectRedundancy } from "./native/the-fold/document-ledger.js";
import { precedence, tagClaim, precedenceOrderPhrase } from "./native/organs/regime.js";
// The dispute lookup notesFromEdges reads (below): `noteId` is the same
// bare-ends identity a note born with no identity organ already carries in
// kernel/notes.js, and `makeNotes()` is a pure factory (disputesOf/etc. are
// plain functions of a log) — instantiated once here the same way
// organs/hyperlexicon.js and organs/notes-text.js already instantiate it.
import { noteId as notesLedgerNoteId, makeNotes as makeDisputeNotes } from "./native/kernel/notes.js";
const DISPUTE_NOTES = makeDisputeNotes();
import { runDMCA, categorizeCreativity, chaseParaphrase, paraphraseCandidatesFor } from "./native/organs/run-dmca.js";
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
import { matchArchons, archonOf } from "./native/organs/archon-compendium.js";
import { voidHolarchy } from "./native/organs/void-holarchy.js";
// The Charter organ (native/organs/charter.js, Handle: Grotius): governs
// generation against the Universal Declaration of Human Rights. The gate is
// ALWAYS armed — the full 516-language UN corpus when it is beside the
// checkout, a public-domain fallback excerpt otherwise — so a missing corpus
// never silently ungoverns the system. Never fires on descriptive voice
// (reading and talking about human atrocities passes by construction).
import { familyVerdict, familyAffordances, giveCharterFamily } from "./native/organs/charter.js";
import { constitution, ethosClear, requireClearance } from "./native/organs/ethos.js";
import { recordShadow, assessShadow, dispositionFrom } from "./native/kernel/moral-shadow.js";
import { sovereigntyHint, privacyFindings, isDataHoldingTask, sovereignSchemaPrompt, extractSovereignSchema, sovereignDataShell } from "./native/organs/privacy.js";
import { copyFindings, replicationNotes, provenanceFor, annotateWithSources } from "./native/organs/martial.js";
import { securityFindings } from "./native/organs/salzter.js";
import { blindspotFindings } from "./native/organs/blindspot.js";
import { piiFindings, redactPii } from "./native/organs/goffman.js";
import { injectionFindings } from "./native/organs/ulysses.js";
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
// is OLMo 2 7B (Allen Institute for AI, 2024): a 7B-parameter decoder-only
// transformer, Apache-2.0, quantized (Q4_K_M) and served locally via Ollama.
// Its training data (Dolma / OLMo-mix), code, weights and logs are all
// published by its maker — the ethically-sourced model this proxy runs now.
// The registry is data, not code: a caller who runs a different model
// replaces this entry and every citation renames the giver.
const MODEL_REGISTRY = Object.freeze({
  id: "olmo2:7b", // the Ollama id the proxy serves
  hf: "allenai/OLMo-2-1124-7B-Instruct",
  hfUrl: "https://huggingface.co/allenai/OLMo-2-1124-7B-Instruct",
  name: "OLMo 2 7B",
  family: "OLMo 2",
  org: "Allen Institute for AI (Ai2)",
  released: "2024-11-24",
  license: "Apache-2.0",
  params: "7B",
  note: "decoder-only transformer; Apache-2.0; fully open — training data (Dolma/OLMo-mix), code, weights and logs published by Ai2; served locally via Ollama (Q4_K_M).",
  quant: "Q4_K_M",
});
export const MODEL_GIVER = (model) => {
  const m = String(model ?? "").replace(/^er7:/, "").replace(/:q\d+(_\d+)?$/, "");
  if (m === "olmo2:7b" || m === "olmo2:7b-instruct" || m === "olmo2:latest") return MODEL_REGISTRY;
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
  const model = "olmo2:7b";
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
// ONLY SALIENT CONTENT IS EOT-IZED (2026-09-13): the reader is a
// sentence-by-sentence instrument whose cast re-projection re-derives the
// whole cast on a declared cadence, so stepping a 200KB page whole is
// O(prefix × cast²) — measured: two Wikipedia-scale pages pegged the CPU at
// ~99% for ~20 minutes before section 1. The FULL page text is still
// retained on the shadow (S101 recoverable) and admitted to the corpus for
// surf; this budget bounds only the EOT-ize READ window.
const EOT_MAX_CHARS = Number(process.env.ER7_EOT_MAX_CHARS ?? 60000);

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
        admitChunked(session.corpus, { text: piiAdmit(session, text, srcId, onNote), sourceId: srcId });
        if (onNote) onNote({ move: "ignored", url: r.url, score: sal.score.toFixed(2), shared: sal.shared.slice(0, 5) });
      } else {
        // COARSE or FINE: EOT-ize it. FINE additionally steps it through the
        // reader (which is where the holograph absorbs it). COARSE admits the
        // text to the corpus (surf can address it) and steps it through the
        // reader too — the reader's own surprise is the fine-resolution gate
        // on whether it actually moved the reading.
        admitChunked(session.corpus, { text: piiAdmit(session, text, srcId, onNote), sourceId: srcId });
        // ONLY SALIENT CONTENT IS EOT-IZED (2026-09-13). The full text is
        // retained on the shadow (S101) and admitted to the corpus (surf
        // addresses the whole page); only the EOT-ize READ is bounded to a
        // declared window — the reader's cast re-projection makes a whole-page
        // read O(prefix × cast²), measured as ~20 CPU-minutes on two
        // Wikipedia-scale pages before any section was written. The window is
        // the page's lead, which is where encyclopedic content lives; the
        // bounded read is recorded on the shadow so the trace is honest.
        const eotWindow = String(text).slice(0, EOT_MAX_CHARS);
        if (shadowEntry) { shadowEntry.readChars = eotWindow.length; shadowEntry.readBounded = text.length > eotWindow.length; }
        const encounters = textEncounters(eotWindow, { source: `web:${r.url}`, offset: 0 });
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

// ── the code shape prior: what structure a CODE artifact aims at ───────────
// A code file has a canonical structure — module header/imports, public
// interface, implementation, entry point, usage — the way an essay has
// thesis/body/conclusion. The prior is DISCLOSED, and its giver is the real
// source this machine has retained (live_priors/09-source-code — audited /
// landmark repos, via source-code-manifest.json), so the shape is received
// from real code, never invented here. The instrument (code) register carries
// this shape; the essay's 27-cell void sweep does not apply — code's parts
// are its structural units, not questions the piece must answer in prose.
const CODE_SHAPE_PRIOR = Object.freeze({
  schema: "ShapePrior@1",
  form: "code",
  giver: "eoreader7:shape-prior:code-v1",
  basis: "a code artifact's conventional structure, received from the retained source corpus (live_priors/09-source-code: 20 audited/landmark repos, 56 files) — header/imports, interface, implementation, entry point, usage; stated as the shape the artifact aims at, never a prohibition",
  parts: Object.freeze({
    python: ["module docstring and imports", "core functions and types", "command-line interface", "main entry point", "example usage or tests"],
    javascript: ["module header and imports", "public interface and types", "core implementation", "entry point and exports", "example usage or tests"],
    typescript: ["module header and imports", "types and interfaces", "core implementation", "entry point and exports", "example usage or tests"],
    shell: ["shebang and options", "argument handling", "core logic", "error handling and exit codes", "usage"],
    go: ["package header and imports", "types and constructors", "core functions", "main entry point", "tests"],
    rust: ["crate header and imports", "types and traits", "core implementation", "main entry point", "tests"],
    html: ["the complete HTML document — doctype, head, inline CSS, body, inline JavaScript"],
    css: ["the complete stylesheet"],
  }),
});

// The artifact's file name — the request's own named file, else the topic
// slugged with the language's extension. A name read off the request, never
// a guessed path. A web artifact with no named file is index.html (the
// conventional entry point).
function codeArtifactName(task, language) {
  const t = String(task ?? "");
  const m = /\b([a-z0-9][a-z0-9._-]*\.(?:py|js|mjs|ts|tsx|sh|go|rs|html?|css))\b/i.exec(t);
  if (m) return m[1];
  if (language === "html") return "index.html";
  const extByLang = { python: "py", javascript: "js", typescript: "ts", shell: "sh", go: "go", rust: "rs", html: "html", css: "css" };
  const name = topicPhrase(task).replace(/\s+/g, "_").toLowerCase().slice(0, 40) || "program";
  return `${name}.${extByLang[language] ?? "py"}`;
}

function codeSections(task, language) {
  // The code artifact is written WHOLE, in one draw — a small model dumps the
  // whole program in its first part anyway (measured: gemma2:2b wrote the
  // entire CLI in part 1 and left parts 2-5 empty), so the DEF'd shape is
  // CODE_SHAPE_PRIOR (disclosed as the structure the file aims at) and the
  // SECTION is the file itself. Long-form here is the REC loop: generate →
  // hard-validate → re-draw with the errors, each revision a ledger line.
  return [codeArtifactName(task, language)];
}

// A real file from the retained source corpus, as a style reference for the
// mouth — compose like it, never copy it. The live_priors source code is the
// machine's own prior; handing one short real excerpt is the same move the
// narrative voice makes with its exemplar. Lazy + cached; null when the
// corpus is absent (disclosed, never a silent skip).
let _codeManifest = null;
function codeManifest() {
  if (_codeManifest !== null) return _codeManifest;
  try {
    const p = path.join(HERE, "..", "..", "..", "live_priors", "manifests", "source-code-manifest.json");
    _codeManifest = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch { _codeManifest = null; }
  return _codeManifest;
}
function codeExemplar(language) {
  const m = codeManifest();
  if (!m?.repos) return null;
  const ext = { python: ".py", javascript: ".js", typescript: ".ts", shell: ".sh", go: ".go", rust: ".rs" }[language] ?? ".py";
  let best = null;
  for (const repo of m.repos) {
    for (const f of repo.files ?? []) {
      if (!String(f.path ?? "").endsWith(ext)) continue;
      if (!f.local) continue;
      const full = path.join(HERE, "..", "..", "..", "live_priors", f.local);
      try {
        const text = fs.readFileSync(full, "utf8");
        if (text.length < 2000) continue; // a stub is not a style reference
        if (!best || text.length < best.text.length) best = { name: f.local, url: `${repo.raw_base}/${f.path}`, license: repo.license ?? null, text };
      } catch {}
    }
  }
  if (!best) return null;
  return { name: best.name, url: best.url, license: best.license, text: best.text.slice(0, 1600) };
}

// ── THE HTML SHELL (the unconscious owns design + behavior) ────────────────
// The deterministic half of web generation: a complete, self-contained HTML
// document — a real CSS design system (CSS variables, light/dark themes,
// responsive, card layout) and a WORKING dark-mode toggle in the <script> —
// with the mouth's BODY content spliced in. The model is asked for content
// only (the hero text, the menu, the hours), so the design and the
// interactivity are never the model's to get wrong: a 1.5B mouth that can
// write "Cappuccino, $3.50" produces a working, well-designed site.
function htmlShell(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
:root { --bg: #faf6f0; --fg: #2d2a26; --card: #ffffff; --muted: #8a8078; --accent: #c47a3f; }
[data-theme="dark"] { --bg: #1f1c19; --fg: #ece7e0; --card: #2a2622; --muted: #a89f96; --accent: #d69a68; }
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--fg); transition: background .3s, color .3s; }
.container { max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem; }
h1 { font-size: 2.6rem; margin: 0 0 .25rem; letter-spacing: -.02em; }
.tagline { color: var(--muted); font-size: 1.15rem; margin: 0 0 2rem; }
section { background: var(--card); border-radius: 14px; padding: 1.5rem; margin: 1.25rem 0; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
section h2 { margin: 0 0 .75rem; font-size: .95rem; text-transform: uppercase; letter-spacing: .08em; color: var(--accent); }
ul { list-style: none; padding: 0; margin: 0; }
li { display: flex; justify-content: space-between; padding: .45rem 0; border-bottom: 1px solid var(--muted); opacity: .92; }
li:last-child { border-bottom: none; }
.theme-toggle { position: fixed; top: 1rem; right: 1rem; background: var(--accent); color: #fff; border: none; border-radius: 999px; padding: .6rem 1.1rem; cursor: pointer; font-size: .9rem; }
.theme-toggle:hover { filter: brightness(1.08); }
</style>
</head>
<body>
<button class="theme-toggle" id="themeToggle">Dark mode</button>
<div class="container">
${body}
</div>
<script>
(function () {
  var btn = document.getElementById("themeToggle");
  var saved = localStorage.getItem("theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  btn.addEventListener("click", function () {
    var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", cur);
    localStorage.setItem("theme", cur);
    btn.textContent = cur === "dark" ? "Light mode" : "Dark mode";
  });
})();
</script>
</body>
</html>`;
}

// The code section prompt: the mouth is asked for ONE structural unit of the
// file, told the whole spec, the code written so far (to compose, not repeat),
// and the shape it must aim at. No essay voice, no RANKE prose rule — code's
// own discipline (emit source, compose with earlier parts, exact names).
function codeSectionPrompt({ section, language, name, task, i, total, soFar, exemplar }) {
  const shape = CODE_SHAPE_PRIOR.parts[language] ?? CODE_SHAPE_PRIOR.parts.python;
  const exemplarBlock = exemplar
    ? `\nA real ${language} file from the retained source corpus, as a style reference — compose like it, never copy it:\n"""\n${exemplar.text}\n"""`
    : "";
  const soFarBlock = soFar ? `\n\nCode written so far (earlier parts):\n${soFar}\n` : "";
  const sovHint = sovereigntyHint(task);
  // DATA-HOLDING APP: the mouth proposes ONLY the record schema; the machine
  // owns the crypto/fold/snip substrate and composes the seams around it.
  if (language === "html" && isDataHoldingTask(task)) {
    return sovereignSchemaPrompt(task, name);
  }
  // HTML: the mouth writes the BODY CONTENT only — the shell (doctype, head,
  // design-system CSS, working dark-mode JS) already exists in the
  // unconscious. The model's whole job is the notes and concepts: the hero,
  // the five drinks, the hours.
  if (language === "html") {
    return `We're writing the page content for ${name}. The complete specification:\n\n"""\n${task}\n"""\n\nWrite ONLY the page content as HTML elements: a hero (an <h1> with the site name and a <p class="tagline"> with a short tagline), a menu <section> with an <h2> and a <ul> of five drinks with prices, and an hours <section> with an <h2> and the opening hours. The surrounding page, the stylesheet, and the dark-mode toggle already exist — do NOT write <html>, <head>, <body>, <style>, or <script> tags, only the inner content.${sovHint} Emit HTML only, no prose, no markdown fences, no commentary.`;
  }
  const what = language === "css" ? "a stylesheet" : `a ${language} program`;
  const what2 = language === "css" ? "CSS" : `${language} source code`;
  const lawHint = languageLawHint(language);
  if (total === 1) {
    return `We're writing ${name} — ${what}. The complete specification:\n\n"""\n${task}\n"""\n\nWrite the COMPLETE file, start to finish. Aim for this structure: ${shape.join(" → ")}.${lawHint}${sovHint}${exemplarBlock}\n\nRules:\n- Emit ${what2} only — no explanation, no prose, no markdown fences, no commentary about writing.\n- Use the exact names, behavior, and content the specification requires.`;
  }
  return `We're writing ${name} — ${what}. The complete specification:\n\n"""\n${task}\n"""\n\nNow write ONLY this part of the file: ${section} (part ${i + 1} of ${total}).${lawHint}${sovHint}${exemplarBlock}\n${soFarBlock}\nRules:\n- Emit ${what2} only — no explanation, no prose, no markdown fences, no commentary about writing.\n- This part must compose with the parts already written: do not repeat code from earlier parts; use the names they define.\n- Use the exact names, behavior, and content the specification requires.`;
}

// Code satisfaction: the void is filled when the ASSEMBLED file is non-empty,
// not meta-commentary, and passes the hard validator (compile + exec + a
// smoke run). Per-part fill is reported (a small model may write the whole
// file in one part), but it is not the gate — the gate is the file itself.
function codeSatisfaction({ documentLines, sections, validation }) {
  const assembled = (documentLines ?? []).join("\n\n").trim();
  const failures = [];
  const filled = (documentLines ?? []).filter((l) => String(l ?? "").trim()).length;
  if (!assembled) failures.push({ kind: "unfilled", detail: "no code was written" });
  if (/^(here'?s|here is|the (?:code|function|script|module|program)|note that|as an ai|i can'?t|i cannot)/i.test(assembled)) {
    failures.push({ kind: "meta", detail: "the answer describes the code instead of being it" });
  }
  if (validation && !validation.ok) for (const f of validation.findings ?? []) failures.push({ kind: `lint:${f.kind}`, detail: f.detail });
  const ok = failures.length === 0;
  const standing = !validation ? "; unvalidated" : validation.unchecked ? "; no validator ran (unchecked)" : validation.ok ? "; compiles and runs clean" : "; fails validation";
  return { ok, filled, of: sections.length, failures, totalStrain: failures.length, basis: `code satisfaction: ${filled}/${sections.length} part(s) wrote source code${standing}` };
}

// ── SPEC-DERIVED EVA: the task's own requirements, checked as findings ─────
// The one failure class the language validator cannot catch is a DROPPED
// REQUIREMENT — the A/B measured it: a raw small model wrote a menu with zero
// prices because "five drinks with prices" got buried in the spec. The task
// IS the DEF; this reads its own counts ("five drinks"), named content
// ("hero", "menu", "hours", "prices", "dark mode"), and named definitions
// ("a function X") back off the prose, and reports each absent one as a typed
// finding the REC loop then repairs. Heuristic, disclosed — never a proof,
// always a witness over the spec's own words.
const NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const CONTENT_SIGNALS = ["hero", "tagline", "menu", "hours", "prices", "price", "dark mode", "header", "footer", "button", "form", "search", "login", "contact", "about", "theme", "toggle", "navigation", "nav"];
function specFindings(task, text, language) {
  const findings = [];
  const t = String(task ?? "").toLowerCase();
  const out = String(text ?? "").toLowerCase();
  // Counts: "five drinks", "3 columns", "N flags/options/items/sections".
  const countRe = /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(drinks?|items?|sections?|columns?|flags?|options?|steps?|entries?|fields?|menu\s+items?)\b/gi;
  let m;
  while ((m = countRe.exec(t))) {
    const want = NUM_WORDS[m[1].toLowerCase()] ?? Number(m[1]);
    const noun = m[2];
    let got = 0;
    if (language === "html") got = (text.match(/<li[^>]*>/gi) || []).length;
    else if (/flag|option/.test(noun)) got = (text.match(/\badd_argument\b/gi) || []).length;
    if (want > 0 && got < want) findings.push({ kind: "spec_count", detail: `the spec asked for ${want} ${noun} but only ${got} found` });
  }
  // Named content / features.
  const asked = new Set();
  const contentRe = /\b(hero|tagline|menu|hours|prices?|dark mode|header|footer|button|form|search|login|contact|about|theme|toggle|navigation|nav)\b/gi;
  while ((m = contentRe.exec(t))) asked.add(m[1].toLowerCase());
  for (const sig of asked) {
    let present;
    if (sig === "prices" || sig === "price") present = /\$\d|\d+\.\d{2}/.test(out);
    else if (sig === "dark mode" || sig === "theme" || sig === "toggle") present = /\b(dark|theme)\b/.test(out);
    else present = out.includes(sig);
    if (!present) findings.push({ kind: "spec_missing", detail: `the spec asked for "${sig}" but it is absent` });
  }
  // Named definitions (python).
  if (language === "python") {
    const fnRe = /\b(?:function|def|class|method)\s+(?:named\s+|called\s+)?([a-z_]\w*)/gi;
    while ((m = fnRe.exec(t))) {
      const name = m[1];
      if (!new RegExp(`\\b(?:def|class)\\s+${name}\\b`).test(text)) findings.push({ kind: "spec_missing", detail: `the spec asked for "${name}" but it is not defined` });
    }
  }
  return findings;
}

// ── the language-law prior, wired in (live_priors derived-priors) ───────────
// The prior is an INDEX over the engine, used to ground the mouth in the
// language's own laws without re-deriving them: the declaration recipes and
// the stdlib surface. Loaded once per language, cached; absent when the prior
// was not built (disclosed, never a silent skip).
const _lawCache = new Map();
function loadLanguageLawPrior(language) {
  if (_lawCache.has(language)) return _lawCache.get(language);
  let prior = null;
  try {
    const p = path.join(HERE, "..", "..", "..", "live_priors", "derived-priors", "code-priors", `${language}-language-law-prior-v1.json`);
    prior = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {}
  _lawCache.set(language, prior);
  return prior;
}
function languageLawHint(language) {
  const prior = loadLanguageLawPrior(language);
  if (!prior) return "";
  const recipes = (prior.grammar?.declarationRecipes ?? []).map((r) => r.shape).filter(Boolean).join(", ");
  const stdlib = (prior.lexicon?.coreApi ? Object.keys(prior.lexicon.coreApi) : (prior.lexicon?.stdlibModules ?? []).slice(0, 24)).slice(0, 24);
  const parts = [];
  if (recipes) parts.push(`Declaration shapes: ${recipes}.`);
  if (stdlib.length) parts.push(`Standard library available: ${stdlib.join(", ")}.`);
  return parts.length ? `\nThe language's laws (from the engine): ${parts.join(" ")}` : "";
}

// ── ETHOS, UNCONSCIOUS: the artifact's sources, written as a plain comment ──
// The artifact is not morally neutral — it stands on what produced it — but
// the record reads like ordinary code, not like apparatus. A single quiet
// `sources:` line names what was drawn on (the model + its license, the
// language's engine, any exemplar with ITS license, and any site we snipped
// from), the way a developer credits a library. No product name, no banner:
// anyone reading the file just sees its sources. A source is recorded only
// when it is actually known; never fabricated.
function codeSources({ language, model, exemplar, extra = [] }) {
  const src = [];
  const m = MODEL_GIVER(model);
  if (m?.name || model) src.push(`${m.name ?? model}${m.license ? ` (${m.license})` : ""}`);
  const law = loadLanguageLawPrior(language);
  if (law?.giver?.engine?.python) src.push(`Python ${law.giver.engine.python} stdlib (PSF-2.0)`);
  else if (law?.giver?.resource) src.push(law.giver.resource);
  if (exemplar?.url) src.push(`${exemplar.url}${exemplar.license ? ` (${exemplar.license})` : ""}`);
  return [...src, ...extra];
}
function codeSourcesHeader({ language, model, exemplar, extra = [] }) {
  const parts = codeSources({ language, model, exemplar, extra });
  if (!parts.length) return "";
  const line = `sources: ${parts.join("; ")}`;
  if (language === "html") return `<!-- ${line} -->\n`;
  if (language === "python" || language === "shell") return `# ${line}\n`;
  return `/* ${line} */\n`;
}

// Strip markdown code fences from a section the mouth emitted — the mouth is
// told "no fences", but a small model emits them anyway (and often appends an
// afterword: "This HTML document meets the requirements…"); the unconscious
// system removes both so the assembled file is raw code. Never guessed: only
// a matching ``` fence is stripped, and the afterword is dropped only at a
// closing fence boundary.
function stripCodeFences(text, language) {
  const t = String(text ?? "").trim();
  const tag = language ? language.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "[\\w.+-]*";
  // Whole-text single fence.
  const full = new RegExp(`^\`\`\`${tag}[ \\t]*\\n([\\s\\S]*?)\\n\`\`\`[ \\t]*$`, "i").exec(t);
  if (full) return full[1].trim();
  // Leading fence with a trailing afterword: strip the leading fence and cut
  // at the last closing fence (the model's commentary after the code).
  let s = t.replace(/^```[\w.+-]*[ \t]*\n/i, "");
  const lastFence = s.lastIndexOf("\n```");
  if (lastFence !== -1) s = s.slice(0, lastFence);
  return s.trim();
}

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
//
// CHAT IS THE DEFAULT. The proxy is a normal conversation first — every
// answer is a void defined and satisfied at its natural size. Long-form is a
// MODE it can enter, in two flavors: "long" (a single answer that goes
// further than chat provides) and origami (an artifact built on an
// append-only ledger, iterated by revisions, projectable in a surface).
// Neither is entered by a plain question — only by an ask that names it.
const LONG_ASK = /\b(in detail|in more detail|at length|thoroughly|elaborate|expound|in depth|in-depth|deep dive|comprehensive|comprehensively|detailed|thorough|extended|step by step|walk me through|tell me everything|give me the full|the full story|the whole story|explain fully|go deeper|a long answer|a longer answer|long response|\d[\d,]*(?:-|,)?\s*(?:words|pages|paragraphs))\b/i;

// HOLMES'S CAST (the register's meaning potential): the genres the sidecar
// has actually read — cached, read once. The register derives its field from
// these (a learned sign) before falling back to the received noun table.
let _sidecarGenres = null;
function sidecarGenres() {
  if (_sidecarGenres === null) {
    try { _sidecarGenres = (loadSidecar()?.entries ?? []).map((e) => e.genre).filter(Boolean); } catch { _sidecarGenres = []; }
  }
  return _sidecarGenres;
}

// THE GROUND-SEED (a story's cast, drawn at random FROM the ground, never
// invented): the machine's accumulated ground — the sidecar's staging (the
// genre's own phase names, with their source), the discovered framing's
// beats, and the reader's named beings (if the read established any) — is
// shuffled by a seeded RNG and picked as the story's cast. Every member keeps
// its PROVENANCE, so the story is traceable to what inspired it; the seed is
// recorded so the draw is reproducible.
function groundSeed(session, { sidecar = null, framing = null, field = null, count = 4 } = {}) {
  const ground = [];
  // 1. the reader's named beings (proper-noun referents the read established)
  try {
    const idx = sessionReferentIndex(session, null);
    for (const r of (idx?.referents ?? new Map()).values()) {
      const name = [...(r.surfaces ?? [])][0];
      if (name && name.length > 2 && /^[A-Z]/.test(name)) ground.push({ name, provenance: (r.provenance?.length ? [...r.provenance].slice(0, 2) : ["the reading"]) });
    }
  } catch {}
  // 2. the sidecar's staging — the genre's own phase names, with their source
  for (const e of (sidecar?.entries ?? [])) {
    if (field && e.genre && !String(e.genre).includes(field) && !field.includes(String(e.genre))) continue;
    for (const s of (e.staging ?? [])) {
      const name = String(s ?? "");
      if (name.length > 80 || /^part\s/i.test(name) || /^section\s/i.test(name) || /\bemergency\b/i.test(name)) continue; // license preamble + long fragments are not cast
      ground.push({ name, provenance: [e.source?.file ?? "the sidecar"] });
    }
  }
  // 3. the discovered framing's beats
  for (const s of (framing?.staging ?? [])) ground.push({ name: String(s), provenance: ["the discovered framing"] });
  const uniq = [...new Map(ground.map((g) => [g.name, g])).values()].filter((g) => g.name && g.name.length > 2);
  if (!uniq.length) return { seed: null, cast: [], basis: "no named ground — the story's cast is the register's own" };
  const seed = seedFrom(`${Date.now()}:${Math.random()}`); // a fresh random seed each run, recorded for reproducibility
  const rng = createSeededRng(seed);
  const pool = [...uniq].slice(0, 24);
  const picked = [];
  while (picked.length < count && pool.length) {
    const i = Math.floor(rng() * pool.length);
    const b = pool.splice(i, 1)[0];
    picked.push({ name: b.name, provenance: b.provenance });
  }
  return { seed, cast: picked, basis: `cast drawn at random (seed ${seed}) from ${uniq.length} grounded name(s): sidecar staging + framing beats + the read's beings` };
}

// RANKE'S LAW (anti-kitsch, anti-plagiarism): the mouth COMPOSES its own
// sentences. It may GROUND a fact (cited to the source) or INVENT (labeled as
// its own claim) — but it never copies a source's words as its own prose. A
// verbatim run is refused: it is kitsch, and the ring's whole point is that
// the law refuses kitsch.
const RANKE_RULE = "Compose your own sentences. You may state a grounded fact (it will be cited to its source) or invent (it will be labeled as yours) — but never copy a source's words as your own prose. A sentence lifted from the material is refused.";

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
  // THE REGISTER (Halliday) — no hardcoded "essay mode". ANY named genre the
  // person asks us to produce enters the staged-artifact pipeline: a story,
  // a poem, a nocturne, a film, an essay — the register resolves the FIELD
  // (open set) and the MODE (medium). The essay is one field among many.
  const reg = deriveRegister(t, { genres: sidecarGenres() });
  const produce = /\b(?:write|compose|draft|prepare|generate|produce|make|tell|build|create|implement|code)\b/i.test(t);
  const aimsAt = /\b(?:on|about|covering|addressing)\b/i.test(t);
  const multiPart = /\b(multi-?part|long-?form|several sections|a several-part piece|numbered sections)\b/i.test(t);
  const namesGenre = Boolean(reg.field.field) || reg.mode !== "text"; // a registered genre OR a non-text medium
  // A code ask ("write a Python CLI tool…") is a composition even without an
  // "about/on" object — the instrument register names the artifact directly.
  const isCodeAsk = reg.field.field === "instrument";
  if ((produce && namesGenre && (aimsAt || isCodeAsk)) || multiPart)
    return { shape: "composition", maxTokens: CALL_MAX_TOKENS, modality: "grounded", register: reg };
  // LONG — a response that goes further than chat provides: the task asks
  // for elaboration or depth, still one answer (no artifact, no ledger).
  if (LONG_ASK.test(t))
    return { shape: "long", maxTokens: LONG_MAX_TOKENS, modality: "extended" };
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
  "You're a careful, plain-speaking reader. You work from what a person gives you, answer what they actually asked, say plainly when something isn't established rather than filling the gap, and you may hold the person to what they've told you before — gently, never to win. Every claim you make carries its standing: say what is established and what it rests on. When a person challenges a claim, hold it to its ground — name the ground it stands on and stand behind it; never apologize for holding a position, never say you're still learning or that you make mistakes. If something is not established, say so plainly and name what would settle it.";

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
  const perceivers = [createCausalTextPerceiver({ minRelationSurfaces: MIN_RELATION_SURFACES, posPrior: POS_PRIOR, descriptorAnchoring: ANCHORING, reprojectEvery: Number(process.env.ER7_REPROJECT_EVERY ?? 10) })];
  return createRecursiveReader({ perceivers, adapters });
}

// --- per-session reader state -------------------------------------------------
const sessions = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ── PII AT ADMISSION (Goffman) ──────────────────────────────────────────────
// Scan material the moment it is ADMITTED — before it enters the corpus/fold —
// so PII is caught at the door, not after it has been read. Findings accumulate
// on the session (disclosed on the result). With ER7_PII_REDACT=1 the value is
// replaced in place, so the PII never enters the fold at all; the REDACTION
// table is the same table the detector uses, so they cannot drift.
const PII_REDACT = process.env.ER7_PII_REDACT === "1";
function piiAdmit(session, text, sourceId, onNote) {
  let t = String(text ?? "");
  try {
    const r = piiFindings(t, { where: sourceId });
    if (r.findings.length) {
      if (!session.pii) session.pii = [];
      for (const f of r.findings) session.pii.push(f);
      if (onNote) onNote({ move: "pii_admitted", source: sourceId, counts: r.counts, redacted: PII_REDACT });
    }
    if (PII_REDACT) t = redactPii(t);
  } catch { /* the hook must never block an admission */ }
  return t;
}

// THE BEARING WALL: a session cannot be built without a clearance from the
// ethos (organs/ethos.js). requireClearance throws if it is missing, so the
// reader has a hard, structural dependency on the constitution — pull the
// ethos and the reader falls. Ethos comes before logos.
function getSession(sessionId, clearance) {
  requireClearance(clearance);
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastAccess > SESSION_TTL_MS) sessions.delete(id);
  }
  if (sessions.has(sessionId)) {
    const s = sessions.get(sessionId);
    s.lastAccess = now;
    s.clearance = clearance;
    return s;
  }
  const reader = createSessionReader();
  const entry = { reader, corpus: null, corpusIndex: null, lookIndex: null, lastChatText: "", turnCount: 0, lastAccess: now, indexSig: null, referents: null, webLedger: null, webSources: new Map(), field: null, shadow: [], pii: [], clearance };
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
    const res = admitChunked(session.corpus, { text: piiAdmit(session, text, e.rel, onNote), sourceId: e.rel });
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
            const lookRes = admitChunked(session.corpus, { text: piiAdmit(session, lookedText.text, `${e.rel}::look`, onNote), sourceId: `${e.rel}::look` });
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
        const res = admitChunked(session.corpus, { text: piiAdmit(session, result.text, `${img.rel}::look`, onNote), sourceId: `${img.rel}::look` });
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

// THE CONVERSATION IS NOT MATERIAL. The chat's own text is admitted to the
// corpus so the reader folds it (and the surfer can address prior turns),
// but it is never WRITE-FROM ground: a projection asked with no other
// material must not count its own task text as grounding, or the
// multi-section pipeline churns ungrounded prose against an empty ground.
const isConversationSource = (sourceId) => String(sourceId ?? "").startsWith("chat:");

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
      if (isConversationSource(sourceId)) continue;
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
  // result with no text at all is unusable. The conversation's own text
  // (source_id `chat:...`) is never material either.
  const candidates = (result.fan ?? [result]).filter((c) => c?.text && !isConversationSource(c.source_id ?? c.source ?? null));
  if (!candidates.length) {
    const first = result.fan?.[0] ?? result;
    const gap = result.gap ?? first?.gap ?? "content_not_found";
    // SECOND WITNESS: the absolute ladder found nothing — the field recalls
    // what the question's words RESEMBLE. A real recall is kept (addressed_by
    // "field"); a recall inside the null band is not a recall, and the void
    // is disclosed as a void, never dressed up as a match.
    const field = fieldRecall(session, task);
    const recalled = field.recalled.filter((r) => !isConversationSource(r._ledger?.source));
    if (recalled.length) {
      if (onNote) onNote({ move: "surfaced", operator: "FIELD", fan: recalled.length, docs: session.corpus.documents.size, kind: field.kind, band: field.band ? { hi: field.band.hi } : null });
      return { segments: recalled, void: false, addressedBy: true, addressedByWitness: "field", band: field.band ? { hi: field.band.hi } : null };
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
        if (isConversationSource(r._ledger?.source)) continue;
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
// The LONG flavor of long-form: a single answer that goes further than chat
// provides (an extended response, no artifact, no ledger). One bounded draw
// at a generous budget — the void is "answer thoroughly", filled in one
// sitting rather than section by section.
const LONG_MAX_TOKENS = Number(process.env.ER7_LONG_MAX_TOKENS ?? 2600);
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
// Sized for OLMo 2 7B's 4096-token window (the proxy's default model):
// 4096 - 1024 output = 3072 prompt tokens; at the conservative 3 chars/token
// used below that is 9216 chars. gemma2:2b's 8192 window was the prior budget.
const PROMPT_MAX_CHARS = Number(process.env.ER7_MAX_PROMPT_CHARS ?? 9216);
// ONE DECLARED WINDOW PER MODEL, ACROSS EVERY CALLER (2026-09-15). This was
// 4096 — sized for OLMo 2 7B's own trained window — and the consequence, once
// measured rather than assumed, is a reload storm: Ollama's window for a
// caller that declares NOTHING is adaptive to free memory, so the-fold's page
// (which declared nothing until today) kept landing on a different window than
// this proxy's explicit one, and every disagreement is a full reload that also
// discards the prompt cache. Measured on the live server, same model, back to
// back: `num_ctx: 8192` reloads to 8192 (1,217ms), no num_ctx reloads the SAME
// model to 4096 (1,138ms), `num_ctx: 4096` twice reloads not at all (117ms,
// 129ms). In one 4.5-hour window of real traffic gemma2:2b was loaded 82 times,
// 67 of those at a changed window.
//
// 8192 is gemma2:2b's own trained window and matches what the page now declares
// for it, so the copy already resident for a chat turn is reused instead of
// rebuilt. A model whose trained window is smaller (OLMo 2 7B's 4096) is
// clamped by Ollama to its own, deterministically, for every caller alike. The
// max() below keeps this proxy's budget guarantee unchanged; a deployment whose
// models want a different ceiling declares it in ER7_NUM_CTX.
const NUM_CTX = Number(process.env.ER7_NUM_CTX ?? 8192);
const MSG_OVERHEAD_CHARS = 64;
// Post-processing latency guard: this many ms max per turn for the pyodide
// lint + dependency reorder. Warmed at boot; if it ever exceeds this, the
// original text is returned untouched so turns never stall on the tooling.
const POSTPROCESS_TIMEOUT_MS = Number(process.env.ER7_POSTPROCESS_TIMEOUT_MS) || 3000;
// The discourse at three resolutions (vendored the-fold resolutions.js, P171):
// 0 = nearest verbatim only, 1 = + atmosphere, 2 = + lens, 3 = + paradigm.
const RESOLUTIONS_LEVEL = (() => { const raw = process.env.ER7_RESOLUTIONS; if (raw === undefined || raw === null || raw === "") return 3; const v = Number(raw); return [0, 1, 2, 3].includes(v) ? v : 3; })();
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
              // The bridge keeps the account of what each model really does
              // (heimdall.observeCall): Ollama has just handed us its own
              // counters, so reporting them costs nothing and no watcher has
              // to spend a call to find out. Lazily imported and never
              // awaited — a report may not slow a turn, and node hands back
              // the same heimdall instance the proxy already runs.
              import("./heimdall.mjs").then((h) => h.observeCall({
                model,
                promptTokens: obj.prompt_eval_count ?? 0,
                promptMs: (obj.prompt_eval_duration ?? 0) / 1e6,
                genTokens: obj.eval_count ?? 0,
                genMs: (obj.eval_duration ?? 0) / 1e6,
                loadMs: (obj.load_duration ?? 0) / 1e6,
              })).catch(() => {});
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

// ── broad recall: the "summarize / what do you remember" class ──────────────
// A question that asks for the CONVERSATION ITSELF is not addressed by any
// single passage: "what do you remember about me" shares almost no tokens
// with the planted turns, so the absolute ladder and the field both come up
// empty for exactly the question that asks for the whole. These questions
// are answered from the conversation's own fold (conversationFoldSegments),
// never from a void or a tautological re-address of the current turn.
const BROAD_RECALL_RE = /\b(?:summari[sz]e\b|sum\s+up\b|recap(?:itulate)?\b|remember about me|remember anything about me|what do you (?:remember|recall|know about me)|what (?:do|did|have|'ve|are) (?:we|i|you and i) (?:talk(?:ed)?|discuss(?:ed)?|say|said|cover(?:ed)?|share(?:d)?) about|what (?:we|i|you and i) (?:have|'ve) (?:talked|discussed|said|covered|shared)|what have we been talking about)/i;
function isBroadRecall(task) {
  return BROAD_RECALL_RE.test(String(task ?? ""));
}

// The conversation's own fold, as surfaced segments: the corpus's chat
// documents (one per admitted turn, in order), capped like any surfed
// segment. The CURRENT turn — just admitted, still unanswered — is excluded
// (the model already holds it as its own task); the fold is what came before.
function conversationFoldSegments(session, task, materialText = "") {
  const segments = [];
  let total = 0;
  const current = String(materialText ?? "").trim();
  const currentIs = (text) =>
    text === current || (current.endsWith(text) && text.includes(`[user]: ${task}`));
  for (const [sourceId, doc] of session.corpus?.documents?.entries?.() ?? []) {
    if (!String(sourceId ?? "").startsWith("chat:")) continue;
    const text = String(doc?.text ?? doc ?? "").trim();
    if (!text || currentIs(text)) continue;
    total += text.length;
    if (total > SURF_MAX_TOTAL_CHARS) break;
    segments.push({
      text: text.slice(0, SURF_MAX_SEGMENT_CHARS),
      _ledger: { source: sourceId, heading: null, addressed_by: "conversation", bytes: [0, text.length] },
    });
  }
  return segments;
}

// The conversation as EXCHANGES, read from the session's OWN corpus when the
// client sent no history (each request carries only the current message, so
// the conversation lives only in the fold). The live question — just admitted
// — is excluded: it is asked, not yet answered.
function transcriptFromSession(session, task) {
  const transcript = [];
  let turn = 0;
  for (const [sourceId, doc] of session.corpus?.documents?.entries?.() ?? []) {
    if (!String(sourceId ?? "").startsWith("chat:")) continue;
    const text = String(doc?.text ?? doc ?? "").trim();
    if (!text) continue;
    for (const line of text.split("\n")) {
      const t = String(line ?? "").trim();
      const q = /^\[user\]:\s*(.+)/i.exec(t)?.[1]?.trim();
      const a = /^\[assistant\]:\s*(.+)/i.exec(t)?.[1]?.trim();
      if (q) {
        if (q === String(task ?? "").trim()) continue;
        transcript.push({ turn: ++turn, question: q, answer: "", refs: [] });
      } else if (a && transcript.length) {
        transcript[transcript.length - 1].answer = a;
      }
    }
  }
  return transcript;
}

// The conversation's own BEINGS, for a broad question's active set: the
// referents the conversation's own words resolve to, via the index's OWN
// identity organs (resolveIn + represent — never a scan, P11/P38). A broad
// question names none of them itself, so the resolution blocks get them as
// the active set or the digest is empty for exactly the question that asks
// for the whole. Function/question words the reader happened to admit
// ("what", "do", "me") are not beings the summary is about and are never
// named.
const NON_BEING = /\b(?:what|which|who|whom|whose|where|when|why|how|do|does|did|i|me|my|you|your|we|us|our|it|its|he|she|they|them|the|a|an|is|are|am|have|has|had|was|were|be|been|being|to|of|in|on|at|for|with)\b/i;
function conversationBeings(index, transcript = []) {
  if (!index || typeof index.resolveIn !== "function") return [];
  const text = (transcript ?? [])
    .map((t) => `${t?.question ?? ""} ${t?.answer ?? ""}`.trim())
    .filter(Boolean)
    .join(" ");
  let ids;
  try { ids = index.resolveIn(String(text)); } catch { return []; }
  const names = new Set();
  for (const id of [...(ids ?? [])]) {
    const name = index.represent?.(id) ?? id;
    if (typeof name === "string" && name.length >= 2 && !NON_BEING.test(name)) names.add(name);
  }
  return [...names].slice(0, 4);
}

// The notes the Lens reads: the fold's own EOHyperedge@1 entries, one ledger
// row per edge, endpoints as their SURFACES — the referent index resolves a
// surface; the perceiver's own `ref`s live in a different id space. sources/
// witnesses give the blocks their standing phrases.
//
// DISPUTE LOOKUP (2026-09-14, closing the Kelsen dispute-veto gap): a
// graphEntry here has NO dispute field at any layer — kernel/fold.js's
// perception graph and kernel/notes.js's assertion ledger (where `dispute`/
// `attest`/`concede` actually live, per that file's own CON·Figure·
// CONTESTED act) are two separate structures that nothing in this live
// answer pipeline ever bridges; `session.reader` never builds a notes.js
// ledger at all. Duplicating dispute DETECTION here — inferring a contest
// from the raw graph itself — would be exactly the mistake CLAUDE.md's own
// top rule warns against (an organ for this already exists: notes.js's
// dispute/attest/concede triple, corroboration.js's contestedSearch). So
// this function takes an OPTIONAL `disputeLog` — a real notes.js ledger, if
// a caller has one — and looks up each note's live disputes by the SAME
// identity notes.js already uses for a note born from bare ends with no
// identity organ: `noteId(end1, label, end2)` (kernel/notes.js), which is
// byte-for-byte the (subject, relation, object) triple built below. No
// disputeLog supplied (every current call site) means `disputedBy` stays
// empty everywhere, exactly as before this change — the gap this closes is
// that the FIELD now exists and is wired all the way to kelsenGrade's
// tagClaim, ready the moment a live notes ledger is threaded in; actually
// running contestedSearch (or any other dispute-detection) during a live
// conversation turn is a separate, larger, budget/latency design decision
// (corroboration.js's own header: "model calls are the scarce resource"),
// not attempted here.
export function notesFromEdges(graphEntries = [], { disputeLog = null } = {}) {
  const disputes = disputeLog ? DISPUTE_NOTES.disputesOf(disputeLog) : null;
  const notes = [];
  for (const e of graphEntries ?? []) {
    // The fold's graphEntries carry the REDUCED {relation, participants} shape
    // (recursive.js), not a full EOHyperedge@1 schema — measured 2026-09-13:
    // every proposition was dropped by the schema check, so LaVar graded the
    // essay against zero material claims and reported "unsatisfied" with
    // ofPropositions 0. Both shapes are propositions; neither is required.
    const reduced = e?.relation && Array.isArray(e?.participants);
    if (e?.schema !== "EOHyperedge@1" && !reduced) continue;
    if (!e?.relation) continue;
    const parts = e.participants ?? [];
    const end = (p) => p?.surface ?? p?.ref ?? p?.surfaceKey ?? null;
    const subject = end(parts[0]);
    if (!subject) continue;
    const object = end(parts.length > 1 ? parts[parts.length - 1] : null) ?? "?";
    const disputedBy = disputes?.get(notesLedgerNoteId(subject, e.relation, object))?.map((d) => d.source) ?? [];
    notes.push({ subject, verb: e.relation, object, end1: subject, end2: object, label: e.relation, witnesses: e.witness ? [e.witness] : [], sources: 1, ...(disputedBy.length ? { disputedBy } : {}) });
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

// ── the answer's grain: MODE ────────────────────────────────────────────────
// The proxy is a normal conversation first; long-form is a mode it can enter.
// "auto" decides per turn: projection on an explicit artifact ask, long on an
// elaboration ask, chat otherwise. "chat"/"long"/"projection" force it
// (projection aliases "compose"/"artifact"/"origami"). Every answer — whatever
// the mode — is a void defined and satisfied; the mode is the GRAIN at which
// the void is filled (one answer, one extended answer, or an append-only-ledger
// artifact whose live projection is read in a surface, iterated by revisions).
function normalizeMode(m) {
  if (m === "compose" || m === "artifact" || m === "origami") return "projection";
  return ["chat", "long", "projection", "auto"].includes(m) ? m : "auto";
}

// The void's satisfaction for a single-answer mode (chat / long): the answer
// filled the void it was defined against. Lighter than the essay-grade EVA
// (no continuity/grounding gate — a chat answer may rest on model knowledge),
// but honest: empty is unfilled, a thin substantive answer is thin, and
// answering about the instrument instead of the question is meta.
function chatVoidCheck(text, { shape, material = "" } = {}) {
  const t = String(text ?? "").trim();
  if (!t) return { ok: false, filled: 0, of: 1, failures: [{ kind: "unfilled", detail: "the void named an answer; nothing was written" }], strain: 1 };
  if (["greeting", "command", "trivial"].includes(shape))
    return { ok: true, filled: 1, of: 1, failures: [], strain: 0, basis: `${shape} — a small void, filled in one answer` };
  const failures = [];
  let strain = 0;
  // A short answer is a filled void for a plain question — "Paris" answers
  // "what is the capital of France" completely. The thin test applies only
  // when the void wanted SUBSTANCE (a research question with material to draw
  // from, or an extended answer), never to a direct question.
  if (["research", "long"].includes(shape) && t.length < 40) { failures.push({ kind: "thin", detail: "the answer is almost empty — the void wanted substance" }); strain++; }
  if (/\b(as an ai|i can't|i cannot|i'm just|i'm not able|let me know if you)\b/i.test(t)) { failures.push({ kind: "meta", detail: "the answer talks about the instrument instead of answering" }); strain++; }
  return { ok: failures.length === 0, filled: failures.length ? 0 : 1, of: 1, failures, strain };
}

// ── THE PARAPHRASE CHASE (the meaning rule, 2026-09-14): "something is a
// paraphrase if it isn't character identical but the holograph equates to the
// same thing — and you do have to chase meaning." AND the user's amendment:
// no model evaluates paraphrasing, and meaning always has a for whom — even
// the empty hub of the ethos at this fold. The verbatim instrument (runDMCA)
// is character identity; its silence is now NAMED by the shadow chase
// (paraphraseCandidates). The EQUATE is performed by the RECORD, never a
// model: the fold's own claim rows — {label, end2, end1} at referent
// identity, the very rows the material ledger holds — are equated against the
// candidate spans FOR the run's whom (here: the EVA lens, LaVar). A span that
// resolves to a row is grounded-by-meaning, moved to Derive on the ledger's
// own ruler; a span no row resolves is NAMED un-equatable FOR that whom,
// disclosed, never laundered. No model is asked while meaning is equated.
// ────────────────────────────────────────────────────────────────────────

export async function runProxyTurn({ sessionId, userId = null, model, task, chatHistory = [], discourse = "", workspace = "", holonLevel = "section", resumeAnswered = [], resumePlan = null, kelsen = null, mode = "auto", signal = null }, onToken, onNote = null, onThinking = null) {
  const usage = { promptTokens: 0, completionTokens: 0 };
  _hot.add(model); // this turn is using it — hold it resident after
  // ── ETHOS FIRST (the ground) ──────────────────────────────────────────────
  // The constitution (Charter/Grotius + the spec gate/Brandeis) produces a
  // CLEARANCE. The session below REQUIRES it — so the ethos is a bearing wall,
  // not a governor: remove this and getSession() throws, breaking every turn.
  const { charter, family: charterFamily, source: charterSource } = constitution();
  // THE SHADOW TRAIL (Bourdieu): the person's accumulated acts condition THIS
  // one's assessment — the cross-session pattern is the second witness a single
  // request cannot supply. Read before the gate; the act is recorded after.
  const personId = userId ?? sessionId;
  const shadowBefore = assessShadow(personId);
  const clearance = ethosClear(task, { disposition: dispositionFrom(shadowBefore) });
  const session = getSession(sessionId, clearance);
  // Record this act's norm-standing (append-only, never merged).
  const shadowType = !clearance.cleared
    ? "norm_conflict"
    : (clearance.voice?.descriptive && !clearance.voice?.prescriptive ? "descriptive" : "norm_compliant");
  recordShadow(personId, { shadow: shadowType, reason: clearance.reason, task });  // THE REGISTER, READ ONCE — the request's field/tenor/mode (Halliday). The
  // instrument (code) field decides whether the projection writes SOURCE CODE
  // or prose; it is read off the request itself, never from the mode forced by
  // a caller, so a code ask stays code even when a job forces "projection".
  const taskRegister = deriveRegister(task, { genres: sidecarGenres() });
  const isInstrument = taskRegister?.field?.field === "instrument";

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

  // 1.5 DEF THE VOID — UNIVERSAL, EVERY TURN. The void is the shape of what
  // the answer must satisfy; the MODE is the grain at which it is filled.
  // A chat answer fills a small void in one draw; a long answer fills a
  // larger one in a single extended draw; a projection fills a large void
  // section by section on an append-only ledger, iterated by revisions, its
  // live projection read in a surface. The void is defined by ASKING
  // QUESTIONS first (from the task + topic; the reading is still empty, so
  // no material can steer the shape).
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
  // THE HONEST GOLDEN, hoisted to function scope (2026-09-13): every
  // proposition the mouth is handed is recorded here, so the satisfaction can
  // score the UNPROMPTED recall — claims the essay carries that it was never
  // told. Grading the echo is scoring the prompt, not the reading.
  const handedKeys = new Set();
  const keyOf = (p) => `${p.end1 ?? ""}|${p.label ?? ""}|${p.end2 ?? ""}`;
  const preVoid = voidCellsFor({ topic, question: task, openQuestions: [], shadowReferents: [], reading: readingState() });
  // The origami SECTIONS are the CONTENT cells (grounded prose about the
  // subject); the shape-instrument cells steer internally but are not reader
  // sections. The seed question is still the first content question.
  const voidQuestions = preVoid.cells.filter((c) => c.relevant && c.essay).map((c) => c.question);
  if (onNote) onNote({ move: "void_questions", of: voidQuestions.length, cells: `${preVoid.cells.filter((c) => c.relevant && c.essay).length} content / ${preVoid.cells.filter((c) => c.relevant && !c.essay).length} shape of ${preVoid.relevant} relevant`, questions: voidQuestions.slice(0, 5) });
  // THE MODE DECISION — made HERE, before any expensive essay-oriented work,
  // and never upgraded by material discovered later. "auto" is a normal
  // conversation: a plain question stays chat; only an explicit artifact ask
  // becomes projection and an elaboration ask becomes long. The preliminary
  // shape uses the task + workspace alone (no web — the decision never
  // depends on having gone out and gathered).
  const prelimShape = detectAnswerShape(task, workspaceStats.files > 0, false, false, [], null);
  const runMode = normalizeMode(mode) === "auto"
    ? (prelimShape.shape === "composition" ? "projection" : prelimShape.shape === "long" ? "long" : "chat")
    : normalizeMode(mode);
  if (onNote) onNote({ move: "void_defined", mode: runMode, shape: prelimShape.shape, of: voidQuestions.length, basis: mode === "auto" ? null : "forced by the caller" });
  // CODE MODE: a projection whose register is INSTRUMENT (code) writes source
  // code, not prose. The language is read off the request; python when it
  // names none (disclosed). Every essay-specific organ (the 27-cell void, the
  // meaning-potential staging, Ranke/Murch, APA citations) is bypassed for
  // code — its shape is CODE_SHAPE_PRIOR, its voice is code, its check is the
  // hard pyodide validator.
  const isCode = runMode === "projection" && isInstrument;
  const codeLanguage = isCode ? (detectLanguage(task) ?? "python") : null;
  // DATA-SOVEREIGN APP: a web app that HOLDS records (notes/contacts/ledger).
  // The unconscious owns the substrate (encrypted event log + fold + snip/cut);
  // the model proposes only the record SCHEMA. The machine renders the shell
  // around it — the model never writes crypto, storage, or the fold.
  const isSovereignData = isCode && codeLanguage === "html" && isDataHoldingTask(task);
  // THE SPEC GATE (at the ask) — the refusal came from the ethos clearance at
  // the turn's top (constitution → ethosClear). Refused: no generation, the
  // refusal IS the answer. The clearance rides the session, so every turn
  // carries its standing.
  const specRefusalText = !clearance.cleared ? `[EOReader7 refused: ${clearance.reason}.]` : null;
  if (specRefusalText && onNote) onNote({ move: "spec_refused", reason: clearance.reason });
  // THE WHEEL (D/E/R): every stage of the pipeline is one pass of
  // Void/Beings/Fold — DEF what would satisfy it, EVA a real difference,
  // REC an append-only landing whose pattern is the next stage's ground.
  // One ledger per run; the turns ARE the run, in order.
  const wheel = createWheelLedger({ task });
  if (prelimShape?.register) {
    wheel.turn("register",
      "a right register must construe the request's genre as a staged process, carried in a medium, for a tenor — from the request's own structure, never a noun list",
      { field: prelimShape.register.field?.field ?? null, mode: prelimShape.register.mode, tenor: prelimShape.register.tenor?.tenor ?? null, provenance: prelimShape.register.field?.provenance ?? "staged", basis: prelimShape.register.basis },
      prelimShape.register,
      { evaBasis: "Holmes reads the cast through the meaning potential — a LEARNED sign where the sidecar has read this field, a RECEIVED one where it has not; the impression hunt is its first EVA", operator: "NUL", grain: "Ground", face: "the void opens" });
  }
  // Gore's initial gather: hunt the FIRST question (the most basic: "What is
  // X?") to seed the reading — then the per-section loop below strikes each
  // remaining question for its own shape.
  // The SEED QUERY is the clean TOPIC, never the first void question — a
  // question like "What is the bongo antelope, marked off from everything
  // adjacent to it — what space is this essay..." is a terrible web search
  // string (measured: it returned nothing, so the ground was the chat text
  // alone and every section failed grounding). The topic is a real search
  // term; the void questions are the SECTIONS, not the search queries.
  // PROJECTION hunts the web for its shape. A normal chat turn does NOT go out
  // and search the topic — chat is the main use case; a research-shaped ask
  // may still gather when the web door is explicitly open (ER7_WEB_SEARCH=1).
  const seedQuery = topic;
  let webResult = { pages: 0, chars: 0 };
  let hasWeb = false;
  if (runMode === "projection" && !isCode) {
    // Projection hunts the web for its shape — the void's own hunt.
    webResult = await searchAndAdmitWeb(session, sessionId, seedQuery, onNote, { move: "gather" });
    hasWeb = webResult.pages > 0;
  } else if (WEB_SEARCH_ON && (prelimShape.shape === "research" || prelimShape.shape === "open")) {
    // A research-shaped chat ask may gather when the web door is open
    // (ER7_WEB_SEARCH=1) — but never a plain question by default.
    webResult = await searchAndAdmitWeb(session, sessionId, task, onNote, { move: "gather", maxPages: 2 });
    hasWeb = webResult.pages > 0;
  }

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
      admitChunked(session.corpus, { text: piiAdmit(session, delta, srcId, onNote), sourceId: srcId });
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
  // THE LICENSE (THE-MORAL-CORE.md): the charter family's prohibitions and
  // protections are GIVEN affordances with the charters as giver — the LICENSE
  // the composition runs under, not a filter it passes through. Only a given
  // affordance licenses composition (kernel/hyperlexicon.js): a reading that
  // would compose "permit torture" finds no such given, because the family gave
  // "prohibit torture" instead. Issued BEFORE any observed candidate, so
  // experience can never override the charters (admission's own
  // `standing === "given"` guard drops later candidates on a given key).
  const licensedHyperlexicon = giveCharterFamily(createHyperlexicon(), charterFamily, giveHyperlexiconAffordance);
  const hyperlexicon = admitHyperlexiconCandidates(licensedHyperlexicon, observed.map((c) => ({
    left: c.left, right: c.right, giver: GIVER,
    witnesses: (c.witnesses ?? []).slice(0, 3).map((w) => w?.[0]).filter(Boolean),
    meta: { independentSupport: c.meta?.support ?? 0, rememberedLeft: false, rememberedRight: false },
  })));

  if (onNote) onNote({ move: "composed", relations: stats.relationEdges, bindings: stats.referentBindings, hyperlexicon: Object.keys(hyperlexicon.composition ?? {}).length });

  // KELSEN — THE PRIMARY MODALITY, ON EVERY SURFACE. The reading's own claims
  // are linted through the precedence order (regime.js's own PRECEDENCE_STEPS
  // / precedenceOrderPhrase() — imported above, never hand-typed here again;
  // this comment used to restate it by hand and, audited 2026-09-14, had
  // drifted to drop "regime" entirely) whenever the reading holds propositions —
  // the CHAT turn and the projection alike, never a silent pick. Computed
  // HERE, at the reading's first edges, so both the answer's prompt and the
  // thinking surface read the SAME resolutions: the mouth is told what is
  // contested and how the order resolves it, before anything is composed.
  const resultKelsen = rawEntries?.length
    ? kelsenGrade({
        propositions: notesFromEdges(rawEntries),
        index: sessionReferentIndex(session, onNote),
        precedence,
        tagClaim,
      })
    : null;

  // 3. SURF the task against the session corpus — the mechanical address
  // ladder (source→heading→content→window). Content only reaches the model
  // inside surfacedSegments, or a DISCLOSED void fact (P32's searched-void
  // pattern: a fact about what the corpus does NOT hold, never a behavioral
  // instruction stacked on top of it).
  if (session.corpus && session.corpus.documents.size > 0) {
    // A projection task (an artifact with sections — essay/paper/report/spec,
    // any generation with material to write from) wants the multi-doc surf:
    // one windowed segment per source, so each section has its own grounded
    // material — not the single best address a one-shot answer needs.
    const surf = surfTask(session, task, onNote, { composition: runMode === "projection" });
    surfacedSegments = surf.segments;
    surfVoid = surf.void;
    surfVoidInfo = surf.void ? { gap: surf.gap ?? "content_not_found", reason: surf.reason ?? null } : null;
    workspaceStats.segments = surfacedSegments.length;
    if (surf.void) workspaceStats.refusals = 1;

    // BROAD RECALL — a "summarize / what do you remember" question asks for
    // the CONVERSATION, not a single addressed passage. The mechanical ladder
    // has no cue for a meta question (it shares almost no tokens with the
    // planted turns), so for this class the model is handed the conversation's
    // OWN fold instead — the prior turns' words, addressed as a conversation,
    // never a fabricated digest, and never the void-disclosed "nothing here
    // answers it" that the ladder would otherwise return.
    if (isBroadRecall(task)) {
      const foldSegments = conversationFoldSegments(session, task, materialText);
      if (foldSegments.length) {
        surfacedSegments = foldSegments;
        surfVoid = false;
        surfVoidInfo = null;
        workspaceStats.segments = foldSegments.length;
        if (onNote) onNote({ move: "surfaced", operator: "CONV", fan: foldSegments.length, docs: session.corpus.documents.size, broadRecall: true });
      }
    }
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
      // The transcript the blocks read. When the client SENDS history it is
      // the request's own messages; when it sends none (the no-history memory
      // test — every request carries only the current message) the
      // conversation lives only in the session's own fold, so it is
      // reconstructed from the corpus's chat documents. Without this the
      // atmosphere block sees zero exchanges and the digest is empty.
      const transcript = chatHistory.length
        ? chatTranscript(chatHistory)
        : transcriptFromSession(session, task);
      const notes = notesFromEdges(rawEntries);
      // A BROAD recall question names no single referent ("what do you
      // remember about me"), so lens/paradigm would resolve nothing and the
      // digest would be empty for exactly the question that asks for the
      // whole. Give the blocks the conversation's own beings as the active
      // set — the summary is asked over the whole conversation, not over one
      // addressed passage.
      let question = task;
      if (isBroadRecall(task)) {
        const beings = conversationBeings(index, transcript);
        if (beings.length) question = `Tell me what you remember about ${beings.join(" and ")}.`;
      }
      const started = Date.now();
      try {
        resolutions = resolutionBlocks({
          level: RESOLUTIONS_LEVEL,
          question,
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
  // WIKISOURCE — the hyperlexicon's PRIMARY-SOURCE door, a PROJECTION-only
  // step (the artifact's grounding). A chat answer does not fetch primary
  // texts: that is the artifact's hunt, not a normal conversation's.
  if (runMode === "projection" && WIKISOURCE_ON && digestInfo.composition?.length) {
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
      admitChunked(session.corpus, { text: piiAdmit(session, p.text, srcId, onNote), sourceId: srcId });
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
  // grounded material; a void needs a disclosed fact (P32). This steers the
  // model toward the proper length and modality without relying on the model
  // to figure out the shape itself — the shape is the READING's verdict.
  // The MODE is authoritative: whatever the recomputed shape says, a forced
  // mode wins, and a material discovered mid-turn never upgrades a chat turn
  // into long-form.
  let answerShape = detectAnswerShape(task, workspaceStats.files > 0, hasWeb, surfVoid, surfacedSegments, resolutions);
  if (runMode === "projection") answerShape = { shape: "composition", maxTokens: CALL_MAX_TOKENS, modality: "grounded" };
  else if (runMode === "long") answerShape = { shape: "long", maxTokens: LONG_MAX_TOKENS, modality: "extended" };
  else if (answerShape.shape === "composition") answerShape = { shape: "research", maxTokens: CALL_MAX_TOKENS, modality: "grounded" };
  if (onNote) onNote({ move: "answer_shape", shape: answerShape.shape, modality: answerShape.modality, mode: runMode });

  // 5. Build messages for Ollama. THE MODEL IS THE MOUTH — the prompt speaks
  // the way a collaborator speaks, never as an instrument. No "you are a
  // reading instrument", no apparatus names, no session ids, no relation
  // counts. The essay's user-turn is in the essay's voice; the surfaced
  // material is "here's what came up", not "material was surfaced from the
  // workspace" (the-fold firewall.js: nothing here names a part of this
  // instrument, so there is no word to borrow).
  // The resolutions' own text already opens with "Where the conversation
  // stands:" (the atmosphere block's header) — never double the banner.
  const readingContext = resolutions?.text
    ? (resolutions.text.startsWith("Where the conversation stands:")
      ? `\n\n${resolutions.text}`
      : `\n\nWhere the conversation stands:\n${resolutions.text}`)
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
      ? (isCode
        ? `\nWe're writing ${codeLanguage ? `a ${codeLanguage} program` : "a program"} named ${codeArtifactName(task, codeLanguage)}.`
        : `\nWe're working on a piece about ${topicPhrase(task)}.`)
      : "\nYou're helping answer a question. Here's the context we have.",
    discourse ? `\n${discourse}` : null,
    readingContext || null,
    surfVoidInfo
      ? `\n\nWe looked for something on this and couldn't find it (${surfVoidInfo.gap}). Say plainly that nothing here answers it, rather than answering from something else.`
      : null,
    // KELSEN, ON THE ANSWER'S BODY — when the reading held conflicting claims,
    // the precedence order resolved them and the mouth must speak the
    // standing, never silently pick a winner. This is the machine-that-won't-
    // answer on every surface: the answer carries why the claim won or lost.
    resultKelsen?.resolutions?.length
      ? `\n\nSome claims in the material conflict. They were resolved by the fixed norm hierarchy (${precedenceOrderPhrase()}):\n${resultKelsen.resolutions.slice(0, 5).map((r) => `- “${r.a}” vs “${r.b}” → ${r.winner ? (r.winner === "a" ? r.a : r.b) : "tied"} (${r.why ?? r.reason})`).join("\n")}${resultKelsen.resolutions.length > 5 ? `\n… ${resultKelsen.resolutions.length - 5} more.` : ""}\nSpeak with that standing: name the conflict and the resolution, do not silently pick.`
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
  // THE MOUTH NEVER READS RAW BYTES IN A PROJECTION (2026-09-13). A section
  // draw must voice the reading, not re-read the source: the per-section
  // brief carries the fold's own claims (propsForSection), so dumping the
  // surfaced material into the system prompt made every draw a giant-context
  // call — measured: a 25K system prompt (17K of raw source text) re-sent on
  // each of 13 section draws. Chat/long have no per-section brief, so they
  // keep the material in the prompt; projection draws on the claims alone.
  if (material.length && runMode !== "projection") {
    systemContent += `\n\nHere's what came up on this:\n\n"""\n${material.join("\n\n")}\n"""`;
  }
  // Verbatim snips (citations) available to the composition so the essay can
  // QUOTE the sources — the model weaves real source text into its sections,
  // and the mechanical Sources appendix below still lists the same snips.
  // Never paraphrased: the model is handed the sources' own sentences.
  // Projection withholds them from the prompt too: the citations ledger and
  // footnotes carry the verbatim spans; the section briefs carry the claims.
  if (answerShape.shape === "composition" && runMode !== "projection" && session.webSources && session.webSources.size) {
    const snips = snipsFromSources(session.webSources, { maxSnips: 8, maxChars: 200 });
    if (snips.length) {
      systemContent += `\n\nVerbatim from the sources (quote these where they support your writing, never invent a quote):\n\n"""\n${snips.map((s) => `- "${s.snip}"`).join("\n")}\n"""`;
    }
  }
  if (onNote) onNote({ move: "prompt_budget", system: systemCore.length, chat: keptChat.length, chatChars: chatLen, materialSegments: runMode === "projection" ? 0 : material.length, materialChars: runMode === "projection" ? 0 : used, taskChars: taskLen, max: PROMPT_MAX_CHARS, projection: runMode === "projection" ? "compact — section briefs carry the claims" : null });

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
  // CRITICAL GATE: only a true COMPOSITION shape gets the multi-section
  // plan. A plain question ("name one river") must take the FAST single-draw
  // path — running the essay pipeline on every question makes even a
  // one-line ask compose six sections and take 30-60s (measured live). The
  // void questions are still computed (they inform the shape), but they only
  // become SECTIONS when the shape is composition.
  let compositionPlan = { questions: runMode === "projection" ? [...voidQuestions] : [], declaration: null };
  if (runMode === "projection" && !isCode) {
    const idx = sessionReferentIndex(session, onNote);
    // THE INDEX'S REFERENTS ARE REF-IDS, NOT OBJECTS (reading-log.js:312 —
    // `referents` is a Set of ids; the surfaces live behind `represent`).
    // Reading `r.surfaces` off the Set's strings silently emptied `refs` on
    // every run — measured 2026-09-13: the referent enrichment never fired,
    // the void collapsed to the always-on cells, and every essay re-asked
    // "what is X". `represent` returns a ref id's longest surface. Quality-
    // gated (2026-09-13): a heading fragment or a lowercase content word is
    // not a being — measured: "coordinates" and "Industry Applies" became
    // essay sections. A being-name is multi-word or capitalised.
    const JUNK_REFERENT = new Set(["coordinates", "location", "significance", "managed", "source", "authored", "published", "related", "topics", "last", "updated", "visit", "information", "primary", "resources", "bureau", "gallery", "references", "overview", "notes", "search"]);
    // BEING-QUALITY RANKING (2026-09-13): the outline's sections come from
    // the record's CENTRAL beings, ranked by recurrence (the index's own
    // surface rows per referent) weighted by proper-name signal — never the
    // first-N. A being that recurs and is multi-word/capitalised is the
    // record's spine; "coordinates" is a heading, not a being.
    const mentionOf = new Map();
    for (const e of idx?.events ?? []) mentionOf.set(e.referent_id, (mentionOf.get(e.referent_id) ?? 0) + 1);
    const beingQuality = (id, s) => {
      const n = String(s ?? "").trim();
      if (n.length <= 3) return 0;
      const lc = n.toLowerCase();
      if (JUNK_REFERENT.has(lc)) return 0;
      if (lc === topic.toLowerCase()) return 0;
      let q = 0;
      const words = n.split(/\s+/);
      if (words.length >= 2) q += 2;                 // multi-word names carry more
      if (/[A-Z]/.test(n)) q += 1;                    // proper-case signal
      q *= (1 + Math.log2(1 + (mentionOf.get(id) ?? 0))); // recurrence dominates
      return q;
    };
    const refs = [...(idx?.referents?.values?.() ?? [])]
      .map((id) => { try { return { id, s: idx.represent?.(id) ?? id }; } catch { return { id, s: id }; } })
      .filter(({ id, s }) => beingQuality(id, s) > 0)
      .sort((a, b) => beingQuality(b.id, b.s) - beingQuality(a.id, a.s))
      .slice(0, 3)
      .map(({ s }) => s);
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
  let sections = (resumePlan ?? compositionPlan.questions)
    // CRASH RESILIENCE: questions already answered (part titles in the existing
    // ledger) are skipped on a resumed run — the essay continues, it never
    // restarts. The ledger already holds those parts; appending is the only write.
    .filter((q) => !resumeAnswered.includes(String(q).toLowerCase().trim()))
    // The essay's extent is the void's own — a generous cap against runaway,
    // not a fixed truncation of the DEF'd shape. A 27-cell sweep can stay
    // relevant; ER7_MAX_SECTIONS raises it for long pieces.
    .slice(0, Number(process.env.ER7_MAX_SECTIONS ?? 20));
  // CODE: the artifact's sections are its structural units (CODE_SHAPE_PRIOR),
  // never the essay void-cells — a code ask DEF's its shape as header, core,
  // CLI, entry, usage; the essay sweep has no bearing on a file's parts.
  if (isCode) {
    sections = codeSections(task, codeLanguage);
    compositionPlan = { questions: sections, declaration: null };
    if (onNote) onNote({ move: "code_shape", language: codeLanguage, name: codeArtifactName(task, codeLanguage), sections });
  }
  // THE MEANING POTENTIAL STAGES, NOT THE TEMPLATE (Halliday, 2026-09-14):
  // when the register names a genre, the void consults the whole prior
  // cascade (sidecar → genre priors → reading priors → the record's seams)
  // BEFORE the essay template. The template is the fallback for an empty
  // meaning potential, never the default for a registered genre.
  let discoveredVoice = null; // the LLM's discovered write voice — hoisted so the section loop reads it
  let discoveredFelt = null; // the LLM's felt target (releases/tension) — threaded into the verdict
  let discoveredFraming = null; // the full discovered framing (staging + voice + feltTarget)
  let storySeed = null; // the ground-seed cast — drawn once, recorded in the write turn
  let citesResult = null; // the citation ledger's split: verbatim (quoted) vs unsupported (the model's own) — Ranke's parse
  let citationSources = new Map(); // the actual citable material (web + workspace) — hoisted for the verdict
  let categorized = null; // the periodic-table cell this piece landed in — hoisted for the thinking surface
  if (runMode === "projection" && prelimShape?.register?.field?.field && !isCode) {
    try {
      const staged = queryMeaningPotential(prelimShape.register, { record: null, seams: [] });
      // THE IMPRESSION (D/E/R, the first EVA after the register DEF): the
      // meaning potential is measured for what it KNOWS of this genre's
      // shape and feeling — hits, phases, shapes — no content rides.
      const impression = {
        genre: prelimShape.register.field.field,
        seen: staged.evidence.filter((e) => e.seen).reduce((a, e) => a + (e.seen ?? 0), 0),
        phases: [...new Set(staged.evidence.flatMap((e) => e.phases ?? []))].slice(0, 7),
        shapes: [...new Set(staged.evidence.flatMap((e) => e.shapes ?? []))],
        contributors: staged.evidence.map((e) => e.from),
      };
      wheel.turn("impression",
        `what a satisfying ${impression.genre} would FEEL like — shape, felt, staging; no content`,
        { seen: impression.seen, phases: impression.phases.length, shapes: impression.shapes, contributors: impression.contributors.length, hyperlexicon: Object.keys(hyperlexicon.composition ?? {}).length },
        impression,
        { evaBasis: "the meaning-potential query measures the genre's accumulated shape+feeling against an empty content ground", operator: "SIG", grain: "Figure", face: "scout" });
      const stagedPhases = staged.evidence.flatMap((e) => e.phases ?? []).filter((p) => p && p.length > 3 && p.toLowerCase() !== topic.toLowerCase());
      // THE DISCOVERY (footprints first — the LLM's proper place: proposing,
      // never measuring). If the genre already has a discovered framing, reuse
      // it — the trajectory is easier next time. If not, TASK the LLM to "go
      // find what makes a good <genre>": its staging, write voice, felt
      // target — and REC its trajectory as footprints (append-only sidecar).
      // The structural organs dispose of whatever the LLM proposes.
      const field = prelimShape.register.field.field;
      let framingApplied = false;
      try {
        const sidecar = loadSidecar();
        const fp = discoveredFramingFor(sidecar, { genre: field, medium: prelimShape.register.mode });
        if (fp) {
          const applied = applyDiscovered({ framing: fp.framing, sections, questionFor: (f, t) => questionFor(prelimShape.register, f, t), topic });
          sections = applied.sections; discoveredVoice = applied.voice; framingApplied = true; discoveredFelt = fp.framing?.feltTarget ?? null; discoveredFraming = fp.framing;
          wheel.turn("discovery", `reuse the footprints — a framing for ${field} was discovered before`, { from: "footprints", staging: fp.framing.staging.length }, { framing: fp.framing, basis: fp.basis }, { evaBasis: "the sidecar's latest footprint wins; no new model call — easier next time", operator: "INS", grain: "Pattern", face: "scout" });
        } else {
          const d = await discoverFraming({ register: prelimShape.register, impression: staged, prior: sidecar, upstream: OLLAMA, model });
          if (d?.framing) {
            const applied = applyDiscovered({ framing: d.framing, sections, questionFor: (f, t) => questionFor(prelimShape.register, f, t), topic });
            sections = applied.sections; discoveredVoice = applied.voice; framingApplied = true; discoveredFelt = d.framing?.feltTarget ?? null; discoveredFraming = d.framing;
            wheel.turn("discovery", `the LLM is tasked to go find what makes a good ${field}`, { from: d.from, staging: d.framing.staging.length, voice: !!d.framing.writeVoice }, { framing: d.framing, footprints: !!d.appended, basis: d.basis }, { evaBasis: "the LLM PROPOSES the framing; the wheel's EVA and the satisfaction organs dispose", operator: "INS", grain: "Pattern", face: "scout" });
            if (d.appended) { try { fs.writeFileSync(SIDECAR_PATH, JSON.stringify(d.appended, null, 2)); } catch {} }
          }
        }
      } catch {}
      if (!framingApplied && stagedPhases.length >= 2 && !resumePlan) {
        sections = [...new Set(stagedPhases)].slice(0, 7).map((f) => questionFor(prelimShape.register, f, topic));
        if (onNote) onNote({ move: "void_questions", of: sections.length, cells: `staged from the meaning potential: ${staged.evidence.map((e) => e.from.split(" ")[0]).join(" + ")}`, questions: sections.slice(0, 5), basis: staged.evidence.map((e) => e.basis).slice(0, 3) });
      }
    } catch {}
  }
  // A forced PROJECTION whose void produced no content cells still gets an
  // artifact — a single grounded part on the whole of what came up, rather
  // than silently falling out of the mode into a chat answer.
  if (runMode === "projection" && !sections.length) sections = [topicPhrase(task) || task];
  // THE ARTIFACT'S EXTENT IS THE MATERIAL'S OWN. A projection with NO ground
  // to write from (no workspace, no web, no surfaced passages) has no
  // multi-section extent — the void cannot support sections it cannot fill.
  // A "short essay about X" asked with nothing to ground it becomes a short
  // piece (bounded), and the grounding checks disclose its standing honestly
  // rather than churning ungrounded rewrites forever.
  const hasGrounding = (session.webSources?.size ?? 0) > 0 || (workspaceStats.files ?? 0) > 0 || surfacedSegments.length > 0;
  if (runMode === "projection" && !hasGrounding && !isCode) sections = sections.slice(0, 2);
  // THE PLAN (D/E/R): after the impression DEF's EVA, the void stages —
  // phases × question-form × topic, arc climbing toward the DEF'd shape.
  // The plan is a PREDICTION; the read and write will be measured against it.
  if (runMode === "projection") {
    wheel.turn("plan",
      sections.length ? "the void's staged phases, ordered toward a climbing arc, each phase a question in the register's form" : "a single declared artifact — the void stages it as it writes",
      { sections: sections.length, first: sections[0]?.slice(0, 80) ?? null, arc: "climbing" },
      { sections, register: prelimShape.register?.field?.field ?? null },
      { evaBasis: "the predicted fortune arc must match the genre's accumulated shape; the read below is its EVA", operator: "SEG", grain: "Field", face: "Murch" });
    // DEF — the interpretive frame is DECLARED (not read off grammar): what
    // would satisfy this piece, named before a word is written. The felt
    // target rides here — the genre's own release count is the criterion the
    // write will be measured against.
    wheel.turn("declare",
      `the piece is declared in the ${prelimShape.register?.field?.field ?? "staged"} register: ${discoveredFelt ? `felt target ${discoveredFelt.releases ?? "?"} releases, shape "${String(discoveredFelt.shape ?? "")}"` : "no felt target — the register's own shape stands"}`,
      { feltTarget: discoveredFelt?.releases ?? null, genre: prelimShape.register?.field?.field ?? null },
      { feltTarget: discoveredFelt, register: prelimShape.register?.field?.field ?? null },
      { evaBasis: "the frame is declared before the write; EVA measures the write against it", operator: "DEF", grain: "Atmosphere", face: "the void declares" });
  }
  // The composition block below may EVOLVE the plan (REC supersedes the outline
  // and adds themes as the reading grows). Hoisted so the satisfaction check
  // reads the plan the essay actually wrote, whether or not the block ran.
  let plannedSectionsOut = [...sections];
  let rankeTotalFindings = 0; // Ranke's rewrite count, hoisted for the thinking surface (scoped across the composition block)
  // The single-answer modes' void-fill verdict, hoisted for the result —
  // every answer, whatever the mode, is a void defined and satisfied.
  let chatSatisfaction = null;
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
  // The Kelsen gauge is a PROJECTION instrument (how tightly an artifact is
  // bound to its ground). A chat/long answer uses the caller's override or
  // the flat default — no artifact shape to gauge against.
  const compositionKelsen = runMode === "projection" ? kelsenFromShape() : (kelsen ?? DEFAULT_KELSEN);
  if (runMode === "projection" && onNote) onNote({
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
  let codeValidation = null; // the hard pyodide verdict on a code artifact — hoisted for the satisfaction check
  let privacyResult = null; // the Privacy archon's (Brandeis) weak-signal findings — hoisted for the result
  let copyResult = null; // the anti-copy archon's (Martial) holon-aware findings — hoisted for the result
  let securityResult = null; // the security archon's (Saltzer) CWE-gap findings — hoisted for the result
  let blindspotResult = null; // the blindspot archon's (Popper) whole-view findings — hoisted for the result
  let piiResult = null; // the PII archon's (Goffman) redacted findings — hoisted for the result
  let injectionResult = null; // the injection archon's (Ulysses) findings — hoisted for the result
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
  // THE MEASURED CUT (2026-09-13): the section's own grounded window. The
  // mouth must voice a reading, never re-read the page — but zero in-context
  // material makes a small model hallucinate (measured: 13 sections, every one
  // a confident 1933-fair fabrication). This hands each part ONLY the source
  // sentences that share its terms — a few thousand chars, never the page.
  const SECTION_WINDOW_CHARS = Number(process.env.ER7_SECTION_WINDOW_CHARS ?? 2500);
  const WINDOW_STOP = new Set("the and for with that this from under through after during was were are is had has have by to of in on at it its their there here which where when how what who into across over been being not but or as than then so such only also very just an a your our their its".split(" "));
  const groundedWindowFor = (section, claims, material) => {
    const text = String(material ?? "");
    if (text.length < 60) return "";
    const terms = new Set();
    const pool = `${section} ${(claims ?? []).map((p) => `${p.end1 ?? ""} ${p.end2 ?? ""}`).join(" ")}`;
    for (const t of pool.toLowerCase().split(/[^a-z']+/)) {
      if (t.length > 3 && !WINDOW_STOP.has(t)) terms.add(t);
    }
    if (!terms.size) return "";
    const sentences = String(text).replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.trim()).filter((s) => s.length > 40 && s.length < 400);
    const scored = [];
    for (const s of sentences) {
      const lc = s.toLowerCase();
      const hits = [...terms].filter((t) => lc.includes(t)).length;
      if (hits >= 2) scored.push({ s, hits });
    }
    scored.sort((a, b) => b.hits - a.hits);
    let out = "", n = 0;
    for (const { s } of scored) { if (out.length + s.length > SECTION_WINDOW_CHARS) break; out += (n++ ? " " : "") + s; }
    return out.trim();
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
  if (specRefusalText) {
    // REFUSED at the ask: no generation, no ledger — the refusal IS the answer.
    fullText = specRefusalText;
    if (onNote) onNote({ move: "spec_refused", reason: clearance.reason });
  } else {
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
            const key = keyOf(p);
            if (shown.has(key)) continue;
            shown.add(key);
            handedKeys.add(key); // this claim reached the mouth — it cannot be "carried unprompted"
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
      // THE GROUND-SEED: the story's cast is drawn at random FROM the ground
      // (the beings the reading established, with their sources), once — so
      // every scene is traceable to what inspired it. Recorded in the wheel.
      storySeed = prelimShape?.register?.field?.field === "narrative" ? groundSeed(session, { sidecar: loadSidecar(), framing: discoveredFraming, field: prelimShape.register.field.field, count: 4 }) : null;
      // Evolve the outline as sections land: re-read the reading's referents;
      // a being the essay has not yet covered is a theme the outline missed.
      // REC: supersede the outline line and add the section.
      for (let i = 0; i < plannedSections.length && !truncated; i++) {
        const section = plannedSections[i];
        if (onNote) onNote({ move: "composing_section", index: i + 1, of: plannedSections.length, section });
        // EVA admits the part: real text against a ground. A projection with
        // NO ground still writes its bounded sections — the admission gate
        // admits them ungrounded (their standing is disclosed by the
        // satisfaction check, never churned); a grounded projection keeps the
        // strict gate exactly as before.
        const grounded = material.length > 0;
        const eva = admitPart({ text: section, grounded: grounded || !hasGrounding, minChars: 0 });
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
        // THE MEASURED CUT: the section's own claims + the source window that
        // grounds them. The window is computed once per section and handed to
        // the brief — the mouth voices real source sentences, never the page
        // and never nothing.
        const secProps = propsForSection(section);
        const secWindow = groundedWindowFor(section, secProps, groundingText());
        const claimBlock = secProps.length ? `Here are the material's claims this part should carry:\n${secProps.map((p) => `- ${p.end1 ?? ""} ${p.label} ${p.end2 ?? ""}`).join("\n")}` : "";
        const windowBlock = secWindow ? `\n\nGrounded source text for THIS part — its real names, places, dates and figures come from here:\n"""\n${secWindow}\n"""` : "";
        const isNarrative = prelimShape?.register?.field?.field === "narrative";
        const baseVoice = writeVoiceFor(prelimShape?.register, topic);
        const voice = discoveredVoice ? {
          // LOW sets the possibility (the register's hard constraint: SHOW,
          // never name the phase or analyze); HIGH sets the probability (the
          // discovered voice is an EXEMPLAR to continue, never to repeat).
          opening: (t) => `${baseVoice.opening(t)}\n\nWrite in this voice — an exemplar to continue, never to repeat:\n"${String(discoveredVoice.opening ?? "").slice(0, 400)}"`,
          body: (t) => `${baseVoice.body(t)}\n\nWrite in this voice — an exemplar to continue, never to repeat:\n"${String(discoveredVoice.body ?? "").slice(0, 400)}"`,
        } : baseVoice;
        // THE MOUTH IS SPOKEN TO THE WAY IT MUST SPEAK. An essay is addressed
        // as an essayist ("answer this question", "the claims to carry"); a
        // story is addressed as a storyteller ("the story continues", "this is
        // the next scene", "the world holds these truths"). The frame is the
        // register — never an instruction bolted onto an essay frame.
        const castBlock = (isNarrative && storySeed?.cast?.length)
          ? `\nThe story's SEED, drawn at random from the ground — let the world grow from these (a place, an event, a name to begin from), and invent freely around them:\n${storySeed.cast.map((c) => `- ${c.name}  (seed from: ${(c.provenance?.length ? c.provenance.join(", ") : "the reading")})`).join("\n")}`
          : "";
        // NARRATIVE CONTINUITY: a scene is handed the story SO FAR — the actual
        // prose already written — and its PHASE POSITION, so it advances the
        // story instead of restating the opening, and holds the invented cast
        // and facts stable instead of re-deriving them (Cape Cod must stay Cape
        // Cod, not drift to Cape May). The last beat is the resolution.
        const storySoFar = documentLines.length
          ? documentLines.map((line, j) => `[scene ${j + 1}] ${line}`).join("\n\n").slice(-1800)
          : "";
        // THE PLOT-SEED: the story's beats are drawn from the ground's own
        // events (a complication, a disaster, a rescue), mapped to the phases —
        // so the story has something to advance TOWARD, not a bag of facts to
        // describe. The seed's drawn events name the turn at each phase.
        const seedEvent = storySeed?.cast?.[Math.min(i, (storySeed.cast?.length ?? 1) - 1)]?.name ?? null;
        const beat = plannedSections.length > 1
          ? (i === plannedSections.length - 1 ? `the RESOLUTION — land the story${seedEvent ? ` (the ground names this turn: ${seedEvent})` : ""}, release the tension you have built`
            : i === 0 ? `the OPENING — drop into a moment, establish the cast and the world${seedEvent ? ` (the ground names this turn: ${seedEvent})` : ""}`
            : `scene ${i + 1} of ${plannedSections.length} — the next turn of the story${seedEvent ? `, which the ground names: ${seedEvent}` : ""}, escalating what came before`)
          : "the whole story";
        const materialBlock = isNarrative
          ? `${castBlock}${secProps.length ? `\nThe story's world holds these truths — let them shape the world, but write them in YOUR OWN words:\n${secProps.map((p) => `- ${p.end1 ?? ""} ${p.label} ${p.end2 ?? ""}`).join("\n")}` : ""}${secWindow ? `\n\nThe world, in its own words (its real names, places, storms come from here — read these, then write your own sentences):\n"""\n${secWindow}\n"""` : ""}\n\n${RANKE_RULE}`
          : `${claimBlock}${windowBlock}\n\n${RANKE_RULE}`;
        const sectionTask = isCode
          ? codeSectionPrompt({
              section,
              language: codeLanguage,
              name: codeArtifactName(task, codeLanguage),
              task,
              i,
              total: plannedSections.length,
              soFar: documentLines.length ? documentLines.join("\n\n").slice(-3000) : "",
              exemplar: i === 0 ? codeExemplar(codeLanguage) : null,
            })
          : plannedSections.length > 1
          ? (isOpening
            ? (isNarrative
              ? `You are telling a story. This is ${beat}. It begins in the middle of a moment, in a real place. ${materialBlock}\n\n${voice.opening(topic)}`
              : `We're writing a piece on ${topic}. ${materialBlock}\n\n${voice.opening(topic)}`)
            : (isNarrative
              ? `The story continues. This is ${beat}.${storySoFar ? `\n\nHere is the story so far — HOLD every name, place, and number stable, do not rename anyone or change any detail, do not restate what already happened:\n${storySoFar}\n` : ""}Now show what happens NEXT: the next thing that changes, the next beat toward the resolution. ${materialBlock}\n\n${voice.body(topic)}`
              : `We're writing a piece on ${topic}. ${priorParts ? `Where the piece stands so far: ${priorParts}\n\n` : ""}Now ${isQuestion ? `answer this: ${section}` : `write the part on ${section}`}, ${holonPhrase}. Write it as a substantial passage of the piece itself — several sentences. ${voice.body(topic)} ${materialBlock}`))
          : (isNarrative
            ? `You are telling a story. This is ${beat}. It begins in the middle of a moment, in a real place. ${materialBlock}\n\n${voice.opening(topic)}`
            : `We're writing a piece on ${topic}. ${materialBlock}\n\n${voice.opening(topic)}`);
        const holonBudget = holonLevel === "sentence" ? Math.min(SECTION_MAX_TOKENS, 220) : holonLevel === "paragraph" ? Math.min(SECTION_MAX_TOKENS, 450) : SECTION_MAX_TOKENS;
        // A SHORT PIECE WITH NO GROUND writes SHORT sections — a "short essay"
        // asked with nothing to ground it gets a bounded per-part budget, so
        // the artifact completes in chat-time rather than running past the
        // turn deadline churning ungrounded prose. CODE is exempt: a code part
        // needs the full budget to be a real function/block, and its ground is
        // the spec itself, not admitted material. (hasGrounding, hoisted with
        // the sections bound.)
        const drawBudget = isCode ? holonBudget : (hasGrounding ? holonBudget : Math.min(holonBudget, 400));
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
            drawBudget,
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
        const sectionEva = isCode
          ? codeSatisfaction({ documentLines: [buf], sections: [section], validation: null })
          : satisfactionOfSection(buf, { theme: section, material: groundingText(), prior: documentLines.length ? documentLines[documentLines.length - 1] : "" });
        const strainAdded = isCode ? (sectionEva.ok ? 0 : 1) : sectionEva.strain;
        totalStrain += strainAdded;
        if (onNote) onNote({ move: "strain", section, strain: strainAdded, failures: sectionEva.failures.map((f) => f.kind) });
        if (documentLedger) {
          // CODE: the ledger's part is the WHOLE file, written once after the
          // validator clears it — a per-section "part" row would make the
          // projection show the first-draft parts instead of the fixed file
          // (projectDocument reads only role "part"). The section lands in
          // memory here; the code branch appends the single part line at the
          // end. An essay still lands each section as its own part line.
          if (!isCode) appendLedgerLine(documentLedger, {
            role: "part", title: section, text: buf.trim(), giver: model,
            basis: `composition section, strain ${strainAdded}`,
          }, { dir: ESSAY_LEDGER_DIR });
          documentLines.push(isCode ? stripCodeFences(buf, codeLanguage) : buf.trim());
        }
        if (i < plannedSections.length - 1 && onToken) onToken("\n\n");

        // ── REC: does the reading now hold a being the outline missed? ─────
        // The web material was EOT-ized; as sections are written the fold's
        // referents settle. A newly-established referent not yet covered is a
        // theme the outline must grow to include. Bounded: the same being is
        // never offered twice (the reading does not grow mid-composition, so
        // without this guard the loop re-offers the same theme forever).
        // CODE is exempt — a code file's parts are fixed by CODE_SHAPE_PRIOR,
        // and the reader's prose referents are not code sections.
        if (documentLedger && !truncated && plannedSections.length < 7 && !isCode) {
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

      if (!isCode) {
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
        // NO GROUND, NO REWRITE: with no material to ground against, Ranke's
        // ungrounded/unresolved findings cannot be fixed by rewriting FROM
        // nothing — the rewrite would churn model calls against an empty
        // ground. The findings are recorded and the sections stand as written,
        // with their ungrounded standing disclosed by the satisfaction check.
        if (!hasGrounding) {
          if (onNote) onNote({ move: "ranke", round: round + 1, ungrounded: rankeFindings.map((f) => f.sectionIndex), declared: "no ground to rewrite from — gaps disclosed, not churned" });
          break;
        }
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
      // NO GROUND, NO EDITORIAL PASS: with no material, Murch's shape-check
      // will find what any ungrounded short piece lacks (a closing, a body)
      // and rewrite it FROM nothing — churning draws against an empty ground,
      // the same runaway as Ranke's. The piece is written once, short, and its
      // standing is disclosed by the satisfaction check. The editorial film is
      // made in the cut; there is no cut without the material.
      const assembled = documentLines.join("\n\n");
      const shapeCheck = hasGrounding ? checkEssayShape(assembled, { parts: plannedSections.length, themes: plannedSections, subject: topic }) : { ok: true, failures: [] };
      if (onNote) onNote({ move: "shape_check", ok: shapeCheck.ok, failures: shapeCheck.failures.map((f) => f.detail) });
      if (!hasGrounding) {
        if (onNote) onNote({ move: "murch", round: 0, findings: [], basis: "no ground — editorial pass skipped, standing disclosed by satisfaction" });
      }
      const editorIndex = sessionReferentIndex(session, onNote);
      for (let round = 0; round < MAX_REWRITE_ROUNDS && !truncated && hasGrounding; round++) {
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
      if (documentLedger && !truncated && plannedSections.length > 1 && session.reader && hasGrounding) {
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
      // CITATION SOURCES = THE ACTUAL MATERIAL, WEB AND WORKSPACE (2026-09-13).
      // The citation ledger used to be gated on session.webSources alone, so a
      // workspace run produced zero citations — measured: no citations.json, no
      // footnotes, no inline markers. Every retained non-conversation document
      // is a citable source: web pages (url→text) and workspace files (path→text).
      if (session.webSources?.size) for (const [u, t] of session.webSources) if (t) citationSources.set(u, t);
      if (session.corpus?.documents?.size) for (const [sid, doc] of session.corpus.documents) {
        if (String(sid).startsWith("chat:")) continue;
        if (citationSources.has(sid)) continue;
        if (doc?.text && String(doc.text).trim().length > 40) citationSources.set(sid, String(doc.text));
      }
      if (documentLedger && citationSources.size) {
        const snips = snipsFromSources(citationSources);
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
        const cites = citationLedger(assembledBody, citationSources, { givers: essayGivers });
        citesResult = cites;
        if (cites.citations.length) {
          const citesPath = path.join(ESSAY_LEDGER_DIR, `${documentLedger.docId.replace(/:/g, "_")}.citations.json`);
          try { fs.writeFileSync(citesPath, JSON.stringify({ docId: documentLedger.docId, ...cites }, null, 2)); } catch {}
          if (onNote) onNote({ move: "citation_ledger", path: citesPath, citations: cites.citations.length, basis: cites.basis });
        }
        // APA footnotes: each essay sentence attributed mechanically to its
        // best source, with the VERBATIM span it borrows from — the Fold's
        // cite.js discipline (an address is attached, never requested).
        const footnoteBlock = renderApaFootnotes(assembledBody, citationSources, { givers: essayGivers });
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
      // ── CODE: hard logos validation + bounded REC ─────────────────────────
      // The essay organs (Ranke/Murch/citations) are prose; code's own check
      // is the hard pyodide gate — compile + undefined-name + exec + smoke —
      // run UNCONSCIOUSLY (the model never sees the validator, only the
      // findings that failed it). A failing artifact is a typed REC: the mouth
      // re-draws the whole file with the errors in hand, bounded like Ranke.
      const codeText = () => stripCodeFences(documentLines.join("\n\n"), codeLanguage);
      // The app's NAME — a clean name ("called X"/"named X"), else derived from
      // the record schema, never the raw (truncated) task text.
      const cleanTitle = (() => {
        const m = /\b(?:called|named)\s+([A-Z][\w\s&'-]{1,40}?)(?=[.,)]|$)/i.exec(task);
        return m ? m[1].trim() : null;
      })();
      const titleFromSchema = (recordName) => {
        const n = String(recordName || "data").trim();
        const plural = /s$/i.test(n) ? n : `${n}s`;
        return plural.replace(/^\w/, (c) => c.toUpperCase());
      };
      const assembleCode = () => {
        // The sources we SNIPPED from, recorded quietly in the header comment.
        const exemplar = codeExemplar(codeLanguage);
        const srcExtra = isSovereignData ? ["encryption + append-only fold adapted from the author's Matrix E2EE base"] : [];
        const header = codeSourcesHeader({ language: codeLanguage, model, exemplar, extra: srcExtra });
        let body = codeText();
        // DATA-HOLDING APP: the mouth proposed the schema; the machine renders
        // the sovereign substrate (crypto + ledger + fold + snip/cut) around it.
        if (isSovereignData) {
          const schema = extractSovereignSchema(body);
          if (schema) {
            const title = cleanTitle ?? titleFromSchema(schema.recordName);
            const shell = sovereignDataShell({ title, recordName: schema.recordName, fields: schema.fields });
            return header + shell;
          }
        }
        // LINE-LEVEL provenance: before each holon that drew on a retained
        // source, a quiet comment naming it — the per-line record of what we
        // snip from, in the code's own comment syntax, never a banner.
        if (exemplar?.text) {
          try {
            const prov = provenanceFor(body, { sources: [{ text: exemplar.text, name: exemplar.name, license: exemplar.license }], fileName: codeArtifactName(task, codeLanguage) });
            if (prov.length) {
              body = annotateWithSources(body, { provenance: prov, language: codeLanguage });
              if (onNote) onNote({ move: "source_annotations", count: prov.length, sources: [...new Set(prov.map((p) => p.sourceName))] });
            }
          } catch { /* annotation must never break the artifact */ }
        }
        const fallbackTitle = cleanTitle ?? "Data";
        if (codeLanguage === "html") return htmlShell(fallbackTitle, body).replace("<body>", `<body>\n${header.trim()}`);
        return header + body;
      };
      fullText = assembleCode();
      // PRIVACY ARCHON (Brandeis): the defensive face, run over the assembled
      // artifact. Weak signals only — a finding is a nomination, never a
      // verdict (corroboration across independent signals is the caller's
      // job). Surfaced on the result, never used to silently block.
      privacyResult = privacyFindings(fullText, { task });
      if (privacyResult.findings.length && onNote) onNote({ move: "privacy_findings", findings: privacyResult.findings.map((f) => `${f.kind}: ${f.detail}`) });
      // ANTI-COPY ARCHON (Martial): holon-aware — a distinctive holon that is a
      // word-shingle match of the retained source is a copy finding; generic
      // boilerplate is replication-for-efficiency, never flagged.
      const exemplarText = codeExemplar(codeLanguage)?.text ?? null;
      copyResult = copyFindings(fullText, { sources: exemplarText ? [exemplarText] : [], fileName: codeArtifactName(task, codeLanguage) });
      if (copyResult.findings.length && onNote) onNote({ move: "copy_findings", findings: copyResult.findings.map((f) => `${f.level} ${f.name}: ${f.detail}`) });
      // SECURITY ARCHON (Saltzer): the CWE gaps frontier models leave in ordinary
      // code — structural, over the AST/DOM surface. A witness, not a proof.
      securityResult = await securityFindings(fullText, { language: codeLanguage });
      if (securityResult.findings.length && onNote) onNote({ move: "security_findings", findings: securityResult.findings.map((f) => `${f.cwe} ${f.detail}`) });
      // BLINDSPOT ARCHON (Popper): the whole-view properties a single window
      // cannot hold — unfalsifiable tests, timing-unsafe compares, leaks.
      blindspotResult = await blindspotFindings(fullText, { language: codeLanguage });
      if (blindspotResult.findings.length && onNote) onNote({ move: "blindspot_findings", findings: blindspotResult.findings.map((f) => `${f.cwe} ${f.detail}`) });
      const runValidator = async (t) => {
        // HONESTY (ethos): a language with no hard validator is marked
        // `unchecked`, never silently "validated". Only python (compile+exec)
        // and html (HTMLParser) have a real witness; every other language
        // discloses that no validator ran — the machine-that-won't-answer
        // posture, aimed at the artifact's own claim of correctness.
        const v = codeLanguage === "python" ? await validatePython(t) : codeLanguage === "html" ? await validateHtml(t) : { ok: true, findings: [], unchecked: true, basis: "no hard validator for this language" };
        // SPEC-DERIVED EVA: the task's own requirements (counts, named
        // content, named definitions) are findings too — a dropped "prices" or
        // a missing "hours" section is a typed gap the REC loop repairs.
        const spec = specFindings(task, t, codeLanguage);
        if (spec.length) { v.ok = false; v.findings = [...(v.findings ?? []), ...spec]; }
        return v;
      };
      if (runValidator) {
        codeValidation = await runValidator(fullText);
        if (onNote) onNote({ move: "code_validate", ok: codeValidation.ok, findings: (codeValidation.findings ?? []).map((f) => `${f.kind}: ${f.detail}`), smoke: codeValidation.smoke });
        let round = 0;
        while (!codeValidation.ok && round < MAX_REWRITE_ROUNDS && !truncated) {
          const findings = (codeValidation.findings ?? []).slice(0, 6).map((f) => `- [${f.kind}] ${f.detail}`).join("\n");
          if (onThinking) onThinking(`\n### Code check failed (round ${round + 1})\n${findings}\n\n`);
          const fixMsg = codeLanguage === "html"
            ? `We're writing the page content for ${codeArtifactName(task, codeLanguage)}. The complete specification:\n\n"""\n${task}\n"""\n\nThe page content written so far:\n"""\n${codeText().slice(-3000)}\n"""\n\nThe validator found these problems:\n${findings}\n\nRewrite the page CONTENT (the hero, menu, and hours as HTML elements — no <html>, <head>, <body>, <style>, or <script> tags) so it is complete and valid. Emit HTML only, no prose, no markdown fences.`
            : `We're writing ${codeArtifactName(task, codeLanguage)} — a ${codeLanguage} program. The complete specification:\n\n"""\n${task}\n"""\n\nThe file written so far:\n"""\n${fullText.slice(-6000)}\n"""\n\nThe validator found these problems:\n${findings}\n\nRewrite the WHOLE file so it is correct, complete, and composes. Emit ${codeLanguage} source code only — no explanation, no prose, no markdown fences, no commentary.`;
          const fix = await draw(
            [{ role: "system", content: systemContent }, ...keptChat, { role: "user", content: fixMsg }],
            SECTION_MAX_TOKENS,
            { kelsen: Math.max(compositionKelsen, 0.9) },
          );
          if (fix.stopped) { truncated = true; break; }
          const fixText = stripCodeFences(fix.buf, codeLanguage);
          if (!fixText) break;
          documentLines.length = 0;
          documentLines.push(fixText);
          fullText = assembleCode();
          if (documentLedger) appendLedgerLine(documentLedger, { role: "revision", title: `logos: validation round ${round + 1}`, text: fullText, giver: model, supersedes: null, basis: `REC: the validator failed — ${findings.slice(0, 200)}` }, { dir: ESSAY_LEDGER_DIR });
          codeValidation = await runValidator(fullText);
          if (onNote) onNote({ move: "code_validate", round: round + 1, ok: codeValidation.ok, findings: (codeValidation.findings ?? []).map((f) => `${f.kind}: ${f.detail}`) });
          round++;
        }
      }
      if (documentLedger) {
        // The code artifact lands as ONE part line — the whole file, after the
        // validator cleared it — so the projection is the fixed code, never the
        // first-draft sections.
        appendLedgerLine(documentLedger, {
          role: "part", title: codeArtifactName(task, codeLanguage), text: fullText, giver: model,
          basis: `code artifact (${codeLanguage}), ${codeValidation?.ok ? "validated" : "validation failed"}`,
        }, { dir: ESSAY_LEDGER_DIR });
        const def = sections.map((s) => `"${s}"`).join(", ");
        if (onNote) onNote({ move: "document_ledger", docId: documentLedger.docId, parts: documentLines.length, declared: def, kind: "code", language: codeLanguage, validated: codeValidation?.ok ?? null });
      }
      }
    } else if (runMode === "long") {
      // ── LONG — a response that goes further than chat provides. ────────
      // One extended single draw at a generous budget; no ledger, no editorial
      // passes. The void is "answer thoroughly", filled in one sitting.
      const r = await draw(ollamaMessages, LONG_MAX_TOKENS, { kelsen: compositionKelsen });
      if (r?.stopped) truncated = true;
      chatSatisfaction = chatVoidCheck(fullText, { shape: "long", material: material.map((s) => s.text ?? "").join("\n") });
      if (onNote) onNote({ move: "chat_satisfied", shape: "long", ok: chatSatisfaction.ok, failures: chatSatisfaction.failures ?? [], strain: chatSatisfaction.strain ?? 0 });
    } else {
      // ── CHAT — the default surface. ────────────────────────────────────
      // Every answer is a void defined and satisfied at its natural size: a
      // greeting gets a sentence, a command an acknowledgment, a research
      // question a grounded answer — one draw, never a sectioned artifact.
      const r = await draw(ollamaMessages, answerShape.maxTokens ?? CALL_MAX_TOKENS, { kelsen: compositionKelsen });
      if (r?.stopped) truncated = true;
      chatSatisfaction = chatVoidCheck(fullText, { shape: answerShape.shape, material: material.map((s) => s.text ?? "").join("\n") });
      if (onNote) onNote({ move: "chat_satisfied", shape: answerShape.shape, ok: chatSatisfaction.ok, failures: chatSatisfaction.failures ?? [], strain: chatSatisfaction.strain ?? 0 });
    }
  });
  } // end the spec-refusal else

  // 7. Post-process before it is printed: extract code blocks, pyodide-lint
  // the Python, and reorder top-level entities so each depends only on things
  // defined above it. The unconscious system lints, orders, and pins. The
  // model never sees the fixup transcript — only the repaired answer.
  // Latency guard: warmed at boot, timeboxed per turn; if the budget is
  // exceeded the original text is returned untouched — the unconscious
  let post = null;
  let text = fullText;
  if (fullText.trim()) {
    post = isCode
      ? await postprocessCode(fullText, { language: codeLanguage, onNote, timeboxMs: POSTPROCESS_TIMEOUT_MS })
      : await postprocessAnswer(fullText, { onNote, timeboxMs: POSTPROCESS_TIMEOUT_MS });
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
  // KELSEN, DISCLOSED: the conflicts the reading held and how the precedence
  // order resolved them — the answer's standing, shown in plain English. This
  // is the machine-that-won't-answer's teaching on every surface, not just the
  // projection: the reader sees WHY a claim won or lost, never a silent pick.
  if (resultKelsen?.resolutions?.length) {
    const k = resultKelsen;
    const lines = [`Conflicting claims resolved by the norm hierarchy (Kelsen — ${precedenceOrderPhrase()}):`];
    for (const r of k.resolutions.slice(0, 5)) lines.push(`- ${r.subject}: “${r.a}” vs “${r.b}” → ${r.winner ? (r.winner === "a" ? r.a : r.b) : "tied"} — ${r.why ?? r.reason}`);
    if (k.resolutions.length > 5) lines.push(`… ${k.resolutions.length - 5} more.`);
    thinkingLines.push(lines.join("\n"));
  }
  const thinkingBlock = thinkingLines.length ? thinkingLines.join("\n") : null;

  // ── the durable theory of mind, updated and persisted at the turn's end.
  // Type-level only: the person's assertion and the standing this turn's
  // record earned for it. The conversation's SPECIFICS stay in the session.
  // A surf VOID only marks an assertion "contested" when there was real
  // non-conversation material the surf genuinely could not address. When the
  // only material in the corpus is the conversation itself (no workspace, no
  // web — the conversation is excluded from the surf by design), a void
  // means nothing CHALLENGED the person's own statement, and the honest
  // standing is "unexamined", never "contested — not settled".
  // THE GROUND IS WHAT IS NOT THE CONVERSATION: workspace files, admitted
  // web material, or any corpus document outside the chat: prefix. Standing
  // and satisfaction both depend on it — the conversation never counts as
  // material that can fill a void.
  const hasNonConversationGround = workspaceStats.files > 0
    || (session.webSources?.size ?? 0) > 0
    || (session.corpus && [...session.corpus.documents.keys()].some((k) => !String(k).startsWith("chat:")));
  if (speakerModel && userId) {
    const updated = updateSpeakerModel(speakerModel, {
      task,
      classification: (() => { try { return classifySpeech(task); } catch { return "question"; } })(),
      surfVoid: surfVoid && hasNonConversationGround,
      surfaced: surfacedSegments.length,
    });
    saveSpeakerModel(userId, updated);
  }

  // THE MENO CHECK, COMPUTED ONCE: the void was DEF'd when the composition
  // started; here we ask whether it is FILLED. We know we've learned when the
  // void we declared — across its nine operators — is filled by sections that
  // pass its admission test. Strain is the REC pressure the void demanded.
  const satisfaction = documentLedger
    ? (isCode
      // CODE: the void is filled when every part wrote source code and the
      // assembled file passes the hard validator (compile + exec + smoke).
      ? codeSatisfaction({ documentLines, sections: plannedSectionsOut, validation: codeValidation })
      : (hasNonConversationGround
      ? (sessionReferentIndex(session) && rawEntries?.length
        // THE HONEST GRADE (2026-09-13): the essay is scored on the record's
        // claims it carried WITHOUT being handed them — the echo of the
        // prompt never scores. `unprompted` excludes every proposition the
        // mouth was told; the total is reported beside it so the gap between
        // "echoed" and "carried" is visible, never hidden.
        ? (() => {
            const allProps = notesFromEdges(rawEntries);
            const unprompted = allProps.filter((p) => !handedKeys.has(keyOf(p)));
            const totalGrade = lavarGradeEssay(documentLines, plannedSectionsOut, { materialPropositions: allProps, index: sessionReferentIndex(session) });
            const unpromptedGrade = lavarGradeEssay(documentLines, plannedSectionsOut, { materialPropositions: unprompted, index: sessionReferentIndex(session) });
            return { ...unpromptedGrade, total: totalGrade, handed: handedKeys.size, ofTotal: allProps.length, basis: `${unpromptedGrade.basis} — total (incl. prompted echo) ${totalGrade.recall}, ${handedKeys.size} of ${allProps.length} propositions were handed to the mouth and cannot score unprompted` };
          })()
        : sessionReferentIndex(session)
          ? holographicSatisfaction(documentLines, plannedSectionsOut, { index: sessionReferentIndex(session) })
          : fillCheck(voidDeclaration, documentLines, plannedSectionsOut, { material: groundingText() }))
      // NO GROUND IS A VERDICT, NEVER A VACUOUS PASS. With nothing but the
      // conversation in the corpus, every part fails the void's own EVA
      // admission ("grounded in the shadow's material") by definition — and
      // grading the essay against chat-derived propositions would grade it
      // against the request itself. Measured 2026-09-13: an ungrounded run
      // reported "unsatisfied" only because the essay failed to restate the
      // user's one-line ask — the right verdict, earned for the wrong reason.
      : {
          ok: false, filled: 0, of: plannedSectionsOut.length,
          failures: plannedSectionsOut.map((s, i) => ({ index: i, theme: s, kind: "no_ground", detail: "no material ground was admitted — the void cannot be filled by the conversation alone, and every part fails EVA's admission by definition" })),
          totalStrain: plannedSectionsOut.length,
          basis: "satisfaction grades only against non-conversation material; none was admitted",
        }))
    : chatSatisfaction;

  // THE WHEEL CLOSES (D/E/R): the read was the plan's EVA, the verdict is
  // the satisfaction DEF's EVA, and the fold lands what the run PROVED —
  // superseding the impression, never editing it. Every REC is the next
  // stage's ground; the ledger is the run, in order.
  if (runMode === "projection") {
    const readSurprise = session.lastPageSurprise?.salient ?? 0;
    wheel.turn("read",
      "each phase's sub-satisfaction: what would satisfy THIS phase, from THIS material",
      { propositions: stats.relationEdges ?? 0, referents: stats.referentBindings ?? 0, surprise: readSurprise },
      { relations: stats.relationEdges ?? 0, referents: stats.referentBindings ?? 0, surprise: readSurprise, ground: hasGrounding },
      { evaBasis: "the reader's own surprise on the material is the EVA — the felt dimension of the read", operator: "CON", grain: "Link", face: "Gore" });
    wheel.turn("write",
      "the parts compose into one carried ground — the artifact itself, Wolfe's work",
      { parts: documentLines.length, chars: fullText.length, grounded: hasGrounding, seed: storySeed?.seed ?? null, cast: storySeed?.cast?.map((c) => c.name) ?? [] },
      { parts: documentLines.length, chars: fullText.length, voice: discoveredVoice ? "discovered" : "register", seed: storySeed?.seed ?? null, cast: storySeed?.cast ?? [] },
      { evaBasis: "the write is the SYNthesis of the read's ground into one piece — measured against the declare; every cast member keeps its provenance", operator: "SYN", grain: "Field", face: "Wolfe" });
    const sat = satisfaction?.ok ?? false;
    // THE FELT IS THREADED INTO THE VERDICT: the read's release/surprise is
    // measured against the declare's feltTarget (Bharata's rasa, closed).
    const feltTarget = discoveredFelt?.releases ?? null;
    // RANKE'S PARSE (anti-kitsch): the citation ledger already splits each
    // sentence into QUOTED (verbatim/company — reproduced WITH a citation) and
    // UNSUPPORTED (the model's own — cited to the model as giver). Reproducing
    // for quotation is legitimate; reproduction WITHOUT a citation would be
    // copy. `verbatim` vs `unsupported` IS the parse — no hand-set n-gram.
    // (The one hand-set number left — citationLedger's term floor of 3 — is
    // the DMD-to-derive boundary, per born-dmd-rosetta: the cut should come
    // out of DMD+Born, not a constant.)
    const ranke = citesResult
      ? { verbatim: citesResult.verbatim ?? 0, company: citesResult.company ?? 0, unsupported: citesResult.unsupported ?? 0, of: citesResult.of ?? 0, basis: citesResult.basis }
      : null;
    // runDMCA — the seam between Alexander and Ranke: reproduced-with-citation
    // (quoted) vs reproduced-without (copy). The boundary is named, not yet
    // DMD-derived.
    const dmca = citesResult && citationSources.size
      ? runDMCA({ text: documentLines.join("\n\n"), sources: citationSources, citations: citesResult.citations })
      : null;
    categorized = dmca && citesResult
      ? categorizeCreativity({ text: documentLines.join("\n\n"), sources: citationSources, citations: citesResult.citations })
      : null;
    // THE MEANING CHASE (the user's paraphrase rule): when the verbatim
    // instrument is silent but the shadow chase named candidate spans, the
    // RECORD equates them against its OWN claim rows — the fold's
    // {label, end2, end1} propositions through the referent index — never a
    // model, and always FOR the run's whom (the EVA lens of this fold).
    // An equated span is grounded-by-meaning, moved to Derive; a span no
    // row resolves is NAMED un-equatable FOR that whom, disclosed.
    let paraphraseChased = null;
    if (categorized?.paraphraseCandidates > 0) {
      try {
        const chased = chaseParaphrase({
          text: documentLines.join("\n\n"),
          sources: citationSources,
          citations: citesResult.citations,
          claims: notesFromEdges(rawEntries ?? []),
          index: sessionReferentIndex(session, onNote),
          whom: { face: "LaVar", ethos: "the EVA lens of this fold" },
        });
        paraphraseChased = chased.chase ?? null;
        categorized = chased.categorized ?? categorized;
      } catch (err) {
        paraphraseChased = { candidates: categorized.paraphraseCandidates, equated: 0, unEquated: 0, rows: 0, indexResolved: false, basis: `the record equate threw: ${err?.message ?? err}` };
      }
    }
    if (categorized && onNote) onNote({ move: "creativity", cell: categorized.cell.name, archon: categorized.cell.archon, derivation: categorized.derivation, ratio: categorized.derivationRatio, window: categorized.derivationWindow, quoted: categorized.reproduce.quoted, copied: categorized.reproduce.copied, derived: categorized.derive, invented: categorized.invent, disagreement: categorized.disagreement, paraphraseUnmeasured: categorized.paraphraseUnmeasured, paraphraseCandidates: categorized.paraphraseCandidates ?? 0, paraphraseEquated: categorized.paraphraseEquated ?? 0 });
    wheel.turn("verdict",
      documentLedger ? "satisfaction = climbing arc, felt releases, grounded claims — DEF'd before the plan" : "chat satisfaction",
      { ok: sat, filled: satisfaction?.filled ?? 0, of: satisfaction?.of ?? 0, failures: satisfaction?.failures?.length ?? 0, strain: satisfaction?.totalStrain ?? 0, feltTarget, feltRead: readSurprise, feltGap: feltTarget == null ? null : (feltTarget - readSurprise), ranke: ranke?.verbatim ?? null, unsupported: ranke?.unsupported ?? null, dmca: dmca ? { ok: dmca.ok, quoted: dmca.quoted, copied: dmca.copied } : null, categorized: categorized ? { derivation: categorized.derivation, field: categorized.field, echo: categorized.echo, cell: categorized.cell, reproduce: categorized.reproduce, derive: categorized.derive, invent: categorized.invent, paraphraseCandidates: categorized.paraphraseCandidates ?? 0, paraphraseEquated: categorized.paraphraseEquated ?? 0, paraphraseChased: paraphraseChased ?? null } : null },
      { ...satisfaction, ranke, dmca, categorized, paraphraseChased },
      { evaBasis: "the artifact is measured against the declare — a real difference, never a softmax", operator: "EVA", grain: "Lens", face: "LaVar" });
    wheel.turn("fold",
      "the superseding satisfaction — corrected against what this run's material actually allowed",
      { ok: sat, noGround: !hasGrounding, felt: readSurprise },
      { ok: sat, genre: prelimShape.register?.field?.field ?? null, ground: hasGrounding, sidecar: "append-only: this run's shape+felt fold back into the genre's impression" },
      { evaBasis: "a failed criterion supersedes the DEF by appending, never editing — the ledger's law", operator: "REC", grain: "Atmosphere", face: "Murch" });
  }

  // THE CHARTER GATE — governs this generation against the UDHR, on EVERY
  // turn, reachable (P88: a guard that is never reached passes forever).
  // A conflict refuses the answer with the named act/right on the record;
  // descriptive voice (atrocity discussion) passes by construction. The gate
  // cannot be turned off: it is imported, always armed with a charter, and
  // its verdict is part of every result.
  // The cache is trusted only after it passes isValidCharter — anything that
  // sets globalThis.__er7Charter to an empty or gutted charter (a giver with
  // no prohibitions/protections) would otherwise silently disarm the gate for
  // the rest of the process. An invalid cache is never repaired by re-reading
   // the real corpus (that path already ran and produced whatever is sitting
  // there); it is replaced with defaultCharter(), which is always valid by
  // construction, and the replacement is logged (never thrown — the gate must
  // not crash a turn). `charter` is the hoisted one (armed at the turn's top).
  // ── PII (Goffman) + INJECTION (Ulysses) — the two safeguards on ingestion ──
  // PII: the shapes on the artifact AND the ingested material (redacted).
  // Injection: the material is evidence, never instruction — the attempt is
  // disclosed, never obeyed. Both run for EVERY turn (reading, not just code).
  const ingestedMaterial = [
    ...[...(session.webSources?.values?.() ?? [])],
    ...(surfacedSegments ?? []).map((s) => s.text ?? ""),
  ].join("\n\n").slice(0, 200000);
  try {
    const outPii = piiFindings(text, { where: "output" });
    const admitted = session.pii ?? [];
    piiResult = { findings: [...outPii.findings, ...admitted], basis: outPii.basis + (admitted.length ? `; ${admitted.length} finding(s) at admission (before the fold)` : "") };
    if (piiResult.findings.length && onNote) onNote({ move: "pii_findings", counts: piiResult.findings.reduce((a, f) => { a[f.category] = (a[f.category] ?? 0) + 1; return a; }, {}) });
  } catch {}
  try {
    const injF = [
      ...injectionFindings(String(task ?? ""), { where: "task" }).findings,
      ...(ingestedMaterial.trim() ? injectionFindings(ingestedMaterial, { where: "material" }).findings : []),
    ];
    injectionResult = { findings: injF, basis: "injection archon (Ulysses) — material is EVIDENCE, never INSTRUCTION" };
    if (injF.length && onNote) onNote({ move: "injection_findings", findings: injF.map((f) => `${f.strength} ${f.injection}`) });
  } catch {}

  // THE FAMILY GATE (Grotius): the UDHR charter the turn is armed with, plus the
  // Earth instruments — a resolved hierarchy, not one voice. The verdict is the
  // union; each conflict names its charter AND article — the REASON, never the
  // bare verdict (Kelsen's lex superior: show which instrument governs, and
  // why). Descriptive voice (atrocity discussion) passes by construction, and
  // the families' GIVEN affordances already license the composition above.
  const charterVerdictOut = familyVerdict(charterFamily, text);
  if (charterVerdictOut.verdict === "conflict") {
    const reasons = charterVerdictOut.conflicts
      .map((c) => `${c.act ?? c.right ?? c.kind} — ${c.articles?.[0] ?? "the instrument"} (${c.charter})`)
      .join("; ");
    text = `[EOReader7: the composition cannot close its reasons — it prescribes what the family prohibits, or denies what it protects: ${reasons}. The core shows its reasons; it does not judge.]`;
  }

  // ── GROUNDED WISDOM (2026-09-15): the credited archons whose domain this
  // turn touched. The compendium is the latent mind ethos thinks with; a
  // response that draws on an archon's work always credits it. This rides the
  // result beside the constitution: the archons who actually RAN (the code
  // audit organs, the ground itself) plus the archons whose domain the
  // question matched — each with the verbatim credit line from the
  // compendium. The surface renders these as the affordance; the answer text
  // never borrows an archon's authority without its name.
  const groundedWisdom = (() => {
    const matched = matchArchons(String(task ?? ""));
    const ran = [
      charter ? { handle: "solon", why: "the ground — ethos comes before logos; the constitution governed this turn" } : null,
      privacyResult ? { handle: "brandeis", why: "the data-sovereignty archon ran on this turn's artifact" } : null,
      copyResult ? { handle: "martial", why: "the anti-copy archon ran on this turn's artifact" } : null,
      securityResult ? { handle: "saltzer", why: "the security archon ran on this turn's artifact" } : null,
      blindspotResult ? { handle: "popper", why: "the blind-spot archon ran on this turn's artifact" } : null,
      piiResult?.findings?.length ? { handle: "goffman", why: "the PII archon ran on this turn's output and material" } : null,
      injectionResult?.findings?.length ? { handle: "ulysses", why: "the injection archon disclosed an attempt this turn" } : null,
    ].filter(Boolean);
    const byHandle = new Map();
    for (const m of matched) byHandle.set(m.handle, { handle: m.handle, why: "the question touched this archon's domain", relevance: m.relevance });
    for (const r of ran) if (!byHandle.has(r.handle)) byHandle.set(r.handle, { handle: r.handle, why: r.why, relevance: 0 });
    return [...byHandle.values()]
      .map((x) => {
        const entry = archonOf(x.handle);
        return entry ? { handle: entry.handle, name: entry.name, organ: entry.organ, role: entry.role, pdStatus: entry.pdStatus, work: entry.work, source: entry.source, credit: entry.credit, why: x.why, relevance: x.relevance ?? 0 } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.relevance - a.relevance);
  })();

  return {
    text,
    // giver + sha256 + source ride the result so a consumer can always tell
    // which charter governed this turn — the full corpus or the fallback
    // excerpt — without re-deriving it from process state. `family` and
    // `license` carry the whole resolved hierarchy and the given affordances
    // the composition ran under (the license, not just the gate).
    charter: { verdict: charterVerdictOut.verdict, prescriptive: charterVerdictOut.prescriptive, descriptive: charterVerdictOut.descriptive, conflicts: charterVerdictOut.conflicts.map((c) => ({ kind: c.kind, act: c.act ?? null, right: c.right ?? null, charter: c.charter ?? null, articles: c.articles ?? [] })), giver: charter.giver, sha256: charter.sha256, source: charterSource, family: (charterFamily ?? []).map((c) => ({ schema: c.schema, giver: c.giver, rank: c.rank ?? null })), license: familyAffordances(charterFamily).map((r) => ({ left: r.left, right: r.right, giver: r.giver })) },
    // GROUNDED WISDOM — the credited archons whose domain this turn touched
    // (the ones that ran + the ones the question matched). Every entry carries
    // its verbatim credit line from the compendium; a response that draws on
    // an archon's work always credits it. The surface renders these as the
    // affordance.
    groundedWisdom,
    privacy: privacyResult ? { archon: "Brandeis", findings: privacyResult.findings, basis: privacyResult.basis } : null,
    copy: copyResult ? { archon: "Martial", findings: copyResult.findings, checked: copyResult.checked, basis: copyResult.basis } : null,
    security: securityResult ? { archon: "Saltzer", findings: securityResult.findings, basis: securityResult.basis } : null,
    blindspot: blindspotResult ? { archon: "Popper", findings: blindspotResult.findings, basis: blindspotResult.basis } : null,
    pii: piiResult ? { archon: "Goffman", findings: piiResult.findings, basis: piiResult.basis } : null,
    injection: injectionResult ? { archon: "Ulysses", findings: injectionResult.findings, basis: injectionResult.basis } : null,
    // THE SHADOW TRAIL (Bourdieu) — the cross-session accumulation: this
    // person's norm-standing as a RATE over their acts, never a verdict.
    shadow: assessShadow(personId),
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
          // THE WHEEL (D/E/R): the run as a sequence of DEF→EVA→REC turns —
          // register, impression, plan, read, verdict, fold — the fold is
          // the next run's ground. Serialized beside the ledger, append-only.
          wheel: runMode === "projection" ? (() => {
            try {
              const wp = path.join(ESSAY_LEDGER_DIR, `${documentLedger.docId.replace(/:/g, "_")}.wheel.json`);
              fs.writeFileSync(wp, JSON.stringify(wheel.toJSON(), null, 2));
              return { file: wp, turns: wheel.ledger.length };
            } catch { return { turns: wheel.ledger.length }; }
          })() : null,
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
              rows.push(`\nConflicting claims the essay carried, resolved by the norm hierarchy (Kelsen — ${precedenceOrderPhrase()}):`);
              for (const r of k.resolutions.slice(0, 8)) rows.push(`- ${r.subject}: “${r.a}” vs “${r.b}” → ${r.winner ? (r.winner === "a" ? r.a : r.b) : "tied"} — ${r.why ?? r.reason}`);
              if (k.resolutions.length > 8) rows.push(`… ${k.resolutions.length - 8} more.`);
            } else if (k?.basis) rows.push(`\nKelsen: ${k.basis}`);
            if (rankeTotalFindings) rows.push(`\nRanke found ${rankeTotalFindings} section(s) that drifted from the material and rewrote them from the record.`);
            // THE PERIODIC TABLE OF CREATIVITY — where this piece landed, read
            // off its own provenance (reproduced / derived / invented), the
            // metadata revealed on every surface. The label is the risk posture;
            // the SHARE, the n-window, and instrument disagreements ride with it.
            if (categorized) {
              rows.push(`\nThis piece landed in the cell ${categorized.cell.name} (${categorized.cell.archon}'s cell, ${categorized.cell.grain} × ${categorized.cell.phase} · ${categorized.derivation}): ${categorized.reproduce.quoted} quoted, ${categorized.reproduce.copied} copied (${categorized.units.reproduce}); ${categorized.derive} derived, ${categorized.invent} invented (${categorized.units.derive}).`);
              rows.push(`${categorized.derivation} STANDS as the FIELD (the category the next read primes on); the ECHO — below the field, still on the record — is ratio ${(categorized.derivationRatio * 100).toFixed(1)}% clutched to a magic n (${categorized.derivationWindow.n}); the real window is ${+categorized.derivationWindow.min.toFixed(2)}…${+categorized.derivationWindow.max.toFixed(2)}.${categorized.disagreement ? " The two instruments disagree on this text (order-specific runs the ledger calls company) — inspect the rows before trusting the cell." : ""}${categorized.paraphraseUnmeasured ? ` No reproduction seen — but paraphrase is UNMEASURED by this instrument; 'invented' may be grounded-and-reworded company.${categorized.paraphraseCandidates ? ` The shadow chase named ${categorized.paraphraseCandidates} span(s) whose claim-vocabulary the sources' own sentences carry${categorized.paraphraseEquated ? `, and the RECORD equated ${categorized.paraphraseEquated} of them, FOR ${categorized.paraphraseChase?.whom?.face ?? "the empty hub of this fold"}, to its own claim rows (${(categorized.paraphraseChase?.equatedRows ?? []).slice(0, 2).map((r) => `“${r.row?.label ?? ""}”`).join(", ")}) — grounded-by-meaning on the record's ruler, never a model, moved to derived` : ` — the record holds no row that equates them FOR this fold's whom (${categorized.paraphraseChase?.whom?.face ?? "the empty hub"}), and they are NAMED un-equatable, disclosed, never laundered`}.` : ""}` : ""}`);
            }
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
    satisfaction,
    // KELSEN: THE PRIMARY MODALITY — the essay's claims resolve by the norm
    // hierarchy (regime.js's PRECEDENCE_STEPS / precedenceOrderPhrase() —
    // this comment used to hand-type the order and, audited 2026-09-14, had
    // drifted to drop "regime"), and the resolutions are NAMED. This is the default
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
    // THE VOID HOLARCHY — the artifact's nested voids, every level a WHOLE (its
    // own nine-operator DEF) and a PART (a filler covering an extent in the
    // level above). OMNIMODAL (S6): the levels are structural — whole → part
    // → sub-part — and the modality only names them (the whole is the piece
    // in text, the work in music, the artifact in code). The law of holons:
    // low sets possibility for high, high probability for low — a sub-part's
    // void bounds what its part can assert; the whole's declared shape spawns
    // the part-voids. A level left under-specified is a visible gap.
    voidHolarchy: sections.length
      ? voidHolarchy({
          modality: isCode ? "code" : "text",
          fieldsByLevel: {
            whole: {
              slot: task.slice(0, 60),
              anchor: topicPhrase(task),
              admits: "a part",
              extent: sections.length ? { from: 1, to: sections.length + 1 } : null,
              relation: "is a part of",
              composition: sections.length ? "the parts compose the whole" : null,
              cardinality: sections.length || null,
              admission: "a part with real content, grounded, written as the artifact itself",
              reopensOn: "a part that is thin, ungrounded, or meta-commentary",
            },
            part: {
              slot: sections.length ? `${sections.length} part(s)` : null,
              admits: "a sub-part",
              extent: sections.length ? { from: 1, to: sections.length + 1 } : null,
              relation: "is a part of",
              cardinality: sections.length || null,
              admission: "a sub-part with real content, grounded",
              reopensOn: "a sub-part that is thin or ungrounded",
            },
          },
        })
      : null,
    totalStrain,
    thinking: thinkingBlock || null,
    answerShape: answerShape.shape,
    mode: runMode,
    // THE VOID, DEFINED AND SATISFIED — universal across every mode. The
    // shape names what the answer must be; the questions are the void the
    // answer had to fill; satisfied is the verdict the mode earned (a
    // projection's from its ledger satisfaction, a single answer's from the
    // void-fill check).
    void: {
      shape: answerShape.shape,
      modality: answerShape.modality,
      mode: runMode,
      questions: voidQuestions,
      cells: preVoid.cells.filter((c) => c.relevant).map((c) => ({ question: c.question, op: c.op, cell: c.cell })),
      satisfied: runMode === "projection"
        ? Boolean(documentLedger && (satisfaction?.ok ?? false))
        : Boolean(chatSatisfaction?.ok ?? false),
    },
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
              { sessionId: sid, model, task, workspace, holonLevel: job.holonLevel, resumeAnswered: answeredTitles, resumePlan: planQuestions, mode: "projection" },
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