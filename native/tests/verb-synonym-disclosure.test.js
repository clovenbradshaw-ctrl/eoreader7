// native/tests/verb-synonym-disclosure.test.js — Roget's disclosed second
// ground, exercised against REAL discoverRelationVocab candidate pools from
// this repo's own checked-in fixtures, REAL morphology.js sameAct (the real
// UniMorph English prior), and — when a local embedder is reachable — REAL
// nomic-embed-text vectors from an already-running local ollama server.
// Nothing here is a synthetic stand-in for the evidentiary claim: the tests
// that assert an embedding carries real signal use real repo fixtures and a
// real embedding model, and SKIP (never fabricate a pass) if no local
// embedder is reachable, the same discipline
// native/tests/morphology-vocab.test.js already uses for its own optional
// legacy dependency.
//
// The two gold same-fact/different-verb pairs below are not invented for
// this test file: both are cited verbatim from
// native/eval/verb-synonym-fold-benchmark.mjs (the proving-session script
// that first measured this gap against these same real fixtures) —
//   (captured, took): borodino-excerpt.txt's own real "The French captured
//     the redoubt..." vs this repo's own pre-existing curated gold battery
//     (native/eval/the-fold/witness-paraphrase.mjs item 10, ENTAILED,
//     shape=synonym-verb: "The French took the redoubt at Shevardino.")
//   (verified, recheck): katherine-johnson-body.txt's own real, independent
//     restatement of the same historical fact from two different verbs.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { splitSentences } from "../adapters/text/spans.js";
import { extractSurfaces } from "../adapters/text/surfaces.js";
import { discoverRelationVocab } from "../adapters/text/relations.js";
import { createLemmatizer, morphologyFromPrior } from "../adapters/text/morphology.js";
import { embeddingActDisclosure } from "../adapters/text/verb-synonym-disclosure.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.resolve(here, "../eval/the-fold/fixtures/");

const posPrior = JSON.parse(readFileSync(path.join(FIX, "pos-prior-eng.json"), "utf8"));
const morphPrior = morphologyFromPrior(JSON.parse(readFileSync(path.resolve(here, "../priors/morphology-eng.json"), "utf8")));
const { sameAct } = createLemmatizer(morphPrior.forms, { language: morphPrior.language });

const realPool = (text) => {
  const sentences = splitSentences(text);
  const surfaces = extractSurfaces(sentences);
  return discoverRelationVocab(text, { surfaces, minSurfaces: 1, posPrior });
};

const borodino = realPool(readFileSync(path.join(FIX, "borodino-excerpt.txt"), "utf8"));
const katherineJohnson = realPool(readFileSync(path.join(FIX, "katherine-johnson-body.txt"), "utf8"));

// ── the mechanical gap this file exists to disclose, confirmed live ────────
test("real repo fixtures: the gold pair is a real, mechanically-admitted candidate pair, and real sameAct (different lemmas) says false — the gap this whole file answers", () => {
  assert.ok(borodino.verbs.has("captured") && borodino.verbs.has("took"), "both members must be real discoverRelationVocab candidates for the same document");
  assert.equal(sameAct("captured", "took"), false, "different lemmas — morphology.js's own act closure cannot fold a true synonym by construction");
  assert.equal(sameAct("captured", "capture"), true, "sanity: the SAME mechanism correctly folds real attested inflection");
});

test("real repo fixtures: 'recheck' never becomes a candidate at all, so it is not rerank-eligible — a separate, prior gap this file cannot reach", () => {
  assert.ok(katherineJohnson.verbs.has("verified"));
  assert.ok(!katherineJohnson.verbs.has("recheck"), "tallyAfter's positional gate refuses 'recheck' before any embedding ever sees it");
});

// ── contract: gap disclosure, never a fabricated signal ────────────────────
test("no embed supplied -> a typed, undeclared gap (never a silent zero standing in for 'no synonymy found')", () => {
  const out = embeddingActDisclosure([...borodino.verbs], null);
  assert.equal(out.gap?.what, "embed");
  assert.deepEqual(out.clusters, []);
});

