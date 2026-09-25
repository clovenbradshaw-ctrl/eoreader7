// eval/the-fold/pipeline-long-stream.mjs — the long-stream stress THROUGH
// THE REAL PIPELINE. Not the headless fold turn (long-stream.mjs calls
// runHolonicTask directly and its model mouth goes straight at Ollama); this
// driver does what a real client does: every turn is POST /v1/ask on the live
// eoreader7 proxy (the reading pipeline: heimdall admission, swarm auto-route,
// antistrauss, the mechanical race, the reading envelope, the session fold),
// with the documents ATTACHED as browser-posted material, one sessionId across
// the whole run so the conversation accumulates into one reader fold.
//
//   node eval/the-fold/pipeline-long-stream.mjs [--turns 1000] [--model gemma2:2b]
//        [--every 5] [--seed 1] [--resume <dir>] [--send-history on|off]
//        [--source kind=path ...]  (repeatable; replaces the default six)
//
// The probes and the mechanical scoring are long-stream's own (lib/long-stream.mjs,
// verbatim): every 5th turn is an adversarial probe — recall (a cloze over a
// passage the material holds), memory (what did you answer N turns ago), injection
// (a false premise built by moving one atom of a real fact), reasoning (two
// sources, an exact difference) — scored mechanically, no model grades a model.
// Organic turns pivot topics across the corpus.
//
// A turn is POST /v1/ask { task, model, sessionId, attachments }. Attachments
// ride EVERY turn — the proxy dedupes by name+content (proxy-runner.mjs:4227),
// so re-admission is a no-op; riding every turn also makes a resumed run robust
// against a heimdall restart that wiped the in-memory session corpus. The
// response's `answer` is what shipped (the mechanical race winner, if it won);
// `race`, `answerShape`, `truncated`, `usage`, `relationEdges`,
// `referentBindings` ride the row so the pipeline's own behavior is disclosed,
// not assumed.
//
// Resumable like long-stream: every turn appends one JSON row to <dir>/turns.jsonl
// and rewrites <dir>/state.json (bank, transcript, rng draws). A run that dies
// resumes at its last turn with --resume <dir>.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { organs as productOrgans } from "./lib/product-assay.mjs";
import { buildFactBank, makeRng, recallProbe, scoreRecall, memoryProbe, scoreMemory, injectionProbe, scoreInjection, reasoningProbe, scoreReasoning, organicQuestion, scheduleFor, memoryDistanceFor } from "./lib/long-stream.mjs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const ROOT = new URL("../../../../", import.meta.url).pathname;
const FOLD = `${ROOT}the-fold/`;
const PROXY = (process.env.ER7 ?? "http://127.0.0.1:11436").replace(/\/+$/, "");

const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] != null ? args[i + 1] : dflt; };
const TURNS = Number(flag("turns", 1000));
const MODEL = flag("model", "gemma2:2b");
const EVERY = Number(flag("every", 5));
const SEED = Number(flag("seed", 1));
const SEND_HISTORY = flag("send-history", "off") === "on";
const RESUME = flag("resume", null);
const PER_SOURCE = Number(flag("bank", 60));
const sourceArgs = args.flatMap((a, i) => (a === "--source" && args[i + 1] ? [args[i + 1]] : []));
const DEFAULT_SOURCES = [
  { kind: "prose", path: `${FOLD}pg2600.txt` },
  { kind: "greek", path: `${ROOT}eoreader7/native/eval/fixtures/corpus/odyssey-greek.txt` },
  { kind: "xml", path: `${ROOT}live_priors/14-holy-texts/sblgnt/Luke.xml` },
  { kind: "code", path: `${ROOT}eopm/public/vendor/react-dom.js` },
  { kind: "json", path: `${NATIVE}/eval/the-fold/fixtures/unimorph-eng-verb-forms.json` },
  { kind: "html", path: `${NATIVE}/eval/the-fold/fixtures/wikipedia-abraham-lincoln.html` },
];
const SOURCES = sourceArgs.length ? sourceArgs.map((s) => { const [kind, ...rest] = s.split("="); return { kind, path: rest.join("=") }; }) : DEFAULT_SOURCES;

