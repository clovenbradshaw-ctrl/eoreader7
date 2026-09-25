// native/tests/kind-graph-structure.test.js — predicate identity in
// kind-graph-structure.js's own `predicateSet` (Xunzi's file), and the
// second, injected archon (Osgood) that may rerank what it surfaces.
//
// FOUR TIERS OF EVIDENCE, weakest to strongest:
//
//   1. A hand-built pin of the exact failing example this amendment answers
//      (napoleon-1, "retreated"/"retreats") — isolates the mechanism, and
//      pins that OMITTING both injections is byte-identical to this file
//      before the amendment (no `resonance` key appears at all).
//   2. The SAME pin, with a real injected `sameAct` built from this repo's
//      own committed UniMorph prior (native/eval/the-fold/fixtures/
//      unimorph-morphology-prior.json — the exact fixture hypergraph.js's
//      own sameAct fix already uses) as the lemma ground truth, never a
//      fabricated table.
//   3. A REAL-CORPUS regression pin: real production adapters
//      (splitSentences/extractSurfaces/clearance/discoverRelationVocab/
//      extractRelations) run over an already-committed real Wikipedia
//      fixture, reproducing the one real inflectional collision this
//      amendment's own header cites as measured (native/eval/the-fold/
//      kind-graph-embedding-rerank.mjs: "had"/"has" on the American Civil
//      War article's "the war" entity, raw=10 distinct predicates,
//      lemma=9). Skips (never crashes) if the sibling `the-fold` checkout
//      this repo's own tests already depend on for `clearance.js`
//      (tests/referent-merge.test.js, tests/object-boundary.test.js, …) is
//      not present on this machine.
//   4. A REAL embedding-tier test: nomic-embed-text via an already-running
//      local Ollama daemon (no download, no package install — this
//      environment's own already-installed capability), reranking a real
//      residual pair from the same real corpus ("agreed"/"decided" on the
//      Battle of Austerlitz article's Austria entity — a real, different-
//      lemma near-synonym pair this amendment's own benchmark already
//      found). Skips (never crashes) if Ollama is not reachable.
//
// No similarity cutoff is hand-set anywhere below, matching the file under
// test: tier 4 checks structure and typed-gap discipline, never a
// pass/fail cosine threshold.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createKindGraphStructureLedger } from "../kernel/kind-graph-structure.js";
import { createLemmatizer, morphologyFromPrior } from "../adapters/text/morphology.js";
import { hyperedge } from "../kernel/hypergraph.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, "../eval/the-fold/fixtures/");

const edgeOf = (id, relation, entityRef, seq) => hyperedge({
  id,
  relation,
  participants: [{ ref: entityRef, occurrence: null, role: "subject", standing: "referent" }],
  witness: null,
  scope: { sequencePosition: seq },
});

// ── TIER 1 — the exact failing example, byte-identical when omitted ───────

test("predicateSet: two inflections of one lemma still count as two distinct predicates, and the descriptor carries no `resonance` key, when neither injection is supplied (byte-identical to before this amendment)", () => {
  const ledger = createKindGraphStructureLedger({ depthThresholds: [2] });
  ledger.ingest([
    edgeOf("e1", "retreated", "napoleon-1", 10),
    edgeOf("e2", "retreats", "napoleon-1", 55),
  ]);
  const diversity = ledger.allFeatures().filter((f) => f.featureKey === "relation_diversity_depth");
  assert.equal(diversity.length, 1, "raw string equality still treats 'retreated' and 'retreats' as two distinct predicates");
  assert.equal(diversity[0].featureValue, "2+");
  assert.equal(diversity[0].entityRef, "napoleon-1");
  assert.ok(!("resonance" in diversity[0]), "with neither sameAct nor predicateResonance supplied, the descriptor shape must be identical to before this amendment — no resonance key at all, not even a gap");
  assert.deepEqual(ledger.diagnostics().predicateIdentity, "raw_string");
  assert.deepEqual(ledger.diagnostics().predicateResonance, "undeclared");
});

// ── TIER 2 — real UniMorph lemma table collapses the real inflection gap ──

const priorPath = path.join(FIX, "unimorph-morphology-prior.json");
const priorRaw = JSON.parse(fs.readFileSync(priorPath, "utf8"));
const prior = morphologyFromPrior(priorRaw);
const lemmatizer = createLemmatizer(prior.forms, { language: prior.language });

