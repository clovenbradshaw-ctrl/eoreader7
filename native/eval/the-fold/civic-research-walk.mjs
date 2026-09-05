// civic-research-walk.mjs — THE FOLD DOES THE RESEARCH.
//
// A GENERIC driver: point it at a real subject via a declared TASK
// question and it surfs, reads, snips, summarises, and checks itself; it
// only wires its organs together and prints what they returned. Nothing
// here writes a finding, and nothing here names a subject — TASK is
// required, with no default, so this file carries no research content of
// its own between runs (see READING-SPEC.md S65 for the lessons a real
// run on a real subject already taught it).
//
// ── WHAT THE FOLD IS ASKED FOR, AND WHAT IT MAY NOT SAY ──────────────────
//
// The output is a LEDGER OF WHAT IS CLAIMED, AND BY WHOM — never a claim
// about what is true (P84's own wording rule). "Corruption" is not a
// verdict this instrument can reach and it never asserts one: what it can
// do is state, for every proposition, which sources state it, in their own
// bytes, at addresses that read back. A reader draws the conclusion.
//
// ── THE SEVEN PHASES, EACH A REAL ORGAN ──────────────────────────────────
//
//  1 SURF      the fold derives its own queries. The opening one comes from
//              proof.js::preflightQuery over the declared task; every later
//              one comes from ranke.js::claimOfNote + proof.js::proofQuery
//              over THE LEDGER'S OWN THIN NOTES — the fold searches for a
//              second source for what it has heard once, which is the
//              question a one-witness note actually poses. Crossings are
//              budgeted, kept content-addressed with their retrieval date,
//              and every refusal is typed (web.js's own parseSearchResults
//              reports DDG's anomaly page as `blocked`, never as "the web
//              had nothing").
//  2 READ      chunkSource (byte-accurate, self-verified) → the REAL
//              makeRelationReader, with the whole-page furniture blanking a
//              web page needs, the POS grammar gate lit, determiners and
//              negation words injected (P41/P43 — a received closed class
//              closes a false binding), pronoun subjects resolved. Bound
//              edges are admitted through the hyperlexicon door; the door's
//              refusals are counted, never discarded.
//  3 SNIP      primary.js::snipClaim — for every note, the sentences in the
//              source's OWN kept bytes that state it, each with an address
//              that is verified to read back (P5.2). This is the verbatim
//              half of the document and no model touches it.
//  4 COMPOSE  the account of each page is rendered MODEL-FREE. crown.js's
//              `renderCrown` assembles a sentence entirely from the claim's
//              own end/label words, the source's own name, and a closed
//              connective vocabulary — there is no free-text step for a
//              wrong word to come from — and compose.js joins them into a
//              passage under a DECLARED order. Every rendered sentence is
//              followed by the page's own bytes that state it.
//  5 CHASE     ranke.js::chaseLedger — notes standing on accounts alone
//              chased to the documents those accounts themselves cite.
//  6 CORROBORATE corroboration.js::corroborateLedger — the witness walk
//              that moves a note from one source to two, with instrument
//              independence counted apart from source count.
//  7 COMPOSE   the document is ASSEMBLED, not written: every line of it is
//              either a verbatim span from a kept face, a model sentence
//              with its verdict and its decider, or a count.
//
// ── WHERE THE MODEL IS, AND HOW LITTLE IT IS ─────────────────────────────
//
// The model never writes a sentence that reaches the document. Its entire
// authority in this run is the SELECT protocol: it is handed a numbered
// list of sentences THE MATERIAL ALREADY CONTAINS and it points at one by
// index — there is nothing to write, so the echo failure mode is
// structurally impossible, and every pick is armed by a sibling swap that
// refuses an indiscriminate pointer. Choosing what to search, what to
// fetch, what to extract, which candidates to offer, how to fold a verdict,
// what counts as a distinct source, and how the passage reads are all
// decided OUTSIDE it, by organs. §7 of the output prints every call the
// model was asked to make and what came back, so its whole contribution is
// auditable in one table.
//
// ── THE CONTROL (II.23), RUN IN THE SAME BREATH ──────────────────────────
//
// Every witness arm runs twice: once on the real ledger, once on the SAME
// ledger with each note's end2 rotated to the next note's — the identical
// slicer, the identical model, the identical budget. An attest rate the
// redeal reproduces is measuring topic, not proposition, and this driver
// reports both rather than the real one alone.
//
// ── RUNNING THIS LOCALLY ──────────────────────────────────────────────
//
// Nothing this run fetches or writes is committed (see .gitignore): the
// kept pages, the search cache, and the produced *-READING.md are this
// run's own, regenerable, and belong beside wherever the subject's own
// material lives — never in this repo. The CODE is what this repo owns.
//
// CHECK=1 node civic-research-walk.mjs
//   Verifies the ground before spending anything: the two sibling repos
//   (the-fold, live_priors) are found, and whether Ollama and the
//   declared MODEL are reachable. No search, no fetch, no model call.
//   Exits 0 if nothing fatal, 1 otherwise. Run this first on a new
//   machine or after moving the checkout. TASK is not required for
//   CHECK=1 — preflight runs before the TASK requirement is enforced.
//
// TASK="<your own question>" node civic-research-walk.mjs
//   REQUIRED, with no default. The task is the ONLY place a human names
//   the subject or the question — e.g. "How is the Riverside Housing
//   Trust funded, governed and overseen, and what has the County
//   Commission said about its budget and its contracts?" Which documents
//   answer it is discovered by the walk itself — chased, searched for,
//   never seeded — by standing decision: this driver does not accept a
//   document or source list.
//
// Sibling repos (only if this checkout is not itself a sibling of
// the-fold and live_priors):
//   THE_FOLD_DIR=/path/to/the-fold  LIVE_PRIORS_DIR=/path/to/live_priors
//   ALIAS_PRIOR=/path/to/alias-declaration-en.json (overrides the prior file directly)
//
// Model / reach:
//   MODEL (gemma2:2b) · OLLAMA (http://127.0.0.1:11434)
//   OFFLINE=1 (kept faces only; a miss is a typed gap, no network)
//   SELECTOR=referent-face (S62 — swaps the corroboration walk's
//     admission gate from literal word co-presence, measured dead at the
//     level a walk spends its budget, to the reader's own resolved
//     referent face, the one selector measured to separate. Default:
//     copresence, the original behavior, unchanged.)
//
// Budgets (P4/P9 — every one is a declared leash, never a hidden default):
//   MAXQ searches (10) · MAXF pages kept (16) · MAXTRY fetch attempts (40)
//   RESULTS per query (8) · WALK_ASKS (40) · CHASE_F (10) · CHASE_S (4)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const FACES = `${FIX}research-faces`;
const OUT = new URL("./results/", import.meta.url).pathname;

// ── PORTABLE SIBLING PATHS ──────────────────────────────────────────────
//
// This organ lives in eoreader7 but reaches two sibling repos: the-fold
// (proof.js/crown.js/compose.js — the surf-question and model-free-render
// organs that have not yet crossed the ratchet) and live_priors (the
// received alias-declaration prior, LP15). The default assumes the layout
// every repo in this project is developed under — three checkouts as
// siblings under one parent — and is overridable per machine so this file
// never hard-codes one person's directory.
const SIBLINGS_ROOT = new URL("../../../..", import.meta.url).pathname;
const THE_FOLD_DIR = (process.env.THE_FOLD_DIR ?? `${SIBLINGS_ROOT}the-fold`).replace(/\/$/, "");
const LIVE_PRIORS_DIR = (process.env.LIVE_PRIORS_DIR ?? `${SIBLINGS_ROOT}live_priors`).replace(/\/$/, "");

