// corroboration-embedding-null.mjs — DOES AN INJECTED, RERANK-ONLY EMBEDDING
// EARN THE SELECT SEAM THAT statingCandidates' OWN LITERAL AND-GATE REFUSES?
//
// This is a fresh, real run — not a re-citation of ranke-slicers-RESULTS.md
// (which measured containment/activation/random with the embedder reported
// "unavailable" because neither an embedding package nor a model server was
// present at the time). Two things changed since: `ollama serve` is now
// running locally with `nomic-embed-text` already pulled (`ollama list`),
// and this repo's own eval convention for injecting an embedder
// (ranke-slicers.mjs's `rankEmbedding`, dtype-q8 all-MiniLM-L6-v2) is
// reproduced here with ollama's embedder standing in for it — same shape,
// checked-first local capability instead of a network fetch.
//
// THE COMPARISON, exactly as the module under test frames it
// (native/organs/corroboration.js:785-802): `witnessNote`'s `candidates`
// param is a real injection seam. Left null, the caller gets
// `statingCandidates`' own gate — BOTH ends' distinctive features must fire
// LITERALLY in the same sentence (h1>0 && h2>0) — which is a hard zero by
// CONSTRUCTION on an "object-missing partial" note (the class this driver
// targets: the article states a proposition, a real cited source is
// readable and states it, but the object's own words never appear in that
// source's bytes). This driver measures, on REAL Apollo-11-backwards-walk
// notes and REAL cited sources already on disk
// (results/ranke-backwards.json + fixtures/), three arms that share the
// SAME candidate pool, the SAME K, and a BYTE-IDENTICAL witness below them:
//
//   stating    — the CURRENT mechanism, unmodified. statingCandidates()'s
//                own gate, own limit (8), own module. Expected near-zero
//                offer rate on this class, by the class's own definition —
//                measured here, not assumed.
//   embedding  — INJECTED, RERANK-ONLY (activation.js's own three rules,
//                re-derived independently here): cosine rank over the
//                SAME sentence pool statingCandidates draws from, using
//                ollama's nomic-embed-text (already pulled, already
//                running, zero downloads); top-8 passed into `witnessNote`
//                via `candidates` exactly as the header at
//                corroboration.js:794-796 names as the licensed door. The
//                arm/swap/indiscriminate-pick checks below it are the
//                SAME code, unchanged, for every arm (L4).
//   random     — THE CONFOUND CONTROL (ranke-slicers.mjs's own L3
//                rationale, reproduced verbatim in spirit): both other
//                arms relax statingCandidates' gate, which alone hands the
//                select protocol 8 sentences it never had. If a random 8
//                lands as often as a ranked 8, the lift is the relaxed
//                gate's, not the ranker's.
//
// THE NULL, per this repo's own law (CLAUDE.md's "no hand-set thresholds,
// prefer a measured null" and cited-source-null.mjs's Born null: derange
// the object, hold every other marginal fixed, redraw more than once —
// P66, "a null drawn once is a null drawn zero times"). end2 is deranged
// across the walked notes (same subjects, same labels, same faces, same
// slicer, same witness — only which object belongs to which subject is
// destroyed), redrawn DRAWS times with independent seeds, and the REAL
// "states" count is reported against that draw's own spread — a rank p,
// never an arbitrary cutoff.
//
// THE CORRECTION THIS DRIVER OWES ranke-slicers-RESULTS.md. That run found
// containment's naive 9-vs-1 separation dissolve to 1-vs-0 once a
// non-learned decider-company wall (corroboration.js:895-930 — the SAME
// per-end feature-sharing check the GENERATE path already runs) was
// applied post-hoc to the landings, because the SELECT path this driver
// also exercises does not run that wall itself (a real, disclosed,
// unfixed gap: applying it there breaks the select seam's own capability
// test). So every "states" count below is reported BOTH raw and
// wall-corrected, for every arm, real and null alike — never just the
// number a slicer would like read.
//
// env: N (24) · K (8) · DRAWS (3) · MODEL (gemma2:2b) · EMB_MODEL
//      (nomic-embed-text) · SLICERS (stating,embedding,random) · OLLAMA
//      (http://127.0.0.1:11434) · OUT
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const HERE = new URL("./", import.meta.url).pathname;
const FIX = `${HERE}fixtures`;
const N_NOTES = Number(process.env.N ?? 24);
const K = Number(process.env.K ?? 8);
const DRAWS = Number(process.env.DRAWS ?? 3);
const MODEL = process.env.MODEL ?? "gemma2:2b";
const EMB_MODEL = process.env.EMB_MODEL ?? "nomic-embed-text";
const WANT = (process.env.SLICERS ?? "stating,embedding,random").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = process.env.OUT ?? "corroboration-embedding-null.json";
const OLLAMA = process.env.OLLAMA ?? "http://127.0.0.1:11434";

