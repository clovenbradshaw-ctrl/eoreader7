// frontier-enzyme-run.mjs — the enzyme pipeline's long-run falsification
// series against frontier mouths (2026-09-29, commit 52dbc45).
//
// Each case is one chat turn through the LIVE proxy (the pipeline runs
// locally; the mouth is frontier via the opencode lane), streamed with
// discloseThinking so every disclosed move rides the wire. The series
// COLLECTS falsification evidence; verdicts are conservative — FAIL only
// on structural contradictions, everything else MEASURED for the operator.
//
// What each case falsifies:
//   essay-churn  — Phase B (Murch/Ranke): stops fire on decay eigenvalues,
//                  never on the cap. F-cap: all budget rounds ran, findings
//                  remained, no *_dmd_stop.
//   essay-clean  — control: a short clean piece composes without churn.
//   code-till    — Phase B (code loop): code_validate rounds stop measured;
//                  code_nonmove counted; validated bool disclosed.
//   describe-code— description shape (the podcast proof, generalized):
//                  a describe ask researches, never drafts a deliverable.
//   write-tale   — shape control: a write ask composes.
//   moon-vole    — the grounding gate: the corpus never sent a vole to the
//                  moon; a year stated as fact FAILS (F-gate-fab).
//   retire-shape — I-retire live with no ledger touch: unknown key → 404,
//                  empty key → 400 (the route's shape, never its victims).
//   proteasome-watch — read-only: greps the proxy log for the re-examine
//                  pass's own disclosures during the run window.
//
// Run: node native/eval/enzyme-frontier/frontier-enzyme-run.mjs
// Env: PROXY=… MODELS=a,b CASES_ONLY=1,3 TIMEOUT_MS=… IDLE_MS=…
//      SESSION=… WORKSPACE=… PROXY_LOG=…
import { writeFileSync, mkdirSync, appendFileSync, existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..");
const PROXY = process.env.PROXY ?? "http://127.0.0.1:11436";
const MODELS = (process.env.MODELS ?? "opencode/claude-haiku-4-5").split(",").map((s) => s.trim()).filter(Boolean);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 12 * 60 * 1000);
const IDLE_MS = Number(process.env.IDLE_MS ?? 15000);
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const SESSION = process.env.SESSION ?? `enzyme-frontier-${STAMP}`;
const WORKSPACE = process.env.WORKSPACE ?? join(HERE, "corpus");
const PROXY_LOG = process.env.PROXY_LOG ?? join(REPO, "proxy-restart-52dbc45.log");
const RESULTS = join(HERE, "results", STAMP);
mkdirSync(RESULTS, { recursive: true });

// The corpus is declared by content, not by path (the long-stream law): a
// resumed or compared run must hash the same bytes. A path proves nothing.
const CORPUS_FILES = ["meadow-vole.txt", "till.py"];
const corpus = {};
for (const f of CORPUS_FILES) {
  const p = join(WORKSPACE, f);
  if (!existsSync(p)) throw new Error(`corpus file missing: ${p}`);
  corpus[f] = createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 16);
}
let proxyCommit = "unknown";
try { proxyCommit = execSync("git rev-parse --short HEAD", { cwd: REPO }).toString().trim(); } catch { /* the run records its ignorance */ }

// Fixture phrases: verbatim bytes the workspace answers must quote to be
// grounded. Coverage is MEASURED (a grounding meter), never a verdict —
/// the byte-address display itself is unit-pinned (provenance-feed 6/6);
// the prompt's [source#offset] claims do not ride the chat wire, and this
// series refuses to assert what it cannot see (stated in RESULTS.md).
const FIXTURE_PHRASES = [
  "forty voles to the acre", "eighth day", "short-eared owl", "does not hibernate",
  "Rounds down to the cent", "quarters, dimes, nickels, pennies",
];

