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
import { postprocessAnswer, warmPostprocess } from "./postprocess.mjs";
// The three resolutions — brought in from the-fold (vendored at
// native/the-fold/): the discourse restated at three grains by the reading's
// own organs (atmosphere, lens, paradigm), never by a model's compression.
import { resolutionBlocks } from "./native/the-fold/resolutions.js";
import { tokenize } from "./native/the-fold/source.js";
import { readingIndexFromLog } from "./native/the-fold/reading-log.js";
import { dmdWindow } from "./native/kernel/activation.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GIVER = "reader:eoreader7-proxy";
const CANONICALIZATION_FLOOR = 2;
const ANCHORING = (process.env.ER7_ANCHORING ?? "born") === "born"
  ? { born: true, bornActivationFloor: Number(process.env.ER7_BORN_ACTIVATION_FLOOR ?? 0.5), bornMarginFloor: Number(process.env.ER7_BORN_MARGIN_FLOOR ?? 0.3), minWindow: Number(process.env.ER7_BORN_MIN_WINDOW ?? 4) }
  : { minActivation: Number(process.env.ER7_MIN_ACTIVATION ?? 0.05), minMargin: Number(process.env.ER7_MIN_MARGIN ?? 0.2) };
const DEFAULT_POS_PRIOR = path.join(HERE, "legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json");

export const OLLAMA = process.env.ER7_OLLAMA_URL ?? "http://localhost:11434";

// Model warmth: Ollama unloads a model after its keep_alive window (default
// 5m), so an idle gap between turns pays a multi-GB cold-load on the next
// one — which is exactly the failure we just ate. Real request bodies carry a
// long keep_alive, and the proxy pings recently-used models on an interval
// (keepModelHot) so the load never drops between turns. In seconds.
export const OLLAMA_KEEP_ALIVE_S = Number(process.env.ER7_KEEP_ALIVE_S ?? 3600);

