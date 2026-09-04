// bridge-witness-measurement.mjs — Pass 12 step 4, measured on real material.
//
// Step 2 (S49) recorded referent bridges as their own corroboratable
// objects and measured that on three real Wikipedia pages the bridge
// ledger holds 43 distinct objects, 3 of them corroborated by two
// independently-derived content notes and the rest standing single-witness
// with nothing able to move them. This driver runs step 4 — asking a
// witness directly whether a single-witness bridge is real — over the SAME
// pages, through the SAME production pipeline, and reports whether the
// asking discriminates at all.
//
// IT RUNS THE REAL PATH. The content ledger below is built by
// bridge-object-measurement.mjs's own setup, copied unchanged (same reader
// organs, same priors, same walls, same pages, same admit): a driver that
// REIMPLEMENTS the path it is measuring reports on a pipeline nobody runs,
// and this project has already paid for that mistake once — a same-day
// probe that rebuilt the reader instead of running it missed witnessSlice's
// own gate and published the exact opposite partition.
//
// THE CONTROL BUILT TO FAIL (II.23), and it is the whole measurement.
// Every candidate is asked TWICE at the eval level:
//   real     — the actual correspondence the crossing assumed
//   mispaired — the SAME established passage against a DIFFERENT bridge's
//              incoming passage, so the correct answer is "different" by
//              construction
// Each of those is itself an armed `witnessBridge` call (real + decoy), so
// a candidate costs 4 model calls. If the mispaired arm lands `same` as
// often as the real arm, this organ is measuring topic and not
// correspondence, and its verdicts may not stand — that refusal is the
// honest outcome and this driver reports it as one, never as a caveat on a
// number.
//
// WHAT IT CANNOT SAY: nothing here establishes that a landed bridge is
// TRUE. A witness confirming a correspondence is one reading by one small
// model, armed against one decoy — evidence with a named kind, counted
// apart from mechanical crossings by the kernel's own `standingOf`, never
// summed into them.
//
//   node bridge-witness-measurement.mjs
//   env: PAGES (comma list) · MODEL (gemma2:2b) · N (candidates, default 12)
import { readFileSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const PAGE_REFS = (process.env.PAGES ?? "wikipedia-battle-of-austerlitz.html,wikipedia-war-of-the-third-coalition.html,wikipedia-battle-of-borodino.html").split(",");
const OLLAMA = process.env.OLLAMA ?? "http://127.0.0.1:11434";
const MODEL = process.env.MODEL ?? "gemma2:2b";
const N = Number(process.env.N ?? 12); // declared budget, P9 — candidates examined, 4 model calls each

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable } = await import(`${NATIVE}/organs/web.js`);
const { makeNotes } = await import(`${NATIVE}/kernel/notes.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const { cellOf, GRAINS } = await import(`${NATIVE}/kernel/cube.js`);
const nativeTaskLog = await import(`${NATIVE}/kernel/task-log.js`);
const { syncBridges } = await import(`${NATIVE}/organs/bridges.js`);
const { SELECT_SCHEMA } = await import(`${NATIVE}/organs/testimony.js`);
const { contextOf, decoysFor, witnessBridge, witnessBridgesFor, BRIDGE_WITNESS_KIND } = await import(`${NATIVE}/organs/bridge-witness.js`);
const posPrior = JSON.parse(readFileSync(`${FIX}/pos-prior-eng.json`, "utf8"));

// ── the model call: the same shape every other driver here uses ────────────
let calls = 0;
async function selectAsk(messages) {
  calls += 1;
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, stream: false, format: SELECT_SCHEMA, options: { num_predict: 200, temperature: 0 }, messages }),
  });
  if (!res.ok) return { stated: "no", sentence: 0 };
  const j = await res.json();
  return j?.message?.content ?? { stated: "no", sentence: 0 };
}

// ── the real pipeline, copied from bridge-object-measurement.mjs ───────────
const reader = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
  negationWords: P.NEGATION_WORDS,
  blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
  resolvePronouns, nounPhraseSubjects: true,
});
const hl = makeHyperlexicon({ createTaskLog: nativeTaskLog.createTaskLog, append: nativeTaskLog.append, projectTasks: nativeTaskLog.projectTasks, ENTRY_KINDS: nativeTaskLog.ENTRY_KINDS, OPERATOR_BASIS: nativeTaskLog.OPERATOR_BASIS, GRAINS, cellOf });
const PAGES = PAGE_REFS.map((ref) => ({ ref, text: extractReadable(readFileSync(`${FIX}/${ref}`, "utf8")).text }));

const t0 = Date.now();
let log = hl.createHyperlexicon({ frame: { reader: "makeRelationReader", walls: true, posPrior: "POSPrior@1", audit: "bridge-witness" } });
for (const pg of PAGES) {
  const passages = chunkSource(pg.ref, pg.text);
  const rel = reader(passages, { pool: passages });
  for (const p of passages) {
    const edges = (rel.read(String(p.text ?? ""))?.claims ?? []).filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
    if (edges.length) log = hl.admit(log, edges, { witness: `${pg.ref}~walls-v1` }).log;
  }
}
const contentNotes = hl.foldWithStanding(log);
const joined = contentNotes.filter((n) => (n.joins ?? []).length);
console.log(`content ledger: ${contentNotes.length} notes, ${joined.length} with a join, in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const bridges = makeNotes();
let bridgeLog = syncBridges(bridges.createNotes(), bridges, contentNotes).log;
const bridgeNotes = bridges.foldWithStanding(bridgeLog);
console.log(`bridge ledger: ${bridgeNotes.length} distinct objects; standings ${JSON.stringify(bridgeNotes.reduce((a, b) => ({ ...a, [b.standing]: (a[b.standing] ?? 0) + 1 }), {}))}`);

// ── the candidates, with both sides' real context ──────────────────────────
const pool = [];
for (const note of joined) for (const j of note.joins ?? []) if (j?.incomingEnds) pool.push({ note, join: j });
const candidates = [];
for (const { note, join } of pool) {
  const ctx = contextOf(note, join);
  if (ctx.gap) continue;
  for (const [which, priorFace, incomingFace] of [["end1", note.end1, join.incomingEnds.end1], ["end2", note.end2, join.incomingEnds.end2]]) {
    candidates.push({ note, join, which, priorFace, incomingFace, established: ctx.establishedText, incoming: ctx.incomingText, decoy: decoysFor(join, pool)?.context ?? null });
  }
}
const usable = candidates.filter((c) => c.decoy);
console.log(`candidates with context on both sides: ${candidates.length}; of those ARMABLE (a decoy exists): ${usable.length}`);
if (!usable.length) { console.log("\nnothing armable on this material — every bridge here is alone in its walk. Reported as the measurement, not worked around."); process.exit(0); }

// ── arm 1: the real correspondence · arm 2: mispaired, correct answer is "different"
const sample = usable.slice(0, N);
console.log(`\nexamining ${sample.length} candidates (declared budget N=${N}); 4 model calls each — real+decoy, then mispaired+decoy\n`);
const rows = [];
for (const [i, c] of sample.entries()) {
  // the mispaired incoming passage: another candidate's incoming context,
  // deliberately the wrong document's referent for this established face.
  const other = sample[(i + 1) % sample.length];
  const mispaired = other.incoming === c.incoming ? (sample[(i + 2) % sample.length]?.incoming ?? null) : other.incoming;
  const real = await witnessBridge({ establishedFace: c.priorFace, establishedContext: c.established, incomingFace: c.incomingFace, realContext: c.incoming, decoyContext: c.decoy }, { selectAsk });
  const control = mispaired
    ? await witnessBridge({ establishedFace: c.priorFace, establishedContext: c.established, incomingFace: other.incomingFace, realContext: mispaired, decoyContext: c.decoy }, { selectAsk })
    : { refused: "no-mispairing-available" };
  rows.push({ which: c.which, face: `${c.priorFace} <-> ${c.incomingFace}`, real: real.verdict ?? `refused:${real.refused}`, control: control.verdict ?? `refused:${control.refused}` });
  console.log(`  ${String(i + 1).padStart(2)}. ${c.priorFace} <-> ${c.incomingFace}`);
  console.log(`      real: ${real.verdict ?? `refused:${real.refused}`}   mispaired-control: ${control.verdict ?? `refused:${control.refused}`}`);
}

const same = (xs, k) => xs.filter((r) => r[k] === "same").length;
console.log(`\n── RESULT ─────────────────────────────────────────────────────`);
console.log(`real correspondences landed "same":      ${same(rows, "real")} of ${rows.length}`);
console.log(`MISPAIRED control landed "same":         ${same(rows, "control")} of ${rows.length}   <- built to fail; every one of these is wrong by construction`);
const realSame = same(rows, "real"), ctrlSame = same(rows, "control");

// A BARE INEQUALITY IS NOT A RESULT (this repo's own standing rule: a null
// drawn once is a null drawn zero times). The two arms are the SAME
// candidates asked two ways, so the exact test for "does pairing change
// the answer" is Fisher's on the 2x2 — closed form, no simulation, nothing
// to be underpowered at, alpha declared before the run at this project's
// own standing 0.05.
const ALPHA = 0.05;
const lgamma = (n) => { // Lanczos, enough for exact small-table factorials
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = n, y = n, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j += 1) ser += g[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
};
const lchoose = (n, k) => (k < 0 || k > n ? -Infinity : lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1));
function fisherRight(a, b, c, d) { // P(X >= a) for the top-left cell
  const n = a + b + c + d, r1 = a + b, c1 = a + c;
  let p = 0;
  for (let x = a; x <= Math.min(r1, c1); x += 1) p += Math.exp(lchoose(c1, x) + lchoose(n - c1, r1 - x) - lchoose(n, r1));
  return Math.min(1, p);
}
const p = fisherRight(realSame, rows.length - realSame, ctrlSame, rows.length - ctrlSame);
console.log(`\nFisher exact, one-sided P(real >= observed | pairing does not matter) = ${p.toFixed(4)}   (alpha ${ALPHA}, declared)`);
if (realSame <= ctrlSame || p >= ALPHA) {
  console.log(`REFUSED: the control is not separated at the declared alpha.`);
  console.log(`On this material this organ has not shown it measures correspondence rather than topic.`);
} else {
  console.log(`DISCRIMINATED at alpha ${ALPHA}. That is ALL this establishes: the picker answers`);
  console.log(`differently when the pairing is wrong. It is not a precision claim, and nothing here`);
  console.log(`says a landed bridge is TRUE.`);
}
console.log(`refusal shapes: ${JSON.stringify(rows.reduce((a, r) => ({ ...a, [r.real]: (a[r.real] ?? 0) + 1 }), {}))}`);