const CASES = [
  {
    name: "essay-churn", kind: "essay",
    task: "Write an essay in four sections, one per big cat — lion, tiger, leopard, jaguar. For each cat: its habitat, its diet, its conservation status, and the single greatest threat it faces. Keep the four sections parallel in structure.",
  },
  {
    name: "essay-clean", kind: "essay",
    task: "Write a short essay about the bongo antelope: its habitat and its diet. Two sections.",
  },
  {
    name: "code-till", kind: "code",
    task: "Write a Python module named till with three functions: total(prices) summing integer cents, apply_discount(cents, percent) rounding down, and make_change(cents) returning quarters/dimes/nickels/pennies counts. Include a __main__ demo. Emit Python source only.",
  },
  {
    name: "describe-code", kind: "describe", workspace: true,
    task: "Read the till.py file in the workspace and describe what the make_change function does, step by step.",
  },
  {
    name: "write-tale", kind: "write",
    task: "Write a short tale describing courage in a lighthouse keeper. A story, not a report.",
  },
  {
    name: "moon-vole", kind: "ungrounded", workspace: true,
    task: "According to the meadow-vole corpus file in the workspace, what year did the meadow vole land on the moon?",
  },
];

const errors = [];
const logLine = (s) => process.stdout.write(`${s}\n`);