// ── PREFLIGHT: check the ground this run needs before spending anything ──
//
// CHECK=1 runs ONLY this and exits — no search, no fetch, no model call —
// so a fresh checkout (or a different machine) can be confirmed wired
// before a single crossing is made. A missing sibling file is fatal (the
// driver cannot surf or compose without it); a missing or unpulled model
// is NOT fatal here — phases 1-4 (surf/read/snip/compose) call no model at
// all, and the chase/corroboration phases already degrade to a typed,
// caught gap rather than crashing (their own try/catch), so this preflight
// reports it rather than blocking on it.
async function preflight() {
  const rows = [];
  const fileOk = (label, p) => rows.push({ label, ok: existsSync(p), detail: p });
  fileOk("the-fold: proof.js", `${THE_FOLD_DIR}/proof.js`);
  fileOk("the-fold: crown.js", `${THE_FOLD_DIR}/crown.js`);
  fileOk("the-fold: compose.js", `${THE_FOLD_DIR}/compose.js`);
  fileOk("live_priors: alias prior", `${LIVE_PRIORS_DIR}/derived-priors/alias-priors/alias-declaration-en.json`);
  let ollamaOk = false, modelsSeen = [];
  try {
    const res = await fetch(`${process.env.OLLAMA ?? "http://127.0.0.1:11434"}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) { ollamaOk = true; modelsSeen = ((await res.json())?.models ?? []).map((m) => m.name); }
  } catch (e) { rows.push({ label: "ollama reachable", ok: false, detail: String(e?.message ?? e).slice(0, 100) }); }
  const model = process.env.MODEL ?? "gemma2:2b";
  if (ollamaOk) {
    rows.push({ label: "ollama reachable", ok: true, detail: process.env.OLLAMA ?? "http://127.0.0.1:11434" });
    rows.push({ label: `model "${model}" pulled`, ok: modelsSeen.includes(model), detail: modelsSeen.includes(model) ? "" : `pulled: ${modelsSeen.join(", ") || "(none)"} — this is a soft gap, not fatal` });
  }
  const fatal = rows.filter((r) => !r.label.startsWith("model") && !r.label.startsWith("ollama") && !r.ok);
  process.stdout.write("\n# preflight\n");
  for (const r of rows) process.stdout.write(`  ${r.ok ? "OK  " : "FAIL"}  ${r.label}${r.detail ? ` (${r.detail})` : ""}\n`);
  if (fatal.length) {
    process.stdout.write(`\n${fatal.length} fatal check(s) failed — set THE_FOLD_DIR / LIVE_PRIORS_DIR if this checkout is not a sibling of the-fold and live_priors, or fetch/build the missing prior. Stopping before any crossing is spent.\n`);
  } else if (!ollamaOk || !modelsSeen.includes(model)) {
    process.stdout.write(`\nNo fatal checks failed. Surf/read/snip/compose need no model and will run; the chase and the corroboration walk will report a typed gap in place of each call until this is fixed.\n`);
  } else {
    process.stdout.write(`\nAll checks pass.\n`);
  }
  return fatal.length === 0;
}
const PREFLIGHT_OK = await preflight();
if (!PREFLIGHT_OK || process.env.CHECK === "1") process.exit(PREFLIGHT_OK ? 0 : 1);

// ── declared parameters (P4/P9: every budget is the caller's, never a default
// discovered at the call site) ───────────────────────────────────────────────
const MAXQ = Number(process.env.MAXQ ?? 10);        // searches this run may spend
const MAXF = Number(process.env.MAXF ?? 16);       // pages KEPT (a face that read back)
const MAXTRY = Number(process.env.MAXTRY ?? 40);   // fetch ATTEMPTS — kept apart from MAXF so a run of 403s cannot silently eat the page budget
const RESULTS = Number(process.env.RESULTS ?? 8);  // results considered per search
const WALK_ASKS = Number(process.env.WALK_ASKS ?? 40); // corroboration walk budget (model index-picks)
const CHASE_F = Number(process.env.CHASE_F ?? 10); // Ranke fetches
const CHASE_S = Number(process.env.CHASE_S ?? 4);  // Ranke searches
const MODEL = process.env.MODEL ?? "gemma2:2b";
const OLLAMA = process.env.OLLAMA ?? "http://127.0.0.1:11434";
const OFFLINE = process.env.OFFLINE === "1";
// Two DECLARED SPENDING RULES, added after a first live run spent several
// fetches chasing an aggregator's recirculation module to an unrelated
// newsletter site. They gate what the fold spends budget
// on and how §3 is ordered; they NEVER gate admission — everything heard
// still lands in the ledger and the off-anchor count is printed, so this
// narrows the walk without hiding anything from the reader.
//
//  ANCHOR       the declared task's own content words. A proposition whose
//               ends share none of them is off-anchor: real, heard, kept,
//               and not worth this run's remaining fetches. Crude on
//               purpose and said so — "budget" and "board" are common
//               words and will admit some drift.
//  MAX_END_CHARS a note whose end is longer than this is subject-span
//               debris (the extractor gap named in P74/P82), and
//               proofQuery quotes the atom, so a long end becomes an
//               exact-phrase query that can only return nothing. Measured:
//               every such query in run 1 returned 0 results.
const MAX_END_CHARS = Number(process.env.MAX_END_CHARS ?? 60);
const MIN_FACE_CHARS = Number(process.env.MIN_FACE_CHARS ?? 400); // a readable face under this is a shell or a sign-in wall, not a document
// How many of the declared task's own content words a proposition must carry
// before the fold spends a search on it. ONE is too few, measured on a real
// run: a proposition sharing exactly one word with the task (the subject's
// own city name, and nothing else) cost that run several fetches of an
// unrelated outlet's section fronts, chasing a coincidence rather than the
// subject. TWO is the same structural minimum this project already uses
// wherever recurrence has to mean something (WITNESS_FLOOR, FORM_MIN_ARRIVALS,
// EVIDENCE_FLOOR — all 2, all for the same reason). Declared cost: real
// propositions that name the subject only once are heard, kept, and not
// chased.
const ANCHOR_MIN = Number(process.env.ANCHOR_MIN ?? 2);
// How often a glossed short form must occur before the fold treats it as a
// name the material actually uses. Giver: the same structural minimum this
// project uses wherever recurrence has to mean anything — one arrival has
// nothing to be compared with (organs/aliases.js carries the full reasoning).
const ALIAS_MIN_USES = Number(process.env.ALIAS_MIN_USES ?? 2);
const NAME_ROUNDS = Number(process.env.NAME_ROUNDS ?? 4); // how many times the fold may follow a newly-named thread outward
// Two documents are ONE TEXT when they share this many long sentences
// verbatim — the syndication residue proof.js's own header discloses and
// cannot see ("two hosts syndicating one wire story are ALSO one
// perspective"). 40 chars: long enough that verbatim recurrence is not
// coincidence. 2 sentences: one could be a quotation both outlets quote.
const SHARED_SENTENCE_CHARS = Number(process.env.SHARED_SENTENCE_CHARS ?? 40);
const SHARED_SENTENCES_MIN = Number(process.env.SHARED_SENTENCES_MIN ?? 2);
const PREFLIGHT_OVERLAP = Number(process.env.PREFLIGHT_OVERLAP ?? 0.3);      // of the task's own content words a result must show before it is worth a fetch
const SECOND_SOURCE_OVERLAP = Number(process.env.SECOND_SOURCE_OVERLAP ?? 0.6); // of a proposition's own words, for the stricter question "does anyone else STATE this?"
const ARCHIVE_PROBE_LIMIT = Number(process.env.ARCHIVE_PROBE_LIMIT ?? 3); // consecutive archive refusals before the route is marked closed for this run
const SEARCH_PAUSE_MS = Number(process.env.SEARCH_PAUSE_MS ?? 4000); // between searches; sequential, never a burst
const RECIPE = "civic-research-v1";

// The declared task. The fold derives every query it spends from this and
// from its own reading — no source is hand-picked, and this string is the
// ONLY place a human names the subject or the question; which documents
// answer it is discovered by the walk itself (chased, searched for, never
// seeded here), by explicit standing decision — the fold is not told which
// records matter for a subject, only what is being asked about it. There
// is deliberately NO default: a driver that ships with a subject baked in
// is carrying research content, not a template, so a bare invocation
// refuses rather than quietly re-running whatever this file was last
// pointed at.
if (!process.env.TASK) {
  process.stdout.write("\nTASK is required and has no default — see the header comment above for the shape of a good one (a real, checkable question naming a real subject and body).\n");
  process.exit(1);
}
const TASK = process.env.TASK;

// ── the organs, native only ────────────────────────────────────────────────
const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable, parseSearchResults, extractFeed, decodeEntities, unwrapDdgHref, hostOf } = await import(`${NATIVE}/organs/web.js`);
const { snipClaim } = await import(`${NATIVE}/organs/primary.js`);
const { wordSet, hasWord, CLAIM_STOPWORDS, splitSentences: sentencesWithOffsets } = await import(`${NATIVE}/organs/grounding.js`);
const { declaredAliases, shapesFrom } = await import(`${NATIVE}/organs/aliases.js`);
// The alias-declaration shapes are RECEIVED, with a giver: live_priors
// measured which shapes English prose actually uses to introduce a short
// form, over its own corpus, and ships the counts alongside each. Both
// floors below are this run's own declaration — the prior measures, the
// caller decides what is good enough. Absent the prior, the fold simply
// does not learn names from the material and says so.
const ALIAS_PRIOR_PATH = process.env.ALIAS_PRIOR ?? `${LIVE_PRIORS_DIR}/derived-priors/alias-priors/alias-declaration-en.json`;
const ALIAS_MIN_CONFIRM = Number(process.env.ALIAS_MIN_CONFIRM ?? 0.3);
const ALIAS_MIN_FIRES = Number(process.env.ALIAS_MIN_FIRES ?? 100);
let ALIAS_PRIOR = null, ALIAS_SHAPES = [];
try {
  ALIAS_PRIOR = JSON.parse(readFileSync(ALIAS_PRIOR_PATH, "utf8"));
  ALIAS_SHAPES = shapesFrom(ALIAS_PRIOR, { minConfirmRate: ALIAS_MIN_CONFIRM, minFires: ALIAS_MIN_FIRES });
} catch (e) { ALIAS_PRIOR = { gap: String(e?.message ?? e).slice(0, 100) }; }
const R = await import(`${NATIVE}/organs/ranke.js`);
const T = await import(`${NATIVE}/organs/index.js`);
const { standingOf } = await import(`${NATIVE}/kernel/notes.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const { cellOf, GRAINS } = await import(`${NATIVE}/kernel/cube.js`);
const nativeTaskLog = await import(`${NATIVE}/kernel/task-log.js`);
const { preflightQuery, proofQuery } = await import(`${THE_FOLD_DIR}/proof.js`);
const posPrior = JSON.parse(readFileSync(`${FIX}pos-prior-eng.json`, "utf8"));

const reader = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
  discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
  negationWords: P.NEGATION_WORDS,
  blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
  resolvePronouns, nounPhraseSubjects: true,
});
const hl = makeHyperlexicon({
  createTaskLog: nativeTaskLog.createTaskLog, append: nativeTaskLog.append,
  projectTasks: nativeTaskLog.projectTasks, ENTRY_KINDS: nativeTaskLog.ENTRY_KINDS,
  OPERATOR_BASIS: nativeTaskLog.OPERATOR_BASIS, GRAINS, cellOf,
});

// ── the crossings (P13): one search face, one fetch, both kept ─────────────
mkdirSync(FACES, { recursive: true });
mkdirSync(OUT, { recursive: true });
const INDEX = `${FACES}/index.json`;
const SEARCHES = `${FACES}/searches.json`;
const index = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, "utf8")) : {};
const searches = existsSync(SEARCHES) ? JSON.parse(readFileSync(SEARCHES, "utf8")) : {};
const sha16 = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const crossings = [];   // every network act, in order, for the appendix
let searchesSpent = 0, fetchesSpent = 0, archiveRefusals = 0, archiveClosed = false;
// A page SERVED FROM THE KEPT CACHE is not a page this run fetched, and a
// run that reports "7 pages kept, 0 fetches" without saying which is which
// reads as a contradiction. Counted apart, printed apart.
let facesFromCache = 0, searchesFromCache = 0;   // fetchesSpent counts ATTEMPTS; pages kept is pages.length

// THE SEARCH FACES, IN ORDER, EACH TYPED.
//
// The fold's own two DuckDuckGo HTML faces come first (web.js::
// parseSearchResults, which reports DDG's anomaly page as `blocked` rather
// than as an empty web). Measured in this environment: both answer 202 with
// that anomaly page for every query, before and after a 90-second backoff
// and through the agent proxy alike — this egress is rate-limited, which is
// a fact about where the run is standing, not about the subject.
//
// So two DOCUMENTED FEED faces stand behind them. They are parsed by
// web.js's OWN `extractFeed` — RSS 2.0's declared schema (<item>, <title>,
// <link>), never a page's layout — which is the difference between a face
// the fold may speak to and the per-site formatting rule this project has
// twice refused to write. A feed link wrapped in a redirect is unwrapped by
// one general rule: a link whose query carries an absolute http(s) URL
// resolves to that URL. That is the SAME rule `unwrapDdgHref` already
// applies to `uddg=`, generalised rather than re-typed per host.
const SEARCH_FACES = [
  { name: "ddg-lite", parse: "html", at: (q) => `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}` },
  { name: "ddg-html", parse: "html", at: (q) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}` },
  { name: "web-feed", parse: "feed", at: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}&format=RSS` },
  { name: "news-feed", parse: "feed", at: (q) => `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=RSS` },
];