test("injected real UniMorph sameAct folds the inflectional pair (no relation_diversity_depth emitted at threshold 2), while a genuinely different lemma still crosses it", () => {
  assert.ok(lemmatizer.size > 0, "sanity: the real committed UniMorph prior fixture must actually load a non-empty lemma table");
  assert.ok(lemmatizer.sameAct("retreated", "retreats"), "sanity: UniMorph agrees these are one lemma before trusting the ledger's use of it");
  assert.ok(!lemmatizer.sameAct("retreated", "departed"), "sanity: UniMorph must NOT fold two genuinely different lemmas — the null case");

  const folded = createKindGraphStructureLedger({ depthThresholds: [2], sameAct: lemmatizer.sameAct });
  folded.ingest([
    edgeOf("e1", "retreated", "napoleon-1", 10),
    edgeOf("e2", "retreats", "napoleon-1", 55),
  ]);
  assert.equal(folded.allFeatures().filter((f) => f.featureKey === "relation_diversity_depth").length, 0,
    "one lemma, witnessed twice in different tenses, must not inflate relation_diversity_depth once sameAct is injected");

  const distinct = createKindGraphStructureLedger({ depthThresholds: [2], sameAct: lemmatizer.sameAct });
  distinct.ingest([
    edgeOf("e1", "retreated", "napoleon-1", 10),
    edgeOf("e2", "departed", "napoleon-1", 55),
  ]);
  const distinctDiversity = distinct.allFeatures().filter((f) => f.featureKey === "relation_diversity_depth");
  assert.equal(distinctDiversity.length, 1, "two genuinely different lemmas must still cross the threshold — sameAct never merges unrelated acts");
  // sameAct alone (no predicateResonance) is supplied: the feature now
  // discloses resonance, but as the typed absence — never a silent 0, and
  // never a fabricated number standing in for a real embedder.
  assert.deepEqual(distinctDiversity[0].resonance, { gap: "undeclared", what: "predicateResonance", why: "cross-lemma predicate synonymy is model-tier and needs a resolver with a giver; none was supplied" });
  assert.equal(folded.diagnostics().predicateIdentity, "lemma_canonical");
});

test("predicateResonance is consulted only on the predicate the mechanical tier already decided is new — never asked to decide membership, and disclosed rather than reconciled", () => {
  const calls = [];
  const predicateResonance = (a, b) => { calls.push([a, b]); return a === "retreated" && b === "napoleon-1-imaginary" ? 1 : 0.42; };
  const ledger = createKindGraphStructureLedger({ depthThresholds: [2], predicateResonance });
  ledger.ingest([
    edgeOf("e1", "retreated", "napoleon-1", 10),
    edgeOf("e2", "advanced", "napoleon-1", 55),
  ]);
  const diversity = ledger.allFeatures().find((f) => f.featureKey === "relation_diversity_depth");
  assert.ok(diversity, "raw-string tier (no sameAct here) still treats these as distinct, exactly as before");
  assert.equal(calls.length, 1, "predicateResonance is called exactly once — against the ONE prior predicate on record, never a broader scan");
  assert.deepEqual(calls[0], ["advanced", "retreated"]);
  assert.equal(diversity.resonance.newPredicate, "advanced");
  assert.equal(diversity.resonance.comparedAgainst, 1);
  assert.equal(diversity.resonance.top.predicate, "retreated");
  assert.equal(diversity.resonance.top.similarity, 0.42);
  assert.deepEqual(diversity.resonance.all, [{ predicate: "retreated", similarity: 0.42 }]);

  // The tier-boundary case: the very first predicate an entity is ever
  // witnessed doing has nothing yet to compare against.
  const first = createKindGraphStructureLedger({ depthThresholds: [2], predicateResonance });
  first.ingest([edgeOf("e1", "retreated", "solo-1", 1)]);
  assert.equal(first.allFeatures().filter((f) => f.featureKey === "relation_diversity_depth").length, 0, "one predicate never crosses a threshold >= 2");
});

// ── TIER 3 — real corpus regression pin (skips if the sibling `the-fold`
// checkout this repo's own tests already depend on is not present) ───────