// ── the material, declared by content (P88), same corpus as long-stream ──────
const htmlToText = (html) => String(html).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n");
const windowed = (text, size) => { const out = []; let i = 0; while (i < text.length) { let j = Math.min(text.length, i + size); const nl = text.lastIndexOf("\n", j); const cm = text.lastIndexOf(",", j); const cut = nl > i + size / 2 ? nl + 1 : cm > i + size / 2 ? cm + 1 : j; out.push(text.slice(i, cut)); i = cut; } return out.join("\n\n"); };
const O = await productOrgans();
const chunks = [];
const loaded = [];
for (const s of SOURCES) {
  if (!existsSync(s.path)) { console.error(`source missing: ${s.path}`); process.exit(2); }
  let text = readFileSync(s.path, "utf8");
  if (s.kind === "html") text = htmlToText(text);
  if (!/\n\s*\n/.test(text)) text = windowed(text, 1500);
  const name = s.path.split("/").pop();
  const cs = O.chunkSource(name, text, { boundaries: null }).map((c) => ({ ...c, source: name, kind: s.kind }));
  chunks.push(...cs);
  loaded.push({ kind: s.kind, name, path: s.path, bytes: text.length, chunks: cs.length, sha256: createHash("sha256").update(text).digest("hex").slice(0, 16) });
}
const ATTACHMENTS = loaded.map((l) => ({ name: l.name, text: readFileSync(l.path, "utf8") }));

// ── state ────────────────────────────────────────────────────────────────────
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const DIR = RESUME ?? join(NATIVE, "eval/the-fold/results/pipeline-long-stream", `${stamp}-${MODEL.replace(/[^\w.-]+/g, "_")}`);
mkdirSync(DIR, { recursive: true });
const TURNS_PATH = join(DIR, "turns.jsonl"), STATE_PATH = join(DIR, "state.json"), CONFIG_PATH = join(DIR, "config.json");
const corpusId = createHash("sha256").update(loaded.map((l) => `${l.kind}:${l.name}:${l.sha256}`).join("|")).digest("hex").slice(0, 16);
let state;
const rng = makeRng(SEED);
if (RESUME && existsSync(STATE_PATH)) {
  state = JSON.parse(readFileSync(STATE_PATH, "utf8"));
  rng.advanceTo(state.draws ?? 0);
  console.log(`resumed ${DIR} at turn ${state.turn}`);
} else {
  const bank = buildFactBank(chunks, { perSource: PER_SOURCE, rng });
  state = { turn: 0, history: [], transcript: [], bank, draws: rng.draws, sessionId: `pipeline-${stamp}-${MODEL.replace(/[^\w.-]+/g, "_")}` };
  writeFileSync(TURNS_PATH, "");
}
const config = { ran: new Date().toISOString(), proxy: PROXY, model: MODEL, corpusId, turns: TURNS, every: EVERY, seed: SEED, sendHistory: SEND_HISTORY, sources: loaded, chunks: chunks.length, bankSize: state.bank.length, bankBySource: Object.fromEntries(loaded.map((l) => [l.name, state.bank.filter((f) => f.source === l.name).length])), sessionId: state.sessionId, note: "the REAL pipeline, headless client: every turn POST /v1/ask (heimdall admission, swarm auto-route, antistrauss, mechanical race, reading envelope, session fold), documents attached every turn (deduped by the proxy), one sessionId across the run; every 5th turn a probe scored with no model" };
writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
console.log(`pipeline-long-stream — ${MODEL} via ${PROXY}, ${TURNS} turns, probe every ${EVERY}, session ${state.sessionId}`);
for (const l of loaded) console.log(`  ${l.kind.padEnd(8)} ${l.name.padEnd(36)} ${String(l.bytes).padStart(9)} bytes ${String(l.chunks).padStart(5)} chunks  ${l.sha256}`);
console.log(`  ${chunks.length} chunks; bank ${state.bank.length}; corpus ${corpusId}\n  ${DIR}`);
const saveState = () => { const tmp = `${STATE_PATH}.tmp`; writeFileSync(tmp, JSON.stringify({ ...state, draws: rng.draws })); renameSync(tmp, STATE_PATH); };

