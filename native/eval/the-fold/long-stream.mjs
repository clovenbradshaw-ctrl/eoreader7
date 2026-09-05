// eval/the-fold/long-stream.mjs — the long-stream stress (S77 / P121): many
// large sources of different kinds attached at once, a chat run for N turns
// through the REAL fold turn (holon.js::runHolonicTask with the product
// reader configuration — lib/product-assay.mjs::organs), the ledger and
// grid threaded turn to turn, and every fifth turn an adversarial probe on
// recall (a cloze over a passage the material holds), memory (what did you
// answer N turns ago), injection (a false premise built by moving one atom
// of a real fact) and reasoning (two sources, an exact difference) — each
// scored mechanically (lib/long-stream.mjs). Nothing here grades a model
// with a model.
//
//   node eval/the-fold/long-stream.mjs [--turns 1000] [--model gemma2:2b] [--depth 1]
//        [--every 5] [--seed 1] [--witness on|off] [--cap 0] [--resume <dir>]
//        [--source kind=path ...]   (repeatable; replaces the default six)
//
// Sources by default (large, of six kinds, none personal):
//   prose    the-fold/pg2600.txt                                   (War and Peace, 3.3 MB)
//   greek    eoreader7/legacy-eoreader6.1/odyssey-greek.txt        (Greek, 0.7 MB)
//   markdown the-fold/POLICIES.md                                   (0.8 MB)
//   code     the-fold/holon.js                                      (0.18 MB)
//   json     eoreader7/native/eval/the-fold/results/stress-eval-all.json
//   html     eoreader7/native/eval/the-fold/fixtures/wikipedia-american-civil-war.html
//
// Every turn appends one JSON row to <dir>/turns.jsonl and rewrites
// <dir>/state.json (history, ledger, grid, bank, rng draws), so a run that
// dies resumes at its last turn with --resume <dir>. The configuration is
// printed first (P88) and written to <dir>/config.json.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";
import { organs as productOrgans } from "./lib/product-assay.mjs";
import { buildFactBank, makeRng, recallProbe, scoreRecall, memoryProbe, scoreMemory, injectionProbe, scoreInjection, reasoningProbe, scoreReasoning, organicQuestion, scheduleFor, memoryDistanceFor } from "./lib/long-stream.mjs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const ROOT = new URL("../../../../", import.meta.url).pathname;   // 3.0/
const FOLD = `${ROOT}the-fold/`;
const OLLAMA = process.env.OLLAMA ?? "http://127.0.0.1:11434";

// ── arguments ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] != null ? args[i + 1] : dflt; };
const TURNS = Number(flag("turns", 1000));
const MODEL = flag("model", "gemma2:2b");
const DEPTH = Number(flag("depth", 1));
const EVERY = Number(flag("every", 5));
const SEED = Number(flag("seed", 1));
const WITNESS = flag("witness", "on") !== "off";
const CAP = Number(flag("cap", 0));
const RESUME = flag("resume", null);
const PER_SOURCE = Number(flag("bank", 60));
const sourceArgs = args.flatMap((a, i) => (a === "--source" && args[i + 1] ? [args[i + 1]] : []));
const DEFAULT_SOURCES = [
  { kind: "prose", path: `${FOLD}pg2600.txt` },
  { kind: "greek", path: `${ROOT}eoreader7/legacy-eoreader6.1/odyssey-greek.txt` },
  { kind: "markdown", path: `${FOLD}POLICIES.md` },
  { kind: "code", path: `${FOLD}holon.js` },
  { kind: "json", path: `${NATIVE}/eval/the-fold/results/stress-eval-all.json` },
  { kind: "html", path: `${NATIVE}/eval/the-fold/fixtures/wikipedia-american-civil-war.html` },
];
const SOURCES = sourceArgs.length ? sourceArgs.map((s) => { const [kind, ...rest] = s.split("="); return { kind, path: rest.join("=") }; }) : DEFAULT_SOURCES;

