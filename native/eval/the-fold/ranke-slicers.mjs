// ranke-slicers.mjs — WHEN DOES THE SYSTEM EARN AN LLM OR AN EMBEDDER?
//
// This driver is a licensing test, not a leaderboard. Its subject is the 162
// object-missing `partial` notes the Apollo 11 backwards walk left standing
// (ranke-backwards-RESULTS.md): the article states a proposition, the cited
// source is readable and genuinely states it, and every mechanical instrument
// this project owns measured AT PARITY WITH ITS OWN CONTROL on them. The
// source says it in other words.
//
// ── THE LICENSING RULE, PRE-REGISTERED BEFORE THE RUN ────────────────────
//
// A learned component (a model that reads, an embedder that ranks) earns a
// slot when all five hold, and is refused when any fails:
//
//  L1. PARITY IS THE LICENSE. The mechanical organ already in the tree must
//      be measured AT PARITY WITH ITS OWN CONTROL on this question. Parity
//      means the instrument carries zero information here — that is the only
//      condition under which a model call is not P30 waste. Where the
//      mechanical organ separates from control, spending a call is buying
//      what is already free. (Run 4 established parity for containment at
//      every grain; this driver re-measures it as arm 1 rather than citing
//      it, so the license is re-earned in the same run it is spent in.)
//  L2. IT BEATS THE CHEAP ORGAN AT THE SAME REACH. Not "beats nothing" —
//      P60's fourth amendment is the standing reminder that the skipped
//      control is the dumb baseline. Containment and referent activation are
//      both run here, so the embedder is never compared only to itself.
//  L3. IT BEATS ITS OWN CONTROL BUILT TO FAIL (II.23). Every arm runs twice:
//      once on the real ledger, once on the SAME ledger with end2 rotated to
//      the next note's object, through the IDENTICAL slicer and the identical
//      witness. An arm that lands rotated claims as often as real ones is
//      measuring topic, not proposition, and is refused on the spot.
//  L4. ITS AUTHORITY IS BOUNDED TO WHAT THE CONTROL COVERS. An embedder may
//      RANK (choose where to look); it may never DECIDE. A model may POINT
//      (the select protocol — there is nothing to write, so the echo failure
//      mode is structurally impossible); it may never WRITE a fact. Every
//      wrong answer either arm can give must be catchable downstream by an
//      organ that is NOT learned: here the sibling-swap arm, the
//      indiscriminate-pick check, the decider-company wall, and the
//      distinct-source count all sit below the model and none of them is a
//      model. This is why `witnessNote` gained an injectable candidate set
//      and NOT a second protocol — a slicer can change where the model is
//      asked to look, never whether its yes counts.
//  L5. THE ABSENCE IS TYPED. A component that cannot run reports a named gap
//      and the run continues; it never silently becomes a no-op arm that
//      then reads as "no lift".
//
// And the retirement clause, which is the ratchet applied to learned parts:
// when a mechanical organ is later measured to separate from control at the
// same reach, the learned component is WITHDRAWN from that slot. Earning a
// slot is not owning it.
//
// ── WHAT IS ACTUALLY BEING COMPARED ──────────────────────────────────────
//
// `statingCandidates`' gate is `h1 > 0 && h2 > 0`: BOTH ends must fire
// literally, or the select protocol is offered nothing and `witnessNote`
// falls through to a generate call on a containment slice. On an
// object-missing partial end2 never fires, BY DEFINITION of the class. So
// the armed select protocol — the good one, the one whose yes is checked by
// a swap — has never once run on this material. Arm 0 measures exactly that
// and is expected to be zero; it is here because a structural claim should
// be a number in the same table as the arms that answer it.
//
// The three slicers differ ONLY in how they rank; the candidate POOL is
// identical (statingCandidates' own minLen/maxLen), the count is identical
// (its own limit of 8 — the giver is the existing default, not a new
// number), and the witness below them is byte-identical:
//   containment  — the claim's own content words present, morphology folded
//                  (the run-4 instrument, promoted from one sentence to a
//                  ranked list so it competes on equal terms)
//   activation   — where end1's REFERENT is active, not where its words are:
//                  the kernel's own createActivation folded over referent
//                  mentions per sentence, window declared = 3, the giver
//                  being the backwards walk's own `window` class so reach is
//                  measured at one grain across both drivers. This is the
//                  slicer that can see "the crew", "it", "the module".
//   random       — a seeded shuffle: THE CONFOUND CONTROL. Every arm here
//                  relaxes the both-ends gate, which alone hands the select
//                  protocol eight sentences it never had; without this arm a
//                  lift from the relaxed gate would be credited to a slicer.
//   embedding    — cosine to the claim sentence (all-MiniLM-L6-v2, local,
//                  vendored through the-fold's node_modules). LEAD-FINDER
//                  ONLY (L4). If the package or model is absent this arm
//                  reports `unavailable` and the run continues (L5).
//
// env: N notes (declared budget, P9) · K candidates (8) · WINDOW (3) ·
//      MODEL (gemma2:2b) · SLICERS (comma list) · EMB (0 to skip) ·
//      FROM (a backwards-walk JSON other than this page's) · OUT · SEED ·
//      FRESH=1 to discard the checkpoint and re-run every arm
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const HERE = new URL("./", import.meta.url).pathname;
const FIX = `${HERE}fixtures`;
const N_NOTES = Number(process.env.N ?? 40);
const K = Number(process.env.K ?? 8);
const WINDOW = Number(process.env.WINDOW ?? 3);
const MODEL = process.env.MODEL ?? "gemma2:2b";
const WANT = (process.env.SLICERS ?? "stating,random,containment,activation,embedding").split(",").map((s) => s.trim()).filter(Boolean);
const SEED = Number(process.env.SEED ?? 0);
const OUT = process.env.OUT ?? "ranke-slicers.json";
const CLAIM = process.env.CLAIM ?? "fragment"; // fragment (claimOfNote) | article (row.article — reading-wall-RESULTS.md)
const LABELED = process.env.LABELED ?? null; // LABELED=stated — only ids whose label status starts with this (results/slicer-labels.json)

