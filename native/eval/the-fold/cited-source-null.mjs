// cited-source-null.mjs — THE NULL, AT ZERO MODEL CALLS.
//
// User, on a plan to spend ~350 calls on a null band: *"what are you running
// calls for? that's a lot, i feel like the point of making RULES is so we can
// do minimal calls."* Correct, and it is this repo's own discipline —
// reading-wall-RESULTS ran its zero-call pass BEFORE declaring a budget, and
// the budget it then declared was smaller because of what the free pass had
// already settled.
//
// THE DECOMPOSITION THAT MAKES IT FREE. The walk spent 60 asks and skipped
// 6,483 pairs WITHOUT an ask. The skipping is mechanical: a note-source pair
// is feasible only when the note's two ends co-occur somewhere in that source
// (endsCopresentWindow). So the stage that DECIDES WHAT GETS ASKED costs
// nothing, and it can be nulled for nothing.
//
// THE QUESTION, asked of the free stage first: does the candidate set carry
// any information about the relation? Derange the object across every
// admitted edge — every subject, verb, object, witness and span kept, only
// which object belongs to which subject+verb destroyed — and recount
// feasibility. If a deranged ledger is as feasible as the real one, then the
// 60 pairs the witness saw were already a noise-selected set, and no number
// of model calls downstream can recover information the selection did not
// carry.
//
//   env: SOURCES (16) · DRAWS (20)
import { readFileSync, existsSync, writeFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const HERE = new URL("./", import.meta.url).pathname;
const NSOURCES = Number(process.env.SOURCES ?? 16);
const DRAWS = Number(process.env.DRAWS ?? 20);

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { chunkSource, tokenize, blankLabelRows, measureOf, blankBelowMeasure } = await import(`${NATIVE}/organs/source.js`);
const { endsCopresentWindow, proposeCandidates, sharedTextGroups, distinctSources } = await import(`${NATIVE}/organs/corroboration.js`);
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

// ── the same 16 sources the walk used, one per shared-text group ─────────
const walkJson = JSON.parse(readFileSync(`${HERE}results/ranke-backwards.json`, "utf8"));
const faces = new Map();
for (const r of walkJson.real.rows) {
  if (!r.facePath || !existsSync(FIX + r.facePath)) continue;
  if (!faces.has(r.facePath)) faces.set(r.facePath, { ref: r.facePath, host: r.host ?? "?", notes: 0 });
  faces.get(r.facePath).notes += 1;
}
// S64 / the-fold P41: a face the walk names but this checkout lacks is a
// SKIPPED SOURCE, and the pool it leaves is not the walk's. Found by the
// 2026-09-05 reproducibility audit: 86 of 106 faces had been untracked 32
// minutes after the results doc was written, and this driver printed the
// same "16 independent sources" line over the 20 that remained. The skip
// stays (an absent fixture must not crash a null); the silence does not.
const namedFaces = new Set(walkJson.real.rows.map((r) => r.facePath).filter(Boolean));
const absentFaces = [...namedFaces].filter((f) => !existsSync(FIX + f));
if (absentFaces.length) console.log(`NOTE: the walk names ${namedFaces.size} faces; ${absentFaces.length} are absent from fixtures/ and were skipped — this run's pool is ${namedFaces.size - absentFaces.length} faces, not the walk's ${namedFaces.size}. Its numbers are not comparable to a run over the full walk.\n`);
const all = [...faces.values()];
const doorText = (t) => blankBelowMeasure(t, { measure: measureOf(t, { percentile: 0.9 }), fill: 0.8, minRun: 2 });
const texts = new Map(all.map((f) => [f.ref, readFileSync(FIX + f.ref, "utf8")]));
const groups = sharedTextGroups(all.map((f) => ({ ref: f.ref, text: doorText(texts.get(f.ref)) })), { minSentenceLength: 40, minShared: 4, splitSentences });
const seen = new Set(); const sources = [];
for (const f of all.sort((a, b) => b.notes - a.notes)) {
  const g = groups.groupOf.get(f.ref) ?? f.ref;
  if (seen.has(g)) continue;
  seen.add(g);
  sources.push({ ref: `${f.host}|${f.ref}`, text: texts.get(f.ref) });
  if (sources.length >= NSOURCES) break;
}

// ── read once; every draw reuses these edges ─────────────────────────────
const admitted = [];
for (const s of sources) {
  const passages = chunkSource(s.ref, s.text);
  const rel = reader(passages, { pool: passages });
  for (const p of passages) {
    const edges = (rel.read(String(p.text ?? ""))?.claims ?? []).filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
    if (edges.length) admitted.push({ witness: `${p.ref ?? s.ref}~walls-v1`, edges });
  }
}
console.log(`${sources.length} independent sources; ${admitted.reduce((n, a) => n + a.edges.length, 0)} bound edges read. ZERO model calls from here.\n`);

// FEASIBILITY: exactly what the walk's prefilter computes, and the only thing
// that decides which pairs ever reach the witness.
function feasibility(edgeSets) {
  let log = hl.createHyperlexicon({ frame: { probe: "null" } });
  for (const a of edgeSets) log = hl.admit(log, a.edges, { witness: a.witness }).log;
  const notes = hl.foldHyperlexicon(log);
  let feasible = 0, skipped = 0;
  const notesWithAny = new Set();
  for (const src of sources) {
    const proposed = proposeCandidates(notes, src.text, { limit: notes.length });
    for (const c of proposed) {
      const own = distinctSources(c.note.witnesses ?? []);
      if (own.has(src.ref)) continue; // a source cannot corroborate its own note
      // signature is (sourceText, {end1,end2}, opts) — the walk's own call at
      // corroboration.js:956. Reversed here on the first draft, which made
      // BOTH arms read zero feasible pairs; a null and a real number that are
      // both zero is a broken instrument, not a finding.
      const w = endsCopresentWindow(src.text, { end1: c.note.end1 ?? c.note.subject, end2: c.note.end2 ?? c.note.object }, { window: 400 });
      if (w) { feasible += 1; notesWithAny.add(c.note.id); } else skipped += 1;
    }
  }
  return { notes: notes.length, feasible, skipped, notesWithAny: notesWithAny.size };
}

const real = feasibility(admitted);
console.log(`REAL      notes ${real.notes}  feasible pairs ${real.feasible}  skipped ${real.skipped}  notes with >=1 feasible source ${real.notesWithAny}`);

// ── THE BORN NULL: the object deranged, marginals kept ───────────────────
const draws = [];
for (let d = 1; d <= DRAWS; d += 1) {
  let st = (d >>> 0) || 1;
  const rnd = () => ((st = (st * 1664525 + 1013904223) >>> 0) / 4294967296);
  const copy = admitted.map((a) => ({ witness: a.witness, edges: a.edges.map((e) => ({ ...e })) }));
  const flat = copy.flatMap((a) => a.edges);
  const objs = flat.map((e) => e.object);
  for (let i = objs.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [objs[i], objs[j]] = [objs[j], objs[i]]; }
  flat.forEach((e, i) => { e.object = objs[i]; });
  draws.push(feasibility(copy));
  process.stdout.write(`  draw ${d}: feasible ${draws.at(-1).feasible}\r`);
}
const col = (k) => draws.map((x) => x[k]).sort((a, b) => a - b);
const F = col("feasible"), N = col("notesWithAny");
const q = (a) => `median ${a[a.length >> 1]} (${a[0]}–${a.at(-1)})`;
console.log(`\nNULL (${DRAWS} draws, object deranged: same subjects, verbs, objects, witnesses, spans — only the relation destroyed)`);
console.log(`  feasible pairs:                 real ${real.feasible}   redealt ${q(F)}`);
console.log(`  notes with >=1 feasible source: real ${real.notesWithAny}   redealt ${q(N)}`);
const atOrAbove = F.filter((x) => x >= real.feasible).length;
console.log(`\n  ${atOrAbove}/${DRAWS} draws feasible at or above real  ->  rank p ≈ ${((atOrAbove + 1) / (DRAWS + 1)).toFixed(3)}`);
console.log(atOrAbove === 0
  ? `  -> the candidate set CARRIES the relation: the pairs the witness sees are selected by something real.`
  : `  -> THE CANDIDATE SET DOES NOT CARRY THE RELATION. The pairs reaching the witness are\n     selected as often by a ledger whose relations were destroyed, so the 60 asks the walk\n     spent were drawn from a noise-selected set — and no spend downstream can recover\n     information the selection never carried.`);
writeFileSync(`${HERE}results/cited-source-null.json`, JSON.stringify({ sources: sources.length, real, draws, calls: 0 }, null, 2));