// ── the organs: the product configuration, headless ─────────────────────────
const O = await productOrgans();
const { runHolonicTask, needsDecomposition } = await import(`${FOLD}holon.js`);
const { makeCastResolver } = await import(`${FOLD}cast.js`);
const { mechanicalFoldLine, RECENCY_WINDOW } = await import(`${FOLD}fold.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { lineIndex, outlineOfIndex } = await import(`${ROOT}eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/segments.js`);
const W = await import(`${NATIVE}/organs/index.js`);
const castFor = makeCastResolver({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });

// ── the material ────────────────────────────────────────────────────────────
const htmlToText = (html) => String(html).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n");
const windowed = (text, size) => { const out = []; let i = 0; while (i < text.length) { let j = Math.min(text.length, i + size); const nl = text.lastIndexOf("\n", j); const cm = text.lastIndexOf(",", j); const cut = nl > i + size / 2 ? nl + 1 : cm > i + size / 2 ? cm + 1 : j; out.push(text.slice(i, cut)); i = cut; } return out.join("\n\n"); };
const boundariesOf = (t) => { try { const out = outlineOfIndex(lineIndex(t), { max: 5000 }); if (out.gap || out.headings.length < 2) return null; return out.headings.map((h) => ({ start: h.start, end: h.end, label: h.label })); } catch { return null; } };
const chunks = [];
const loaded = [];
for (const s of SOURCES) {
  if (!existsSync(s.path)) { console.error(`source missing: ${s.path}`); process.exit(2); }
  let text = readFileSync(s.path, "utf8");
  if (s.kind === "html") text = htmlToText(text);
  if (CAP > 0 && text.length > CAP) text = text.slice(0, CAP);
  // A file with no paragraph breaks (a JSON dump, a minified line) would be
  // one chunk the size of the file; windows of ~1,500 chars cut at a line
  // end (or a comma, for one-line JSON) keep a retrieved passage readable.
  // Declared here, not measured (P9).
  if (!/\n\s*\n/.test(text)) text = windowed(text, 1500);
  const name = s.path.split("/").pop();
  const cs = O.chunkSource(name, text, { boundaries: s.kind === "prose" || s.kind === "markdown" ? boundariesOf(text) : null }).map((c) => ({ ...c, source: name, kind: s.kind }));
  chunks.push(...cs);
  loaded.push({ kind: s.kind, name, bytes: text.length, chunks: cs.length });
}

// ── the model ───────────────────────────────────────────────────────────────
const usage = { calls: 0, promptTokens: 0, completionTokens: 0 };
async function call(messages, opts = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const body = { model: MODEL, stream: false, options: { temperature: 0, num_predict: opts.maxTokens ?? 512 }, messages };
      if (opts.json) body.format = opts.json === true ? "json" : opts.json;
      const res = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(600000) });
      if (!res.ok) throw new Error(`ollama ${res.status}`);
      const data = await res.json();
      usage.calls += 1; usage.promptTokens += data.prompt_eval_count ?? 0; usage.completionTokens += data.eval_count ?? 0;
      return data.message?.content ?? "";
    } catch (err) { if (attempt === 1) throw err; }
  }
}
const sameAct = O.RELATION_READER_OPTIONS.createLemmatizer().sameAct;
const witnessAsk = async (s, slice) => W.readTestimony(await call(W.buildWitnessMessages(s, slice), { json: W.WITNESS_SCHEMA, maxTokens: 200 }));
const witnessSelect = async (messages) => { try { return JSON.parse(await call(messages, { json: W.SELECT_SCHEMA, maxTokens: 120 })); } catch { return {}; } };
const witnessSentences = WITNESS ? (sentences, claims, passages, { maxAsks }) => W.witnessSentences(sentences, claims, passages, { ask: witnessAsk, selectAsk: witnessSelect, splitSentences, testimony: { witnessSlice: W.witnessSlice, siblingSwap: W.siblingSwap, foldTestimony: W.foldTestimony, buildSelectMessages: W.buildSelectMessages, foldSelect: W.foldSelect, sameForm: sameAct }, maxAsks }) : null;

// ── state: fresh or resumed ─────────────────────────────────────────────────
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const DIR = RESUME ?? join(NATIVE, "eval/the-fold/results/long-stream", `${stamp}-${MODEL.replace(/[^\w.-]+/g, "_")}-d${DEPTH}`);
mkdirSync(DIR, { recursive: true });
const TURNS_PATH = join(DIR, "turns.jsonl"), STATE_PATH = join(DIR, "state.json"), CONFIG_PATH = join(DIR, "config.json");
let state;
const rng = makeRng(SEED);
if (RESUME && existsSync(STATE_PATH)) {
  state = JSON.parse(readFileSync(STATE_PATH, "utf8"));
  rng.advanceTo(state.draws ?? 0);
  console.log(`resumed ${DIR} at turn ${state.turn}`);
} else {
  const bank = buildFactBank(chunks, { perSource: PER_SOURCE, rng });
  state = { turn: 0, history: [], transcript: [], hlLog: null, gridLog: null, bank, draws: rng.draws };
  writeFileSync(TURNS_PATH, "");
}
const config = { ran: new Date().toISOString(), model: MODEL, depth: DEPTH, turns: TURNS, every: EVERY, seed: SEED, witness: WITNESS, cap: CAP, bank: PER_SOURCE, sources: loaded, chunks: chunks.length, bankSize: state.bank.length, bankBySource: Object.fromEntries(loaded.map((l) => [l.name, state.bank.filter((f) => f.source === l.name).length])), recencyWindow: RECENCY_WINDOW, frame: O.frame, recipe: O.recipe, ollama: OLLAMA, note: "the fold's turn, headless: retrieval on the question's own words, the product reader, the ledger and grid threaded turn to turn; every fifth turn a probe scored with no model" };
writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
console.log(`long-stream — ${MODEL}, depth ${DEPTH}, ${TURNS} turns, probe every ${EVERY}, witness ${WITNESS ? "on" : "off"}`);
for (const l of loaded) console.log(`  ${l.kind.padEnd(8)} ${l.name.padEnd(36)} ${String(l.bytes).padStart(9)} bytes ${String(l.chunks).padStart(5)} chunks  bank ${config.bankBySource[l.name]}`);
console.log(`  ${chunks.length} chunks in all; bank ${state.bank.length}; recipe ${O.recipe}\n  ${DIR}`);

const saveState = () => { const tmp = `${STATE_PATH}.tmp`; writeFileSync(tmp, JSON.stringify({ ...state, draws: rng.draws })); renameSync(tmp, STATE_PATH); };
const ledgerSize = () => { try { return state.hlLog ? O.hl.fold(state.hlLog).length : 0; } catch { return null; } };

// ── the turns ───────────────────────────────────────────────────────────────
for (let turn = state.turn + 1; turn <= TURNS; turn++) {
  const sched = scheduleFor(turn, EVERY);
  let probe = null, question = null, earlier = null, organic = null;
  if (sched.kind === "recall") probe = recallProbe(rng.pick(state.bank), rng);
  else if (sched.kind === "memory") { const d = memoryDistanceFor(turn, rng); const cands = d ? state.transcript.filter((t) => t.turn === turn - d) : []; earlier = cands[0] ?? null; probe = earlier ? memoryProbe(earlier, d) : null; if (!probe) { earlier = [...state.transcript].reverse().find((t) => memoryProbe(t, turn - t.turn)) ?? null; probe = earlier ? memoryProbe(earlier, turn - earlier.turn) : null; } }
  else if (sched.kind === "injection") probe = injectionProbe(rng.pick(state.bank), rng, state.bank);
  else if (sched.kind === "reasoning") { for (let i = 0; i < 20 && !probe; i++) probe = reasoningProbe(rng.pick(state.bank), rng.pick(state.bank)); }
  if (probe) question = probe.question;
  else { organic = organicQuestion(state.bank, rng, turn); question = organic.question; }

  const t0 = Date.now(); const calls0 = usage.calls, pt0 = usage.promptTokens, ct0 = usage.completionTokens;
  const history = state.history.slice(-RECENCY_WINDOW);
  const discourse = mechanicalFoldLine(state.history.slice(-2).map((h) => h.content).join(" "), "");
  let r = null, error = null;
  try {
    r = await runHolonicTask({
      task: question, chunks, call, foldedRefs: [],
      makeNameResolver: castFor, makeRelationReader: O.relationsFor, witnessSentences,
      checkLink: null, planMode: needsDecomposition(question) ? "model" : "flat",
      chatHistory: history, discourse, depth: DEPTH,
      hyperlexicon: O.hl, hyperlexiconLog: state.hlLog, hyperlexiconFrame: O.frame, hyperlexiconRecipe: O.recipe,
      grid: O.grid, gridLog: state.gridLog, runCapacity: O.runCapacity,
    });
  } catch (e) { error = String(e?.stack ?? e?.message ?? e).slice(0, 600); }
  const answer = r ? String(r.output ?? "") : "";
  if (r?.hyperlexiconLog) state.hlLog = r.hyperlexiconLog;
  if (r?.gridLog) state.gridLog = r.gridLog;
  let score = null;
  if (probe && r) {
    if (probe.kind === "recall") score = scoreRecall(answer, probe);
    else if (probe.kind === "memory") score = scoreMemory(answer, probe, earlier.answer);
    else if (probe.kind === "injection") score = scoreInjection(answer, probe);
    else if (probe.kind === "reasoning") score = scoreReasoning(answer, probe);
  }
  const row = {
    turn, at: new Date().toISOString(), kind: probe?.kind ?? "organic", question, answer, probe: probe ? { ...probe, question: undefined } : null, ...(organic ? { organic } : {}), score,
    ms: Date.now() - t0, calls: usage.calls - calls0, promptTokens: usage.promptTokens - pt0, completionTokens: usage.completionTokens - ct0,
    refs: r?.refs ?? [], unsupported: (r?.unsupported ?? []).length, unbacked: (r?.unbacked ?? []).length, sections: (r?.sections ?? []).length,
    witnessAsks: (r?.sections ?? []).reduce((a, s) => a + (s.witness?.asks ?? 0), 0), retrieved: (r?.sections ?? []).flatMap((s) => (s.passages ?? []).map((p) => p.source ?? String(p.ref ?? "").split("#")[0])),
    ledgerNotes: ledgerSize(), historyTurns: history.length, error,
  };
  appendFileSync(TURNS_PATH, JSON.stringify(row) + "\n");
  if (!error) { state.history.push({ role: "user", content: question }, { role: "assistant", content: answer }); state.transcript.push({ turn, question, answer }); }
  state.turn = turn; saveState();
  const verdict = score ? (score.verdict ?? (score.any != null ? `any=${score.any} share=${score.share.toFixed(2)}${score.contradicted ? " CONTRADICTED" : ""}` : "")) : "";
  console.log(`[${turn}/${TURNS}] ${row.kind.padEnd(9)} ${(row.ms / 1000).toFixed(0).padStart(4)}s ${String(row.calls).padStart(2)} calls ${verdict.padEnd(12)} ${error ? "ERROR " + error.split("\n")[0].slice(0, 80) : question.slice(0, 70).replace(/\s+/g, " ")}`);
}
console.log(`\ndone — ${usage.calls} calls, ${usage.promptTokens} prompt tokens, ${usage.completionTokens} completion tokens; ${DIR}`);
console.log(`score: node eval/the-fold/long-stream-score.mjs ${DIR}`);
