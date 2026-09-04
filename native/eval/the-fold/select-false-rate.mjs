// select-false-rate.mjs — the number WITNESS_OPERATING_POINT has never had.
//
// The face-selected walk attested 2 of 4 planted fabrications — the first
// failed precision guard in this repo. The reason was dilution: every prior
// walk carried 4 planted notes in a ledger of ~919 with a budget of 60, so
// the guard was almost never reached and "0 lies" measured that it was never
// asked, not that the witness refused. 4 of 4 is also far too small an
// interval to report a rate from.
//
// This is the CALIBRATION SHAPE instead of the walk shape: ask the witness
// directly, once per item, against the source where its ends best co-occur —
// the same construction the 0/36 generate batches used. Two arms on the same
// material:
//   FABRICATED  a real subject+verb with ANOTHER note's object. The hard kind:
//               both ends genuinely occur in the corpus, so co-presence
//               passes and select finds real sentences carrying both.
//   REAL        the note as read.
//
// It yields p(states|fabricated) and p(states|true) FOR SELECT AT ASK TIME.
// WITNESS_OPERATING_POINT declares select's numbers from a batch built with
// claims stated by construction; the walk's own ask path has never been
// measured against fabrications with enough items to have power.
//
// DECLARED BEFORE THE FIRST CALL: N=25 per arm, 50 asks, select protocol,
// ~60 model calls. Reported as a rate with its interval, never as "0 lies".
//   env: MODEL (gemma2:2b) · N (25) · SOURCES (16)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const HERE = new URL("./", import.meta.url).pathname;
const MODEL = process.env.MODEL ?? "gemma2:2b";
const OLLAMA = "http://127.0.0.1:11434";
const N = Number(process.env.N ?? 25);
const NSOURCES = Number(process.env.SOURCES ?? 16);

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { chunkSource, tokenize, blankLabelRows, measureOf, blankBelowMeasure } = await import(`${NATIVE}/organs/source.js`);
const T = await import(`${NATIVE}/organs/index.js`);
const { witnessNote, endsCopresentWindow, proposeCandidates, sharedTextGroups, distinctSources, textFeatures } = await import(`${NATIVE}/organs/corroboration.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const { cellOf, GRAINS } = await import(`${NATIVE}/kernel/cube.js`);
const ntl = await import(`${NATIVE}/kernel/task-log.js`);
const posPrior = JSON.parse(readFileSync(`${FIX}pos-prior-eng.json`, "utf8"));

const reader = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
  negationWords: P.NEGATION_WORDS,
  blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
  resolvePronouns, nounPhraseSubjects: true,
});
const hl = makeHyperlexicon({ createTaskLog: ntl.createTaskLog, append: ntl.append, projectTasks: ntl.projectTasks, ENTRY_KINDS: ntl.ENTRY_KINDS, OPERATOR_BASIS: ntl.OPERATOR_BASIS, GRAINS, cellOf });

const walkJson = JSON.parse(readFileSync(`${HERE}results/ranke-backwards.json`, "utf8"));
const facesIdx = new Map();
for (const r of walkJson.real.rows) {
  if (!r.facePath || !existsSync(FIX + r.facePath)) continue;
  if (!facesIdx.has(r.facePath)) facesIdx.set(r.facePath, { ref: r.facePath, host: r.host ?? "?", notes: 0 });
  facesIdx.get(r.facePath).notes += 1;
}
const allFaces = [...facesIdx.values()];
const doorText = (t) => blankBelowMeasure(t, { measure: measureOf(t, { percentile: 0.9 }), fill: 0.8, minRun: 2 });
const texts = new Map(allFaces.map((f) => [f.ref, readFileSync(FIX + f.ref, "utf8")]));
const groups = sharedTextGroups(allFaces.map((f) => ({ ref: f.ref, text: doorText(texts.get(f.ref)) })), { minSentenceLength: 40, minShared: 4, splitSentences });
const seen = new Set(); const sources = [];
for (const f of allFaces.sort((a, b) => b.notes - a.notes)) {
  const g = groups.groupOf.get(f.ref) ?? f.ref;
  if (seen.has(g)) continue; seen.add(g);
  sources.push({ ref: `${f.host}|${f.ref}`, text: texts.get(f.ref) });
  if (sources.length >= NSOURCES) break;
}

// the same face-selected ledger the failed-guard walk used
let log = hl.createHyperlexicon({ frame: { probe: "select-false-rate" } });
const admitted = []; const faceEdges = new Map();
for (const s of sources) {
  const passages = chunkSource(s.ref, s.text);
  const rel = reader(passages, { pool: passages });
  faceEdges.set(s.ref, (rel.edges ?? []).map((e) => ({ o: e.end2, sFace: e.end1Face ?? null, oFace: e.end2Face ?? null })));
  for (const p of passages) {
    const cl = (rel.read(String(p.text ?? ""))?.claims ?? []).filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
    if (cl.length) admitted.push({ witness: `${p.ref ?? s.ref}~walls-v1`, edges: cl });
  }
}
let probe = hl.createHyperlexicon({ frame: { probe: "sel" } });
for (const a of admitted) probe = hl.admit(probe, a.edges, { witness: a.witness }).log;
const F = (t) => [...textFeatures(t)];
const ov = (a, b) => { const x = F(a), y = F(b); return x.length && y.length && x.some((w) => y.includes(w)); };
const keep = new Set();
for (const n of hl.foldHyperlexicon(probe)) {
  const own = distinctSources(n.witnesses ?? []);
  for (const src of sources) {
    if (own.has(src.ref)) continue;
    if ((faceEdges.get(src.ref) ?? []).some((e) => e.sFace && ov(e.sFace, n.end1 ?? n.subject) && ((e.oFace && ov(e.oFace, n.end2 ?? n.object)) || ov(e.o, n.end2 ?? n.object)))) { keep.add(`${n.subject}|${n.verb}|${n.object}`.toLowerCase()); break; }
  }
}
for (const a of admitted) {
  const kept = a.edges.filter((e) => keep.has(`${e.subject}|${e.verb}|${e.object}`.toLowerCase()));
  if (kept.length) log = hl.admit(log, kept, { witness: a.witness }).log;
}
const notes = hl.foldHyperlexicon(log);
console.log(`${sources.length} sources; face-selected ledger ${notes.length} notes; model ${MODEL}\n`);

// ── the two batches ──────────────────────────────────────────────────────
const items = [];
for (let i = 0; i < Math.min(N, notes.length); i += 1) items.push({ arm: "real", note: notes[i] });
let made = 0;
for (let i = 0; i < notes.length && made < N; i += 1) {
  const a = notes[i], b = notes[(i + 7) % notes.length];
  if (!b || a.object === b.object || a.id === b.id) continue;
  items.push({ arm: "fabricated", note: { ...a, object: b.object, end2: b.end2 ?? b.object, id: `fab-${i}` } });
  made += 1;
}
console.log(`batch: ${items.filter((x) => x.arm === "real").length} real, ${items.filter((x) => x.arm === "fabricated").length} fabricated; ${items.length} asks declared\n`);

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

// rendered claim text, from the organ's own proposer
const sentenceOf = new Map();
for (const src of sources) for (const c of proposeCandidates(notes, src.text, { limit: notes.length })) if (!sentenceOf.has(c.note.id)) sentenceOf.set(c.note.id, c.sentence);
const render = (n) => sentenceOf.get(n.id) ?? `${n.subject} ${n.verb} ${n.object}`;

const out = { real: { asked: 0, states: 0, refused: {} }, fabricated: { asked: 0, states: 0, refused: {} } };
const landed = [];
const t0 = Date.now();
for (const it of items) {
  const ends = { end1: it.note.end1 ?? it.note.subject, end2: it.note.end2 ?? it.note.object };
  let best = null;
  for (const src of sources) {
    if (distinctSources(it.note.witnesses ?? []).has(src.ref)) continue;
    const w = endsCopresentWindow(src.text, ends, { window: 400 });
    if (w && (!best || (w.text?.length ?? 0) > (best.w.text?.length ?? 0))) best = { src, w };
  }
  if (!best) continue;
  out[it.arm].asked += 1;
  const r = await witnessNote(render(it.note), best.src, { ask, testimony, ends, slice: best.w?.text ?? null, selectAsk, splitSentences });
  if (r.refused) { out[it.arm].refused[r.refused] = (out[it.arm].refused[r.refused] ?? 0) + 1; continue; }
  if (r.verdict === "states") { out[it.arm].states += 1; landed.push({ arm: it.arm, claim: render(it.note), src: best.src.ref, because: String(r.because ?? "").replace(/\s+/g, " ").slice(0, 150) }); }
}
const wilson = (k, n) => { if (!n) return "—"; const p = k / n, z = 1.96, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return `${((c - m) / d * 100).toFixed(0)}–${((c + m) / d * 100).toFixed(0)}%`; };
console.log(`${calls} model calls, ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
for (const arm of ["real", "fabricated"]) {
  const o = out[arm];
  console.log(`${arm.toUpperCase().padEnd(11)} asked ${String(o.asked).padStart(2)} · states ${String(o.states).padStart(2)} · rate ${(o.states / Math.max(1, o.asked)).toFixed(3)} (95% CI ${wilson(o.states, o.asked)})`);
  console.log(`            refusals ${JSON.stringify(o.refused)}`);
}
console.log(`\np(states | fabricated) = ${(out.fabricated.states / Math.max(1, out.fabricated.asked)).toFixed(3)}   <- the number WITNESS_OPERATING_POINT lacks for select at ask time`);
console.log(`p(states | real)       = ${(out.real.states / Math.max(1, out.real.asked)).toFixed(3)}`);
console.log(`\nFABRICATIONS THAT LANDED:`);
for (const l of landed.filter((x) => x.arm === "fabricated")) console.log(`  ✗ ${l.claim.slice(0, 96)}\n      ← ${l.src.split("|")[0]}  «${l.because.slice(0, 110)}»`);
writeFileSync(`${HERE}results/select-false-rate.json`, JSON.stringify({ model: MODEL, N, sources: sources.length, ledger: notes.length, calls, out, landed }, null, 2));