/** A redirect resolves to the absolute http(s) URL its own query carries. */
function unwrapRedirect(href) {
  const h = decodeEntities(String(href ?? "")).trim();
  const viaDdg = unwrapDdgHref(h);
  if (viaDdg && !/[?&](?:url|u|q)=/i.test(viaDdg)) return viaDdg;
  try {
    const u = new URL(h);
    for (const [, v] of u.searchParams) {
      const d = (() => { try { return decodeURIComponent(v); } catch { return v; } })();
      if (/^https?:\/\/\S+$/i.test(d)) return d;
    }
  } catch { /* not a URL we can take apart */ }
  return viaDdg ?? (/^https?:\/\//i.test(h) ? h : null);
}

async function search(q) {
  if (searches[q]) { searchesFromCache += 1; return searches[q]; }
  if (OFFLINE || searchesSpent >= MAXQ) return [];
  searchesSpent += 1;
  // one query at a time, with a declared pause — a burst is what earns the
  // anomaly page, and a refused search costs the run a real source.
  if (searchesSpent > 1) await new Promise((r) => setTimeout(r, SEARCH_PAUSE_MS));
  const tried = [];
  for (const face of SEARCH_FACES) {
    const ep = face.at(q);
    try {
      const res = await fetch(ep, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(30000) });
      const body = await res.text();
      let out = [];
      if (face.parse === "html") {
        const parsed = parseSearchResults(body);
        if (parsed.blocked || parsed.offEndpoint) { tried.push(`${face.name}:${parsed.blocked ? "blocked" : "off-endpoint"}`); crossings.push({ act: "search", q, face: face.name, status: res.status, blocked: !!parsed.blocked, found: 0, at: new Date().toISOString() }); continue; }
        out = (parsed.results ?? []).map((r) => ({ url: r.url, host: hostOf(r.url), title: r.title ?? null, snippet: r.snippet ?? "" }));
      } else {
        const feed = extractFeed(body);
        if (!feed) { tried.push(`${face.name}:not-a-feed`); crossings.push({ act: "search", q, face: face.name, status: res.status, gap: { type: "off-endpoint", detail: "no feed in the body" }, at: new Date().toISOString() }); continue; }
        out = (feed.items ?? []).map((it) => { const url = unwrapRedirect(it.link); return url ? { url, host: hostOf(url), title: it.title ?? null, snippet: it.summary ?? "" } : null; }).filter(Boolean);
      }
      if (!out.length) { tried.push(`${face.name}:empty`); crossings.push({ act: "search", q, face: face.name, status: res.status, found: 0, at: new Date().toISOString() }); continue; }
      searches[q] = out.slice(0, RESULTS);
      writeFileSync(SEARCHES, JSON.stringify(searches, null, 1));
      crossings.push({ act: "search", q, face: face.name, status: res.status, found: searches[q].length, at: new Date().toISOString() });
      return searches[q];
    } catch (e) {
      tried.push(`${face.name}:${String(e?.message ?? e).slice(0, 40)}`);
      crossings.push({ act: "search", q, face: face.name, gap: { type: "unreachable", detail: String(e?.message ?? e).slice(0, 90) }, at: new Date().toISOString() });
    }
  }
  // A BLOCKED SEARCH IS NOT AN EMPTY SEARCH. Caching a refusal as `[]` would
  // make "every face refused us" indistinguishable from "the web has
  // nothing", and would keep the lie for every later run — the exact
  // distinction web.js's parseSearchResults exists to preserve. So a search
  // no face answered is recorded as a typed gap and NOT cached.
  crossings.push({ act: "search", q, gap: { type: "refused-upstream", detail: tried.join(", ") }, at: new Date().toISOString() });
  return [];
}

async function fetchFace(url, archiveUrl) {
  const key = sha16(url);
  if (index[key]) {
    const e = index[key];
    if (e.gap) return { gap: e.gap };
    facesFromCache += 1;
    const rawPath = `${FACES}/${key}.raw`;
    return { text: readFileSync(`${FACES}/${key}.txt`, "utf8"), raw: existsSync(rawPath) ? readFileSync(rawPath, "utf8") : "", url: e.finalUrl, host: e.host, title: e.title, path: `research-faces/${key}.txt`, rawPath: `research-faces/${key}.raw`, retrievedAt: e.retrievedAt, chars: e.chars };
  }
  if (OFFLINE) return { gap: { type: "offline", detail: "face not kept and OFFLINE=1" } };
  if (fetchesSpent >= MAXTRY) return { gap: { type: "budget", detail: `${MAXTRY} fetch attempt(s) spent` } };
  const tryOne = async (u) => {
    try {
      fetchesSpent += 1;
      const res = await fetch(u, { headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5" }, redirect: "follow", signal: AbortSignal.timeout(30000) });
      const ct = res.headers.get("content-type") ?? "";
      const buf = Buffer.from(await res.arrayBuffer());
      if (!res.ok) return { gap: { type: "http", status: res.status } };
      if (buf.length > 6_000_000) return { gap: { type: "censored-above", detail: `${buf.length} bytes` } };
      if (/html|xml/i.test(ct)) { const raw = buf.toString("utf8"); const f = extractReadable(raw); return { text: f.text, raw, title: f.title, finalUrl: res.url || u }; }
      if (/text\//i.test(ct)) { const raw = buf.toString("utf8"); return { text: raw, raw, finalUrl: res.url || u }; }
      return { gap: { type: "beyond-reach", detail: `no text face (${ct || "unknown type"})` } };
    } catch (e) { return { gap: { type: "unreachable", detail: String(e?.message ?? e).slice(0, 120) } }; }
  };
  let got = await tryOne(url);
  let viaArchive = false;
  // The archive is a route, and a route can be measured closed. web.archive.org's
  // replay path answers 403 to this environment even for URLs its own
  // availability API reports as archived (probed live). After
  // ARCHIVE_PROBE_LIMIT consecutive refusals the route is closed for the rest
  // of the run rather than spending a fetch per blocked page on it — the
  // closure is recorded once, so a reader sees a measured route, not silence.
  if (got.gap && archiveUrl && !archiveClosed) {
    const viaArc = await tryOne(archiveUrl);
    viaArchive = true;
    if (viaArc.gap) {
      archiveRefusals += 1;
      if (archiveRefusals >= ARCHIVE_PROBE_LIMIT) {
        archiveClosed = true;
        crossings.push({ act: "route", url: "web.archive.org replay", gap: { type: "archive-route-closed", detail: `${archiveRefusals} consecutive refusals; no further archive fetches attempted this run` }, at: new Date().toISOString() });
      }
    } else { archiveRefusals = 0; got = viaArc; }
  }
  const host = (() => { try { return new URL(got.finalUrl ?? url).hostname.replace(/^www\./, ""); } catch { return hostOf(url); } })();
  const at = new Date().toISOString();
  if (got.gap) {
    index[key] = { url, gap: got.gap, viaArchive, at };
    writeFileSync(INDEX, JSON.stringify(index, null, 1));
    crossings.push({ act: "fetch", url, host, gap: got.gap, at });
    return { gap: got.gap };
  }
  if (!got.text || got.text.trim().length < MIN_FACE_CHARS) {
    index[key] = { url, gap: { type: "shell", detail: `${(got.text ?? "").length}-char face, under the declared ${MIN_FACE_CHARS}-char floor` }, at };
    writeFileSync(INDEX, JSON.stringify(index, null, 1));
    crossings.push({ act: "fetch", url, host, gap: index[key].gap, at });
    return { gap: index[key].gap };
  }
  writeFileSync(`${FACES}/${key}.txt`, got.text);
  if (got.raw) writeFileSync(`${FACES}/${key}.raw`, got.raw);
  index[key] = { url, finalUrl: got.finalUrl ?? url, host, title: got.title ?? null, chars: got.text.length, rawChars: (got.raw ?? "").length, viaArchive, retrievedAt: at };
  writeFileSync(INDEX, JSON.stringify(index, null, 1));
  crossings.push({ act: "fetch", url, host, chars: got.text.length, title: got.title ?? null, at });
  return { text: got.text, raw: got.raw ?? "", url: got.finalUrl ?? url, host, title: got.title ?? null, path: `research-faces/${key}.txt`, rawPath: `research-faces/${key}.raw`, retrievedAt: at, chars: got.text.length };
}

// ── the model: POINT-only, and every call recorded ────────────────────────
// The model is never asked to write anything that reaches the document. It
// is handed a numbered list of sentences the material already contains and
// asked for an index. MODEL_LOG keeps every call so §7 can print the whole
// of its contribution.
let modelCalls = 0, modelMs = 0;
let MODEL_PHASE = "read";
const MODEL_LOG = [];
const chat = async (messages, schema, numPredict = 220) => {
  const t = Date.now();
  modelCalls += 1;
  const asked = String(messages?.[messages.length - 1]?.content ?? "");
  let out = "", gap = null;
  try {
    const res = await fetch(`${OLLAMA}/api/chat`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, stream: false, ...(schema ? { format: schema } : {}), options: { num_predict: numPredict, temperature: 0 }, messages }),
      signal: AbortSignal.timeout(240000),
    });
    if (!res.ok) throw new Error(`ollama ${res.status}`);
    out = (await res.json())?.message?.content ?? "";
  } catch (e) { gap = String(e?.message ?? e).slice(0, 90); }
  const ms = Date.now() - t;
  modelMs += ms;
  MODEL_LOG.push({ n: modelCalls, phase: MODEL_PHASE, protocol: schema === T.SELECT_SCHEMA ? "select (point at an index)" : schema === T.WITNESS_SCHEMA ? "witness (yes/no + the words it read)" : "other", askedChars: asked.length, answer: String(out).slice(0, 200), ms, gap });
  if (gap) throw new Error(gap);
  return out;
};
const ask = async (s, sl) => T.readTestimony(await chat(T.buildWitnessMessages(s, sl), T.WITNESS_SCHEMA));
const selectAsk = async (messages) => { try { return JSON.parse(await chat(messages, T.SELECT_SCHEMA)); } catch { return {}; } };
const testimony = { witnessSlice: T.witnessSlice, siblingSwap: T.siblingSwap, foldTestimony: T.foldTestimony, buildSelectMessages: T.buildSelectMessages, foldSelect: T.foldSelect };

const say = (s) => { process.stdout.write(s + "\n"); };

