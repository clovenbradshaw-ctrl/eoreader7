// ranke-backwards.mjs — work BACKWARDS from an article whose sources are
// readable: for every note the article states, what stands between the
// chase and the span in the cited source that states the equivalent
// proposition? Not "did it land" but "what would it have to do to land".
//
// node ranke-backwards.mjs
//   env: PAGE fixture (wikipedia-apollo-11.html) · MAXF fetches (40) ·
//        CONSULT per note (3) · WITNESS model calls cap (40) ·
//        MODEL (gemma2:2b) · OFFLINE=1
//
// For each (note, readable cited face) the gap is CLASSIFIED mechanically,
// most-demanding-first, by what a snip would need to see the proposition:
//   same-sentence      — one sentence carries every content word of both
//                        ends (what snipClaim does today)
//   morphology         — same, once forms fold to their lemma (the engine's
//                        own UniMorph lemmatizer: "landed"/"landing")
//   window             — every word within THREE consecutive sentences
//                        (needs cross-sentence binding: a referent named
//                        once, then "the crew", "it", "the module")
//   morphology+window  — both
//   partial            — at least half the words are somewhere in the face;
//                        the MISSING side is named (subject missing → the
//                        source calls the thing something else; object
//                        missing → the source states it in other words)
//   absent             — fewer than half: this face does not state it
// A note's class is the best over its consulted faces. The witness (the
// same armed select protocol) is run on same-sentence AND morphology leads,
// so the ladder's next rung is priced by what the model signs, not only by
// what containment finds. THE CONTROL (II.23): the same classification over
// the ledger with end2 rotated — the classes that measure a proposition
// (same-sentence, morphology) must fall; `partial` is expected to survive,
// because single words co-occur, which is exactly why partial is not a lead.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const FACES = `${FIX}/primary-faces`;
const PAGE = process.env.PAGE ?? "wikipedia-apollo-11.html";
const PAGE_URL = process.env.PAGE_URL ?? "https://en.wikipedia.org/wiki/Apollo_11";
const MAXF = Number(process.env.MAXF ?? 40);
const CONSULT = Number(process.env.CONSULT ?? 3);
const WITNESS_CAP = Number(process.env.WITNESS ?? 40);
const MODEL = process.env.MODEL ?? "gemma2:2b";
const OFFLINE = process.env.OFFLINE === "1";
const WINDOW = 3;

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable, hostOf } = await import(`${NATIVE}/organs/web.js`);
const { rankPrimary } = await import(`${NATIVE}/organs/primary.js`);
const { wordSet, hasWord, splitSentences: groundingSentences } = await import(`${NATIVE}/organs/grounding.js`);
const R = await import(`${NATIVE}/organs/ranke.js`);
const T = await import(`${NATIVE}/organs/index.js`);
const { witnessNote } = await import(`${NATIVE}/organs/corroboration.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const { createLemmatizer, morphologyFromPrior } = await import(`${NATIVE}/adapters/text/morphology.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const { cellOf, GRAINS } = await import(`${NATIVE}/kernel/cube.js`);
const nativeTaskLog = await import(`${NATIVE}/kernel/task-log.js`);
const posPrior = JSON.parse(readFileSync(`${FIX}/pos-prior-eng.json`, "utf8"));
const morph = morphologyFromPrior(JSON.parse(readFileSync(`${FIX}/unimorph-morphology-prior.json`, "utf8")));
const { sameAct } = createLemmatizer(morph.forms, { language: morph.language });

const reader = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
  negationWords: P.NEGATION_WORDS,
  blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
  resolvePronouns, nounPhraseSubjects: true,
});
const hl = makeHyperlexicon({ createTaskLog: nativeTaskLog.createTaskLog, append: nativeTaskLog.append, projectTasks: nativeTaskLog.projectTasks, ENTRY_KINDS: nativeTaskLog.ENTRY_KINDS, OPERATOR_BASIS: nativeTaskLog.OPERATOR_BASIS, GRAINS, cellOf });

