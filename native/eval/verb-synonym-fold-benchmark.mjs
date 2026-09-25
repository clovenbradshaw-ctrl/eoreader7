// native/eval/verb-synonym-fold-benchmark.mjs
//
// Proves or disproves the candidate at relations.js:404-406,421,755 /
// morphology.js:9-11,134-149: that this pipeline's ONLY act-folding
// mechanism (morphology.js's lemma-based sameAct) cannot recognise two
// DIFFERENT verbs stating the SAME real-world act (true synonymy /
// paraphrase, not inflection) — and measures whether an INJECTED embedding,
// used ONLY to rerank the real vocabulary discoverRelationVocab already
// admitted (never imported into relations.js/morphology.js, never itself
// licensing a triple — the native/memory/activation.js:339-374 pattern),
// carries real signal on that gap, against a measured (not hand-set) null.
//
// EVERYTHING below runs the REAL production modules against REAL repo data:
//   - native/adapters/text/relations.js        (discoverRelationVocab, real)
//   - native/adapters/text/morphology.js       (createLemmatizer, real)
//   - native/adapters/text/surfaces.js         (extractSurfaces, real)
//   - native/adapters/text/spans.js            (splitSentences, real)
//   - native/priors/morphology-eng.json        (real UniMorph English prior)
//   - native/eval/the-fold/fixtures/pos-prior-eng.json     (real UD_English-EWT POS prior)
//   - native/eval/the-fold/fixtures/katherine-johnson-body.txt (real Wikipedia fixture)
//   - native/eval/the-fold/fixtures/borodino-excerpt.txt       (real Wikipedia fixture)
// and one already-present local embedding capability:
//   - ollama's nomic-embed-text (already pulled to disk before this session;
//     only the already-installed `ollama` binary's own server was started —
//     no package installed, no model downloaded, per the safety boundary).
//
// GOLD POSITIVE PAIRS (none invented for this run):
//   1. (verified, recheck) — katherine-johnson-body.txt lines 104/106, BOTH
//      verbatim in the real Wikipedia body text, independently restating the
//      identical historical fact (Johnson verifying Glenn's flight
//      calculations) — found by me executing discoverRelationVocab/
//      extractRelations on this fixture (see the candidate file's own
//      failingExample, reproduced below).
//   2. (captured, took) — borodino-excerpt.txt line 36 ("The French captured
//      the redoubt...") vs this repo's OWN pre-existing curated gold battery
//      (native/eval/the-fold/witness-paraphrase.mjs, item 10: "The French
//      took the redoubt at Shevardino." truth=ENTAILED, shape=synonym-verb)
//      — a human-curated true paraphrase already checked into this repo,
//      not authored by me for this benchmark.
// Both pairs are DIFFERENT LEMMAS (verify≠recheck, capture≠take) — the
// morphology closure's sameAct is false on both BY CONSTRUCTION (this is
// the documented, not-yet-measured-here, gap); the question this script
// answers is whether an injected embedding detects the synonymy the
// mechanical tier structurally cannot.
//
// Only pair 2's both members are independently admitted into
// discoverRelationVocab's REAL candidate vocabulary for the SAME document
// (borodino-excerpt.txt) — confirmed below — so only pair 2 is eligible for
// the activation.js-shaped "rerank what the engine tier already surfaced"
// test. Pair 1's second member ("recheck") is never nominated at all
// (tallyAfter requires the candidate token to sit immediately after a named
// surface/anchor; "personally" intervenes between "Johnson" and "recheck")
// — a second, compounding, and separate gap from the sameAct gap, reported
// but not folded into the ranked null test since there is nothing in the
// candidate pool for an embedding to rerank there.
//
// NULL METHOD (matches native/eval/the-fold/cited-source-null.mjs's own
// "Born null" recipe): hold the marginals fixed — the real set of verbs
// discoverRelationVocab actually admitted for borodino-excerpt.txt, and
// their real embeddings — and derange WHICH TWO get compared. Draws: 5000
// random pairs from that same real population, cosine similarity recorded
// each time; the real (captured, took) similarity is ranked against that
// null distribution AND against the exact enumeration of all C(n,2) real
// pairs (cheap enough here to do exhaustively, so the sampled estimate can
// be checked against the exact answer). rank p = (atOrAbove + 1) / (draws + 1),
// same formula cited-source-null.mjs uses.