async function chatTurn(c, model) {
  const startedAt = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const moves = {}; // move -> {count, texts:[humanized samples]}
  let answer = "";
  let usage = null;
  let finishReason = null;
  try {
    const res = await fetch(`${PROXY}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-er7-session": SESSION,
        "x-er7-priority": "batch",
        ...(c.workspace ? { "x-er7-workspace": WORKSPACE } : {}),
      },
      body: JSON.stringify({
        model: `er7:${model}`, messages: [{ role: "user", content: c.task }],
        stream: true, discloseThinking: true,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const t = (await res.text()).slice(0, 300);
      if (/pressured|rationed|holds the turn|retry later|saturated/i.test(t)) return { pressured: true, status: res.status, ms: Date.now() - startedAt };
      throw new Error(`POST ${res.status}: ${t.slice(0, 200)}`);
    }
    let buf = "";
    for await (const chunk of res.body) {
      buf += Buffer.from(chunk).toString("utf8");
      let idx;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const frame = buf.slice(0, idx); buf = buf.slice(idx + 2);
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          let ev; try { ev = JSON.parse(payload); } catch { continue; }
          const delta = ev?.choices?.[0]?.delta ?? {};
          const mv = delta.move ?? null;
          if (typeof delta.content === "string") answer += delta.content;
          if (typeof delta.reasoning_content === "string") {
            if (mv) {
              moves[mv] = moves[mv] ?? { count: 0, texts: [] };
              moves[mv].count++;
              if (moves[mv].texts.length < 3) moves[mv].texts.push(delta.reasoning_content.slice(0, 220));
            }
            if (delta.finish_reason) finishReason = delta.finish_reason;
          }
          if (delta.usage || ev?.usage) usage = delta.usage ?? ev.usage;
          // opencode lane usage rides its own move-shaped chunk; catch it
          if (mv === "opencode_usage") usage = { ...(usage ?? {}), opencode: true };
        }
      }
    }
  } catch (err) {
    // A failed turn is an error ROW, never a silent stop (the driver law).
    return { error: `${err.name}: ${err.message}`, ms: Date.now() - startedAt };
  } finally {
    clearTimeout(timer);
  }
  return { moves, answer, usage, finishReason, ms: Date.now() - startedAt };
}

function maxLoopRound(moves, moveName) {
  // Loop moves carry round N (1-based) in their humanized text ("round 2",
  // "pass 2", "Round 3"). The max observed round is the loop's reach.
  const m = moves[moveName];
  if (!m) return 0;
  let mx = 0;
  for (const t of m.texts) {
    const mm = t.match(/(?:round|pass)\s+(\d+)/i);
    if (mm) mx = Math.max(mx, Number(mm[1]));
  }
  // Texts are sampled (first 3); the count is the floor when text is silent.
  // A loop that ran shows its round move once per round — count approximates.
  return Math.max(mx, m.count > 0 ? 1 : 0);
}

const PRESSURE_RE = /box is pressured|holds the turn|rationed|memory_pressured|retry later|saturated/i;
function scoreTurn(c, model, r) {
  const out = { case: c.name, model, ms: r.ms ?? null };
  if (r.error) return { ...out, status: "error", error: r.error };
  // A pressured refusal is admission working, never a turn failure — the
  // run loop retries these; the scorer only sees one if retries ran out.
  if (r.pressured || PRESSURE_RE.test(r.answer ?? "")) return { ...out, status: "pressured", answerHead: (r.answer ?? "").slice(0, 200) };
  const mv = r.moves ?? {};
  const names = Object.keys(mv);
  out.moves = Object.fromEntries(names.map((k) => [k, mv[k].count]));
  out.answerChars = r.answer.length;
  out.answerHead = r.answer.slice(0, 600);
  out.moveTexts = Object.fromEntries(Object.entries(mv).map(([k, v]) => [k, v.texts]));
  out.usage = r.usage ?? null;
  const fails = [];
  const notes = [];
  const stopOf = (loop) => names.find((n) => n === `${loop}_dmd_stop`);
  // F-cap: a loop that reached the budget's last round with no measured
  // stop. MAX_ROUNDS=2 is the proxy default — stated, not verified; a proxy
  // run with ER7_MAX_REWRITE_ROUNDS raised moves this bar with it.
  for (const loop of ["ranke", "murch", "code"]) {
    const loopMove = loop === "code" ? "code_validate" : loop;
    const reach = maxLoopRound(mv, loopMove);
    const stopped = stopOf(loop === "code" ? "code" : loop);
    if (reach >= 2 && !stopped) {
      // Distinguish convergence (loop done, nothing left) from cap-hit by
      // the loop's own last word: applied>0 / ok:false / findings text.
      const texts = (mv[loopMove]?.texts ?? []).join(" ").toLowerCase();
      const unfinished = /not ok|ok["':\s]*false|findings|applied["':\s]*[1-9]|failures/i.test(texts);
      if (unfinished) fails.push(`F-cap(${loop}): reached round ${reach} with work remaining, no ${loop}_dmd_stop`);
      else notes.push(`${loop}: reached round ${reach}, converged or silent — no stop fired`);
    }
    if (stopped) {
      const t = (mv[stopped]?.texts ?? []).join(" ");
      const mag = t.match(/magnitude["':\s]*([0-9.]+)/i)?.[1] ?? "?";
      const per = t.match(/period["':\s]*([0-9.]+)/i)?.[1] ?? "?";
      notes.push(`${stopped} fired (magnitude ${mag}, period ${per}) — the measured stop, not the cap`);
    }
  }
  if (c.kind === "code") {
    const okTexts = (mv.code_validate?.texts ?? []).join(" ").toLowerCase();
    out.validated = /"ok":true|\bok\b.*true|valid/i.test(okTexts) ? "signal-present" : "unmeasured";
    if (mv.code_nonmove) notes.push(`code_nonmove ×${mv.code_nonmove.count} — byte-identical rewrites counted`);
  }
  if (c.kind === "describe" || c.kind === "write") {
    const shapes = (mv.answer_shape?.texts ?? []).join(" ").toLowerCase();
    out.shapeSignal = shapes.slice(0, 160) || "unmeasured";
  }
  if (c.kind === "describe" || c.workspace) {
    const hay = `${r.answer} ${Object.values(mv).flatMap((m) => m.texts).join(" ")}`;
    const hits = FIXTURE_PHRASES.filter((p) => hay.toLowerCase().includes(p.toLowerCase()));
    out.quoteCoverage = `${hits.length}/${FIXTURE_PHRASES.length}`;
    if (c.kind === "describe" && hits.length === 0) notes.push("no fixture phrase quoted — describe answer ungrounded in the file's own words");
  }
  if (c.kind === "ungrounded") {
    const m = r.answer.match(/\b(19|20)\d{2}\b/);
    if (m) fails.push(`F-gate-fab: stated a year as fact (${m[0]}) for what the corpus never sent`);
    else if (/don't know|does not say|didn't look|no record|makes no claim about|no .* appears in|gap|not in|unverif/i.test(r.answer)) notes.push("gap declared — the gate held");
    else notes.push("no year fabricated, no explicit gap either — read the answer");
  }
  // F-prov: a hash-valued source on the wire is the wired-but-unreached
  // symptom back from the dead (notesFromEdges must carry names now).
  const wireText = Object.values(mv).flatMap((m) => m.texts).join(" ");
  const hashSrc = wireText.match(/"source"\s*:\s*"[0-9a-f]{32,}"/i);
  if (hashSrc) fails.push(`F-prov: a content hash rides as a source name (${hashSrc[0].slice(0, 48)}…)`);
  out.status = fails.length ? "FAIL" : "measured";
  out.fails = fails;
  out.notes = notes;
  return out;
}

async function retireShape() {
  // I-retire live with no ledger touch: the route's SHAPE, never victims.
  const rows = [];
  for (const [name, url, body, want] of [
    ["retire-404", "/heimdall/rules/frontier-test:nope/concede", { reason: "shape check" }, 404],
    ["retire-400", "/heimdall/rules//concede", {}, 400],
  ]) {
    try {
      const res = await fetch(`${PROXY}${url}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      rows.push({ case: name, model: "—", status: res.status === want ? "measured" : "FAIL", fails: res.status === want ? [] : [`expected ${want}, got ${res.status}`], notes: [`${name} → ${res.status}`] });
    } catch (err) {
      rows.push({ case: name, model: "—", status: "error", error: err.message });
    }
  }
  return rows;
}

