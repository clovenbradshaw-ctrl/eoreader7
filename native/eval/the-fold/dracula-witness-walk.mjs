// dracula-witness-walk.mjs — floor 5, live: the witness walk over a ledger
// read from a real book, with the subject walls on, against a real local
// model on CPU.
//
// node dracula-witness-walk.mjs            (defaults below)
//   env: MODEL (gemma2:2b) · BUDGET asks (60) · SLICE chars of the book
//   read (240000, from offset 100000 — past the front matter) · ARMS
//   (select,generate) · CAP passages per source (none)
//
// THE QUESTION. Every mechanical lever on floor 5 measured flat: a real
// book corroborates ~2% of its notes by re-sighting because fiction
// re-mentions referents, not propositions. The witness tier is the one
// tool that has moved it (5 of 25 on Wikipedia facts, zero wrong
// corrections), and it has never run on a book. This driver runs it: the
// ledger is built from the book's own bytes by the production reader
// (P82's walls on), the book is cut into N sources at chapter-sized
// boundaries so "a second source" exists to ask, four fabrications are
// planted (a real subject and verb with another note's object) as the
// PRECISION GUARD, and the walk asks a small model "does this passage
// state this note?" under the select protocol (the model points at a
// gathered sentence by index; the verdict is derived, never written).
//
// Reported: notes before; notes at >=2 DISTINCT sources before and after;
// attested; contradicted; refusals by type; asks spent of the budget;
// wall-clock; and the guard — an attest on a planted fabrication is a lie
// and fails the arm. Clean votes per ask is the number NEXT-PASSES gates
// the memory floor on.
import { readFileSync, writeFileSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const BOOK = "/home/user/live_priors/01-literature-books/gutenberg/pg345_Dracula.txt";
const MODEL = process.env.MODEL ?? "gemma2:2b";
const OLLAMA = "http://127.0.0.1:11434";
const BUDGET = Number(process.env.BUDGET ?? 60);
const SLICE = Number(process.env.SLICE ?? 240000);
const OFFSET = 100000;
const ARMS = (process.env.ARMS ?? "select").split(",");
const SOURCES = Number(process.env.SOURCES ?? 6);

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const T = await import(`${NATIVE}/organs/index.js`);
const { corroborateLedger, distinctSources } = T;
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

// ── the book as N sources, cut at chapter headings inside the slice ──────
const raw = readFileSync(BOOK, "utf8").replace(/\r\n/g, "\n");
const slice = raw.slice(OFFSET, OFFSET + SLICE);
const cuts = [...slice.matchAll(/\n\s*CHAPTER [IVXL]+\s*\n/g)].map((m) => m.index);
const bounds = [0, ...cuts.slice(0, SOURCES - 1), slice.length];
const sources = [];
for (let i = 0; i + 1 < bounds.length; i += 1) sources.push({ ref: `dracula-part-${i + 1}.txt`, text: slice.slice(bounds[i], bounds[i + 1]) });
console.log(`book slice ${slice.length} chars → ${sources.length} sources (${sources.map((s) => s.text.length).join(", ")} chars); model ${MODEL}; budget ${BUDGET} asks`);

// ── the ledger, read in document order with the walls on ─────────────────
let log = hl.createHyperlexicon({ frame: { reader: "makeRelationReader", walls: true, posPrior: "POSPrior@1", model: MODEL, budget: BUDGET } });
let heard = 0; const t0 = Date.now();
for (const s of sources) {
  const passages = chunkSource(s.ref, s.text);
  const rel = reader(passages, { pool: passages });
  for (const p of passages) {
    const edges = (rel.read(String(p.text ?? ""))?.claims ?? []).filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
    if (!edges.length) continue;
    const r = hl.admit(log, edges, { witness: `${p.ref ?? s.ref}~walls-v1` });
    log = r.log; heard += r.heard.length;
  }
}
const notes0 = hl.foldHyperlexicon(log);
// ── the guard: four fabrications, a real subject+verb with another note's object
const planted = [];
for (let i = 0; i + 1 < Math.min(notes0.length, 8) && planted.length < 4; i += 2) {
  const a = notes0[i], b = notes0[i + 1];
  if (a.object === b.object) continue;
  log = hl.hear(log, { subject: a.subject, verb: a.verb, object: b.object, witness: "planted:fabrication", spans: [] });
  planted.push(`${a.subject}|${a.verb}|${b.object}`.toLowerCase());
}
const before = hl.foldHyperlexicon(log);
const gateBefore = before.filter((n) => distinctSources(n.witnesses).size >= 2).length;
console.log(`ledger: ${before.length} notes (${heard} heard, ${planted.length} planted) in ${((Date.now() - t0) / 1000).toFixed(0)}s; at >=2 distinct sources before the walk: ${gateBefore}`);

// ── the model: the exact messages and schemas app.js's witness tier sends ──
let calls = 0;
const chat = async (messages, schema) => {
  calls += 1;
  const res = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: MODEL, stream: false, format: schema, options: { num_predict: 200, temperature: 0 }, messages }) });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  return (await res.json())?.message?.content ?? "";
};
const ask = async (s, sl) => T.readTestimony(await chat(T.buildWitnessMessages(s, sl), T.WITNESS_SCHEMA));
const selectAsk = async (messages) => { try { return JSON.parse(await chat(messages, T.SELECT_SCHEMA)); } catch { return {}; } };
const testimony = { witnessSlice: T.witnessSlice, siblingSwap: T.siblingSwap, foldTestimony: T.foldTestimony, buildSelectMessages: T.buildSelectMessages, foldSelect: T.foldSelect };

