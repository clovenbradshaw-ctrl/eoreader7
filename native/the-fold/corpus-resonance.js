// native/the-fold/corpus-resonance.js — the SAME covert discipline
// ground-attention.js already holds ("not the words of the archon, but
// their style of thinking"), extended to fire even when no ground
// criterion applies. Never a named, credited quote — that was tried and
// corrected mid-session ("something subtler"): archon-compendium.js's
// `credit`/`work` fields stay exactly what its own header says they are
// for (a DIFFERENT, explicit-citation use), never touched here. What
// actually gets used is an archon's `role` field — read across the real
// compendium these are already plain, unnamed, principle-level sentences
// ("it is in the bytes the eyes and ears can witness, or it isn't") —
// this file's real job is picking WHICH one actually resonates.
//
// TWO BAG-OF-WORDS ATTEMPTS WERE TRIED AND FALSIFIED FIRST, disclosed
// rather than deleted from memory: matchArchons' own topic-overlap count
// ranked bukhari above mozi for "eyewitness account" (both hit "witness"
// as a substring, and the tie broke on ARRAY ORDER, not fit) and matched
// Barbara Partee to "what time is it" (a single incidental "time" hit). A
// TF-IDF re-rank over the compendium's own role+work+topics text was
// tried next and made things WORSE, not better — a corpus of ~60 short
// entries is too small and sparse for TF-IDF's document-frequency
// statistics to mean anything; it matched "synapse" to the same
// eyewitness query purely because its role text contains "fires" (the
// verb), colliding with "harbor fire" (the noun). No hand-rolled word
// heuristic survived contact with real test cases.
//
// THE FIX: real semantic embeddings (Ollama's nomic-embed-text, already
// pulled locally — POST /api/embed, {model, input} -> {embeddings}),
// cosine similarity, and a REAL MEASURED NULL rather than a hand-set
// threshold (this session's own standing rule): a fixed set of genuinely
// off-topic calibration queries is embedded once, its own best-match
// similarity against the compendium gives the ceiling incidental overlap
// alone can produce, and a real task's best match must clear it. Archon
// embeddings and the null's own ceiling are computed once per process
// and cached — the compendium and the calibration set are both static.
const OLLAMA = process.env.ER7_OLLAMA_URL ?? "http://localhost:11434";
const EMBED_MODEL = process.env.ER7_EMBED_MODEL ?? "nomic-embed-text";

// A fixed, disclosed calibration set — deliberately ordinary, off-topic
// questions, none of which should genuinely resonate with any archon's
// evidentiary/stylistic domain. Declared once, never tuned against a
// specific archon's own score (that would be calibrating on the answer
// key, the exact mistake this repo's own CLAUDE.md names and forbids).
const NULL_QUERIES = Object.freeze([
  "what time is it",
  "how do I boil an egg",
  "what's the weather tomorrow",
  "tell me a joke",
  "how far is the moon",
  "what's 2 plus 2",
  "recommend a good movie",
  "how do I tie my shoes",
]);

async function embed(inputs, { ollamaUrl = OLLAMA, model = EMBED_MODEL } = {}) {
  const res = await fetch(`${ollamaUrl}/api/embed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, input: inputs }),
  });
  if (!res.ok) throw new Error(`corpus-resonance: embedding request failed (${res.status})`);
  const data = await res.json();
  if (!Array.isArray(data.embeddings)) throw new Error("corpus-resonance: embedding response carried no embeddings");
  return data.embeddings;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i += 1) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}

const archonText = (a) => `${a.role}. ${a.work}`;

let cache = null; // { archons: [{handle, vec}], ceiling: number }

async function buildCache(archons, opts) {
  const texts = archons.map(archonText);
  const vecs = await embed(texts, opts);
  const archonVecs = archons.map((a, i) => ({ handle: a.handle, role: a.role, vec: vecs[i] }));

  // The null: each calibration query's own best-match similarity against
  // this same archon set, and the ceiling is the maximum of those — a
  // real task must beat what genuinely unrelated text already achieves
  // by coincidence, not an arbitrary fraction picked by eye.
  const nullVecs = await embed([...NULL_QUERIES], opts);
  let ceiling = 0;
  for (const nv of nullVecs) {
    let best = 0;
    for (const av of archonVecs) best = Math.max(best, cosine(nv, av.vec));
    ceiling = Math.max(ceiling, best);
  }
  return { archonVecs, ceiling };
}

/**
 * resonantPrinciple(task, { archons, ollamaUrl, model }) — the covert
 * fallback fact, or null if nothing clears the measured null ceiling.
 * `archons` is injected (the real compendium's own ARCHONS array, never
 * reimplemented). Throws only on a genuine embedding-service failure —
 * callers should catch, the same discipline groundFactFor already holds.
 */
export async function resonantPrinciple(task, { archons, ollamaUrl, model } = {}) {
  if (!Array.isArray(archons) || !archons.length) throw new TypeError("resonantPrinciple: archons is injected — the real compendium's own ARCHONS array");
  const opts = { ollamaUrl, model };
  if (!cache) cache = await buildCache(archons, opts);

  const [taskVec] = await embed([String(task ?? "")], opts);
  let best = null, bestSim = -Infinity;
  for (const av of cache.archonVecs) {
    const sim = cosine(taskVec, av.vec);
    if (sim > bestSim) { bestSim = sim; best = av; }
  }
  if (!best || bestSim <= cache.ceiling) return null;
  return Object.freeze({ text: best.role, handle: best.handle, similarity: bestSim, ceiling: cache.ceiling });
}

/** Test-only: force a fresh cache (a real Ollama instance is required —
 * this file makes no non-embedding fallback, per this session's own
 * "model is just the mouth" discipline: never approximate an embedding
 * with a word heuristic and call it the same thing). */
export function _resetCacheForTests() { cache = null; }