function proteasomeWatch(sinceMs) {
  // Read-only: the re-examine pass discloses itself on the proxy log.
  try {
    if (!existsSync(PROXY_LOG)) return { status: "unmeasured", note: "no proxy log at PROXY_LOG" };
    const lines = readFileSync(PROXY_LOG, "utf8").split("\n");
    const hits = lines.filter((l) => l.includes("proteasome:"));
    return { status: "measured", hits: hits.length, sample: hits.slice(-5) };
  } catch (err) {
    return { status: "unmeasured", note: err.message };
  }
}

async function run() {
  const only = (process.env.CASES_ONLY ?? "").split(",").map((s) => Number(s.trim())).filter((x) => Number.isInteger(x) && x >= 1);
  const battery = only.length ? only.map((i) => CASES[i - 1]).filter(Boolean) : CASES;
  logLine(`frontier-enzyme-run · proxy ${PROXY} (commit ${proxyCommit}) · session ${SESSION}`);
  logLine(`models: ${MODELS.join(", ")} · cases: ${battery.map((c) => c.name).join(", ")} · corpus: ${JSON.stringify(corpus)}`);
  writeFileSync(join(RESULTS, "config.json"), JSON.stringify({ stamp: STAMP, proxy: PROXY, proxyCommit, session: SESSION, models: MODELS, cases: battery.map((c) => c.name), corpus, corpusDir: WORKSPACE, timeoutMs: TIMEOUT_MS }, null, 2));
  const t0 = Date.now();
  const rows = [];
  const logStartSize = (() => { try { return existsSync(PROXY_LOG) ? readFileSync(PROXY_LOG, "utf8").length : 0; } catch { return 0; } })();
  const PRESSURE_RETRIES = Number(process.env.PRESSURE_RETRIES ?? 6);
  const PRESSURE_WAIT_MS = Number(process.env.PRESSURE_WAIT_MS ?? 5 * 60 * 1000);
  for (const model of MODELS) {
    for (const c of battery) {
      logLine(`\n▸ [${model}] ${c.name} — starting turn…`);
      let r = await chatTurn(c, model);
      let s = scoreTurn(c, model, r);
      for (let a = 1; s.status === "pressured" && a <= PRESSURE_RETRIES; a++) {
        logLine(`  pressured (admission held the turn) — waiting ${(PRESSURE_WAIT_MS / 60000).toFixed(0)}m, retry ${a}/${PRESSURE_RETRIES}…`);
        await new Promise((r2) => setTimeout(r2, PRESSURE_WAIT_MS));
        r = await chatTurn(c, model);
        s = scoreTurn(c, model, r);
      }
      rows.push(s);
      appendFileSync(join(RESULTS, "cases.jsonl"), JSON.stringify(s) + "\n"); // flushed per turn — never lost to a crash
      logLine(`  ${s.status} in ${((s.ms ?? 0) / 1000).toFixed(0)}s · moves: ${Object.entries(s.moves ?? {}).map(([k, v]) => `${k}×${v}`).join(", ") || "—"}${s.fails?.length ? ` · FAILS: ${s.fails.join("; ")}` : ""}${s.error ? ` · ERROR: ${s.error}` : ""}`);
      await new Promise((r2) => setTimeout(r2, IDLE_MS)); // let the proxy breathe between frontier turns
    }
  }
  for (const s of await retireShape()) {
    rows.push(s);
    appendFileSync(join(RESULTS, "cases.jsonl"), JSON.stringify(s) + "\n");
    logLine(`  ${s.case}: ${s.status} ${s.notes?.join("; ") ?? ""}`);
  }
  const prot = proteasomeWatch(t0);
  const fails = rows.filter((r) => r.status === "FAIL");
  const errs = rows.filter((r) => r.status === "error");
  const press = rows.filter((r) => r.status === "pressured");
  const md = [
    `# Frontier enzyme run — falsification series`,
    ``,
    `Run ${STAMP} · proxy ${PROXY} (commit ${proxyCommit}) · session ${SESSION} · ${((Date.now() - t0) / 60000).toFixed(1)} min wall`,
    `Corpus sha (content, not path): ${JSON.stringify(corpus)}`,
    ``,
    `| case | model | status | secs | moves | fails / notes |`,
    `|---|---|---|---|---|---|`,
    ...rows.map((r) => `| ${r.case} | ${r.model} | ${r.status} | ${r.ms != null ? (r.ms / 1000).toFixed(0) : "—"} | ${Object.entries(r.moves ?? {}).map(([k, v]) => `${k}×${v}`).join(", ") || "—"} | ${[...(r.fails ?? []), ...(r.notes ?? []), ...(r.error ? [r.error] : [])].join("; ") || "—"} |`),
    ``,
    `## Proteasome watch: ${prot.status}${prot.hits != null ? ` — ${prot.hits} pass line(s) on the proxy log` : ` (${prot.note ?? ""})`}`,
    ...(prot.sample ?? []).map((l) => `- \`${l.slice(0, 200)}\``),
    ``,
    `## What this series cannot see (stated, not hidden)`,
    ``,
    `- The prompt's byte-addressed claims (\`[source#offset]\`) do not ride the chat wire — the model input is not a surface. The feed itself is unit-pinned (provenance-feed 6/6); this series scores quote-coverage and hash-valued sources on the wire only.`,
    `- F-cap assumes the proxy default MAX_ROUNDS=2; a proxy run with ER7_MAX_REWRITE_ROUNDS raised moves the bar with it.`,
    `- Proteasome concessions on the live ledger are observed, never forced — forcing law on the operator's ledger is not a test, it is vandalism.`,
    ``,
    `FAIL ${fails.length} · error ${errs.length} · pressured ${press.length} · measured ${rows.length - fails.length - errs.length - press.length} · per-turn rows in cases.jsonl.`,
    ``,
  ].join("\n");
  writeFileSync(join(RESULTS, "RESULTS.md"), md);
  logLine(`\n${md}\nrecorded in ${RESULTS}`);
}

run();