// ── THE SCOPE LIMIT THIS RUN MEASURES ABOUT ITSELF ────────────────────────
// A bridge exists only where `hear()`'s exact-triple match already fired,
// so both faces are routinely the SAME STRING. Counted, not assumed.
const identical = rows.filter((r) => { const [a, b] = r.face.split(" <-> "); return a === b; }).length;
console.log(`\ncandidates whose two faces are the IDENTICAL string: ${identical} of ${rows.length}`);
console.log(`This bounds what witnessing bridges can reach: a paraphrased restatement never matches the`);
console.log(`triple, so it never becomes a bridge candidate, so no witness here is ever asked about it.`);

// ── the production walk itself, so what ships is what was measured ─────────
const walk = await witnessBridgesFor(bridgeLog, bridges, joined, { selectAsk, maxAsks: Math.min(6, sample.length), recipe: "bridge-witness-v1" });
console.log(`\nproduction walk (witnessBridgesFor, maxAsks=${Math.min(6, sample.length)}): asked ${walk.asked}, landed ${walk.applied.length}, concede-suggested ${walk.suggestions.length}, refused ${walk.refused.length}`);
const witnessed = bridges.foldWithStanding(walk.log).filter((b) => (b.kinds ?? {})[BRIDGE_WITNESS_KIND]);
console.log(`bridges now carrying a ${BRIDGE_WITNESS_KIND} witness: ${witnessed.length}`);
for (const b of witnessed.slice(0, 5)) console.log(`  ${b.end1} <-> ${b.end2}  kinds=${JSON.stringify(b.kinds)} standing=${b.standing}`);
console.log(`\ntotal model calls: ${calls} · ${((Date.now() - t0) / 1000).toFixed(1)}s wall`);