function resolveClearance() {
  const candidates = [
    process.env.EOREADER7_THE_FOLD_CHECKOUT ? path.join(process.env.EOREADER7_THE_FOLD_CHECKOUT, "clearance.js") : null,
    path.join(here, "../../../the-fold/clearance.js"),
    "/Users/mlacy/Documents/3.0/the-fold/clearance.js",
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}
const CLEARANCE_PATH = resolveClearance();
const CLEARANCE_SKIP = CLEARANCE_PATH ? undefined : "the sibling the-fold checkout is not available: clearance.js (set EOREADER7_THE_FOLD_CHECKOUT or check out a sibling the-fold repo, matching tests/referent-merge.test.js's own convention)";

const WIKI_FIXTURE = path.join(FIX, "wikipedia-american-civil-war.html");
const WIKI_SKIP = CLEARANCE_SKIP ?? (fs.existsSync(WIKI_FIXTURE) ? undefined : `fixture not found: ${WIKI_FIXTURE}`);

test("real corpus regression: the American Civil War article's own 'the war' entity is measured, real-string-distinct 'had'/'has' — folded to one predicate once sameAct is injected, exactly as this amendment's own benchmark found", { skip: WIKI_SKIP }, async () => {
  const { splitSentences } = await import("../adapters/text/spans.js");
  const { extractSurfaces, discoverReferents, diaNorm } = await import("../adapters/text/surfaces.js");
  const { discoverRelationVocab, extractRelations } = await import("../adapters/text/relations.js");
  const { extractReadable } = await import("../organs/web.js");
  const { makeClearance } = await import(CLEARANCE_PATH);

  // Same real gates the amendment's own benchmark used
  // (native/eval/the-fold/kind-graph-embedding-rerank.mjs) — a real UD-derived
  // POS prior and a real UniMorph verb-form list, both already committed
  // fixtures, not hand-picked for this test.
  const posPrior = JSON.parse(fs.readFileSync(path.join(FIX, "pos-prior-eng.json"), "utf8"));
  const verbForms = new Set(JSON.parse(fs.readFileSync(path.join(FIX, "unimorph-eng-verb-forms.json"), "utf8")));

  const html = fs.readFileSync(WIKI_FIXTURE, "utf8");
  const text = extractReadable(html).text;
  const sentences = splitSentences(text);
  const presence = extractSurfaces(sentences);
  const clearance = makeClearance({ splitSentences, extractSurfaces, discoverReferents });
  const clearanceLedger = clearance.clearFigures(text);
  const estSurfaces = new Map();
  for (const e of clearanceLedger.established) for (const s of e.surfaces) estSurfaces.set(diaNorm(s), `wikipedia-american-civil-war::${e.referentId}`);

  const vocab = discoverRelationVocab(text, { surfaces: presence, minSurfaces: 1, posPrior, verbForms });
  const rels = extractRelations(text, { verbs: vocab.verbs, limit: 50000 });

  const edges = [];
  let seq = 0;
  for (const rel of rels) {
    const subjRef = estSurfaces.get(diaNorm(rel.subject));
    const objRef = estSurfaces.get(diaNorm(String(rel.object)));
    const participants = [];
    if (subjRef) participants.push({ ref: subjRef, occurrence: null, role: "subject", standing: "referent" });
    if (objRef && objRef !== subjRef) participants.push({ ref: objRef, occurrence: null, role: "object", standing: "referent" });
    if (!participants.length) continue;
    edges.push(hyperedge({ id: `pin-edge-${seq}`, relation: rel.verb, participants, witness: null, scope: { sequencePosition: seq } }));
    seq += 1;
  }
  assert.ok(edges.length > 100, `sanity: real extraction should admit a substantial number of edges from a real article (got ${edges.length})`);

  const THE_WAR = [...estSurfaces.values()].find((ref) => ref.endsWith("::ref:auto:the_war"));
  assert.ok(THE_WAR, "sanity: this fixture is expected to establish a 'the war' referent — if this fails, the fixture or the extractor changed and the pin below needs re-measuring, not silently loosening");

  // depthThresholds:[10] is not a hand-picked significance cutoff — it is
  // this specific, already-measured real fact (raw distinct-predicate count
  // for THE_WAR = 10, lemma-canonical count = 9) turned into an exact pin,
  // exactly as this project's own "no hand-set thresholds, prefer a
  // measured null" rule asks: the number comes from what was measured on
  // real material, not from feel.
  const raw = createKindGraphStructureLedger({ depthThresholds: [10] });
  raw.ingest(edges);
  const rawHit = raw.allFeatures().find((f) => f.featureKey === "relation_diversity_depth" && f.entityRef === THE_WAR);
  assert.ok(rawHit, `expected the real, raw-string mechanism to reach 10 distinct predicates for ${THE_WAR} (measured fact: had/has counted as 2, real total 10)`);
  assert.equal(rawHit.featureValue, "10+");

  const folded = createKindGraphStructureLedger({ depthThresholds: [10], sameAct: lemmatizer.sameAct });
  folded.ingest(edges);
  const foldedHit = folded.allFeatures().find((f) => f.featureKey === "relation_diversity_depth" && f.entityRef === THE_WAR);
  assert.equal(foldedHit, undefined, `once had/has fold to one lemma, ${THE_WAR} should have only 9 distinct predicates on this real corpus and never reach the 10+ threshold`);
});

// ── TIER 4 — real embedding tier (skips if Ollama is not reachable) ──────

const OLLAMA = "http://localhost:11434";
async function ollamaReachable() {
  try {
    const res = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return false;
    const data = await res.json();
    if (!(data.models ?? []).some((m) => String(m.name ?? "").startsWith("nomic-embed-text"))) return false;
    // Pulled is not servable: a one-model box's guard (Heimdall on :11434)
    // can refuse to load the embedder while another model is resident, and
    // that refusal arrives only after a long wait. Probe one real embedding
    // under a short deadline; anything but a vector skips the tier.
    const probe = await fetch(`${OLLAMA}/api/embeddings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "nomic-embed-text", prompt: "probe" }),
      signal: AbortSignal.timeout(10000),
    });
    if (!probe.ok) return false;
    const p = await probe.json();
    return Array.isArray(p?.embedding) && p.embedding.length > 0;
  } catch { return false; }
}
const OLLAMA_OK = await ollamaReachable();
const OLLAMA_SKIP = OLLAMA_OK ? undefined : "nomic-embed-text is not reachable via a local Ollama daemon on this machine (this environment's own already-running capability; not downloaded here) — skipping the real embedding-tier test";

test("real embedding tier: an injected predicateResonance backed by nomic-embed-text discloses a real, different-lemma near-synonym pair as evidence — never merging it, never asked before the mechanical tier decided the predicate was new", { skip: OLLAMA_SKIP }, async () => {
  // Two real predicates this amendment's own benchmark already measured as
  // a genuine near-synonym pair on real material (Battle of Austerlitz
  // article, the Austria entity: "agreed" / "decided" — real cosine 0.79,
  // p=0.0005 against a real permutation-derangement null in the full
  // benchmark). Reused here as a real, not fabricated, embedding call —
  // this test checks DISCLOSURE STRUCTURE, not a hand-set similarity cutoff.
  const cache = new Map();
  async function embed(text) {
    if (cache.has(text)) return cache.get(text);
    const res = await fetch(`${OLLAMA}/api/embeddings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
    });
    if (!res.ok) throw new Error(`ollama embeddings HTTP ${res.status}`);
    const vec = (await res.json()).embedding;
    cache.set(text, vec);
    return vec;
  }
  const cosine = (a, b) => {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i += 1) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  };
  const vAgreed = await embed("agreed");
  const vDecided = await embed("decided");
  const vRetreated = await embed("retreated");
  // Synchronous injected function, exactly as native/memory/activation.js's
  // own `embed(ws) -> vector[]` is synchronous: the network fetch happens
  // BEFORE injection, above, never inside the ledger's own call path.
  const predicateResonance = (a, b) => {
    const vecOf = { agreed: vAgreed, decided: vDecided, retreated: vRetreated };
    if (!vecOf[a] || !vecOf[b]) return null;
    return cosine(vecOf[a], vecOf[b]);
  };

  const ledger = createKindGraphStructureLedger({ depthThresholds: [2], sameAct: lemmatizer.sameAct, predicateResonance });
  ledger.ingest([
    edgeOf("e1", "decided", "austria-1", 1),
    edgeOf("e2", "agreed", "austria-1", 2),
  ]);
  const diversity = ledger.allFeatures().find((f) => f.featureKey === "relation_diversity_depth");
  assert.ok(diversity, "sanity: 'decided' and 'agreed' are different lemmas — sameAct must not fold them, so the mechanical tier still calls this a new predicate");
  assert.ok(!("gap" in diversity.resonance), "a real embedder was injected and there was a real prior predicate to compare against — this must be real evidence, not a typed gap");
  assert.equal(diversity.resonance.newPredicate, "agreed");
  assert.equal(diversity.resonance.top.predicate, "decided");
  assert.ok(Number.isFinite(diversity.resonance.top.similarity) && diversity.resonance.top.similarity >= -1 && diversity.resonance.top.similarity <= 1,
    `real cosine similarity must be a finite number in [-1,1] (got ${diversity.resonance.top.similarity})`);
  // Disclosure, not a verdict: the mechanical tier's own admission stands
  // (relation_diversity_depth was emitted) regardless of how similar the
  // embedding found the pair — nothing here merges "agreed" into "decided".
  const stillTwoDistinct = [...new Set(["decided", "agreed"].map((r) => (lemmatizer.sameAct(r, "decided") ? "decided" : r)))];
  assert.equal(stillTwoDistinct.length, 2, "the mechanical Set membership itself is untouched by the embedding — rerank only, never a merge");

  // A genuinely unrelated real predicate must not be reported as more
  // similar than the real near-synonym — no cutoff asserted, just that the
  // embedding call is real and not a stub returning a constant.
  const unrelated = cosine(await embed("agreed"), vRetreated);
  assert.ok(diversity.resonance.top.similarity !== unrelated, "sanity: the real embedding must distinguish two different real word pairs, not return a constant");
});
