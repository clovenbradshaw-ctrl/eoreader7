// kind-graph-embedding-rerank.mjs — an honest, run benchmark for the
// candidate finding against native/kernel/kind-graph-structure.js's
// `predicateSet` (lines ~115-118): raw-string `Set` membership treats two
// inflections of one lemma ("retreated"/"retreats") as two distinct
// predicates, inflating `relation_diversity_depth`.
//
// THREE TIERS, MEASURED IN ORDER, ON REAL DATA — no synthetic examples:
//
//   TIER 0 (CURRENT MECHANISM). The real, UNMODIFIED
//   createKindGraphStructureLedger from kind-graph-structure.js, imported
//   byte-identical, fed real EOHyperedge@1 edges built from real production
//   adapters (splitSentences/extractSurfaces/clearance/discoverRelationVocab
//   /extractRelations) over five already-committed Wikipedia fixtures
//   (native/eval/the-fold/fixtures/wikipedia-battle-of-*.html, etc).
//
//   TIER 1 (THE ALREADY-LICENSED MECHANICAL FIX, no embedding). The same
//   edges, replayed with predicate identity canonicalized by UniMorph lemma
//   (native/adapters/text/morphology.js's createLemmatizer, over the
//   REAL, already-committed fixtures/unimorph-morphology-prior.json — the
//   exact organ hypergraph.js already uses for the identical failure
//   class). This measures the real size of the inflection defect on real
//   material, per this repo's "no hand-set thresholds, prefer a measured
//   null" rule — no threshold is invented, the fixture's own lemma table is
//   the ground truth.
//
//   TIER 2 (EMBEDDING-AUGMENTED RERANK, activation.js's exact discipline).
//   nomic-embed-text, ALREADY installed and ALREADY running locally via
//   Ollama in this environment (no download, no new package) — INJECTED
//   into this benchmark script only, never imported into
//   kind-graph-structure.js itself. It reranks ONLY the small residual set
//   of same-entity predicate-lemma-groups Tier 1 already surfaced as
//   distinct (the "handful" activation.js's header says is free to rerank
//   quadratically) — it never retrieves or decides Set membership on its
//   own. Significance is established the way this repo's own
//   cited-source-null.mjs does: derange which embedding vector is attached
//   to which predicate label (holding fixed the graph structure — which
//   predicate pairs co-occur on which entity), recompute the statistic
//   under many derangements, and compare the real statistic to that null
//   distribution. No hand-picked similarity cutoff anywhere.
//
// Two null-comparisons are run: a POSITIVE CONTROL (known same-lemma pairs
// Tier 1 already merges — genuinely one act) to confirm the null method
// actually discriminates before trusting it on anything, and the REAL TEST
// (Tier-1-residual cross-lemma pairs) — the actual claim under test.