const results = {};
for (const name of ARMS) {
  calls = 0; const t1 = Date.now();
  const extra = name === "select" ? { selectAsk, splitSentences } : {};
  const r = await corroborateLedger(log, hl, sources, { ask, testimony, maxAsks: BUDGET, ...extra });
  const after = hl.foldHyperlexicon(r.log);
  const gate = after.filter((n) => distinctSources(n.witnesses).size >= 2).length;
  const lied = r.attested.filter((a) => planted.includes(`${a.note?.subject}|${a.note?.verb}|${a.note?.object}`.toLowerCase()));
  const secs = (Date.now() - t1) / 1000;
  console.log(`\n${name.toUpperCase()}: asks ${r.asks}/${BUDGET} · model calls ${calls} · ${secs.toFixed(0)}s (${(secs / Math.max(1, calls)).toFixed(1)}s/call)`);
  console.log(`  attested ${r.attested.length} · contradicted ${r.contradicted.length} · skipped-no-copresence ${r.skippedNoCopresence} · refusals ${JSON.stringify(r.refusals)}`);
  console.log(`  notes at >=2 DISTINCT sources: ${gateBefore} → ${gate}`);
  console.log(`  clean votes per ask: ${(r.attested.length / Math.max(1, r.asks)).toFixed(3)}`);
  console.log(`  PRECISION GUARD — attests on planted fabrications: ${lied.length} ${lied.length === 0 ? "✓" : "✗ THIS ARM LIED"}`);
  for (const a of r.attested) console.log(`    ✓ ${a.note?.subject} —${a.note?.verb}→ ${a.note?.object}  ← ${a.source}${a.because ? `  «${String(a.because).slice(0, 90)}»` : ""}`);
  for (const c of r.contradicted.slice(0, 6)) console.log(`    ✗ ${c.note?.subject} —${c.note?.verb}→ ${c.note?.object}  ← ${c.source}`);
  results[name] = { asks: r.asks, calls, secs, attested: r.attested.length, contradicted: r.contradicted.length, skipped: r.skippedNoCopresence, refusals: r.refusals, gateBefore, gateAfter: gate, lied: lied.length, cleanPerAsk: r.attested.length / Math.max(1, r.asks) };
}
writeFileSync(new URL("./results/dracula-witness-walk.json", import.meta.url), JSON.stringify({ model: MODEL, budget: BUDGET, slice: SLICE, offset: OFFSET, sources: sources.length, notes: before.length, planted: planted.length, results }, null, 2));
console.log("\nRaw numbers: results/dracula-witness-walk.json");