// ── the page and its ledger ───────────────────────────────────────────────
const html = readFileSync(`${FIX}/${PAGE}`, "utf8");
const face = extractReadable(html);
const page = { ref: PAGE, url: PAGE_URL, host: hostOf(PAGE_URL), html, text: face.text };
const t0 = Date.now();
let log = hl.createHyperlexicon({ frame: { reader: "makeRelationReader", walls: true, posPrior: "POSPrior@1", agent: R.RANKE, purpose: "backwards" } });
const passages = chunkSource(PAGE, page.text);
const rel = reader(passages, { pool: passages });
for (const p of passages) {
  const edges = (rel.read(String(p.text ?? ""))?.claims ?? []).filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
  if (edges.length) log = hl.admit(log, edges, { witness: `${p.ref ?? PAGE}~walls-v1` }).log;
}
const notes = hl.foldWithStanding(log);
const leads = R.leadsOf(page);
console.log(`${PAGE}: ${notes.length} notes in ${((Date.now() - t0) / 1000).toFixed(1)}s; ${leads.links.length} link leads, ${leads.quotes.length} unsourced quotes`);

// ── faces, kept content-addressed (the walk's own cache) ─────────────────
mkdirSync(FACES, { recursive: true });
const INDEX = `${FACES}/index.json`;
const index = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, "utf8")) : {};
const sha16 = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const UA = "the-fold/ranke-backwards (+https://github.com/clovenbradshaw-ctrl/the-fold; primary-source chase eval)";
let network = 0;
async function fetchFace(url, archiveUrl) {
  const key = sha16(url);
  if (index[key]) { const e = index[key]; return e.gap ? { gap: e.gap } : { text: readFileSync(`${FACES}/${key}.txt`, "utf8"), url: e.finalUrl, host: e.host, path: `primary-faces/${key}.txt` }; }
  if (OFFLINE) return { gap: { type: "offline" } };
  const tryOne = async (u) => {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
    try {
      network += 1;
      const res = await fetch(u, { headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5" }, redirect: "follow", signal: ctl.signal });
      const ct = res.headers.get("content-type") ?? "";
      const buf = Buffer.from(await res.arrayBuffer());
      if (!res.ok) return { gap: { type: "http", status: res.status } };
      if (buf.length > 6_000_000) return { gap: { type: "censored-above" } };
      if (/html|xml/i.test(ct)) { const f = extractReadable(buf.toString("utf8")); return { text: f.text, title: f.title, finalUrl: res.url || u }; }
      if (/text\//i.test(ct)) return { text: buf.toString("utf8"), finalUrl: res.url || u };
      return { gap: { type: "beyond-reach", detail: ct } };
    } catch (e) { return { gap: { type: "unreachable", detail: String(e?.message ?? e).slice(0, 80) } }; } finally { clearTimeout(t); }
  };
  let got = await tryOne(url);
  if (got.gap && archiveUrl) got = await tryOne(archiveUrl);
  const host = (() => { try { return new URL(got.finalUrl ?? url).hostname.replace(/^www\./, ""); } catch { return hostOf(url); } })();
  if (got.gap || !got.text || got.text.length < 200) { index[key] = { url, gap: got.gap ?? { type: "shell", detail: `${got.text?.length ?? 0}-char face` } }; writeFileSync(INDEX, JSON.stringify(index, null, 1)); return { gap: index[key].gap }; }
  writeFileSync(`${FACES}/${key}.txt`, got.text);
  index[key] = { url, finalUrl: got.finalUrl ?? url, host, title: got.title ?? null, chars: got.text.length, retrievedAt: new Date().toISOString() };
  writeFileSync(INDEX, JSON.stringify(index, null, 1));
  return { text: got.text, url: got.finalUrl ?? url, host, path: `primary-faces/${key}.txt` };
}
const faces = new Map(); let fetches = 0;
const cached = async (url, archiveUrl) => { if (faces.has(url)) return faces.get(url); if (fetches >= MAXF) return { gap: { type: "budget" } }; fetches += 1; const g = await fetchFace(url, archiveUrl); faces.set(url, g); return g; };

// ── the gap classification ────────────────────────────────────────────────
const CLASSES = ["same-sentence", "morphology", "window", "morphology+window", "partial", "absent"];
const sentencesOf = new Map();
const sents = (text) => { if (!sentencesOf.has(text)) sentencesOf.set(text, groundingSentences(text).map((s) => ({ ...s, words: wordSet(s.text), list: [...wordSet(s.text)] }))); return sentencesOf.get(text); };
const hasExact = (s, w) => hasWord(s.words, w);
const hasLemma = (s, w) => hasExact(s, w) || s.list.some((x) => sameAct(x, w));
const allIn = (group, words, test) => words.every((w) => group.some((s) => test(s, w)));
function classify(claim, subjWords, text) {
  const ss = sents(text);
  const words = claim.tokens;
  const one = ss.find((s) => allIn([s], words, hasExact));
  if (one) return { cls: "same-sentence", sentence: one.text };
  const oneM = ss.find((s) => allIn([s], words, hasLemma));
  if (oneM) return { cls: "morphology", sentence: oneM.text };
  for (let i = 0; i + WINDOW <= ss.length; i += 1) { const g = ss.slice(i, i + WINDOW); if (allIn(g, words, hasExact)) return { cls: "window", sentence: g.map((s) => s.text).join(" ") }; }
  for (let i = 0; i + WINDOW <= ss.length; i += 1) { const g = ss.slice(i, i + WINDOW); if (allIn(g, words, hasLemma)) return { cls: "morphology+window", sentence: g.map((s) => s.text).join(" ") }; }
  const present = words.filter((w) => ss.some((s) => hasLemma(s, w)));
  const missing = words.filter((w) => !present.includes(w));
  if (present.length * 2 >= words.length) {
    const missSubj = missing.filter((w) => subjWords.has(w)).length, missObj = missing.length - missSubj;
    // the best sentence: the one carrying the most of the claim's words
    let best = null, bestN = -1;
    for (const s of ss) { const n = words.filter((w) => hasLemma(s, w)).length; if (n > bestN) { bestN = n; best = s.text; } }
    return { cls: "partial", missing, missingSide: missSubj && missObj ? "both" : missSubj ? "subject" : "object", sentence: best };
  }
  return { cls: "absent", missing };
}

// ── the witness ───────────────────────────────────────────────────────────
let modelCalls = 0;
const chat = async (messages, schema) => { modelCalls += 1; const res = await fetch("http://127.0.0.1:11434/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: MODEL, stream: false, format: schema, options: { num_predict: 200, temperature: 0 }, messages }) }); if (!res.ok) throw new Error(`ollama ${res.status}`); return (await res.json())?.message?.content ?? ""; };
const witness = {
  ask: async (sen, sl) => T.readTestimony(await chat(T.buildWitnessMessages(sen, sl), T.WITNESS_SCHEMA)),
  selectAsk: async (messages) => { try { return JSON.parse(await chat(messages, T.SELECT_SCHEMA)); } catch { return {}; } },
  testimony: { witnessSlice: T.witnessSlice, siblingSwap: T.siblingSwap, foldTestimony: T.foldTestimony, buildSelectMessages: T.buildSelectMessages, foldSelect: T.foldSelect, sameForm: sameAct },
  splitSentences,
};

// ── the walk backwards ────────────────────────────────────────────────────
async function walk(noteList, { useWitness }) {
  const rows = [];
  let witnessed = 0;
  for (const n of noteList) {
    const claim = R.claimOfNote(n);
    if (!claim) { rows.push({ id: n.id, note: `${n.subject} —${n.verb}→ ${n.object}`, cls: "no-claim" }); continue; }
    const subjWords = new Set(R.claimOfNote({ end1: n.subject, label: "", end2: "" })?.tokens ?? []);
    const cands = rankPrimary(claim, leads.links).filter((c) => c.overlap > 0).flatMap((c) => [c, ...R.expandLead(c).map((u) => ({ ...c, url: u, archiveUrl: null }))]).slice(0, CONSULT);
    let best = null;
    const consulted = [];
    for (const c of cands) {
      const got = await cached(c.url, c.archiveUrl ?? null);
      if (!got || got.gap || !got.text) { consulted.push({ host: c.host, gap: got?.gap ?? { type: "no_face" } }); continue; }
      const cl = classify(claim, subjWords, got.text);
      consulted.push({ host: got.host ?? c.host, ...cl });
      if (!best || CLASSES.indexOf(cl.cls) < CLASSES.indexOf(best.cls)) best = { ...cl, host: got.host ?? c.host, text: got.text };
    }
    const row = { id: n.id, note: `${n.subject} —${n.verb}→ ${n.object}`, article: n.spans?.[0]?.text ?? null, tokens: claim.tokens, readable: consulted.filter((c) => !c.gap).length, cls: best?.cls ?? (consulted.length ? "unreadable" : "no-lead"), host: best?.host ?? null, sentence: best?.sentence ?? null, missing: best?.missing ?? null, missingSide: best?.missingSide ?? null };
    if (useWitness && best && (best.cls === "same-sentence" || best.cls === "morphology") && witnessed < WITNESS_CAP) {
      witnessed += 1;
      const w = await witnessNote(claim.sentence, { ref: best.host, text: best.text }, { ...witness, ends: { end1: n.subject, end2: n.object }, slice: best.sentence });
      row.witness = w.refused ? `refused:${w.refused}` : w.verdict;
      row.because = w.because ?? null;
    }
    rows.push(row);
  }
  return rows;
}

const t1 = Date.now();
const real = await walk(notes, { useWitness: true });
const tally = (rows) => { const t = {}; for (const r of rows) t[r.cls] = (t[r.cls] ?? 0) + 1; return t; };
const readable = real.filter((r) => r.readable > 0);
console.log(`\nREAL: ${real.length} notes; ${fetches} fetches (${network} network), faces read ${[...faces.values()].filter((f) => !f.gap).length}; ${modelCalls} witness calls; ${((Date.now() - t1) / 1000).toFixed(0)}s`);
console.log(`  notes with >=1 readable cited face: ${readable.length} of ${real.length}`);
console.log(`  gap classes (notes with a readable face): ${JSON.stringify(tally(readable))}`);
const partial = readable.filter((r) => r.cls === "partial");
console.log(`  partial by missing side: ${JSON.stringify(tally(partial.map((r) => ({ cls: r.missingSide }))))}`);
const wv = {}; for (const r of real) if (r.witness) wv[r.witness] = (wv[r.witness] ?? 0) + 1;
console.log(`  witness on same-sentence+morphology leads: ${JSON.stringify(wv)}`);
console.log(`  the ladder (cumulative, of ${readable.length}): now=${readable.filter((r) => r.cls === "same-sentence").length} · +morphology=${readable.filter((r) => ["same-sentence", "morphology"].includes(r.cls)).length} · +window=${readable.filter((r) => ["same-sentence", "morphology", "window"].includes(r.cls)).length} · +both=${readable.filter((r) => r.cls !== "partial" && r.cls !== "absent").length}`);

// ── the control ───────────────────────────────────────────────────────────
const rotated = notes.map((n, i) => ({ ...n, object: notes[(i + 1) % notes.length].object, end2: notes[(i + 1) % notes.length].object, spans: [] }));
modelCalls = 0;
const ctl = await walk(rotated, { useWitness: false });
const ctlReadable = ctl.filter((r) => r.readable > 0);
console.log(`\nCONTROL (end2 rotated, same faces): gap classes ${JSON.stringify(tally(ctlReadable))}`);
console.log(`  proposition-measuring classes real vs control: same-sentence ${tally(readable)["same-sentence"] ?? 0} vs ${tally(ctlReadable)["same-sentence"] ?? 0}; morphology ${tally(readable).morphology ?? 0} vs ${tally(ctlReadable).morphology ?? 0}; window ${tally(readable).window ?? 0} vs ${tally(ctlReadable).window ?? 0}`);

// ── specimens ─────────────────────────────────────────────────────────────
console.log(`\nSPECIMENS (article sentence → best cited sentence):`);
for (const cls of CLASSES) {
  for (const r of readable.filter((r) => r.cls === cls).slice(0, cls === "partial" ? 4 : 3)) {
    console.log(`  [${cls}${r.missingSide ? ":" + r.missingSide + " missing " + r.missing.join(",") : ""}${r.witness ? " · witness " + r.witness : ""}] ${r.note}`);
    console.log(`     article: «${String(r.article ?? "").replace(/\s+/g, " ").slice(0, 160)}»`);
    console.log(`     ${r.host}: «${String(r.sentence ?? "").replace(/\s+/g, " ").slice(0, 200)}»`);
  }
}
writeFileSync(new URL("./results/ranke-backwards.json", import.meta.url), JSON.stringify({ page: PAGE, notes: notes.length, leads: { links: leads.links.length, quotes: leads.quotes.length }, fetches, facesRead: [...faces.values()].filter((f) => !f.gap).length, real: { tally: tally(readable), partialBySide: tally(partial.map((r) => ({ cls: r.missingSide }))), witness: wv, rows: real }, control: { tally: tally(ctlReadable) } }, null, 2));
console.log("\nRaw: results/ranke-backwards.json");