import { readFileSync, writeFileSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const HERE = new URL("./", import.meta.url).pathname;

const { splitSentences } = await import(`${NATIVE}adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, diaNorm } = await import(`${NATIVE}adapters/text/surfaces.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}adapters/text/relations.js`);
const { extractReadable } = await import(`${NATIVE}organs/web.js`);
const { hyperedge } = await import(`${NATIVE}kernel/hypergraph.js`);
const { createKindGraphStructureLedger } = await import(`${NATIVE}kernel/kind-graph-structure.js`);
const { createLemmatizer, morphologyFromPrior } = await import(`${NATIVE}adapters/text/morphology.js`);
const clearanceUrl = new URL("../../../../the-fold/clearance.js", import.meta.url).pathname;
const { makeClearance } = await import(clearanceUrl);

const OLLAMA = "http://localhost:11434";
const EMBED_MODEL = "nomic-embed-text";
const PERMUTATIONS = Number(process.env.PERMUTATIONS ?? 2000);
const SEED = Number(process.env.SEED ?? 20260915);

// deterministic PRNG (mulberry32) — reproducible null, no hidden randomness
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(SEED);
function shuffled(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ── real material: five already-committed Wikipedia fixtures ────────────
const FILES = [
  "wikipedia-battle-of-borodino.html",
  "wikipedia-battle-of-austerlitz.html",
  "wikipedia-battle-of-gettysburg.html",
  "wikipedia-war-of-the-third-coalition.html",
  "wikipedia-american-civil-war.html",
];

const posPrior = JSON.parse(readFileSync(`${FIX}pos-prior-eng.json`, "utf8"));
const verbForms = new Set(JSON.parse(readFileSync(`${FIX}unimorph-eng-verb-forms.json`, "utf8")));

const REAL_EDGES = [];
let globalSeq = 0;
const perFileStats = [];

for (const file of FILES) {
  const docTag = file.replace(/\.html$/, "");
  const html = readFileSync(`${FIX}${file}`, "utf8");
  const text = extractReadable(html).text;
  const sentences = splitSentences(text);
  const presence = extractSurfaces(sentences);
  const clearance = makeClearance({ splitSentences, extractSurfaces, discoverReferents });
  const ledger = clearance.clearFigures(text);
  const estSurfaces = new Map();
  for (const e of ledger.established) for (const s of e.surfaces) estSurfaces.set(diaNorm(s), `${docTag}::${e.referentId}`);

  const vocab = discoverRelationVocab(text, { surfaces: presence, minSurfaces: 1, posPrior, verbForms });
  const rels = extractRelations(text, { verbs: vocab.verbs, limit: 50000 });

  let admitted = 0;
  for (const rel of rels) {
    const subjRef = estSurfaces.get(diaNorm(rel.subject));
    const objRef = estSurfaces.get(diaNorm(String(rel.object)));
    const participants = [];
    if (subjRef) participants.push({ ref: subjRef, occurrence: null, role: "subject", standing: "referent", surface: rel.subject });
    if (objRef && objRef !== subjRef) participants.push({ ref: objRef, occurrence: null, role: "object", standing: "referent", surface: String(rel.object) });
    if (!participants.length) continue;
    const id = `bench-edge-${globalSeq}`;
    REAL_EDGES.push(hyperedge({
      id,
      relation: rel.verb, // RAW, byte-identical to what native/adapters/text/recursive.js:597 passes in production — no case-fold, no lemma-fold.
      participants,
      witness: null,
      scope: { sequencePosition: globalSeq },
      eo: { op: "CON", grain: "Figure" },
    }));
    globalSeq += 1;
    admitted += 1;
  }
  perFileStats.push({ file, chars: text.length, sentences: sentences.length, established: ledger.established.length, verbs: vocab.verbs.size, relsFound: rels.length, edgesAdmitted: admitted });
}

console.log("=== STAGE 0 — real material ===");
for (const s of perFileStats) console.log(`  ${s.file}: ${s.chars} chars, ${s.sentences} sentences, ${s.established} established referents, ${s.verbs} discovered verbs, ${s.relsFound} relations extracted, ${s.edgesAdmitted} admitted as hyperedges (subject and/or object resolved to an established referent)`);
console.log(`  TOTAL real hyperedges fed to createKindGraphStructureLedger: ${REAL_EDGES.length}`);
console.log();

// ── TIER 0 — the real, unmodified production ledger ──────────────────────
const DEPTH_THRESHOLDS = [2, 3, 4, 5, 6, 8, 16];
const ledger = createKindGraphStructureLedger({ depthThresholds: DEPTH_THRESHOLDS });
ledger.ingest(REAL_EDGES);
const allFeatures = ledger.allFeatures();
const diversityFeatures = allFeatures.filter((f) => f.featureKey === "relation_diversity_depth");
const diag = ledger.diagnostics();
console.log("=== STAGE 1 — TIER 0: current mechanism (real, unmodified kind-graph-structure.js) ===");
console.log(`  ledger diagnostics: ${JSON.stringify(diag)}`);
console.log(`  relation_diversity_depth emissions (current mechanism, raw string Set): ${diversityFeatures.length}`);
console.log(`  by entity: ${JSON.stringify(diversityFeatures.map((f) => `${f.entityRef}=${f.featureValue}`))}`);
console.log();

// ── independent replay: exact mirror of lines 115-118, to inspect the raw
// predicate contents the ledger's own closed API does not expose, and to
// simulate the SAME threshold-crossing logic under alternative key functions
// (raw / lemma-canonical) for a controlled, honest A/B/C comparison. ─────
function simulate(edges, keyFn) {
  const sets = new Map(); // entityRef -> Set(key)
  const crossings = []; // {entityRef, size, sequencePosition}
  const membership = new Map(); // entityRef -> [{key, rawRelation}] insertion order
  const sorted = [...edges].sort((a, b) => a.scope.sequencePosition - b.scope.sequencePosition);
  for (const edge of sorted) {
    for (const p of edge.participants) {
      const entityRef = p.ref;
      if (!sets.has(entityRef)) { sets.set(entityRef, new Set()); membership.set(entityRef, []); }
      const set = sets.get(entityRef);
      const key = keyFn(edge.relation);
      const before = set.size;
      if (!set.has(key)) membership.get(entityRef).push({ key, rawRelation: edge.relation });
      set.add(key);
      if (set.size > before && DEPTH_THRESHOLDS.includes(set.size)) {
        crossings.push({ entityRef, size: set.size, sequencePosition: edge.scope.sequencePosition });
      }
    }
  }
  return { sets, crossings, membership };
}

const rawReplay = simulate(REAL_EDGES, (r) => r);
console.log("=== STAGE 2 — sanity check: independent replay vs the real module ===");
console.log(`  independent raw-string replay crossings: ${rawReplay.crossings.length} (real module emitted: ${diversityFeatures.length}) — ${rawReplay.crossings.length === diversityFeatures.length ? "MATCH" : "MISMATCH (investigate before trusting anything below)"}`);
console.log();

// ── TIER 1 — the already-licensed mechanical fix: UniMorph lemma canon ──
const rawPrior = JSON.parse(readFileSync(`${FIX}unimorph-morphology-prior.json`, "utf8"));
const prior = morphologyFromPrior(rawPrior);
const lemmatizer = createLemmatizer(prior.forms, { language: prior.language });
console.log("=== STAGE 3 — TIER 1: lemma-canonicalized mechanism (real UniMorph prior, no embedding) ===");
console.log(`  lemmatizer: priorSize=${lemmatizer.size} gap=${JSON.stringify(lemmatizer.gap)}`);

// lemma-group an entity's raw predicate strings via union-by-sameAct
function lemmaGroup(rawStrings) {
  const groups = []; // [{rep, members:[raw...]}]
  for (const raw of rawStrings) {
    const lower = raw.toLowerCase();
    let placed = false;
    for (const g of groups) {
      if (lemmatizer.sameAct(lower, g.repLower)) { g.members.push(raw); placed = true; break; }
    }
    if (!placed) groups.push({ repLower: lower, rep: raw, members: [raw] });
  }
  return groups;
}

// Build a stable per-entity lemma-canonical key: first-seen group representative.
const entityLemmaGroups = new Map(); // entityRef -> groups (computed once, on the FULL raw membership, for reporting)
for (const [entityRef, entries] of rawReplay.membership) {
  const rawStrings = entries.map((e) => e.rawRelation);
  entityLemmaGroups.set(entityRef, lemmaGroup(rawStrings));
}

// key function usable by simulate(): map a raw relation string to its entity-scoped
// lemma-group representative — but simulate() is entity-agnostic per call, so we
// build a GLOBAL raw->lemma canonical map instead (lemma identity does not depend on
// which entity uttered it), which is exactly what an injected `sameAct`-based
// canonicalizer in kind-graph-structure.js itself would do.
const globalLemmaRep = new Map(); // lower raw -> canonical rep (first-seen form sharing that lemma cluster)
const globalLemmaClusters = new Map(); // rep -> Set(member raw lowers)
{
  const seenReps = [];
  const allRaw = new Set(REAL_EDGES.map((e) => e.relation));
  for (const raw of allRaw) {
    const lower = raw.toLowerCase();
    let rep = seenReps.find((r) => lemmatizer.sameAct(lower, r));
    if (!rep) { rep = lower; seenReps.push(rep); }
    globalLemmaRep.set(raw, rep);
    if (!globalLemmaClusters.has(rep)) globalLemmaClusters.set(rep, new Set());
    globalLemmaClusters.get(rep).add(lower);
  }
}
// Corpus-wide (not entity-scoped) same-lemma pairs — every pair of DISTINCT
// raw surface forms anywhere in the corpus that UniMorph says share a lemma.
// Broader validity check for the null method than the single within-entity
// merge below (that one stays as the strict, entity-scoped positive control
// the candidate's own defect describes; this is a supplementary, more
// data-rich calibration of the SAME embedding+null machinery).
const corpusWideSameLemmaPairs = [];
for (const [rep, members] of globalLemmaClusters) {
  const arr = [...members];
  if (arr.length < 2) continue;
  for (let i = 0; i < arr.length; i += 1) for (let j = i + 1; j < arr.length; j += 1) corpusWideSameLemmaPairs.push({ entityRef: "(corpus-wide, no single entity)", a: arr[i], b: arr[j] });
}
const lemmaReplay = simulate(REAL_EDGES, (r) => globalLemmaRep.get(r) ?? r.toLowerCase());
console.log(`  TIER 1 relation_diversity_depth-equivalent crossings (lemma-canonical Set): ${lemmaReplay.crossings.length}`);
console.log(`  deflation from TIER 0 -> TIER 1: ${rawReplay.crossings.length - lemmaReplay.crossings.length} fewer threshold crossings purely from UniMorph-attested inflection/case folding`);

// Report concrete entities where raw-string diversity size differs from lemma-group count
const inflatedEntities = [];
for (const [entityRef, groups] of entityLemmaGroups) {
  const rawCount = rawReplay.sets.get(entityRef)?.size ?? 0;
  const lemmaCount = groups.length;
  if (rawCount > lemmaCount) {
    const mergedExamples = groups.filter((g) => g.members.length > 1).map((g) => g.members);
    inflatedEntities.push({ entityRef, rawCount, lemmaCount, mergedExamples });
  }
}
console.log(`  entities where raw distinct-predicate count > lemma-group count: ${inflatedEntities.length}`);
for (const e of inflatedEntities.slice(0, 15)) console.log(`    ${e.entityRef}: raw=${e.rawCount} lemma=${e.lemmaCount}  merges=${JSON.stringify(e.mergedExamples)}`);
console.log();

// ── TIER 2 — embedding-augmented rerank (nomic-embed-text via local Ollama) ──
console.log("=== STAGE 4 — TIER 2: embedding-augmented rerank (injected, activation.js discipline) ===");

async function embed(text) {
  const res = await fetch(`${OLLAMA}/api/embeddings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });
  if (!res.ok) throw new Error(`ollama embeddings HTTP ${res.status}`);
  const data = await res.json();
  return data.embedding;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i += 1) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// TIER-2 candidate pairs = residual cross-lemma-group pairs WITHIN one entity