const { statingCandidates, witnessNote } = await import(`${NATIVE}/organs/corroboration.js`);
const T = await import(`${NATIVE}/organs/index.js`);
const R = await import(`${NATIVE}/organs/ranke.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { createLemmatizer, morphologyFromPrior } = await import(`${NATIVE}/adapters/text/morphology.js`);
const { createSeededRng } = await import(`${NATIVE}/kernel/rng.js`);
const morph = morphologyFromPrior(JSON.parse(readFileSync(`${FIX}/unimorph-morphology-prior.json`, "utf8")));
const { sameAct } = createLemmatizer(morph.forms, { language: morph.language });

// ── the embedder: INJECTED here, in the eval driver, exactly as
// activation.js's own header requires ("injected, never imported... the
// engine has no model baked into it"). corroboration.js imports no model;
// this file is the only place `fetch` to the embedder happens. Checked
// first, per the task's own instruction, rather than assumed. ──────────
async function ollamaEmbed(texts) {
  const res = await fetch(`${OLLAMA}/api/embed`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: EMB_MODEL, input: texts }) });
  if (!res.ok) throw new Error(`ollama embed ${res.status}: ${await res.text().catch(() => "")}`);
  const j = await res.json();
  if (!Array.isArray(j.embeddings)) throw new Error(`ollama embed: no embeddings field (${JSON.stringify(j).slice(0, 200)})`);
  return j.embeddings;
}
const cosine = (a, b) => { let dot = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i += 1) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return dot / ((Math.sqrt(na) * Math.sqrt(nb)) || 1); };

let embedGap = null, embedDim = null;
if (WANT.includes("embedding")) {
  try {
    const probe = await ollamaEmbed(["probe sentence for dimensionality"]);
    embedDim = probe?.[0]?.length ?? null;
    if (!embedDim) throw new Error("empty embedding returned");
    console.log(`embedder: ollama "${EMB_MODEL}" — already pulled, already running locally at ${OLLAMA} (no download, no network egress). dim=${embedDim}`);
  } catch (e) {
    embedGap = { type: "unavailable", detail: String(e?.message ?? e).slice(0, 200) };
    console.log(`embedder: UNAVAILABLE — ${embedGap.detail}`);
  }
}

// ── the target set: REAL object-missing partial notes, REAL cited sources
// already on disk from the Apollo-11 backwards walk (no synthesized data) ──
const backwards = JSON.parse(readFileSync(`${HERE}results/ranke-backwards.json`, "utf8"));
const eligible = backwards.real.rows.filter((r) => r.cls === "partial" && r.missingSide === "object" && r.facePath && existsSync(`${FIX}/${r.facePath}`));
const targets = eligible.slice(0, N_NOTES);
const allObjMissing = backwards.real.rows.filter((r) => r.cls === "partial" && r.missingSide === "object").length;
console.log(`page: ${backwards.page}`);
console.log(`object-missing partials in the walk: ${allObjMissing}; with a kept cited-source face on disk: ${eligible.length}; walked here (declared budget N): ${targets.length}`);

const endsOf = (row) => { const m = String(row.note).match(/^(.*?) —(.*?)→ (.*)$/); return m ? { end1: m[1], label: m[2], end2: m[3] } : null; };

// ── the shared candidate pool per face — identical build to
// ranke-slicers.mjs's poolOf (its referent/activation bookkeeping is
// dropped here since no activation arm is run) ───────────────────────────
const MINLEN = 12, MAXLEN = 400;
const faceCache = new Map();
function poolOf(facePath) {
  if (faceCache.has(facePath)) return faceCache.get(facePath);
  const src = readFileSync(`${FIX}/${facePath}`, "utf8");
  const sents = splitSentences(src);
  const crlf = []; for (let i = src.indexOf("\r\n"); i >= 0; i = src.indexOf("\r\n", i + 2)) crlf.push(i);
  const toRaw = (n) => { let lo = 0, hi = crlf.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (crlf[mid] - mid < n) lo = mid + 1; else hi = mid; } return n + lo; };
  const pool = [];
  for (const s of sents) {
    const raw = s?.text ?? "", offset = Number.isFinite(s?.offset) ? s.offset : null;
    const shown = raw.replace(/\s+/g, " ").trim();
    if (shown.length < MINLEN || shown.length > MAXLEN) continue;
    let start = null, end = null, rawBytes = raw;
    if (offset != null) {
      const a = toRaw(offset), b = toRaw(offset + raw.length);
      if (src.slice(a, b).replace(/\r\n/g, "\n") === raw) { start = a; end = b; rawBytes = src.slice(a, b); }
      else if (src.slice(offset, offset + raw.length) === raw) { start = offset; end = offset + raw.length; }
    }
    pool.push({ shown, raw: rawBytes, start, end, order: pool.length });
  }
  const out = { src, pool };
  faceCache.set(facePath, out);
  return out;
}

// ── the slicers: SAME pool, SAME K, only the ranking differs ─────────────
function rankRandom(face, ends, seed) {
  const rng = createSeededRng(`${seed}|${ends.end1}|${ends.end2}`);
  return face.pool.map((c) => ({ c, score: rng() }));
}
async function rankEmbedding(face, claimSentence) {
  if (!face.vecs) face.vecs = await ollamaEmbed(face.pool.map((c) => c.shown));
  const [q] = await ollamaEmbed([claimSentence]);
  return face.pool.map((c, i) => ({ c, score: cosine(q, face.vecs[i]) }));
}
// no positivity filter (P: no hand-set thresholds) — take the top-K the
// ranking actually produces, whatever the raw scores are.
const topK = (scored) => (scored == null ? null : scored.slice().sort((a, b) => b.score - a.score || a.c.order - b.c.order).slice(0, K).map((s) => s.c));

async function candidatesFor(name, face, ends, claimSentence, seed) {
  if (name === "stating") return statingCandidates(face.src, ends, { splitSentences, limit: K });
  if (name === "random") return topK(rankRandom(face, ends, seed));
  if (name === "embedding") { if (embedGap) return null; return topK(await rankEmbedding(face, claimSentence)); }
  throw new Error(`unknown slicer ${name}`);
}

// ── the witness: BYTE-IDENTICAL below every arm (L4) — real ollama chat,
// real testimony organs, nothing mocked ──────────────────────────────────
let modelCalls = 0;
const chat = async (messages, schema) => {
  modelCalls += 1;
  const res = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: MODEL, stream: false, format: schema, options: { num_predict: 200, temperature: 0 }, messages }) });
  if (!res.ok) throw new Error(`ollama chat ${res.status}`);
  return (await res.json())?.message?.content ?? "";
};
const witness = {
  ask: async (sen, sl) => T.readTestimony(await chat(T.buildWitnessMessages(sen, sl), T.WITNESS_SCHEMA)),
  selectAsk: async (messages) => { try { return JSON.parse(await chat(messages, T.SELECT_SCHEMA)); } catch { return {}; } },
  testimony: { witnessSlice: T.witnessSlice, siblingSwap: T.siblingSwap, foldTestimony: T.foldTestimony, buildSelectMessages: T.buildSelectMessages, foldSelect: T.foldSelect, sameForm: sameAct },
  splitSentences,
};

// ── the post-hoc decider-company wall (owed to ranke-slicers-RESULTS.md):
// re-derives the SAME per-end feature-sharing check corroboration.js runs
// on its GENERATE path (lines 907-930) but does NOT run on the select
// path — applied here, after the fact, over every "states" landing, using
// the SAME textFeatures-shaped folder and the SAME sameAct organ. ────────
function survivesCompanyWall(because, ends) {
  const cf = (x) => new Set(String(x ?? "").toLowerCase().match(/\p{L}{4,}/gu) ?? []);
  const deciderFeats = cf(because);
  const inCompany = (w) => deciderFeats.has(w) || [...deciderFeats].some((d) => sameAct(w, d));
  const e1 = [...cf(ends.end1)].some(inCompany);
  const e2 = [...cf(ends.end2)].some(inCompany);
  return e1 && e2;
}

// ── build the real rows over the SAME faces ───────────────────────────────
const real = [];
for (const row of targets) {
  const ends = endsOf(row);
  if (!ends) continue;
  real.push({ row, ends, face: poolOf(row.facePath) });
}
console.log(`real rows built (ends parsed ok): ${real.length}\n`);

// ── ZERO-MODEL-CALL FIRST: null the free stage before spending a single
// witness call (this repo's own P9 discipline — cited-source-null.mjs's
// "what are you running calls for?"). Does each slicer even OFFER
// candidates on this class? This costs embedding calls (cheap, local,
// no generation) but ZERO chat/model calls. ─────────────────────────────
console.log("COVERAGE (offer rate only, zero witness/model calls spent):");
const coverage = {};
for (const name of WANT) {
  let offered = 0;
  for (const { ends, face, row } of real) {
    const claim = R.claimOfNote(ends);
    if (!claim) continue;
    const cands = await candidatesFor(name, face, ends, claim.sentence, `cov|${row.id}`);
    if (cands && cands.length) offered += 1;
  }
  coverage[name] = offered;
  console.log(`  ${name.padEnd(11)} offered ${offered}/${real.length}`);
}
console.log("");

function derangement(n, seed) {
  let st = (seed >>> 0) || 1;
  const rnd = () => ((st = (st * 1664525 + 1013904223) >>> 0) / 4294967296);
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  for (let i = 0; i < n; i += 1) if (idx[i] === i) { const j = (i + 1) % n; [idx[i], idx[j]] = [idx[j], idx[i]]; } // no fixed points (II.23)
  return idx;
}
function controlRows(seed) {
  const idx = derangement(real.length, seed);
  return real.map((r, i) => ({ row: r.row, face: r.face, ends: { end1: r.ends.end1, label: r.ends.label, end2: real[idx[i]].ends.end2 } }));
}

async function arm(rows, label, name, seed) {
  const verdicts = {}; const landings = []; const perNote = []; let offered = 0, noCandidates = 0;
  for (const { row, ends, face } of rows) {
    const claim = R.claimOfNote(ends);
    if (!claim) { verdicts["no-claim"] = (verdicts["no-claim"] ?? 0) + 1; continue; }
    const cands = await candidatesFor(name, face, ends, claim.sentence, `${label}|${seed}|${row.id}`);
    if (cands == null) { noCandidates += 1; verdicts.no_slicer_candidate = (verdicts.no_slicer_candidate ?? 0) + 1; continue; }
    if (!cands.length) { noCandidates += 1; verdicts.no_candidate = (verdicts.no_candidate ?? 0) + 1; continue; }
    offered += 1;
    const w = await witnessNote(claim.sentence, { ref: row.host, text: face.src }, { ...witness, ends: { end1: ends.end1, end2: ends.end2 }, candidates: cands });
    const v = w.refused ? `refused:${w.refused}` : w.verdict;
    verdicts[v] = (verdicts[v] ?? 0) + 1;
    const because = w.verdict === "states" ? String(w.because ?? "") : null;
    const wall = because ? survivesCompanyWall(because, ends) : null;
    if (w.verdict === "states") landings.push({ id: row.id, note: row.note, host: row.host, because: because.replace(/\s+/g, " ").slice(0, 220), wall });
    perNote.push({ id: row.id, verdict: v, wall });
  }
  return { name, label, seed, offered, noCandidates, total: rows.length, verdicts, states: verdicts.states ?? 0, wallSurvived: landings.filter((l) => l.wall).length, landings, perNote };
}

// ── RUN: real, then DRAWS independent derangement draws (P66) ───────────
const results = { real: {}, control: {} };
for (const name of WANT) {
  console.log(`=== ${name} ===`);
  const t0 = Date.now();
  const r = await arm(real, "real", name, "real");
  console.log(`  REAL     offered ${r.offered}/${r.total}  states(raw) ${r.states}  states(wall-survived) ${r.wallSurvived}  ${JSON.stringify(r.verdicts)}  (${Math.round((Date.now() - t0) / 1000)}s)`);
  results.real[name] = r;
  const draws = [];
  for (let d = 1; d <= DRAWS; d += 1) {
    const t1 = Date.now();
    const c = await arm(controlRows(d), `control-${d}`, name, d);
    console.log(`  CONTROL#${d} offered ${c.offered}/${c.total}  states(raw) ${c.states}  states(wall-survived) ${c.wallSurvived}  ${JSON.stringify(c.verdicts)}  (${Math.round((Date.now() - t1) / 1000)}s)`);
    draws.push(c);
  }
  results.control[name] = draws;
  console.log("");
}

