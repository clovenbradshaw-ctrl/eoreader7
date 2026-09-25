// eval/the-fold/two-agent-stress.mjs — two-agent conversational stress test.
//
// Two separate model "agents" talk to each other through the REAL running
// fold API (http://localhost:8812/v1/chat/completions), each turn a full
// grounded pipeline pass (retrieval, checking, correction), not a raw model
// call. Agent A and Agent B keep independent message histories: each sees
// the other's prior turns as "user" and its own prior turns as "assistant",
// so both histories grow to the full transcript length as the conversation
// proceeds — this is what stresses the fold's context window / running
// summary-fold / recency-window behavior over a long, real, evolving
// exchange, not a canned one.
//
// This script is READ-ONLY against the server: it only sends HTTP requests
// to the already-running proxy. It does not touch any application code.
//
//   node eval/the-fold/two-agent-stress.mjs [--turns 150] [--agentA fold:gemma2:2b]
//        [--agentB fold:llama3.2:latest] [--timeout 120000] [--server http://localhost:8812]
//        [--resume <rundir>]
//
// A single grounded turn can run past this harness's own background-command
// time cap over a 150-turn run, so --resume <rundir> re-reads that run's
// transcript.jsonl, rebuilds both agents' histories and running stats
// exactly as if the process had never stopped, and appends from the next
// turn — so a long run can be relaunched in chunks without losing progress
// or restarting the conversation.
//
// Writes, under eval/the-fold/results/two-agent-stress-<timestamp>/:
//   transcript.jsonl   one JSON row per turn (turn, agent, model, latencyMs, excerpt, full text)
//   transcript.md       human-readable running transcript
//   problems.md          anomalies: errors, timeouts, slow turns, repeats, leaked apparatus text
//   summary.json          final stats: totals, latency trend, problem counts

import { writeFileSync, appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] != null ? args[i + 1] : dflt; };
const TURNS = Number(flag("turns", 150));
const MODEL_A = flag("agentA", "fold:gemma2:2b");
const MODEL_B = flag("agentB", "fold:llama3.2:latest");
const SERVER = flag("server", "http://localhost:8812");
const TIMEOUT_MS = Number(flag("timeout", 120000));
const RESUME = flag("resume", null);

const NATIVE = new URL(".", import.meta.url).pathname;
const RESULTS = join(NATIVE, "results");
let RUNDIR;
if (RESUME) {
  RUNDIR = RESUME;
  if (!existsSync(RUNDIR)) { console.error(`--resume dir does not exist: ${RUNDIR}`); process.exit(2); }
} else {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  RUNDIR = join(RESULTS, `two-agent-stress-${stamp}`);
  mkdirSync(RUNDIR, { recursive: true });
}
const TRANSCRIPT_JSONL = join(RUNDIR, "transcript.jsonl");
const TRANSCRIPT_MD = join(RUNDIR, "transcript.md");
const PROBLEMS_MD = join(RUNDIR, "problems.md");
const SUMMARY_JSON = join(RUNDIR, "summary.json");

if (!RESUME) {
  writeFileSync(TRANSCRIPT_MD, `# Two-agent stress transcript\n\nAgent A: ${MODEL_A}\nAgent B: ${MODEL_B}\nTurns requested: ${TURNS}\nStarted: ${new Date().toISOString()}\n\n`);
  writeFileSync(PROBLEMS_MD, `# Problems log — two-agent stress\n\nAgent A: ${MODEL_A}\nAgent B: ${MODEL_B}\n\n`);
} else {
  appendFileSync(TRANSCRIPT_MD, `\n\n---\n\n_Resumed: ${new Date().toISOString()}_\n\n`);
  appendFileSync(PROBLEMS_MD, `\n\n_Resumed: ${new Date().toISOString()}_\n\n`);
}

console.log(`[two-agent-stress] server=${SERVER} agentA=${MODEL_A} agentB=${MODEL_B} turns=${TURNS}${RESUME ? ` (resuming ${RUNDIR})` : ""}`);
console.log(`[two-agent-stress] writing to ${RUNDIR}`);

function logProblem(line) {
  console.error(`[PROBLEM] ${line}`);
  appendFileSync(PROBLEMS_MD, `- ${line}\n`);
}

