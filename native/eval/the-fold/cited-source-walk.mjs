// cited-source-walk.mjs — THE WALK, on the first corpus that can corroborate.
//
// Every clean-votes-per-ask number this project has published was measured on
// material that could not corroborate: a novel that restates nothing (0.017),
// and two encyclopedia pages one of which copies the other (0.033). The
// denominator was corrected three times -- chunk addresses counted as sources
// (S45), one text in two places counted as two (source-independence), and
// then the fixture set turned out never to have been independent at all
// (22 corroborated -> 0 under the door and independence together).
//
// cited-source-independence.mjs found and verified a corpus that survives the
// question: an article measured against the sources it CITES, 89 independent
// texts among 106 faces over 34 hosts, the real collapse outside every one of
// 40 redeals. THE WALK HAS NEVER BEEN RUN ON IT. This runs it.
//
// Identical to dracula-witness-walk.mjs in every part except which sources it
// reads, so the numbers are comparable to the two above.
//
// ── DECLARED BEFORE THE FIRST CALL (P9) ─────────────────────────────────
//   sources   the N cited faces carrying the most notes, ONE PER SHARED-TEXT
//             GROUP (sharedTextGroups at the floor the null licenses), so a
//             syndicated text cannot corroborate itself.
//   ledger    notes read from those faces, walls on, in reading order.
//   guard     4 planted fabrications (a real subject+verb with another note's
//             object). An attest on one is a lie and fails the arm.
//   arm       select (one call per ask; the armed same-index check).
//   budget    BUDGET asks (default 60), maxAsks enforced by the organ.
//   WHAT MOVES THE STANDING: clean votes per ask ABOVE 0.033 -- the best
//   number from a corpus that could not corroborate -- with 0 lies. At or
//   below it, the corpus was never the binding constraint and the memory
//   floor's design is what gets re-examined, which is NEXT-PASSES' own rule.
//
//   THE BORN NULL (P66, added the same day the real arm returned 0.033).
//   A planted guard of four hand-made fabrications is NOT a null: it is four
//   points, chosen by me, and it answers "does the witness attest nonsense"
//   rather than "what does this witness attest AT ALL, on material with the
//   relation destroyed". REDEAL_SEED=<n> deranges the OBJECT across the
//   admitted edges -- every subject kept, every verb kept, every object kept,
//   only which object belongs to which subject+verb destroyed -- and runs the
//   identical walk. BAND=<d> draws it d times, because a null drawn once is a
//   null drawn zero times.
//   WHAT IT DECIDES: if the deranged arms attest at the real arm's rate, then
//   0.033 is this instrument's own baseline and carries no information about
//   the material.
//
//   env: MODEL (gemma2:2b) · BUDGET (60) · SOURCES (16) · ARMS (select)
//        REDEAL_SEED · BAND
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const HERE = new URL("./", import.meta.url).pathname;
const MODEL = process.env.MODEL ?? "gemma2:2b";
const OLLAMA = "http://127.0.0.1:11434";
const BUDGET = Number(process.env.BUDGET ?? 60);
const NSOURCES = Number(process.env.SOURCES ?? 16);
const ARMS = (process.env.ARMS ?? "select").split(",");

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { chunkSource, tokenize, blankLabelRows, measureOf, blankBelowMeasure } = await import(`${NATIVE}/organs/source.js`);
const T = await import(`${NATIVE}/organs/index.js`);
const { corroborateLedger, distinctSources } = T;
// sharedTextGroups is not on organs/index.js's export list — imported from its
// own module rather than adding an export in a measurement pass.
const { sharedTextGroups } = await import(`${NATIVE}/organs/corroboration.js`);
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

// ── the sources: one per shared-text group, most-cited first ─────────────
const walk = JSON.parse(readFileSync(`${HERE}results/ranke-backwards.json`, "utf8"));
const faces = new Map();
for (const r of walk.real.rows) {
  if (!r.facePath || !existsSync(FIX + r.facePath)) continue;
  if (!faces.has(r.facePath)) faces.set(r.facePath, { ref: r.facePath, host: r.host ?? "?", notes: 0 });
  faces.get(r.facePath).notes += 1;
}
const all = [...faces.values()];
const doorText = (t) => blankBelowMeasure(t, { measure: measureOf(t, { percentile: 0.9 }), fill: 0.8, minRun: 2 });
const texts = new Map(all.map((f) => [f.ref, readFileSync(FIX + f.ref, "utf8")]));
const groups = sharedTextGroups(all.map((f) => ({ ref: f.ref, text: doorText(texts.get(f.ref)) })), { minSentenceLength: 40, minShared: 4, splitSentences });
const seenGroup = new Set(); const sources = [];
for (const f of all.sort((a, b) => b.notes - a.notes)) {
  const g = groups.groupOf.get(f.ref) ?? f.ref;
  if (seenGroup.has(g)) continue;
  seenGroup.add(g);
  sources.push({ ref: `${f.host}|${f.ref}`, text: texts.get(f.ref) });
  if (sources.length >= NSOURCES) break;
}
console.log(`cited faces ${all.length} → ${groups.groups.length} independent texts; walking the ${sources.length} most-cited, one per group`);
console.log(`hosts: ${[...new Set(sources.map((s) => s.ref.split("|")[0]))].join(", ")}`);
console.log(`model ${MODEL}; budget ${BUDGET} asks; arm ${ARMS.join(",")}\n`);