// --- feature toggles (defaults: hyperlexicon ON, wikipedia enrichment OFF) -----
const HYPERLEXICON_ON = (process.env.ER7_HYPERLEXICON ?? "1") !== "0";
const WIKIPEDIA_ON = (process.env.ER7_WIKIPEDIA ?? "0") === "1";
const WIKI_MAX_CONCEPTS = Number(process.env.ER7_WIKI_MAX_CONCEPTS ?? 3);
const WIKI_TIMEOUT_MS = Number(process.env.ER7_WIKI_TIMEOUT_MS ?? 3500);

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
export const REQUEST_TIMEOUT_MS = Number(process.env.ER7_REQUEST_TIMEOUT_MS) || 290000;

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
  const entry = { reader, corpus: null, corpusIndex: null, lastChatText: "", turnCount: 0, lastAccess: now, indexSig: null, referents: null };
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
        if (onNote) onNote({ span: "workspace", kind: "skipped_big", rel: full.slice(absRoot.length).replace(/^\//, ""), bytes: stat.size });
        continue;
      }
      if (readChars + stat.size > maxChars) {
        if (onNote) onNote({ span: "workspace", kind: "skipped_budget", rel: full.slice(absRoot.length).replace(/^\//, ""), bytes: stat.size });
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
          onNote({ span: "workspace", kind: "task", rel: e.rel, task_id: t.task_id ?? null, description: t.description ?? null });
        }
      }
      await yieldToEventLoop();
    }
  }
  session.corpusIndex = index;
  return { admitted, chars };
}

function readWorkspaceFile(entry, onNote) {
  try {
    const text = fs.readFileSync(entry.abs, "utf8").slice(0, MAX_FILE_CHARS);
    return text;
  } catch (err) {
    if (onNote) onNote({ span: "workspace", kind: "read_error", rel: entry.rel, error: err.message });
    return null;
  }
}

// THE SURF — the real mechanical address ladder against the session's corpus.
// Returns the addressed segment(s) TEXT ONLY. The address (source, heading,
// byte range, addressed_by) is reported to the ledger/notes — it is NEVER
// placed in the model's context.
function surfTask(session, task, onNote) {
  if (!session.corpus || session.corpus.documents.size === 0) {
    if (onNote) onNote({ span: "surf", kind: "no_corpus" });
    return { segments: [], void: true, reason: "no corpus yet" };
  }
  const result = executePrompt(session.corpus, task);
  if (onNote) onNote({ span: "surf", kind: "addressed", operator: result.operator ?? null, fan: Array.isArray(result.fan) ? result.fan.length : 0 });

  // A truthy `.gap` is not always a hard refusal (addressDoc's no-outline
  // fallback still spreads real text beside a disclosed label) — only a
  // result with no text at all is unusable.
  const candidates = (result.fan ?? [result]).filter((c) => c?.text);
  if (!candidates.length) {
    const first = result.fan?.[0] ?? result;
    const gap = result.gap ?? first?.gap ?? "content_not_found";
    if (onNote) onNote({ span: "surf", kind: "void", gap, reason: result.reason ?? first?.reason ?? null });
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
      onNote({ span: "surf", kind: "segment", source: l.source, addressed_by: l.addressed_by, heading: l.heading, bytes: l.bytes, chars: text.length });
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
// A single slot for Ollama generation (num_parallel=1).
// Reading pipelines run concurrently; only generation is serialized.
let generationSlot = Promise.resolve();
async function withSlot(work) {
  const run = generationSlot.then(work, work);
  generationSlot = run.catch(() => {});
  return run;
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

async function* streamOllamaChat(model, messages, { maxTokens, json, onNote } = {}) {
  for (let attempt = 0; attempt < CALL_RETRIES; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      if (onNote) onNote({ span: "ollama", kind: "request", model, attempt: attempt + 1 });
      const res = await fetch(`${OLLAMA}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          keep_alive: `${OLLAMA_KEEP_ALIVE_S}s`,
          ...(json ? { format: json === true ? "json" : json } : {}),
          options: { num_predict: maxTokens ?? CALL_MAX_TOKENS, num_ctx: Math.max(NUM_CTX, Math.ceil(PROMPT_MAX_CHARS / 3) + (maxTokens ?? CALL_MAX_TOKENS)) },
        }),
      });
      if (!res.ok) throw new Error(`ollama ${res.status}`);
      if (onNote) onNote({ span: "ollama", kind: "streaming" });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
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
            if (obj.message?.content) yield obj.message.content;
            if (obj.done) {
              yield { done: true, prompt_eval_count: obj.prompt_eval_count ?? 0, eval_count: obj.eval_count ?? 0 };
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
  if (onNote) onNote({ span: "reading", kind: "referent_index", referents: index?.referents?.size ?? 0, events: index?.events?.length ?? 0, encounters: index?.encounters ?? 0, ms: Date.now() - started, basis: index?.basis ?? null });
  return index;
}

export async function runProxyTurn({ sessionId, model, task, chatHistory = [], discourse = "", workspace = "" }, onToken, onNote = null) {
  const usage = { promptTokens: 0, completionTokens: 0 };
  const session = getSession(sessionId);
  _hot.add(model); // this turn is using it — hold it resident after

  // 0. Preflight — fail fast, don't hang.
  if (onNote) onNote({ span: "logic", kind: "preflight", target: OLLAMA });
  const modelsUp = await ollamaReachable();
  if (modelsUp === null) {
    if (onNote) onNote({ span: "logic", kind: "upstream_down", target: OLLAMA });
    throw new Error(`Ollama upstream ${OLLAMA} is not responding — check 'er7-proxy log' and that Ollama is running.`);
  }
  const modelKnown = modelsUp.some((m) => (m.name ?? m.model) === model);
  if (modelsUp.length && !modelKnown) {
    if (onNote) onNote({ span: "logic", kind: "model_missing", model, available: modelsUp.map((m) => m.name ?? m.model) });
  }

  // 1. Workspace — admit real files into the session corpus, then SURF the
  // task. The model is never shown an address; it is shown the content the
  // surfer mechanically addressed ("as if from nowhere").
  const workspaceStats = { files: 0, chars: 0, segments: 0, refusals: 0 };
  let surfacedSegments = [];
  let surfVoid = false;
  let surfVoidInfo = null;
  if (workspace && fs.existsSync(workspace)) {
    if (onNote) onNote({ span: "workspace", kind: "scan", root: workspace });
    const entries = workspaceEntries(workspace, onNote);
    if (onNote) onNote({ span: "workspace", kind: "files", count: entries.length, chars: entries.reduce((a, e) => a + e.size, 0) });
    const admit = await admitWorkspaceEntries(session, entries, onNote);
    workspaceStats.files += entries.length;
    workspaceStats.chars += admit.chars;

    // Step surfaced segment text through the fold too, so holograph/hyperlexicon
    // build from the code being discussed — not just the task prose.
    if (admit.admitted > 0 && onNote) onNote({ span: "workspace", kind: "admitted", files: admit.admitted });
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
      admitChunked(session.corpus, { text: delta, sourceId: srcId });
      if (onNote) onNote({ span: "workspace", kind: "conversation_admitted", sourceId: srcId, chars: delta.length, reset: !materialText.startsWith(prevText) });
    }
    session.lastChatText = materialText;
  }

  if (onNote) onNote({ span: "reading", kind: "begin", encounters: null, chars: materialText.length });
  const encounters = textEncounters(materialText, { source: `proxy:session:${sessionId}`, offset: 0 });
  if (onNote) onNote({ span: "reading", kind: "encounters", count: encounters.length, chars: materialText.length });

  for (const enc of encounters) {
    const turn = await session.reader.step(enc);
    if (turn?.tasks?.open && onNote) {
      for (const t of turn.tasks.open) {
        onNote({ span: "reading", kind: "task", task_id: t.task_id ?? null, description: t.description ?? null, questions: t.questions ?? [] });
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
        onNote({ span: "logic", kind: "note", task_id: t.task_id ?? null, description: t.description ?? null, result: t.result ?? null });
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

  if (onNote) onNote({ span: "composition", kind: "digest", relations: stats.relationEdges, bindings: stats.referentBindings, hyperlexicon: Object.keys(hyperlexicon.composition ?? {}).length });

  // 3. SURF the task against the session corpus — the mechanical address
  // ladder (source→heading→content→window). Content only reaches the model
  // inside surfacedSegments, or a DISCLOSED void fact (P32's searched-void
  // pattern: a fact about what the corpus does NOT hold, never a behavioral
  // instruction stacked on top of it).
  if (session.corpus && session.corpus.documents.size > 0) {
    const surf = surfTask(session, task, onNote);
    surfacedSegments = surf.segments;
    surfVoid = surf.void;
    surfVoidInfo = surf.void ? { gap: surf.gap ?? "content_not_found", reason: surf.reason ?? null } : null;
    workspaceStats.segments = surfacedSegments.length;
    if (surf.void) workspaceStats.refusals = 1;
  } else if (onNote) {
    onNote({ span: "surf", kind: "no_corpus" });
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
        if (onNote) onNote({ span: "reading", kind: "resolutions_failed", error: err.message });
      }
      if (onNote && resolutions) {
        onNote({
          span: "reading", kind: "resolutions", level: resolutions.level,
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
      readingDigest += `\n[Wikipedia grounding: ${wikiNotes.map((w) => `${w.term} — ${w.snippet}`).join(" | ")}]`;
      if (onNote) onNote({ span: "composition", kind: "wiki", notes: wikiNotes.map((w) => w.term) });
    }
  }
  if (resolutions?.text) {
    readingDigest += `\n\n[The conversation at three resolutions]\n${resolutions.text}`;
  }

  // 5. Build messages for Ollama under a MAX prompt budget — filled close to
  // the ceiling, never starved: the essential system context (role, discourse,
  // digest, the three resolutions) is always kept whole; the CHAT HISTORY has
  // precedence over surfaced material (continuity lives on the turn's own
  // recent talk); the addressed segments then fill the room that remains.
  // The model sees surfed byte TEXT — never the byte addresses, never the
  // source names, never the headings. The address is the proxy's ledger, not
  // the model's confabulandum.
  const systemCore = [
    "You are EOReader7, a precise reading instrument. Answer accurately based on the material provided.",
    discourse ? `Context: ${discourse}` : null,
    readingDigest ? readingDigest : null,
    surfVoidInfo
      ? `\nNothing in the workspace addressed the question: surf returned ${surfVoidInfo.gap}${surfVoidInfo.reason ? ` (${surfVoidInfo.reason})` : ""}. The material below is what the surrogate actually read — answer from it or say you cannot.`
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
    systemContent += `\n\nThe following material was surfaced from the workspace for this question:\n\n"""\n${material.join("\n\n")}\n"""`;
  }
  if (onNote) onNote({ span: "ollama", kind: "prompt_budget", system: systemCore.length, chat: keptChat.length, chatChars: chatLen, materialSegments: material.length, materialChars: used, taskChars: taskLen, max: PROMPT_MAX_CHARS });

  const ollamaMessages = [];
  ollamaMessages.push({ role: "system", content: systemContent });
  for (const m of keptChat) {
    ollamaMessages.push({ role: m.role, content: m.content });
  }
  ollamaMessages.push({ role: "user", content: task });

  // 6. Stream tokens from Ollama, forward each to caller — through the single eval slot.
  let fullText = "";
  await withSlot(async () => {
    for await (const chunk of streamOllamaChat(model, ollamaMessages, { maxTokens: CALL_MAX_TOKENS, onNote })) {
      if (typeof chunk === "string") {
        fullText += chunk;
        if (onToken) onToken(chunk);
      } else if (chunk?.done) {
        usage.promptTokens += chunk.prompt_eval_count;
        usage.completionTokens += chunk.eval_count;
      }
    }
  });

  // 7. Post-process before it is printed: extract code blocks, pyodide-lint
  // the Python, and reorder top-level entities so each depends only on things
  // defined above it. The unconscious system lints, orders, and pins. The
  // model never sees the fixup transcript — only the repaired answer.
  // Latency guard: warmed at boot, timeboxed per turn; if the budget is
  // exceeded the original text is returned untouched — the unconscious
  // system never holds the response hostage.
  let post = null;
  let text = fullText;
  if (fullText.trim()) {
    post = await postprocessAnswer(fullText, { onNote, timeboxMs: POSTPROCESS_TIMEOUT_MS });
    if (post && typeof post.text === "string" && post.text.trim() && post.text !== fullText) {
      text = post.text;
    }
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
    usage,
  };
}