// (exactly "what the mechanical [TIER 1] tier already surfaced as distinct" —
// activation.js's own phrase). Only entities with >=2 lemma groups matter.
const residualPairs = []; // {entityRef, a, b}
for (const [entityRef, groups] of entityLemmaGroups) {
  if (groups.length < 2) continue;
  const reps = groups.map((g) => g.rep.toLowerCase());
  for (let i = 0; i < reps.length; i += 1) for (let j = i + 1; j < reps.length; j += 1) {
    residualPairs.push({ entityRef, a: reps[i], b: reps[j] });
  }
}

// Positive control = known same-lemma pairs TIER 1 already merges (genuinely
// one act) — validates the null method discriminates before trusting it below.
const positivePairs = [];
for (const e of inflatedEntities) for (const group of e.mergedExamples) {
  for (let i = 0; i < group.length; i += 1) for (let j = i + 1; j < group.length; j += 1) {
    if (group[i].toLowerCase() !== group[j].toLowerCase()) positivePairs.push({ entityRef: e.entityRef, a: group[i].toLowerCase(), b: group[j].toLowerCase() });
  }
}

console.log(`  residual (TIER-1-distinct) within-entity predicate pairs to rerank: ${residualPairs.length}`);
console.log(`  positive-control (known same-lemma, TIER-1-merged) pairs: ${positivePairs.length}`);