// ── the ledger ───────────────────────────────────────────────────────────
let log = hl.createHyperlexicon({ frame: { reader: "makeRelationReader", walls: true, posPrior: "POSPrior@1", model: MODEL, budget: BUDGET, corpus: "cited-source" } });
let heard = 0; const t0 = Date.now();
const admitted = [];
for (const s of sources) {
  const passages = chunkSource(s.ref, s.text);
  const rel = reader(passages, { pool: passages });
  for (const p of passages) {
    const edges = (rel.read(String(p.text ?? ""))?.claims ?? []).filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
    if (!edges.length) continue;
    admitted.push({ witness: `${p.ref ?? s.ref}~walls-v1`, edges });
  }
}
// THE BORN NULL: the object deranged across every admitted edge. Marginals
// kept exactly -- same subjects, same verbs, same multiset of objects, same
// witnesses, same spans -- and only the RELATION destroyed.
const REDEAL = process.env.REDEAL_SEED ? Number(process.env.REDEAL_SEED) : null;
if (REDEAL !== null) {
  let st = (REDEAL >>> 0) || 1;
  const rnd = () => ((st = (st * 1664525 + 1013904223) >>> 0) / 4294967296);
  const flat = admitted.flatMap((a) => a.edges);
  const objs = flat.map((e) => e.object);
  for (let i = objs.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [objs[i], objs[j]] = [objs[j], objs[i]]; }
  for (let i = 0; i < flat.length; i += 1) if (objs[i] !== flat[i].object) flat[i].object = objs[i];
  console.log(`REDEAL_SEED=${REDEAL}: ${flat.length} edges, object deranged (marginals kept, relation destroyed)`);
}
for (const a of admitted) { const r = hl.admit(log, a.edges, { witness: a.witness }); log = r.log; heard += r.heard.length; }
const notes0 = hl.foldHyperlexicon(log);
const planted = [];
for (let i = 0; i + 1 < Math.min(notes0.length, 8) && planted.length < 4; i += 2) {
  const a = notes0[i], b = notes0[i + 1];
  if (a.object === b.object) continue;
  log = hl.hear(log, { subject: a.subject, verb: a.verb, object: b.object, witness: "planted:fabrication", spans: [] });
  planted.push(`${a.subject}|${a.verb}|${b.object}`.toLowerCase());
}
const before = hl.foldHyperlexicon(log);
const gateBefore = before.filter((n) => distinctSources(n.witnesses).size >= 2).length;
console.log(`ledger: ${before.length} notes (${heard} heard, ${planted.length} planted) in ${((Date.now() - t0) / 1000).toFixed(0)}s; at >=2 distinct sources before the walk: ${gateBefore}\n`);

// ── the model ────────────────────────────────────────────────────────────
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
  console.log(`${name.toUpperCase()}: asks ${r.asks}/${BUDGET} · model calls ${calls} · ${secs.toFixed(0)}s`);
  console.log(`  attested ${r.attested.length} · contradicted ${r.contradicted.length} · skipped-no-copresence ${r.skippedNoCopresence}`);
  console.log(`  refusals ${JSON.stringify(r.refusals)}`);
  console.log(`  notes at >=2 DISTINCT sources: ${gateBefore} → ${gate}`);
  console.log(`  CLEAN VOTES PER ASK: ${(r.attested.length / Math.max(1, r.asks)).toFixed(3)}   (novel 0.017 · encyclopedic pair 0.033)`);
  console.log(`  PRECISION GUARD — attests on planted fabrications: ${lied.length} ${lied.length === 0 ? "✓" : "✗ THIS ARM LIED"}`);
  for (const a of r.attested) console.log(`    ✓ ${a.note?.subject} —${a.note?.verb}→ ${String(a.note?.object).slice(0, 60)}\n        ← ${a.source}${a.because ? `\n        «${String(a.because).replace(/\s+/g, " ").slice(0, 140)}»` : ""}`);
  for (const c of r.contradicted.slice(0, 6)) console.log(`    ✗ ${c.note?.subject} —${c.note?.verb}→ ${String(c.note?.object).slice(0, 60)}  ← ${c.source}`);
  results[name] = { asks: r.asks, calls, secs, attested: r.attested.length, contradicted: r.contradicted.length, skipped: r.skippedNoCopresence, refusals: r.refusals, gateBefore, gateAfter: gate, lied: lied.length, cleanPerAsk: r.attested.length / Math.max(1, r.asks) };
}
writeFileSync(new URL("./results/cited-source-walk.json", import.meta.url), JSON.stringify({ model: MODEL, budget: BUDGET, sources: sources.map((s) => s.ref), notes: before.length, planted: planted.length, independentTexts: groups.groups.length, results }, null, 2));
console.log("\nRaw: results/cited-source-walk.json");