// ── THE NULL COMPARISON (cited-source-null.mjs's own pattern: real
// statistic against the redrawn null's spread, rank p, never a hand-set
// threshold) ───────────────────────────────────────────────────────────
console.log(`${"=".repeat(78)}\nREAL vs THE BORN NULL (end2 deranged, ${DRAWS} independent draws, marginals held)\n${"=".repeat(78)}`);
const summary = {};
for (const name of WANT) {
  const r = results.real[name];
  const draws = results.control[name];
  const rawNull = draws.map((d) => d.states).sort((a, b) => a - b);
  const wallNull = draws.map((d) => d.wallSurvived).sort((a, b) => a - b);
  const rankP = (obs, arr) => (arr.length ? (arr.filter((x) => x >= obs).length + 1) / (arr.length + 1) : null);
  const rawP = rankP(r.states, rawNull);
  const wallP = rankP(r.wallSurvived, wallNull);
  summary[name] = { offered: r.offered, total: r.total, realStates: r.states, nullStates: rawNull, rawRankP: rawP, realWallSurvived: r.wallSurvived, nullWallSurvived: wallNull, wallRankP: wallP };
  console.log(`${name.padEnd(11)} offered ${r.offered}/${r.total}`);
  console.log(`  raw states:            real ${r.states}   null draws [${rawNull.join(",")}]   rank p = ${rawP == null ? "n/a" : rawP.toFixed(3)}`);
  console.log(`  wall-survived states:  real ${r.wallSurvived}   null draws [${wallNull.join(",")}]   rank p = ${wallP == null ? "n/a" : wallP.toFixed(3)}`);
}

console.log(`\nLANDINGS THAT SURVIVE THE WALL (real arm only, decider is the source's own bytes):`);
for (const name of WANT) {
  const survivors = (results.real[name]?.landings ?? []).filter((l) => l.wall);
  console.log(`  ${name}: ${survivors.length}`);
  for (const l of survivors.slice(0, 5)) console.log(`    [${l.host}] ${l.note}\n       «${l.because}»`);
}

writeFileSync(`${HERE}results/${OUT}`, JSON.stringify({ page: backwards.page, objectMissingPartials: allObjMissing, eligible: eligible.length, walked: real.length, K, DRAWS, model: MODEL, embedder: embedGap ? embedGap : `ollama:${EMB_MODEL} dim=${embedDim}`, modelCalls, coverage, results, summary }, null, 2));
console.log(`\n${modelCalls} witness/model calls (gemma2:2b). Embedding calls not counted (ollama nomic-embed-text, local, not the scarce resource this project's P9 names). Raw: results/${OUT}`);