// ── one turn through the pipeline ────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TURN_BUDGET_MS = 5 * 60 * 1000; // a turn may retry past refusals/restarts, but never hold the driver >5min
const BACKOFF_CAP_S = 30;             // heimdall Retry-After is capped at 60s but a ration reset can be minutes away; honor it, capped
async function askTurn({ question, chatHistory }) {
  const body = { task: question, model: MODEL, sessionId: state.sessionId, attachments: ATTACHMENTS };
  if (SEND_HISTORY && chatHistory.length) body.chatHistory = chatHistory.slice(-40);
  // Heimdall profiles and rations on HEADERS, not the body: without x-er7-session this
  // driver is the SHARED "anon" requestor and collides with every other anonymous caller's
  // 40-turn/15min ration window (measured: turns 31+ refused "anon has used 40/40"). Declared
  // batch: a 1000-turn eval is background swarm work (600/15min cap), queued behind interactive.
  const headers = {
    "content-type": "application/json",
    "x-er7-session": state.sessionId,
    "x-er7-priority": "batch",
  };
  const deadline = Date.now() + TURN_BUDGET_MS;
  let attempts = 0, lastReason = "";
  while (Date.now() < deadline) {
    attempts++;
    try {
      const res = await fetch(`${PROXY}/v1/ask`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(Math.max(120000, deadline - Date.now())),
      });
      if (res.headers.get("retry-after")) {
        const retry = Math.min(BACKOFF_CAP_S, Number(res.headers.get("retry-after") ?? "5") || 5);
        lastReason = `${res.status} retry-after ${retry}s`;
        await sleep(retry * (0.6 + Math.random() * 0.4) * 1000); // jittered, so 3 rapid 429s don't trip on a momentarily busy box
        continue;
      }
      if (!res.ok) throw new Error(`/v1/ask ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return res.json();
    } catch (e) {
      // Network-level failures (proxy re-forged mid-request: ECONNREFUSED, socket hangup,
      // ECONNRESET, fetch failed, AbortSignal timeout) are retryable — attachments ride every
      // turn and a fresh session with the same id is auto-created, so a restart is transparent.
      // Bounded by the deadline, so a dead proxy costs minutes per turn, never an infinite hang.
      lastReason = String(e?.message ?? e).slice(0, 200);
      await sleep((2 + Math.random() * 4) * 1000);
    }
  }
  throw new Error(`/v1/ask gave up after ${attempts} attempt(s) (${TURN_BUDGET_MS / 1000}s budget): ${lastReason}`);
}

// ── the turns ────────────────────────────────────────────────────────────────
for (let turn = state.turn + 1; turn <= TURNS; turn++) {
  const sched = scheduleFor(turn, EVERY);
  let probe = null, question = null, earlier = null, organic = null;
  if (sched.kind === "recall") probe = recallProbe(rng.pick(state.bank), rng);
  else if (sched.kind === "memory") { const d = memoryDistanceFor(turn, rng); const cands = d ? state.transcript.filter((t) => t.turn === turn - d) : []; earlier = cands[0] ?? null; probe = earlier ? memoryProbe(earlier, d) : null; if (!probe) { earlier = [...state.transcript].reverse().find((t) => memoryProbe(t, turn - t.turn)) ?? null; probe = earlier ? memoryProbe(earlier, turn - earlier.turn) : null; } }
  else if (sched.kind === "injection") probe = injectionProbe(rng.pick(state.bank), rng, state.bank);
  else if (sched.kind === "reasoning") { for (let i = 0; i < 20 && !probe; i++) probe = reasoningProbe(rng.pick(state.bank), rng.pick(state.bank)); }
  if (probe) question = probe.question;
  else { organic = organicQuestion(state.bank, rng, turn); question = organic.question; }

  const t0 = Date.now();
  let r = null, error = null;
  try {
    r = await askTurn({ question, chatHistory: state.history.map((h) => h.content) });
  } catch (e) { error = String(e?.stack ?? e?.message ?? e).slice(0, 600); }
  const answer = r ? String(r.answer ?? "") : "";
  let score = null;
  if (probe && r) {
    if (probe.kind === "recall") score = scoreRecall(answer, probe);
    else if (probe.kind === "memory") score = scoreMemory(answer, probe, earlier.answer);
    else if (probe.kind === "injection") score = scoreInjection(answer, probe);
    else if (probe.kind === "reasoning") score = scoreReasoning(answer, probe);
  }
  const row = {
    turn, at: new Date().toISOString(), kind: probe?.kind ?? "organic", question, answer, probe: probe ? { ...probe, question: undefined } : null, ...(organic ? { organic } : {}), score,
    ms: Date.now() - t0,
    usage: r?.usage ?? null,
    answerShape: r?.answerShape ?? null, truncated: r?.truncated ?? false,
    relationEdges: r?.relationEdges ?? null, referentBindings: r?.referentBindings ?? null,
    race: r?.race ?? null, heimdall: r?.heimdall ?? null,
    error,
  };
  appendFileSync(TURNS_PATH, JSON.stringify(row) + "\n");
  if (!error) { state.history.push({ role: "user", content: question }, { role: "assistant", content: answer }); state.transcript.push({ turn, question, answer }); }
  state.turn = turn; saveState();
  const verdict = score ? (score.verdict ?? (score.any != null ? `any=${score.any} share=${score.share.toFixed(2)}${score.contradicted ? " CONTRADICTED" : ""}` : "")) : "";
  const shapeMark = row.answerShape ? row.answerShape.slice(0, 10) : "";
  console.log(`[${turn}/${TURNS}] ${row.kind.padEnd(9)} ${(row.ms / 1000).toFixed(0).padStart(4)}s ${verdict.padEnd(12)} ${shapeMark.padEnd(10)} ${error ? "ERROR " + error.split("\n")[0].slice(0, 90) : question.slice(0, 70).replace(/\s+/g, " ")}`);

  // RESULTS EVERY 10 MESSAGES — a running tally, no model, mechanical only.
  if (turn % 10 === 0) {
    const rows = readFileSync(TURNS_PATH, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const errs = rows.filter((x) => x.error);
    const byKind = {};
    for (const x of rows) { const b = byKind[x.kind] ??= { n: 0 }; b.n++; if (x.score) { const v = x.score.verdict; b[v] = (b[v] ?? 0) + 1; } }
    const total = rows.length;
    const errMsg = errs.length ? ` ERRORS ${errs.length}` : " no errors";
    const shapes = Object.entries(rows.reduce((a, x) => { a[x.answerShape ?? "?"] = (a[x.answerShape ?? "?"] ?? 0) + 1; return a; }, {})).map(([k, v]) => `${k}:${v}`).join(" ");
    console.log(`  — after ${total} messages:${errMsg} · avg ${(rows.reduce((a, x) => a + x.ms, 0) / total / 1000).toFixed(0)}s/turn · shapes ${shapes} · ${Object.entries(byKind).map(([k, b]) => `${k} ${b.n}${b.hit ? ` hit ${b.hit}` : ""}${b.held ? ` held ${b.held}` : ""}${b.capitulated ? ` CAPITULATED ${b.capitulated}` : ""}${b.right ? ` right ${b.right}` : ""}${b.refused ? ` refused ${b.refused}` : ""}${b.wrong ? ` wrong ${b.wrong}` : ""}${b.miss ? ` miss ${b.miss}` : ""}${b.evaded ? ` evaded ${b.evaded}` : ""}${b.both ? ` both ${b.both}` : ""}${b.partial ? ` partial ${b.partial}` : ""}`).join(" · ")}`);
  }
}
console.log(`\ndone — ${DIR}`);
console.log(`score: node eval/the-fold/long-stream-score.mjs ${DIR}`);