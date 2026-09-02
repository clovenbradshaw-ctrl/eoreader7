// eval/corroboration-select-vs-generate.mjs — the paraphrase wall, measured
// with both witness protocols on one real ledger.
//
// The F5 bottleneck (reading-recall-finding, addendum 5/6): the ledger's
// >=2-distinct-source gate starved at ~2% because restatements do not
// match; the witness tier is the licensed tool. Two protocols now exist —
// GENERATE (the model writes a because; armed by sibling swap; 0.33 recall,
// 0/36 false) and SELECT (the model points at a mechanically gathered
// sentence; armed by same-index; 2/6, 0/8 false). This driver runs the
// SAME settling walk over the SAME real ledger with the SAME ask budget
// under each, and reports attested notes, notes reaching the gate, ask
// economics, and — the precision guard — attests on PLANTED fabricated
// notes, which must stay 0 for either protocol to count.
import { readFileSync } from "node:fs";
const FOLD = new URL("..", import.meta.url).pathname;
const NATIVE = new URL("../../eoreader7/native", import.meta.url).pathname;
const { makeRelationReader } = await import(`${FOLD}/hypergraph.js`);
const { makeHyperlexicon } = await import(`${FOLD}/hyperlexicon.js`);
const { adaptTaskLog } = await import(`${FOLD}/consequence.js`);
const { chunkSource, blankLabelRows } = await import(`${FOLD}/source.js`);
const { extractReadable } = await import(`${FOLD}/web.js`);
const T = await import(`${FOLD}/testimony.js`);
const { corroborateLedger, distinctSources } = await import(`${FOLD}/corroboration.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const { tokenize } = await import(`${NATIVE}/adapters/text/material.js`);
const enginePriors = await import(`${NATIVE}/adapters/text/priors.js`);
const { cellOf, GRAINS } = await import(`${NATIVE}/kernel/cube.js`);
const nativeTaskLog = await import(`${NATIVE}/kernel/task-log.js`);

const OLLAMA = "http://localhost:11434", MODEL = "gemma2:2b", BUDGET = Number(process.env.BUDGET ?? 30);
const posPrior = JSON.parse(readFileSync(`${FOLD}/priors-data/pos-prior-eng.json`, "utf8"));
const relationsFor = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior,
  determiners: new Set([...enginePriors.DEFINITE_DETERMINERS, ...enginePriors.INDEFINITE_DETERMINERS]),
  negationWords: enginePriors.NEGATION_WORDS,
  blankFurniture: (text) => blankLabelRows(text, { minRun: 4, maxCell: 60 }),
  resolvePronouns,
});
const hl = makeHyperlexicon({ ...adaptTaskLog({ createTaskLog: nativeTaskLog.createTaskLog, append: nativeTaskLog.append, ENTRY_KINDS: nativeTaskLog.ENTRY_KINDS, OPERATOR_BASIS: nativeTaskLog.OPERATOR_BASIS, GRAINS }), projectTasks: nativeTaskLog.projectTasks, cellOf });

// ── the material: two real pages about one battle; the ledger heard from BOTH ──
const sources = [];
for (const name of ["battle-of-borodino", "war-and-peace"]) {
  const face = extractReadable(readFileSync(`${FOLD}/eval/fixtures/wikipedia-${name}.html`, "utf8"));
  sources.push({ ref: `${name}.txt`, text: typeof face === "string" ? face : face?.text ?? "" });
}
let log = hl.createHyperlexicon();
let heard = 0;
for (const s of sources) {
  const passages = chunkSource(s.ref, s.text).slice(0, 40); // declared cap — one page's worth of the reader's own passages
  const rel = relationsFor(passages, { pool: passages });
  for (const p of passages) {
    const edges = (rel.read(String(p.text ?? ""))?.claims ?? []).filter((c) => c.verdict === "bound")
      .map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
    if (!edges.length) continue;
    const r = hl.admit(log, edges, { witness: p.ref ?? s.ref });
    log = r.log; heard += r.heard?.length ?? edges.length;
  }
}
// PLANTED FABRICATIONS — the precision guard: real notes with the object
// swapped for another note's object; an attest on any of these is a lie.
const notes0 = hl.foldHyperlexicon(log);
const planted = [];
for (let i = 0; i + 1 < Math.min(notes0.length, 8); i += 2) {
  const a = notes0[i], b = notes0[i + 1];
  if (a.object === b.object) continue;
  log = hl.hear(log, { subject: a.subject, verb: a.verb, object: b.object, witness: "planted:fabrication", spans: [] });
  planted.push(`${a.subject}|${a.verb}|${b.object}`.toLowerCase());
}
const before = hl.foldHyperlexicon(log);
console.log(`ledger: ${before.length} notes (${heard} heard from 2 pages, ${planted.length} planted fabrications); at >=2 distinct sources before the walk: ${before.filter((n) => distinctSources(n.witnesses).size >= 2).length}`);

// ── asks ──────────────────────────────────────────────────────────────────
let calls = 0;
const chat = async (messages, schema) => {
  calls += 1;
  const res = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, stream: false, format: schema, options: { num_predict: 200, temperature: 0 }, messages }) });
  return (await res.json())?.message?.content ?? "";
};
const ask = async (s, slice) => T.readTestimony(await chat(T.buildWitnessMessages(s, slice), T.WITNESS_SCHEMA));
const selectAsk = async (messages) => { try { return JSON.parse(await chat(messages, T.SELECT_SCHEMA)); } catch { return {}; } };
const testimony = { witnessSlice: T.witnessSlice, siblingSwap: T.siblingSwap, foldTestimony: T.foldTestimony, buildSelectMessages: T.buildSelectMessages, foldSelect: T.foldSelect };

async function arm(name, extra) {
  calls = 0; const t0 = Date.now();
  const r = await corroborateLedger(log, hl, sources, { ask, testimony, maxAsks: BUDGET, ...extra });
  const after = hl.foldHyperlexicon(r.log);
  const gate = after.filter((n) => distinctSources(n.witnesses).size >= 2).length;
  const liedOn = r.attested.filter((a) => planted.includes(`${a.note?.subject}|${a.note?.verb}|${a.note?.object}`.toLowerCase())).length;
  console.log(`\n${name}: asks ${r.asks}/${BUDGET} · model calls ${calls} · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log(`  attested ${r.attested.length} · contradicted ${r.contradicted.length} · skipped-no-copresence ${r.skippedNoCopresence} · refusals ${JSON.stringify(r.refusals)}`);
  console.log(`  notes at >=2 DISTINCT sources after: ${gate} (before ${before.filter((n) => distinctSources(n.witnesses).size >= 2).length})`);
  console.log(`  PRECISION GUARD — attests on planted fabrications: ${liedOn} ${liedOn === 0 ? "✓" : "✗ THIS ARM LIED"}`);
  for (const a of r.attested.slice(0, 4)) console.log(`    ✓ ${a.note?.subject} —${a.note?.verb}→ ${a.note?.object}  ← ${a.source}`);
  return { name, asks: r.asks, calls, attested: r.attested.length, gate, liedOn };
}
const G = await arm("GENERATE (write a because, sibling-swap arm)", {});
const S = await arm("SELECT (point at a gathered sentence, same-index arm)", { selectAsk, splitSentences });
console.log(`\n── SUMMARY ── same ledger, same budget (${BUDGET} asks)`);
for (const a of [G, S]) console.log(`  ${a.name.split(" ")[0].padEnd(9)} attested ${a.attested} · gate ${a.gate} · calls ${a.calls} · attested-per-call ${(a.attested / Math.max(1, a.calls)).toFixed(3)} · lied ${a.liedOn}`);
