// gate-proof.mjs — does the disclosed ledger block change what a real small
// model answers from memory? Headless, the REAL holon.js pipeline
// (the-fold's runHolonicTask, the same call app.js makes), a real local
// model on CPU, new material: the ledger built from the two 2026-09-02
// pages (Austerlitz / Third Coalition) with Ranke's kept faces folded in
// OFFLINE, plus a book this project had not read (env BOOK, default Pride
// and Prejudice) cut into parts so its ledger is real too.
//
// node gate-proof.mjs
//   env: MODEL (gemma2:2b) · N questions per material (8) · BOOK path ·
//        SLICE chars of the book (200000)
//
// THE TWO ARMS, same code path, one difference — what the door PROJECTS:
//   old  — the door's foldWithStanding returns only notes at >=2 distinct
//          sources (the gate holon.js held until 2026-09-03);
//   new  — every note, standing disclosed (the shipped block: corroborated
//          first, then single-witness notes ranked by the question).
// Each question is a materialless turn (chunks: []) — the turn that has
// nothing but the ledger to stand on — asked of the same model under both
// arms; a HIT is the answer carrying a content word of the note's end2 that
// the question did not itself carry. A CONTROL question per material asks
// about something no note states (words the ledger never heard); its block
// must be null under both arms and its answer must not claim the material.
//
// This is a proof that the block REACHES the model and MOVES the answer,
// under a model that can neither confirm nor deny any of it — nothing here
// is a claim that a note is true. Read alongside ranke-walk-RESULTS.md.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const FOLD = "/home/user/the-fold";
const MODEL = process.env.MODEL ?? "gemma2:2b";
const OLLAMA = "http://127.0.0.1:11434";
const N = Number(process.env.N ?? 8);
const BOOK = process.env.BOOK ?? "/home/user/live_priors/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt";
const SLICE = Number(process.env.SLICE ?? 200000);

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable, hostOf } = await import(`${NATIVE}/organs/web.js`);
const R = await import(`${NATIVE}/organs/ranke.js`);
const { CLAIM_STOPWORDS } = await import(`${NATIVE}/organs/grounding.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const { cellOf, GRAINS } = await import(`${NATIVE}/kernel/cube.js`);
const nativeTaskLog = await import(`${NATIVE}/kernel/task-log.js`);
const { runHolonicTask } = await import(`${FOLD}/holon.js`);
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
const content = (s) => String(s ?? "").toLowerCase().split(/[^\p{L}\p{N}'’]+/u).map((w) => w.replace(/['’]s$/, "")).filter((w) => w.length > 2 && !CLAIM_STOPWORDS.has(w));

function readLedger(sources, frame) {
  let log = hl.createHyperlexicon({ frame });
  for (const s of sources) {
    const passages = chunkSource(s.ref, s.text);
    const rel = reader(passages, { pool: passages });
    for (const p of passages) {
      const edges = (rel.read(String(p.text ?? ""))?.claims ?? []).filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
      if (edges.length) log = hl.admit(log, edges, { witness: `${p.ref ?? s.ref}~walls-v1` }).log;
    }
  }
  return log;
}

// ── material 1: the two pages, with Ranke's kept faces folded in offline ──
const PAGES = [
  { ref: "wikipedia-battle-of-austerlitz.html", url: "https://en.wikipedia.org/wiki/Battle_of_Austerlitz" },
  { ref: "wikipedia-war-of-the-third-coalition.html", url: "https://en.wikipedia.org/wiki/War_of_the_Third_Coalition" },
].map((p) => { const html = readFileSync(`${FIX}/${p.ref}`, "utf8"); const f = extractReadable(html); return { ...p, html, host: hostOf(p.url), text: f.text }; });
let pagesLog = readLedger(PAGES, { reader: "makeRelationReader", walls: true, posPrior: "POSPrior@1" });
const INDEX = `${FIX}/primary-faces/index.json`;
if (existsSync(INDEX)) {
  const index = JSON.parse(readFileSync(INDEX, "utf8"));
  const { createHash } = await import("node:crypto");
  const kept = async (url) => { const k = createHash("sha256").update(url).digest("hex").slice(0, 16); const e = index[k]; if (!e || e.gap) return { gap: e?.gap ?? { type: "not-kept" } }; return { text: readFileSync(`${FIX}/primary-faces/${k}.txt`, "utf8"), url, host: e.host, path: `primary-faces/${k}.txt` }; };
  const r = await R.chaseLedger(pagesLog, hl, PAGES, { fetchFace: kept, maxFetches: 1e9, consult: 3 });
  pagesLog = r.log;
  console.log(`pages ledger: ${hl.foldHyperlexicon(pagesLog).length} notes; Ranke offline over kept faces: ${r.notesAttested} note(s) with a primary witness`);
}

// ── material 2: a book this project had not read, cut at chapters ────────
let bookLog = null;
if (existsSync(BOOK)) {
  const raw = readFileSync(BOOK, "utf8").replace(/\r\n/g, "\n");
  const start = Math.max(0, raw.search(/\n\s*Chapter\s+(1|I)\b/i));
  const slice = raw.slice(start, start + SLICE);
  const cuts = [...slice.matchAll(/\n\s*Chapter\s+[IVXL\d]+\.?\s*\n/gi)].map((m) => m.index);
  const bounds = [0, ...cuts.slice(1, 6), slice.length];
  const parts = [];
  for (let i = 0; i + 1 < bounds.length; i += 1) parts.push({ ref: `book-part-${i + 1}.txt`, text: slice.slice(bounds[i], bounds[i + 1]) });
  bookLog = readLedger(parts, { reader: "makeRelationReader", walls: true, book: BOOK.split("/").pop() });
  console.log(`book ledger (${BOOK.split("/").pop()}, ${parts.length} parts): ${hl.foldHyperlexicon(bookLog).length} notes`);
}

// ── the model ─────────────────────────────────────────────────────────────
let calls = 0, promptChars = 0;
// MECHANICAL=1: no model — every call answers "ok". Measures only what the
// block DOES (shown / the asked note shown / the control withheld) over the
// real ledgers and the real pipeline, in seconds; hits are meaningless here.
const MECHANICAL = process.env.MECHANICAL === "1";
const call = async (messages, opts = {}) => {
  calls += 1; promptChars += messages.reduce((n, m) => n + m.content.length, 0);
  if (MECHANICAL) return "ok";
  const body = { model: MODEL, stream: false, options: { temperature: 0, num_predict: opts.maxTokens ?? 300 }, messages };
  if (opts.json) body.format = opts.json;
  const res = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  return (await res.json())?.message?.content ?? "";
};

// ── questions from the ledger's own notes ─────────────────────────────────
function questionsFrom(log, n, seed) {
  const notes = hl.foldWithStanding(log).filter((x) => content(x.object).length >= 2 && content(x.subject).length >= 1 && /^[A-Z]/.test(x.subject));
  // deterministic pick: stride through the fold, most-witnessed first, so
  // both corroborated and single notes are represented as they occur
  const picked = [];
  const stride = Math.max(1, Math.floor(notes.length / n));
  for (let i = seed % stride; i < notes.length && picked.length < n; i += stride) picked.push(notes[i]);
  return picked.map((x) => ({ note: x, question: `What did ${x.subject} ${x.verb}?`, answerWords: content(x.object).filter((w) => !content(`${x.subject} ${x.verb}`).includes(w)) }));
}
const hit = (answer, q) => { const a = new Set(content(answer)); return q.answerWords.some((w) => a.has(w)); };

async function arm(name, log, qs, project) {
  const door = { ...hl, foldWithStanding: (l) => project(hl.foldWithStanding(l)), foldHyperlexicon: (l) => project(hl.foldHyperlexicon(hl.foldWithStanding(l).length ? l : l)).map((x) => x) };
  const rows = [];
  for (const q of qs) {
    const sent = [];
    calls = 0; promptChars = 0;
    const t0 = Date.now();
    const r = await runHolonicTask({ task: q.question, chunks: [], call: async (m, o) => { sent.push(m); return call(m, o); }, foldedRefs: [], makeNameResolver: null, makeRelationReader: null, checkLink: null, planMode: false, chatHistory: [], discourse: "", hyperlexicon: door, hyperlexiconLog: log });
    const text = JSON.stringify(sent);
    const blockShown = /From earlier reading/.test(text);
    const noteShown = new RegExp(q.note.subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " — ").test(text);
    rows.push({ question: q.question, expect: q.answerWords.slice(0, 4), standing: q.note.standing, blockShown, noteShown, hit: q.control ? null : hit(r.output ?? "", q), claimedMaterial: q.control ? /earlier reading|as stated|according to/i.test(r.output ?? "") : null, answer: String(r.output ?? "").slice(0, 200), calls, promptChars, ms: Date.now() - t0 });
  }
  return rows;
}

const results = {};
for (const [label, log] of [["pages", pagesLog], ["book", bookLog]]) {
  if (!log) continue;
  const qs = questionsFrom(log, N, 3);
  qs.push({ control: true, question: "What did the Xylophane committee ratify?", answerWords: [], note: { subject: "Xylophane committee", verb: "ratify", object: "", standing: "none" } });
  const old = await arm("old", log, qs, (notes) => notes.filter((x) => x.sources >= 2));
  const fresh = await arm("new", log, qs, (notes) => notes);
  const tally = (rows) => { const real = rows.filter((r) => r.hit != null); return { questions: real.length, blockShown: real.filter((r) => r.blockShown).length, noteShown: real.filter((r) => r.noteShown).length, hits: real.filter((r) => r.hit).length, control: rows.find((r) => r.hit == null), avgPromptChars: Math.round(real.reduce((a, r) => a + r.promptChars, 0) / Math.max(1, real.length)), avgMs: Math.round(real.reduce((a, r) => a + r.ms, 0) / Math.max(1, real.length)) }; };
  results[label] = { old: { rows: old, ...tally(old) }, new: { rows: fresh, ...tally(fresh) } };
  for (const [arm, t] of [["old gate (>=2 sources only)", results[label].old], ["disclosed (all notes, standing said)", results[label].new]])
    console.log(`\n${label} · ${arm}: block shown on ${t.blockShown}/${t.questions}, the asked note shown on ${t.noteShown}/${t.questions}, hits ${t.hits}/${t.questions}; control: block ${t.control.blockShown ? "SHOWN (wrong)" : "withheld"}, claimed material: ${t.control.claimedMaterial}; avg prompt ${t.avgPromptChars} chars, ${t.avgMs} ms`);
  for (let i = 0; i < old.length; i += 1) if (old[i].hit != null) console.log(`   ${fresh[i].hit ? "✓" : "·"}/${old[i].hit ? "✓" : "·"} [${fresh[i].standing}] ${old[i].question} → new: «${fresh[i].answer.slice(0, 110)}»`);
}
writeFileSync(new URL(MECHANICAL ? "./results/gate-proof-mechanical.json" : "./results/gate-proof.json", import.meta.url), JSON.stringify({ model: MECHANICAL ? null : MODEL, mechanical: MECHANICAL, n: N, book: BOOK, results }, null, 2));
console.log("\nRaw numbers: results/gate-proof.json");