// The anchor: the declared task's own content words, through the fold's one
// tokenizer so both sides fold identically (P11).
const ANCHOR = new Set(tokenize(TASK));
const anchorHits = (note) => {
  const ends = `${note?.end1 ?? ""} ${note?.end2 ?? ""}`;
  return new Set(tokenize(ends).filter((t) => ANCHOR.has(t))).size;
};
const onAnchor = (note) => anchorHits(note) >= ANCHOR_MIN;

// ── THE SUBJECT HAS NAMES, AND THE MATERIAL TEACHES THE REST OF THEM ──────
//
// Measured, and this is why any of it exists: asked about a downtown
// improvement organisation, a feed face answered with an encyclopedia's
// general article on the common noun "downtown", which shares several
// content words with the declared question and, uncaught, would have
// contributed a large share of a run's propositions with none of them
// about the actual subject. Word overlap cannot tell a named organisation
// from a common noun. A NAME can — so a fetched page that never says one
// of the subject's names is kept, addressable, and not read.
//
// The names the question itself gives are read off it mechanically (its own
// maximal capitalised runs — that is reading the declared question, not a
// rule about the world). But real prose calls things by short forms, and
// the fold's own alias organ has a measured hole exactly there:
//
//   namesCorefer("Regional Transit Authority", "Transit Authority") -> true
//   namesCorefer("RTA", "Regional Transit Authority")                -> false
//
// The fix is NOT a rule that builds an initialism and compares it: a rule
// that derives a name is a rule that can invent one. The material declares
// its own short forms, at addresses — "the Regional Transit
// Authority (RTA)", "the Central Zoning Board (CZB)" — so the
// fold LEARNS the rest of the subject's names by reading them, walled by
// use (organs/aliases.js: a gloss the text never uses again is an aside,
// not a name) and carrying the byte span that declared each one. An
// initialism is one subtype of alias and nothing here knows what an
// acronym is.
const NAME_RUN_RE = /\b(?:[A-Z][\w'’-]*)(?:\s+(?:[A-Z][\w'’-]*|of|the|and|for))*\s+[A-Z][\w'’-]*\b/g;
const GIVEN_NAMES = [...new Set((TASK.match(NAME_RUN_RE) ?? []).map((r) => r.trim()))];
const LEARNED = [];                       // {alias, full, ref, start, end, sentence}
const foldPhrase = (t) => String(t ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
let foldedNames = GIVEN_NAMES.map(foldPhrase).filter(Boolean);
const namesSubject = (text) => { const f = ` ${foldPhrase(text)} `; return foldedNames.some((n) => n && f.includes(` ${n} `)); };

/** Learn the subject's other names from a page that already names it. */
function learnAliasesFrom(pg) {
  if (!ALIAS_SHAPES.length) return;
  const { aliases } = declaredAliases(pg.text, { splitSentences: sentencesWithOffsets, minUses: ALIAS_MIN_USES, shapes: ALIAS_SHAPES });
  for (const a of aliases) {
    // Only names for THIS subject: the gloss must gloss something the fold
    // already knows the subject is called. A page may declare many
    // abbreviations; the fold adopts the ones about its own subject.
    if (!namesSubject(a.full)) continue;
    const already = foldedNames.includes(foldPhrase(a.alias));
    LEARNED.push({ ...a, ref: pg.ref, already });
    if (!already) foldedNames = [...foldedNames, foldPhrase(a.alias)];
  }
}

// A RESULT MUST CARRY THE QUESTION BEFORE IT IS WORTH A FETCH.
//
// Measured, and this rule exists because of it: asked for a second source
// for a proposition naming a real board member and a real budget vote, the
// feed face answered with a car dealership, an unrelated coding algorithm
// sharing the member's surname, and a distant lawmaker; asked about a
// downtown building closed by a fire, it answered with an unrelated small
// town sharing one word with the question. A search engine answers a
// STRING; the fold asked a QUESTION. So a result earns a fetch only if its
// own title and snippet already carry a declared share of the question's
// content words — the same containment fold (grounding.js's wordSet/hasWord)
// the snipping and the corroboration walk use, applied one step earlier,
// before any bytes are spent. A search where nothing clears the floor found
// nothing FOR THIS QUESTION, and says so.
const contentWordsOf = (text) => [...new Set(tokenize(String(text ?? "")))].filter((t) => !CLAIM_STOPWORDS.has(t) && t.length > 2);
function carries(question, result, floor) {
  const want = contentWordsOf(question);
  if (!want.length) return { ok: true, share: 1, want: 0 };
  const have = wordSet(`${result?.title ?? ""} ${result?.snippet ?? ""}`);
  const hit = want.filter((t) => hasWord(have, t)).length;
  return { ok: hit / want.length >= floor, share: hit / want.length, want: want.length, hit };
}

// ═══ PHASE 1 — SURF ═══════════════════════════════════════════════════════
const t0 = Date.now();
say(`# the fold surfs — task: ${JSON.stringify(TASK)}`);
const opening = preflightQuery(TASK, "");
say(`  opening query (proof.js::preflightQuery): ${JSON.stringify(opening)}`);

const pages = [];      // {ref, url, host, title, text, path, retrievedAt, chars, viaQuery}
const seenUrl = new Set();
// Queries this RUN has already gathered. The searches.json cache is there to
// stop a second network call for the same question; skipping a query because
// it is CACHED would make a warm run read nothing at all — measured, and it
// silently cost a whole expansion round.
const askedQuery = new Set();
const queriesSpent = [];

async function gather(q, why, question = q, floor = PREFLIGHT_OVERLAP) {
  const results = await search(q);
  queriesSpent.push({ q, why, found: results.length });
  say(`  search [${why}] ${JSON.stringify(q)} → ${results.length} result(s)`);
  let offQuestion = 0;
  for (const r of results) {
    if (pages.length >= MAXF || fetchesSpent >= MAXTRY) break;
    if (!r.url || seenUrl.has(r.url)) continue;
    const c = carries(question, r, floor);
    if (!c.ok) { offQuestion += 1; continue; }
    seenUrl.add(r.url);
    const face = await fetchFace(r.url, R.archiveAddressFor(r.url));
    if (face.gap) { say(`    ✗ ${r.host} — ${face.gap.type}${face.gap.status ? " " + face.gap.status : ""}`); continue; }
    const ref = `${face.host}-${sha16(r.url).slice(0, 6)}.txt`;
    pages.push({ ref, url: face.url ?? r.url, host: face.host, title: face.title ?? r.title, text: face.text, raw: face.raw ?? "", path: face.path, rawPath: face.rawPath, retrievedAt: face.retrievedAt, chars: face.chars, viaQuery: q });
    say(`    ✓ ${face.host} — ${String(face.title ?? r.title ?? "").slice(0, 64)} (${face.chars} chars)`);
  }
  if (offQuestion) say(`    · ${offQuestion} result(s) did not carry the question (under the declared ${Math.round(floor * 100)}% floor) — no bytes spent`);
}

askedQuery.add(opening);
await gather(opening, "preflight");

// ═══ PHASE 2 — READ ═══════════════════════════════════════════════════════
let log = hl.createHyperlexicon({
  frame: { reader: "makeRelationReader", walls: true, posPrior: "POSPrior@1", priors: ["determiners", "negation", "pronouns"], agent: R.RANKE, recipe: RECIPE, model: MODEL, task: TASK },
});
const passagesOf = new Map();  // ref -> passages
let heard = 0, turnedAway = 0;

// ref -> [{s, o, sFace, oFace}] — every BOUND edge this run read from that
// page, carrying the reader's own resolved referent face when it found
// one. This is S62's own selector, kept per source so the corroboration
// walk can ask "does this page's READING reach these two ends" instead of
// "do these two words sit near each other in its raw bytes" — see
// corroboration.js::facesReachable for the measured reason the two
// questions disagree.
const edgesWithFacesOf = new Map();

function readPage(pg) {
  const passages = chunkSource(pg.ref, pg.text, { blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }) });
  passagesOf.set(pg.ref, passages);
  const rel = reader(passages, { pool: passages });
  let admitted = 0;
  const faceEdges = edgesWithFacesOf.get(pg.ref) ?? [];
  for (const p of passages) {
    const claims = (rel.read(String(p.text ?? ""))?.claims ?? []).filter((c) => c.verdict === "bound");
    for (const c of claims) faceEdges.push({ s: c.end1, o: c.end2, sFace: c.end1Face ?? null, oFace: c.end2Face ?? null });
    const edges = claims.map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
    if (!edges.length) continue;
    const r = hl.admit(log, edges, { witness: `${pg.ref}~${RECIPE}` });
    log = r.log; heard += r.heard.length; admitted += r.heard.length;
    turnedAway += (r.turnedAway ?? []).length;
  }
  edgesWithFacesOf.set(pg.ref, faceEdges);
  return { passages: passages.length, admitted };
}