// ── seed topic ────────────────────────────────────────────────────────────
// Open-ended, naturally generative over many turns: two agents collaborating
// on the design of a small society's system of governance and dispute
// resolution — rich enough to keep producing new content (roles, edge
// cases, revisions, disagreements) rather than repeating small talk.
const SEED_TOPIC =
  "Let's design, from scratch, a system of governance and dispute resolution " +
  "for a new settlement of about 2,000 people on a remote research station " +
  "with no existing legal tradition to inherit. I'll start: propose a first " +
  "sketch of how disputes between residents should be resolved, and why. " +
  "Push back on my reasoning where you disagree, and keep building on or " +
  "revising the plan turn by turn — introduce new complications (scarce " +
  "resources, newcomers, repeat offenders, power imbalances) as we go rather " +
  "than settling into a fixed answer.";

// ── apparatus-leak detector ─────────────────────────────────────────────────
// Heuristics for internal/apparatus text reaching the "mouth": literal JSON
// blobs, prompt-scaffolding tokens, citation-address syntax, etc. Mechanical
// pattern checks only — this never grades content with a model.
const APPARATUS_PATTERNS = [
  { name: "json-blob", re: /[{[]\s*"[a-zA-Z_]+"\s*:/ },
  { name: "prompt-scaffold-tags", re: /<\/?(system|user|assistant|tool|function|instructions?)>/i },
  { name: "bracket-role-tag", re: /\[(SYSTEM|USER|ASSISTANT|TOOL|INST)\]/ },
  { name: "citation-address", re: /\b(span|offset|node|ref)[:=]\d+/i },
  { name: "template-placeholder", re: /\{\{[^}]+\}\}/ },
  { name: "markdown-code-fence-json", re: /```json/i },
  { name: "internal-var-name", re: /\b(holon|fold\.js|ledger\.js|calibration\.js|holon\.js)\b/i },
];

function detectApparatusLeak(text) {
  const hits = [];
  for (const p of APPARATUS_PATTERNS) if (p.re.test(text)) hits.push(p.name);
  return hits;
}

function isNearDuplicate(a, b) {
  if (!a || !b) return false;
  const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const na = norm(a), nb = norm(b);
  if (na === nb) return true;
  if (na.length > 40 && nb.length > 40) {
    // crude containment check for verbatim repetition of a long stretch
    const shorter = na.length < nb.length ? na : nb;
    const longer = na.length < nb.length ? nb : na;
    if (longer.includes(shorter.slice(0, Math.min(shorter.length, 200)))) return true;
  }
  return false;
}

async function callAgent(model, messages, turnNum, agentLabel) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  // A grounded turn can sit silent for a minute or more while the pipeline
  // works (retrieval, checking, correction) with nothing to print. Some
  // background-process supervisors reap a process whose stdout goes quiet
  // for too long, so a heartbeat keeps the stream visibly alive.
  const heartbeat = setInterval(() => {
    process.stdout.write(`.`);
  }, 15000);
  try {
    const res = await fetch(`${SERVER}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false }),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      const bodyText = await res.text().catch(() => "<unreadable body>");
      return { ok: false, latencyMs, error: `HTTP ${res.status}: ${bodyText.slice(0, 500)}` };
    }
    const json = await res.json().catch((e) => ({ __parseError: String(e) }));
    if (json.__parseError) return { ok: false, latencyMs, error: `JSON parse error: ${json.__parseError}` };
    const content = json?.choices?.[0]?.message?.content;
    if (content == null || String(content).trim() === "") {
      return { ok: false, latencyMs, error: "empty/missing response content", raw: json };
    }
    return { ok: true, latencyMs, content: String(content) };
  } catch (e) {
    const latencyMs = Date.now() - started;
    const aborted = e?.name === "AbortError";
    return { ok: false, latencyMs, error: aborted ? `timeout after ${TIMEOUT_MS}ms` : String(e?.message ?? e) };
  } finally {
    clearTimeout(timer);
    clearInterval(heartbeat);
  }
}