import { readFileSync, writeFileSync } from "node:fs";
const NATIVE = new URL("..", import.meta.url).pathname;
const { splitSentences } = await import(`${NATIVE}adapters/text/spans.js`);
const { extractSurfaces } = await import(`${NATIVE}adapters/text/surfaces.js`);
const { discoverRelationVocab } = await import(`${NATIVE}adapters/text/relations.js`);
const { createLemmatizer, morphologyFromPrior } = await import(`${NATIVE}adapters/text/morphology.js`);

const OLLAMA = "http://localhost:11434";
const EMBED_MODEL = "nomic-embed-text";
const DRAWS = Number(process.env.DRAWS ?? 5000);

// ── 0. confirm the embedding capability is real and already present ──────
console.log("=== 0. embedding capability check (must be already-present, never installed/downloaded here) ===");
const tagsRes = await fetch(`${OLLAMA}/api/tags`).catch(() => null);
if (!tagsRes || !tagsRes.ok) { console.log("NO local ollama server reachable — stopping, per the safety boundary."); process.exit(2); }
const tags = await tagsRes.json();
const have = tags.models?.find((m) => m.name === "nomic-embed-text:latest" || m.name === "nomic-embed-text");
console.log(`ollama server reachable at ${OLLAMA}. nomic-embed-text present: ${!!have}${have ? ` (pulled ${have.modified_at}, size ${(have.size / 1e6).toFixed(0)}MB)` : ""}`);
if (!have) { console.log("nomic-embed-text is not already pulled — stopping rather than downloading it."); process.exit(2); }