const { statingCandidates, witnessNote, textFeatures } = await import(`${NATIVE}/organs/corroboration.js`);
const T = await import(`${NATIVE}/organs/index.js`);
const R = await import(`${NATIVE}/organs/ranke.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { createLemmatizer, morphologyFromPrior } = await import(`${NATIVE}/adapters/text/morphology.js`);
const { createActivation } = await import(`${NATIVE}/kernel/activation.js`);
const { createSeededRng } = await import(`${NATIVE}/kernel/rng.js`);
const morph = morphologyFromPrior(JSON.parse(readFileSync(`${FIX}/unimorph-morphology-prior.json`, "utf8")));
const { sameAct } = createLemmatizer(morph.forms, { language: morph.language });

// ── the embedder, optional and typed when absent (L5) ────────────────────
let embed = null, embedGap = null;
if (WANT.includes("embedding") && process.env.EMB !== "0") {
  try {
    const { pipeline } = await import(new URL("../../../../the-fold/node_modules/@huggingface/transformers/dist/transformers.node.cjs", import.meta.url).pathname);
    // the NODE build specifically: the bare dist/transformers.js entry
    // resolves localModelPath to "/models" and cannot fall back to remote,
    // so it throws "Unable to get model file path or buffer" — measured,
    // not guessed. Needs NODE_USE_ENV_PROXY=1 where egress is proxied, the
    // same environment fact ranke-backwards.mjs's own header records.
    const ex = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
    embed = async (texts) => (await ex(texts, { pooling: "mean", normalize: true })).tolist();
    console.log("embedder: Xenova/all-MiniLM-L6-v2 (q8), local");
  } catch (e) { embedGap = { type: "unavailable", detail: String(e?.message ?? e).slice(0, 120) }; console.log(`embedder: UNAVAILABLE — ${embedGap.detail}`); }
}
const cosine = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

// ── the target set ───────────────────────────────────────────────────────
const backwards = JSON.parse(readFileSync(process.env.FROM ?? `${HERE}results/ranke-backwards.json`, "utf8"));
const targets = backwards.real.rows
  .filter((r) => r.cls === "partial" && r.missingSide === "object" && r.facePath && existsSync(`${FIX}/${r.facePath}`))
  .slice(0, N_NOTES);
const allObjMissing = backwards.real.rows.filter((r) => r.cls === "partial" && r.missingSide === "object").length;
console.log(`object-missing partials: ${allObjMissing}; with a kept face on disk: ${backwards.real.rows.filter((r) => r.cls === "partial" && r.missingSide === "object" && r.facePath && existsSync(`${FIX}/${r.facePath}`)).length}; walked here (declared budget N): ${targets.length}`);

// ends: end1/end2 are recovered from the note line the walk recorded
const endsOf = (row) => { const m = String(row.note).match(/^(.*?) —(.*?)→ (.*)$/); return m ? { end1: m[1], label: m[2], end2: m[3] } : null; };

// ── the shared candidate pool: identical for every slicer ────────────────
const MINLEN = 12, MAXLEN = 400;
const faceCache = new Map();
function poolOf(facePath) {
  if (faceCache.has(facePath)) return faceCache.get(facePath);
  const src = readFileSync(`${FIX}/${facePath}`, "utf8");
  const sents = splitSentences(src);
  // the address is carried forward from the cut (P5.2), never searched for
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
    pool.push({ shown, raw: rawBytes, start, end, order: pool.length, words: new Set(shown.toLowerCase().match(/\p{L}{3,}/gu) ?? []) });
  }
  // referent activation, computed once per face: walk the pool in order,
  // observe the referents each sentence mentions, and record every
  // referent's activation AFTER that sentence. A sentence scores by how
  // present a referent is there — which is high at a mention and for a
  // declared window after it, and that is the whole point: the source names
  // the thing once and then says "the crew".
  const surfaces = extractSurfaces(sents);
  const refOf = new Map();
  try { for (const e of discoverReferents(surfaces, {}).events) refOf.set(diaNorm(e.surface), e.referent_id); } catch { /* no referents: activation arm scores flat, reported as such */ }
  // per sentence, WHICH referents it mentions — a small set, not a full
  // activation map: the clock ticks once per observe() regardless of how
  // many keys it carries, so a later pass may observe only the referents it
  // cares about and get the identical decay. Storing the whole map here
  // instead was O(sentences x referents) and would not survive a book.
  for (const c of pool) {
    const low = c.shown.toLowerCase();
    c.seen = new Set();
    for (const [surface, id] of refOf) if (low.includes(surface)) c.seen.add(id);
  }
  const out = { src, pool, refOf, referents: new Set(refOf.values()) };
  faceCache.set(facePath, out);
  return out;
}

// ── the slicers: same pool, same K, only the ranking differs ─────────────
const featWords = (t) => [...textFeatures(t)];
function rankContainment(face, ends) {
  const want = [...new Set([...featWords(ends.end1), ...featWords(ends.end2)])];
  return face.pool.map((c) => ({ c, score: want.filter((w) => c.words.has(w) || [...c.words].some((x) => sameAct(x, w))).length }));
}
function rankActivation(face, ends) {
  // which referent is end1? the surface whose folded form the end names.
  const f1 = featWords(ends.end1);
  const ids = new Set();
  for (const [surface, id] of face.refOf) if (f1.some((w) => surface.includes(w) || w.includes(surface))) ids.add(id);
  if (!ids.size) return null; // typed absence: this face has no referent for end1
  const act = createActivation({ window: WINDOW });
  return face.pool.map((c) => { act.observe([...c.seen].filter((id) => ids.has(id))); return { c, score: [...ids].reduce((s, id) => s + act.activationOf(id), 0) }; });
}
// THE CONFOUND CONTROL, and the reason it is not optional. Every arm below
// relaxes statingCandidates' both-ends gate, which by itself hands the
// select protocol eight sentences it never had. If a RANDOM eight lands as
// often as a ranked eight, the lift belongs to the relaxed gate and not to
// any slicer, and reporting a ranked arm's number without this one would
// credit the wrong thing. Seeded and declared, so it re-runs identically.
function rankRandom(face, ends) {
  const rng = createSeededRng(`${SEED}|${ends.end1}|${ends.end2}`);
  return face.pool.map((c) => ({ c, score: rng() + 1e-9 }));
}
async function rankEmbedding(face, ends, claimSentence) {
  if (!embed) return null;
  if (!face.vecs) face.vecs = await embed(face.pool.map((c) => c.shown));
  const [q] = await embed([claimSentence]);
  return face.pool.map((c, i) => ({ c, score: cosine(q, face.vecs[i]) }));
}
const topK = (scored) => scored == null ? null : scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score || a.c.order - b.c.order).slice(0, K).map((s) => s.c);

// ── the witness: byte-identical below every slicer (L4) ──────────────────
let modelCalls = 0;
const chat = async (messages, schema) => { modelCalls += 1; const res = await fetch("http://127.0.0.1:11434/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: MODEL, stream: false, format: schema, options: { num_predict: 200, temperature: 0 }, messages }) }); if (!res.ok) throw new Error(`ollama ${res.status}`); return (await res.json())?.message?.content ?? ""; };
const witness = {
  ask: async (sen, sl) => T.readTestimony(await chat(T.buildWitnessMessages(sen, sl), T.WITNESS_SCHEMA)),
  selectAsk: async (messages) => { try { return JSON.parse(await chat(messages, T.SELECT_SCHEMA)); } catch { return {}; } },
  testimony: { witnessSlice: T.witnessSlice, siblingSwap: T.siblingSwap, foldTestimony: T.foldTestimony, buildSelectMessages: T.buildSelectMessages, foldSelect: T.foldSelect, sameForm: sameAct },
  splitSentences,
};

async function candidatesFor(name, face, ends, claimSentence) {
  if (name === "stating") return statingCandidates(face.src, ends, { splitSentences, limit: K });
  if (name === "random") return topK(rankRandom(face, ends));
  if (name === "containment") return topK(rankContainment(face, ends));
  if (name === "activation") return topK(rankActivation(face, ends));
  if (name === "embedding") return topK(await rankEmbedding(face, ends, claimSentence));
  throw new Error(`unknown slicer ${name}`);
}

// CHECKPOINT AND RESUME. A full pass is ~2h of model calls on this CPU and
// the container it runs in can be restarted out from under it — measured,
// once, losing a complete pass. So each arm's result is written the moment
// it lands, and a re-run reads what is already there and skips it. Not an
// optimisation: an unwritten arm is an arm nobody can check.
const CKPT = `${HERE}results/${OUT}`;
let ckpt = existsSync(CKPT) ? JSON.parse(readFileSync(CKPT, "utf8")) : { real: {}, control: {} };
if (process.env.FRESH === "1") ckpt = { real: {}, control: {} };
const save = () => writeFileSync(CKPT, JSON.stringify(ckpt, null, 2));

async function arm(rows, label) {
  const out = ckpt[label] ?? (ckpt[label] = {});
  for (const name of WANT) {
    if (out[name] && !out[name].gap) { console.log(`  ${label} · ${name}: already on the checkpoint — states ${out[name].states}, skipped`); continue; }
    if (name === "embedding" && !embed) { out[name] = { gap: embedGap ?? { type: "skipped" } }; save(); continue; }
    const t0 = Date.now(); const verdicts = {}; const landings = []; const candKeys = []; const perNote = []; let offered = 0, noCandidates = 0;
    for (const { row, ends, face } of rows) {
      const claim = R.claimOfNote(ends);
      // CLAIM=article: the article's own sentence (row.article, carried on
      // every walk row) is the claim the witness is shown, instead of the
      // extraction fragment. Mechanical — nothing rewritten. A control row
      // carries `claimText` already substituted (or null: unbuildable).
      const claimText = CLAIM === "article" ? (label === "control" ? ends.claimText ?? null : (row.article ? String(row.article).replace(/\s+/g, " ").trim() : null)) : claim.sentence;
      if (CLAIM === "article" && !claimText) { verdicts["control-unbuildable"] = (verdicts["control-unbuildable"] ?? 0) + 1; perNote.push({ id: row.id, verdict: "control-unbuildable" }); continue; }
      const cands = await candidatesFor(name, face, ends, claim.sentence);
      if (cands == null) { noCandidates += 1; verdicts.no_slicer_candidate = (verdicts.no_slicer_candidate ?? 0) + 1; continue; }
      if (!cands.length) { noCandidates += 1; verdicts.no_candidate = (verdicts.no_candidate ?? 0) + 1; continue; }
      offered += 1;
      candKeys.push(cands.map((c) => `${c.start ?? "?"}:${c.shown.slice(0, 60)}`));
      const w = await witnessNote(claimText, { ref: row.host, text: face.src }, { ...witness, ends: { end1: ends.end1, end2: ends.end2 }, candidates: cands });
      const v = w.refused ? `refused:${w.refused}` : w.verdict;
      verdicts[v] = (verdicts[v] ?? 0) + 1;
      perNote.push({ id: row.id, claim: claimText, verdict: v, index: w.span?.at ?? null, at: w.at ?? null, arm: w.arm ?? null, because: w.verdict === "states" ? String(w.because ?? "").replace(/\s+/g, " ").slice(0, 220) : null });
      if (w.verdict === "states") landings.push({ note: row.note, host: row.host, because: String(w.because ?? "").replace(/\s+/g, " ").slice(0, 220), span: w.span?.at ?? null });
    }
    out[name] = { claim: CLAIM, offered, noCandidates, verdicts, states: verdicts.states ?? 0, contradicts: verdicts.contradicts ?? 0, landings, candKeys, perNote, seconds: Math.round((Date.now() - t0) / 1000) };
    save();
    console.log(`  ${label} · ${name}: offered ${offered}/${rows.length}, states ${verdicts.states ?? 0}, contradicts ${verdicts.contradicts ?? 0}, ${JSON.stringify(verdicts)} — ${Math.round((Date.now() - t0) / 1000)}s`);
  }
  return out;
}

// build the real and control row sets over the SAME faces
const real = [], control = [];
for (let i = 0; i < targets.length; i += 1) {
  const row = targets[i], ends = endsOf(row);
  if (!ends) continue;
  const face = poolOf(row.facePath);
  real.push({ row, ends, face });
  // II.23: end2 rotated to the NEXT target's object — same subject, same
  // face, same slicer, a proposition the source does not make.
  const rot = endsOf(targets[(i + 1) % targets.length]);
  // the article-form control: the article sentence with end2 swapped for
  // the rotated end2, verbatim; end2 not in the sentence -> unbuildable
  const art = row.article ? String(row.article).replace(/\s+/g, " ").trim() : "";
  const i2 = art.toLowerCase().indexOf(String(ends.end2).toLowerCase());
  const claimText = i2 >= 0 ? art.slice(0, i2) + rot.end2 + art.slice(i2 + ends.end2.length) : null;
  control.push({ row, ends: { end1: ends.end1, label: ends.label, end2: rot.end2, claimText }, face });
}
// ONLY=3,42,45 — restrict the walk to declared note indices (positions in the
// real[] order the coverage pass and the labels both use). The control row
// keeps its rotation from the full target list: still a proposition the same
// page does not make. Lets a budgeted run spend only where a label says the
// answer is present to be pointed at.
if (process.env.ONLY) {
  const keep = new Set(process.env.ONLY.split(",").map((x) => Number(x.trim())).filter(Number.isFinite));
  const r2 = [], c2 = [];
  for (let i = 0; i < real.length; i += 1) if (keep.has(i)) { r2.push(real[i]); c2.push(control[i]); }
  real.length = 0; control.length = 0; real.push(...r2); control.push(...c2);
  console.log(`ONLY: walking ${real.length} declared notes [${[...keep].join(",")}]`);
}
if (LABELED) {
  const L = JSON.parse(readFileSync(`${HERE}results/slicer-labels.json`, "utf8")).labels;
  const r2 = [], c2 = [];
  for (let i = 0; i < real.length; i += 1) if (String(L[real[i].row.id]?.status ?? "").startsWith(LABELED)) { r2.push(real[i]); c2.push(control[i]); }
  real.length = 0; control.length = 0; real.push(...r2); control.push(...c2);
  console.log(`LABELED=${LABELED}: walking ${real.length} labeled notes; claim form ${CLAIM}`);
}
const poolSizes = [...faceCache.values()].map((f) => f.pool.length).sort((x, y) => y - x);
console.log(`faces: ${poolSizes.length}; candidate pool per face (identical for every slicer) median ${poolSizes[poolSizes.length >> 1]}, largest ${poolSizes[0]}\n`);


// ── exported so a zero-call pass can measure the SAME instrument ─────────
// The coverage pass asks a question that needs no witness: does a slicer's
// top-K even CONTAIN a sentence that states the proposition? That is a
// property of the ranking alone. Re-implementing the pool or the rankings
// in a sibling script would measure a copy, so they are exported and the
// driver's own run is guarded below.
export { poolOf, candidatesFor, endsOf, targets, real, control, K, WANT, faceCache, allObjMissing, backwards, R };

if (import.meta.main) {
  console.log("REAL:");
  const realOut = await arm(real, "real");
  console.log("CONTROL (end2 rotated, same face, same slicer, same witness):");
  const ctlOut = await arm(control, "control");

  console.log(`\nLICENSE TABLE (states, of ${real.length} notes):`);
  console.log(`  ${"slicer".padEnd(13)} ${"offered".padEnd(8)} ${"real".padEnd(6)} ${"control".padEnd(8)} verdict`);
  const license = {};
  for (const name of WANT) {
    const r = realOut[name], c = ctlOut[name];
    if (r?.gap) { console.log(`  ${name.padEnd(13)} ${"—".padEnd(8)} ${"—".padEnd(6)} ${"—".padEnd(8)} unavailable: ${r.gap.detail ?? r.gap.type}`); license[name] = { verdict: "unavailable", gap: r.gap }; continue; }
    const sep = r.states - (c?.states ?? 0);
    // Does the II.23 control actually change what this arm ranks? An arm that
    // reads end1 only sees the identical top-K under a rotated end2, so any
    // separation it shows is the WITNESS discriminating between two claims
    // over the same eight sentences — real, but not a property of the slicer,
    // and not the thing L3 licenses. Measured, not assumed: the zero-call
    // pass found activation identical on 69/69 (slicer-coverage-RESULTS.md).
    const rk = r.candKeys ?? [], ck = c?.candKeys ?? [];
    const paired = Math.min(rk.length, ck.length);
    const identical = paired ? rk.slice(0, paired).filter((k, i) => JSON.stringify(k) === JSON.stringify(ck[i])).length : 0;
    const controlInert = paired > 0 && identical === paired;
    const verdict = r.offered === 0 ? "never offered — structurally inert on this class" : r.states === 0 ? "no landing — nothing to license" : sep <= 0 ? "REFUSED by its own control (II.23)" : controlInert ? "separates — but the control saw the IDENTICAL candidates: this is the witness's separation, not the slicer's; L3 unmeasured for this arm" : "separates from control";
    console.log(`  ${name.padEnd(13)} ${String(r.offered).padEnd(8)} ${String(r.states).padEnd(6)} ${String(c?.states ?? 0).padEnd(8)} ${verdict}`);
    license[name] = { verdict, offered: r.offered, states: r.states, controlStates: c?.states ?? 0, separation: sep, controlCandidatesIdentical: paired ? `${identical}/${paired}` : null };
  }

  console.log(`\nLANDINGS (the witness signed these; the decider is the source's own bytes):`);
  for (const name of WANT) for (const l of (realOut[name]?.landings ?? []).slice(0, 4)) console.log(`  [${name} · ${l.host}] ${l.note}\n     «${l.because}»\n     at ${l.span ?? "(address unverifiable)"}`);
  const ctlLandings = WANT.flatMap((n) => (ctlOut[n]?.landings ?? []).map((l) => ({ ...l, slicer: n })));
  if (ctlLandings.length) { console.log(`\nCONTROL LANDINGS (each one is evidence AGAINST the slicer that produced it):`); for (const l of ctlLandings.slice(0, 6)) console.log(`  [${l.slicer} · ${l.host}] ${l.note}\n     «${l.because}»`); }

  writeFileSync(CKPT, JSON.stringify({ page: backwards.page, objectMissingPartials: allObjMissing, walked: real.length, K, window: WINDOW, model: MODEL, embedder: embed ? "Xenova/all-MiniLM-L6-v2" : (embedGap ?? "skipped"), modelCalls, real: realOut, control: ctlOut, license }, null, 2));
  console.log(`\n${modelCalls} model calls. Raw: results/${OUT}`);

}