if (residualPairs.length === 0 && positivePairs.length === 0) {
  console.log("  NOTHING TO RERANK on this real corpus — every entity's predicate set already has <2 distinct lemma groups, or no inflectional duplicates occurred. Stopping honestly rather than fabricating a signal.");
} else {
  // vocabulary pool for the derangement null: every distinct label appearing
  // in either pair set, PLUS a background pool of other verb lemma reps seen
  // anywhere in the corpus (so the permutation draws from a real, large pool,
  // not just the handful under test — a more conservative null).
  const pool = new Set();
  for (const p of [...residualPairs, ...positivePairs, ...corpusWideSameLemmaPairs]) { pool.add(p.a); pool.add(p.b); }
  for (const rep of new Set([...globalLemmaRep.values()])) pool.add(rep);
  const poolArr = [...pool];
  console.log(`  embedding vocabulary pool size (derangement domain): ${poolArr.length}`);

  const vectorCache = new Map();
  const t0 = Date.now();
  for (const label of poolArr) vectorCache.set(label, await embed(label));
  console.log(`  embedded ${poolArr.length} distinct labels via ${EMBED_MODEL} @ ${OLLAMA} in ${Date.now() - t0}ms`);

  function meanCosineForPairs(pairs, labelMap) {
    if (!pairs.length) return null;
    let sum = 0;
    for (const p of pairs) sum += cosine(vectorCache.get(labelMap.get(p.a) ?? p.a), vectorCache.get(labelMap.get(p.b) ?? p.b));
    return sum / pairs.length;
  }

  function runPermutationTest(pairs, label) {
    if (!pairs.length) return null;
    const identity = new Map(poolArr.map((l) => [l, l]));
    const realStat = meanCosineForPairs(pairs, identity);
    const nullStats = [];
    for (let t = 0; t < PERMUTATIONS; t += 1) {
      const perm = shuffled(poolArr);
      const map = new Map(poolArr.map((l, i) => [l, perm[i]]));
      nullStats.push(meanCosineForPairs(pairs, map));
    }
    nullStats.sort((a, b) => a - b);
    const ge = nullStats.filter((v) => v >= realStat).length;
    const pValue = (ge + 1) / (PERMUTATIONS + 1);
    const mean = nullStats.reduce((a, b) => a + b, 0) / nullStats.length;
    const variance = nullStats.reduce((a, b) => a + (b - mean) ** 2, 0) / nullStats.length;
    console.log(`  [${label}] n_pairs=${pairs.length} realMeanCos=${realStat.toFixed(4)} nullMean=${mean.toFixed(4)} nullSD=${Math.sqrt(variance).toFixed(4)} nullP5=${nullStats[Math.floor(0.05 * nullStats.length)].toFixed(4)} nullP95=${nullStats[Math.floor(0.95 * nullStats.length)].toFixed(4)} permutations=${PERMUTATIONS} one-sided p=${pValue.toFixed(4)}`);
    return { realStat, nullMean: mean, nullSD: Math.sqrt(variance), pValue, n: pairs.length };
  }

  console.log();
  console.log("  -- TEST A (positive control: known same-lemma inflectional pairs — does the null method even discriminate?) --");
  const testA = runPermutationTest(positivePairs, "TEST A: same-lemma pairs (strict, within-entity) vs derangement null");
  if (positivePairs.length) {
    console.log("     example same-lemma pairs and their real cosine similarity:");
    for (const p of positivePairs.slice(0, 10)) console.log(`       "${p.a}" ~ "${p.b}"  cos=${cosine(vectorCache.get(p.a), vectorCache.get(p.b)).toFixed(4)}  (entity ${p.entityRef})`);
  }
  console.log();
  console.log(`  -- TEST A2 (supplementary, more data-rich validity check: ALL corpus-wide same-lemma pairs, not entity-scoped, n=${corpusWideSameLemmaPairs.length}) --`);
  const testA2 = runPermutationTest(corpusWideSameLemmaPairs, "TEST A2: corpus-wide same-lemma pairs vs derangement null");
  if (corpusWideSameLemmaPairs.length) {
    const withSim = corpusWideSameLemmaPairs.map((p) => ({ ...p, cos: cosine(vectorCache.get(p.a), vectorCache.get(p.b)) })).sort((a, b) => b.cos - a.cos);
    console.log("     all corpus-wide same-lemma pairs and their real cosine similarity:");
    for (const p of withSim) console.log(`       "${p.a}" ~ "${p.b}"  cos=${p.cos.toFixed(4)}`);
  }

  console.log();
  console.log("  -- TEST B (the actual claim: TIER-1-residual cross-lemma pairs — does the embedding rerank add real signal beyond the mechanical/lemma tier?) --");
  const testB = runPermutationTest(residualPairs, "TEST B: residual cross-lemma pairs vs derangement null");
  if (residualPairs.length) {
    const withSim = residualPairs.map((p) => ({ ...p, cos: cosine(vectorCache.get(p.a), vectorCache.get(p.b)) })).sort((a, b) => b.cos - a.cos);
    console.log("     top residual pairs by real cosine similarity (candidates the embedding tier would FLAG for disclosure, never silently merge):");
    for (const p of withSim.slice(0, 15)) console.log(`       "${p.a}" ~ "${p.b}"  cos=${p.cos.toFixed(4)}  (entity ${p.entityRef})`);
  }

  console.log();
  console.log("=== STAGE 5 — verdict ===");
  console.log(`  TIER 0 (current, raw string) relation_diversity_depth emissions: ${diversityFeatures.length}`);
  console.log(`  TIER 1 (lemma-canonical, no embedding) equivalent emissions:     ${lemmaReplay.crossings.length}  (deflation: ${diversityFeatures.length - lemmaReplay.crossings.length})`);
  if (testA) console.log(`  TIER 2 validity check (Test A, strict same-lemma vs null, n=${testA.n}): p=${testA.pValue.toFixed(4)} ${testA.pValue < 0.05 ? "— method DOES discriminate real linguistic sameness from chance" : "— method FAILED to discriminate even known-true pairs; do not trust Test B"}`);
  if (testA2) console.log(`  TIER 2 validity check (Test A2, corpus-wide same-lemma vs null, n=${testA2.n}): p=${testA2.pValue.toFixed(4)} ${testA2.pValue < 0.05 ? "— confirms A on a larger sample" : "— did not confirm A"}`);
  if (testB) console.log(`  TIER 2 real claim (Test B, residual cross-lemma vs null, n=${testB.n}):   p=${testB.pValue.toFixed(4)} ${testB.pValue < 0.05 ? "— embedding rerank shows a real signal beyond the lemma tier on this corpus" : "— NO significant signal beyond the lemma tier on this corpus (honest negative)"}`);

  writeFileSync(`${HERE}results/kind-graph-embedding-rerank.json`, JSON.stringify({
    generatedAt: new Date().toISOString(),
    sources: FILES,
    totalHyperedges: REAL_EDGES.length,
    tier0DiversityEmissions: diversityFeatures.length,
    tier1DiversityEmissions: lemmaReplay.crossings.length,
    deflation: diversityFeatures.length - lemmaReplay.crossings.length,
    inflatedEntities,
    testA, testA2, testB,
    embeddingModel: EMBED_MODEL,
    permutations: PERMUTATIONS,
    seed: SEED,
  }, null, 2));
  console.log();
  console.log(`  full results written to native/eval/the-fold/results/kind-graph-embedding-rerank.json`);
}