test("fewer than two candidates -> a typed structural gap, not a false single-item cluster", () => {
  const out = embeddingActDisclosure(["went"], () => [1, 0]);
  assert.equal(out.gap?.reason, "insufficient_candidates");
});

test("a per-token embedder gap is disclosed in embedGaps, never silently treated as maximally dissimilar", () => {
  const fakeEmbed = (t) => (t === "went" ? [1, 0, 0] : t === "came" ? [0, 1, 0] : null);
  const out = embeddingActDisclosure(["went", "came", "vanished"], fakeEmbed);
  assert.ok(out.embedGaps.includes("vanished"));
  assert.ok(!out.clusters.some((c) => c.verb === "vanished" || c.neighbor === "vanished"));
});

test("a candidate pool above maxCandidates refuses rather than silently sampling an approximate null", () => {
  const many = Array.from({ length: 5 }, (_, i) => `v${i}`);
  const out = embeddingActDisclosure(many, () => [1, 0], { maxCandidates: 3 });
  assert.equal(out.gap?.reason, "candidate_pool_too_large");
});

test("mechanical agreement is disclosed, not silently reconciled, when the real injected sameAct already folds a pair (shared lemma)", () => {
  // Real sameAct, real UniMorph prior. Only the VECTORS are hand-set here —
  // this is a plumbing test of the mechanicalAgrees wiring, not a claim
  // about what any real embedding model would say; the real-embedding claim
  // is tested separately below against real repo data.
  const vec = { verified: [1, 0, 0], verify: [0.99, 0.01, 0], recheck: [0, 1, 0] };
  const out = embeddingActDisclosure(["verified", "verify", "recheck"], (t) => vec[t], { sameAct });
  const row = out.clusters.find((c) => c.verb === "verified");
  assert.equal(row.neighbor, "verify");
  assert.equal(row.mechanicalAgrees, true, "same lemma — the mechanical tier already agrees; disclosed, not hidden");
  assert.equal(row.disagreement, false);
});

test("with no sameAct injected, mechanicalAgrees is a declared null, never a false 'no agreement'", () => {
  const vec = { a: [1, 0], b: [0.9, 0.1] };
  const out = embeddingActDisclosure(["a", "b"], (t) => vec[t]);
  assert.equal(out.clusters[0].mechanicalAgrees, null);
  assert.equal(out.clusters[0].disagreement, false, "disagreement is only ever true when the mechanical tier was actually asked and said no");
});

// ── THE REAL EVIDENTIARY TEST ───────────────────────────────────────────────
// Real nomic-embed-text vectors, fetched from an ALREADY-RUNNING local
// ollama server (nothing installed or downloaded by this test — it only
// calls an existing local HTTP endpoint), reranking borodino-excerpt.txt's
// own real, mechanically-admitted candidate pool (28 verbs, C(28,2)=378
// real same-document pairs — the exact null, enumerated, no sampling).
const OLLAMA = "http://localhost:11434";
const EMBED_MODEL = "nomic-embed-text";

async function ollamaEmbedderAvailable() {
  try {
    const res = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return false;
    const tags = await res.json();
    if (!tags.models?.some((m) => m.name === `${EMBED_MODEL}:latest` || m.name === EMBED_MODEL)) return false;
    // Pulled is not servable: a one-model box's guard on :11434 can refuse to
    // load the embedder (after a long wait). One real embedding under a short
    // deadline decides; anything but a vector skips.
    const probe = await fetch(`${OLLAMA}/api/embed`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: EMBED_MODEL, input: ["probe"] }), signal: AbortSignal.timeout(10000) });
    if (!probe.ok) return false;
    const p = await probe.json();
    return Array.isArray(p?.embeddings?.[0]) && p.embeddings[0].length > 0;
  } catch { return false; }
}
const EMBEDDER_OK = await ollamaEmbedderAvailable();
const SKIP_EMBED = EMBEDDER_OK ? undefined : `no local ${EMBED_MODEL} embedder reachable at ${OLLAMA} — this test measures a real embedding against real data and will not fabricate one, so it skips rather than fake a pass`;