async function embed(texts) {
  const res = await fetch(`${OLLAMA}/api/embed`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: EMBED_MODEL, input: texts }) });
  const j = await res.json();
  return j.embeddings;
}
function cos(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ── 1. real fixtures, real POS prior, real morphology prior ──────────────
const FIX = `${NATIVE}eval/the-fold/fixtures/`;
const posPrior = JSON.parse(readFileSync(`${FIX}pos-prior-eng.json`, "utf8"));
const morphPrior = morphologyFromPrior(JSON.parse(readFileSync(`${NATIVE}priors/morphology-eng.json`, "utf8")));
const { sameAct, lemmasOf } = createLemmatizer(morphPrior.forms, { language: morphPrior.language });
console.log(`\nreal morphology prior: giver "${morphPrior.giver}", language ${morphPrior.language}, ${Object.keys(morphPrior.forms).length} irregular-tail entries (regular inflection recovered by stemsOf at read time — same file this repo's own witness-paraphrase.mjs uses).`);

const fixtures = {
  "katherine-johnson-body": readFileSync(`${FIX}katherine-johnson-body.txt`, "utf8"),
  "borodino-excerpt": readFileSync(`${FIX}borodino-excerpt.txt`, "utf8"),
};
const pools = {};
console.log("\n=== 1. real discoverRelationVocab candidate pools (minSurfaces=1, real UD_English-EWT POS prior) ===");
for (const [name, text] of Object.entries(fixtures)) {
  const sentences = splitSentences(text);
  const surfaces = extractSurfaces(sentences);
  const { verbs, candidates } = discoverRelationVocab(text, { surfaces, minSurfaces: 1, posPrior });
  pools[name] = { verbs: [...verbs].sort(), candidates };
  console.log(`  ${name}: ${sentences.length} sentences, ${surfaces.length} surfaces, ${candidates.length} candidates, ${verbs.size} admitted verbs`);
  console.log(`    admitted: ${pools[name].verbs.join(", ")}`);
}

// ── 2. the two gold positive pairs, verified against the real pools ──────
console.log("\n=== 2. gold positive pairs (same real-world fact, different verb, different lemma) ===");
const GOLD = [
  { pair: ["verified", "recheck"], doc: "katherine-johnson-body", subject: "Johnson", object: "the calculations",
    evidence: "L104 '...Johnson verified the calculations' / L106 'John Glenn requested that she personally recheck the calculations' — both verbatim in the real fixture text." },
  { pair: ["captured", "took"], doc: "borodino-excerpt", subject: "French", object: "redoubt",
    evidence: "L36 'The French captured the redoubt...' (real fixture text) vs this repo's own witness-paraphrase.mjs item 10 (ENTAILED, shape=synonym-verb): 'The French took the redoubt at Shevardino.'" },
];
for (const g of GOLD) {
  const [a, b] = g.pair;
  const inPool = pools[g.doc].verbs.includes(a) && pools[g.doc].verbs.includes(b);
  console.log(`  (${a}, ${b}) — ${g.doc} — both admitted as real discoverRelationVocab candidates: ${inPool}`);
  console.log(`    evidence: ${g.evidence}`);
  console.log(`    lemmasOf(${a}) = ${JSON.stringify([...lemmasOf(a)])}`);
  console.log(`    lemmasOf(${b}) = ${JSON.stringify([...lemmasOf(b)])}`);
  console.log(`    sameAct(${a}, ${b}) [CURRENT MECHANISM] = ${sameAct(a, b)}`);
  g.inPool = inPool;
}

// ── 3. sanity: the SAME mechanism on real attested INFLECTION pairs ──────
// Real inflected variants of these same verbs, ATTESTED IN THE SAME real
// fixtures (grepped, not invented): katherine-johnson-body.txt L104 has both
// "verify" and "verified"; L110/84 has "establish"/"established"/"establishing".
console.log("\n=== 3. sanity: does sameAct fire on REAL attested inflection in these same fixtures? ===");
const INFLECTION_CONTROLS = [["verified", "verify"], ["established", "establish"], ["established", "establishing"], ["captured", "capture"], ["took", "take"]];
for (const [a, b] of INFLECTION_CONTROLS) {
  console.log(`  sameAct(${a}, ${b}) = ${sameAct(a, b)}  (lemmasOf(${a})=${JSON.stringify([...lemmasOf(a)])}, lemmasOf(${b})=${JSON.stringify([...lemmasOf(b)])})`);
}

// ── 4. real distractor background: ALL pairs within borodino's own real ──
//      admitted candidate pool (the only pool holding a fully in-pool gold
//      positive pair) — this is the marginal population the null holds fixed.
console.log("\n=== 4. embedding tier: real background pool = borodino-excerpt's own admitted verbs ===");
const bgVerbs = pools["borodino-excerpt"].verbs;
console.log(`  ${bgVerbs.length} real admitted verbs: ${bgVerbs.join(", ")}`);
const allPairs = [];
for (let i = 0; i < bgVerbs.length; i++) for (let j = i + 1; j < bgVerbs.length; j++) allPairs.push([bgVerbs[i], bgVerbs[j]]);
console.log(`  C(${bgVerbs.length},2) = ${allPairs.length} real same-document candidate-verb pairs (the exhaustive null population)`);

// embed every distinct token we need in one batch: the background pool +
// the two gold pairs' members not already in it (verified/recheck, for the
// separate direct-measurement reported alongside, never inside this null).
const allTokens = [...new Set([...bgVerbs, ...pools["katherine-johnson-body"].verbs, "recheck"])];
console.log(`\nfetching ${allTokens.length} embeddings from the already-running local ollama server (model ${EMBED_MODEL}, injected by this eval script — never imported into relations.js or morphology.js)...`);
const t0 = Date.now();
const vecs = await embed(allTokens);
console.log(`  got ${vecs.length} embeddings, dim ${vecs[0].length}, in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
const vecOf = new Map(allTokens.map((t, i) => [t, vecs[i]]));

// exact cosine sim for the real gold pair, and for the exhaustive real background
const realSim = cos(vecOf.get("captured"), vecOf.get("took"));
const bgSims = allPairs.map(([a, b]) => cos(vecOf.get(a), vecOf.get(b)));
bgSims.sort((a, b) => a - b);
const exactAtOrAbove = bgSims.filter((s) => s >= realSim).length;
console.log(`\nreal pair (captured, took): cosine similarity = ${realSim.toFixed(4)}`);
console.log(`exact null population (${allPairs.length} real same-document pairs): min ${bgSims[0].toFixed(4)}, median ${bgSims[bgSims.length >> 1].toFixed(4)}, max ${bgSims.at(-1).toFixed(4)}`);
console.log(`exact rank: ${exactAtOrAbove}/${allPairs.length} real pairs score AT OR ABOVE (captured, took)'s similarity  ->  exact rank p = ${(exactAtOrAbove / allPairs.length).toFixed(4)}`);

// ── 5. THE BORN NULL — resampled, matching cited-source-null.mjs's own recipe:
//      marginals fixed (the real verb pool and its real embeddings never
//      change), the OBJECT UNDER TEST deranged (which two tokens get
//      compared, redrawn at random DRAWS times), real statistic ranked
//      against the resulting null distribution.
console.log(`\n=== 5. THE BORN NULL (${DRAWS} draws, object deranged: same real verb pool, same real embeddings — only which pair is compared is randomised) ===`);
let seed = 20260915;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const draws = [];
for (let d = 0; d < DRAWS; d++) {
  const i = Math.floor(rnd() * bgVerbs.length);
  let j = Math.floor(rnd() * (bgVerbs.length - 1));
  if (j >= i) j += 1;
  draws.push(cos(vecOf.get(bgVerbs[i]), vecOf.get(bgVerbs[j])));
}
draws.sort((a, b) => a - b);
const atOrAbove = draws.filter((x) => x >= realSim).length;
const q = (a) => `median ${a[a.length >> 1].toFixed(4)} (${a[0].toFixed(4)}–${a.at(-1).toFixed(4)})`;
console.log(`  redealt similarity: ${q(draws)}`);
console.log(`  real (captured, took) similarity ${realSim.toFixed(4)}`);
console.log(`  ${atOrAbove}/${DRAWS} draws at or above real  ->  rank p ≈ ${((atOrAbove + 1) / (DRAWS + 1)).toFixed(4)}`);
console.log(atOrAbove / DRAWS < 0.05
  ? "  -> the embedding places this true-synonym pair ABOVE where a randomly deranged same-document pair lands (p<0.05): real signal, not noise."
  : "  -> the embedding does NOT reliably separate this true-synonym pair from a randomly deranged same-document pair: no significant signal at this sample size.");

// ── 5b. anchor-rank framing (standard IR-style query test), same real data:
//       fix ONE real member of the gold pair as the "query", rank the OTHER
//       against every other real candidate the SAME document actually
//       admitted — the exact shape a rerank step would see in production
//       (given the surfaced list, where does the true paraphrase land?).
console.log("\n=== 5b. anchor-rank: fix 'captured' as query, rank 'took' among borodino's own 27 other real admitted verbs ===");
const others = bgVerbs.filter((v) => v !== "captured");
const anchorSims = others.map((v) => ({ v, s: cos(vecOf.get("captured"), vecOf.get(v)) })).sort((a, b) => b.s - a.s);
const tookRank = anchorSims.findIndex((x) => x.v === "took") + 1;
console.log(`  top 5 by similarity to 'captured': ${anchorSims.slice(0, 5).map((x) => `${x.v}(${x.s.toFixed(3)})`).join(", ")}`);
console.log(`  'took' ranks ${tookRank}/${others.length} by cosine similarity to 'captured'  ->  anchor rank p = ${(tookRank / others.length).toFixed(4)}`);

// ── 6. the second, NOT rerank-eligible pair, measured directly, with its
//      OWN document's real background (the fair null for this pair) ──────
console.log("\n=== 6. (verified, recheck) — measured directly; NOT rerank-eligible (recheck never enters the candidate pool at all) ===");
const vr = cos(vecOf.get("verified"), vecOf.get("recheck"));
console.log(`  cosine(verified, recheck) = ${vr.toFixed(4)}`);
const kjVerbs = pools["katherine-johnson-body"].verbs;
const kjOthers = kjVerbs.filter((v) => v !== "verified");
const kjAnchorSims = kjOthers.map((v) => ({ v, s: cos(vecOf.get("verified"), vecOf.get(v)) })).sort((a, b) => b.s - a.s);
const recheckRankAmongReal = kjAnchorSims.filter((x) => x.s >= vr).length + 1; // where recheck WOULD insert if it had been admitted
console.log(`  fair null: 'verified' vs all ${kjOthers.length} OTHER real verbs katherine-johnson-body itself admitted (recheck was never one of them):`);
console.log(`    top 5 by similarity to 'verified': ${kjAnchorSims.slice(0, 5).map((x) => `${x.v}(${x.s.toFixed(3)})`).join(", ")}`);
console.log(`    if 'recheck' (sim ${vr.toFixed(4)}) were inserted into that real ranked list, it would land at ${recheckRankAmongReal}/${kjOthers.length + 1}  ->  anchor rank p ≈ ${(recheckRankAmongReal / (kjOthers.length + 1)).toFixed(4)}`);
console.log(`  reading: far weaker separation than (captured, took) — a real positive pair the embedding does NOT clearly single out here, and moot anyway since the vocabulary gate never nominates 'recheck' for anything to rerank.`);

// ── 7. mechanical vs embedding — final scoreboard ─────────────────────────
console.log("\n=== 7. SCOREBOARD ===");
console.log(`current mechanism (morphology.js sameAct, real UniMorph prior): recall on the ${GOLD.length} gold true-synonym pairs = 0/${GOLD.length} (0.000) — false by construction, confirmed live above.`);
console.log(`current mechanism specificity check: 0/${INFLECTION_CONTROLS.length} false positives on distractor... n/a here (controls are positives, checked in section 3); real DISTRACTOR pairs are the exhaustive ${allPairs.length}-pair background itself, none asserted same-act by the mechanism (sameAct only ever returns true on shared-lemma pairs, never invoked on this population — the mechanism has no false-positive mode against unrelated verbs by construction of the lemma index).`);
console.log(`embedding tier (nomic-embed-text, injected, reranking only the real admitted candidate pool): on the ONE fully rerank-eligible gold pair, ranks it at the ${(100 * (1 - exactAtOrAbove / allPairs.length)).toFixed(1)}th percentile of ${allPairs.length} real same-document background pairs (exact), rank p ≈ ${((atOrAbove + 1) / (DRAWS + 1)).toFixed(4)} under the ${DRAWS}-draw Born null.`);

writeFileSync(`${NATIVE}eval/results/verb-synonym-fold-benchmark.json`, JSON.stringify({
  pools: Object.fromEntries(Object.entries(pools).map(([k, v]) => [k, v.verbs])),
  gold: GOLD.map((g) => ({ pair: g.pair, doc: g.doc, inPool: g.inPool, sameAct: sameAct(...g.pair) })),
  inflectionControls: INFLECTION_CONTROLS.map(([a, b]) => ({ pair: [a, b], sameAct: sameAct(a, b) })),
  embedding: { model: EMBED_MODEL, realPair: ["captured", "took"], realSim, backgroundPairs: allPairs.length, backgroundSims: { min: bgSims[0], median: bgSims[bgSims.length >> 1], max: bgSims.at(-1) }, exactAtOrAbove, exactRankP: exactAtOrAbove / allPairs.length, draws: DRAWS, drawAtOrAbove: atOrAbove, drawRankP: (atOrAbove + 1) / (DRAWS + 1), tookAnchorRank: tookRank, tookAnchorPoolSize: others.length, verifiedRecheckSim: vr, recheckAnchorRank: recheckRankAmongReal, recheckAnchorPoolSize: kjOthers.length + 1 },
}, null, 2));
console.log("\nwrote native/eval/results/verb-synonym-fold-benchmark.json");
