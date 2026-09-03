// ranke-walk.mjs — Ranke on new material, live: a ledger read from two
// real Wikipedia pages this project had never read before (Battle of
// Austerlitz; War of the Third Coalition, fetched 2026-09-02), then every
// note standing on those pages alone chased to the sources the pages
// themselves cite (any outbound link) or quote without a source (searched),
// with the faces fetched over the real network and KEPT content-addressed
// under fixtures/primary-faces/ so the run reproduces offline.
//
// node ranke-walk.mjs
//   env: MAXF fetches (24) · MAXS searches (6) · CONSULT per note (3) ·
//        OFFLINE=1 (serve only kept faces; a face not kept is a typed gap)
//
// Reported: notes read; notes standing on the pages alone; leads per page
// (links, unsourced quotes); fetches spent / faces kept / gaps by type;
// notes attested by a primary; the standing table after (kernel
// standingOf: sources × instruments × kinds); and THE CONTROL (II.23) — the
// same chase over a REDEALT ledger (each note's end2 rotated to the next
// note's), served from the SAME kept faces: containment is not a verdict,
// and an attest rate the redeal reproduces is not evidence. The novel gate
// is run in the same breath: the Dracula bytes yield no leads and no
// spend.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const FACES = `${FIX}/primary-faces`;
const MAXF = Number(process.env.MAXF ?? 24);
const MAXS = Number(process.env.MAXS ?? 6);
const CONSULT = Number(process.env.CONSULT ?? 3);
const OFFLINE = process.env.OFFLINE === "1";

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable, parseSearchResults, hostOf } = await import(`${NATIVE}/organs/web.js`);
const R = await import(`${NATIVE}/organs/ranke.js`);
const { standingOf } = await import(`${NATIVE}/kernel/notes.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const { cellOf, GRAINS } = await import(`${NATIVE}/kernel/cube.js`);
const nativeTaskLog = await import(`${NATIVE}/kernel/task-log.js`);
const posPrior = JSON.parse(readFileSync(`${FIX}/pos-prior-eng.json`, "utf8"));

const reader = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
  negationWords: P.NEGATION_WORDS,
  blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
  resolvePronouns, nounPhraseSubjects: true,
});
const hl = makeHyperlexicon({ createTaskLog: nativeTaskLog.createTaskLog, append: nativeTaskLog.append, projectTasks: nativeTaskLog.projectTasks, ENTRY_KINDS: nativeTaskLog.ENTRY_KINDS, OPERATOR_BASIS: nativeTaskLog.OPERATOR_BASIS, GRAINS, cellOf });

// ── the pages, as the reader sees them and as Ranke sees them ────────────
const PAGES = [
  { ref: "wikipedia-battle-of-austerlitz.html", url: "https://en.wikipedia.org/wiki/Battle_of_Austerlitz" },
  { ref: "wikipedia-war-of-the-third-coalition.html", url: "https://en.wikipedia.org/wiki/War_of_the_Third_Coalition" },
].map((p) => { const html = readFileSync(`${FIX}/${p.ref}`, "utf8"); const face = extractReadable(html); return { ...p, html, host: hostOf(p.url), text: face.text, title: face.title }; });

const t0 = Date.now();
let log = hl.createHyperlexicon({ frame: { reader: "makeRelationReader", walls: true, posPrior: "POSPrior@1", agent: R.RANKE } });
let heard = 0;
for (const pg of PAGES) {
  const passages = chunkSource(pg.ref, pg.text);
  const rel = reader(passages, { pool: passages });
  for (const p of passages) {
    const edges = (rel.read(String(p.text ?? ""))?.claims ?? []).filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
    if (!edges.length) continue;
    const r = hl.admit(log, edges, { witness: `${p.ref ?? pg.ref}~walls-v1` });
    log = r.log; heard += r.heard.length;
  }
}
const before = hl.foldWithStanding(log);
console.log(`ledger: ${before.length} notes (${heard} heard) from ${PAGES.length} pages in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
for (const pg of PAGES) { const l = R.leadsOf(pg); console.log(`  ${pg.ref}: ${l.links.length} link leads, ${l.quotes.length} unsourced quotes (>= ${R.QUOTE_MIN_WORDS} words)`); }

// ── the novel gate, same breath ───────────────────────────────────────────
const BOOK = "/home/user/live_priors/01-literature-books/gutenberg/pg345_Dracula.txt";
if (existsSync(BOOK)) {
  const text = readFileSync(BOOK, "utf8").slice(100000, 400000);
  const l = R.leadsOf({ ref: "dracula", html: text, text, host: "" });
  console.log(`  novel gate: Dracula slice with ${(text.match(/[“"]/g) ?? []).length} quotation marks → citing=${l.citing}, leads=${l.links.length}/${l.quotes.length}, refused=${l.refused?.type}`);
}

// ── the crossings: fetch (kept) and search, both budgeted by the organ ───
mkdirSync(FACES, { recursive: true });
const INDEX = `${FACES}/index.json`;
const index = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, "utf8")) : {};
const sha16 = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const UA = "the-fold/ranke-walk (+https://github.com/clovenbradshaw-ctrl/the-fold; primary-source chase eval)";
let network = 0;
async function fetchFace(url, archiveUrl) {
  const key = sha16(url);
  if (index[key]) {
    const e = index[key];
    if (e.gap) return { gap: e.gap };
    return { text: readFileSync(`${FACES}/${key}.txt`, "utf8"), url: e.finalUrl, host: e.host, path: `primary-faces/${key}.txt` };
  }
  if (OFFLINE) return { gap: { type: "offline", detail: "face not kept and OFFLINE=1" } };
  const tryOne = async (u) => {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
    try {
      network += 1;
      const res = await fetch(u, { headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5" }, redirect: "follow", signal: ctl.signal });
      const ct = res.headers.get("content-type") ?? "";
      const buf = Buffer.from(await res.arrayBuffer());
      if (!res.ok) return { gap: { type: "http", status: res.status } };
      if (buf.length > 6_000_000) return { gap: { type: "censored-above", detail: `${buf.length} bytes` } };
      if (/html|xml/i.test(ct)) { const f = extractReadable(buf.toString("utf8")); return { text: f.text, title: f.title, finalUrl: res.url || u }; }
      if (/text\//i.test(ct)) return { text: buf.toString("utf8"), finalUrl: res.url || u };
      return { gap: { type: "beyond-reach", detail: `no text face (${ct || "unknown type"})` } };
    } catch (e) { return { gap: { type: "unreachable", detail: String(e?.message ?? e).slice(0, 120) } }; }
    finally { clearTimeout(t); }
  };
  let got = await tryOne(url);
  let viaArchive = false;
  if (got.gap && archiveUrl) { got = await tryOne(archiveUrl); viaArchive = true; }
  const host = (() => { try { return new URL(got.finalUrl ?? url).hostname.replace(/^www\./, ""); } catch { return hostOf(url); } })();
  if (got.gap) { index[key] = { url, gap: got.gap, viaArchive }; writeFileSync(INDEX, JSON.stringify(index, null, 1)); return { gap: got.gap }; }
  if (/^\s*$/.test(got.text) || got.text.length < 200) { index[key] = { url, gap: { type: "shell", detail: `${got.text.length}-char face` } }; writeFileSync(INDEX, JSON.stringify(index, null, 1)); return { gap: index[key].gap }; }
  writeFileSync(`${FACES}/${key}.txt`, got.text);
  index[key] = { url, finalUrl: got.finalUrl ?? url, host, title: got.title ?? null, chars: got.text.length, viaArchive, retrievedAt: new Date().toISOString() };
  writeFileSync(INDEX, JSON.stringify(index, null, 1));
  return { text: got.text, url: got.finalUrl ?? url, host, path: `primary-faces/${key}.txt` };
}
const SEARCHES = `${FACES}/searches.json`;
const searches = existsSync(SEARCHES) ? JSON.parse(readFileSync(SEARCHES, "utf8")) : {};
async function search(q) {
  if (searches[q]) return searches[q];
  if (OFFLINE) return [];
  const eps = [`https://html.duckduckgo.com/html/?q=${encodeURIComponent(`"${q}"`)}`, `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(`"${q}"`)}`];
  for (const ep of eps) {
    try {
      network += 1;
      const res = await fetch(ep, { headers: { "user-agent": UA } });
      const parsed = parseSearchResults(await res.text());
      if (parsed.blocked || parsed.offEndpoint) continue;
      searches[q] = (parsed.results ?? []).slice(0, 5).map((r) => ({ url: r.url, host: hostOf(r.url), title: r.title ?? null }));
      writeFileSync(SEARCHES, JSON.stringify(searches, null, 1));
      return searches[q];
    } catch { /* try the next face */ }
  }
  searches[q] = []; writeFileSync(SEARCHES, JSON.stringify(searches, null, 1)); return [];
}

// ── the witness: the same model, the same protocol the ledger walk uses ──
const MODEL = process.env.MODEL ?? "gemma2:2b";
const T = await import(`${NATIVE}/organs/index.js`);
let modelCalls = 0;
const chat = async (messages, schema) => {
  modelCalls += 1;
  const res = await fetch("http://127.0.0.1:11434/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: MODEL, stream: false, format: schema, options: { num_predict: 200, temperature: 0 }, messages }) });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  return (await res.json())?.message?.content ?? "";
};
const witness = process.env.NO_WITNESS === "1" ? null : {
  ask: async (sen, sl) => T.readTestimony(await chat(T.buildWitnessMessages(sen, sl), T.WITNESS_SCHEMA)),
  selectAsk: async (messages) => { try { return JSON.parse(await chat(messages, T.SELECT_SCHEMA)); } catch { return {}; } },
  testimony: { witnessSlice: T.witnessSlice, siblingSwap: T.siblingSwap, foldTestimony: T.foldTestimony, buildSelectMessages: T.buildSelectMessages, foldSelect: T.foldSelect },
  splitSentences,
};

// ── the chase ─────────────────────────────────────────────────────────────
const t1 = Date.now();
const run = await R.chaseLedger(log, hl, PAGES, { fetchFace, search, maxFetches: MAXF, maxSearches: MAXS, consult: CONSULT, witness });
const after = hl.foldWithStanding(run.log);
const gaps = {};
for (const f of run.faces) if (f.gap) gaps[f.gap.type] = (gaps[f.gap.type] ?? 0) + 1;
console.log(`\nRANKE (real): ${run.notesConsidered} notes chased of ${before.length}; ${run.fetches} fetch(es) of ${MAXF}, ${run.searches} search(es) of ${MAXS}, ${network} network calls, ${modelCalls} witness calls (${witness ? MODEL : "no witness"}), ${((Date.now() - t1) / 1000).toFixed(0)}s`);
console.log(`  containment leads (a sentence carrying the note's words): ${run.leads}`);
const verdicts = {}; for (const c of run.chased) for (const x of c.consulted) if (x.witness) { const k = x.witness.refused ?? x.witness.verdict; verdicts[k] = (verdicts[k] ?? 0) + 1; }
console.log(`  witness verdicts on leads: ${JSON.stringify(verdicts)}`);
console.log(`  faces read: ${run.faces.filter((f) => !f.gap).length} · gaps: ${JSON.stringify(gaps)}`);
console.log(`  notes attested by a primary: ${run.notesAttested}`);
const kinds = {};
for (const n of after) { const k = `${n.standing}${n.kinds.primary ? "+primary" : ""}`; kinds[k] = (kinds[k] ?? 0) + 1; }
console.log(`  standing after: ${JSON.stringify(kinds)}`);
for (const c of run.chased.filter((c) => c.attested.length).slice(0, 12)) {
  const hit = c.consulted.find((x) => x.snipsFound > 0);
  console.log(`    ✓ ${c.note}\n        ← ${hit.host} (${hit.via}${hit.quote ? `, quote «${hit.quote.slice(0, 60)}»` : ""}): «${hit.snips[0].text.slice(0, 140)}»`);
}
const quoteLeads = run.chased.filter((c) => c.searched.length);
console.log(`  quote leads searched: ${quoteLeads.length} note(s), ${run.chased.reduce((a, c) => a + c.consulted.filter((x) => x.via === "quote").length, 0)} result faces consulted`);

// ── THE CONTROL: the redealt ledger, the same kept faces ─────────────────
const ids = before.map((n) => n.id);
let redealt = hl.createHyperlexicon({ frame: { reader: "control", redeal: "end2 rotated by one" } });
for (let i = 0; i < before.length; i += 1) {
  const n = before[i], m = before[(i + 1) % before.length];
  redealt = hl.hear(redealt, { subject: n.subject, verb: n.verb, object: m.object, witness: n.witnesses[0], spans: [] });
}
const cachedOnly = async (url) => { const key = sha16(url); if (!index[key] || index[key].gap) return { gap: { type: "not-kept" } }; return { text: readFileSync(`${FACES}/${key}.txt`, "utf8"), url, host: index[key].host, path: `primary-faces/${key}.txt` }; };
modelCalls = 0;
const ctl = await R.chaseLedger(redealt, hl, PAGES, { fetchFace: cachedOnly, search: async (q) => searches[q] ?? [], maxFetches: 1e9, maxSearches: 1e9, consult: CONSULT, witness });
const ctlVerdicts = {}; for (const c of ctl.chased) for (const x of c.consulted) if (x.witness) { const k = x.witness.refused ?? x.witness.verdict; ctlVerdicts[k] = (ctlVerdicts[k] ?? 0) + 1; }
const ctlAfter = hl.foldWithStanding(ctl.log);
console.log(`\nCONTROL (redealt end2, same faces): ${ctl.notesConsidered} chased, ${ctl.leads} containment leads, ${ctl.notesAttested} attested by a primary; witness verdicts ${JSON.stringify(ctlVerdicts)} (${modelCalls} calls)`);
const realRate = run.notesAttested / Math.max(1, run.notesConsidered), ctlRate = ctl.notesAttested / Math.max(1, ctl.notesConsidered);
console.log(`  attest rate real ${realRate.toFixed(3)} vs redealt ${ctlRate.toFixed(3)} — ${realRate > ctlRate ? "the chase reads the ends, not the page" : "NOT DISCRIMINATED: containment attests co-occurrence here"}`);
for (const c of ctl.chased.filter((c) => c.attested.length).slice(0, 4)) console.log(`    ✗ control attested: ${c.note}`);

writeFileSync(new URL("./results/ranke-walk.json", import.meta.url), JSON.stringify({
  pages: PAGES.map((p) => ({ ref: p.ref, url: p.url, leads: (() => { const l = R.leadsOf(p); return { links: l.links.length, quotes: l.quotes.length }; })() })),
  ledger: { notes: before.length, heard },
  budget: { maxFetches: MAXF, maxSearches: MAXS, consult: CONSULT },
  witness: witness ? MODEL : null,
  real: { considered: run.notesConsidered, leads: run.leads, attested: run.notesAttested, verdicts, fetches: run.fetches, searches: run.searches, gaps, standing: kinds, chased: run.chased },
  control: { considered: ctl.notesConsidered, leads: ctl.leads, attested: ctl.notesAttested, verdicts: ctlVerdicts, standing: (() => { const k = {}; for (const n of ctlAfter) { const s = `${n.standing}${n.kinds.primary ? "+primary" : ""}`; k[s] = (k[s] ?? 0) + 1; } return k; })() },
}, null, 2));
console.log("\nRaw numbers: results/ranke-walk.json · faces kept under fixtures/primary-faces/");