// ── main loop ────────────────────────────────────────────────────────────
// historyA / historyB are each a flat list of {role, content} messages as
// that agent perceives the conversation: its own prior replies as
// "assistant", the other agent's prior replies (and the seed) as "user".
let historyA = [{ role: "user", content: SEED_TOPIC }];
let historyB = []; // B only sees A's first reply as its incoming "user" message

const latencies = [];
const agentLastTurn = { A: null, B: null };
let problemCount = 0;
let errorCount = 0;
let timeoutCount = 0;
let emptyCount = 0;
let slowCount = 0;
let leakCount = 0;
let repeatCount = 0;

const wallStart = Date.now();
let lastText = SEED_TOPIC; // what the *next* agent will receive as the latest user turn
let stoppedEarly = false;
let consecutiveFailures = 0;
let startTurn = 1;

if (RESUME) {
  const rows = readFileSync(TRANSCRIPT_JSONL, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  let maxOkTurn = 0;
  for (const r of rows) {
    if (!r.ok) continue; // failed turns did not advance the conversation content
    maxOkTurn = Math.max(maxOkTurn, r.turn);
    const isA = r.turn % 2 === 1;
    const messages = isA ? historyA : historyB;
    // rebuild exactly as the live loop does: this agent saw the running
    // messages array (built from lastText) then appended its own reply.
    const incoming = r.turn === 1 ? [] : [{ role: "user", content: lastText }];
    const before = isA ? [...historyA, ...incoming] : [...historyB, ...incoming];
    const after = [...before, { role: "assistant", content: r.content }];
    if (isA) historyA = after; else historyB = after;
    lastText = r.content;
    latencies.push(r.latencyMs);
    agentLastTurn[r.agent] = r.content;
    if ((r.apparatusLeakHits ?? []).length) leakCount++;
  }
  // re-derive problem counts from problems.md would double-count across
  // resumes, so counts below reflect this process's own accounting from
  // here forward for errors/timeouts/slow/repeats; leakCount above is exact
  // since it's read straight from the recorded rows.
  startTurn = maxOkTurn + 1;
  console.log(`[two-agent-stress] resumed at turn ${startTurn} (${rows.length} rows read, ${latencies.length} ok turns)`);
}

for (let turn = startTurn; turn <= TURNS; turn++) {
  const isA = turn % 2 === 1; // A speaks on odd turns (turn 1 responds to the seed)
  const agentLabel = isA ? "A" : "B";
  const model = isA ? MODEL_A : MODEL_B;
  const history = isA ? historyA : historyB;

  // build the message list this agent sees: prior turns already in its history,
  // plus the latest incoming turn from the other side (or the seed on turn 1).
  const messages = turn === 1 ? historyA : [...history, { role: "user", content: lastText }];

  const runningAvg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;

  process.stdout.write(`[turn ${turn}/${TURNS}] agent ${agentLabel} (${model}) ... `);
  const result = await callAgent(model, messages, turn, agentLabel);

  const row = {
    turn,
    agent: agentLabel,
    model,
    latencyMs: result.latencyMs,
    ok: result.ok,
  };

  if (!result.ok) {
    console.log(`FAILED (${result.latencyMs}ms): ${result.error}`);
    row.error = result.error;
    appendFileSync(TRANSCRIPT_JSONL, JSON.stringify(row) + "\n");
    appendFileSync(TRANSCRIPT_MD, `\n### Turn ${turn} — Agent ${agentLabel} (${model}) — FAILED\n\n${result.error}\n`);
    errorCount++;
    if (/timeout/i.test(result.error)) timeoutCount++;
    if (/empty|missing/i.test(result.error)) emptyCount++;
    logProblem(`Turn ${turn} (agent ${agentLabel}, ${model}): ${result.error}`);
    consecutiveFailures++;
    if (consecutiveFailures >= 5) {
      logProblem(`Stopping early: ${consecutiveFailures} consecutive failed turns — server may be down or hung.`);
      stoppedEarly = true;
      break;
    }
    // On failure, don't advance the conversation content; retry the same
    // lastText on the same side's next scheduled turn isn't straightforward
    // in this simple loop, so we still advance turn count but keep lastText
    // as-is so the other agent isn't fed a broken/empty message.
    continue;
  }
  consecutiveFailures = 0;

  const content = result.content;
  const excerpt = content.slice(0, 220).replace(/\s+/g, " ");
  latencies.push(result.latencyMs);

  // slow-turn detection vs running average (need a few samples first)
  if (runningAvg != null && latencies.length > 5 && result.latencyMs > runningAvg * 3 && result.latencyMs > 5000) {
    slowCount++;
    logProblem(`Turn ${turn} (agent ${agentLabel}, ${model}): latency ${result.latencyMs}ms is >3x running average (${Math.round(runningAvg)}ms)`);
  }

  // verbatim/near-duplicate self-repetition check (vs this agent's own last turn)
  if (isNearDuplicate(content, agentLastTurn[agentLabel])) {
    repeatCount++;
    logProblem(`Turn ${turn} (agent ${agentLabel}, ${model}): near-duplicate of its own previous turn. Excerpt: "${excerpt}"`);
  }
  agentLastTurn[agentLabel] = content;

  // apparatus-leak check
  const leaks = detectApparatusLeak(content);
  if (leaks.length) {
    leakCount++;
    logProblem(`Turn ${turn} (agent ${agentLabel}, ${model}): possible apparatus leak [${leaks.join(", ")}]. Excerpt: "${excerpt}"`);
  }

  console.log(`ok ${result.latencyMs}ms — "${excerpt.slice(0, 80)}${excerpt.length > 80 ? "..." : ""}"`);

  row.excerpt = excerpt;
  row.length = content.length;
  row.apparatusLeakHits = leaks;
  row.content = content; // full text, needed to rebuild history exactly on --resume
  appendFileSync(TRANSCRIPT_JSONL, JSON.stringify(row) + "\n");
  appendFileSync(TRANSCRIPT_MD, `\n### Turn ${turn} — Agent ${agentLabel} (${model}) — ${result.latencyMs}ms\n\n${content}\n`);

  // update this agent's own history (its reply as assistant) and hand the
  // content to the other agent as its next incoming user turn.
  if (isA) {
    historyA = [...messages, { role: "assistant", content }];
  } else {
    historyB = [...messages, { role: "assistant", content }];
  }
  lastText = content;
}

const wallMs = Date.now() - wallStart;
const completedTurns = latencies.length;

// latency trend: compare mean of first third vs last third of completed turns
let trend = "n/a (too few completed turns)";
if (completedTurns >= 9) {
  const third = Math.floor(completedTurns / 3);
  const first = latencies.slice(0, third);
  const last = latencies.slice(-third);
  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const m1 = mean(first), m2 = mean(last);
  trend = `first-third mean ${Math.round(m1)}ms, last-third mean ${Math.round(m2)}ms, ratio ${((m2 / m1) || 0).toFixed(2)}x`;
}

const summary = {
  agentA: MODEL_A,
  agentB: MODEL_B,
  turnsRequested: TURNS,
  turnsCompleted: completedTurns,
  stoppedEarly,
  wallMs,
  wallSeconds: Math.round(wallMs / 1000),
  errorCount,
  timeoutCount,
  emptyCount,
  slowCount,
  leakCount,
  repeatCount,
  latencyTrend: trend,
  meanLatencyMs: completedTurns ? Math.round(latencies.reduce((a, b) => a + b, 0) / completedTurns) : null,
  minLatencyMs: completedTurns ? Math.min(...latencies) : null,
  maxLatencyMs: completedTurns ? Math.max(...latencies) : null,
  finishedAt: new Date().toISOString(),
};
writeFileSync(SUMMARY_JSON, JSON.stringify(summary, null, 2));
appendFileSync(PROBLEMS_MD, `\n## Summary\n\n${JSON.stringify(summary, null, 2)}\n`);
appendFileSync(TRANSCRIPT_MD, `\n\n## Run summary\n\n${JSON.stringify(summary, null, 2)}\n`);

console.log(`\n[two-agent-stress] done. completed=${completedTurns}/${TURNS} wall=${summary.wallSeconds}s errors=${errorCount} timeouts=${timeoutCount} slow=${slowCount} repeats=${repeatCount} leaks=${leakCount}`);
console.log(`[two-agent-stress] results in ${RUNDIR}`);