say(`\n# the fold reads`);
say(`  names the question gives: ${GIVEN_NAMES.map((n) => JSON.stringify(n)).join(", ")}`);
const notAboutSubject = [];
function readIfAboutSubject(pg) {
  if (!namesSubject(pg.text)) {
    notAboutSubject.push(pg);
    passagesOf.set(pg.ref, []);   // kept on disk, addressable, and not read
    say(`  ${pg.ref}: never names the subject — kept, not read`);
    return;
  }
  const r = readPage(pg);
  learnAliasesFrom(pg);
  say(`  ${pg.ref}: ${r.passages} passage(s) → ${r.admitted} note(s) heard`);
}
for (const pg of pages) readIfAboutSubject(pg);
if (LEARNED.length) {
  const fresh = LEARNED.filter((a) => !a.already);
  say(`  names the material taught it: ${fresh.length ? fresh.map((a) => `${JSON.stringify(a.alias)} (from "${a.full}", ${a.ref}#${a.start}-${a.end}, used ${a.uses}x)`).join("; ") : "none beyond what the question gave"}`);
}

// ═══ PHASE 1b — THE FOLD EXPANDS FROM ITS OWN READING ═════════════════════
// A note standing on one source poses exactly one question: does anyone
// else say this? proofQuery over claimOfNote is the fold asking it.
say(`\n# the fold follows its own thin notes`);
let fold0 = hl.foldWithStanding(log);
const thinAll = fold0.filter((n) => T.distinctSources(n.witnesses).size < 2);
const offAnchor = thinAll.filter((n) => !onAnchor(n)).length;
const tooLong = thinAll.filter((n) => onAnchor(n) && (String(n.end1).length > MAX_END_CHARS || String(n.end2).length > MAX_END_CHARS)).length;
const thin = thinAll
  .filter((n) => onAnchor(n))
  .filter((n) => String(n.end1).length <= MAX_END_CHARS && String(n.end2).length <= MAX_END_CHARS)
  .sort((a, b) => (b.spans?.length ?? 0) - (a.spans?.length ?? 0));
say(`  ${thinAll.length} thin note(s): ${offAnchor} off-anchor (heard and kept, not chased), ${tooLong} with an end past ${MAX_END_CHARS} chars (subject-span debris), ${thin.length} followed`);
for (const note of thin) {
  if (searchesSpent >= MAXQ || pages.length >= MAXF || fetchesSpent >= MAXTRY) break;
  const claim = R.claimOfNote(note);
  if (!claim) continue;
  const q = proofQuery(claim);
  if (!q || askedQuery.has(q)) continue;
  askedQuery.add(q);
  await gather(q, `second source for: ${claim.text}`.slice(0, 110), claim.text, SECOND_SOURCE_OVERLAP);
}
// read anything the first expansion brought back
for (const pg of pages) { if (passagesOf.has(pg.ref)) continue; readIfAboutSubject(pg); }

// ── the fold asks about the names its own reading named ──────────────────
// "Does anyone else state this sentence?" is one question a thin note poses.
// The other is broader and the one a researcher actually asks next: the
// reading has NAMED people and bodies, and each of them is a thread. The
// query is built by the fold's own organ, not by a template here —
// preflightQuery(name, TASK) takes a name (at or under its own
// PREFLIGHT_FEW_WORDS floor) and joins the run's declared subject to it,
// which is precisely the documented behaviour of its `pointsBack ||
// taskWords.length <= PREFLIGHT_FEW_WORDS` branch.
say(`\n# the fold asks about the names its own reading named`);
// Round on round, not one pass: reading a page names people and bodies the
// last page never mentioned, and each of those is a thread. The loop stops
// when a round names nothing new or the declared budgets are spent — the
// fold decides when it has followed enough, within what it was given.
const askedThread = new Set();
for (let round = 1; round <= NAME_ROUNDS; round += 1) {
  if (searchesSpent >= MAXQ || pages.length >= MAXF || fetchesSpent >= MAXTRY) break;
  const named = new Map();
  for (const n of hl.foldWithStanding(log)) {
    if (!onAnchor(n)) continue;
    for (const end of [n.end1, n.end2]) {
      const e = String(end ?? "").trim();
      const words = e.split(/\s+/).filter(Boolean);
      if (!words.length || words.length > 4 || e.length > MAX_END_CHARS) continue;
      if (!/[A-Z]/.test(e)) continue;                 // a name wears a capital; L2's own veto shape, used to NOMINATE only
      named.set(e, (named.get(e) ?? 0) + 1);
    }
  }
  const threads = [...named.entries()].sort((a, b) => b[1] - a[1]).map(([e]) => e).filter((e) => !askedThread.has(e));
  if (!threads.length) { say(`  round ${round}: no new name to follow`); break; }
  say(`  round ${round}: ${threads.length} new name(s) — ${threads.slice(0, 10).join(" · ")}`);
  for (const name of threads) {
    if (searchesSpent >= MAXQ || pages.length >= MAXF || fetchesSpent >= MAXTRY) break;
    askedThread.add(name);
    const q = preflightQuery(name, TASK);
    if (!q || askedQuery.has(q)) continue;
    askedQuery.add(q);
    await gather(q, `the thread named: ${name}`, `${name} ${TASK}`, PREFLIGHT_OVERLAP);
  }
  let fresh = 0;
  for (const pg of pages) { if (passagesOf.has(pg.ref)) continue; readIfAboutSubject(pg); fresh += 1; }
  if (!fresh) { say(`  round ${round}: nothing new was read`); break; }
}
const learnedFresh = LEARNED.filter((a) => !a.already);
if (learnedFresh.length) say(`  names the material has taught it so far: ${learnedFresh.map((a) => JSON.stringify(a.alias)).join(", ")}`);

const before = hl.foldWithStanding(log);
say(`\nledger: ${before.length} note(s) (${heard} heard, ${turnedAway} turned away at the door) from ${pages.length} page(s) in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

// ═══ PHASE 3 — SNIP ═══════════════════════════════════════════════════════
// Every note, back to the bytes of every page that witnessed it.
say(`\n# the fold snips`);
const textOf = new Map(pages.map((p) => [p.ref, p.text]));
const pageOf = new Map(pages.map((p) => [p.ref, p]));
const snipsOf = new Map();  // note key -> [{ref, host, url, text, start, end}]
let snipCount = 0, snipVerified = 0;
for (const note of before) {
  const claim = R.claimOfNote(note);
  if (!claim) continue;
  const out = [];
  for (const w of note.witnesses ?? []) {
    const ref = T.sourceOfWitness(w);
    const face = textOf.get(ref);
    if (!face) continue;
    const pg = pageOf.get(ref);
    for (const s of snipClaim(claim, face, { facePath: pg?.path, url: pg?.url, host: pg?.host })) {
      snipCount += 1;
      // P5.2 — the address is re-read from the kept face before it is kept.
      if (face.slice(s.start, s.end) === s.text) { snipVerified += 1; out.push({ ...s, ref }); }
    }
  }
  if (out.length) snipsOf.set(`${note.end1}|${note.label}|${note.end2}`, out);
}
say(`  ${snipCount} snip(s) over ${snipsOf.size} note(s); ${snipVerified}/${snipCount} addresses read back from the kept bytes`);

// ═══ PHASE 5 — CHASE (Ranke) ══════════════════════════════════════════════
MODEL_PHASE = "chase (Ranke)";
say(`\n# the fold chases its accounts to what they cite`);
// Ranke reads its leads off the RAW bytes (a page's own outbound links and
// its unsourced quotations), and its containment off the text face.
const chasePages = pages.map((p) => ({ ref: p.ref, url: p.url, host: p.host, html: p.raw || p.text, text: p.text, title: p.title }));
const witness = { ask, selectAsk, testimony, splitSentences };
// The chase is budget, so the same declared spending rule applies: it runs
// over a ledger scoped to the subject the frame declared, and any primary
// witness it lands is carried back onto the working ledger through the same
// door (hear() unions witnesses, so this adds testimony and rewrites none).
let chase = null;
try {
  const anchoredNotes = hl.foldWithStanding(log).filter(onAnchor);
  let scoped = hl.createHyperlexicon({ frame: { reader: "makeRelationReader", scopedTo: "declared subject", recipe: RECIPE } });
  for (const n of anchoredNotes) {
    for (const wit of n.witnesses ?? []) {
      const r = hl.admit(scoped, [{ subject: n.end1, verb: n.label, object: n.end2, spans: n.spans ?? [] }], { witness: wit });
      scoped = r.log;
    }
  }
  say(`  chasing ${anchoredNotes.length} on-subject note(s) of ${hl.foldWithStanding(log).length}`);
  chase = await R.chaseLedger(scoped, hl, chasePages, { fetchFace, search, maxFetches: CHASE_F, maxSearches: CHASE_S, consult: 3, recipe: RECIPE, witness });
  // carry any primary witness back onto the working ledger
  let carried = 0;
  for (const n of hl.foldWithStanding(chase.log)) {
    for (const wit of n.witnesses ?? []) {
      if (T.kindOfWitness(wit) !== R.PRIMARY_KIND) continue;
      const r = hl.admit(log, [{ subject: n.end1, verb: n.label, object: n.end2, spans: n.spans ?? [] }], { witness: wit });
      log = r.log; carried += 1;
    }
  }
  if (carried) say(`  carried ${carried} primary witness(es) back onto the working ledger`);
  say(`  ${chase.notesConsidered} note(s) chased · ${chase.fetches} fetch(es) · ${chase.searches} search(es) · ${chase.leads} containment lead(s)`);
} catch (e) { say(`  chase gap: ${String(e?.message ?? e).slice(0, 160)}`); }

// ═══ PHASE 6 — CORROBORATE, WITH ITS CONTROL ══════════════════════════════
MODEL_PHASE = "corroboration walk";
// S62: literal co-presence (the default admission gate) measured
// indistinguishable from a redealt null at the level a walk actually
// spends its budget (p ≈ 0.905); the reader's own resolved referent face
// is the one selector measured to separate (p ≈ 0.048). SELECTOR=
// referent-face swaps it in for BOTH arms — the same budget, the same
// protocol, only which pairs are ever offered to the model changes.
const SELECTOR = process.env.SELECTOR === "referent-face" ? "referent-face" : "copresence";
const reachableFn = SELECTOR === "referent-face"
  ? (ref, ends) => T.corroboration.facesReachable(edgesWithFacesOf.get(ref) ?? [], ends)
  : null;
say(`\n# the fold corroborates (and runs the redeal control in the same breath)`);
say(`  selector: ${SELECTOR}${SELECTOR === "referent-face" ? " (S62 — literal co-presence measured dead at note-level, p\u22480.905; this separates, p\u22480.048)" : ""}`);
const sources = pages.map((p) => ({ ref: p.ref, text: p.text }));
// Two hosts carrying one wire story are one perspective. corroboration.js's
// own sharedTextGroups says which of these pages are the same text, and its
// groupOf is threaded through every distinct-source count from here on, so a
// syndicated copy can never look like a second witness.
const shared = T.corroboration.sharedTextGroups(sources, { minSentenceLength: SHARED_SENTENCE_CHARS, minShared: SHARED_SENTENCES_MIN, splitSentences });
const GROUP = { groupOf: shared.groupOf };
if (shared.collapsed) say(`  shared text: ${shared.collapsed} page(s) collapse into another — counted once, not twice`);
const gateOf = (l) => hl.foldWithStanding(l).filter((n) => T.distinctSources(n.witnesses, GROUP).size >= 2).length;
const gateBefore = gateOf(log);
let walk = null;
try {
  walk = await T.corroborateLedger(log, hl, sources, { ask, selectAsk, splitSentences, testimony, maxAsks: WALK_ASKS, reachable: reachableFn });
  log = walk.log;
  say(`  REAL: ${walk.candidatePairs ?? "?"} candidate pair(s) proposed → ${walk.asks} ask(s) spent (${walk.skippedNoCopresence ?? 0} refused before any ask) · attested ${walk.attested.length} · contradicted ${walk.contradicted.length} · refusals ${JSON.stringify(walk.refusals)}`);
  say(`  notes at >=2 distinct sources: ${gateBefore} → ${gateOf(log)}`);
} catch (e) { say(`  walk gap: ${String(e?.message ?? e).slice(0, 160)}`); }

// THE CONTROL (II.23), BUILT SO THE MODEL ACTUALLY SEES IT.
//
// The first version of this control rotated each note's object to the next
// note's and measured 0 asks: every rotated proposition was refused by the
// mechanical co-presence gate before a single model call, because a
// rotated object almost never appears near its new subject in any page.
// That is a real result about the gate and NO TEST OF THE MODEL AT ALL —
// an arm that always refuses is not an arm, it is a rubber stamp
// (`competingFiller`'s own header learned the same lesson from the other
// direction).
//
// So the redeal is built to SURVIVE the gate: each note keeps its own
// subject and takes a DIFFERENT object drawn from this material's own
// other objects, chosen so that (a) it shares no content word with the
// true object — otherwise it is not a redeal — and (b) it genuinely
// co-occurs with the subject somewhere in the read pages, measured with
// `endsCopresentWindow`, the walk's own gate. The result is a false
// proposition the material makes PLAUSIBLE, offered to the model under the
// identical protocol and budget. If the model attests these at the real
// ledger's rate, the walk is measuring topic overlap and nothing in §3 may
// be read as corroboration.
MODEL_PHASE = "control (redealt, gate-surviving)";
let control = null, controlBuilt = 0, controlUnbuildable = 0;
try {
  const real = hl.foldWithStanding(log);
  const objects = [...new Set(real.map((n) => String(n.end2 ?? "").trim()).filter(Boolean))];
  const wordsOf = (t) => T.textFeatures(t);
  const shares = (a, b) => { const fb = wordsOf(b); return [...wordsOf(a)].some((w) => fb.has(w)); };
  let rl = hl.createHyperlexicon({ frame: { reader: "makeRelationReader", redealt: "gate-surviving", recipe: `${RECIPE}-control` } });
  // A redealt note needs a REAL ADDRESS, and the door is right to insist:
  // it refuses an unaddressed edge outright ("no addressed span backs it"),
  // which is how the first version of this arm silently built an empty
  // ledger and reported 0 asks. The honest address for a false proposition
  // is the very window that makes it plausible — the stretch of a real page
  // where both of its ends co-occur, found by the walk's own
  // `endsCopresentWindow` and carried with the page's own byte offsets.
  // It asserts nothing; it is where a careless reader would look.
  let turnedAwayInControl = 0;
  for (const n of real) {
    let swap = null, window = null, at = null;
    for (const o of objects) {
      if (o === String(n.end2).trim() || shares(o, n.end2) || shares(o, n.end1)) continue;
      for (const src of sources) {
        const win = T.endsCopresentWindow(src.text, { end1: n.end1, end2: o });
        if (win) { swap = o; window = win; at = src.ref; break; }
      }
      if (swap) break;
    }
    if (!swap) { controlUnbuildable += 1; continue; }
    const spans = [{ ref: `${at}#${window.start}-${window.end}`, start: 0, end: window.text.length, text: window.text }];
    const r = hl.admit(rl, [{ subject: n.end1, verb: n.label, object: swap, spans }], { witness: `${at}~${RECIPE}-control` });
    rl = r.log;
    if (r.heard?.length) controlBuilt += 1; else turnedAwayInControl += (r.turnedAway ?? []).length;
  }
  if (turnedAwayInControl) say(`  control: ${turnedAwayInControl} redealt edge(s) turned away at the door`);
  say(`  control: ${controlBuilt} redealt proposition(s) survive the co-presence gate, ${controlUnbuildable} could not be built`);
  control = await T.corroborateLedger(rl, hl, sources, { ask, selectAsk, splitSentences, testimony, maxAsks: WALK_ASKS, reachable: reachableFn });
  say(`  CONTROL (redealt): ${control.asks} ask(s) · attested ${control.attested.length} · contradicted ${control.contradicted.length} · skipped-no-copresence ${control.skippedNoCopresence ?? 0}`);
} catch (e) { say(`  control gap: ${String(e?.message ?? e).slice(0, 160)}`); }

// ═══ PHASE 7 — COMPOSE, MODEL-FREE, AND WRITE ════════════════════════════
// Nothing below calls the model. crown.js assembles each sentence from the
// claim's own words, the source's own name, and a closed connective
// vocabulary; compose.js joins them under a DECLARED order. Every rendered
// sentence is followed by the page's own bytes that state it.
const { renderCrown } = await import(`${THE_FOLD_DIR}/crown.js`);
const { compose, coverageLine } = await import(`${THE_FOLD_DIR}/compose.js`);
const { mergeTestimony } = await import(`${NATIVE}/organs/capacity-runner.js`);

const after = hl.foldWithStanding(log);
const keyOf = (n) => `${n.end1}|${n.label}|${n.end2}`;

// One reading per source that witnessed the note. `read` carries the real
// addresses the snip verified — a hold that read nothing is not countable
// corroboration (floor 4½'s wall), so a note with no verified span cannot
// inflate a standing here.
// What the corroboration walk attested, keyed so composition can find it.
// The walk exists to reach the propositions CONTAINMENT CANNOT — a page
// that states a fact in other words carries none of its literal tokens —
// so a composition that accepted only snips would silently discard exactly
// the evidence the walk was spent to get. Both kinds of reading count, and
// each says which kind it is.
const attestedBy = new Map();
for (const a of walk?.attested ?? []) attestedBy.set(`${a.note?.id}\u0000${a.source}`, a.because);

function readingsFor(note) {
  const snips = snipsOf.get(keyOf(note)) ?? [];
  const byRef = new Map();
  for (const s of snips) { if (!byRef.has(s.ref)) byRef.set(s.ref, []); byRef.get(s.ref).push(s); }
  const out = [];
  for (const w of note.witnesses ?? []) {
    const ref = T.sourceOfWitness(w);
    const pg = pageOf.get(ref);
    if (!pg) continue;
    const groupRef = GROUP.groupOf?.get(ref) ?? ref;
    const groupPg = pageOf.get(groupRef);
    let addresses = (byRef.get(ref) ?? []).map((x) => `${ref}#${x.start}-${x.end}`);
    let how = "stated in the page's own words, found by containment";
    let deciders = (byRef.get(ref) ?? []).map((x) => x.text);
    if (!addresses.length) {
      // The walk's own attestation: the model pointed at a sentence of THIS
      // page and the fold kept that sentence, not the model's words. Its
      // address is located in the page's bytes and verified before use.
      const because = attestedBy.get(`${note.id}\u0000${ref}`);
      if (!because) continue;
      const at = pg.text.indexOf(because);
      if (at < 0 || pg.text.slice(at, at + because.length) !== because) continue;
      addresses = [`${ref}#${at}-${at + because.length}`];
      deciders = [because];
      how = "attested by the witness against this page, which states it in other words";
    }
    out.push({
      claim_id: keyOf(note),
      who: groupPg?.host ?? pg?.host ?? ref,
      read: addresses,
      verdict: "holds",
      how, deciders, ref,
      edges: [{ subject: note.end1, verb: note.label, object: note.end2, refs: addresses }],
      corroboration: { passages: addresses.length, sources: 1 },
      emitted_by: RECIPE,
    });
  }
  // one reading per GROUP, never per copy
  const byGroup = new Map();
  for (const r of out) { const g = GROUP.groupOf?.get(String(r.read[0]).split("#")[0]) ?? r.who; if (!byGroup.has(g)) byGroup.set(g, r); }
  return [...byGroup.values()];
}

const items = [];
for (const note of after) {
  const readings = readingsFor(note);
  if (!readings.length) continue;
  const merged = mergeTestimony(readings);
  items.push({ claim: { id: keyOf(note), end1: note.end1, label: note.label, end2: note.end2, note, subject: note.end1 }, merged, anchored: onAnchor(note) });
}
// THE DECLARED ORDER (compose refuses to order anything it was not told how
// to order): corroborated before single, then by how many verified spans
// stand behind it, then alphabetically by first end so the sequence is
// reproducible rather than incidental.
const orderBy = (a, b) => {
  if (!!b.anchored !== !!a.anchored) return a.anchored ? -1 : 1;
  const st = (x) => (x.merged?.standing === "corroborated" ? 0 : 1);
  if (st(a) !== st(b)) return st(a) - st(b);
  const ev = (x) => (snipsOf.get(x.claim.id) ?? []).length;
  if (ev(a) !== ev(b)) return ev(b) - ev(a);
  return String(a.claim.end1).localeCompare(String(b.claim.end1));
};

const bySource = new Map();
for (const it of items) {
  for (const r of [...(it.merged.holds ?? []), ...(it.merged.refused ?? [])]) {
    const ref = String(r.read?.[0] ?? "").split("#")[0];
    if (!ref) continue;
    if (!bySource.has(ref)) bySource.set(ref, []);
    bySource.get(ref).push(it);
  }
}

const secs = ((Date.now() - t0) / 1000).toFixed(0);
const L = [];
const w = (s = "") => L.push(s);
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|");

w(`# ${esc(TASK)}\n\n## What the record states, and who states it`);
w();
w(`*Assembled by the fold on ${new Date().toISOString().slice(0, 10)}. Every sentence below is either a page's own bytes at an address that reads back, a sentence assembled by template from a claim's own words and its source's name, or a count. Nothing here is a claim about what is true — it is a ledger of what is stated, and by whom.*`);
w();

w(`## 0 — How little the model did`);
w();
w(`| | |`);
w(`|---|---|`);
w(`| model | \`${MODEL}\`, local, temperature 0 |`);
w(`| calls | **${modelCalls}** — ${(modelMs / 1000).toFixed(0)}s of a ${secs}s run |`);
w(`| what it was allowed to do | point at one sentence, by index, from a list the material already contained |`);
w(`| what it wrote into this document | **nothing** — no sentence below came out of the model |`);
w(`| who chose the searches | \`proof.js::preflightQuery\` over the declared task, then \`proofQuery(claimOfNote(n))\` over the ledger's own thin notes |`);
w(`| who extracted the claims | \`makeRelationReader\` — POS grammar gate (POSPrior@1), determiners and negation words injected, pronoun subjects resolved, whole-page furniture blanked |`);
w(`| who found the verbatim spans | \`primary.js::snipClaim\`, addresses re-read from the kept bytes before printing |`);
w(`| who wrote the prose | \`crown.js::renderCrown\` (template only; no free-text step) joined by \`compose.js\` under a declared order |`);
w(`| names the question gave | ${GIVEN_NAMES.map((n) => `\`${n}\``).join(", ")} — maximal capitalised runs of the declared question |`);
w(`| alias shapes | ${ALIAS_SHAPES.length ? ALIAS_SHAPES.map((x) => `\`${x.id}\` (${x.evidence.confirmed}/${x.evidence.fires} confirmed in the corpus = ${x.evidence.confirm_rate})`).join(", ") : "none"} — received from live_priors' \`${ALIAS_PRIOR?.schema ?? "(absent)"}\`, which MEASURED which shapes English prose uses to introduce a short form; the floors (${ALIAS_MIN_CONFIRM} confirm rate, ${ALIAS_MIN_FIRES} fires) are this run's own declaration |`);
w(`| names the MATERIAL taught it | ${LEARNED.filter((a) => !a.already).length ? LEARNED.filter((a) => !a.already).map((a) => `\`${a.alias}\` (declared by \`${a.ref}#${a.start}-${a.end}\` as "${esc(a.full)}", used ${a.uses}x)`).join("; ") : "none — the pages read used only the names the question already gave"} — read by \`organs/aliases.js\` from the material's own glosses, walled by use; no rule about acronyms exists anywhere in this run |`);
w(`| the subject-name gate | **a fetched page that never says one of the subject's names is kept and addressable but not read into the ledger**${notAboutSubject.length ? `, which is what happened to ${notAboutSubject.length} page(s)` : ""} |`);
w(`| syndication | \`corroboration.js::sharedTextGroups\` — ${shared.collapsed} of ${pages.length} page(s) share ${SHARED_SENTENCES_MIN}+ sentences of ${SHARED_SENTENCE_CHARS}+ chars with another and are counted once, closing the residue proof.js discloses and cannot see |`);
w(`| what the fold chose to chase | propositions carrying ${ANCHOR_MIN}+ of the declared task's content words, with ends under ${MAX_END_CHARS} chars — a declared SPENDING rule that gates budget and ordering, never admission |`);
w(`| who decided standing | \`kernel/notes.js::standingOf\` + \`corroboration.js::distinctSources\` — chunks are never counted as sources |`);
w();
w(`Every call the model made is printed in §7, with what came back.`);
w();

w(`## 1 — What the fold went and got`);
w();
w(`The opening query is the fold's own, derived from the declared task \`${esc(TASK)}\`. Every later query is derived from the ledger's own thin notes: a proposition heard from one page poses the question "does anyone else say this?", and \`proofQuery(claimOfNote(note))\` is the fold asking it.`);
w();
for (const q of queriesSpent) w(`- \`${esc(q.q)}\` — ${esc(q.why)} — ${q.found} result(s)`);
w();
w(`| page | host | bytes kept | retrieved | address |`);
w(`|---|---|---|---|---|`);
for (const p of pages) w(`| ${esc(String(p.title ?? p.ref)).slice(0, 70)} | ${p.host} | ${p.chars} | ${String(p.retrievedAt).slice(0, 19)}Z | ${esc(p.url)} |`);
w();
if (notAboutSubject.length) {
  w(`Fetched, kept on disk, and NOT read, because the page never names the subject — word overlap alone cannot tell a named organisation from a common noun, and a page about downtowns in general is not a page about this one:`);
  w();
  for (const pg of notAboutSubject) w(`- \`${pg.host}\` — ${esc(String(pg.title ?? pg.ref)).slice(0, 70)} — ${pg.chars} bytes kept at \`${pg.path}\``);
  w();
}
const gapRows = crossings.filter((c) => c.gap || c.blocked);
if (gapRows.length) {
  w(`Refusals and gaps, typed rather than silent — a page the fold could not read is absent from this ledger, and that absence is a fact about the reach of this run:`);
  w();
  for (const g of gapRows) w(`- ${g.act} \`${esc(String(g.url ?? g.q ?? "")).slice(0, 90)}\` → ${g.blocked ? "blocked (upstream anomaly page)" : `${g.gap?.type ?? g.gap}${g.gap?.status ? " " + g.gap.status : ""}${g.gap?.detail ? " — " + g.gap.detail : ""}`}`);
  w();
}

w(`## 2 — Each source, in its own words`);
w();
w(`For each page: what the fold heard it say, rendered by template from the claim's own words, and immediately beneath it the page's own sentence at an address. The rendered line is never evidence — **the indented quotation is the evidence**, and it is the page's bytes, unedited.`);
w();
for (const pg of pages) {
  const mine = bySource.get(pg.ref) ?? [];
  w(`### ${esc(String(pg.title ?? pg.ref))}`);
  w();
  w(`\`${pg.host}\` · ${esc(pg.url)} · kept as \`${pg.path}\` · ${pg.chars} bytes · retrieved ${String(pg.retrievedAt).slice(0, 19)}Z · ${(passagesOf.get(pg.ref) ?? []).length} passage(s) read`);
  w();
  if (!mine.length) { w(`*The reader extracted no bound proposition from this page whose address read back. The page is kept and addressable; this is a limit of the extractor on this page's prose, not a statement that the page says nothing.*`); w(); continue; }
  const mineOn = mine.filter((it) => it.anchored);
  const mineOff = mine.length - mineOn.length;
  if (!mineOn.length) { w(`*Nothing this page states on the declared subject reached the ledger with a verified address; ${mineOff} proposition(s) heard from it sit off-subject (see §3.3).*`); w(); continue; }
  const passage = compose(mineOn, { renderClaim: renderCrown, orderBy });
  if (passage.text) { w(passage.text); w(); w(`*${coverageLine(passage)}${mineOff ? `; a further ${mineOff} proposition(s) heard from this page are off the declared subject — this page's own recirculation furniture — and are listed in §3.3` : ""}*`); w(); }
  for (const it of mineOn.slice(0, 40)) {
    const snips = (snipsOf.get(it.claim.id) ?? []).filter((s) => s.ref === pg.ref);
    if (!snips.length) continue;
    w(`**${esc(it.claim.end1)} —${esc(it.claim.label)}→ ${esc(it.claim.end2)}**`);
    w();
    for (const s of snips.slice(0, 3)) { w(`> ${s.text.trim()}`); w(`>`); w(`> — \`${pg.ref}#${s.start}-${s.end}\``); w(); }
  }
}

w(`## 3 — The ledger, across sources`);
w();
w(`**Standing counts DISTINCT SOURCES, never chunks:** two passages of one page are one perspective. ${snipVerified} of ${snipCount} snip addresses were re-read from the kept bytes before being printed; an address that did not read back was dropped rather than shipped.`);
w();
const anchored = items.filter((x) => x.anchored);
const drifted = items.filter((x) => !x.anchored);
const corrob = anchored.filter((x) => x.merged.standing === "corroborated");
const single = anchored.filter((x) => x.merged.standing === "single");
const contested = anchored.filter((x) => x.merged.case === "DISAGREE" || x.merged.case === "CONTRADICTED");
w(`| standing | propositions |`);
w(`|---|---|`);
w(`| stated by two or more distinct sources | ${corrob.length} |`);
w(`| stated once so far | ${single.length} |`);
w(`| contested (a source states it, another refuses it) | ${contested.length} |`);
w(`| off the declared subject — a page's own recirculation furniture, heard and kept, not chased | ${drifted.length} |`);
w(`| total with a verified verbatim span | ${items.length} of ${after.length} note(s) in the ledger |`);
w();
if (corrob.length) {
  w(`### 3.1 — Stated by more than one source`);
  w();
  const passage = compose(corrob, { renderClaim: renderCrown, orderBy });
  if (passage.text) { w(passage.text); w(); }
  for (const it of corrob.slice(0, 40)) {
    w(`**${esc(it.claim.end1)} —${esc(it.claim.label)}→ ${esc(it.claim.end2)}**`);
    w();
    for (const r of it.merged.holds ?? []) {
      for (let i = 0; i < (r.deciders ?? []).length && i < 3; i += 1) {
        w(`> ${String(r.deciders[i]).trim()}`);
        w(`>`);
        // The page's OWN host, not its syndication group's: the group is how
        // this note is COUNTED (two outlets carrying one text are one
        // perspective), and naming the group beside another page's address
        // would read as if the wrong outlet had said it.
        w(`> — \`${r.read[i] ?? r.read[0]}\` · ${pageOf.get(r.ref)?.host ?? r.who}${(pageOf.get(r.ref)?.host ?? r.who) !== r.who ? ` (counted as one perspective with ${r.who})` : ""} · *${r.how}*`);
        w();
      }
    }
  }
} else {
  w(`### 3.1 — Stated by more than one source`);
  w();
  w(`*None on this reading. Two pages restating one fact in different words are two different propositions to a reader that keys identity on the arrangement — the paraphrase wall this project has measured repeatedly. What follows in §3.2 is not weaker evidence; it is evidence heard once, and §5 reports whether the walk could move any of it to two.*`);
  w();
}
w(`### 3.2 — Stated once so far, on the declared subject (${single.length})`);
w();
for (const it of single.slice(0, 120)) {
  w(`**${esc(it.claim.end1)} —${esc(it.claim.label)}→ ${esc(it.claim.end2)}**`);
  w();
  for (const sp of (snipsOf.get(it.claim.id) ?? []).slice(0, 2)) { w(`> ${sp.text.trim()}`); w(`>`); w(`> — \`${sp.ref}#${sp.start}-${sp.end}\` · ${sp.host ?? ""}`); w(); }
}
if (drifted.length) {
  w(`### 3.3 — What the pages' own furniture brought in (${drifted.length})`);
  w();
  w(`These were heard from the same pages and share no content word with the declared subject. They are kept, addressed, and shown here rather than dropped — an aggregator's recirculation module is prose, structurally indistinguishable from the article beside it, and the honest response is to name the drift rather than filter it out of sight. The fold spent no further budget on them.`);
  w();
  for (const it of drifted.slice(0, 25)) w(`- **${esc(it.claim.end1)} —${esc(it.claim.label)}→ ${esc(it.claim.end2)}** — \`${esc(String((snipsOf.get(it.claim.id) ?? [])[0]?.ref ?? ""))}\``);
  w();
}
if (contested.length) {
  w(`### 3.4 — Contested`);
  w();
  for (const it of contested.slice(0, 20)) {
    const passage = compose([it], { renderClaim: renderCrown, orderBy });
    if (passage.text) { w(passage.text); w(); }
    for (const s of (snipsOf.get(it.claim.id) ?? []).slice(0, 4)) { w(`> ${s.text.trim()}`); w(`>`); w(`> — \`${s.ref}#${s.start}-${s.end}\``); w(); }
  }
}

w(`## 4 — Ranke: the accounts chased to what they themselves cite`);
w();
if (!chase) w(`*The chase did not run in this pass.*`);
else {
  const leadTally = pages.map((pg) => { const l = R.leadsOf({ ref: pg.ref, url: pg.url, host: pg.host, html: pg.raw || pg.text, text: pg.text }); return { ref: pg.ref, host: pg.host, links: l.links?.length ?? 0, quotes: l.quotes?.length ?? 0, citing: l.citing, refused: l.refused?.type ?? null }; });
  const totalLinks = leadTally.reduce((a, x) => a + x.links, 0);
  const totalQuotes = leadTally.reduce((a, x) => a + x.quotes, 0);
  w(`What these pages offered to chase, before any of it was spent:`);
  w();
  w(`| page | outbound link leads | unsourced quotes | cites anything |`);
  w(`|---|---|---|---|`);
  for (const t of leadTally) w(`| ${t.host} | ${t.links} | ${t.quotes} | ${t.citing ? "yes" : `no${t.refused ? ` (${t.refused})` : ""}`} |`);
  w();
  w(`${chase.notesConsidered} proposition(s) standing on accounts alone were chased to the documents those accounts cite; ${chase.fetches} fetch(es) and ${chase.searches} search(es) were spent; ${chase.leads} containment lead(s) were found. **Containment is a lead, never a landing** — a page carrying a proposition's words is not thereby a page that states it, and only the witness's own "states" lands a primary witness on a note.`);
  w();
  const gaps = {};
  for (const f of chase.faces ?? []) if (f.gap) gaps[f.gap.type] = (gaps[f.gap.type] ?? 0) + 1;
  if (Object.keys(gaps).length) { w(`Gaps by type: \`${JSON.stringify(gaps)}\``); w(); }
  let landedAny = 0;
  for (const c of (chase.chased ?? [])) {
    const landed = (c.consulted ?? []).filter((x) => x.witness?.verdict === "states");
    if (!landed.length) continue;
    landedAny += 1;
    w(`**${esc(c.note?.end1 ?? c.note?.subject)} —${esc(c.note?.label ?? c.note?.verb)}→ ${esc(c.note?.end2 ?? c.note?.object)}**`);
    for (const x of landed) { w(); w(`> ${String(x.witness?.because ?? "").trim()}`); w(`>`); w(`> — ${x.host ?? ""} · ${esc(x.url ?? "")}`); }
    w();
  }
  if (!landedAny) {
    w(`**No proposition was landed on a cited document in this pass, and the reason is upstream of the witness.** Across these pages the chase had ${totalLinks} outbound link lead(s) and ${totalQuotes} unsourced quotation(s) to work with, and ${chase.leads} of the documents it fetched carried a proposition's own words. Ranke's own gate is that a page which cites nothing chases nothing; contemporary news pages cite by naming a body or an outlet in prose, not by linking a document, which is the shape this organ was built for on encyclopedic material. That is a limit of this medium against this organ, not a finding about the sources.`);
    w();
  }
}

w(`## 5 — The corroboration walk, and its control (II.23)`);
w();
if (walk && control) {
  const rate = (r) => (r.attested.length / Math.max(1, r.asks)).toFixed(3);
  w(`| arm | asks spent | attested | contradicted | skipped before any ask | clean votes per ask |`);
  w(`|---|---|---|---|---|---|`);
  w(`| real ledger | ${walk.asks} | ${walk.attested.length} | ${walk.contradicted.length} | ${walk.skippedNoCopresence ?? 0} | ${rate(walk)} |`);
  w(`| redealt, built to survive the gate | ${control.asks} | ${control.attested.length} | ${control.contradicted.length} | ${control.skippedNoCopresence ?? 0} | ${rate(control)} |`);
  w();
  w(`**How the control is built, and why this way.** Each redealt proposition keeps its real subject and takes a DIFFERENT object drawn from this material's own other objects, chosen so it shares no content word with the true object and yet genuinely co-occurs with the subject somewhere in the read pages (\`corroboration.js::endsCopresentWindow\`, the walk's own gate). ${controlBuilt} proposition(s) were built this way; ${controlUnbuildable} could not be and are absent from the arm.`);
  w();
  w(`An earlier version of this control rotated each object to the next note's and spent **0 asks** — every rotated proposition was refused by the co-presence gate before a single model call. That measured the gate and tested the model not at all; an arm that always refuses is a rubber stamp, not an arm. This version is a false proposition the material makes PLAUSIBLE, put to the same model under the same protocol and the same budget.`);
  w();
  if (control.asks === 0) {
    w(`On this run the arm still reached 0 asks, so **no claim is made about whether the model can be fooled.** ${controlUnbuildable} of ${controlBuilt + controlUnbuildable} propositions could not be given a gate-surviving substitute at all, which is itself a fact about how narrow this material is.`);
  } else if (control.attested.length === 0) {
    w(`The control was asked ${control.asks} time(s) and attested **nothing**. The real arm attested ${walk.attested.length} of ${walk.asks}. On this material the walk is reading whether a page states a proposition, not whether it shares a topic with one.`);
  } else {
    w(`The control attested ${control.attested.length} of ${control.asks} (${rate(control)} per ask) against the real arm's ${rate(walk)}. **A control that attests at the real arm's rate means §3's corroboration is measuring topic overlap**, and should be read as unproven until the gap is real.`);
    w();
    w(`**Every attested control proposition, so the reading above is checked rather than taken on its rate alone.** Each row is either LEAKY (the real ledger, independently of this control, already joins the same subject to the same swapped object under some label — the swap happened to also be true, which convicts the control's construction, not the model) or a genuine FOOLED case (the ledger holds no such joint anywhere — the model attested a proposition nothing in the real material states).`);
    w();
    w(`| subject | label | swapped object | leaky? | page | decider the witness pointed at |`);
    w(`|---|---|---|---|---|---|`);
    const realJoins = hl.foldWithStanding(log); // the REAL ledger (unaffected by the control's own separate ledger \`rl\`)
    let leaky = 0;
    for (const item of control.attested) {
      const subj = String(item.note.end1 ?? "").trim();
      const swapObj = String(item.note.end2 ?? "").trim();
      const isLeaky = realJoins.some((n) => String(n.end1 ?? "").trim() === subj && String(n.end2 ?? "").trim() === swapObj);
      if (isLeaky) leaky += 1;
      const pg = pageOf.get(item.source);
      const at = pg && item.because ? pg.text.indexOf(item.because) : -1;
      const addr = at >= 0 ? `${item.source}#${at}-${at + item.because.length}` : item.source;
      w(`| ${esc(subj)} | ${esc(item.note.label)} | ${esc(swapObj)} | ${isLeaky ? "**yes**" : "no"} | \`${addr}\` | ${esc(String(item.because ?? "").trim()).slice(0, 140)} |`);
    }
    w();
    if (leaky === control.attested.length) {
      w(`**All ${leaky} of ${control.attested.length} are leaky.** The redeal's own no-shared-content-word rule did not stop it from drawing a swap the material ALSO independently states elsewhere — the control convicts its own construction, not the model, and this run's parity result should be re-measured with a stricter swap (excluding any object the subject is already joined to under any label, not only the true end2) before it is trusted either way.`);
    } else if (leaky === 0) {
      w(`**None are leaky.** Every attested control proposition is a false statement the real ledger states nowhere, and the model attested it anyway. On this material and this budget, §3.1 should be read as unproven, per II.23, exactly as stated above — and for the stronger reason that this is a fooled model, not a leaky control.`);
    } else {
      w(`**${leaky} of ${control.attested.length} are leaky** and ${control.attested.length - leaky} are not. The leaky ones are a defect in the swap, not evidence about the model; only the non-leaky ones bear on whether the walk can be fooled, which narrows this run's real sample size for that question to ${control.attested.length - leaky}.`);
    }
  }
  w();
  w(`Refusals in the real arm, by name: \`${JSON.stringify(walk.refusals)}\`. \`no-testimony\` is the model saying no to every sentence it was offered — a fact about those pages, never a conviction of the proposition.`);
} else w(`*The walk or its control did not complete in this pass; no corroboration rate is claimed.*`);
w();

w(`## 6 — Provenance appendix: every crossing this run made`);
w();
w(`| # | act | target | outcome | at |`);
w(`|---|---|---|---|---|`);
crossings.forEach((c, i) => {
  const target = esc(String(c.url ?? c.q ?? "")).slice(0, 80);
  const outcome = c.gap ? `gap: ${c.gap.type ?? c.gap}${c.gap.status ? " " + c.gap.status : ""}` : c.blocked ? "blocked" : c.act === "search" ? `${c.found} result(s)` : `${c.chars} bytes`;
  w(`| ${i + 1} | ${c.act} | ${target} | ${outcome} | ${String(c.at).slice(0, 19)}Z |`);
});
w();

w(`## 7 — Every call the model was asked to make`);
w();
if (!MODEL_LOG.length) w(`*The model was not called in this pass.*`);
else {
  w(`${MODEL_LOG.length} call(s). In each, the model was shown a numbered list of sentences drawn from the material and asked for an index; the "answer" column is the whole of what it returned.`);
  w();
  w(`| # | phase | protocol | asked (chars) | answer | ms |`);
  w(`|---|---|---|---|---|---|`);
  for (const m of MODEL_LOG) w(`| ${m.n} | ${m.phase} | ${m.protocol} | ${m.askedChars} | \`${esc(String(m.answer).replace(/\n/g, " ")).slice(0, 90)}\`${m.gap ? ` (gap: ${esc(m.gap)})` : ""} | ${m.ms} |`);
  w();
}
w(`### What this run did not do, named rather than left implied`);
w();
w(`- **It asserts no wrongdoing.** Every proposition above is attributed to the page that states it. This instrument has no organ that reaches a verdict about conduct, and it does not pretend to one.`);
w(`- **Reach is the declared budget, not the record.** ${pages.length} page(s) read of ${MAXF} allowed. Of the crossings behind them, **${fetchesSpent} fetch(es) and ${searchesSpent} search(es) were made over the network this run** (budgets: ${MAXTRY} and ${MAXQ}); ${facesFromCache} face(s) and ${searchesFromCache} search(es) were served from the kept store a previous run of this driver filled. A cached page is a real page with a real retrieval timestamp — §1 carries it — but it is not a crossing this run made, and the two are counted apart here so "7 pages, 0 fetches" cannot read as a contradiction.`);
w(`- **No document supplied by the person who commissioned this run was read.** The ledger stands on the public record the fold reached on its own; anything held privately is outside it.`);
w(`- **The extractor's reach is not the page's content.** A page yielding no bound proposition is a limit of the reader on that prose, never a finding that the page is empty.`);
w(`- **Corroboration is counted, never assumed.** Two hosts carrying one wire story are two hosts and one perspective, and nothing here can tell those apart.`);

const outPath = `${OUT}civic-research-READING.md`;
const doc = L.join("\n") + "\n";
writeFileSync(outPath, doc);
say(`\nwrote ${outPath} (${doc.length} chars, ${L.length} lines)`);
say(`model: ${modelCalls} call(s), ${(modelMs / 1000).toFixed(0)}s — POINT-only`);
