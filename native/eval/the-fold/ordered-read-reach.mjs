// ordered-read-reach.mjs — ZERO model calls.
//
// User: *"remember that we need to walk the activation in order and truly
// read things"* — said after I proposed to fix the selection with a better
// SCORING FUNCTION over a static document. Ranking better makes a better
// lookup; it is still not reading.
//
// THE DIFFERENCE. Copresence asks whether a claim's two ends' LETTERS turn up
// near each other in the source. A reader going through the document in order
// asks whether the ends are ACTIVE when it reaches a sentence — which
// includes everything built on the way there. "It landed at 20:17 UTC" has no
// ends in it at all by the first test; to a reader who met the Eagle two
// sentences earlier it states the claim outright. Sources restate things with
// pronouns and definite references precisely BECAUSE they have already
// introduced the subject, so the window is structurally blind to the
// sentences a reader would find most obviously confirming.
//
// THE MEASUREMENT, and why it needs no new machinery. The reader already
// walks passages in order and resolves pronouns against what it has already
// met (resolvePronouns), publishing the earned referent on each edge as
// `end1Face`/`end2Face`. That face IS the ordered read's product: it exists
// only because the reader had context. So:
//
//   ARM A (lookup)        a note is reachable in a source if some sentence
//                         carries both ends' word-features.
//   ARM B (ordered read)  a note is reachable if some EDGE in that source has
//                         its resolved FACES matching the note's ends.
//
// B minus A is what ordered reading recovers, and the null says whether it is
// recovering signal or just matching more often.
//
//   env: SOURCES (16) · DRAWS (20)
import { readFileSync, writeFileSync } from "node:fs";
import { walkFaces, describeWalkGap } from "./lib/walk-fixtures.mjs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const HERE = new URL("./", import.meta.url).pathname;
const NSOURCES = Number(process.env.SOURCES ?? 16);
const DRAWS = Number(process.env.DRAWS ?? 20);

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { chunkSource, tokenize, blankLabelRows, measureOf, blankBelowMeasure } = await import(`${NATIVE}/organs/source.js`);
const { endsCopresentWindow, textFeatures, sharedTextGroups, distinctSources } = await import(`${NATIVE}/organs/corroboration.js`);
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
// The fixture rule (the-fold P95 / S65, lib/walk-fixtures.mjs): a face the
// walk names and this checkout lacks is a typed gap and a non-zero exit —
// never a narrowed pool. The 2026-09-05 audit found 86 of the walk's 106
// faces untracked after this doc was written and this driver printing the
// same "16 independent sources" over the 20 that remained; disclosure came
// first, refusal now. The results doc is reproducible only where the walk's
// fixtures exist.
const walk = walkFaces(walkJson, FIX);
if (walk.gap) {
  console.log(describeWalkGap(walk.gap, { driver: "ordered-read-reach.mjs" }));
  process.exitCode = 2;
} else {
const faces = new Map();
for (const r of walkJson.real.rows) {
  if (!r.facePath) continue;
  if (!faces.has(r.facePath)) faces.set(r.facePath, { ref: r.facePath, host: r.host ?? "?", notes: 0 });
  faces.get(r.facePath).notes += 1;
}
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

// ── read each source ONCE, in order, keeping both the surface and the face ─
const perSource = new Map(); // ref -> { edges:[{s,o,sFace,oFace}], text }
const admitted = [];
let faced = 0, total = 0;
for (const s of sources) {
  const passages = chunkSource(s.ref, s.text);
  const rel = reader(passages, { pool: passages });
  const edges = (rel.edges ?? []).map((e) => {
    total += 1; if (e.end1Face || e.end2Face) faced += 1;
    return { s: e.end1, o: e.end2, sFace: e.end1Face ?? null, oFace: e.end2Face ?? null };
  });
  perSource.set(s.ref, { edges, text: s.text });
  for (const p of passages) {
    const cl = (rel.read(String(p.text ?? ""))?.claims ?? []).filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
    if (cl.length) admitted.push({ witness: `${p.ref ?? s.ref}~walls-v1`, edges: cl });
  }
}
console.log(`${sources.length} sources; ${total} edges, ${faced} carrying a resolved referent face (${(100 * faced / total).toFixed(1)}%)`);
console.log(`ZERO model calls from here.\n`);

const F = (t) => [...textFeatures(t)];
const overlaps = (a, b) => { const x = F(a), y = F(b); return x.length && y.length && x.some((w) => y.includes(w)); };

function reach(edgeSets) {
  let log = hl.createHyperlexicon({ frame: { probe: "ordered-read" } });
  for (const a of edgeSets) log = hl.admit(log, a.edges, { witness: a.witness }).log;
  const notes = hl.foldHyperlexicon(log);
  let onlyA = 0, onlyB = 0, both = 0, neither = 0;
  for (const n of notes) {
    const own = distinctSources(n.witnesses ?? []);
    let a = false, b = false;
    for (const src of sources) {
      if (own.has(src.ref)) continue;               // a source cannot corroborate its own note
      const ps = perSource.get(src.ref);
      if (!a && endsCopresentWindow(ps.text, { end1: n.end1 ?? n.subject, end2: n.end2 ?? n.object }, { window: 400 })) a = true;
      if (!b) {
        for (const e of ps.edges) {
          // ARM B: the ends met through the RESOLVED referent — the thing the
          // reader only has because it read what came before.
          const sHit = e.sFace && overlaps(e.sFace, n.end1 ?? n.subject);
          const oHit = (e.oFace && overlaps(e.oFace, n.end2 ?? n.object)) || overlaps(e.o, n.end2 ?? n.object);
          if (sHit && oHit) { b = true; break; }
        }
      }
      if (a && b) break;
    }
    if (a && b) both += 1; else if (a) onlyA += 1; else if (b) onlyB += 1; else neither += 1;
  }
  return { notes: notes.length, onlyA, onlyB, both, neither, A: onlyA + both, B: onlyB + both };
}

const real = reach(admitted);
console.log(`REAL  notes ${real.notes}`);
console.log(`  reachable by LOOKUP  (A, copresent window): ${real.A}`);
console.log(`  reachable by ORDERED READ (B, via face):    ${real.B}`);
console.log(`  A only ${real.onlyA} · both ${real.both} · B ONLY ${real.onlyB} · neither ${real.neither}`);
console.log(`  -> ordered reading recovers ${real.onlyB} notes the window cannot see\n`);

const draws = [];
for (let d = 1; d <= DRAWS; d += 1) {
  let st = (d >>> 0) || 1;
  const rnd = () => ((st = (st * 1664525 + 1013904223) >>> 0) / 4294967296);
  const copy = admitted.map((a) => ({ witness: a.witness, edges: a.edges.map((e) => ({ ...e })) }));
  const flat = copy.flatMap((a) => a.edges);
  const objs = flat.map((e) => e.object);
  for (let i = objs.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [objs[i], objs[j]] = [objs[j], objs[i]]; }
  flat.forEach((e, i) => { e.object = objs[i]; });
  draws.push(reach(copy));
  process.stdout.write(`  draw ${d}: B-only ${draws.at(-1).onlyB}   \r`);
}
const col = (k) => draws.map((x) => x[k]).sort((a, b) => a - b);
const q = (a) => `median ${a[a.length >> 1]} (${a[0]}–${a.at(-1)})`;
const bo = col("onlyB"), B = col("B"), A = col("A");
console.log(`\nNULL (${DRAWS} draws, object deranged — marginals kept, relation destroyed)`);
console.log(`  A  reachable by lookup:       real ${real.A}   redealt ${q(A)}`);
console.log(`  B  reachable by ordered read: real ${real.B}   redealt ${q(B)}`);
console.log(`  B ONLY (what order recovers): real ${real.onlyB}   redealt ${q(bo)}`);
const ab = A.filter((x) => x >= real.A).length, bb = B.filter((x) => x >= real.B).length, ob = bo.filter((x) => x >= real.onlyB).length;
console.log(`\n  draws at or above real —  A: ${ab}/${DRAWS} (p≈${((ab + 1) / (DRAWS + 1)).toFixed(3)})   B: ${bb}/${DRAWS} (p≈${((bb + 1) / (DRAWS + 1)).toFixed(3)})   B-only: ${ob}/${DRAWS} (p≈${((ob + 1) / (DRAWS + 1)).toFixed(3)})`);
writeFileSync(`${HERE}results/ordered-read-reach.json`, JSON.stringify({ sources: sources.length, edges: total, faced, real, draws, calls: 0 }, null, 2));
}