async function fetchRealEmbeddings(tokens) {
  const res = await fetch(`${OLLAMA}/api/embed`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: EMBED_MODEL, input: tokens }) });
  const j = await res.json();
  return new Map(tokens.map((t, i) => [t, j.embeddings[i]]));
}

test(
  "REAL embedding discloses the real (captured, took) gold pair — real repo fixtures, real UniMorph sameAct, real nomic-embed-text — as an above-chance nearest neighbour against the exact real same-document null, with no hand-set cosine threshold anywhere",
  { skip: SKIP_EMBED },
  async () => {
    const tokens = [...borodino.verbs];
    assert.equal(tokens.length, 28, "pin the real population size this test's own null is measured over");

    const vecMap = await fetchRealEmbeddings(tokens);
    const out = embeddingActDisclosure(tokens, (t) => vecMap.get(t), { sameAct });

    assert.equal(out.gap, null);
    assert.equal(out.pairsConsidered, (tokens.length * (tokens.length - 1)) / 2, "the exact null population, enumerated, never sampled");

    const capturedRow = out.clusters.find((c) => c.verb === "captured");
    assert.ok(capturedRow, "'captured' must appear in the disclosure");
    assert.equal(capturedRow.neighbor, "took", `expected the real embedding's argmax nearest neighbour of 'captured' to be 'took'; got '${capturedRow.neighbor}' (cosine ${capturedRow.cosine})`);
    assert.equal(capturedRow.mechanicalAgrees, false, "different lemmas — the mechanical tier does not already fold this pair");
    assert.equal(capturedRow.disagreement, true, "a genuine second, disclosed ground: the embedding nominates a pair the lemma tier refuses");
    // The measured null, not a hand-set cosine: a loose sanity bound well
    // inside the proving run's own measured rankP (~0.032, rank 12/378),
    // leaving headroom for legitimate model/version drift without pinning
    // today's exact float as a brittle constant.
    assert.ok(capturedRow.rankP < 0.1, `expected (captured, took) to rank in the strong tail of the real same-document null; rankP=${capturedRow.rankP} (rank ${capturedRow.rankAmongPairs}/${capturedRow.pairsConsidered})`);
  },
);

test(
  "REAL embedding, second gold pair: (verified, recheck) shows no comparable separation — reported honestly rather than omitted, since 'recheck' never clears the candidate gate and so is not rerank-eligible",
  { skip: SKIP_EMBED },
  async () => {
    const tokens = [...katherineJohnson.verbs];
    const vecMap = await fetchRealEmbeddings([...tokens, "recheck"]);
    const cosine = (a, b) => { let dot = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i += 1) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return dot / Math.sqrt(na * nb); };
    const verifiedVec = vecMap.get("verified");
    const recheckVec = vecMap.get("recheck");
    const others = tokens.filter((t) => t !== "verified");
    const rankAmongReal = others.filter((t) => cosine(verifiedVec, vecMap.get(t)) >= cosine(verifiedVec, recheckVec)).length + 1;
    // This is measured directly (not via embeddingActDisclosure, since
    // 'recheck' is never in the mechanical candidate pool for this document
    // and so is correctly outside what this file's own rerank ever sees) —
    // the assertion documents the honest negative result the proving
    // session found, so a future change to this file cannot quietly start
    // claiming a stronger result here than the data supports.
    assert.ok(rankAmongReal > others.length / 2, `expected 'recheck' to land in the WEAKER half of 'verified's real same-document ranking (the proving run measured 39th of 54); got rank ${rankAmongReal} of ${others.length + 1}`);

    // And confirm the production function correctly excludes it: 'recheck'
    // is not a member of the real candidate pool, so it cannot be disclosed
    // by embeddingActDisclosure no matter how the embedder scores it.
    const out = embeddingActDisclosure(tokens, (t) => vecMap.get(t), { sameAct });
    assert.ok(!out.clusters.some((c) => c.verb === "recheck" || c.neighbor === "recheck"));
  },
);
